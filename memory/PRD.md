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

---

## Implementation Status

### ✅ Completed (Session: January 20, 2026)

#### P0: ML Runtime Control
| Component | Status | Details |
|-----------|--------|---------|
| Backend API | ✅ Done | `GET/POST /api/engine/ml/runtime` |
| ML Modes | ✅ Done | OFF, ADVISOR, ASSIST |
| Frontend UI | ✅ Done | `/settings` page with toggle |
| Navigation | ✅ Done | Settings icon in header |

**Files:**
- `/app/backend/src/core/engine/engine_runtime.model.ts`
- `/app/backend/src/core/engine/engine_runtime.service.ts`
- `/app/backend/src/core/engine/engine_runtime.routes.ts`
- `/app/frontend/src/pages/SettingsPage.jsx`
- `/app/frontend/src/components/MLToggle.jsx`

---

#### Stage B: Token Universe
| Component | Status | Details |
|-----------|--------|---------|
| CoinGecko Integration | ✅ Done | Rate-limiting aware |
| Known Contracts | ✅ Done | 93 EVM tokens |
| Extended Model | ✅ Done | priceChange24h, marketCapRank, etc. |
| APIs | ✅ Done | Full CRUD + sync |

**Current Data:** 41 tokens synced

**APIs:**
- `GET /api/tokens/stats` - Statistics
- `GET /api/tokens` - Paginated list
- `GET /api/tokens/:symbol` - Single token
- `GET /api/tokens/top` - Top by market cap
- `POST /api/tokens/sync` - Sync from CoinGecko
- `POST /api/tokens/seed` - Seed fallback

**Files:**
- `/app/backend/src/core/token_universe/token_universe.model.ts`
- `/app/backend/src/core/token_universe/token_universe.service.ts`
- `/app/backend/src/core/token_universe/token_universe.routes.ts`

---

#### Stage C: Token Runner
| Component | Status | Details |
|-----------|--------|---------|
| Batch Processing | ✅ Done | ~7ms per token |
| Engine Integration | ✅ Done | Calls DecisionEngine |
| Analysis Storage | ✅ Done | TokenAnalysis collection |
| APIs | ✅ Done | Full CRUD |

**Current Data:** 25 tokens analyzed (all NEUTRAL - expected, no actor signals)

**APIs:**
- `POST /api/token-runner/run` - Run batch analysis
- `GET /api/token-runner/stats` - Statistics
- `GET /api/token-runner/analysis/:symbol` - Single analysis
- `GET /api/token-runner/top` - Top by engine score
- `GET /api/token-runner/analyses` - Paginated list

**Files:**
- `/app/backend/src/core/token_runner/token_analysis.model.ts`
- `/app/backend/src/core/token_runner/token_runner.service.ts`
- `/app/backend/src/core/token_runner/token_runner.routes.ts`

---

#### Stage D: Ranking & Buckets
| Component | Status | Details |
|-----------|--------|---------|
| Scoring Formula | ✅ Done | v2 with Engine integration |
| Bucket Classification | ✅ Done | BUY/WATCH/SELL |
| Safety Constraints | ✅ Done | ±15 cap, no SELL→BUY |
| APIs | ✅ Done | Full CRUD |

**Ranking Formula v2:**
```
compositeScore = 
  marketCapScore * 0.25 +
  volumeScore * 0.20 +
  momentumScore * 0.20 +
  engineConfidence * 0.35
```

**Bucket Thresholds:**
- BUY: score ≥ 70
- WATCH: 40 ≤ score < 70
- SELL: score < 40

**Current Distribution:** BUY=1, WATCH=23, SELL=17

**APIs:**
- `POST /api/rankings/compute` - Trigger computation
- `GET /api/rankings/buckets` - Summary
- `GET /api/rankings/dashboard` - Full dashboard
- `GET /api/rankings/bucket/:bucket` - Bucket tokens
- `GET /api/rankings/token/:symbol` - Single ranking
- `GET /api/rankings/movers` - Top momentum

