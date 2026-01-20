# 🧱 STAGE 1 — PRE-PROD FINALIZATION

**Status:** ОБЯЗАТЕЛЬНЫЙ  
**Target:** Emergent Environment  
**Goal:** Готовый продукт с замороженной логикой, полностью готовый к автономному обучению

---

## 🎯 ЦЕЛЬ STAGE 1

Сделать систему архитектурно завершённой, где:
- ✅ Engine logic — финальна
- ✅ ML — обучен, проверен, интегрирован
- ✅ Самообучение — описано и встроено, но **выключено**
- ✅ Все зависимости от времени/среды устранены
- ✅ Emergent используется только как среда сборки

---

## 🔵 BACKEND TICKETS

### BE-1 — Engine v1.2 Freeze (Rules Authority)

**Цель:** Зафиксировать Rules Engine как финальный источник решений

**Задачи:**
- [ ] Зафиксировать thresholds, gates, penalties
- [ ] Запретить runtime-изменения через config
- [ ] Явно задокументировать:
  - decision = rules only
  - ML = advisor only

**DoD:**
- ✅ 0 BUY/SELL вне gate
- ✅ 0 BUY/SELL при low coverage
- ✅ 0 BUY/SELL при conflicts
- ✅ config только read-only
- ✅ regression tests PASS

**Status:** ✅ DONE (Engine v1.1 already frozen)

---

### BE-2 — Decision Persistence & Coverage Fix (CRITICAL)

**Цель:** Устранить зависимость от runtime coverage

**Задачи:**
- [x] Persist `coverage.overall`
- [x] Persist `coverage.sources`
- [x] Persist `coverage.contexts`
- [x] Fix aggregation queries → использовать persisted coverage
- [ ] Убедиться, что decisions сравнимы во времени

**DoD:**
- ✅ Coverage одинаков при повторном расчёте
- ✅ `/bootstrap/status` показывает variance корректно
- ✅ Coverage участвует в ML snapshots

**Status:** ✅ DONE (Fixed in engine_bootstrap.routes.ts)

---

### BE-3 — ActorSignals Pipeline Stabilization

**Цель:** Обеспечить живые сигналы для P3

**Задачи:**
- [x] Проверить jobs: `build_actor_signals`, `build_signal_contexts`
- [x] Убедиться, что: entities → signals → contexts → decisions
- [ ] Логировать enrichment progress

**DoD:**
- ✅ ActorSignals создаются для ≥3 entity types
- ✅ Contexts получают non-zero overlapScore
- ✅ Severity распределяется (low/medium/high)

**Status:** ✅ DONE (12 entities, 25 contexts)

---

### BE-4 — Bootstrap API (FINAL)

**Цель:** Сделать bootstrap безопасным и воспроизводимым

**Задачи:**
- [x] Зафиксировать endpoints:
  - `/engine/bootstrap/contexts`
  - `/engine/bootstrap/decisions`
- [x] Запретить влияние bootstrap данных на live coverage
- [ ] Явно пометить: `snapshotSource`, `snapshotTrustLevel`

**DoD:**
- ✅ Bootstrap ≠ live
- ✅ Bootstrap не ломает coverage
- ✅ Можно генерировать 300+ decisions

**Status:** ✅ DONE (endpoints created, tested)

---

### BE-5 — ML Layer Freeze (Advisor Only)

**Цель:** ML интегрирован, но не активен

**Задачи:**
- [ ] Зафиксировать:
  - `confidenceDelta` clamp (±10)
  - `riskAdjustment` clamp (±10)
  - Kill Switch обязателен
  - Shadow only

**DoD:**
- ✅ ML не влияет на final decision
- ✅ Kill Switch срабатывает
- ✅ Shadow KPI доступен через API

**Status:** ⚠️ TODO (ML code exists, needs freeze)

---

### BE-6 — Self-Learning Protocol Spec

**Цель:** Зафиксировать будущую самообучаемость

**Задачи:**
- [ ] Создать `/ENGINE_SELF_LEARNING_SPEC.md`
- [ ] Описать:
  - unlock conditions
  - retraining cadence
  - rollback rules
  - promotion rules

**DoD:**
- ✅ Документ существует
- ✅ Используется как reference
- ✅ Нет runtime logic

**Status:** ⚠️ TODO (critical for Stage 2 readiness)

---

### BE-7 — ML Runtime Config & Toggle API (NEW)

**Цель:** Operator control over ML

**Задачи:**
- [ ] Создать `EngineRuntimeConfig` collection (MongoDB)
- [ ] Реализовать endpoints:
  - `GET /api/engine/ml/runtime`
  - `POST /api/engine/ml/runtime`
- [ ] Интегрировать в decision flow:
  - Check `mlEnabled` flag
  - Enforce `mlMode` (off/shadow/advisor)
  - Respect Kill Switch

**Safety:**
- ✅ Kill Switch имеет абсолютный приоритет
- ✅ Default: OFF
- ✅ Config персистится в DB
- ✅ Operator всегда может выключить

**Priority order:**
1. Kill Switch (system) - абсолютный приоритет
2. Runtime Config (operator) - может управлять
3. Default (off) - безопасное начальное состояние

📌 **Важно:** UI toggle **не может override Kill Switch**.

**DoD:**
- ✅ ML можно включить/выключить через API

**Status:** ⚠️ TODO (critical for production control)

---

## 🟢 FRONTEND TICKETS

### FE-1 — Engine Dashboard Finalization

**Цель:** Пользователь понимает, что происходит

**Задачи:**
- [ ] Health Banner (DATA COLLECTION MODE)
- [ ] Decision Gate Overlay
- [ ] Shadow ML Panel
- [ ] Kill Switch status

