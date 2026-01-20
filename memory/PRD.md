# PRD: Blockchain Analysis Platform (FOMO)

## Overview
Full-stack blockchain analysis application with decision engine, token rankings, and ML advisor capabilities.

## Original Problem Statement
Deploy a blockchain analysis application from GitHub with API keys for Infura, Ankr, and Telegram. Core task is to complete the Decision Engine feature, specifically unblocking "P3" (ML training phase) by adding variance to the data through ActorSignals pipeline and token analysis.

## Architecture
- **Backend**: TypeScript/Node.js (Fastify) + Python proxy for supervisor
- **Frontend**: React with TailwindCSS
- **Database**: MongoDB
- **External APIs**: Infura (blockchain RPC), Ankr (RPC), Telegram (notifications), CoinGecko (token data)

## Core Features

### Completed ✅

#### P0: ML Runtime Control (Block 1)
- ML Toggle UI at `/settings` with light theme
- API: `GET/POST /api/engine/ml/runtime`
- Modes: OFF (rules-only), ADVISOR (±10 confidence/risk), ASSIST (±10 bucket rank)
- Kill Switch integration
- Settings icon in header navigation

#### Stage B: Token Universe
- CoinGecko integration with known contracts registry (93 tokens)
- Rate-limiting aware API calls
- Token model with extended fields (priceChange24h, priceChange7d, marketCapRank)
- APIs: 
  - `GET /api/tokens/stats` - Statistics
  - `GET /api/tokens` - Paginated list with search
  - `GET /api/tokens/:symbol` - Single token
  - `GET /api/tokens/top` - Top by market cap
  - `POST /api/tokens/sync` - Sync from CoinGecko
  - `POST /api/tokens/seed` - Seed fallback data

#### Stage D: Ranking & Buckets
- Rules-based scoring: marketCap(0.30) + volume(0.25) + momentum(0.25) + engineConfidence(0.20)
- Buckets: BUY (≥70), WATCH (40-69), SELL (<40)
- APIs:
  - `GET /api/rankings/buckets` - Summary
  - `GET /api/rankings/dashboard` - Full dashboard data
  - `GET /api/rankings/bucket/:bucket` - Bucket tokens
  - `POST /api/rankings/compute` - Trigger computation
  - `GET /api/rankings/movers` - Top momentum

#### Stage E: Dashboard UI
- `/rankings` page with 3 bucket tables
- Summary stats cards
- Token rows with price, 24h change, market cap, volume, score bar
- Sync Tokens and Compute Rankings buttons
- Rankings link in header navigation

### Completed ✅ (continued)

#### Stage C: Token Runner
- Manual API trigger: `POST /api/token-runner/run`
- FAST mode: ~7ms per token (25 tokens in 178ms)
- Stores engineScore, confidence, risk, engineLabel
- Ranking v2: engineConfidence integrated with 0.35 weight
- Safety: engineConfidence capped at ±15 points
- Safety: Engine alone cannot move SELL → BUY
- APIs:
  - `POST /api/token-runner/run` - Batch analysis
  - `GET /api/token-runner/stats` - Statistics
  - `GET /api/token-runner/analysis/:symbol` - Single token
  - `GET /api/token-runner/top` - Top by engine score
  - `GET /api/token-runner/analyses` - Paginated list

### Planned 📋

#### Stage F: Outcome Loop
- Track recommendation performance
- Feed data back to ML training

#### Final Polish
- Enhanced explainability tooltips
- Autonomous learning (Stage 2 - for production server only)

## Data Models

### TokenUniverse
```javascript
{
  symbol, name, contractAddress, chainId, decimals,
  marketCap, volume24h, liquidity, priceUsd,
  priceChange24h, priceChange7d, marketCapRank,
  imageUrl, sector, category, coingeckoId,
  active, lastUpdated, lastSyncedAt, source
}
```

### TokenRanking
```javascript
{
  symbol, contractAddress, chainId,
  marketCapScore, volumeScore, momentumScore,
  engineConfidence, engineRisk, mlAdjustment,
  compositeScore, bucket, bucketRank, globalRank,
  priceUsd, priceChange24h, marketCap, volume24h,
  name, imageUrl, computedAt, source
}
```

### EngineRuntimeConfig
```javascript
{
  mlEnabled: boolean,
  mlMode: 'off' | 'advisor' | 'assist',
  killSwitchActive: boolean,
  lastUpdate, disableReason
}
```

## Test Results
- **Backend**: 32/32 tests passing (100%)
- **Frontend**: All pages verified (100%)
- See `/app/test_reports/iteration_2.json` for latest results

### In Progress 🚧

#### Cron Job for Token Runner
- Auto-run every 15 minutes (after stabilization)

## Files Reference
- `/app/backend/src/core/token_universe/` - Token Universe module
- `/app/backend/src/core/ranking/` - Ranking module
- `/app/backend/src/core/engine/engine_runtime.routes.ts` - ML runtime
- `/app/frontend/src/pages/RankingsDashboard.jsx` - Dashboard UI
- `/app/frontend/src/pages/SettingsPage.jsx` - ML Toggle page
- `/app/frontend/src/components/Header.jsx` - Navigation

## Files Reference (Updated)
- `/app/backend/src/core/token_runner/` - Stage C Token Runner module
- `/app/backend/src/core/token_universe/` - Stage B Token Universe
- `/app/backend/src/core/ranking/` - Stage D Ranking v2 with Engine integration
- `/app/backend/src/core/engine/engine_runtime.routes.ts` - P0 ML runtime
- `/app/frontend/src/pages/RankingsDashboard.jsx` - Stage E Dashboard UI
- `/app/frontend/src/pages/SettingsPage.jsx` - P0 ML Toggle page

## Last Updated
2026-01-20 - Completed Stages B, C, D, E and P0 with full testing (32/32 tests)
