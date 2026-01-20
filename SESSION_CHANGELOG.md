# Session Changelog - January 20, 2026

## Overview

This document describes all changes implemented during the current development session. These changes extend the existing codebase without replacing core functionality.

**Session Focus**: Implementation of Stages B, C, D, E and P0 (ML Runtime Control)

**Test Results**: 32/32 tests passing (100%)

---

## 🔴 P0: ML Runtime Control (Block 1)

### Purpose
Add runtime control for ML feature (OFF/ADVISOR/ASSIST modes) with UI toggle.

### Backend Changes

#### New File: `/app/backend/src/core/engine/engine_runtime.model.ts`
```typescript
// EngineRuntimeConfig schema
{
  mlEnabled: boolean,
  mlMode: 'off' | 'advisor' | 'assist',
  killSwitchActive: boolean,
  lastUpdate: Date,
  disableReason: string
}
```

#### New File: `/app/backend/src/core/engine/engine_runtime.service.ts`
- `getRuntimeConfig()` - Get current ML config
- `updateRuntimeConfig(config)` - Update ML mode

#### New File: `/app/backend/src/core/engine/engine_runtime.routes.ts`
- `GET /api/engine/ml/runtime` - Get ML config
- `POST /api/engine/ml/runtime` - Update ML mode

### Frontend Changes

#### New File: `/app/frontend/src/pages/SettingsPage.jsx`
- Settings page with light theme
- ML Toggle component integration
- System information display

#### New File: `/app/frontend/src/components/MLToggle.jsx`
- Toggle switch for ML modes (OFF/ADVISOR/ASSIST)
- Real-time status indicator
- API integration

#### Modified: `/app/frontend/src/components/Header.jsx`
- Added Settings icon (gear ⚙️) to header navigation
- Added `TrendingUp` icon import for Rankings

#### Modified: `/app/frontend/src/App.js`
- Added route: `/settings` → `SettingsPage`
- Added route: `/rankings` → `RankingsDashboard`

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/engine/ml/runtime` | Get ML runtime config |
| POST | `/api/engine/ml/runtime` | Update ML mode |

---

## 🟢 Stage B: Token Universe

### Purpose
Production-ready token ingestion from CoinGecko with rate-limiting support.

### Backend Changes

#### Modified: `/app/backend/src/core/token_universe/token_universe.model.ts`
Extended schema with new fields:
```typescript
{
  // New fields added:
  priceChange24h: Number,
  priceChange7d: Number,
  marketCapRank: Number,
  imageUrl: String,
  lastSyncedAt: Date,
  source: 'coingecko' | 'dexscreener' | 'cmc' | 'seed'
}
```

#### Rewritten: `/app/backend/src/core/token_universe/token_universe.service.ts`
- CoinGecko integration with known EVM contracts registry (93 tokens)
- Rate-limiting aware API calls (7 sec delay between requests)
- Retry logic with exponential backoff
- `ingestTokenUniverse(config)` - Main ingestion function
- `getTokenUniverseStats()` - Statistics query

#### Modified: `/app/backend/src/core/token_universe/token_universe.routes.ts`
Enhanced API endpoints with better response structure.

### Known Contracts Registry
Built-in registry of 93 top EVM tokens with verified contract addresses:
- Stablecoins: USDT, USDC, DAI, FRAX, etc.
- Wrapped assets: WETH, WBTC, wstETH, rETH
- DeFi: UNI, AAVE, MKR, LINK, CRV, etc.
- L2 tokens: MATIC, ARB, OP, etc.
- And more...

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tokens/stats` | Token universe statistics |
| GET | `/api/tokens` | Paginated token list |
| GET | `/api/tokens/:symbol` | Single token by symbol |
| GET | `/api/tokens/top` | Top tokens by market cap |
| POST | `/api/tokens/sync` | Sync from CoinGecko |
| POST | `/api/tokens/seed` | Seed with test data |
| DELETE | `/api/tokens/clear` | Clear all tokens |

