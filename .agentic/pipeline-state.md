# Трекер стану конвеєра (Pipeline State)

> **Призначення:** фіксує проходження етапів проєкту від ідеї до релізу. Оновлюють його лише `project-kickoff` і скіли етапів на Human Approval Gate за рішенням власника продукту.
> **Правило переходу:** етап стартує, лише коли всі його передумови мають статус `APPROVED_AND_COMMITTED`, `APPROVED_MANUAL_COMMIT` або `SKIPPED_APPROVED`. Будь-який інший статус блокує запуск. Машинне джерело правил — `pipeline.json` скіла `gate-check`.

---

## 1. Загальний стан

- **Проєкт:** `Крипто-Радар`
- **Поточний активний етап:** `Stage 1: Discovery`
- **Спринт:** `1`
- **Останнє оновлення:** `2026-11-02 13:23`

---

## 2. Матриця етапів

| ID | Етап | Скіл | Передумови | Статус | Звіт етапу | Коміт |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Discovery: від ідеї до продуктового брифу | `product-discovery` | — | `IN_PROGRESS` | `.agentic/reports/01-discovery-report.md` | — |
| **2** | Вимоги: User Stories та Gherkin-критерії | `ba-requirements` | `1` | `PENDING` | `.agentic/reports/02-requirements-report.md` | — |
| **3** | Архітектура: NFR, ADR, STRIDE і вибір стеку | `solution-architect` | `2` | `PENDING` | `.agentic/reports/03-architecture-report.md` | — |
| **4** | UX і контракт API | `ux-api-design` | `3` | `PENDING` | `.agentic/reports/04-ux-api-report.md` | — |
| **5** | Платформа: каркас, команда verify, CI | `platform-devops` | `3` | `PENDING` | `.agentic/reports/05-platform-report.md` | — |
| **6** | План реалізації: хвилі DAG і матриця перевірок | `implementation-planner` | `4`, `5` | `PENDING` | `.agentic/reports/06-plan-report.md` | — |
| **7** | Реалізація: хвилі DAG, Red-Team аудит, перевірка в браузері | `sdd-delivery` | `6` | `PENDING` | `.agentic/reports/07-implementation-report.md` | — |
| **8.a** | QA A: тест-дизайн і ручне тестування | `qa-engineer` | старт: `4`; гейт: `7` | `PENDING` | `.agentic/reports/08a-qa-manual-report.md` | — |
| **8.b** | QA B: автоматизація E2E і контрактні тести | `qa-engineer` | `7` | `PENDING` | `.agentic/reports/08b-qa-automation-report.md` | — |
| **9** | Реліз: версіонування, staging → production, rollback | `release-engineer` | `8.a`, `8.b` | `PENDING` | `.agentic/reports/09-release-report.md` | — |

> **Статуси:**
> - `PENDING` — очікує старту.
> - `IN_PROGRESS` — виконується.
> - `WAITING_FOR_APPROVAL` — звіт сформовано, чекаємо рішення власника.
> - `APPROVED_AND_COMMITTED` — схвалено, атомарний коміт виконав агент.
> - `APPROVED_MANUAL_COMMIT` — схвалено, коміт робить власник сам.
> - `SKIPPED_APPROVED` — власник явно погодив пропуск етапу (лише для етапів із `"skippable": true` у `pipeline.json`, зараз це етап 9). Причину записують у розділ 4.
> - `REJECTED_REVISING` — повернуто на доопрацювання.

---

## 3. Журнал комітів (Git Commit Checkpoints)

| Етап | Дата / Час | Хеш коміту | Повідомлення коміту | Хто погодив |
| :--- | :--- | :--- | :--- | :--- |
| **init** | `2026-11-02` | `[очікує коміту]` | `chore(init): start sdd delivery pipeline` | `Власник продукту` |

---

## 4. Рішення та зауваження на гейтах

> Сюди записуються зауваження «Revise», причини `SKIPPED_APPROVED`, запити на зміну вже схвалених артефактів і важливі рішення власника, щоб наступні етапи бачили контекст.

- `2026-11-02 Init: власник погодив git init у D:\crypto-radar; навчальний режим (learning_mode) увімкнено.`
- `2026-11-02 Init: вхідних матеріалів (макетів, досліджень, обмежень бюджету чи строків) немає.`
- `2026-11-02 Init: бажаний стек — «запропонуй»; власник очікує пропозицію стеку від етапу 3 (ADR 0001). Джерело даних з ідеї — відкритий API на кшталт CoinGecko (остаточний вибір — етап 3).`
- `2026-11-02 Init: цільові користувачі — початківці, які хочуть швидко глянути ціни без реєстрації на біржі.`
