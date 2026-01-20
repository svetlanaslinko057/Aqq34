/**
 * Token Universe Service
 * 
 * Production-ready ingestion pipeline from CoinGecko
 * Features:
 * - Rate-limiting aware (10 req/min for free tier)
 * - Retry logic with exponential backoff
 * - Efficient batch processing
 * - Provider abstraction for future extensions
 */
import { TokenUniverseModel } from './token_universe.model.js';

// ============================================================
// CONFIGURATION
// ============================================================

interface IngestConfig {
  minMarketCap: number;
  minVolume24h: number;
  chainsAllowed: number[];
  maxTokens: number;
}

const DEFAULT_CONFIG: IngestConfig = {
  minMarketCap: 500_000,        // $500k
  minVolume24h: 50_000,         // $50k
  chainsAllowed: [1],           // Ethereum only
  maxTokens: 500,
};

// CoinGecko rate limit: 10-30 req/min for free tier
const RATE_LIMIT_DELAY = 6500;  // ~9 requests per minute (safe)
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 10000;

// ============================================================
// MAIN INGESTION FUNCTION
// ============================================================

/**
 * Ingest tokens from CoinGecko
 * Optimized for free tier rate limits
 */
export async function ingestTokenUniverse(config: IngestConfig = DEFAULT_CONFIG) {
  console.log('[Token Universe] Starting CoinGecko ingestion...');
  console.log(`[Token Universe] Config: minMarketCap=${config.minMarketCap}, maxTokens=${config.maxTokens}`);
  
  const startTime = Date.now();
  
  try {
    // Step 1: Fetch coin list with platforms (one API call)
    console.log('[Token Universe] Step 1: Fetching coin list with platforms...');
    const coinList = await fetchCoinListWithPlatforms();
    console.log(`[Token Universe] Fetched ${coinList.length} coins with platform data`);
    
    // Step 2: Filter to EVM tokens only
    const evmCoins = coinList.filter(coin => hasEVMContract(coin));
    console.log(`[Token Universe] Filtered to ${evmCoins.length} EVM tokens`);
    
    // Step 3: Fetch market data in batches
    console.log('[Token Universe] Step 2: Fetching market data...');
    const marketData = await fetchMarketDataBatched(
      evmCoins.map(c => c.id),
      config.maxTokens
    );
    console.log(`[Token Universe] Got market data for ${marketData.length} tokens`);
    
    // Step 4: Merge coin list with market data
    const coinMap = new Map(coinList.map(c => [c.id, c]));
    const enrichedTokens = marketData
      .filter(m => coinMap.has(m.id))
      .map(m => ({
        ...m,
        platforms: coinMap.get(m.id)?.platforms || {},
      }));
    
    // Step 5: Filter by criteria
    const qualifiedTokens = enrichedTokens.filter(t => 
      t.market_cap >= config.minMarketCap &&
      t.total_volume >= config.minVolume24h &&
      hasEVMContract({ platforms: t.platforms })
    );
    console.log(`[Token Universe] ${qualifiedTokens.length} tokens meet criteria`);
    
    // Step 6: Normalize & Upsert
    let upsertedCount = 0;
    let skippedCount = 0;
    
    for (const token of qualifiedTokens.slice(0, config.maxTokens)) {
      try {
        const normalized = normalizeToken(token);
        if (normalized.contractAddress) {
          await upsertToken(normalized);
          upsertedCount++;
        } else {
          skippedCount++;
        }
      } catch (err) {
        console.error(`[Token Universe] Failed to upsert ${token.symbol}:`, err);
        skippedCount++;
      }
    }
    
    console.log(`[Token Universe] Upserted ${upsertedCount} tokens, skipped ${skippedCount}`);
    
    // Step 7: Mark stale tokens as inactive
    await markInactiveTokens();
    
    const duration = Date.now() - startTime;
    console.log(`[Token Universe] Ingestion completed in ${(duration / 1000).toFixed(1)}s`);
    
    return {
      source: 'coingecko',
      fetched: coinList.length,
      evmFiltered: evmCoins.length,
      marketDataFetched: marketData.length,
      qualified: qualifiedTokens.length,
      upserted: upsertedCount,
      skipped: skippedCount,
      duration_ms: duration,
    };
  } catch (err: any) {
    console.error('[Token Universe] Ingestion failed:', err);
    throw err;
  }
}

