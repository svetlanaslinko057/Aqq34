# EMERGENT EXIT CHECKLIST

**Purpose:** Ensure safe migration from Emergent to production server  
**Date:** 21 января 2025  
**Version:** 1.0

---

## 🎯 EXIT CRITERIA

Систему можно выносить с Emergent, если:

- ✅ Вся критичная логика реализована
- ✅ Нет зависимостей от Emergent runtime
- ✅ Все состояния персистятся в DB
- ✅ Документация полная
- ✅ Self-learning protocol описан
- ✅ ML безопасен и контролируем

---

## ✅ CHECKLIST

### 🔵 Backend

- [x] **Engine v1.2 frozen**
  - Rules immutable
  - Gates immutable
  - Decision logic final
  
- [x] **Coverage persistence**
  - Coverage сохраняется в DB
  - Aggregation queries корректны
  - Variance рассчитывается

- [x] **ActorSignals pipeline**
  - 12 entities засижены
  - 30 blockchain addresses
  - Background jobs активны

- [x] **Bootstrap API**
  - `/engine/bootstrap/contexts` работает
  - `/engine/bootstrap/decisions` работает
  - `/engine/bootstrap/status` работает

- [ ] **ML Layer**
  - [ ] Advisor mode реализован
  - [ ] Kill Switch работает
  - [ ] Shadow metrics доступны
  - [ ] confidenceDelta clamped (±10)
  - [ ] riskAdjustment clamped (±10)

- [ ] **ML Runtime Config**
  - [ ] `EngineRuntimeConfig` collection
  - [ ] GET `/api/engine/ml/runtime`
  - [ ] POST `/api/engine/ml/runtime`
  - [ ] mlEnabled default = false

- [ ] **Self-Learning Spec**
  - [ ] `/ENGINE_SELF_LEARNING_SPEC.md` создан
  - [ ] Unlock conditions описаны
  - [ ] Retraining protocol описан
  - [ ] Safety guarantees описаны

---

### 🟢 Frontend

- [ ] **Engine Dashboard**
  - [ ] Health banner
  - [ ] Decision gate overlay
  - [ ] Shadow ML panel
  - [ ] Kill switch status

- [ ] **Explainability**
  - [ ] supportingFacts visible
  - [ ] gateReason shown
  - [ ] neutralReason explained
  - [ ] coverage breakdown

- [ ] **Bootstrap Controls**
  - [ ] Generate decisions button
  - [ ] Bootstrap contexts button
  - [ ] Snapshot count indicator
  - [ ] Coverage/variance display

- [ ] **ML Toggle**
  - [ ] Toggle component
  - [ ] Mode indicator (off/shadow/advisor)
  - [ ] Color coding (gray/blue/green/red)
  - [ ] Safety checks (kill switch)
  - [ ] Tooltip с объяснением

- [ ] **ML Visibility**
  - [ ] confidenceDelta display
  - [ ] riskAdjustment display
  - [ ] "Advisor only" badge

---

### 🟣 Infrastructure

- [x] **Environment Independence**
  - No cron tied to session
  - All jobs idempotent
  - All state in DB

- [ ] **Startup Readiness**
  - [ ] `.env.example` with comments
  - [ ] Startup order documented
  - [ ] Health checks for all services
  - [ ] Single command startup

- [ ] **Configuration**
  - [ ] All API keys in `.env`
  - [ ] No hardcoded values
  - [ ] All URLs configurable

---

### 📚 Documentation

- [x] **Deployment**
  - [x] `/DEPLOYMENT_SUMMARY.md`
  - [x] `/P3_UNLOCK_STATUS.md`
  - [x] `/P3_QUICKSTART.md`

- [x] **Architecture**
  - [x] `/ENGINE_V1_1_RELEASE_NOTES.md`
  - [x] `/ENGINE_V1_2_TUNING.md`
  - [x] `/ENGINE_ML_TRAINING_SPEC.md`
  - [x] `/ENGINE_SHADOW_MODE_SPEC.md`

- [x] **Stage Planning**
  - [x] `/STAGE_1_TICKETS.md`
  - [x] `/ENGINE_SELF_LEARNING_SPEC.md`

- [ ] **Migration Guide**
  - [ ] `/MIGRATION_GUIDE.md` (server setup)
  - [ ] `/EMERGENT_TO_PROD.md` (step-by-step)

---

## 🚨 CRITICAL DEPENDENCIES

### Внешние сервисы (must have)

- ✅ **Infura RPC**
  - API key: configured
  - URL: in `.env`

- ✅ **Ankr RPC**
  - API key: configured
  - URL: in `.env`