---

## 🟡 Stage D: Ranking & Buckets

### Purpose
Rules-based scoring engine that sorts tokens into BUY/WATCH/SELL buckets.

### Backend Changes

#### New Directory: `/app/backend/src/core/ranking/`

#### New File: `/app/backend/src/core/ranking/ranking.model.ts`
```typescript
// TokenRanking schema
{
  symbol, contractAddress, chainId,
  marketCapScore, volumeScore, momentumScore,
  engineConfidence, engineRisk, mlAdjustment,
  compositeScore, bucket, bucketRank, globalRank,
  priceUsd, priceChange24h, marketCap, volume24h,
  name, imageUrl, computedAt, source
}
```

#### New File: `/app/backend/src/core/ranking/ranking.service.ts`
Scoring formula (v2 with Engine integration):
```
compositeScore = 
  marketCapScore * 0.25 +
  volumeScore * 0.20 +
  momentumScore * 0.20 +
  engineConfidence * 0.35
```

Bucket thresholds:
- **BUY**: score ≥ 70
- **WATCH**: 40 ≤ score < 70
- **SELL**: score < 40

Safety constraints:
- engineConfidence capped at ±15 points
- Engine alone cannot move SELL → BUY

Functions:
- `computeTokenRankings(config)` - Main computation
- `getRankingsByBucket(bucket, limit)` - Query by bucket
- `getBucketsSummary()` - Summary stats
- `getTokenRanking(symbol)` - Single token
- `getTopMovers(limit)` - Top momentum

#### New File: `/app/backend/src/core/ranking/ranking.routes.ts`
#### New File: `/app/backend/src/core/ranking/index.ts`

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rankings/compute` | Trigger ranking computation |
| GET | `/api/rankings/buckets` | Buckets summary |
| GET | `/api/rankings/bucket/:bucket` | Tokens in specific bucket |
| GET | `/api/rankings/token/:symbol` | Single token ranking |
| GET | `/api/rankings/movers` | Top movers by momentum |
| GET | `/api/rankings` | All rankings with pagination |
| GET | `/api/rankings/dashboard` | Full dashboard data |

---

## 🔵 Stage E: Dashboard UI

### Purpose
Final user-facing dashboard showing BUY/WATCH/SELL token buckets.

### Frontend Changes

#### New File: `/app/frontend/src/pages/RankingsDashboard.jsx`
Features:
- Summary stats cards (Total, BUY, WATCH, SELL counts)
- Three bucket tables with token data
- Token rows with: symbol, name, price, 24h change, market cap, volume, score bar
- "Sync Tokens" button (triggers CoinGecko sync)
- "Compute Rankings" button (triggers ranking computation)
- Settings link
- Responsive design with light theme

Components:
- `TokenRow` - Individual token display
- `BucketTable` - Table for each bucket (BUY/WATCH/SELL)

#### Modified: `/app/frontend/src/components/Header.jsx`
- Added "Rankings" to navigation items with TrendingUp icon
- Added Settings icon to header actions

---

## 🟣 Stage C: Token Runner

### Purpose
Batch processing of tokens through DecisionEngine to generate analysis data.

### Backend Changes

#### New Directory: `/app/backend/src/core/token_runner/`

#### New File: `/app/backend/src/core/token_runner/token_analysis.model.ts`
```typescript
// TokenAnalysis schema
{
  symbol, contractAddress, chainId,
  engineLabel: 'BUY' | 'SELL' | 'NEUTRAL',
  engineStrength: 'low' | 'medium' | 'high',
  engineScore, confidence, risk,
  coverage: { percent, checked: [] },
  inputsUsed: { actorSignals, contexts, corridors },
  signals: [], whyFactors: [], riskFactors: [],
  analysisMode: 'fast' | 'deep',
  analyzedAt, processingTime, status, error
}
```

#### New File: `/app/backend/src/core/token_runner/token_runner.service.ts`
Configuration:
- `batchSize`: 25 tokens (default)
- `timeoutPerToken`: 2000ms
- `analysisMode`: 'fast' (default)

Functions:
- `runTokenRunner(config)` - Main batch processing
- `analyzeToken(token, config)` - Single token analysis
- `calculateScores(engineResponse)` - Score extraction
- `getTokenAnalysis(symbol)` - Query single analysis
- `getAnalysisStats()` - Statistics
- `getTopByEngineScore(limit)` - Top by engine score

Performance: ~7ms per token in FAST mode

#### New File: `/app/backend/src/core/token_runner/token_runner.routes.ts`
#### New File: `/app/backend/src/core/token_runner/index.ts`

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/token-runner/run` | Run batch analysis |
| GET | `/api/token-runner/stats` | Analysis statistics |
| GET | `/api/token-runner/analysis/:symbol` | Single token analysis |
| GET | `/api/token-runner/top` | Top by engine score |
| GET | `/api/token-runner/analyses` | All analyses with pagination |