// ============================================================
// COINGECKO API FUNCTIONS
// ============================================================

/**
 * Fetch coin list with platform addresses
 * Single API call - efficient for rate limits
 */
async function fetchCoinListWithPlatforms(): Promise<CoinListItem[]> {
  const url = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true';
  
  const response = await fetchWithRetry(url);
  const data = await response.json();
  
  if (!Array.isArray(data)) {
    throw new Error('Invalid response from CoinGecko /coins/list');
  }
  
  return data;
}

/**
 * Fetch market data in batches
 * /coins/markets supports up to 250 per page
 */
async function fetchMarketDataBatched(
  coinIds: string[],
  maxTokens: number
): Promise<MarketDataItem[]> {
  const allMarketData: MarketDataItem[] = [];
  const idsToFetch = coinIds.slice(0, Math.min(coinIds.length, maxTokens * 2)); // Fetch more, filter later
  
  // Calculate pages needed (250 per page, but we'll fetch by market cap order)
  const pagesNeeded = Math.ceil(maxTokens / 250);
  
  for (let page = 1; page <= pagesNeeded && allMarketData.length < maxTokens; page++) {
    const url = `https://api.coingecko.com/api/v3/coins/markets?` +
      `vs_currency=usd&` +
      `order=market_cap_desc&` +
      `per_page=250&` +
      `page=${page}&` +
      `sparkline=false&` +
      `price_change_percentage=24h,7d`;
    
    try {
      console.log(`[CoinGecko] Fetching market data page ${page}...`);
      const response = await fetchWithRetry(url);
      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`[CoinGecko] Page ${page}: no more data`);
        break;
      }
      
      // Filter to only coins that have EVM platforms
      const relevantCoins = data.filter(coin => 
        idsToFetch.includes(coin.id)
      );
      
      allMarketData.push(...relevantCoins);
      console.log(`[CoinGecko] Page ${page}: got ${data.length} coins, ${relevantCoins.length} relevant`);
      
      // Rate limiting
      if (page < pagesNeeded) {
        await sleep(RATE_LIMIT_DELAY);
      }
    } catch (err: any) {
      console.error(`[CoinGecko] Page ${page} failed:`, err.message);
      // Continue with what we have
      break;
    }
  }
  
  return allMarketData;
}

/**
 * Fetch with retry logic and exponential backoff
 */
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        return response;
      }
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '60');
        console.log(`[CoinGecko] Rate limited. Waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err: any) {
      console.error(`[CoinGecko] Attempt ${attempt}/${retries} failed:`, err.message);
      
      if (attempt < retries) {
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
        console.log(`[CoinGecko] Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
  
  throw new Error('Max retries exceeded');
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<string, string>;
}

interface MarketDataItem {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  platforms?: Record<string, string>;
}

/**
 * Check if token has EVM contract address
 */
function hasEVMContract(coin: { platforms?: Record<string, string> }): boolean {
  if (!coin.platforms) return false;
  
  const evmPlatforms = [
    'ethereum',
    'arbitrum-one', 
    'polygon-pos',
    'optimistic-ethereum',
    'base',
  ];
  
  return evmPlatforms.some(p => 
    coin.platforms?.[p] && 
    coin.platforms[p].startsWith('0x') &&
    coin.platforms[p].length === 42
  );
}

/**
 * Get EVM contract address and chain ID
 */
