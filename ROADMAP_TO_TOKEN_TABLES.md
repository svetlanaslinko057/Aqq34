# ROADMAP TO TOKEN TABLES — Финальный UX

**Goal:** От текущего Engine к "обезьяна заходит и сразу понимает, что смотреть"  
**Vision:** 3 таблицы по 20-50 токенов (BUY / WATCH / SELL)

---

## 🎯 ФИНАЛЬНЫЙ UX (Vision)

### Главная страница

**3 таба:**
- 🟢 **TOP BUY** (20-50 токенов)
- 🟡 **TOP WATCH** (20-50 токенов)  
- 🔴 **TOP SELL / AVOID** (20-50 токенов)

**Таблица для каждого таба:**
| Token | Score | Confidence | Risk | Reason |
|-------|-------|------------|------|--------|
| WETH | 82 | High | Low | "High inflow from whales" |
| USDC | 76 | Med | Low | "Stablecoin corridor spike" |
| ... | ... | ... | ... | ... |

**Сверху:**
- Horizon selector (1d / 7d / 30d)
- ML Toggle (OFF / ADVISOR / ASSIST)
- Timestamp последнего расчёта
- Health indicator

**Результат:**
- ✅ Пользователь не видит 5000 токенов
- ✅ Сразу понимает КУДА СМОТРЕТЬ
- ✅ Может дальше думать сам

---

## 🛤️ ROADMAP (6 этапов)

### 🔹 ЭТАП A — Engine + Toggle (ТЕКУЩИЙ)

**Статус:** Почти готово (Stage 1 в процессе)

**Что есть:**
- ✅ Rules Engine v1.2 frozen
- ✅ ML Advisor в shadow/assist
- ⚠️ ML Toggle (в разработке)
- ✅ P3 gating активен
- ✅ Bootstrap + live data работает

**Цель:** Безопасный, контролируемый Engine

**Осталось:**
- BE-7: ML Runtime Config API
- FE-4: ML Toggle Component (3 состояния)
- BE-5: ML Layer Freeze

---

### 🔹 ЭТАП B — Token Universe

**Что делаем:**

1. **Интеграция CoinGecko / CoinMarketCap API**
   - API keys
   - Rate limiting
   - Error handling

2. **Фильтр токенов:**
   - Только EVM
   - Только Ethereum (на старте)
   - Minimum liquidity threshold
   - Exclude scam/rug patterns

3. **Token Registry в БД:**
   ```typescript
   TokenUniverse {
     contract: string          // 0x...
     symbol: string            // "WETH"
     decimals: number          // 18
     liquidity_usd: number     // CoinGecko
     mcap_usd: number          // CoinGecko
     sector: string            // "DeFi", "Gaming", etc
     category: string          // "DEX", "Lending", etc
     lastUpdated: Date
   }
   ```

4. **Update job:**
   - Runs daily
   - Updates liquidity/mcap
   - Adds new tokens
   - Marks delisted

**Результат:** Список токенов для прогона (топ-500 по mcap/liquidity)

📌 **Важно:** Это не аналитика, это "список сущностей для прогона"

---

### 🔹 ЭТАП C — Token Runner (Ключевой)

**Job / Service: Token Analysis Runner**

**Алгоритм:**

```typescript
async function runTokenAnalysis() {
  // 1. Get token list (top 500)
  const tokens = await getTopTokens(limit = 500)
  
  // 2. For each token
  for (const token of tokens) {
    // 3. Build input
    const input = await buildEngineInput(token.symbol, window)
    
    // 4. Run decision
    const decision = await generateDecision(input)
    
    // 5. Calculate final score
    const score = calculateFinalScore(decision)
    
    // 6. Save recommendation
    await saveRecommendation({
      token: token.symbol,
      score: score,
      action: decision.decision,
      confidence: decision.confidenceBand,
      risk: decision.scores.risk,
      reason: decision.reasoning.shortExplanation,
      timestamp: new Date(),
    })
  }
}
```

