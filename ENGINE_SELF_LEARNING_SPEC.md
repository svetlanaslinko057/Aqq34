# ENGINE SELF-LEARNING SPECIFICATION

**Version:** 1.0  
**Status:** PROTOCOL DEFINITION (Not Implemented)  
**Purpose:** Architectural contract for autonomous ML learning

---

## 🎯 ФИЛОСОФИЯ

```
Rules decide.
Live data validates.
ML advises.
Learning is gated.
Gates protect.
Dashboard explains.
```

**ML НИКОГДА не становится decision-maker.**

---

## 🔐 LEARNING MODES

### Enum Definition

```typescript
enum LearningMode {
  FROZEN,        // Emergent / Development
  SHADOW_ONLY,   // Early Production
  AUTONOMOUS     // Stable Production
}
```

### Current Mode

```typescript
const LEARNING_MODE = LearningMode.FROZEN;
```

**На Emergent:** FROZEN  
**После миграции:** Переключается вручную → AUTONOMOUS

---

## 🧠 UNLOCK CONDITIONS

### ML Training разрешается, когда:

| Критерий | Threshold | Проверка |
|----------|-----------|----------|
| **Live Snapshots** | ≥ 300 | `EngineDecisionModel.count()` |
| **Coverage Variance** | > 0 | `max(coverage) - min(coverage) > 0` |
| **Decision Diversity** | ≥ 2 buckets | Distinct coverage ranges |
| **Delayed Labels** | ≥ 30% | Labels with outcome data |
| **Time Horizon** | ≥ 7 days | Minimum observation period |

### Validation Query

```typescript
async function canStartTraining(): Promise<boolean> {
  const [count, coverage, labels] = await Promise.all([
    EngineDecisionModel.countDocuments(),
    getCoverageStats(),
    getDelayedLabels(),
  ]);
  
  return (
    count >= 300 &&
    coverage.variance > 0 &&
    labels.percentage >= 30 &&
    systemUptime >= 7 * 24 * 60 * 60 * 1000
  );
}
```

---

## 📊 DATA SOURCES

### ✅ Разрешенные данные (Live Gold)

- ✅ Live decisions с real coverage
- ✅ Delayed labels (time-based outcome)
- ✅ ActorSignals с blockchain proof
- ✅ SignalContexts с entity attribution

### ❌ Запрещенные данные (Guided Silver)

- ❌ Guided simulations
- ❌ Bootstrap synthetic contexts
- ❌ Manual overrides
- ❌ Test data

### Data Lineage

```typescript
interface MLSnapshot {
  snapshotId: string;
  source: 'live' | 'guided';  // ТОЛЬКО 'live' для обучения
  trustLevel: 'gold' | 'silver';  // ТОЛЬКО 'gold'
  decisionId: string;
  coverage: number;
  features: {...};
  label?: {...};  // Delayed
}
```

---

## 🔬 RETRAINING CADENCE

### Триггеры для переобучения

1. **Scheduled (Recommended)**
   - Каждые 14 дней
   - Если накопилось ≥ 500 новых snapshots

2. **Triggered (Advanced)**
   - Distribution drift > 15%
   - Coverage variance изменилась > 20%
   - New entity types появились

3. **Manual (Override)**
   - Operator запускает через UI
   - Требует подтверждение

### Retraining Pipeline

```bash
# 1. Collect snapshots
snapshots = getTrainableSnapshots()

# 2. QA Gates
if !passQA(snapshots):
  abort()

# 3. Train new model
model_v_new = train(snapshots)

# 4. Shadow Eval
shadow_metrics = evaluate(model_v_new)

# 5. Promotion Gate
if shadow_metrics.agreement > 0.85:
  promote(model_v_new)
else:
  rollback()
```

---

## 📈 ОБЯЗАТЕЛЬНЫЕ МЕТРИКИ

### Pre-Training QA

| Метрика | Threshold | Цель |
|---------|-----------|------|
| **Variance** | > 0 | Feature diversity |
| **Correlation** | < 0.95 | Feature independence |
| **Coverage** | 45-85% | Adequate data |
| **Label Rate** | ≥ 30% | Sufficient outcomes |

### Shadow Evaluation

| Метрика | Threshold | Цель |
|---------|-----------|------|
| **Agreement** | ≥ 85% | Consistency с Rules |
| **Flip Rate** | ≤ 5% | Stability |
| **Distribution Shift** | ≤ 10% | No crazy predictions |
| **Regression Check** | 0 | No worse than baseline |

---

## 🚨 KILL CONDITIONS

### Auto-Disable ML если:

1. **Agreement < 70%** (за последние 100 decisions)
2. **Flip rate > 10%** (меняет решение слишком часто)
3. **Distribution shift > 20%** (выход за рамки)
4. **Regression detected** (хуже чем baseline)
5. **Manual Kill Switch** (operator вмешался)

