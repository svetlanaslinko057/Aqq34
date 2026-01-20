# IMPLEMENTATION SPEC — БЛОК 2: TOKEN UNIVERSE

**Priority:** P1 HIGH (Foundation for Final UX)  
**Goal:** Создать вселенную токенов для финального продукта  
**Status:** READY TO START

---

## 🎯 ЦЕЛЬ БЛОКА

Создать базу токенов, по которой будет работать финальная логика **BUY / WATCH / SELL**.

Без этого финального продукта не существует.

---

## 📦 DATA MODEL

### Token Universe Schema

```typescript
// MongoDB Collection: token_universe
interface TokenUniverse {
  _id: ObjectId;
  
  // Identity
  symbol: string;               // "WETH", "USDC"
  name: string;                 // "Wrapped Ether"
  contractAddress: string;      // 0x... (lowercase)
  chainId: number;              // 1 = Ethereum, 42161 = Arbitrum
  decimals: number;             // 18
  
  // Market Data
  marketCap: number;            // USD
  volume24h: number;            // USD
  liquidity?: number;           // USD (if available)
  priceUsd: number;             // Current price
  
  // Metadata
  sector?: string;              // "DeFi", "Gaming", "Infrastructure"
  category?: string;            // "DEX", "Lending", "L2"
  coingeckoId?: string;         // For price lookups
  
  // Status
  active: boolean;              // true if meets criteria
  lastUpdated: Date;
  
  // Source
  source: 'coingecko' | 'cmc'; // Data source
  ingestedAt: Date;
}
```

### Indexes

```typescript
// Required indexes
db.token_universe.createIndex({ symbol: 1 }, { unique: true })
db.token_universe.createIndex({ contractAddress: 1, chainId: 1 }, { unique: true })
db.token_universe.createIndex({ active: 1, marketCap: -1 })
db.token_universe.createIndex({ lastUpdated: 1 })
```

---

## 🌍 DATA SOURCE

### Primary: CoinGecko API

**Endpoint:**
```
GET https://api.coingecko.com/api/v3/coins/markets
```

**Parameters:**
```javascript
{
  vs_currency: 'usd',
  category: 'ethereum-ecosystem', // Filter EVM
  order: 'market_cap_desc',
  per_page: 250,
  page: 1,
  sparkline: false,
  locale: 'en'
}
```

**Rate Limits:**
- Free tier: 10-50 calls/min
- Pro tier: 500 calls/min

**Response Format:**
```json
[
  {
    "id": "weth",
    "symbol": "weth",
    "name": "WETH",
    "current_price": 2245.12,
    "market_cap": 7234567890,
    "total_volume": 1234567890,
    "platforms": {
      "ethereum": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
    }
  }
]
```

---

## 🔧 INGESTION PIPELINE

### Architecture

```
CoinGecko API → Fetch → Filter → Normalize → Validate → Upsert → Activate
```

### Implementation

```typescript
// services/token_universe.service.ts

interface IngestConfig {
  minMarketCap: number;      // e.g., $1M
  minVolume24h: number;      // e.g., $100k
  chainsAllowed: number[];   // [1] = Ethereum only
  maxTokens: number;         // e.g., 1000
}

const DEFAULT_CONFIG: IngestConfig = {
  minMarketCap: 1_000_000,
  minVolume24h: 100_000,
  chainsAllowed: [1], // Ethereum only initially
  maxTokens: 1000,
};

async function ingestTokenUniverse(config = DEFAULT_CONFIG) {
  console.log('[Token Universe] Starting ingestion...');
  
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
  
  // 5. Mark inactive (tokens that disappeared)
  await markInactiveTokens();
  
  return {
    fetched: tokens.length,
    filtered: evmTokens.length,
    qualified: qualifiedTokens.length,
    upserted: upsertedCount,
  };
}

function isEVMToken(token: any): boolean {
  return (
    token.platforms?.ethereum || 
    token.platforms?.arbitrum || 
    token.platforms?.polygon
  );
}

function normalizeToken(coinGeckoToken: any): TokenUniverse {
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
    decimals: 18, // Default, can fetch from contract later
    marketCap: coinGeckoToken.market_cap,
    volume24h: coinGeckoToken.total_volume,
    priceUsd: coinGeckoToken.current_price,
    coingeckoId: coinGeckoToken.id,
    active: true,
    lastUpdated: new Date(),
    source: 'coingecko',
    ingestedAt: new Date(),
  };
}

async function upsertToken(token: TokenUniverse) {
  await TokenUniverseModel.updateOne(
    { 
      contractAddress: token.contractAddress,
      chainId: token.chainId,
    },
    { $set: token },
    { upsert: true }
  );
}

async function markInactiveTokens() {
  // Mark tokens that weren't updated in last 48h as inactive
  const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000);
  
  const result = await TokenUniverseModel.updateMany(
    { lastUpdated: { $lt: threshold } },
    { $set: { active: false } }
  );
  
  console.log(`[Token Universe] Marked ${result.modifiedCount} tokens as inactive`);
}
```