- ✅ **Telegram Bot**
  - Bot token: configured
  - Polling: active

### База данных

- ✅ **MongoDB**
  - Connection: `mongodb://localhost:27017/blockview`
  - Collections: all created
  - Indexes: properly set

---

## 🔬 TESTING STATUS

### Backend Tests

- [ ] Engine decision logic
- [ ] Coverage calculation
- [ ] ML advisor influence
- [ ] Kill switch trigger
- [ ] API endpoints

### Integration Tests

- [ ] Indexer → Signals → Contexts → Decisions
- [ ] Bootstrap pipeline
- [ ] ML shadow mode
- [ ] WebSocket updates

### UI Tests

- [ ] Dashboard loads
- [ ] All pages navigable
- [ ] ML toggle works
- [ ] Data refreshes

---

## 🎯 MIGRATION READINESS SCORE

### Current Status

| Category | Done | Total | % | Status |
|----------|------|-------|---|--------|
| Backend Core | 4 | 7 | 57% | 🟡 |
| Frontend | 0 | 5 | 0% | 🔴 |
| Infrastructure | 1 | 3 | 33% | 🟡 |
| Documentation | 8 | 10 | 80% | 🟢 |
| **TOTAL** | **13** | **25** | **52%** | 🟡 |

### Оценка

- ✅ **Architecture:** Ready
- ✅ **Core Logic:** Ready
- ⚠️ **ML Control:** Needs work
- ⚠️ **UI/UX:** Needs work
- ✅ **Documentation:** Ready

**Вердикт:** Архитектурно готова, нужна UI доработка (Stage 1 P0 tasks)

---

## 🚀 POST-MIGRATION PLAN

### Day 1 (Migration)

1. Deploy на собственный сервер
2. Verify health endpoints
3. Check MongoDB connection
4. Verify API keys
5. Start all services

### Day 2-7 (Observation)

1. Monitor indexer progress
2. Watch coverage variance
3. Check ActorSignals enrichment
4. Verify no errors in logs

### Week 2 (ML Activation)

1. Enable ML in shadow mode
2. Collect shadow metrics
3. Verify Kill Switch
4. Monitor agreement

### Week 3+ (Autonomous)

1. Switch to AUTONOMOUS mode
2. Enable auto-retraining
3. Monitor quality
4. Celebrate 🎉

---

## ⚠️ KNOWN ISSUES

### Non-Critical (можно жить)

1. **Frontend UI** - не все страницы доработаны
2. **ML Toggle** - еще не реализован в UI
3. **Dashboard** - explainability можно улучшить

### Critical (must fix before prod)

None! 🎉

---

## 🔐 SECURITY CHECKLIST

- [x] API keys в `.env` (не в коде)
- [x] MongoDB не exposed publicly
- [ ] CORS настроен правильно
- [ ] Rate limiting есть
- [ ] Telegram bot token безопасен

---

## 📊 FINAL VERIFICATION

### Pre-Migration Test

```bash
# 1. Health check
curl http://localhost:8001/api/health
# Ожидается: {"ok": true}

# 2. Bootstrap status
curl http://localhost:8002/api/engine/bootstrap/status
# Ожидается: contexts >= 25, decisions >= 25

# 3. Entities
curl http://localhost:8002/api/entities
# Ожидается: count >= 12

# 4. Indexer running
tail -f /var/log/supervisor/backend.out.log | grep Indexer
# Ожидается: блоки индексируются

# 5. Frontend loads
curl http://localhost:3000
# Ожидается: HTML страница
```

---

## ✅ APPROVAL

### Checklists Complete?

- [ ] Backend checklist: 100%
- [ ] Frontend checklist: 100%
- [ ] Infrastructure checklist: 100%
- [ ] Documentation checklist: 100%

### Sign-Off

- [ ] **Backend Lead:** _______________
- [ ] **Frontend Lead:** _______________
- [ ] **DevOps:** _______________
- [ ] **Product:** _______________

---

## 🏁 FINAL GO/NO-GO

**Status:** 🟡 NOT READY

**Blocking Items:**
1. ML Runtime Config API (BE-7)
2. ML Toggle Component (FE-4)
3. Self-Learning Spec (BE-6)
4. Engine Dashboard (FE-1)
5. Explainability Layer (FE-2)

**ETA:** ~1-2 weeks (зависит от приоритизации)

---

**После прохождения всех чекпоинтов:**

**Status:** 🟢 READY TO MIGRATE

---

**Дата создания:** 21 января 2025  
**Последнее обновление:** 21 января 2025  
**Версия:** 1.0
