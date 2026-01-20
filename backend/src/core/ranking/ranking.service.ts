/**
 * Token Ranking Service (Stage D)
 * 
 * Rules-based ranking engine
 * Sorts tokens into BUY / WATCH / SELL buckets
 * 
 * Scoring formula:
 *   compositeScore = w1*marketCapScore + w2*volumeScore + w3*momentumScore + w4*engineConfidence
 * 
 * Bucket thresholds:
 *   BUY:   score >= 70
 *   WATCH: 40 <= score < 70
 *   SELL:  score < 40
 * 
 * ML Influence (when enabled):
 *   - ADVISOR mode: ±10 to confidence/risk
 *   - ASSIST mode: ±10 to bucket rank (never changes bucket)
 */
import { TokenUniverseModel } from '../token_universe/token_universe.model.js';
import { TokenRankingModel, BucketType } from './ranking.model.js';

// ============================================================
// CONFIGURATION
// ============================================================

interface RankingConfig {
  // Score weights (must sum to 1.0)
  weights: {
    marketCap: number;
    volume: number;
    momentum: number;
    engineConfidence: number;
  };
  
  // Bucket thresholds
  thresholds: {
    buy: number;    // >= this → BUY
    watch: number;  // >= this → WATCH, else SELL
  };
  
  // Limits
  maxTokensPerBucket: number;
}

const DEFAULT_CONFIG: RankingConfig = {
  weights: {
    marketCap: 0.30,
    volume: 0.25,
    momentum: 0.25,
    engineConfidence: 0.20,
  },
  thresholds: {
    buy: 70,
    watch: 40,
  },
  maxTokensPerBucket: 50,
};

// ============================================================
// MAIN RANKING FUNCTION
// ============================================================

export interface RankingResult {
  computed: number;
  buckets: {
    BUY: number;
    WATCH: number;
    SELL: number;
  };
  duration_ms: number;
}

/**
 * Compute rankings for all active tokens
 */