---

## 🔌 API ENDPOINTS

### POST /api/tokens/sync

**Description:** Trigger manual sync of token universe

**Request:**
```json
{
  "minMarketCap": 1000000,
  "minVolume24h": 100000,
  "maxTokens": 1000
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "fetched": 2500,
    "filtered": 1200,
    "qualified": 850,
    "upserted": 850,
    "duration_ms": 45000
  }
}
```

---

### GET /api/tokens

**Description:** Get token universe

**Query Parameters:**
- `active` (boolean) - Filter active tokens only
- `chainId` (number) - Filter by chain
- `minMarketCap` (number) - Minimum market cap
- `limit` (number) - Max results (default: 100)
- `offset` (number) - Pagination

**Response:**
```json
{
  "ok": true,
  "data": {
    "tokens": [
      {
        "symbol": "WETH",
        "name": "Wrapped Ether",
        "contractAddress": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "chainId": 1,
        "marketCap": 7234567890,
        "volume24h": 1234567890,
        "priceUsd": 2245.12,
        "active": true
      }
    ],
    "total": 850,
    "limit": 100,
    "offset": 0
  }
}
```

---

### GET /api/tokens/stats

**Description:** Get token universe statistics

**Response:**
```json
{
  "ok": true,
  "data": {
    "totalTokens": 850,
    "activeTokens": 820,
    "byChain": {
      "1": 750,
      "42161": 70,
      "137": 30
    },
    "lastSync": "2025-01-21T12:00:00Z",
    "avgMarketCap": 125000000,
    "avgVolume24h": 15000000
  }
}
```

---

## ⏰ SCHEDULED SYNC

### Cron Job

```typescript
// jobs/sync_token_universe.job.ts

import { CronJob } from 'cron';
import { ingestTokenUniverse } from '../services/token_universe.service';

export function registerTokenUniverseSync() {
  // Run daily at 00:00 UTC
  const job = new CronJob('0 0 * * *', async () => {
    console.log('[Cron] Starting token universe sync...');
    
    try {
      const result = await ingestTokenUniverse();
      console.log('[Cron] Token universe sync complete:', result);
    } catch (err) {
      console.error('[Cron] Token universe sync failed:', err);
    }
  });
  
  job.start();
  console.log('[Cron] Token universe sync job registered (daily 00:00 UTC)');
}
```

---

## 🧪 TESTING

### Unit Tests

```typescript
describe('Token Universe Ingestion', () => {
  test('filters EVM-only tokens', () => {
    const tokens = [
      { platforms: { ethereum: '0x123' } },  // ✅ EVM
      { platforms: { solana: 'abc' } },      // ❌ Non-EVM
      { platforms: { arbitrum: '0x456' } },  // ✅ EVM
    ];
    
    const evmTokens = tokens.filter(isEVMToken);
    expect(evmTokens).toHaveLength(2);
  });
  
  test('normalizes token data correctly', () => {
    const coinGeckoToken = {
      symbol: 'weth',
      name: 'WETH',
      market_cap: 1000000,
      platforms: { ethereum: '0xabc' },
    };
    
    const normalized = normalizeToken(coinGeckoToken);
    expect(normalized.symbol).toBe('WETH');
    expect(normalized.contractAddress).toBe('0xabc');
    expect(normalized.chainId).toBe(1);
  });
  
  test('upsert is idempotent', async () => {
    const token = { symbol: 'TEST', contractAddress: '0x123', chainId: 1 };
    
    await upsertToken(token);
    await upsertToken(token);
    
    const count = await TokenUniverseModel.countDocuments({ symbol: 'TEST' });
    expect(count).toBe(1);
  });
});
```

