/**
 * Token Universe Routes
 * 
 * API endpoints for token universe management
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { TokenUniverseModel } from './token_universe.model.js';
import { 
  ingestTokenUniverse,
  getTokenUniverseStats,
} from './token_universe.service.js';
import { seedTokenUniverse } from './token_universe.seed.js';

export async function tokenUniverseRoutes(app: FastifyInstance): Promise<void> {
  
  /**
   * POST /api/tokens/sync
   * Trigger manual sync of token universe
   */
  app.post('/tokens/sync', async (request: FastifyRequest) => {
    const body = request.body as {
      minMarketCap?: number;
      minVolume24h?: number;
      maxTokens?: number;
    };
    
    const startTime = Date.now();
    
    try {
      const result = await ingestTokenUniverse({
        minMarketCap: body.minMarketCap || 1_000_000,
        minVolume24h: body.minVolume24h || 100_000,
        chainsAllowed: [1], // Ethereum only for now
        maxTokens: body.maxTokens || 1000,
      });
      
      const duration = Date.now() - startTime;
      
      return {
        ok: true,
        data: {
          ...result,
          duration_ms: duration,
        },
      };
    } catch (err: any) {
      return {
        ok: false,
        error: 'Token sync failed',
        details: err.message,
      };
    }
  });
  
  /**
   * GET /api/tokens
   * Query token universe
   */
  app.get('/tokens', async (request: FastifyRequest) => {
    const query = request.query as {
      active?: string;
      chainId?: string;
      minMarketCap?: string;
      limit?: string;
      offset?: string;
    };
    
    try {
      const filter: any = {};
      
      if (query.active === 'true') {
        filter.active = true;
      }
      
      if (query.chainId) {
        filter.chainId = parseInt(query.chainId);
      }
      
      if (query.minMarketCap) {
        filter.marketCap = { $gte: parseInt(query.minMarketCap) };
      }
      
      const limit = parseInt(query.limit || '100');
      const offset = parseInt(query.offset || '0');
      
      const [tokens, total] = await Promise.all([
        TokenUniverseModel.find(filter)
          .sort({ marketCap: -1 })
          .limit(limit)
          .skip(offset)
          .select('-_id symbol name contractAddress chainId marketCap volume24h priceUsd active')
          .lean(),
        TokenUniverseModel.countDocuments(filter),
      ]);
      
      return {
        ok: true,
        data: {
          tokens,
          total,
          limit,
          offset,
        },
      };
    } catch (err: any) {
      return {
        ok: false,
        error: 'Failed to query tokens',
        details: err.message,
      };
    }
  });
  
  /**
   * GET /api/tokens/stats
   * Get token universe statistics
   */
  app.get('/tokens/stats', async () => {
    try {
      const stats = await getTokenUniverseStats();
      
      return {
        ok: true,
        data: stats,
      };
    } catch (err: any) {
      return {
        ok: false,
        error: 'Failed to get stats',
        details: err.message,
      };
    }
  });
  
  app.log.info('[Token Universe] Routes registered');
}