**Cadence:**
- Runs every 15 minutes (configurable)
- Processes ~500 tokens
- Takes ~5-10 minutes

**Output:** `RecommendationEvent` collection

```typescript
RecommendationEvent {
  token: string
  score: number          // 0-100
  action: "BUY" | "WATCH" | "SELL"
  confidence: "low" | "medium" | "high"
  risk: number           // 0-100
  shortReason: string    // "High inflow from whales"
  fullExplainability: {...}
  timestamp: Date
}
```

📌 **Важно:** Rules решают action, ML (если включен) влияет на score/confidence

---

### 🔹 ЭТАП D — Ranking + Buckets

**Формирование таблиц:**

```typescript
async function buildTopTables() {
  // Get latest recommendations
  const recommendations = await getLatestRecommendations()
  
  // Filter by action
  const buyTokens = recommendations.filter(r => r.action === 'BUY')
  const watchTokens = recommendations.filter(r => r.action === 'WATCH')
  const sellTokens = recommendations.filter(r => r.action === 'SELL')
  
  // Sort each bucket
  const sortedBuy = buyTokens.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    if (a.confidence !== b.confidence) return confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
    return a.risk - b.risk  // Lower risk better
  })
  
  // Take top N
  return {
    topBuy: sortedBuy.slice(0, 50),
    topWatch: sortedWatch.slice(0, 50),
    topSell: sortedSell.slice(0, 50),
  }
}
```

**Sorting priority:**
1. **Primary:** finalScore (Rules-based)
2. **Secondary:** confidence (higher better)
3. **Tertiary:** risk (lower better)

📌 **Ключевое:** ML может только менять порядок внутри bucket, но не переводить из BUY в SELL

---

### 🔹 ЭТАП E — Финальный Dashboard

**Frontend implementation:**

**Components:**

1. **TokenTablesPage.jsx**
   ```jsx
   <TabContainer>
     <Tab name="TOP BUY" color="green">
       <TokenTable tokens={topBuy} />
     </Tab>
     <Tab name="TOP WATCH" color="yellow">
       <TokenTable tokens={topWatch} />
     </Tab>
     <Tab name="TOP SELL" color="red">
       <TokenTable tokens={topSell} />
     </Tab>
   </TabContainer>
   ```

2. **TokenTable.jsx**
   ```jsx
   <Table>
     <thead>
       <tr>
         <th>Token</th>
         <th>Score</th>
         <th>Confidence</th>
         <th>Risk</th>
         <th>Reason</th>
       </tr>
     </thead>
     <tbody>
       {tokens.map(token => (
         <TokenRow 
           key={token.symbol}
           token={token}
           onClick={() => showDetails(token)}
         />
       ))}
     </tbody>
   </Table>
   ```

3. **Controls:**
   - Horizon selector (1d / 7d / 30d)
   - ML Toggle (OFF / ADVISOR / ASSIST)
   - Refresh indicator
   - Last updated timestamp

**UX принципы:**
- ✅ Простота (таблица, а не графики)
- ✅ Очевидность (3 цвета, понятные названия)
- ✅ Прозрачность (shortReason всегда виден)
- ✅ Контроль (ML Toggle видим)

---

### 🔹 ЭТАП F — Outcome Loop (Self-Learning)

**Замыкание feedback loop:**

```typescript
async function collectOutcomes() {
  // 1. Get recommendations older than T (e.g., 24h)
  const oldRecs = await getRecommendations({ 
    timestamp: { $lt: Date.now() - 24*60*60*1000 }
  })
  
  // 2. For each recommendation
  for (const rec of oldRecs) {
    // 3. Get price outcome
    const priceStart = await getPrice(rec.token, rec.timestamp)
    const priceEnd = await getPrice(rec.token, Date.now())
    
    // 4. Calculate return
    const return_pct = (priceEnd - priceStart) / priceStart * 100
    
    // 5. Get benchmark (ETH)
    const ethReturn = await getETHReturn(rec.timestamp, Date.now())
    
    // 6. Calculate excess return
    const excessReturn = return_pct - ethReturn
    
    // 7. Label
    const label = labelOutcome(rec.action, excessReturn)
    // BUY + positive excess → success
    // BUY + negative excess → fail
    // etc.
    
    // 8. Save label
    await saveLabel({
      recommendationId: rec._id,
      outcome: label,
      return_pct,
      excessReturn,
      labeledAt: Date.now(),
    })
  }
}
```