---

## 📋 IMPLEMENTATION TASKS

### BE-Stage-B.1 - Data Model
- [ ] Create TokenUniverse schema
- [ ] Add indexes (symbol, contractAddress, active)
- [ ] Add validation rules

### BE-Stage-B.2 - CoinGecko Integration
- [ ] API client with rate limiting
- [ ] Fetch tokens with pagination
- [ ] Error handling & retries

### BE-Stage-B.3 - Ingestion Service
- [ ] `ingestTokenUniverse()` function
- [ ] Filter: EVM-only
- [ ] Filter: market cap / volume thresholds
- [ ] Normalize data
- [ ] Upsert logic (idempotent)
- [ ] Mark inactive tokens

### BE-Stage-B.4 - API Routes
- [ ] `POST /api/tokens/sync`
- [ ] `GET /api/tokens` (with filters)
- [ ] `GET /api/tokens/stats`

### BE-Stage-B.5 - Cron Job
- [ ] Daily sync (00:00 UTC)
- [ ] Error handling
- [ ] Logging

### BE-Stage-B.6 - Tests
- [ ] Unit: Filter EVM-only
- [ ] Unit: Normalize data
- [ ] Unit: Upsert idempotency
- [ ] Integration: Full sync pipeline

---

## ✅ DEFINITION OF DONE (БЛОК 2)

- [ ] ✅ В базе 300-1000 токенов
- [ ] ✅ У каждого есть contractAddress
- [ ] ✅ Нет non-EVM мусора
- [ ] ✅ Обновление idempotent
- [ ] ✅ Sync можно запустить вручную
- [ ] ✅ Sync запускается автоматически (daily)
- [ ] ✅ API endpoints работают
- [ ] ✅ Статистика доступна

---

## 🚫 ЧТО ПОКА НЕ ДЕЛАЕМ

**❌ НЕ делаем сейчас:**
- ❌ Не ранжируем токены
- ❌ Не выдаём BUY/SELL рекомендации
- ❌ Не запускаем Token Runner
- ❌ Не создаем buckets
- ❌ Не учим outcome loop

**Только:** Чистая база токенов для будущего прогона.

---

## 📊 ACCEPTANCE CRITERIA

**Scenario 1: Manual sync**
```
1. Operator calls POST /api/tokens/sync
2. System fetches from CoinGecko
3. Filters EVM-only tokens
4. Applies market cap / volume thresholds
5. Upserts to database
6. Returns stats
7. Database contains 300-1000 active tokens
```

**Scenario 2: Query tokens**
```
1. Frontend calls GET /api/tokens?active=true&limit=100
2. Returns 100 active tokens sorted by market cap
3. Each token has: symbol, name, contract, chain, mcap, volume
```

**Scenario 3: Daily sync**
```
1. Cron job triggers at 00:00 UTC
2. Runs ingestion pipeline
3. Updates existing tokens
4. Adds new tokens
5. Marks disappeared tokens as inactive
6. Logs results
```

---

## 🔗 NEXT STEPS (NOT NOW)

После завершения Блока 2:

**Блок 3 - Token Runner**
- Прогон каждого токена через Engine
- Получение score/action/confidence
- Сохранение в RecommendationEvent

**Блок 4 - Buckets & Ranking**
- Группировка по action (BUY/WATCH/SELL)
- Сортировка по score
- Top-50 в каждом bucket

**Блок 5 - Dashboard**
- 3 таблицы (BUY/WATCH/SELL)
- Финальный UX

---

**Дата:** 21 января 2025  
**Версия:** 1.0  
**Status:** READY TO IMPLEMENT