**DoD:**
- ✅ Нет warning при NEUTRAL
- ✅ Видно: rules vs ML
- ✅ Все статусы объяснены

**Status:** ⚠️ TODO

---

### FE-2 — Explainability Layer (MUST)

**Цель:** Каждое решение объяснимо

**Задачи:**
- [ ] Показать:
  - `supportingFacts`
  - `gateReason`
  - `neutralReason`
  - `coverage breakdown`

**DoD:**
- ✅ 100% decisions имеют explainability
- ✅ Нет "пустых" решений
- ✅ UI показывает причины

**Status:** ⚠️ TODO

---

### FE-3 — Bootstrap / Simulation Controls

**Цель:** Управляемые тесты до ухода с Emergent

**Задачи:**
- [ ] Buttons:
  - Generate Decisions
  - Bootstrap Contexts
- [ ] Indicators:
  - snapshot count
  - coverage range
  - variance

**DoD:**
- ✅ Можно догнать до 300+ decisions
- ✅ Статус обновляется live

**Status:** ⚠️ TODO

---

### FE-4 — ML Toggle Component (CRITICAL)

**Цель:** Operator control over ML (UI)

**Задачи:**
- [ ] Создать Toggle component:
  - Switch: ON/OFF
  - Mode indicator: off/shadow/advisor
  - Color coding: gray/blue/green/red
- [ ] Интегрировать с API:
  - GET `/api/engine/ml/runtime`
  - POST `/api/engine/ml/runtime`
- [ ] Safety checks:
  - Block enable if Kill Switch active
  - Show reason if blocked
- [ ] Tooltip с объяснением

**DoD:**
- ✅ Toggle работает
- ✅ Нельзя включить ML при Kill Switch
- ✅ Пользователь понимает режимы
- ✅ Default: OFF

**Status:** ⚠️ TODO (critical for production control)

---

### FE-5 — ML Visibility (Shadow Only)

**Цель:** ML прозрачен, но не пугает

**Задачи:**
- [ ] Показывать:
  - `confidenceDelta`
  - `riskAdjustment`
  - `conflictLikelihood`
- [ ] Пометка: "Advisor only"

**DoD:**
- ✅ Нет ощущения, что ML "торгует"
- ✅ Пользователь понимает роль ML

**Status:** ⚠️ TODO

---

## 🟣 INFRA / PLATFORM TICKETS

### INF-1 — Environment Independence

**Цель:** Убрать зависимость от Emergent runtime

**Задачи:**
- [x] Убрать таймеры/cron tied to session
- [x] Все jobs idempotent
- [x] Все состояния в DB

**DoD:**
- ✅ Перезапуск среды не ломает систему
- ✅ Нет in-memory state

**Status:** ✅ DONE (supervisor manages all jobs)

---

### INF-2 — One-Click Startup Readiness

**Цель:** После переноса всё работает сразу

**Задачи:**
- [ ] `.env.example` с комментариями
- [ ] Startup order документирован:
  1. MongoDB
  2. Backend (TypeScript + Python proxy)
  3. Frontend
- [ ] Health checks для всех сервисов

**DoD:**
- ✅ Single "Start" = working system
- ✅ No manual patching

**Status:** ⚠️ PARTIAL (.env exists, needs .env.example)

---

### INF-3 — Emergent Exit Checklist

**Цель:** Можно уйти с платформы без риска

**Задачи:**
- [ ] Checklist:
  - engine frozen
  - ML shadow only
  - self-learning spec exists
  - no runtime dependency
- [ ] Документ `/EMERGENT_EXIT.md`

**DoD:**
- ✅ Чеклист заполнен
- ✅ Все пункты зелёные

**Status:** ⚠️ TODO

---

## 🧩 КРИТЕРИИ ЗАВЕРШЕНИЯ STAGE 1 (DoD)

Stage 1 считается ЗАВЕРШЁННЫМ, если:

- [ ] 🔒 Rules Engine заморожен
- [ ] 🤖 ML — advisor only (с toggle)
- [ ] 📊 Dashboard объясняет всё
- [ ] 🧠 Самообучение описано, но выключено
- [ ] 🧱 Система не зависит от Emergent
- [ ] 🎛️ ML Toggle работает и понятен
- [ ] 📋 EMERGENT_EXIT.md создан
- [ ] 📄 ENGINE_SELF_LEARNING_SPEC.md создан

---

## 📊 ТЕКУЩИЙ ПРОГРЕСС

| Категория | Done | Total | % |
|-----------|------|-------|---|
| Backend | 4 | 7 | 57% |
| Frontend | 0 | 5 | 0% |
| Infra | 1 | 3 | 33% |
| **Total** | **5** | **15** | **33%** |

---

## 🎯 ПРИОРИТЕТНЫЕ ЗАДАЧИ (Next Sprint)

**P0 (Critical):**
1. BE-7 — ML Runtime Config & Toggle API
2. FE-4 — ML Toggle Component
3. BE-6 — Self-Learning Protocol Spec

**P1 (High):**
4. FE-1 — Engine Dashboard Finalization
5. FE-2 — Explainability Layer
6. INF-3 — Emergent Exit Checklist

**P2 (Medium):**
7. BE-5 — ML Layer Freeze
8. FE-3 — Bootstrap Controls
9. INF-2 — One-Click Startup

---

## 🚀 После завершения Stage 1

Система готова к:
- ✅ Миграции на собственный сервер
- ✅ Запуску "одной кнопкой"
- ✅ Stage 2 (Autonomous Learning)

---

**Дата:** 21 января 2025  
**Версия:** 1.0  
**Status:** IN PROGRESS
