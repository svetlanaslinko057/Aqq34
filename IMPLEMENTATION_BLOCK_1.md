# IMPLEMENTATION SPEC — БЛОК 1: ML RUNTIME CONTROL

**Priority:** P0 CRITICAL  
**Goal:** Сделать ML управляемым, безопасным и всегда живым  
**Status:** READY TO START

---

## 🎯 ЦЕЛЬ БЛОКА

Без этого блока всё остальное (обучение, токены, финальный UX) — **опасно**.

ML должна быть:
- ✅ Управляемой (оператор может включить/выключить)
- ✅ Безопасной (Kill Switch > Operator > Default)
- ✅ Всегда живой (inference даже в OFF для shadow)
- ✅ Не неконтролируемой (никогда не bypass gates)

---

## 📦 BACKEND — ML Runtime Config API (BE-7)

### Schema

```typescript
// MongoDB Collection: engine_runtime_config
interface EngineRuntimeConfig {
  _id: ObjectId;
  mlEnabled: boolean;           // true / false
  mlMode: 'off' | 'advisor' | 'assist';
  disabledBy?: 'system' | 'operator';
  disableReason?: string;       // Если disabled
  updatedAt: Date;
  updatedBy?: string;           // User ID или 'system'
}

// Singleton document (только один record)
```

**Cache Strategy:**
- Read на каждом inference
- Cache на 5-10 секунд max
- Invalidate при POST update

---

### API Endpoints

#### GET /api/engine/ml/runtime

**Response:**
```json
{
  "ok": true,
  "data": {
    "mlEnabled": true,
    "mlMode": "advisor",
    "killSwitchActive": false,
    "lastUpdate": "2025-01-21T12:00:00Z"
  }
}
```

#### POST /api/engine/ml/runtime

**Request Body:**
```json
{
  "mlEnabled": true,
  "mlMode": "advisor"
}
```

**Validation:**
- mlMode must be: 'off' | 'advisor' | 'assist'
- Cannot enable if Kill Switch active
- Cannot set mode='advisor' or 'assist' if mlEnabled=false

**Response:**
```json
{
  "ok": true,
  "data": {
    "mlEnabled": true,
    "mlMode": "advisor",
    "updatedAt": "2025-01-21T12:00:00Z"
  }
}
```

---

### Runtime Logic (CRITICAL)

```typescript
async function applyMLInfluence(decision: Decision): Promise<Decision> {
  // 1. Check Kill Switch (ABSOLUTE PRIORITY)
  if (killSwitchActive()) {
    return decision; // No ML influence
  }
  
  // 2. Get config
  const config = await getRuntimeConfig();
  
  // 3. OFF mode - ML runs for shadow but no influence
  if (!config.mlEnabled || config.mlMode === 'off') {
    // ML inference still runs (for logging/shadow)
    await logMLShadow(decision);
    return decision; // No influence on final decision
  }
  
  // 4. ADVISOR mode - confidence/risk adjustments
  if (config.mlMode === 'advisor') {
    decision = applyConfidenceAdjustments(decision);
    decision = applyRiskAdjustments(decision);
  }
  
  // 5. ASSIST mode - ranking adjustments (within bucket)
  if (config.mlMode === 'assist') {
    decision = applyRankingAdjustments(decision);
  }
  
  return decision;
}

function applyConfidenceAdjustments(decision: Decision): Decision {
  // ML can adjust confidence by ±10
  const mlDelta = calculateMLConfidenceDelta(decision);
  const clampedDelta = clamp(mlDelta, -10, 10);
  
  decision.scores.confidence += clampedDelta;
  decision.scores.confidence = clamp(decision.scores.confidence, 0, 100);
  
  return decision;
}

function applyRankingAdjustments(decision: Decision): Decision {
  // ML can adjust finalScore by ±10
  // BUT: cannot change bucket (BUY/WATCH/SELL)
  // AND: cannot bypass gates
  
  const mlScoreAdjustment = calculateMLScoreAdjustment(decision);
  const clampedAdjustment = clamp(mlScoreAdjustment, -10, 10);
  
  decision.finalScore += clampedAdjustment;
  decision.finalScore = clamp(decision.finalScore, 0, 100);
  
  // Verify bucket didn't change
  const newBucket = determineBucket(decision.finalScore);
  if (newBucket !== decision.bucket) {
    // Rollback - ML cannot change bucket
    decision.finalScore -= clampedAdjustment;
  }
  
  return decision;
}
```

