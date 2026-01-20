/**
 * Token Universe Service
 * 
 * Ingestion pipeline for token data from CoinGecko
 */
import { TokenUniverseModel } from './token_universe.model.js';

interface IngestConfig {
  minMarketCap: number;
  minVolume24h: number;
  chainsAllowed: number[];
  maxTokens: number;
}

const DEFAULT_CONFIG: IngestConfig = {
  minMarketCap: 1_000_000,      // $1M
  minVolume24h: 100_000,        // $100k
  chainsAllowed: [1],           // Ethereum only
  maxTokens: 1000,
};

/**
 * Ingest tokens from CoinGecko
 */
export async function ingestTokenUniverse(config: IngestConfig = DEFAULT_CONFIG) {
  console.log('[Token Universe] Starting ingestion...');
  
  try {
    // 1. Fetch from CoinGecko
    const tokens = await fetchCoinGeckoTokens();
    console.log(`[Token Universe] Fetched ${tokens.length} tokens`);
    
    // 2. Filter EVM-only
    const evmTokens = tokens.filter(t => isEVMToken(t));
    console.log(`[Token Universe] Filtered to ${evmTokens.length} EVM tokens`);
    
    // 3. Filter by criteria
    const qualifiedTokens = evmTokens.filter(t => 
      t.market_cap >= config.minMarketCap &&
      t.total_volume >= config.minVolume24h
    );
    console.log(`[Token Universe] ${qualifiedTokens.length} meet criteria`);
    
    // 4. Normalize & Upsert
    let upsertedCount = 0;
    for (const token of qualifiedTokens.slice(0, config.maxTokens)) {
      const normalized = normalizeToken(token);
      await upsertToken(normalized);
      upsertedCount++;
    }
    
    console.log(`[Token Universe] Upserted ${upsertedCount} tokens`);
    
    // 5. Mark inactive tokens
    await markInactiveTokens();
    
    return {
      fetched: tokens.length,
      filtered: evmTokens.length,
      qualified: qualifiedTokens.length,
      upserted: upsertedCount,
    };
  } catch (err: any) {
    console.error('[Token Universe] Ingestion failed:', err);
    throw err;
  }
}

/**
 * Fetch tokens from CoinGecko API
 * Using /coins/list with platform filtering
 */
async function fetchCoinGeckoTokens() {
  const allTokens: any[] = [];
  
  // Fetch pages (max 250 per page)
  for (let page = 1; page <= 10; page++) {
    // Using markets endpoint with include_platform=true
    const url = `https://api.coingecko.com/api/v3/coins/markets?` +
      `vs_currency=usd&` +
      `order=market_cap_desc&` +
      `per_page=250&` +
      `page=${page}&` +
      `sparkline=false&` +
      `price_change_percentage=24h`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`[CoinGecko] HTTP ${response.status}`);
        break;
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        break;
      }
      
      // For each token, fetch detailed info to get platforms
      const enrichedTokens = [];
      for (const token of data.slice(0, 25)) { // Limit to prevent rate limiting
        try {
          const detailUrl = `https://api.coingecko.com/api/v3/coins/${token.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`;
          const detailResponse = await fetch(detailUrl);
          
          if (detailResponse.ok) {
            const detail = await detailResponse.json();
            enrichedTokens.push({
              ...token,
              platforms: detail.platforms || {},
            });
          }
          
          await sleep(300); // Rate limiting
        } catch (err) {
          console.error(`[CoinGecko] Failed to enrich ${token.id}`);
        }
      }
      
      allTokens.push(...enrichedTokens);
      
      console.log(`[CoinGecko] Page ${page}: fetched ${enrichedTokens.length} tokens`);
      
      // Rate limiting between pages
      await sleep(1500);
    } catch (err) {
      console.error(`[CoinGecko] Page ${page} failed:`, err);
      break;
    }
  }
  
  return allTokens;
}

/**
 * Check if token is EVM-based
 */
function isEVMToken(token: any): boolean {
  return !!(
    token.platforms?.ethereum || 
    token.platforms?.arbitrum || 
    token.platforms?.polygon
  );
}

/**
 * Normalize CoinGecko token data
 */
function normalizeToken(coinGeckoToken: any) {
  const contractAddress = (
    coinGeckoToken.platforms?.ethereum ||
    coinGeckoToken.platforms?.arbitrum ||
    coinGeckoToken.platforms?.polygon
  )?.toLowerCase();
  
  const chainId = coinGeckoToken.platforms?.ethereum ? 1 :
                  coinGeckoToken.platforms?.arbitrum ? 42161 :
                  coinGeckoToken.platforms?.polygon ? 137 : 1;
  
  return {
    symbol: coinGeckoToken.symbol.toUpperCase(),
    name: coinGeckoToken.name,
    contractAddress,
    chainId,
    decimals: 18, // Default
    marketCap: coinGeckoToken.market_cap || 0,
    volume24h: coinGeckoToken.total_volume || 0,
    priceUsd: coinGeckoToken.current_price || 0,
    coingeckoId: coinGeckoToken.id,
    active: true,
    lastUpdated: new Date(),
    source: 'coingecko',
    ingestedAt: new Date(),
  };
}

/**
 * Upsert token (idempotent)
 */
async function upsertToken(token: any) {
  await TokenUniverseModel.updateOne(
    { 
      contractAddress: token.contractAddress,
      chainId: token.chainId,
    },
    { $set: token },
    { upsert: true }
  );
}

/**
 * Mark tokens as inactive if not updated recently
 */
async function markInactiveTokens() {
  const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours
  
  const result = await TokenUniverseModel.updateMany(
    { lastUpdated: { $lt: threshold } },
    { $set: { active: false } }
  );
  
  console.log(`[Token Universe] Marked ${result.modifiedCount} tokens as inactive`);
}

/**
 * Get token universe stats
 */
export async function getTokenUniverseStats() {
  const [total, active, byChain] = await Promise.all([
    TokenUniverseModel.countDocuments(),
    TokenUniverseModel.countDocuments({ active: true }),
    TokenUniverseModel.aggregate([
      { $group: { _id: '$chainId', count: { $sum: 1 } } },
    ]),
  ]);
  
  const lastSync = await TokenUniverseModel.findOne()
    .sort({ lastUpdated: -1 })
    .select('lastUpdated')
    .lean();
  
  return {
    totalTokens: total,
    activeTokens: active,
    byChain: byChain.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<number, number>),
    lastSync: lastSync?.lastUpdated,
  };
}

/**
 * Helper: sleep
 */
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
