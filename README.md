# FOMO - Blockchain Analysis Platform

A full-stack blockchain analysis application with Decision Engine, Token Rankings, and ML advisor capabilities.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- API Keys: Infura, Ankr (for blockchain RPC)

### Installation

```bash
# Backend
cd backend
npm install
cp .env.example .env  # Configure your keys
npm run dev

# Frontend
cd frontend
yarn install
yarn start
```

### Environment Variables

**Backend** (`/backend/.env`):
```
MONGO_URL=mongodb://localhost:27017/fomo
INFURA_API_KEY=your_key
ANKR_API_KEY=your_key
TELEGRAM_BOT_TOKEN=your_token  # Optional
```

**Frontend** (`/frontend/.env`):
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Market  │  │ Rankings │  │ Settings │  │   Tokens     │  │
│  │Dashboard│  │Dashboard │  │(ML Toggle│  │   Page       │  │
│  └─────────┘  └──────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Fastify/Node.js)                 │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │Token Universe│  │ Token Runner │  │  Decision Engine │   │
│  │  (Stage B)   │  │  (Stage C)   │  │                  │   │
│  │              │  │              │  │  ┌────────────┐  │   │
│  │ • CoinGecko  │  │ • Batch      │  │  │ Rules-based│  │   │
│  │ • 93 known   │  │   processing │  │  │ + ML Advisor│  │   │
│  │   contracts  │  │ • Engine     │  │  └────────────┘  │   │
│  │              │  │   analysis   │  │                  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                              │                               │
│                              ▼                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               Ranking Engine (Stage D)                │   │
│  │                                                       │   │
│  │   compositeScore = marketCap(0.25) + volume(0.20)    │   │
│  │                   + momentum(0.20) + engineConf(0.35) │   │
│  │                                                       │   │
│  │   BUY (≥70) │ WATCH (40-69) │ SELL (<40)             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       MongoDB                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐  │
│  │token_      │ │token_      │ │token_      │ │engine_   │  │
│  │universe    │ │analyses    │ │rankings    │ │runtime_  │  │
│  │            │ │            │ │            │ │configs   │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Core Features

### ✅ Implemented

#### Token Universe (Stage B)
- CoinGecko integration with rate-limiting
- 93 known EVM contract addresses
- Auto-sync with market data
- **API**: `/api/tokens/*`

#### Token Runner (Stage C)  
- Batch processing through DecisionEngine
- FAST mode: ~7ms per token
- Stores engineScore, confidence, risk
- **API**: `/api/token-runner/*`

#### Ranking & Buckets (Stage D)
- Rules-based scoring with Engine integration
- BUY / WATCH / SELL bucket classification
- Safety: engineConfidence capped at ±15 points
- **API**: `/api/rankings/*`

#### Dashboard UI (Stage E)
- Three-bucket token tables
- Real-time sync & compute buttons
- Summary statistics cards
- **Route**: `/rankings`

#### ML Runtime Control (P0)
- OFF / ADVISOR / ASSIST modes
- Runtime toggle via UI
- Kill switch support
- **Route**: `/settings`

### 🚧 Planned

#### Actor Signals v1
- DEX Flow Signals
- Whale Transfer Signals
- Actor Conflict Detection

#### Cron Job
- Auto-run Token Runner every 15 minutes

#### Outcome Loop (Stage F)
- Track recommendation performance
- Feed data to ML training

---

## 📡 API Reference

### Token Universe
```
GET  /api/tokens/stats          # Statistics
GET  /api/tokens                # List with pagination
GET  /api/tokens/:symbol        # Single token
GET  /api/tokens/top            # Top by market cap
POST /api/tokens/sync           # Sync from CoinGecko
```

### Token Runner
```
POST /api/token-runner/run              # Run batch analysis
GET  /api/token-runner/stats            # Analysis stats
GET  /api/token-runner/analysis/:symbol # Single analysis
GET  /api/token-runner/top              # Top by engine score
GET  /api/token-runner/analyses         # All analyses
```

### Rankings
```
POST /api/rankings/compute       # Trigger computation
GET  /api/rankings/buckets       # Summary
GET  /api/rankings/dashboard     # Full dashboard data
GET  /api/rankings/bucket/:bucket # Tokens in bucket
GET  /api/rankings/token/:symbol # Single token ranking
GET  /api/rankings/movers        # Top momentum
```

### ML Runtime
```
GET  /api/engine/ml/runtime      # Get config
POST /api/engine/ml/runtime      # Update mode
```

---

## 🧮 Ranking Formula

```javascript
compositeScore = 
  marketCapScore * 0.25 +      // Market capitalization
  volumeScore * 0.20 +         // 24h trading volume
  momentumScore * 0.20 +       // Price change momentum
  engineConfidence * 0.35      // DecisionEngine confidence

// Bucket Classification
BUY:     score >= 70 AND safety_checks_passed
WATCH:   40 <= score < 70
SELL:    score < 40

// Safety Constraints
- engineConfidence capped at ±15 points from neutral (50)
- Engine alone cannot move SELL → BUY
- High conflict → force NEUTRAL
```

---

## 📁 Project Structure

```
/app
├── backend/
│   ├── src/
│   │   ├── api/                    # Route registration
│   │   ├── core/
│   │   │   ├── engine/             # Decision Engine
│   │   │   ├── ranking/            # Ranking service (NEW)
│   │   │   ├── token_runner/       # Token Runner (NEW)
│   │   │   ├── token_universe/     # Token management
│   │   │   └── ...
│   │   └── server.ts
│   └── server.py                   # Supervisor proxy
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx          # Navigation
│   │   │   ├── MLToggle.jsx        # ML control (NEW)
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── RankingsDashboard.jsx  # Rankings UI (NEW)
│   │   │   ├── SettingsPage.jsx       # Settings (NEW)
│   │   │   └── ...
│   │   └── App.js
│   └── package.json
│
├── tests/
│   ├── test_blockchain_analyzer.py
│   └── test_token_runner.py
│
└── docs/
    ├── SESSION_CHANGELOG.md        # Latest changes
    ├── STAGE_1_TICKETS.md
    ├── ROADMAP_TO_TOKEN_TABLES.md
    └── ...
```

---

## 🧪 Testing

```bash
# Run all tests
cd backend
pytest tests/ -v

# Current status: 32/32 tests passing
```

---

## 📈 Current Data Status

| Metric | Value |
|--------|-------|
| Tokens in Universe | 41 |
| Tokens Analyzed | 25 |
| BUY Bucket | 1 |
| WATCH Bucket | 23 |
| SELL Bucket | 17 |
| ML Mode | ADVISOR |

*Note: All Engine labels are NEUTRAL due to missing Actor Signals data. This is expected behavior.*

---

## 📚 Documentation

- [Session Changelog](./SESSION_CHANGELOG.md) - Latest development session changes
- [Stage 1 Tickets](./STAGE_1_TICKETS.md) - Implementation plan
- [Roadmap to Token Tables](./ROADMAP_TO_TOKEN_TABLES.md) - Full roadmap
- [Engine Self-Learning Spec](./ENGINE_SELF_LEARNING_SPEC.md) - ML architecture
- [Deployment Summary](./DEPLOYMENT_SUMMARY.md) - Deployment details

---

## 🔐 Safety & Constraints

1. **ML Influence Limits**: Engine confidence capped at ±15 points
2. **Bucket Protection**: Engine cannot directly move SELL → BUY
3. **Conflict Detection**: High conflict → force NEUTRAL
4. **Kill Switch**: Instant ML disable capability
5. **Coverage Gates**: Insufficient data → NEUTRAL

---

## License

Private - All rights reserved