---

## Route Registration

### Modified: `/app/backend/src/api/routes.ts`

Added imports:
```typescript
import { tokenUniverseRoutes } from '../core/token_universe/token_universe.routes.js';
import { rankingRoutes } from '../core/ranking/ranking.routes.js';
import { tokenRunnerRoutes } from '../core/token_runner/token_runner.routes.js';
```

Added registrations:
```typescript
await app.register(tokenUniverseRoutes, { prefix: '/api' });
await app.register(rankingRoutes, { prefix: '/api' });
await app.register(tokenRunnerRoutes, { prefix: '/api' });
```

---

## Test Files Created

### `/app/tests/test_blockchain_analyzer.py`
- 18 tests for Token Universe, Rankings, ML Runtime APIs

### `/app/tests/test_token_runner.py`
- 14 tests for Token Runner and Ranking v2 integration

---

## Database Collections

### New Collections:
- `engine_runtime_configs` - ML runtime configuration
- `token_rankings` - Computed token rankings
- `token_analyses` - Engine analysis results

### Modified Collections:
- `token_universe` - Extended with new fields

---

## Current State Summary

| Component | Status | Tokens | Notes |
|-----------|--------|--------|-------|
| Token Universe | ✅ Active | 41 | Synced from CoinGecko |
| Token Analysis | ✅ Active | 25 | All NEUTRAL (no actor signals) |
| Rankings | ✅ Active | 41 | BUY=1, WATCH=23, SELL=17 |
| ML Runtime | ✅ Active | - | Mode: ADVISOR |

---

## Next Steps (Not Implemented)

1. **Actor Signals v1** - DEX flows, whale transfers, conflicts
2. **Cron Job** - Auto-run Token Runner every 15 minutes
3. **Bucket Change Detector** - Diff logic for notifications
4. **WebSocket Notifications** - Real-time bucket changes

---

## File Structure Summary

```
/app/backend/src/core/
├── engine/
│   ├── engine_runtime.model.ts     # NEW
│   ├── engine_runtime.service.ts   # NEW
│   └── engine_runtime.routes.ts    # NEW
├── ranking/                        # NEW DIRECTORY
│   ├── ranking.model.ts
│   ├── ranking.service.ts
│   ├── ranking.routes.ts
│   └── index.ts
├── token_runner/                   # NEW DIRECTORY
│   ├── token_analysis.model.ts
│   ├── token_runner.service.ts
│   ├── token_runner.routes.ts
│   └── index.ts
└── token_universe/
    ├── token_universe.model.ts     # MODIFIED
    ├── token_universe.service.ts   # REWRITTEN
    └── token_universe.routes.ts    # MODIFIED

/app/frontend/src/
├── pages/
│   ├── SettingsPage.jsx            # NEW
│   └── RankingsDashboard.jsx       # NEW
├── components/
│   ├── MLToggle.jsx                # NEW
│   └── Header.jsx                  # MODIFIED
└── App.js                          # MODIFIED
```