**Training pipeline:**

```typescript
async function retrainModel() {
  // 1. Get labeled snapshots (Live Gold only)
  const snapshots = await getLabeledSnapshots()
  
  // 2. QA Gates
  if (!passQAGates(snapshots)) {
    abort('QA gates failed')
  }
  
  // 3. Train new model
  const model_v_new = await train(snapshots)
  
  // 4. Shadow eval
  const metrics = await evaluateInShadow(model_v_new)
  
  // 5. Promotion gate
  if (metrics.agreement > 0.85) {
    await promoteModel(model_v_new)
  } else {
    await keepInShadow()
  }
}
```

**Что улучшается:**
- ✅ Ranking accuracy (правильный порядок)
- ✅ Confidence calibration (когда high = действительно high)
- ✅ Risk estimation (реже ложные срабатывания)

📌 **Важно:** 
- Labels НЕ меняют прошлые решения
- Rules остаются frozen
- ML учится только ранжировать лучше

---

## 🔐 CRITICAL PRINCIPLES

### 1. Rules Authority

```
Rules decide action (BUY/WATCH/SELL)
ML может только влиять на score/order
Gates всегда защищают
```

### 2. ML Toggle Semantics

**3 состояния:**

```
OFF      → Rules-only (ML считает, но скрыт)
ADVISOR  → ML visible, влияет на confidence/risk
ASSIST   → ML влияет на ranking (±10), но не на gates
```

**Priority:**
1. Kill Switch (system override)
2. ML Toggle (operator control)
3. Default (OFF)

### 3. P3 Unlock Clarification

```
P3 unlock означает:
  ✅ Разрешение на training v1.1
  ❌ НЕ означает автоматическое включение ML влияния

После P3 unlock:
  - Можно тренировать модель
  - Включение влияния - только через toggle + KPI ok
```

### 4. Learning Scope

```
В Emergent:
  - Сбор данных
  - Shadow/advisor inference
  - Тестирование toggle

На сервере:
  - Автономное обучение
  - Outcome loop
  - Model evolution
```

---

## 📊 TIMELINE ESTIMATE

| Этап | Описание | Время |
|------|----------|-------|
| **A** | Engine + Toggle | 1-2 недели |
| **B** | Token Universe | 3-5 дней |
| **C** | Token Runner | 1 неделя |
| **D** | Ranking + Buckets | 2-3 дня |
| **E** | Dashboard | 1 неделя |
| **F** | Outcome Loop | 2 недели |

**Total:** ~6-8 недель до полного UX

---

## ✅ SUCCESS CRITERIA

### Этап E завершен, когда:

- [ ] Пользователь заходит на главную страницу
- [ ] Видит 3 таба (BUY/WATCH/SELL)
- [ ] В каждом табе 20-50 токенов
- [ ] Каждый токен с: score, confidence, risk, reason
- [ ] ML Toggle работает (OFF/ADVISOR/ASSIST)
- [ ] Данные обновляются каждые 15 минут
- [ ] Клик на токен → детальная страница
- [ ] Нет 5000 токенов, нет перегруза
- [ ] **Обезьяна понимает куда смотреть** ✅

---

## 🏁 FINAL VISION

**От:**
```
Пользователь видит:
- 5000 токенов
- Сложные графики
- Непонятные метрики
- Не знает что делать
```

**К:**
```
Пользователь видит:
- 3 таблицы (BUY/WATCH/SELL)
- Топ-50 в каждой
- Score + короткая причина
- Сразу понятно куда смотреть
- ML можно включить/выключить
```

---

**Дата:** 21 января 2025  
**Версия:** 1.0  
**Status:** ROADMAP DEFINITION