### Kill Switch Logic

```typescript
function checkKillSwitch() {
  const metrics = getRecentMetrics(window = 100);
  
  if (
    metrics.agreement < 0.70 ||
    metrics.flipRate > 0.10 ||
    metrics.distributionShift > 0.20 ||
    metrics.regressionDetected ||
    operatorKillSwitch
  ) {
    disableML();
    alertOperator('ML auto-disabled');
    rollbackToPreviousModel();
  }
}
```

---

## 🎯 PROMOTION PROTOCOL

### Shadow → Active

**Условия:**
1. Shadow eval ≥ 200 decisions
2. Agreement ≥ 85%
3. Flip rate ≤ 5%
4. No regressions
5. Manual approval (optional)

**Процесс:**
```bash
# 1. Finalize shadow metrics
metrics = computeShadowMetrics()

# 2. Promotion Gate
if canPromote(metrics):
  # 3. Backup current model
  backup(currentModel)
  
  # 4. Promote
  setActiveModel(shadowModel)
  
  # 5. Monitor
  watchdog(window = 24h)
else:
  keepInShadow()
```

---

### Active → Rollback

**Условия:**
1. Kill switch triggered
2. Quality degradation
3. Operator request

**Процесс:**
```bash
# 1. Disable current
disableML()

# 2. Restore backup
restoreModel(backup)

# 3. Investigate
generateIncidentReport()

# 4. Fix and re-shadow
trainNewModel()
```

---

## 🧪 TESTING STRATEGY

### Unit Tests

- ✅ QA gates работают
- ✅ Kill switch срабатывает
- ✅ Rollback восстанавливает

### Integration Tests

- ✅ Pipeline end-to-end
- ✅ Shadow не влияет на production
- ✅ Promotion gate не пропускает bad model

### Monitoring

- ✅ Metrics dashboard
- ✅ Alert rules
- ✅ Incident response

---

## 📋 OPERATOR CHECKLIST

### Перед включением AUTONOMOUS mode

- [ ] Stage 1 завершен
- [ ] ML Toggle работает
- [ ] Kill Switch проверен
- [ ] Dashboard показывает metrics
- [ ] Backup strategy готова
- [ ] Alert rules настроены
- [ ] Incident response plan написан

---

## 🚦 STAGE PROGRESSION

### Stage 1: FROZEN (Emergent)

```typescript
LEARNING_MODE = FROZEN
mlEnabled = false  // Default
```

**ML:**
- Код существует
- Endpoints работают
- Shadow можно включить вручную
- Автообучение **выключено**

---

### Stage 2.0: Operator Control (Early Prod)

```typescript
LEARNING_MODE = SHADOW_ONLY
mlEnabled = true  // Via toggle
mlMode = 'shadow'
```

**ML:**
- Работает в shadow
- Operator может включать/выключать
- Накапливает metrics
- Не влияет на decisions

---

### Stage 2.1: Autonomous Learning (Stable Prod)

```typescript
LEARNING_MODE = AUTONOMOUS
mlEnabled = true
mlMode = 'advisor'  // Если прошел shadow eval
```

📌 **Важно:** Autonomous learning активируется **только после миграции** и никогда не работает внутри Emergent ephemeral workspace.

**ML:**
- Обучается автоматически
- Проходит QA gates
- Работает в advisor mode
- Operator может вмешаться

---

## 🔐 SAFETY GUARANTEES

| Риск | Защита | Реализация |
|------|--------|------------|
| ML ломает решения | Decision Gates | Rules всегда финальны |
| ML дает BUY/SELL | Architectural | Impossible по дизайну |
| Bad model в prod | Shadow Eval | Promotion gate |
| Quality degradation | Kill Switch | Auto-disable |
| Operator panic | Manual Toggle | Instant OFF |
| Data poisoning | Source filtering | Only Live Gold |

---

## 📚 REFERENCES

- `/STAGE_1_TICKETS.md` - Implementation tickets
- `/ENGINE_V1_1_RELEASE_NOTES.md` - Current engine spec
- `/ENGINE_ML_TRAINING_SPEC.md` - ML training details
- `/ENGINE_SHADOW_MODE_SPEC.md` - Shadow mode protocol

---

## ✅ CONTRACT SUMMARY

**Это НЕ implementation.**  
**Это CONTRACT между:**
- Rules Engine (decision authority)
- ML System (advisor)
- Operator (human override)

**Принципы:**
1. ML учится только на Live Gold
2. ML не влияет на gates
3. ML может быть выключен мгновенно
4. Rules всегда побеждают
5. Operator всегда в контроле

---

**Дата:** 21 января 2025  
**Версия:** 1.0  
**Status:** PROTOCOL DEFINITION  
**Next:** Stage 1 implementation → Stage 2 activation