**Files:**
- `/app/backend/src/core/ranking/ranking.model.ts`
- `/app/backend/src/core/ranking/ranking.service.ts`
- `/app/backend/src/core/ranking/ranking.routes.ts`

---

#### Stage E: Dashboard UI
| Component | Status | Details |
|-----------|--------|---------|
| Rankings Page | ✅ Done | `/rankings` route |
| Bucket Tables | ✅ Done | BUY/WATCH/SELL |
| Summary Cards | ✅ Done | Token counts |
| Actions | ✅ Done | Sync, Compute buttons |
| Navigation | ✅ Done | Rankings link in header |

**Files:**
- `/app/frontend/src/pages/RankingsDashboard.jsx`
- `/app/frontend/src/components/Header.jsx` (modified)
- `/app/frontend/src/App.js` (modified)

---

### 🚧 Next Priority: Actor Signals v1

**Purpose:** Give Engine real data to generate BUY/SELL (not just NEUTRAL)

**Tickets:**
| ID | Name | Priority | Description |
|----|------|----------|-------------|
| AS-1 | DEX Flow Signals | 🔴 P0 | netFlowUSD, liquidityChangePct |
| AS-2 | Whale Transfer Signals | 🔴 P0 | amountUSD, direction |
| AS-3 | Actor Conflict Signals | 🟠 P1 | conflictScore |
| AS-4 | Engine Adapter | 🔴 P0 | Connect signals to Engine |

**Engine Rule Deltas (approved):**
```
DEX Flow:
- Strong Inflow (>$250k) → Evidence +15, Direction +10
- Outflow (<-$150k) → Direction -10, Risk +5
- Liquidity Drain (<-15%) → Risk +20, Confidence -15

Whale Transfers:
- Accumulation → Evidence +20, Direction +15, Confidence +10
- Exit → Direction -20, Risk +15
- Repeated Exits → Risk +25, Confidence -20

Conflicts:
- Moderate (≥0.4) → Confidence -15
- High (≥0.6) → Confidence -30, Risk +20
- Lock (≥0.7) → forceDecision = NEUTRAL
```

---

### 📋 Backlog

| Feature | Priority | Notes |
|---------|----------|-------|
| Cron Job | P1 | After Actor Signals |
| Bucket Change Detector | P2 | Diff logic |
| WebSocket Notifications | P2 | Real-time updates |
| Stage F: Outcome Loop | P2 | Track performance |
| Autonomous Learning | P3 | Production only |

---

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

### TokenAnalysis
```javascript
{
  symbol, contractAddress, chainId,
  engineLabel: 'BUY' | 'SELL' | 'NEUTRAL',
  engineStrength: 'low' | 'medium' | 'high',
  engineScore, confidence, risk,
  coverage: { percent, checked: [] },
  inputsUsed: { actorSignals, contexts, corridors },
  whyFactors: [], riskFactors: [],
  analysisMode, analyzedAt, processingTime, status
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

---

## Test Results

**Backend:** 32/32 tests passing (100%)
- Token Universe API: 5 tests
- Rankings API: 6 tests
- ML Runtime API: 6 tests
- Token Runner API: 14 tests
- Health: 1 test

**Test Files:**
- `/app/tests/test_blockchain_analyzer.py`
- `/app/tests/test_token_runner.py`
- `/app/test_reports/iteration_2.json`

---

## File Structure (New/Modified)

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

/app/backend/src/api/
└── routes.ts                       # MODIFIED (added route registrations)
```

---

## Documentation

- `/app/README.md` - Project overview
- `/app/SESSION_CHANGELOG.md` - Detailed changes log
- `/app/STAGE_1_TICKETS.md` - Implementation plan
- `/app/ROADMAP_TO_TOKEN_TABLES.md` - Full roadmap
- `/app/ENGINE_SELF_LEARNING_SPEC.md` - ML architecture

---

## Last Updated
**2026-01-20** - Completed Stages B, C, D, E and P0 with full testing (32/32 tests)