**Semantics уточнение (CRITICAL):**

```
ASSIST → ML влияет только на порядок токенов внутри одного bucket 
         (BUY/WATCH/SELL) в пределах ±10 score, 
         без права смены bucket и без влияния на gates
```

**📌 Архитектурно запрещено:**
- ❌ Менять BUY ↔ SELL
- ❌ Обходить gates
- ❌ Повышать confidence выше cap
- ❌ Переводить токен из одного bucket в другой

---

### Kill Switch Logic

```typescript
function killSwitchActive(): boolean {
  // Check recent metrics
  const metrics = getRecentMLMetrics(window = 100);
  
  return (
    metrics.agreement < 0.70 ||
    metrics.flipRate > 0.10 ||
    metrics.distributionShift > 0.20 ||
    metrics.regressionDetected ||
    operatorManualKill
  );
}

function checkAndUpdateKillSwitch() {
  if (killSwitchActive()) {
    // Auto-disable ML
    await updateRuntimeConfig({
      mlEnabled: false,
      mlMode: 'off',
      disabledBy: 'system',
      disableReason: 'Kill Switch triggered - quality degradation detected',
    });
    
    // Alert operator
    await alertOperator('ML auto-disabled by Kill Switch');
    
    // Log incident
    await logIncident({
      type: 'KILL_SWITCH_TRIGGERED',
      metrics: getRecentMLMetrics(),
      timestamp: new Date(),
    });
  }
}
```

---

### Implementation Tasks

**BE-7.1 - MongoDB Schema**
- [ ] Create `engine_runtime_config` collection
- [ ] Add unique constraint (singleton)
- [ ] Add default document: `mlEnabled=false, mlMode='off'`
- [ ] Add indexes: `updatedAt`

**BE-7.2 - Config Service**
- [ ] `getRuntimeConfig()` - with 5s cache
- [ ] `updateRuntimeConfig()` - with validation
- [ ] `invalidateCache()`

**BE-7.3 - API Routes**
- [ ] `GET /api/engine/ml/runtime`
- [ ] `POST /api/engine/ml/runtime`
- [ ] Validation middleware
- [ ] Authorization (optional)

**BE-7.4 - Kill Switch**
- [ ] `killSwitchActive()` check
- [ ] Metrics collection (agreement, flip rate, etc.)
- [ ] Auto-disable logic
- [ ] Alert system integration

**BE-7.5 - Runtime Logic Integration**
- [ ] Integrate into `generateDecision()`
- [ ] Add `applyMLInfluence()`
- [ ] Add confidence/risk adjustments (ADVISOR)
- [ ] Add ranking adjustments (ASSIST)
- [ ] Ensure bucket cannot change

**BE-7.6 - Tests**
- [ ] Unit: Kill Switch override
- [ ] Unit: OFF mode = no influence
- [ ] Unit: ADVISOR = confidence/risk only
- [ ] Unit: ASSIST = ranking only, no bucket change
- [ ] Integration: full decision flow

---

## 🎨 FRONTEND — ML Toggle Component (FE-4)

### UI States

| State | Color | Icon | Description |
|-------|-------|------|-------------|
| **OFF** | ⚪ Gray | ○ | Rules-only mode |
| **ADVISOR** | 🔵 Blue | ◉ | ML visible, influences confidence/risk |
| **ASSIST** | 🟢 Green | ◉ | ML influences ranking within bucket |
| **DISABLED** | 🔴 Red | ⊗ | Kill Switch active (read-only) |

---

### Component Structure

```jsx
// MLToggle.jsx
import { useState, useEffect } from 'react';
import { getMLRuntime, updateMLRuntime } from '@/api/engine.api';

export function MLToggle() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchConfig();
    const interval = setInterval(fetchConfig, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);
  
  async function fetchConfig() {
    const response = await getMLRuntime();
    setConfig(response.data);
  }
  
  async function handleToggle(newMode) {
    if (config.killSwitchActive) {
      alert('Cannot enable ML: Kill Switch is active');
      return;
    }
    
    setLoading(true);
    try {
      await updateMLRuntime({
        mlEnabled: newMode !== 'off',
        mlMode: newMode,
      });
      await fetchConfig();
    } catch (err) {
      alert('Failed to update ML mode: ' + err.message);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="ml-toggle">
      <label>ML Advisor</label>
      
      <select 
        value={config?.mlMode || 'off'} 
        onChange={(e) => handleToggle(e.target.value)}
        disabled={loading || config?.killSwitchActive}
      >
        <option value="off">OFF (Rules-only)</option>
        <option value="advisor">ADVISOR (Confidence/Risk)</option>
        <option value="assist">ASSIST (Ranking)</option>
      </select>
      
      <StatusBadge config={config} />
      <Tooltip config={config} />
    </div>
  );
}
```