export async function computeTokenRankings(
  config: RankingConfig = DEFAULT_CONFIG
): Promise<RankingResult> {
  console.log('[Ranking] Starting token ranking computation...');
  const startTime = Date.now();
  
  try {
    // 1. Fetch all active tokens
    const tokens = await TokenUniverseModel.find({ active: true })
      .select('symbol name contractAddress chainId marketCap volume24h priceUsd priceChange24h imageUrl')
      .lean();
    
    console.log(`[Ranking] Processing ${tokens.length} active tokens`);
    
    if (tokens.length === 0) {
      return {
        computed: 0,
        buckets: { BUY: 0, WATCH: 0, SELL: 0 },
        duration_ms: Date.now() - startTime,
      };
    }
    
    // 2. Calculate normalization bounds
    const marketCaps = tokens.map(t => t.marketCap || 0);
    const volumes = tokens.map(t => t.volume24h || 0);
    const priceChanges = tokens.map(t => t.priceChange24h || 0);
    
    const bounds = {
      marketCap: { min: Math.min(...marketCaps), max: Math.max(...marketCaps) },
      volume: { min: Math.min(...volumes), max: Math.max(...volumes) },
      priceChange: { min: Math.min(...priceChanges), max: Math.max(...priceChanges) },
    };
    
    // 3. Compute scores for each token
    const scoredTokens = tokens.map(token => {
      const scores = computeTokenScores(token, bounds);
      const compositeScore = computeCompositeScore(scores, config.weights);
      const bucket = determineBucket(compositeScore, config.thresholds);
      
      return {
        ...token,
        ...scores,
        compositeScore,
        bucket,
      };
    });
    
    // 4. Sort by composite score (descending)
    scoredTokens.sort((a, b) => b.compositeScore - a.compositeScore);
    
    // 5. Assign global and bucket ranks
    const bucketCounters = { BUY: 0, WATCH: 0, SELL: 0 };
    
    const rankedTokens = scoredTokens.map((token, idx) => {
      const bucketRank = ++bucketCounters[token.bucket];
      
      return {
        symbol: token.symbol,
        name: token.name,
        contractAddress: token.contractAddress,
        chainId: token.chainId,
        marketCapScore: token.marketCapScore,
        volumeScore: token.volumeScore,
        momentumScore: token.momentumScore,
        engineConfidence: 50, // Default - will be updated by Token Runner
        engineRisk: 50,
        mlAdjustment: 0,
        compositeScore: token.compositeScore,
        bucket: token.bucket,
        bucketRank,
        globalRank: idx + 1,
        priceUsd: token.priceUsd || 0,
        priceChange24h: token.priceChange24h || 0,
        marketCap: token.marketCap || 0,
        volume24h: token.volume24h || 0,
        imageUrl: token.imageUrl,
        computedAt: new Date(),
        source: 'rules',
      };
    });
    
    // 6. Upsert all rankings
    const bulkOps = rankedTokens.map(token => ({
      updateOne: {
        filter: { 
          contractAddress: token.contractAddress,
          chainId: token.chainId,
        },
        update: { $set: token },
        upsert: true,
      },
    }));
    
    if (bulkOps.length > 0) {
      await TokenRankingModel.bulkWrite(bulkOps);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Ranking] Computed ${rankedTokens.length} rankings in ${duration}ms`);
    console.log(`[Ranking] Buckets: BUY=${bucketCounters.BUY}, WATCH=${bucketCounters.WATCH}, SELL=${bucketCounters.SELL}`);
    
    return {
      computed: rankedTokens.length,
      buckets: bucketCounters,
      duration_ms: duration,
    };
  } catch (err: any) {
    console.error('[Ranking] Computation failed:', err);
    throw err;
  }
}

// ============================================================
// SCORING FUNCTIONS
// ============================================================

interface TokenScores {
  marketCapScore: number;
  volumeScore: number;
  momentumScore: number;
}

interface Bounds {
  marketCap: { min: number; max: number };
  volume: { min: number; max: number };
  priceChange: { min: number; max: number };
}

/**
 * Compute individual scores for a token
 */
function computeTokenScores(token: any, bounds: Bounds): TokenScores {
  // Market Cap Score (log scale normalization)
  const marketCapScore = normalizeLogScale(
    token.marketCap || 0,
    bounds.marketCap.min,
    bounds.marketCap.max
  );
  
  // Volume Score (log scale normalization)
  const volumeScore = normalizeLogScale(
    token.volume24h || 0,
    bounds.volume.min,
    bounds.volume.max
  );
  
  // Momentum Score (price change based)
  // Positive change = higher score, negative = lower
  const momentumScore = normalizeMomentum(
    token.priceChange24h || 0,
    bounds.priceChange.min,
    bounds.priceChange.max
  );
  
  return {
    marketCapScore: Math.round(marketCapScore * 100) / 100,
    volumeScore: Math.round(volumeScore * 100) / 100,
    momentumScore: Math.round(momentumScore * 100) / 100,
  };
}

/**
 * Normalize value using log scale (better for large ranges)
 */
function normalizeLogScale(value: number, min: number, max: number): number {
  if (max <= min || value <= 0) return 0;
  
  const logValue = Math.log10(Math.max(value, 1));
  const logMin = Math.log10(Math.max(min, 1));
  const logMax = Math.log10(Math.max(max, 1));
  
  if (logMax <= logMin) return 50;
  
  const normalized = ((logValue - logMin) / (logMax - logMin)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Normalize momentum (price change)
 * Maps [-100%, +100%] to [0, 100] score
 */
function normalizeMomentum(priceChange: number, min: number, max: number): number {
  // Clamp extreme values
  const clampedChange = Math.max(-50, Math.min(50, priceChange));
  
  // Map from [-50, 50] to [0, 100]
  const normalized = ((clampedChange + 50) / 100) * 100;
  
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Compute weighted composite score
 */
function computeCompositeScore(
  scores: TokenScores,
  weights: RankingConfig['weights']
): number {
  const composite = 
    scores.marketCapScore * weights.marketCap +
    scores.volumeScore * weights.volume +
    scores.momentumScore * weights.momentum +
    50 * weights.engineConfidence; // Default engine confidence
  
  return Math.round(composite * 100) / 100;
}

/**
 * Determine bucket based on composite score
 */
function determineBucket(
  score: number,
  thresholds: RankingConfig['thresholds']
): BucketType {
  if (score >= thresholds.buy) return 'BUY';
  if (score >= thresholds.watch) return 'WATCH';
  return 'SELL';
}

// ============================================================
// QUERY FUNCTIONS
// ============================================================

/**
 * Get rankings by bucket
 */
export async function getRankingsByBucket(bucket: BucketType, limit = 50) {
  const rankings = await TokenRankingModel.find({ bucket })
    .sort({ bucketRank: 1 })
    .limit(limit)
    .select('-_id symbol name contractAddress chainId compositeScore bucketRank globalRank priceUsd priceChange24h marketCap volume24h imageUrl computedAt')
    .lean();
  
  return rankings;
}

/**
 * Get all buckets summary
 */
export async function getBucketsSummary() {
  const [buy, watch, sell, lastComputed] = await Promise.all([
    TokenRankingModel.countDocuments({ bucket: 'BUY' }),
    TokenRankingModel.countDocuments({ bucket: 'WATCH' }),
    TokenRankingModel.countDocuments({ bucket: 'SELL' }),
    TokenRankingModel.findOne().sort({ computedAt: -1 }).select('computedAt').lean(),
  ]);
  
  return {
    BUY: buy,
    WATCH: watch,
    SELL: sell,
    total: buy + watch + sell,
    lastComputed: lastComputed?.computedAt,
  };
}

/**
 * Get ranking for single token
 */
export async function getTokenRanking(symbol: string) {
  const ranking = await TokenRankingModel.findOne({ 
    symbol: symbol.toUpperCase() 
  })
    .select('-_id')
    .lean();
  
  return ranking;
}

/**
 * Get top movers (highest momentum)
 */
export async function getTopMovers(limit = 10) {
  const movers = await TokenRankingModel.find({})
    .sort({ momentumScore: -1 })
    .limit(limit)
    .select('-_id symbol name priceChange24h momentumScore bucket')
    .lean();
  
  return movers;
}