function getEVMContract(platforms: Record<string, string>): { address: string; chainId: number } | null {
  const platformPriority = [
    { key: 'ethereum', chainId: 1 },
    { key: 'arbitrum-one', chainId: 42161 },
    { key: 'polygon-pos', chainId: 137 },
    { key: 'optimistic-ethereum', chainId: 10 },
    { key: 'base', chainId: 8453 },
  ];
  
  for (const { key, chainId } of platformPriority) {
    const address = platforms[key];
    if (address && address.startsWith('0x') && address.length === 42) {
      return { address: address.toLowerCase(), chainId };
    }
  }
  
  return null;
}

/**
 * Normalize CoinGecko token data to our schema
 */
function normalizeToken(token: MarketDataItem & { platforms: Record<string, string> }) {
  const contract = getEVMContract(token.platforms);
  
  if (!contract) {
    return {
      symbol: token.symbol.toUpperCase(),
      name: token.name,
      contractAddress: null,
      chainId: 1,
    };
  }
  
  return {
    symbol: token.symbol.toUpperCase(),
    name: token.name,
    contractAddress: contract.address,
    chainId: contract.chainId,
    decimals: 18,
    marketCap: token.market_cap || 0,
    volume24h: token.total_volume || 0,
    priceUsd: token.current_price || 0,
    priceChange24h: token.price_change_percentage_24h || 0,
    priceChange7d: token.price_change_percentage_7d_in_currency || 0,
    marketCapRank: token.market_cap_rank || null,
    imageUrl: token.image || null,
    coingeckoId: token.id,
    active: true,
    lastUpdated: new Date(),
    lastSyncedAt: new Date(),
    source: 'coingecko' as const,
    ingestedAt: new Date(),
  };
}

/**
 * Upsert token (idempotent)
 */
async function upsertToken(token: any) {
  if (!token.contractAddress) return;
  
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
  const threshold = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72 hours
  
  const result = await TokenUniverseModel.updateMany(
    { lastUpdated: { $lt: threshold } },
    { $set: { active: false } }
  );
  
  if (result.modifiedCount > 0) {
    console.log(`[Token Universe] Marked ${result.modifiedCount} tokens as inactive`);
  }
}

// ============================================================
// STATS & QUERIES
// ============================================================

/**
 * Get token universe statistics
 */
export async function getTokenUniverseStats() {
  const [total, active, byChain, bySource, topTokens] = await Promise.all([
    TokenUniverseModel.countDocuments(),
    TokenUniverseModel.countDocuments({ active: true }),
    TokenUniverseModel.aggregate([
      { $group: { _id: '$chainId', count: { $sum: 1 } } },
    ]),
    TokenUniverseModel.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]),
    TokenUniverseModel.find({ active: true })
      .sort({ marketCap: -1 })
      .limit(10)
      .select('symbol name marketCap')
      .lean(),
  ]);
  
  const lastSync = await TokenUniverseModel.findOne()
    .sort({ lastSyncedAt: -1 })
    .select('lastSyncedAt')
    .lean();
  
  return {
    totalTokens: total,
    activeTokens: active,
    byChain: byChain.reduce((acc, item) => {
      const chainName = getChainName(item._id);
      acc[chainName] = item.count;
      return acc;
    }, {} as Record<string, number>),
    bySource: bySource.reduce((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {} as Record<string, number>),
    topTokens: topTokens.map(t => ({
      symbol: t.symbol,
      name: t.name,
      marketCap: t.marketCap,
    })),
    lastSync: lastSync?.lastSyncedAt,
  };
}

/**
 * Get chain name from ID
 */
function getChainName(chainId: number): string {
  const chains: Record<number, string> = {
    1: 'Ethereum',
    42161: 'Arbitrum',
    137: 'Polygon',
    10: 'Optimism',
    8453: 'Base',
  };
  return chains[chainId] || `Chain ${chainId}`;
}

/**
 * Sleep helper
 */
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