---

### UI Copy

**Tooltip:**
```
ML Advisor

ML analyzes signals and suggests confidence & ranking adjustments.
Final decisions are always made by rules.

States:
• OFF: Rules-only mode (ML runs in shadow)
• ADVISOR: ML influences confidence and risk scores
• ASSIST: ML influences token ranking within same bucket

Kill Switch: Auto-disables ML if quality degrades
```

**Kill Switch Alert:**
```
⚠️ ML Advisor Disabled

Kill Switch has been triggered due to quality degradation.
ML will remain disabled until manually re-enabled after review.

Reason: [disableReason from backend]
Time: [timestamp]
```

---

### Implementation Tasks

**FE-4.1 - Component**
- [ ] Create `MLToggle.jsx`
- [ ] State management (local + API sync)
- [ ] 3 mode selector (OFF/ADVISOR/ASSIST)
- [ ] Disabled state for Kill Switch

**FE-4.2 - API Integration**
- [ ] `getMLRuntime()` call
- [ ] `updateMLRuntime()` call
- [ ] Polling (every 10s)
- [ ] Error handling

**FE-4.3 - UI/UX**
- [ ] Color coding (gray/blue/green/red)
- [ ] Tooltip with explanations
- [ ] Kill Switch alert modal
- [ ] Loading state

**FE-4.4 - Integration**
- [ ] Add to Engine Dashboard
- [ ] Add to main nav (optional)
- [ ] Persist state across refresh
- [ ] Mobile responsive

---

## ✅ DEFINITION OF DONE (БЛОК 1)

### Backend (BE-7)
- [ ] ✅ Config хранится и читается из MongoDB
- [ ] ✅ Kill Switch имеет абсолютный приоритет
- [ ] ✅ ML inference всегда выполняется, даже в OFF (для shadow)
- [ ] ✅ OFF = нулевое влияние (не отключен код)
- [ ] ✅ ADVISOR = только confidence/risk (±10)
- [ ] ✅ ASSIST = только ranking внутри bucket (±10)
- [ ] ✅ Bucket не может измениться через ML
- [ ] ✅ Unit tests PASS
- [ ] ✅ Integration tests PASS

### Frontend (FE-4)
- [ ] ✅ Toggle синхронизирован с backend
- [ ] ✅ Состояние переживает refresh
- [ ] ✅ Kill Switch визуально приоритетен
- [ ] ✅ Нет возможности "сломать" систему кликом
- [ ] ✅ Tooltip объясняет каждый режим
- [ ] ✅ Mobile responsive

### Integration
- [ ] ✅ Backend + Frontend работают вместе
- [ ] ✅ Kill Switch срабатывает корректно
- [ ] ✅ ML влияет только в разрешенных режимах
- [ ] ✅ Оператор может управлять через UI

---

## 🚨 SAFETY CHECKLIST

- [ ] ✅ ML не может изменить BUY → SELL
- [ ] ✅ ML не может bypass gates
- [ ] ✅ Kill Switch выше всего
- [ ] ✅ Default = OFF
- [ ] ✅ Config персистится в DB
- [ ] ✅ Оператор всегда может выключить

---

## 📊 ACCEPTANCE CRITERIA

**Scenario 1: Operator enables ADVISOR**
```
1. Operator clicks toggle → ADVISOR
2. Backend updates config
3. Next decision uses ML for confidence/risk
4. Final decision still controlled by Rules
5. Gates still enforce thresholds
```

**Scenario 2: Kill Switch triggers**
```
1. ML quality degrades (agreement < 70%)
2. Kill Switch auto-triggers
3. Config updated: mlEnabled=false, disabledBy='system'
4. Operator alerted
5. Toggle shows DISABLED (red)
6. All decisions use Rules-only
```

**Scenario 3: Operator tries to bypass Kill Switch**
```
1. Kill Switch is active
2. Operator tries to enable ML
3. Frontend blocks with alert
4. Backend rejects request
5. ML remains disabled
```

---

**Дата:** 21 января 2025  
**Версия:** 1.0  
**Status:** READY TO IMPLEMENT
