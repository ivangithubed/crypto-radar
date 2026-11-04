# Фінальний звіт етапу: Stage 8.a — тест-дизайн і ручне тестування

- **Етап:** `Stage 8.a: QA A — тест-дизайн і ручне тестування`
- **Відповідальний скіл:** `qa-engineer`
- **Дата формування:** `2026-11-03 05:17` (чернетка — 05:10); ретест після Revise №4 етапу 7 — `2026-11-03 05:50`; правки за рев'ю — 06:01 і `14:05` (після коміту етапу 7 `e3fb805`)
- **Revise 8.a:** `2026-11-03 22:29` — ретест на коміті етапу 7 `8f0f2a5` (RUN-2026-11-03-3), рішення власника 22:25 «Так, Revise 8.a».
- **Revise 8.a №2:** (команда власника — між 01:31 і 01:40:39) `2026-11-04 01:45` — ретест на коміті етапу 7 `8c68680` (RUN-2026-11-04), команда власника «Так, Revise 8.a» після гейту 8.b (`821453d`).
- **Статус аудиту independent-reviewer:** `PASS` (Revise 8.a №2, рев'ю №7; рев'ю №3 – №6 повернули блокери, їх виправлено — див. 4.3)

---

## 1. Перевірені передумови (Pre-Flight Summary)

Передумови трекера (первинний прогін): етап 4 — `APPROVED_AND_COMMITTED` (старт), етап 7 — `APPROVED_AND_COMMITTED`, коміт `8645c76`. **Після рішення 05:30 етап 7 пройшов Revise №4**: власник схвалив його «Approve & закоміть» — коміт `e3fb805` (2026-11-03 14:00), статус етапу 7 знову `APPROVED_AND_COMMITTED`. Хеш вписано в RUN-2026-11-03-2 і статуси BUG; `git diff --stat e3fb805 -- src` порожній — ретест виконано на тому самому коді. Ще один доказ: хеш бандла `index-B4e6vtFN.js` однаковий у `pnpm verify` 05:34:45 (база ретесту), у повторі рев'юера етапу 7 05:51:58 і в `pnpm verify` 13:59:48 перед комітом. Первинна примітка (гейт, живий прогін). Нічого не встановлювалось: усі інструменти вже були в проєкті з етапів 5 і 7.

**Revise 8.a (2026-11-03 22:29):** передумова — Revise №5 етапу 7 схвалено й закомічено (`8f0f2a5`, 22:25), статус етапу 7 `APPROVED_AND_COMMITTED`. Ретест — на збірці HEAD `8f0f2a5` (`git status --short src` порожній; бандл `index-fiVsxdXU.js`, той самий, що в `verify-gate.py --stage 7 --run` 22:21:53 – 22:23:41). Нічого не встановлювалось.

**Revise 8.a №2 (2026-11-04):** передумова — Revise №6 етапу 7 схвалено й закомічено (`8c68680`, 01:10), 8.b Revise — `821453d` (01:31); команду власника «Так, Revise 8.a» дано між 01:31 і 01:40:39 (старт ретесту; точний час у чаті не зафіксовано). HEAD `821453d`; `git diff --stat 8c68680 HEAD -- src` порожній (Revise 8.b змінив лише `e2e/` і документи). Нічого не встановлювалось: Node.js v24.21.0, `@playwright/test` 1.64.1 з браузерами Chromium, WebKit 2370 і Firefox (встановлено на 8.b).

| Інструмент / SDK / Акаунт | Необхідна версія | Фактичний стан на старті | Запропонована команда | Згода отримана | Результат |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Node.js | 24 LTS (`.nvmrc`, `engines`) | v24.21.0 | Ні, вже було | Не потрібно | ✅ Готово |
| pnpm | 11 (`packageManager`) | 11.23.0 (`packageManager`), збірка зелена | Ні, вже було | Не потрібно | ✅ Готово |
| Збірка + preview | `pnpm build`, `vite preview` :4173 (`.claude/launch.json`) | `✓ built`, сторінка відповідає, h1 «Топ-50 монет» | Ні, вже було | Не потрібно | ✅ Готово |
| Вбудований браузер (Chromium) | — | Доступний, мобільна емуляція 320×640 і схема кольорів працюють | Ні | Не потрібно | ✅ Готово |
| `@playwright/test` + Chromium | 1.64 (етап 5, `pnpm test:a11y`) | Встановлено, `pnpm test:a11y` 40 passed | Ні, вже було | Не потрібно | ✅ Готово |
| CoinGecko без ключа | Публічний API | 200 о 04:48; 429 без CORS о 04:52:56 | — | Не потрібно | ⚠️ Нестабільний (це й був об'єкт перевірки) |
| Safari, Firefox, Edge, зчитувач екрана | NFR-14, UX §4 | Справжні Safari iOS / macOS, Edge і зчитувач недоступні агенту (Windows, без NVDA); рушії WebKit 2370 і Firefox — у Playwright 1.64.1 (з 8.b) | Чек-лист власнику (TC-087 – TC-090) | — | Рушії — використано в Revise 8.a №2; чек-лист — ризик прийнято власником 2026-11-04 00:11, п. 3 (не виконувався) |
| Тестові акаунти й облікові дані | — | Не застосовно: входу немає (ADR 0002) | — | — | Не застосовно |

## 2. Застосовані Best Practices vs найпростіший підхід

Етап запустила сесія-координатор за дорученням власника з визначеним обсягом (тест-план, ручні сесії в браузері, ризик «429 без CORS», звіт, рев'ю, гейт). План етапу і вибір нижче власник підтвердив на першому гейті 8.a (трекер, 2026-11-03 05:30).

| Аспект / Рішення | Найпростіший підхід | Галузева Best Practice | Що обрано та чому |
| :--- | :--- | :--- | :--- |
| Тест-дизайн | «Щасливий шлях» кожної історії | Класи еквівалентності, граничні значення, таблиці рішень, переходи станів; трасування AC → TC | **Best Practice:** 91 TC (TC-091 додано після рев'ю ретесту), кожен з 57 AC має ≥ 1 TC; межі 25/50, 0/1/49/50, 0/1/50/51, 299/300/301 с, ±0,04/±0,05/±0,06 %. |
| Негативні сценарії | Лише валідація поля пошуку | Таблиця «джерело помилки → текст і кількість запитів», некоректна відповідь джерела, недоступне сховище | **Best Practice:** BOLA / 409 / problem+json — не застосовно (`has_http_api: false`, входу немає); замість них — E-NET / E-SRC / E-429 / E-SHAPE / E-STALE / E-STORE / C-TAB. |
| Дефекти | Опис у чаті | `BUG-NNN`: кроки, очікуване й фактичне, Severity ≠ Priority, середовище, докази | **Best Practice:** 11 BUG у `.agentic/qa/bugs/` (BUG-009 — з ретесту 8.a; BUG-010, BUG-011 — з 8.b); Verified 10, BUG-010 — Fixed. |
| Дані для станів | Чекати, коли джерело само зламається | Керовані стани: підміна відповіді й годинник сторінки | **Best Practice + живий доказ:** фікстура проєкту через `route` і `page.clock`; ризик CORS — лише на живому CoinGecko, бо підміна CORS не блокує. |
| Локатори й вивід | CSS / XPath, скриншоти | Ролі й доступні імена; текст і дерево доступності, скриншот — лише коли важливий вигляд | **Best Practice:** `getByRole`, `javascript_tool`, ARIA-знімок; скриншоти робились у сесіях (320 px з підказкою, сторінка монети), у репозиторії збережено один — доказ BUG-001. |
| Доступність | «На око» | axe + ручна клавіатура, фокус, 320 px у мобільній емуляції (урок L-007), скрінрідер — людина | **Best Practice:** axe 40/40; ручні TC-065 – TC-074; зчитувач — чек-лист власника (не виконувався: ризик прийнято власником 2026-11-04 00:11, п. 3). |
| Автоматизація | Писати E2E зараз | E2E — етап 8.b; на 8.a — одноразові сценарії без тестового проєкту | **Best Practice:** сценарії лежать у `.agentic/qa/runs/support/` як доказ, у `package.json` нічого не додано. |
| Контракт / фазинг | — | Schemathesis за `contract/openapi.yaml` | **Не застосовно:** власного API немає (ADR 0001). |

## 3. Виконаний обсяг робіт (Deliverables)

- [`.agentic/specs/08-test-plan.md`](../specs/08-test-plan.md) — тест-план: скоуп, підхід, середовища, критерії входу й виходу, ризики, 91 тест-кейс TC-001 – TC-091 (Must 74, Should 15, Could 2), сесії, матриця AC → TC і NFR → TC.
- [`.agentic/qa/sessions/SES-01-list.md`](../qa/sessions/SES-01-list.md) … [`SES-11-accessibility.md`](../qa/sessions/SES-11-accessibility.md) — 11 дослідницьких сесій: по одній на кожну Must-історію US-1 – US-9, наскрізний шлях (SES-10) і ручна доступність (SES-11).
- [`.agentic/qa/runs/RUN-2026-11-03.md`](../qa/runs/RUN-2026-11-03.md) — журнал прогону: результат кожного TC, підсумок, виводи сценаріїв.
- [`.agentic/qa/runs/support/`](../qa/runs/support/) — одноразові сценарії керованих станів (`qa8a.mjs`, `qa8a-extra.mjs`, `qa8a-gaps.mjs`, `busy.mjs`, `name.mjs`) і їхні виводи (`qa8a-out.json`, `qa8a-gaps-out.json`). Запускаються при працюючому `vite preview` :4173: `node .agentic/qa/runs/support/qa8a.mjs`.
- [`.agentic/qa/bugs/BUG-001.md`](../qa/bugs/BUG-001.md) … [`BUG-009.md`](../qa/bugs/BUG-009.md) — 9 дефектів (BUG-009 — з ретесту).
- [`.agentic/qa/evidence/BUG-001-429-shows-no-connection-320px.jpg`](../qa/evidence/BUG-001-429-shows-no-connection-320px.jpg) — скриншот живого 429 без CORS.
- `.agentic/pipeline-state.md` — статус 8.a: `IN_PROGRESS` (04:59) → `WAITING_FOR_APPROVAL` (05:17) → `REJECTED_REVISING` (05:30, рішення власника, ретест) → `IN_PROGRESS` (14:01, після коміту етапу 7 `e3fb805`) → `WAITING_FOR_APPROVAL` (після вердикту рев'ю) — записи в розділі 4 (06:01, 14:01). Revise 8.a: `APPROVED_AND_COMMITTED` (`93d517f`) → `REJECTED_REVISING` (22:25, «Так, Revise 8.a») → `IN_PROGRESS` (22:29) → `WAITING_FOR_APPROVAL` → `APPROVED_AND_COMMITTED` (`8755fb3`, 22:43). Revise 8.a №2: → `REJECTED_REVISING` («Так, Revise 8.a», між 01:31 і 01:40:39) → `IN_PROGRESS` (ретест з 01:40:39; запис трекера 01:45; рядок матриці оновлено 01:51) → `WAITING_FOR_APPROVAL` (після вердикту рев'ю).
- [`.agentic/reports/08a-qa-manual-report.md`](08a-qa-manual-report.md) — цей звіт.

Продуктовий код, `contract/`, схвалені `.agentic/specs/01-*` … `05-*`, ADR, `acceptance/`, `a11y/` і `.agentic/project.json` не змінювались.

### 3.1. Ретест після Revise №4 етапу 7

Рішення власника на гейті 8.a (трекер 2026-11-03 05:30): план і секцію 2 підтверджено; BUG-001 — варіант 1, BUG-002, BUG-004 – BUG-008 — виправити в Revise №4 етапу 7; BUG-003 — запит на зміну №4 (ADR 0005); TC-087 – TC-090 — рішення ще не дано. Нові й змінені файли етапу 8.a:

- [`.agentic/qa/runs/RUN-2026-11-03-2.md`](../qa/runs/RUN-2026-11-03-2.md) — журнал ретесту.
- `.agentic/qa/runs/support/qa8a-retest.mjs` (новий сценарій: стан списку, фокус, підписи графіка, 320 px) і виводи `qa8a-retest-out.json`, `qa8a-extra-retest-out.json`, `qa8a-retest-flow-out.json`.
- `.agentic/qa/bugs/BUG-001…008.md` — статуси й рядок «Ретест».
- `.agentic/qa/evidence/BUG-001-retest-429-shows-source-error.jpg`, `BUG-007-retest-chart-labels-320px.png`, `BUG-009-broken-logo.png`.
- Після повторного рев'ю ретесту: `.agentic/qa/bugs/BUG-009.md` (новий, Minor / P3), `.agentic/qa/runs/support/qa8a-offline-logo.mjs` → `qa8a-offline-logo-out.json`; у тест-плані — новий TC-091 (офлайн E-NET) і уточнене очікування TC-078 (UX §8).

### 3.2. Revise 8.a: ретест після Revise №5 етапу 7

Рішення власника: 2026-11-03 14:18 («BUG-003 - ок; BUG-009 - ок; Ручний чек-лист - відкладаємо»), гейт етапу 7 22:25 («Approve & закоміть 7», коміт `8f0f2a5`), 22:25 «Так, Revise 8.a». Нові й змінені файли етапу 8.a:

- [`.agentic/qa/runs/RUN-2026-11-03-3.md`](../qa/runs/RUN-2026-11-03-3.md) — журнал ретесту на `8f0f2a5`: TC-086, TC-078, TC-062, TC-058, TC-059, TC-068 — Pass; TC-061 — не повторювався (причина в журналі).
- `.agentic/qa/runs/support/qa8a-retest3-errors-out.json`, `qa8a-retest3-logo-out.json`, `qa8a-retest3-flow-out.json` — виводи сценаріїв; `qa8a-retest3-logo.mjs` — копія `.claude/skills/verify/logo-focus-check.mjs` (SHA-256 однаковий), щоб доказ BUG-003 / BUG-009 відтворювався з репозиторію.
- `.agentic/specs/08-test-plan.md` — TC-086: очікування за варіантом Б BUG-003.
- `.agentic/qa/evidence/RUN-3-list-320-fallback.png`, `RUN-3-coin-page-focus.png`, `RUN-3-list-after-back.png`; а також `BUG-009-retest-list-320px.png`, `BUG-009-retest-coin-page-focus.png` (попередній ретест 14:24 на незакоміченому дереві).
- `.agentic/qa/bugs/BUG-003.md`, `BUG-009.md` — статус `Verified` з хешем `8f0f2a5`.
- `.agentic/specs/08-test-plan.md` — очікування TC-061, TC-062 за запитом на зміну №5 (виняток `fetch` онлайн → E-SRC, 1 запит) і примітка «TC-087 – TC-090 відкладено власником 14:18».

---

### 3.3. Revise 8.a №2: ретест після Revise №6 етапу 7

Рішення власника 2026-11-04 00:11 (трекер, розділ 4): п. 1 — BUG-010 (прибрати preload), п. 2 — BUG-011, п. 3 — чек-лист TC-087 – TC-090: ризик прийнято, п. 5 — TD-023 (фокус на посиланні монети, з якої повернулись). Гейти: етап 7 Revise №6 — `8c68680` (01:10), 8.b Revise — `821453d` (01:31); «Так, Revise 8.a».

- [`.agentic/qa/runs/RUN-2026-11-04.md`](../qa/runs/RUN-2026-11-04.md) — журнал ретесту на `8c68680`: BUG-010 (TC-062, гілка 5xx; AC-8.1 – AC-8.3) — Pass у Chromium, WebKit, Firefox; BUG-011 (TC-088, частина «текст поради») — Pass у WebKit; TC-059 (нове очікування) — Pass; регресія TC-058, TC-068, TC-078, TC-086 — Pass.
- `.agentic/qa/runs/support/qa8a-retest4.mjs` (новий сценарій BUG-010 / BUG-011, звіряє 13 очікувань, код 1 при розбіжності) і `qa8a-retest4-out.txt`; `qa8a-retest4-logo.mjs` (копія `.claude/skills/verify/logo-focus-check.mjs`, SHA-256 однаковий) і `qa8a-retest4-logo-out.txt`; `qa8a-retest4-flow-out.json` (вивід `qa8a-retest.mjs`); `qa8a-retest4-tc059.mjs` і `qa8a-retest4-tc059-out.json` (проба кроку 2 TC-059).
- `.agentic/specs/08-test-plan.md` — TC-059: крок 2 — фокус на посиланні монети, з якої повернулись (якщо воно на екрані), інакше h1; посилання на рішення власника і TD-024.
- `.agentic/qa/bugs/BUG-010.md` — ретест 8.a; статус лишається `Fixed`: справжній Safari не перевірено (TC-088 — ризик прийнято власником, п. 3). BUG-011 — `Verified` на 8.b (`821453d`), ретест 8.a підтверджує.
- `.agentic/specs/08-test-plan.md` — також середовище «Браузер 3 (Revise 8.a №2)», «Не доступно агенту», ризики тест-плану й примітка TC-087 – TC-090 (ризик прийнято 00:11, п. 3); TC-059 — колонка «Авто (8.b)»: E2E немає, модульний тест і `logo-focus-check` (TD-026).
- `.agentic/tech-debt.md` — новий TD-026 (рев'ю №5): прогалина тестів «сортування з `null`» і фокус після переходу без E2E.
- `.claude/rules/project-lessons.md` — повтор L-002 (рев'ю №3): перевірки, що рахують файли етапу, запускати останніми.

---

## 4. Докази працездатності (Verification Evidence)

### 4.0. Валюта довіри (Trust Receipt)

Рядки «(Revise 8.a №2)» — прогони 2026-11-04 01:40 – 01:44 на коді `8c68680` (трасування, лічильник BUG і сканери — повтор 02:09:04 після останніх правок); інші — попередні проходи (позначено комітом).

| Перевірка | Команда | Код виходу | Лічильники | Повторив рев'юер | Примітка |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Валідатор етапу (Revise 8.a №2) | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 8.a` | 0 | 10 PASS, 0 FAIL: передумови 4, 7; статус аудиту PASS; «Валюта довіри» 33; тест-план; 4 RUN; оракул незмінний; 85 файлів правил якості; секрети | ні | 2026-11-04 02:09:05, після вердикту PASS рев'ю №7 і останніх правок (L-004); вивід — 4.2, блок «Revise 8.a №2 — валідатор етапу» |
| Вердикт рев'юера (Revise 8.a №2) | субагент `independent-reviewer` | 0 | рев'ю №7 — PASS (2 WARNING — виправлено); рев'ю №3 – №6 — BLOCKERS FOUND (виправлено) | так | рев'ю №7 — після 02:04:50; записи — 4.3 |
| Ретест BUG-010, BUG-011 (Revise 8.a №2) | `node .agentic/qa/runs/support/qa8a-retest4.mjs` | 0 | CHECKS 13/13: Chromium, WebKit, Firefox — preload 0, 503 → повтор → список (2 запити), ручні `fetch` 200 / 200 і 2 нові запити; WebKit — порада Safari дослівно UX §5.2; Chromium, Firefox — поради немає | ні | 01:41:29 – 01:41:44, код `8c68680`; вивід — 4.1, блок «Revise 8.a №2» |
| Ретест потоків (Revise 8.a №2) | `node .agentic/qa/runs/support/qa8a-retest.mjs` | 0 | TC-059 кроки 1, 3, 4 — h1; TC-058 `cap` 50 / «sol» 1 / `price` 25; TC-068 — 5 маршрутів 320 px з кожною підказкою, переповнення 0 | ні | 01:41:51 – 01:42:00; вивід — 4.1 |
| Ретест фокуса, BUG-003, BUG-009, 320 px (Revise 8.a №2) | `node .agentic/qa/runs/support/qa8a-retest4-logo.mjs <scratchpad сесії>/r8a-shots` (знімки не комітяться) | 0 | CHECKS 21/21: TC-059 крок 2 — посилання монети в межах екрана (миша, «Назад», клавіатура з рамкою); 50 кружків; «—» для `null`; консоль 0, CSP 0 | ні | 01:42:00 – 01:42:10; вивід — 4.1 |
| Проба TC-059 крок 2 (Revise 8.a №2) | `node .agentic/qa/runs/support/qa8a-retest4-tc059.mjs` | 0 | без паузи — `H1`, `yAfterBack` 1124 (артефакт сценарію); з прокруткою й паузою — `A:Bitcoin`, `yAfterBack` 0 | ні | 01:43:57 – 01:44:00; вивід — 4.1 |
| Код ретесту = коміт етапу 7 (Revise 8.a №2) | `git status --short src` (HEAD `821453d`, код — `8c68680`) | 0 | порожній вивід | ні | 01:43:13; збірка `pnpm build` 01:40 — `index-rsvN1pBP.js` gzip 106.67 kB |
| Трасування AC → TC (Revise 8.a №2) | та сама команда, що в рядку «Трасування AC → TC (Revise 8.a)» | 0 | AC 57 без TC 0 [] TC 91 | ні | 02:09:04, після останньої правки тест-плану; вивід — 4.2, блок «Revise 8.a №2» |
| Відкриті Blocker / Critical (Revise 8.a №2) | та сама команда, що в рядку «Відкриті Blocker / Critical (Revise 8.a)» | 0 | BUG 11 відкритих Blocker/Critical 0 Verified 10 ['BUG-001', 'BUG-002', 'BUG-003', 'BUG-004', 'BUG-005', 'BUG-006', 'BUG-007', 'BUG-008', 'BUG-009', 'BUG-011'] | ні | 02:09:04; вивід — 4.2 |
| Сканер секретів (Revise 8.a №2) | `verify-gate.py --scan-secrets .agentic/qa` і `--scan-secrets .agentic/specs/08-test-plan.md` | 0 | 51 + 1 файл, 0 секретів | ні | 02:09:04, після останньої правки файлів етапу; вивід — 4.2, блок «Revise 8.a №2» |
| Валідатор етапу (Revise 8.a) | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 8.a` | 0 | 10 PASS, 0 FAIL: передумови 4, 7; «Валюта довіри» 23; 3 RUN; оракул незмінний; 85 файлів правил якості; 198 файлів секретів | ні | 22:40:06, після вердикту PASS рев'ю №2 (L-004); вивід — 4.2, блок «Revise 8.a — валідатор етапу»; отримано на: код `8f0f2a5`, звіт закомічено як `8755fb3` |
| Вердикт рев'юера (Revise 8.a) | субагент `independent-reviewer` | 0 | рев'ю №2 — PASS (0 BLOCKER, 2 WARNING — виправлено); рев'ю №1 — BLOCKERS FOUND (виправлено) | ні | записи — 4.3; отримано на: код `8f0f2a5`, звіт закомічено як `8755fb3` |
| Ретест таблиці помилок (Revise 8.a) | `node .agentic/qa/runs/support/qa8a.mjs errors` | 0 | 5 випадків: 429+CORS 1, 429 без CORS 1, 500 3, обрив онлайн 1, форма 1 запит; усі «Не вдалося отримати ціни» | ні | 22:27:02 – 22:27:43, коміт `8f0f2a5`; вивід — 4.1, блок «Revise 8.a»; отримано на: код `8f0f2a5`, звіт закомічено як `8755fb3` |
| Ретест BUG-003, BUG-009, фокус, 320 px (Revise 8.a) | `node .claude/skills/verify/logo-focus-check.mjs <каталог знімків>` (копія — `.agentic/qa/runs/support/qa8a-retest3-logo.mjs`, SHA-256 однаковий) | 0 | 50 рядків, «—» / «немає даних»; 0 зламаних `img`, 50 кружків; фокус мишею без рамки, прокрутка 1500; клавіатурою — рамка 2 px; 5 маршрутів 320 px (iPhone SE, без підказок) — переповнення 0; консоль 0 (без «coin-images» / «ERR_FAILED»), CSP 0 | ні | 22:27:43 – 22:27:51; вивід — 4.1, блок «Revise 8.a»; отримано на: код `8f0f2a5`, звіт закомічено як `8755fb3` |
| Ретест потоків (Revise 8.a, після рев'ю 8.a) | `node .agentic/qa/runs/support/qa8a-retest.mjs` | 0 | TC-059 кроки 1–4: h1 у фокусі на 4 екранах; TC-058: `cap` 50 / «sol» 1 / `price` 25; TC-068: 5 маршрутів 320 px (Pixel 7) з кожною підказкою — переповнення 0 | ні | 22:34:48 – 22:34:57, коміт `8f0f2a5`; вивід — 4.1, блок «Revise 8.a — потоки»; отримано на: код `8f0f2a5`, звіт закомічено як `8755fb3` |
| Код ретесту = коміт етапу 7 (Revise 8.a) | `git status --short src` (HEAD `8f0f2a5`) | 0 | порожній вивід | ні | 22:39:32; збірка `pnpm build` 22:26 — `index-fiVsxdXU.js` gzip 106.52 kB, той самий хеш, що в `--stage 7 --run`; вивід — 4.2, блок «Revise 8.a»; отримано на: код `8f0f2a5`, звіт закомічено як `8755fb3` |
| Трасування AC → TC (Revise 8.a) | `python -c "import re;r=set(re.findall(r'AC-\d+\.\d+',open('.agentic/specs/02-requirements.md',encoding='utf-8').read()));t=set(re.findall(r'AC-\d+\.\d+',open('.agentic/specs/08-test-plan.md',encoding='utf-8').read()));tc=set(re.findall(r'TC-\d+',open('.agentic/specs/08-test-plan.md',encoding='utf-8').read()));print('AC',len(r),'без TC',len(r-t),sorted(r-t),'TC',len(tc))"` | 0 | AC 57, без TC 0, TC 91 | ні | 22:39:32; вивід — 4.2, блок «Revise 8.a»; отримано на: код `8f0f2a5`, звіт закомічено як `8755fb3` |
| Відкриті Blocker / Critical (Revise 8.a) | `python -c "import glob,re;b=sorted(glob.glob('.agentic/qa/bugs/BUG-*.md'));t={f:open(f,encoding='utf-8').read() for f in b};o=[f for f in b if any(re.search(r'Severity:\**\s*'+w,t[f]) for w in ('Blocker','Critical')) and not any(re.search(r'Статус:\**\s*'+w,t[f]) for w in ('Verified','Closed'))];v=[f[-10:-3] for f in b if re.search(r'Статус:\**\s*Verified',t[f])];print('BUG',len(b),'відкритих Blocker/Critical',len(o),'Verified',len(v),v)"` | 0 | 9 BUG, 0 відкритих Blocker / Critical, 9 Verified | ні | 22:39:32; лічильник замість `grep -L` (L-001); вивід — 4.2, блок «Revise 8.a»; отримано на: код `8f0f2a5`, звіт закомічено як `8755fb3` |
| Сканер секретів (Revise 8.a) | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --scan-secrets .agentic/qa` і `--scan-secrets .agentic/specs/08-test-plan.md` | 0 | 40 + 1 файл, 0 секретів | ні | 22:39:32; вивід — 4.2, блок «Revise 8.a»; отримано на: код `8f0f2a5`, звіт закомічено як `8755fb3` |
| Валідатор етапу (Revise №4, `93d517f`) | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 8.a` | 0 | 0 помилок; передумови 4, 7; «Валюта довіри» 14 перевірок; 2 RUN; оракул незмінний; 84 файли правил якості; 191 файл секретів | так (до вердикту: код 1 лише через статус аудиту) | 14:07:37, після вердикту PASS четвертого рев'ю (L-004); вивід — 4.2; первинний прогін 05:17:08 (база `040a537`) — там же |
| Сканер секретів | `verify-gate.py --scan-secrets .agentic/qa` і `--scan-secrets .agentic/specs/08-test-plan.md` | 0 | 35 + 1 файл, 0 секретів | так | Повтор після ретесту 06:00:02 (первинний 05:09 — 27 + 1); вивід — 4.2; отримано на: дерево Revise №4, закомічене як `e3fb805` |
| Вердикт рев'юера | `independent-reviewer` | 0 | четверте рев'ю — PASS (0 BLOCKER, 2 WARNING — виправлено) | так | вивід — 4.3; отримано на: Revise №4, дерево `e3fb805`; поточний — рядок «Вердикт рев'юера (Revise 8.a)» |
| Трасування AC → TC | `python -c "<AC з 02-requirements − AC з 08-test-plan>"` (розділ 8 гайду скіла) | 0 | 57 AC, 0 без TC (91 TC) | так (еквівалент через Grep) | Повтор 06:00:02; вивід — 4.2; отримано на: дерево Revise №4, закомічене як `e3fb805` |
| Відкриті Blocker / Critical | `python -c "<BUG-*.md із Severity Blocker/Critical і статусом не Verified/Closed>"` | 0 | 9 BUG, 0 відкритих Blocker / Critical | так (еквівалент через Grep) | Повтор 06:00:02, після зміни статусів і BUG-009; лічильник замість `grep -L` (L-001); вивід — 4.2; отримано на: дерево Revise №4, закомічене як `e3fb805` |
| Збірка | `pnpm build` | 0 | `✓ built`, JS 341.42 kB / gzip 105.66 kB | ні (хук рев'юера відхилив `pnpm build`) | первинний прогін 05:09, база `040a537`, до Revise №4 — збірка ретесту — `pnpm verify` 05:34:45 (етап 7, Revise №4): `index-B4e6vtFN.js` 343.03 kB / gzip 106.25 kB, NFR-5 105.66 kB; Вивід — 4.1, 05:09 |
| Керовані стани в браузері | `node .agentic/qa/runs/support/qa8a.mjs` | 0 | 12 сценаріїв, 0 `ERROR` | ні | первинний прогін 05:09, база `040a537`, до Revise №4 —  04:55:30 – 04:56:33; лічильник — 4.1 (05:11) |
| Керовані стани (доповнення) | `node .agentic/qa/runs/support/qa8a-extra.mjs`, `qa8a-gaps.mjs`, `busy.mjs`, `name.mjs` | 0 | extra: 3 блоки + 12 замірів reflow; gaps: 9 ключів, 0 `ERROR`; busy: 1; name: 1 | ні | первинний прогін 05:09, база `040a537`, до Revise №4 —  Перший запуск `qa8a-gaps.mjs` (05:05:05) — EXIT=1 через неточний локатор у самому сценарії; виправлено, повтор 05:05:42 — EXIT=0. Виводи — 4.1 і RUN-2026-11-03 |
| axe (довідково, NFR-6/7) | `pnpm test:a11y` | 0 | 40 passed, 0 failed | ні | первинний прогін 05:09, база `040a537`, до Revise №4 — повтор після Revise №4 — `pnpm test:a11y` 05:43:30, 40 passed (`.agentic/evidence/debt-checks.md`); Старт 04:58; вивід — 4.1 |
| Ретест керованих станів | `node qa8a.mjs`, `node qa8a-extra.mjs`, `node name.mjs` (`.agentic/qa/runs/support/`) | 0 | 12 сценаріїв, 0 `ERROR`; E-STORE і C-TAB; ім'я ★ точне | ні | 05:36:27 – 05:37:47; вивід — 4.1 (ретест); отримано на: код Revise №4, закомічений як `e3fb805` |
| Ретест потоків | `node .agentic/qa/runs/support/qa8a-retest.mjs` | 0 | 12 ключів: стан списку, фокус h1 на 4 екранах, підписи графіка, 5 маршрутів 320 px — переповнення 0 | ні | 05:40:55 – 05:41:04; вивід — RUN-2026-11-03-2; отримано на: код Revise №4, закомічений як `e3fb805` |
| Ретест офлайн і логотипа | `node .agentic/qa/runs/support/qa8a-offline-logo.mjs` | 0 | TC-091 Pass («Немає з'єднання», `onLine=false`); TC-078 Fail (зламаний логотип, 25 на `#/`) → BUG-009 | ні | 05:56:46 – 05:57:02; перший запуск 05:56:19 некоректний (route відповідав 500 в офлайні) — виправлено; вивід — 4.1; отримано на: код Revise №4, закомічений як `e3fb805` |
| Код ретесту = коміт етапу 7 | `git diff --stat e3fb805 -- src` | 0 | порожній diff | так | 14:00 (після коміту); вивід — 4.2 |
| Ручний прогін | вбудований браузер + журнал RUN | не застосовно | Первинний прогін (база `040a537`): 90 TC — Pass 76, Fail 9, Not run 5; 8 BUG. Після рев'ю ретесту: 91 TC, 9 BUG. Ретест: 10 TC з BUG — Pass 9, Fail 1 (TC-086, BUG-003); регресія TC-068 Pass; новий TC-091 Pass; TC-078 (уточнене очікування) Fail → BUG-009. Revise 8.a (`8f0f2a5`, RUN-2026-11-03-3): TC-086, TC-078, TC-062, TC-058, TC-059, TC-068 — Pass; TC-061 не повторювався; 9 BUG — усі Verified. Revise 8.a №2 (`8c68680`, RUN-2026-11-04): BUG-010 (TC-062, гілка 5xx), BUG-011 (TC-088, текст поради), TC-059 (нове очікування), TC-058, TC-068, TC-078, TC-086 — Pass; 11 BUG — Verified 10, BUG-010 — Fixed | — | Ручна сесія без коду виходу; докази — SES-01 – SES-11, RUN-2026-11-03, RUN-2026-11-03-2, RUN-2026-11-03-3, RUN-2026-11-04 |

### 4.1. Збірка, лінтери та автоматичні тести

**Revise 8.a — потоки (2026-11-03 22:34:48 – 22:34:57, після рев'ю 8.a, `vite preview` :4173, коміт `8f0f2a5`):**

```text
$ node .agentic/qa/runs/support/qa8a-retest.mjs
{
 "firstLoadFocus": "BODY:\n    Перейти до вмістуКрипто-Р",
 "before": {
  "rows": 50,
  "sort": "cap"
 },
 "coinFocus": "H1:Bitcoin",
 "coinActive": "<h1 tabindex=\"-1\" class=\"m-0 font-display text-2xl leading-[30px] font-semibold [&amp;:focus:not(:focus-visible)]:outlin",
 "chartLabels": "27 жовт.\n3 лист.",
 "afterBackLink": {
  "rows": 50,
  "sort": "cap",
  "focus": "H1:Топ-50 монет"
 },
 "afterHistoryBack": {
  "query": "sol",
  "rows": 1,
  "sort": "cap",
  "focus": "H1:Топ-50 монет"
 },
 "favFocus": "H1:Обрані",
 "outOfTopFocus": "H1:Монета зараз поза топ-50",
 "afterReload": {
  "sort": "price",
  "query": "",
  "rows": 25
 },
 "mobile": {
  "#/": 0,
  "#/coin/bitcoin": 0,
  "#/coin/tether": 0,
  "#/favorites": 0,
  "#/abc": 0
 },
 "mobileChartLabels": "27 жовт.\n3 лист."
}
EXIT=0
```

**Revise 8.a — ретест на `8f0f2a5` (2026-11-03 22:27:02 – 22:27:51, `vite preview` :4173):**

```text
$ node .agentic/qa/runs/support/qa8a.mjs errors        # 22:27:02 – 22:27:43
{
 "errors": {
  "429+CORS": {
   "alert": "Не вдалося отримати ціни\n\nCoinGecko зараз не відповідає, тому ціни не показуємо. Спробуйте ще раз за хвилину.\n\nСпробувати ще раз",
   "prices": false,
   "sortPanel": 0,
   "disclaimer": true,
   "topRequests": 1,
   "onLine": true
  },
  "429 без CORS (як CoinGecko)": {
   "alert": "Не вдалося отримати ціни\n\nCoinGecko зараз не відповідає, тому ціни не показуємо. Спробуйте ще раз за хвилину.\n\nСпробувати ще раз",
   "prices": false,
   "sortPanel": 0,
   "disclaimer": true,
   "topRequests": 1,
   "onLine": true
  },
  "500+CORS": {
   "alert": "Не вдалося отримати ціни\n\nCoinGecko зараз не відповідає, тому ціни не показуємо. Спробуйте ще раз за хвилину.\n\nСпробувати ще раз",
   "prices": false,
   "sortPanel": 0,
   "disclaimer": true,
   "topRequests": 3,
   "onLine": true
  },
  "мережа (abort), онлайн": {
   "alert": "Не вдалося отримати ціни\n\nCoinGecko зараз не відповідає, тому ціни не показуємо. Спробуйте ще раз за хвилину.\n\nСпробувати ще раз",
   "prices": false,
   "sortPanel": 0,
   "disclaimer": true,
   "topRequests": 1,
   "onLine": true
  },
  "некоректна форма": {
   "alert": "Не вдалося отримати ціни\n\nCoinGecko зараз не відповідає, тому ціни не показуємо. Спробуйте ще раз за хвилину.\n\nСпробувати ще раз",
   "prices": false,
   "sortPanel": 0,
   "disclaimer": true,
   "topRequests": 1,
   "onLine": true
  },
  "офлайн": "goto без мережі неможливий для локального preview — див. примітку"
 }
}
EXIT=0
$ node .claude/skills/verify/logo-focus-check.mjs <scratchpad>/shots   # 22:27:43 – 22:27:51
{
 "list": {
  "rows": 50,
  "nullRowChange": "—\nнемає даних",
  "alert": false,
  "brokenImgs": 0,
  "imgs": 0,
  "fallbacks": 50,
  "firstFallback": "B"
 },
 "mouseToCoin": {
  "listY": 1500,
  "text": "Ethena USDe",
  "focused": true,
  "focusVisible": false,
  "outlineStyle": "none",
  "outlineWidth": "3px",
  "scrollY": 0
 },
 "coinLogo": {
  "img": false,
  "fallback": "E",
  "size": 40
 },
 "mouseBackLink": {
  "text": "Топ-50 монет",
  "focused": true,
  "focusVisible": false,
  "outlineStyle": "none",
  "outlineWidth": "3px",
  "scrollY": 1500
 },
 "browserBack": {
  "text": "Топ-50 монет",
  "focused": true,
  "focusVisible": false,
  "outlineStyle": "none",
  "outlineWidth": "3px",
  "scrollY": 1500
 },
 "keyboard": {
  "text": "Bitcoin",
  "focused": true,
  "focusVisible": true,
  "outlineStyle": "solid",
  "outlineWidth": "2px",
  "scrollY": 0
 },
 "keyboardNextTab": "☆Додати в обрані",
 "nullCoinPage": {
  "dash": true,
  "spoken": [
   "немає даних за 7 днів",
   "немає даних"
  ]
 },
 "desktop": {
  "errors": [],
  "csp": 0
 },
 "mobile": {
  "#/": {
   "overflow": 0,
   "broken": 0
  },
  "#/coin/bitcoin": {
   "overflow": 0,
   "broken": 0
  },
  "#/coin/binancecoin": {
   "overflow": 0,
   "broken": 0
  },
  "#/favorites": {
   "overflow": 0,
   "broken": 0
  },
  "#/abc": {
   "overflow": 0,
   "broken": 0
  },
  "errors": [],
  "csp": 0
 }
}
EXIT=0
```

**Ретест після Revise №4** (вивід `qa8a.mjs` / `qa8a-extra.mjs` записано в `%TEMP%/rt-out.json` / `rt-extra.json` і скопійовано в `support/` як `qa8a-retest-out.json` / `qa8a-extra-retest-out.json` — RUN-2026-11-03-2, «Виводи»; збірка — `pnpm verify` 05:34:45, EXIT=0, 252 passed; оракул 91/91 — звіт етапу 7, 4.1):

```text
$ cd .agentic/qa/runs/support && date "+%Y-%m-%d %H:%M:%S"
2026-11-03 05:36:27
$ node qa8a.mjs > rt-out.json
qa8a EXIT=0
$ node qa8a-extra.mjs > rt-extra.json
extra EXIT=0
$ node name.mjs
  - 'button "Додати в обрані: Solana"': Додати в обрані
name EXIT=0
05:37:47
errors {"429+CORS":{"alert":"Не вдалося отримати ціни","top":1},"429 без CORS (як CoinGecko)":{"alert":"Не вдалося отримати ціни","top":1},"500+CORS":{"alert":"Не вдалося отримати ціни","top":3},"мережа (abort), онлайн":{"alert":"Не вдалося отримати ціни","top":1},"некоректна форма":{"alert":"Не вдалося отримати ціни","top":1},…}
sortFixture {…"AC-2.4 (позиції в сортуванні «зростання»)":{"tether":10,"usd-coin":11,…},"tetherAboveUsdc":true}
nullChange Не вдалося отримати ціни
E-STORE {"star":"Прибрати з обраних: Solana","status":["Solana додано в обрані","Не вдалося зберегти обрані: …"]}
ERRORs [] keys 12
format/nfr3 {"c":[],"csp":0,"n":{"onOpen":{"top":1,"stable":1},"after5min":{"top":6,"stable":1},"cookies":0,"localStorageKeys":[],"iframes":0,"consoleErrors":[],"csp":0}}

$ date: 2026-11-03 05:40:55
$ node .agentic/qa/runs/support/qa8a-retest.mjs
EXIT=0
{"before":{"rows":50,"sort":"cap"},"coinFocus":"H1:Bitcoin","chartLabels":"27 жовт.\n3 лист.",
 "afterBackLink":{"rows":50,"sort":"cap","focus":"H1:Топ-50 монет"},"afterHistoryBack":{"query":"sol","rows":1,"sort":"cap","focus":"H1:Топ-50 монет"},
 "favFocus":"H1:Обрані","outOfTopFocus":"H1:Монета зараз поза топ-50","afterReload":{"sort":"price","query":"","rows":25},
 "mobile":{"#/":0,"#/coin/bitcoin":0,"#/coin/tether":0,"#/favorites":0,"#/abc":0}}
05:41:04

живий CoinGecko: curl 05:38:33 → HTTP/1.1 429 Too Many Requests, Retry-After: 43 (без Access-Control-Allow-Origin)
сторінка 05:38:41 → {"alert":["Не вдалося отримати ціни"],"online":true,"prices":false,"reqs":["top50 status=0 start=14ms"],"sinceLoadMs":24394}
```

```text
$ date: 2026-11-03 05:56:46
$ node .agentic/qa/runs/support/qa8a-offline-logo.mjs
EXIT=0
{
 "beforeOffline": {
  "alert": "Не вдалося отримати ціни",
  "top": 3
 },
 "offline": {
  "onLine": false,
  "alert": "Немає з'єднання",
  "status": [
   "Досі немає з'єднання. Перевірте інтернет і спробуйте ще раз."
  ],
  "prices": false,
  "attemptsWhileOffline": 3
 },
 "logo": {
  "img": true,
  "broken": true,
  "fallbackLetter": false
 },
 "listBrokenImgs": 25
}
05:57:02
```

**Первинний прогін (до ремонту):**

Документний етап: лінт, формат і модульні тести продукту не змінювались (код не чіпали). Запущено збірку, сценарії керованих станів і axe.

```text
$ date: 2026-11-03 05:09:28
$ pnpm build
dist/assets/index-FW3qyPvS.js                                 341.42 kB │ gzip: 105.66 kB

✓ built in 182ms
EXIT=0
$ date: 2026-11-03 05:09:29
```

Примітка: перша збірка о 04:48 (під якою йшла жива сесія 04:48 – 04:53) дала `index-DCGd_22o.js` того самого розміру (341.42 kB / gzip 105.66 kB); збірки о 04:58 (`test:a11y`) і 05:09 — `index-FW3qyPvS.js`, дві повторні збірки о 05:09 — той самий хеш. `git diff HEAD -- src index.html vite.config.js public` порожній, тож вихідний код однаковий; причину іншого хеша першої збірки не встановлено.

```text
$ date "+%H:%M:%S" && node qa8a.mjs > qa8a-out.json; echo EXIT=$?; date "+%H:%M:%S"
04:55:30
EXIT=0
04:56:33

$ date: 2026-11-03 05:11:26
$ node -e "<лічильник сценаріїв і ERROR у виводах>"
qa8a-out.json: ключів 12, ERROR 0 — format, top51, nullChange, stale, staleWhileOpen, errors, retryStillDown, loading, chartEmpty, favorites, sortFixture, nfr3
qa8a-gaps-out.json: ключів 9, ERROR 0 — ethName, tab1, tab2, favs, favFooter, stableHintCount, stableHintText, listHints, volatility
EXIT=0

$ node qa8a-extra.mjs; echo EXIT=$?        # файл записано 04:57:12 (mtime), запуск — одразу після, до 04:58 (старт test:a11y); коміт 040a537
{ "C-TAB": {…"tabLabel": "Обрані · 1\n, 1 монета"}, "E-STORE": {"star": "Додати в обрані: Solana", …},
  "Partial+logo": {"alert": 0, "stableHint": 0, "prices": true, …}, 12 × "reflow …": 0 }   (повний вивід — RUN-2026-11-03)
EXIT=0
$ date "+%H:%M:%S"; node qa8a-gaps.mjs     # повтор після виправлення локатора
05:05:42
(вивід — .agentic/qa/runs/support/qa8a-gaps-out.json)
EXIT=0
$ node busy.mjs                            # файл записано 05:02:06 (mtime), запуск — у тій самій команді; коміт 040a537
{"busyAnywhere":1,"insideMain":1,"skeletonText":["Завантажуємо ціни…"]}
EXIT=0
$ node name.mjs                            # файл записано 05:06:00 (mtime), запуск — у тій самій команді; коміт 040a537
  - 'button "Додати в обрані : Solana"'
EXIT=0
```

Підсумок сценаріїв `qa8a.mjs` (стисло, повний JSON — `qa8a-out.json`):

```text
format          Bitcoin «$67 250,10 ▲ +4,2 % … $1,32 трлн»; 9 меж округлення як у AC-1.5; консоль 0, CSP 0; запити 1 + 1
top51           50 рядків, «Монета-51» відсутня
nullChange      «Не вдалося отримати ціни», цін немає                         → BUG-003
stale           4:59 і 5:00 — ціни; 5:01 — «Ціни застаріли», 0 рядків
staleWhileOpen  +1…+3 хв ціни; +4, +5 хв «Ціни застаріли»; 13 запитів за 5 хв (5xx з повторами)
errors          429+CORS «Не вдалося…» 1 запит; «429 без CORS» на підміні «Не вдалося…» 1 запит (CORS не блокується);
                500 «Не вдалося…» 3; обрив при onLine=true «Немає з'єднання» 3; форма «Не вдалося…» 1   → BUG-001
retryStillDown  статус «Не вдалося оновити ціни…», фокус на кнопці, 2 запити
loading         «Завантажуємо ціни…», не порожній екран
chartEmpty      h1 «Bitcoin» + помилка, SVG 0; Ethereum з графіком
favorites       AC-8.6, AC-6.4/6.7, AC-6.6, AC-4.3 (місце 50), AC-6.1 (+7 днів), AC-6.2 — як очікувано
sortFixture     AC-2.3 місце 48 першим, 25 рядків; AC-2.4 tether 17 / usd-coin 15, tetherAboveUsdc=false → BUG-004
nfr3            відкриття 1 + 1; за 5 хв топ-50 = 6; cookies 0; localStorage 0 ключів; iframe 0; консоль 0; CSP 0
```

```text
2026-11-03 04:58
$ pnpm test:a11y
  ok 36 [chromium] › a11y\shell.a11y.spec.js:43:7 › сторінка монети: 0 critical/serious (dark, ПК) (474ms)
  ok 37 [chromium] › a11y\shell.a11y.spec.js:43:7 › поза топ-50: 0 critical/serious (dark, ПК) (409ms)
  ok 38 [chromium] › a11y\shell.a11y.spec.js:43:7 › обрані порожні: 0 critical/serious (dark, ПК) (417ms)
  ok 39 [chromium] › a11y\shell.a11y.spec.js:43:7 › обрані заповнені: 0 critical/serious (dark, ПК) (442ms)
  ok 40 [chromium] › a11y\shell.a11y.spec.js:43:7 › сторінку не знайдено: 0 critical/serious (dark, ПК) (392ms)

  40 passed (19.6s)
EXIT=0
```

**Живий прогін (вбудований браузер, 04:48 – 04:53):** підсумок — RUN-2026-11-03. Ключовий доказ ризику «429 без CORS»:

```text
$ curl -s -o /dev/null -D - ".../coins/markets?vs_currency=usd&category=stablecoins&per_page=250" -H "Origin: http://localhost:4173"
2026-11-03 04:52:56
HTTP/1.1 429 Too Many Requests
Retry-After: 36
(заголовка Access-Control-Allow-Origin немає)

сторінка 04:53:14: {"online":true,"alert":["Немає з'єднання\n\nПеревірте інтернет і спробуйте ще раз.\n\nСпробувати ще раз"],
  "prices":false,"sortPanel":false,"reqs":["top50 status=0 start=21ms","top50 status=0 start=2054ms","top50 status=0 start=6071ms"]}
консоль: 3 × "Access to fetch at 'https://api.coingecko.com/api/v3/coins/markets?…' … blocked by CORS policy:
  No 'Access-Control-Allow-Origin' header is present on the requested resource." + 1 × link element (preload); net::ERR_FAILED
```

**Revise 8.a №2 (2026-11-04), код `8c68680`:**

```text
$ pnpm build        (01:40)
dist/assets/index-rsvN1pBP.js   344.46 kB │ gzip: 106.67 kB
$ node .agentic/qa/runs/support/qa8a-retest4.mjs      (01:41:29 – 01:41:44)
OK   chromium BUG-010: preload 0
OK   chromium BUG-010: 503 → повтор → список (2 запити)
OK   chromium BUG-010: ручні fetch — 200, 200 і 2 нові запити
OK   chromium: поради Safari немає
OK   webkit BUG-010: preload 0
OK   webkit BUG-010: 503 → повтор → список (2 запити)
OK   webkit BUG-010: ручні fetch — 200, 200 і 2 нові запити
OK   webkit BUG-011: заголовок поради
OK   webkit BUG-011: текст дослівно UX §5.2
OK   firefox BUG-010: preload 0
OK   firefox BUG-010: 503 → повтор → список (2 запити)
OK   firefox BUG-010: ручні fetch — 200, 200 і 2 нові запити
OK   firefox: поради Safari немає
CHECKS 13/13
EXIT=0
# попередні запуски сценарію: 01:40:39 — EXIT=1 (застарілий last_updated фікстури → E-STALE), 01:41:05 — EXIT=1 (селектор абзацу поради, 12/13) — вади сценарію, виправлено

$ node .agentic/qa/runs/support/qa8a-retest.mjs      (01:41:51 – 01:42:00) → qa8a-retest4-flow-out.json
coinFocus H1:Bitcoin
afterBackLink {'rows': 50, 'sort': 'cap', 'focus': 'H1:Топ-50 монет'}     # артефакт сценарію — див. пробу нижче
afterHistoryBack {'query': 'sol', 'rows': 1, 'sort': 'cap', 'focus': 'A:Solana'}
favFocus H1:Обрані
outOfTopFocus H1:Монета зараз поза топ-50
afterReload {'sort': 'price', 'query': '', 'rows': 25}
mobile {'#/': 0, '#/coin/bitcoin': 0, '#/coin/tether': 0, '#/favorites': 0, '#/abc': 0}
EXIT=0
$ git restore -- .agentic/qa/evidence/BUG-007-retest-chart-labels-320px.png      # побічний ефект сценарію

$ node .agentic/qa/runs/support/qa8a-retest4-logo.mjs <scratchpad сесії>/r8a-shots      (01:42:00 – 01:42:10; знімки не комітяться)
CHECKS 21/21      (рядки OK — qa8a-retest4-logo-out.txt; mouseBackLink, browserBack, keyboardBack, favoritesBack, list, coinLogo, nullCoinPage, desktop, mobile)
EXIT=0

$ node .agentic/qa/runs/support/qa8a-retest4-tc059.mjs      (01:43:57 – 01:44:00)
{"pause0": {"yAfterMore": 1124, "yBeforeClick": 1124, "yAfterBack": 1124, "focus": "H1:Топ-50 монет"}, "pause300": {"yAfterMore": 1124, "yBeforeClick": 0, "yAfterBack": 0, "focus": "A:Bitcoin"}}
EXIT=0
```

### 4.2. Валідація артефактів, контракту, інфраструктури

**Revise 8.a — валідатор етапу (2026-11-03 22:40:06, після вердикту PASS рев'ю №2, повний вивід):**

```text
$ python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 8.a

=== Перевірка етапу: Stage 8.a ===
ℹ️  [INFO] QA, частина A: тест-дизайн і ручне тестування — скіл qa-engineer
✅ [PASS] Передумови схвалено: 4, 7
ℹ️  [INFO] Перевірка звіту: .agentic/reports/08a-qa-manual-report.md
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 23 перевірок із кодами виходу
✅ [PASS] Карта технологій заповнена (5 рядків)
✅ [PASS] Conventional Commit у секції 7 валідний
✅ [PASS] Артефакт .agentic/specs/08-test-plan.md знайдено
✅ [PASS] Артефакт '.agentic/qa/runs/RUN-*.md': 3 файлів

=== Оракул (приймальні тести) — режим protect ===
✅ [PASS] Оракул незмінний від коміту етапу 6 (f1ac4b57)

=== Правила якості коду: . ===
✅ [PASS] Перевірено файлів: 85, порушень-помилок немає

=== Сканування секретів: . ===
ℹ️  [INFO] Проскановано файлів: 198
✅ [PASS] Відкритих секретів не виявлено

УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

**Revise 8.a — перевірки артефактів (2026-11-03 22:39:32, повтор після правок рев'ю №1; попередні запуски 22:28:50 і 22:30:20 — до заміни команди Blocker / Critical і до додавання 2 файлів у `.agentic/qa`):**

```text
22:39:32
$ python -c "<трасування AC → TC: див. команду в 4.0>"
AC 57 без TC 0 [] TC 91
EXIT=0
$ python -c "<відкриті Blocker / Critical: див. команду в 4.0>"
BUG 9 відкритих Blocker/Critical 0 Verified 9 ['BUG-001', 'BUG-002', 'BUG-003', 'BUG-004', 'BUG-005', 'BUG-006', 'BUG-007', 'BUG-008', 'BUG-009']
EXIT=0
$ verify-gate.py --scan-secrets .agentic/qa
=== Сканування секретів: .agentic/qa ===
ℹ️  [INFO] Проскановано файлів: 40
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
$ verify-gate.py --scan-secrets .agentic/specs/08-test-plan.md
=== Сканування секретів: .agentic/specs/08-test-plan.md ===
ℹ️  [INFO] Проскановано файлів: 1
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
$ git status --short src
EXIT=0
```

**Збіг перевіреного коду з комітом етапу 7:**

```text
$ date: 2026-11-03 13:59:48
$ pnpm verify   (перед комітом етапу 7 e3fb805)
EXIT=0
 Test Files  16 passed (16)
      Tests  252 passed (252)
dist/assets/index-B4e6vtFN.js                                 343.03 kB │ gzip: 106.25 kB
✓ built in 2.46s
   105.19 kB gzip  dist\assets\index-B4e6vtFN.js
NFR-5: JS головного екрана 105.66 kB gzip (ліміт 150 kB)
```

```text
$ date: 2026-11-03 14:00
$ git rev-parse --short HEAD
e3fb805
$ git diff --stat e3fb805 -- src
(порожньо)
EXIT=0
```

**Повтор після ретесту:**

```text
$ date: 2026-11-03 06:00:02
$ python -c "<трасування AC → TC>"
AC у вимогах: 57 ; AC без TC: 0

EXIT=0
$ python -c "<відкриті Blocker / Critical>"
BUG-файлів: 9 ; відкритих Blocker/Critical: 0
EXIT=0
$ python verify-gate.py --scan-secrets .agentic/qa
=== Сканування секретів: .agentic/qa ===
ℹ️  [INFO] Проскановано файлів: 35
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
$ python verify-gate.py --scan-secrets .agentic/specs/08-test-plan.md
=== Сканування секретів: .agentic/specs/08-test-plan.md ===
ℹ️  [INFO] Проскановано файлів: 1
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

**Первинний прогін (05:09 – 05:17):**

```text
$ date: 2026-11-03 05:09:28
$ python -c "<трасування AC → TC>"
AC у вимогах: 57 ; AC без TC: 0

EXIT=0
$ python -c "<відкриті Blocker / Critical>"
BUG-файлів: 8 ; відкритих Blocker/Critical: 0
EXIT=0
$ python verify-gate.py --scan-secrets .agentic/qa

=== Сканування секретів: .agentic/qa ===
ℹ️  [INFO] Проскановано файлів: 27
✅ [PASS] Відкритих секретів не виявлено

УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
$ python verify-gate.py --scan-secrets .agentic/specs/08-test-plan.md

=== Сканування секретів: .agentic/specs/08-test-plan.md ===
ℹ️  [INFO] Проскановано файлів: 1
✅ [PASS] Відкритих секретів не виявлено

УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

Валідатор етапу — **фінальний прогін після вердикту PASS четвертого рев'ю** (база — коміт етапу 7 `e3fb805`):

```text
$ date: 2026-11-03 14:07:37
$ python verify-gate.py --stage 8.a
=== Перевірка етапу: Stage 8.a ===
ℹ️  [INFO] QA, частина A: тест-дизайн і ручне тестування — скіл qa-engineer
✅ [PASS] Передумови схвалено: 4, 7
ℹ️  [INFO] Перевірка звіту: .agentic/reports/08a-qa-manual-report.md
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 14 перевірок із кодами виходу
✅ [PASS] Карта технологій заповнена (5 рядків)
✅ [PASS] Conventional Commit у секції 7 валідний
✅ [PASS] Артефакт .agentic/specs/08-test-plan.md знайдено
✅ [PASS] Артефакт '.agentic/qa/runs/RUN-*.md': 2 файлів
=== Оракул (приймальні тести) — режим protect ===
✅ [PASS] Оракул незмінний від коміту етапу 6 (8720a047)
=== Правила якості коду: . ===
✅ [PASS] Перевірено файлів: 84, порушень-помилок немає
=== Сканування секретів: . ===
ℹ️  [INFO] Проскановано файлів: 191
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

Валідатор етапу — **первинний прогін 05:17:08, база `040a537`** (після вердикту першого рев'ю, L-004):

```text

=== Перевірка етапу: Stage 8.a ===
ℹ️  [INFO] QA, частина A: тест-дизайн і ручне тестування — скіл qa-engineer
✅ [PASS] Передумови схвалено: 4, 7
ℹ️  [INFO] Перевірка звіту: .agentic/reports/08a-qa-manual-report.md
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 10 перевірок із кодами виходу
✅ [PASS] Карта технологій заповнена (5 рядків)
✅ [PASS] Conventional Commit у секції 7 валідний
✅ [PASS] Артефакт .agentic/specs/08-test-plan.md знайдено
✅ [PASS] Артефакт '.agentic/qa/runs/RUN-*.md': 1 файлів

=== Оракул (приймальні тести) — режим protect ===
✅ [PASS] Оракул незмінний від коміту етапу 6 (8720a047)

=== Правила якості коду: . ===
✅ [PASS] Перевірено файлів: 82, порушень-помилок немає

=== Сканування секретів: . ===
ℹ️  [INFO] Проскановано файлів: 181
✅ [PASS] Відкритих секретів не виявлено

УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

Контракт API: не застосовно (`has_http_api: false`).

**Revise 8.a №2 (2026-11-04 01:43):**

```text
$ git status --short src        (01:43:13, HEAD 821453d)
(порожньо)
EXIT=0
$ python -c "<трасування AC → TC>"        (02:09:04, після останньої правки тест-плану; попередні прогони того самого проходу — той самий результат)
AC 57 без TC 0 [] TC 91
EXIT=0
$ python -c "<відкриті Blocker / Critical>"        (02:09:04)
BUG 11 відкритих Blocker/Critical 0 Verified 10 ['BUG-001', 'BUG-002', 'BUG-003', 'BUG-004', 'BUG-005', 'BUG-006', 'BUG-007', 'BUG-008', 'BUG-009', 'BUG-011']
EXIT=0
$ python verify-gate.py --scan-secrets .agentic/qa        (02:09:04, після останньої правки файлів етапу; прогін 01:43:13 — 49 файлів, до появи RUN-2026-11-04.md і qa8a-retest4-tc059-out.json)
ℹ️  [INFO] Проскановано файлів: 51
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
$ python verify-gate.py --scan-secrets .agentic/specs/08-test-plan.md
ℹ️  [INFO] Проскановано файлів: 1
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

**Revise 8.a №2 — валідатор етапу:**

```text
$ python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 8.a      (2026-11-04 02:09:05)
✅ [PASS] Передумови схвалено: 4, 7
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 33 перевірок із кодами виходу
✅ [PASS] Карта технологій заповнена (5 рядків)
✅ [PASS] Conventional Commit у секції 7 валідний
✅ [PASS] Артефакт .agentic/specs/08-test-plan.md знайдено
✅ [PASS] Артефакт '.agentic/qa/runs/RUN-*.md': 4 файлів
✅ [PASS] Оракул незмінний від коміту етапу 6 (f1ac4b57)
✅ [PASS] Перевірено файлів: 85, порушень-помилок немає
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

### 4.3. Вердикт незалежного аудиту (`independent-reviewer`)

**Рев'ю №7 (поточний вердикт Revise 8.a №2): PASS**

```text
PASS — independent-reviewer, 2026-11-04 (після 02:04:50 — mtime звіту; команду `date` хук рев'юера відхилив), Stage 8.a, Revise 8.a №2, рев'ю №7.
Закриття рев'ю №6: BLOCKER — секція 6, рядок «Борг» (первинний прогін і Revise 8.a без записів, Revise 8.a №2 — TD-026); секція 3.3 — tech-debt.md, project-lessons.md і всі 4 зміни тест-плану — закрито. WARNING — п. 3 (TD-026) і п. 4 (звіт 8.b:874) гейту, час повтору 02:04:39 — закрито. INFO — рядки BUG-002, BUG-004, BUG-009 позначено «Історія»; секція 2 — «зчитувач не виконувався»; TC-059 «E2E немає (TD-026)», TD-026 доповнено частиною (2) — закрито.
Після 02:04:39 у .agentic/qa і 08-test-plan.md нічого не змінювалось (08-test-plan.md — 02:04:39.48, та сама секунда; повтор рев'юера дав ті самі лічильники).
Межі етапу: 14 файлів (6 M + 8 ??) — усі в зоні 8.a; tech-debt.md і project-lessons.md дозволені; 7.1 і git add 7.2 збігаються з git status; файли 01–02 — лише закінчення рядків; src/ не змінено.
Секрети: --stage 8.a — 221 файл, 0; --scan-secrets .agentic/qa — 51 файл, 0; 08-test-plan.md — 1 файл, 0. Залежності: нових немає. Правила якості: 85 файлів, 0; оракул незмінний від f1ac4b57. Контракт: не застосовно.
Повторний запуск: --stage 8.a — код 1, лише «Статус аудиту». Повторено рядки 4.0 (Revise 8.a №2): «Сканер секретів» — 51 + 1, 0; «Код ретесту» — порожньо; «Трасування» (Grep) — 57 / 57, 91 TC; «Відкриті Blocker / Critical» (Grep) — 11 BUG, 0, Verified 10, BUG-010 — Fixed. Браузерні сценарії не повторено; виводи support/ звірено з 4.1 і RUN (13/13, 21/21, flow-out, tc059-out).
Уроки: L-002 — застарілих тверджень не лишилось, крім 2 WARNING: «UX §6 2.4.3» замість §4 (тест-план TC-059, звіт, TD-024) і рядок TD-024 не оновлено після виконання частини TC-059. L-003, L-004, L-005 — дотримано.
Трасування: 57/57 AC мають TC; BUG-010 — Pass у трьох рушіях, Fixed; BUG-011 — Verified; TC-059 — Pass.
INFO: запис реєстру без частини (2) TD-026; RUN:8 «Revise 8.a»; секція 5 «результати — RUN-2026-11-03»; джерело лічильника axe 40; mtime у ту саму секунду; TD-022 цитує TC-086 «49 монет» (запит №6); звіт 8.b:874 (п. 4 гейту).
Зауваження: 0 BLOCKER, 2 WARNING, 7 INFO.
```

**Після рев'ю №7 (автор, 2026-11-04 02:09):** WARNING 1 — «UX §6 2.4.3» → «UX §4 2.4.3» у звіті, тест-плані й реєстрі боргу (у закомічених звіті етапу 7 і `red-team-report.md` лишилось — п. 5 гейту); WARNING 2 — TD-024: частину TC-059 виконано, відкритий лише рядок 2.4.3 UX §4. INFO — запис у реєстрі про частину (2) TD-026; RUN — «Revise 8.a №2»; секція 5 — усі RUN; критерії виходу — джерело лічильника axe. Трасування, лічильник BUG і сканери повторено останніми.

**Рев'ю №6 (Revise 8.a №2): BLOCKERS FOUND** — виправлено:

```text
BLOCKERS FOUND — independent-reviewer, 2026-11-04 (після 02:00:22 — mtime звіту; команду `date` хук рев'юера відхилив), Stage 8.a, Revise 8.a №2, рев'ю №6.
Закриття рев'ю №5: BLOCKER «сортування з null» — на 8.b E2E не додано, модульний тест є, TD-026 у реєстрі — закрито. WARNING — ризик 429, «не перевірено — ризик прийнято 00:11, п. 3», середовища й ризики тест-плану, шапка 4.0 — закрито. INFO — BUG-001, BUG-005 – BUG-008 позначено історією.
Після 02:00:22 у .agentic/qa і 08-test-plan.md нічого не змінювалось.
Межі етапу: 14 файлів — усі в зоні 8.a, tech-debt.md і project-lessons.md дозволені; 7.1 / 7.2 збігаються; src/ не змінено.
Секрети: --stage 8.a — 221 файл, 0; --scan-secrets .agentic/qa — 51, 0; 08-test-plan.md — 1, 0. Залежності: нових немає. Правила якості: 85 файлів, 0; оракул незмінний від f1ac4b57. Контракт: не застосовно.
Повторний запуск: --stage 8.a — код 1, лише «Статус аудиту»; повторено «Сканер секретів», «Код ретесту», «Трасування», «Відкриті Blocker / Critical» (Revise 8.a №2) — збігаються.
Застарілі твердження (L-002): секція 6 «Нового запису в tech-debt.md етап не додає» — суперечить TD-026; секція 3.3 без tech-debt.md і project-lessons.md (BLOCKER). WARNING: блок гейту без пункту TD-026; 4.3 «час повтору 01:55:34» проти 02:00:22. INFO: пропозиції в рядках BUG-002, BUG-004, BUG-009 теперішнім часом; TC-059 «Авто (8.b): E2E» без E2E фокуса; секція 2 «зчитувач — чек-лист власника»; звіт 8.b:874 «ризик не прийнято» (зона 8.b, на гейт).
Зауваження: 1 BLOCKER, 2 WARNING, 5 INFO.
```

**Виправлення після рев'ю №6 (автор, 2026-11-04 02:04):** BLOCKER — секція 6, рядок «Борг»: первинний прогін і Revise 8.a — без нових записів, Revise 8.a №2 — TD-026; секція 3.3 — додано `.agentic/tech-debt.md`, `.claude/rules/project-lessons.md` і повний перелік змін тест-плану. WARNING — блок гейту: п. 3 (TD-026) і п. 4 (звіт 8.b, поза зоною); 4.3 — час повтору. INFO — рядки BUG-002, BUG-004, BUG-009: пропозиції позначено історією; секція 2 — «зчитувач не виконувався, ризик прийнято»; TC-059 «Авто (8.b)» — E2E немає, внесено в TD-026. Перевірки, що рахують файли етапу, повторено останніми (L-002).

**Рев'ю №5 (Revise 8.a №2): BLOCKERS FOUND** — виправлено:

```text
BLOCKERS FOUND — independent-reviewer, 2026-11-04 (після 01:55:34 — mtime звіту; команду `date` хук рев'юера відхилив), Stage 8.a, Revise 8.a №2, рев'ю №5.
Закриття рев'ю №4: BLOCKER — секція 6: рядок чек-листа — історія + «ризик прийнято 00:11, п. 3»; TD-023 і TD-025 закрито (`8c68680`); «фікстура не відтворює CORS» — закрито на 8.b — закрито. WARNING — історія статусів, «Ручний прогін», RUN:26, примітка тест-плану — закрито.
Після 01:55:34 у .agentic/qa і 08-test-plan.md нічого не змінювалось (найпізніші mtime 01:55:19).
Межі етапу: 13 файлів — усі в зоні 8.a; 7.1 / 7.2 збігаються; src/ не змінено.
Секрети: --stage 8.a — 221 файл, 0; --scan-secrets .agentic/qa — 51, 0; 08-test-plan.md — 1, 0. Залежності: нових немає. Правила якості: 85 файлів, 0; оракул незмінний від f1ac4b57. Контракт: не застосовно.
Повторний запуск: --stage 8.a — код 1, лише «Статус аудиту»; повторено «Сканер секретів», «Код ретесту», «Трасування» і «Відкриті Blocker / Critical» (Revise 8.a №2) — збігаються. Виводи support/ звірено з 4.1 і RUN.
Застарілі твердження (L-002), знайдені одним проходом: звіт — прогалина «сортування з null» приписана 8.b, але 8.b закрито без такого E2E (BLOCKER); ризик 429 з виконаною на 8.b реакцією досі відкритий; «перевірити на TC-087» (звіт, RUN), хоча TC-087 не виконується; тест-план — Firefox «недоступний», немає середовища WebKit / Firefox; «рекомендація для 8.b», «TC-088 (власник)»; шапка 4.0 — «01:40 – 01:44» проти 01:55:34 (WARNING). INFO: звіт 8.b:874 «ризик не прийнято» (зона 8.b); старі пропозиції в рядках Verified.
Зауваження: 1 BLOCKER, 5 WARNING, 2 INFO.
```

**Виправлення після рев'ю №5 (автор, 2026-11-04 02:00):** BLOCKER — прогалина «сортування з `null`»: на 8.b E2E не додано, зараз лише модульний тест; внесено в реєстр як TD-026, рішення — власник (TC або E2E). WARNING — ризик 429: закрито на 8.b, залишок — етап 9; «перевірити на TC-087» (звіт: NFR-6/7, `aria-busy`; RUN, спостереження TC-059) → «не перевірено — ризик прийнято 00:11, п. 3»; тест-план — середовище Revise 8.a №2 (WebKit / Firefox Playwright), «Не доступно» — справжні Safari, Edge, зчитувач; ризики тест-плану (`route.abort` — виконано на 8.b, TC-088 — ризик прийнято); шапка 4.0 — час повтору (на момент виправлення — 01:55:34; після рев'ю №5 повторено о 02:00:22). INFO — рядки BUG-001, BUG-005 – BUG-008: пропозиції позначено історією. INFO 7 (звіт 8.b:874 «ризик не прийнято») — зона 8.b, на гейт.

**Рев'ю №4 (Revise 8.a №2): BLOCKERS FOUND** — виправлено:

```text
BLOCKERS FOUND — independent-reviewer, 2026-11-04 (після 01:51:41 — mtime звіту; команду `date` хук рев'юера відхилив), Stage 8.a, Revise 8.a №2, рев'ю №4.
Закриття рев'ю №3: (1) сканер — 51 + 1 файл, 0, код 0; найпізніший файл у .agentic/qa — 01:51:18.8 < 01:51:28 — закрито. (2) секції 1–2 — ризик прийнято 00:11, п. 3; 11 BUG, Verified 10; історія статусів — закрито. (3)–(7), (11) — закрито.
Межі етапу: 13 файлів — усі в зоні 8.a; 7.1 / 7.2 збігаються; src/ та інші зони не змінено між 8c68680 і HEAD. Файли 01–02 — лише закінчення рядків.
Секрети: --stage 8.a — 221 файл, 0; --scan-secrets .agentic/qa — 51, 0; 08-test-plan.md — 1, 0. Залежності: нових немає. Правила якості: 85 файлів, 0; оракул незмінний від f1ac4b57. Контракт: не застосовно.
Повторний запуск: --stage 8.a — код 1, лише «Статус аудиту»; повторено «Сканер секретів (Revise 8.a №2)», «Код ретесту = коміт етапу 7», трасування і відкриті Blocker / Critical (еквівалент Grep) — збігаються. Браузерні сценарії не повторено (preview зупинено); виводи support/ звірено поле в поле.
Порушення (L-002 / L-003): секція 6 — рядок «Чек-лист (відкладено) … ризик не прийнято — підтвердити на гейті» суперечить «Ризик → прийнятий» і запису 00:11, п. 3; «залишок TD-023 … відкритий», хоча TD-023 закрито (BLOCKER). WARNING: рядок 4.0 «Ручний прогін» без Revise 8.a №2; IN_PROGRESS 01:51 у звіті проти 01:45 у трекері; RUN:14 «відкладено власником».
Зауваження: 1 BLOCKER, 3 WARNING, 2 INFO.
```

**Виправлення після рев'ю №4 (автор, 2026-11-04 01:55):** BLOCKER — секція 6: рядок чек-листа позначено історією Revise 8.a з посиланням на рішення 00:11, п. 3; «залишок TD-023 … відкритий» → TD-023 і TD-025 закрито (`8c68680`); заодно рядок «Ризик: фікстура не відтворює CORS» — закрито на 8.b (L-008). Перегляд `rg "не прийнято|відкритий, на рішення|відкладено"` по звіту, RUN і тест-плану: решта згадок — у розділах і записах, підписаних проходом (3.2, 4.3 рев'ю №2, критерії Revise 8.a, коментарі гейту 22:43). WARNING — історія статусів (ретест з 01:40:39, запис 01:45, матриця 01:51); рядок 4.0 «Ручний прогін» — Revise 8.a №2 і RUN-2026-11-04; RUN — «ризик прийнято власником 00:11, п. 3»; тест-план — примітка TC-087 – TC-090 оновлена.

**Рев'ю №3 (Revise 8.a №2): BLOCKERS FOUND** — виправлено:

```text
BLOCKERS FOUND — independent-reviewer, 2026-11-04 (після 01:45:15 — mtime звіту й трекера; команду `date` хук рев'юера відхилив), Stage 8.a, Revise 8.a №2.
Межі етапу: 12 файлів (M 08-test-plan.md — лише рядок TC-059; M BUG-010.md; M звіт; M pipeline-state.md; ?? RUN-2026-11-04.md і 7 файлів support/qa8a-retest4*) — усі в зоні 8.a; src/ і e2e/ не змінено; між 8c68680 і HEAD 821453d src/ не змінювався. 7.1 / 7.2 збігаються з фактичним списком, git add явний, тип test.
Секрети: verify-gate.py --stage 8.a — 221 файл, 0; --scan-secrets .agentic/qa — 51 файл, 0 (у звіті 49 — прогін до появи 2 файлів етапу, BLOCKER); --scan-secrets 08-test-plan.md — 1 файл, 0.
Залежності: не застосовно. Правила якості: --stage 8.a — 85 файлів, 0 помилок; оракул незмінний від f1ac4b57. Контракт: не застосовно.
Повторний запуск: --stage 8.a — код 1, єдина помилка «Статус аудиту»; трасування — повтор через Grep: 57 AC, усі 57 у матриці, 91 TC; BUG — 11 файлів, Blocker/Critical 0, Verified 10 (BUG-010 — Fixed). Браузерні сценарії не повторено (preview зупинено); виводи support/ звірено з 4.1 і RUN поле в поле (13/13, 21/21, flow-out, tc059-out). qa8a-retest4-logo.mjs побайтово ідентичний logo-focus-check.mjs.
TC-059 крок 2 («артефакт сценарію»): механізм підтверджено кодом FocusOnNavigate.jsx:40-41, :23; подано чесно (варіант «прокрутка без паузи» проба не міряла — «той самий кадр» є висновком).
L-003: ризик TC-087 – TC-090 «прийнято» — запис власника 2026-11-04 00:11, п. 3. L-005: «≈» і часу з майбутнього немає; час команди власника «Так, Revise 8.a» не записано (WARNING).
Блокери: сканер секретів — застарілий лічильник і немає EXIT= (L-004); секції 1–2 — «9 BUG» і «Чекає власника» суперечать 11 BUG і прийнятому ризику (L-002).
WARNING: 4.3 — старий заголовок «поточний вердикт»; старі рядки «(Revise 8.a)» без коміту; час команди власника; абсолютні шляхи в tc059 і logo-сценаріях; плейсхолдер <каталог знімків>. INFO: TC-059 «Авто (8.b): E2E» — у e2e/ перевірки фокуса після переходу немає (модульні тести є); 08-test-plan.md — CRLF у робочій копії; статус 8.a у трекері.
```

**Виправлення після рев'ю №3 (автор, 2026-11-04 01:51):** BLOCKER 1 — сканери секретів перезапущено після останньої правки файлів етапу, вивід з часом і `EXIT=` — 4.2, лічильник у 4.0 оновлено. BLOCKER 2 — секція 1 (рядок «Safari, Firefox, Edge, зчитувач», абзац передумов Revise 8.a №2), секція 2 (11 BUG), історія статусів 8.a. WARNING — заголовок попереднього вердикту в 4.3; старі рядки «(Revise 8.a)» — код `8f0f2a5` / звіт `8755fb3`; час команди власника — «між 01:31 і 01:40:39» (шапка, трекер); абсолютні шляхи сценаріїв — позначено в RUN; плейсхолдер каталогу знімків. Трекер — статус `IN_PROGRESS`.


**Revise 8.a, рев'ю №2 (попередній прохід, коміт `8755fb3`):**
```text
Рев'ю Revise 8.a №2 (після виправлень рев'ю №1): PASS — independent-reviewer, 2026-11-03 (після 22:36:37 — mtime звіту й трекера; команду `date` хук рев'юера відхилив, час узято з git log і mtime), Stage 8.a.
Закриття рев'ю №1: BLOCKER (TC-068 без підказок і без #/coin/tether, TC-059 без кроків 3–4, пристрій) — закрито. qa8a-retest.mjs не змінено відносно HEAD, його вивід qa8a-retest3-flow-out.json (mtime 22:35:06) збігається з 4.1 «потоки» поле в поле: firstLoadFocus BODY; Bitcoin, «Топ-50 монет» ×2, «Обрані», «Монета зараз поза топ-50» (#/coin/kaspa); TC-058 cap 50 / «sol» 1 / price 25; Pixel 7 320×640 — 0 на #/, #/coin/bitcoin, #/coin/tether, #/favorites, #/abc. Сценарій відкриває кожну «Що означає …?» (ім'я збігається з src/ui/TermHintButton.jsx:80). У RUN-3 пристрій logo-скрипта — iPhone SE, як у коді. WARNING рев'ю №1 закрито: TC-086 — варіант Б (діф тест-плану, очікування посилено: 50 монет замість 49); сортування з null — секція 6, тест «BUG-003: монета без зміни (null)…» є в src/lib/lib.test.js:122; «місце 41» уточнено «ретест — місце 4» (M[3]); копія сценарію ідентична оригіналу (`git diff --no-index` порожній); старі рядки 4.0 позначено e3fb805 / 040a537; секція 1 — 8f0f2a5; трекер — «Поточний активний етап» і запис 22:36. INFO закрито: хвости BUG-003 / BUG-009, фільтр консолі в RUN-3.
BUG-007-retest-chart-labels-320px.png: `git diff --stat HEAD` порожній, у `git status` файла немає, mtime 22:36:07 — відновлено.
Межі етапу: 15 файлів 7.1 = git add 7.2 = фактичний git status без чужих змін. Чужі зміни: project.json (holdouts_command), 01–02 — лише закінчення рядків, у diff --stat їх немає; .claude/skills/verify/. `git diff --stat HEAD -- src acceptance a11y contract package.json pnpm-lock.yaml index.html vite.config.js public scripts` порожній. `git status` до і після аудиту однаковий.
Секрети: --scan-secrets .agentic/qa — 40 файлів, 0 (у звіті 38 на 22:30:20, до додавання 2 файлів); --scan-secrets . у складі --stage — 198 файлів, 0; Grep за password|secret|token|api_key|authorization:|cookie: у .agentic/qa/runs — 0.
Залежності: нових немає. Правила якості: --stage 8.a — 85 файлів, 0 помилок; оракул незмінний від f1ac4b57. Контракт: не застосовно — has_http_api: false (ADR 0001).
Повторний запуск: verify-gate.py --stage 8.a — код 1, єдина помилка — статус аудиту; «Валюта довіри» 23 перевірки, RUN-* 3 файли. Повторено з рядків 4.0: «Трасування» (еквівалент Grep) — 57 AC у матриці тест-плану, 57 тегів AC у 02-requirements, 91 рядок TC; «Відкриті Blocker / Critical» (Grep) — 9 Verified, Severity Blocker/Critical 0; «Сканер секретів» — 40 + перевірка всього дерева, 0; «Код ретесту = коміт етапу 7» — diff src порожній. Не перевірено повторно (хук read-only, потрібен vite preview, сценарій пише у файл під Git): node qa8a*.mjs, logo-focus-check.mjs, pnpm build; їхні виводи звірено з JSON у support/ — 4.1 збігається з qa8a-retest3-errors-out.json, qa8a-retest3-logo-out.json, qa8a-retest3-flow-out.json і з RUN-3.
Узгодженість (L-002): TC-062 і TC-061 відповідають UX §3 E-SRC (04-ux-and-contract.md:127, запит №5); очікувань не послаблено. Невідповідності: секція 3.2 і рядок «Ручний прогін» без TC-058 / RUN-3 (WARNING); рядки 4.0 від 22:30:20 раніші за правки 22:35 (WARNING).
Трасування: 57/57 AC мають TC; TC-086 → BUG-003 Verified, TC-078 → BUG-009 Verified (8f0f2a5); TC-087 – TC-090 відкладено власником 14:18, ризик не прийнято (L-003).
Зауваження: 0 BLOCKER, 2 WARNING (повторити трасування, лічильник BUG і сканер після правок 22:35 — сканер 40 + 1; додати TC-058 / RUN-3 у секцію 3.2 і рядок «Ручний прогін»), 5 INFO (кількість відкритих підказок не логується — для 8.b; qa8a-retest.mjs пише в закомічений PNG — у 8.b не використовувати без правки шляху; фільтр ERR_FAILED; pnpm build без блоку виводу; date відхилено хуком).
Після вердикту (автор, 2026-11-03 22:39 – 22:40): трасування, лічильник BUG і сканер повторено о 22:39:32 (57/57 AC, 91 TC; 9 Verified, 0 Blocker/Critical; сканер 40 + 1, 0) — блок 4.2 і рядки 4.0 оновлено; TC-058 і RUN-2026-11-03-3 додано в 3.2 і рядок «Ручний прогін».
```

**Рев'ю Revise 8.a №1 (після Revise №5 етапу 7, BLOCKERS FOUND):**
```text
Рев'ю Revise 8.a (після Revise №5 етапу 7): BLOCKERS FOUND — independent-reviewer, 2026-11-03 (після 22:30:20 — найпізнішої позначки звіту; команду `date` хук рев'юера відхилив), Stage 8.a.
Межі етапу: 13 файлів етапу — збігаються із 7.1 і git add 7.2; HEAD 8f0f2a5; `git status --short src` порожній; чужі зміни (project.json, 01–02, .claude/skills/verify/) у git add не входять; dist ігнорується.
Секрети: --scan-secrets .agentic/qa — 38 файлів, 0; 08-test-plan.md — 1, 0; --scan-secrets . (у складі --stage) — 196, 0. Залежності: нових немає. Правила якості: 85 файлів, 0; оракул незмінний від f1ac4b57. Контракт: не застосовно.
Повторний запуск: --stage 8.a — код 1, лише статус аудиту; трасування (Grep) 57/57 AC, 91 TC; BUG 9 Verified, Blocker/Critical 0; client.js не змінено з e3fb805 — підстава не повторювати TC-061 підтверджена. 4.1 збігається з JSON у support/; TC-062 відповідає UX §3 (a6719e0) і NFR-3 (9417669), очікування не послаблено.
BLOCKER: RUN-3 позначає TC-068 Pass без кроку 2 (жодна підказка не відкрита) і без #/coin/tether, TC-059 — Pass без кроків 3–4; пристрій записано як Pixel 7, а сценарій — iPhone SE.
WARNING: TC-086 у тест-плані не оновлено під варіант Б; немає TC на сортування з null (byChange); передумова «місце 41» проти M[3]. logo-focus-check.mjs, на якому тримається Verified, не комітиться. Старі рядки 4.0 з кодом 0 без коміту, на якому отримано (L-004). Застаріле: секція 1 без 8f0f2a5, ланцюжок статусів 8.a до 14:01, трекер «Поточний активний етап: Stage 8.b».
INFO: хвіст «Verified — після коміту Revise №5 із хешем» у BUG-003 / BUG-009; фільтр «ERR_FAILED» у сценарії; pnpm build 22:26 без блоку виводу (хеш збігається зі звітом етапу 7).
Після вердикту (автор, 2026-11-03 22:34 – 22:36): повтор `qa8a-retest.mjs` на 8f0f2a5 (22:34:48 – 22:34:57, EXIT=0): TC-059 кроки 1–4, TC-068 з кожною підказкою і #/coin/tether (Pixel 7, 320×640), TC-058 — Pass; RUN-3, 4.0, 4.1 (блок «потоки»), секція 5 оновлено; пристрій — iPhone SE для logo-скрипта; TC-086 — очікування варіанта Б; сортування з null — секція 6 (модульний тест lib.test.js, E2E — 8.b); копія сценарію — support/qa8a-retest3-logo.mjs (SHA-256 однаковий); старі рядки 4.0 — коміт e3fb805; секція 1, ланцюжок статусів, трекер; хвости BUG; фільтр консолі — RUN-3. Побічний ефект повтору: qa8a-retest.mjs перезаписав закомічений BUG-007-retest-chart-labels-320px.png — відновлено `git restore` (22:36), у коміт не йде.
```


```text
PASS — independent-reviewer, 2026-11-03 (після 05:11; команду `date` хук рев'юера відхилив, час — не перевірено повторно), Stage 8.a.
Межі етапу: 37 нових файлів етапу (08-test-plan.md, 11 SES, RUN-2026-11-03.md, 7 файлів support/, 8 BUG, 1 jpg, звіт) + .agentic/pipeline-state.md. Diff трекера стосується лише 8.a: поточний етап, «Останнє оновлення» 04:59, рядок матриці 8.a PENDING → IN_PROGRESS, запис 04:59. `git diff --stat HEAD -- src acceptance a11y contract package.json pnpm-lock.yaml` порожній. Оракул не змінювався від коміту етапу 6 8720a047 (--stage 8.a). Чужі зміни (project.json: holdouts_command; 01–03; .claude/skills/) у git add секції 7.2 не входять. dist, test-results, playwright-report, node_modules ігноруються (git check-ignore). `git status` до і після аудиту однаковий.
Секрети: --scan-secrets . — 181 файл, 0 знахідок; --scan-secrets .agentic/qa — 27 файлів, 0; --scan-secrets .agentic/specs/08-test-plan.md — 1 файл, 0. Grep за password|secret|token|api_key|authorization:|cookie: у .agentic/qa, тест-плані й звіті — 0 збігів. Облікових даних немає (входу немає, ADR 0002).
Залежності: нових пакетів немає (package.json і pnpm-lock.yaml без змін). Node v24.21.0 і pnpm 11.23.0 збігаються із секцією 1.
Правила якості: --stage 8.a — 82 файли, 0 помилок. Продуктовий код не змінювався. Перевірок не послаблено: оракул, a11y/, правила лінтера й пороги не змінювались.
Контракт: не застосовно — has_http_api: false (ADR 0001), власного HTTP API немає.
Повторний запуск:
- verify-gate.py --stage 8.a — код 1; рівно 2 очікувані помилки (статус аудиту, колонка «Повторив рев'юер»), решта PASS;
- --scan-secrets .agentic/qa і --scan-secrets .agentic/specs/08-test-plan.md — код 0, збігається з 4.2;
- трасування AC → TC і лічильник Blocker/Critical: команди python -c з 4.0 хук відхилив (заборонено «;»). Повторено еквівалентом через Grep: 57 унікальних AC у 02-requirements, кожен є в матриці §8 тест-плану, 0 без TC; 8 BUG-файлів, Severity: Major 3, Minor 4, Trivial 1, Blocker/Critical 0 — збігається з 4.2;
- pnpm build хук відхилив — не перевірено повторно.
Чесність прогону: RUN-2026-11-03 — 90 TC: Pass 76, Fail 9, Not run 5. За пріоритетами Must 73 (65/6/2), Should 15 (10/2/3), Could 2 (1/1/0) — звірено з каталогом тест-плану й таблицею RUN. qa8a-out.json — 12 ключів, 0 ERROR; qa8a-gaps-out.json — 9 ключів, 0 ERROR. BUG-001 підтверджено кодом src/market-data/client.js: :90 (будь-який виняток fetch → NetworkError), :40–41 ('net' без перевірки navigator.onLine), :46 (NetworkError повторюється), RETRY_DELAYS_MS [2000, 4000] — це узгоджується з поміткою запитів «старт 21 / 2054 / 6071 мс». UX §3 E-NET вимагає navigator.onLine === false. Причини BUG-003 (parse.js finite → ShapeError), BUG-005 (focus лише в NotFoundPage, після повтору й прибирання), BUG-006 (store.js write без запасу в пам'яті) і BUG-007 (немає підписів дат) теж збігаються з кодом. Severity і Priority задано незалежно (BUG-001 Major/P1, BUG-004 Minor/P2). Етап-власник у всіх BUG — 7, для BUG-003 і BUG-004 вказано можливий запит до етапів 3 і 2.
Трасування: 57/57 AC мають TC. AC-10.2 (TC-076) — Not run з причиною (US-10 у спринті 2, рішення власника 2026-11-02 23:10). Must TC, які може виконати агент, виконано: 71 з 73 (TC-087 і TC-088 у чек-листі власника). Критерії виходу чекають рішення власника щодо 3 відкритих Major — так і записано в секції 6.
Уроки: L-001 — лічильник замість grep -L; L-003 — жодного «прийнятого» ризику без запису в трекері; L-004 — рядки «Валідатор етапу» і «Вердикт рев'юера» позначено «не запускалось» (WARNING: у busy/name/extra немає часу); L-007 — 320 px перевіряли в мобільній емуляції (TC-068).
Зауваження: 2 WARNING (час для рядка «доповнення» за L-004; план етапу не схвалювали окремо — підтвердити на гейті), 4 INFO.
```

Що зроблено із зауваженнями (після рев'ю, 05:16): WARNING 1 — у 4.1 дописано час запусків `qa8a-extra.mjs` (04:57:12), `busy.mjs` (05:02:06), `name.mjs` (05:06:00) за часом зміни файлів сценаріїв (mtime, L-005) і коміт `040a537`; WARNING 2 — окремий пункт у блоці гейту й секції 6 (підтвердження плану й вибору секції 2); INFO 3 — абсолютний імпорт Playwright лишено (одноразовий доказ, для 8.b — відносний імпорт); INFO 4 — згадку про «3 скриншоти» уточнено (збережено 1), у BUG-007 позначено, що скриншот не збережено; INFO 5 — різні проміжки часу означають різні обсяги (живий браузер 04:48–04:53, увесь прогін 04:48–05:06), шапку звіту оновлено; INFO 6 — чужі зміни в коміт не йдуть.

```text
Повторне рев'ю ретесту (після 05:50): BLOCKERS FOUND — independent-reviewer, Stage 8.a.
  Межі: 38 файлів етапу + трекер; acceptance, a11y, contract, package.json, lockfile без змін; сценарії QA пишуть лише в .agentic/qa/evidence. Секрети: .agentic/qa — 32 файли, 0; . — 188, 0. Правила якості: 84 файли, 0.
  Повтор: --stage 8.a — код 1 (статус аудиту; передумова Stage 7 REJECTED_REVISING); трасування 57/57; 8 BUG, Blocker/Critical 0.
  BLOCKER 1: передумова — етап 7 у Revise №4, не схвалений і не закомічений; Verified спирається на незакомічене дерево.
  BLOCKER 2 (L-004): рядки 4.0 «Вердикт рев'юера», «Сканер секретів», «Збірка», «Трасування», «Відкриті Blocker / Critical» з кодом 0 з першого проходу без позначки.
  WARNING: лічильник «11 TC з BUG — Pass 10» (насправді 10: 9 / 1 + регресія TC-068); офлайн-гілка E-NET без TC; TC-078 слабший за UX §8 (логотип без запасного кружка); трекер без запису про ретест (L-005).
  INFO: походження JSON ретесту; рядок NFR-6 «крім BUG-005»; NFR-5 105.66 проти gzip Vite 106.25 kB (різні вимірювачі: pnpm size рахує JS головного екрана).
```

Що зроблено (05:56 – 06:01): BLOCKER 1 — гейт 8.a відкладено: спершу гейт і коміт Revise №4 етапу 7 (рев'ю етапу 7 — PASS, `--stage 7 --run` 05:59 — код 0), потім хеш коміту в секцію 1, RUN-2026-11-03-2 і BUG, нове рев'ю й `--stage 8.a`; секція 1 і блок гейту це кажуть. BLOCKER 2 — сканер, трасування й лічильник BUG повторено о 06:00:02 (вивід — 4.2), «Вердикт рев'юера» — «не запускалось», рядки первинного прогону позначено «первинний прогін 05:09, база `040a537`, до Revise №4». WARNING — лічильник виправлено (10 TC: 9 / 1); додано TC-091 (офлайн, Pass, 05:56:46); TC-078 приведено до UX §8 → Fail → новий BUG-009 (Minor / P3, етап 7); у трекер додано запис про ретест (06:01). INFO — походження JSON записано в RUN-2026-11-03-2 і 4.1; рядок NFR-6 оновлено.

```text
Третє рев'ю (після коміту e3fb805, 14:00:45): BLOCKERS FOUND — independent-reviewer, Stage 8.a.
  Повтор: --stage 8.a — код 1, лише 2 очікувані помилки, передумови 4, 7 — PASS; сканер 35 + 1 файл, 0; трасування 57/57 (Grep); 9 BUG, Blocker/Critical 0; git diff --stat e3fb805 -- src порожній.
  BLOCKER: RUN-2026-11-03-2 — діапазон регресії «TC-077 – TC-079 Pass» охоплює TC-078, який у тому самому журналі Fail (BUG-009); звіт — старі лічильники «90 TC», «8 BUG / 8 дефектів», «71 з 73» Must (L-002).
  WARNING: середовище BUG-009, інтервал часу RUN-2, шапка звіту, ланцюжок статусів секції 3, абзаци 7.1 і гейту про вже виконаний план (L-002 / L-005); блок валідатора 05:17 у 4.2 без часу й бази (L-004).
  INFO: хеш бандла index-B4e6vtFN.js як доказ коду ретесту; рядок git diff у 4.0; колонка «Коміт» етапу 7 у трекері; рядок UX §8 у секції 5.
```

Що зроблено (14:05): RUN-2 — регресія «TC-077, TC-079», інтервал часу доповнено 05:56:19 – 05:57:02; звіт — 91 TC (Must 74), 9 BUG, «72 з 74», шапка з часом правок, ланцюжок статусів до WAITING_FOR_APPROVAL, секція 2 — план підтверджено власником (05:30), абзац 7.1 і гейту — передумову виконано (e3fb805), блок валідатора 05:17 підписано «первинний прогін 05:17:08, база 040a537», у секції 1 — хеш бандла index-B4e6vtFN.js (05:34:45, 05:51:58, 13:59:48), у секції 5 — рядок UX §8 → TC-078 → BUG-009, у 4.0 — рядок git diff; BUG-009 — середовище e3fb805; трекер — колонка «Коміт» етапу 7 з e3fb805.

```text
PASS — independent-reviewer, 2026-11-03 (після 14:05 — часу правок за третім рев'ю; команду `date` хук рев'юера відхилив, точний час не перевірено повторно), Stage 8.a, четверте рев'ю (після виправлень третього).
Межі етапу: 42 файли етапу (08-test-plan.md, звіт; у .agentic/qa/ — 11 SES, 2 RUN, 14 файлів support/, 9 BUG, 4 зображення) + .agentic/pipeline-state.md. Diff трекера стосується лише 8.a і коміту етапу 7. HEAD e3fb805 (2026-11-03 14:00:45); `git diff --stat e3fb805 -- src` порожній; `git diff --stat HEAD -- src acceptance a11y contract package.json pnpm-lock.yaml index.html vite.config.js public scripts` порожній. Оракул незмінний від 8720a047 (--stage 8.a). Чужі зміни (project.json, 01–03, .claude/skills/) у git add 7.2 не входять. `git status` до і після аудиту однаковий.
Секрети: --scan-secrets .agentic/qa — 35 файлів, 0, код 0; --scan-secrets .agentic/specs/08-test-plan.md — 1 файл, 0, код 0; --scan-secrets . (у складі --stage) — 191 файл, 0. Grep за password|secret|token|api_key|authorization:|cookie: у .agentic/qa — 0 збігів.
Залежності: нових пакетів немає. Правила якості: --stage 8.a — 84 файли, 0 помилок. Контракт: не застосовно — has_http_api: false (ADR 0001).
Повторний запуск: verify-gate.py --stage 8.a — код 1, рівно 1 очікувана помилка (статус аудиту), передумови 4, 7 — PASS, «Валюта довіри» — 14 перевірок, RUN-* — 2 файли; «Код ретесту = коміт етапу 7» — порожньо; «Сканер секретів» — 35 + 1 файл, 0; «Трасування AC → TC» (еквівалент Grep) — 57/57, 0 без TC; «Відкриті Blocker / Critical» (еквівалент Grep) — 9 BUG, 0 (Major 3, Minor 5, Trivial 1). Не перевірено повторно (хук read-only / потрібен vite preview): pnpm build / verify, сценарії qa8a*.mjs, busy.mjs, name.mjs, qa8a-retest.mjs, qa8a-offline-logo.mjs, pnpm test:a11y; виводи звірено з файлами.
Лічильники: 91 TC, Must 74 / Should 15 / Could 2; критерії виходу — 72 з 74 Must; RUN-2: TC-078 — лише Fail (BUG-009), регресія — TC-077, TC-079; 10 TC з BUG — Pass 9, Fail 1; TC-091 Pass.
Чесність: BUG-001, 002, 004–008 — Verified з доказом і хешем e3fb805; BUG-003 — Confirmed; BUG-009 — New. Severity ≠ Priority: Major/P1 (001), Major/P2 (002, 003), Minor/P2 (004), Minor/P3 (005–007, 009), Trivial/P3 (008).
Трасування: 57/57 AC мають TC; AC-10.2 (TC-076) — Not run з причиною (спринт 2); UX §8 → TC-078 → BUG-009 — у секції 5.
Уроки: L-001, L-002, L-003 дотримано; L-004 — блок валідатора 05:17:08 підписано базою 040a537; L-005 — найпізніша позначка (14:05) не раніша за коміт 14:00:45.
Зауваження: 0 BLOCKER, 2 WARNING (pnpm verify 13:59:48 без виводу; «Останнє оновлення» трекера 14:01 при правці 14:05), 2 INFO.
```

Що зроблено після четвертого рев'ю: у 4.2 вставлено вивід `pnpm verify` 13:59:48 (EXIT=0, 252 passed, `index-B4e6vtFN.js`); «Останнє оновлення» трекера оновлено разом із переведенням 8.a у WAITING_FOR_APPROVAL; у 4.0 «Повторив рев'юер: так» для сканера, трасування й лічильника BUG.

## 5. Матриця трасування вимог (Requirements Traceability)

Повна матриця AC → TC — розділ 8 тест-плану; результати — RUN-2026-11-03, ретести — RUN-2026-11-03-2, RUN-2026-11-03-3, RUN-2026-11-04.

| ID вимоги | Вимога | Де реалізовано | Чим перевірено | Статус |
| :--- | :--- | :--- | :--- | :--- |
| AC-1.1 – AC-1.5 | Список топ-50, «Показати більше», межа 50, знак зміни | `src/features/coin-list/`, `src/lib/format.js` | TC-001 – TC-005, SES-01 | ✅ Pass |
| AC-2.1 – AC-2.3, AC-2.5 – AC-2.8 | Сортування | `src/lib/sort.js`, `src/features/coin-list/` | TC-006 – TC-008, TC-010 – TC-013, SES-02 | ✅ Pass |
| AC-2.4 | Рівні значення — за місцем | `src/lib/sort.js` | TC-009 | ✅ Pass після Revise №4 (BUG-004 Verified) |
| AC-3.1 – AC-3.9 | Пошук | `src/features/coin-list/ListToolbar.jsx`, `src/lib/` | TC-014 – TC-022, SES-03 | ✅ Pass |
| AC-4.1 | Дані й графік за 7 днів | `src/features/coin-page/`, `src/chart/PriceChart7d.jsx` | TC-023 | ✅ Pass після Revise №4 (BUG-007 Verified) |
| UX §8 | Логотип не завантажився → кружок з першою літерою | `src/features/coin-page/CoinHeader.jsx`, `src/features/coin-list/CoinParts.jsx` | TC-078 | ✅ Pass після Revise №5 етапу 7 (BUG-009 Verified, RUN-2026-11-03-3; спільний `src/ui/CoinLogo.jsx`) |
| AC-4.2 – AC-4.4 | Без інших періодів, межа топ-50, з пошуку | `src/features/coin-page/` | TC-024 – TC-026, SES-04 | ✅ Pass |
| AC-5.1 – AC-5.7 | Обрані: додати, прибрати, межі | `src/favorites/`, `FavoriteToggle` | TC-027 – TC-033, SES-05 | ✅ Pass (BUG-008 Verified) |
| AC-6.1 – AC-6.7 | Обрані між візитами | `src/features/favorites-view/`, `src/favorites/` | TC-034 – TC-040, SES-06 | ✅ Pass |
| AC-7.1 – AC-7.4 | Підказки | `src/glossary/`, `src/ui/TermHintButton.jsx` | TC-041 – TC-046, SES-07 | ✅ Pass |
| AC-8.1 – AC-8.8 | Недоступні й застарілі дані | `src/market-data/`, `src/ui/ErrorBlock.jsx` | TC-047 – TC-054, SES-08 | ✅ Pass; живий 429 без CORS — TC-061 Pass після Revise №4 (BUG-001 Verified); BUG-010 (WebKit) — ретест Pass на `8c68680` (RUN-2026-11-04) |
| AC-9.1 – AC-9.3 | Дисклеймер, джерело, мова | `src/app/Layout.jsx` | TC-055 – TC-057, SES-09 | ✅ Pass |
| AC-10.1 | Тема як на пристрої | `public/theme-init.js` | TC-075 | ✅ Pass (US-10 — Should, спринт 2) |
| AC-10.2 | Перемикання теми | — (спринт 2) | TC-076 | Not run — поза спринтом 1 |
| UX §1 | Стан списку в межах вкладки | `src/features/coin-list/` | TC-058, SES-04, SES-10 | ✅ Pass після Revise №4 (BUG-002 Verified) |
| UX §4 2.4.3; рішення власника 2026-11-04 00:11, п. 5 | Фокус на h1 після зміни маршруту; після повернення до списку — на посиланні монети, якщо воно на екрані | `src/app/FocusOnNavigate.jsx` | TC-059 | ✅ Pass на `8c68680` (RUN-2026-11-04; крок 2 за новим очікуванням); UX §4 2.4.3 — запит на зміну №6 (TD-024) |
| UX §3 E-STORE | ★ у пам'яті вкладки | `src/favorites/store.js` | TC-083, TC-084 | ✅ Pass після Revise №4 (BUG-006 Verified) |
| NFR-1 | Свіжість ≤ 5 хв | `src/market-data/` | TC-050, TC-051 | ✅ Pass |
| NFR-1 / US-8 / ADR 0005 | Неповна монета не кладе весь знімок | `src/market-data/parse.js` | TC-086 | ✅ Pass після Revise №5 етапу 7 (BUG-003 Verified, варіант Б: `null` → «—», RUN-2026-11-03-3) |
| NFR-3 | Ліміт запитів, 429 без повторів | `src/market-data/client.js` | TC-061 – TC-063, TC-091 | ✅ Pass після Revise №4 (BUG-001 Verified; офлайн-гілка — TC-091); TC-062 повторено на `8f0f2a5` за UX §3 після запиту №5 — Pass |
| NFR-6, NFR-7 | WCAG 2.2 AA, 320 px | весь UI | TC-065 – TC-074, TC-082, `pnpm test:a11y` 40/40, SES-11 | ✅ Pass (BUG-005 Verified після Revise №4); зчитувач (TC-087) не перевірено — ризик прийнято власником 2026-11-04 00:11, п. 3 |
| NFR-8, NFR-10, NFR-13, NFR-16 | CSP, приватність, консоль, атрибуція | `index.html` (збірка), `Layout.jsx` | TC-055, TC-064, TC-080, TC-081 | ✅ Pass |
| NFR-14 | Браузери | — | TC-088, TC-089; рушії — RUN-2026-11-04 (Chromium, WebKit, Firefox) | ⏳ Справжні Safari iOS / Edge не виконувались — ризик прийнято власником 2026-11-04 00:11, п. 3; рушії — Pass (BUG-010, BUG-011) |

## 6. Ризики, технічний борг і відкриті питання

**Критерії виходу, Revise 8.a №2 (`8c68680`):** Blocker / Critical — 0 ✅; Verified 10 з 11 BUG (BUG-010 — Fixed до перевірки на справжньому Safari) ✅; трасування 57 з 57 AC ✅; axe — `pnpm test:a11y` 40 passed (`verify-gate.py --debt` 2026-11-04 00:51 – 00:52 і окремий прогін 00:52:34 – 00:53:20, `.agentic/evidence/debt-checks.md`; у `--stage 7 --run` 00:58 – 00:59 — «Команда успішна», без лічильника) ✅; чек-лист TC-087 – TC-090 — ризик прийнято власником 2026-11-04 00:11, п. 3.

**Критерії виходу (тест-план, розділ 4), Revise 8.a:** Blocker / Critical — 0 ✅; axe 0 critical / serious ✅ (`pnpm test:a11y` у `--stage 7 --run` 22:21 – 22:23); усі 9 BUG — `Verified` ✅; 100 % Must TC, які може виконати агент, — виконано (72 з 74) ⚠️: TC-087, TC-088 (чек-лист власника) **відкладено рішенням власника 2026-11-03 14:18** — не виконано й не пройдено, ризик не прийнято (L-003). Критерій виходу «100 % Must» не виконано лише через ці два TC; рішення — на гейті 8.a.

| Тип | Опис | Вплив | Що пропонується | Власник рішення |
| :--- | :--- | :--- | :--- | :--- |
| Дефект → Fixed (Revise №6 етапу 7, ретест RUN-2026-11-04) | **BUG-010** (Major / P1): WebKit повторно віддавав відповідь preload — preload прибрано (`8c68680`); ретест у Chromium, WebKit, Firefox — Pass. Справжній Safari (iOS / macOS) не перевірено | Середній | `Verified` після TC-088 на iPhone (власник) або рішення власника прийняти перевірку у WebKit Playwright | Власник продукту |
| Дефект → Verified (8.b `821453d`, ретест RUN-2026-11-04) | **BUG-011** (Minor / P3): текст поради Safari — дослівно UX §5.2 у WebKit | — | — | — |
| Ризик → прийнятий | Чек-лист TC-087 – TC-090 (зчитувач, Safari iOS, Edge, зрозумілість підказок) не виконувався — ризик прийнято власником 2026-11-04 00:11, п. 3 (трекер, розділ 4) | Середній | — | Власник продукту (вирішено) |
| Спостереження | TC-059 крок 2: якщо посилання активовано без прокрутки до нього (віртуальний курсор зчитувача, прямий клік Playwright у тому самому кадрі), список повертається на стару позицію, і фокус — на h1 (свідомий запасний варіант TD-025); у людини з прокруткою — на посиланні (проба RUN-2026-11-04) | Низький | Перевірити зі зчитувачем у TC-087, якщо власник його виконає | Власник продукту |
| Документи | TC-059 оновлено за рішенням власника; UX §4 2.4.3 досі каже «фокус на h1» — запит на зміну №6 (TD-024, разом із TD-020, TD-022) | Низький | Запит на зміну №6 через `project-kickoff` | Власник продукту |
| Дефект → Verified (Revise №4, ретест RUN-2026-11-03-2) | **BUG-001** (Major / P1): 429 CoinGecko без CORS → «Немає з'єднання» + 2 повтори (3 запити під лімітом) | Високий: ліміт — щоденна ситуація без ключа; хибна порада, подовження блокування; NFR-3 порушено | Варіант 1 з BUG-001: E-NET лише при `navigator.onLine === false`, інакше «Не вдалося отримати ціни» без повторів → Revise етапу 7. Для 8.b: тест через `route.abort` при `onLine=true` — виконано (історія: обидві пропозиції реалізовано — `e3fb805`, 8.b `f52746a`) | — |
| Дефект → Verified (Revise №4, ретест RUN-2026-11-03-2) | **BUG-002** (Major / P2): повернення зі сторінки монети скидає сортування, пошук і «Показати більше» | Середній: головний шлях JTBD-1 втрачає контекст | Історія: виправлено в Revise №4 етапу 7 (`e3fb805`, стан списку в пам'яті вкладки за UX §1) | — |
| Дефект → Verified (Revise №5 етапу 7, ретест RUN-2026-11-03-3) | **BUG-003** (Major / P2): одна монета з `null` у полі → увесь список у помилці | Середній | Варіант Б (тлумачення «BUG-003 - ок», підтверджено гейтом етапу 7 22:25): `null` у зміні за 7 днів → «—», монета лишається; документи (§6 архітектури, UX §3 / §5.2, TC-086) — TD-022, відкритий (запит на зміну №6) | Власник продукту → запит на зміну №6 (етапи 3, 4) |
| Дефект → Verified (Revise №4, ретест RUN-2026-11-03-2) | **BUG-004** (Minor / P2): рівні показані значення не за місцем у рейтингу (AC-2.4) | Низький | Історія: виправлено в Revise №4 етапу 7 (`e3fb805`, сортування за показаним значенням) | — |
| Дефект → Verified (Revise №4, ретест RUN-2026-11-03-2) | **BUG-005** (Minor / P3), **BUG-006** (Minor / P3), **BUG-007** (Minor / P3), **BUG-008** (Trivial / P3) | Низький | Історія: виправлено пакетом у Revise №4 етапу 7 (`e3fb805`) | — |
| Ризик → закрито (8.b `f52746a`) | Фікстура Playwright і оракул (jsdom) не відтворюють блокування CORS — клас дефектів BUG-001 невидимий для автотестів | Середній | На 8.b: сценарій з `route.abort` при `onLine=true` і перевіркою кількості запитів; живий smoke на staging (етап 9) | Етап 8.b; закрито на 8.b: AC-2.6 і AC-8.2 — `route.abort` при `onLine=true` з лічильником запитів (урок L-008) |
| Питання | Вибула з топ-50 монета в «Обраних» показується за id CoinGecko (`moneta-x`, у житті — `avalanche-2`), бо сховище має лише id (ADR 0004, P-1) | Низький | Залишити (рішення P-1) або зберігати назву поруч з id — запит на зміну ADR 0004 | Власник продукту |
| Рішення | План етапу 8.a і вибір секції 2 — підтверджено власником (трекер 2026-11-03 05:30) | — | — | Власник продукту |
| Дефект → Verified (Revise №5 етапу 7, ретест RUN-2026-11-03-3) | **BUG-009** (Minor / P3): логотип, що не завантажився, — значок зламаного зображення замість кружка з літерою (UX §8); TC-078 | Низький | Історія: виправлено спільним `src/ui/CoinLogo.jsx` (Revise №5 етапу 7, `8f0f2a5`) | — |
| Спостереження → вирішено (Revise №5 етапу 7) | Після Revise №4: видима рамка фокуса на h1 після переходу й прокрутка списку до h1 після повернення | Низький | Рамка лише при `:focus-visible`, прокрутка списку зберігається (TC-059, RUN-2026-11-03-3); залишок TD-023 (фокус на h1 поза екраном після повернення) і регресію TD-025 закрито в Revise №6 етапу 7 (`8c68680`, рішення власника 2026-11-04 00:11, п. 5) — TC-059 Pass (RUN-2026-11-04) | — |
| Прогалина тест-плану → борг TD-026 | Сортування за зміною за 7 днів, коли в монети `null` (`src/lib/sort.js`, `byChange`: `null` у кінці за обох напрямів, змінено в `8f0f2a5`) — окремого TC немає, вручну не перевірялось; на 8.b (`f52746a`, `821453d`) E2E з `null` не додано | Низький | Зараз покриває лише модульний тест `src/lib/lib.test.js` («BUG-003: монета без зміни (null) — у кінці за зростанням і за падінням»). Варіанти: TC у тест-плані (наступний Revise 8.a) або E2E у наступному Revise 8.b; документи — TD-022 | Власник продукту (`.agentic/tech-debt.md`, TD-026) |
| Ризик → закрито на 8.b; залишок — етапу 9 | Під час ретесту CoinGecko знову відповідав 429 без CORS (05:38): ліміт без ключа досягається за кілька хвилин активного тестування | Середній | E2E етапу 8.b — лише на фікстурі (`e2e/support/coingecko.js`, `routeCoinGecko`) — виконано; залишок — живий smoke рідко й з паузами — етап 9 | Етап 9 |
| Чек-лист → ризик прийнято (історія Revise 8.a) | TC-087 (зчитувач), TC-088 (Safari iOS), TC-089 (Firefox, Edge), TC-090 (зрозумілість підказок) | Середній (NFR-14, WCAG 4.1.3) | Відкладено рішенням власника 2026-11-03 14:18; у Revise 8.a ризик не був прийнятий. **Зараз:** ризик прийнято власником 2026-11-04 00:11, п. 3 (рядок «Ризик → прийнятий» вище); чек-лист не виконувався | Власник продукту (вирішено) |
| Спостереження | `aria-busy` у стані Loading стоїть на обгортці екрана всередині `<main>`, а не на `<main>` (UX §3); статус «Нічого не знайдено» обгортає й кнопку «Очистити пошук» | Низький | Зчитувачем не перевірено — ризик прийнято власником 2026-11-04 00:11, п. 3 (TC-087 не виконується); BUG не заведено | Власник продукту |
| Не застосовно | Контракт API, фазинг, BOLA, сесії, тестові акаунти | — | `has_http_api: false`, входу немає (ADR 0001, 0002) | — |
| Борг | Первинний прогін і Revise 8.a: нових записів у `.agentic/tech-debt.md` не додавали — знахідки оформлено як BUG. **Revise 8.a №2:** додано TD-026 — прогалина тестів «сортування з `null`» і перевірка фокуса після переходу без E2E (TC-059) | Низький | Див. рядок «Прогалина тест-плану → борг TD-026» | Власник продукту |

### 6.1. Карта технологій для самостійного опанування

| Технологія / Інструмент / Патерн | Рівень опанування | Ключові концепції | Офіційне першоджерело |
| :--- | :--- | :--- | :--- |
| CORS і непрозорі помилки `fetch` | **Розуміти** | Відповідь без `Access-Control-Allow-Origin` браузер не віддає скрипту: `fetch` кидає `TypeError`, статус 429 недоступний; `navigator.onLine` | https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS |
| Тест-дизайн: граничні значення, таблиці рішень, переходи станів | **Вміти** | `min−1 / min / max / max+1`, стовпець таблиці = TC, валідні й заборонені переходи | https://www.istqb.org/certifications/certified-tester-foundation-level |
| Playwright `route` і `clock` | **Вміти** | `route.fulfill` / `route.abort` для керованих відповідей; `page.clock.setFixedTime` / `install` / `runFor` для меж часу; обмеження: `fulfill` не блокує CORS | https://playwright.dev/docs/network і https://playwright.dev/docs/clock |
| Severity ≠ Priority | **Знати** | Severity — вплив, Priority — терміновість; вони незалежні | https://www.istqb.org/certifications/certified-tester-foundation-level |
| WCAG 2.2: 1.4.10 Reflow, 2.4.3 Focus Order, 4.1.3 Status Messages | **Розуміти** | 320 CSS px без горизонтальної прокрутки, фокус після зміни контексту, `role="status"` | https://www.w3.org/TR/WCAG22/ |

## 7. Точка фіксації в Git (Recommended Git Commit Checkpoint)

### 7.1. Список файлів для індексації (`git status --short`)

Попередні коміти етапу: `93d517f` (Revise №4), `8755fb3` (Revise 8.a). **Revise 8.a №2** — файли нижче. `.agentic/pipeline-state.md` містить і записи гейту 8.b (хеш `821453d`) — за протоколом вони йдуть у коміт наступного етапу. Чужі зміни не в коміті: `.agentic/specs/01–02`, `.agentic/reports/01–02` (лише закінчення рядків).

```text
 M .agentic/specs/08-test-plan.md
 M .agentic/qa/bugs/BUG-010.md
?? .agentic/qa/runs/RUN-2026-11-04.md
?? .agentic/qa/runs/support/qa8a-retest4.mjs
?? .agentic/qa/runs/support/qa8a-retest4-out.txt
?? .agentic/qa/runs/support/qa8a-retest4-flow-out.json
?? .agentic/qa/runs/support/qa8a-retest4-logo.mjs
?? .agentic/qa/runs/support/qa8a-retest4-logo-out.txt
?? .agentic/qa/runs/support/qa8a-retest4-tc059.mjs
?? .agentic/qa/runs/support/qa8a-retest4-tc059-out.json
 M .agentic/reports/08a-qa-manual-report.md
 M .agentic/pipeline-state.md
 M .claude/rules/project-lessons.md     (повтор L-002, рев'ю №3)
 M .agentic/tech-debt.md               (TD-026, рев'ю №5)
```

### 7.2. Явна індексація та коміт (Conventional Commits)

```bash
git add -- .agentic/specs/08-test-plan.md .agentic/qa/bugs/BUG-010.md .agentic/qa/runs/RUN-2026-11-04.md .agentic/qa/runs/support/qa8a-retest4.mjs .agentic/qa/runs/support/qa8a-retest4-out.txt .agentic/qa/runs/support/qa8a-retest4-flow-out.json .agentic/qa/runs/support/qa8a-retest4-logo.mjs .agentic/qa/runs/support/qa8a-retest4-logo-out.txt .agentic/qa/runs/support/qa8a-retest4-tc059.mjs .agentic/qa/runs/support/qa8a-retest4-tc059-out.json .agentic/reports/08a-qa-manual-report.md .agentic/pipeline-state.md .claude/rules/project-lessons.md .agentic/tech-debt.md
git commit -m "test(stage-8.a): retest bug-010 and bug-011 after stage 7 revise 6"
```

---

### 🛑 Рішення власника продукту (Human Approval Gate)

- [x] **Approve & закоміть** — статус `APPROVED_AND_COMMITTED`: агент оновлює `.agentic/pipeline-state.md`, позначає цей чекбокс, виконує явний `git add` і `git commit`.
- [ ] **Approve без коміту** — статус `APPROVED_MANUAL_COMMIT`: власник комітить самостійно.
- [ ] **Revise** — статус `REJECTED_REVISING`: зауваження нижче, етап повертається на Фазу 3.

**Revise 8.a (2026-11-03 22:29) — передумова виконана:** Revise №5 етапу 7 схвалено й закомічено (`8f0f2a5`, 22:25). **На цьому гейті:**

1. Схвалити ретест: BUG-003 і BUG-009 — `Verified` (RUN-2026-11-03-3); TC-061, TC-062 — за запитом на зміну №5.
2. Чек-лист TC-087 – TC-090 (відкладено 14:18): прийняти ризик (L-003) чи виконати перед етапом 9.

**Попередній гейт (Revise №4):** передумова — `e3fb805`, 14:00.

**Перший гейт (05:17) — рішення власника 05:30:** «виправ все згідно твоїм рекомендаціям» (розклад — трекер). **Окремо на повторному гейті:**

1. BUG-003 — варіант запиту на зміну №4 (А / Б / В).
2. Чек-лист TC-087 – TC-090: виконаєте ви чи відкласти.
3. BUG-009 (новий, Minor / P3): виправити зараз чи в спринті 2.

**Пункти першого гейту (історія):**

1. Підтвердити план етапу 8.a і вибір секції 2 (окремо в чаті не затверджувались).
2. BUG-001 (Major / P1): виправити зараз (варіант 1 / 2 — Revise етапу 7) чи прийняти як відомий дефект.
3. BUG-002, BUG-003 (Major / P2): виправити зараз чи відомі дефекти.
4. BUG-004 – BUG-008 (Minor / Trivial): пакетом у Revise етапу 7 чи спринт 2.
5. Чек-лист TC-087 – TC-090: виконаєте ви чи відкласти.

**Коментарі / Зауваження:**
> 2026-11-03 22:25: власник — «Так, Revise 8.a» (після гейту етапу 7); статус `REJECTED_REVISING`, чекбокси знову порожні до гейту. 
> 2026-11-03 22:43: власник — «Approve & закоміть 8.a» (Revise 8.a). Схвалено пункт 1 (ретест, BUG-003 і BUG-009 Verified). Пункт 2 (чек-лист TC-087 – TC-090) окремо не вирішено — лишається відкритим, ризик не прийнято (L-003).
>
> **Revise 8.a №2 (2026-11-04, команда власника «Так, Revise 8.a» після гейту 8.b `821453d`):** гейт:
> 1. Схвалити ретест на `8c68680`: BUG-010 — Pass у трьох рушіях (статус `Fixed`), BUG-011 — Verified; TC-059 — нове очікування (рішення 00:11, п. 5) — коміт `test(stage-8.a): …`.
> 2. BUG-010: лишити `Fixed` до TC-088 на iPhone чи прийняти перевірку WebKit Playwright (`Verified`).
> 3. TD-026 (прогалина тестів: сортування з `null`, фокус після переходу без E2E): TC у тест-плані (наступний Revise 8.a), E2E у наступному Revise 8.b чи прийняти як борг.
> 4. Поза зоною 8.a: звіт 8.b (`08b-qa-automation-report.md`, секція 6) досі каже «ризик чек-листа не прийнято» — виправити в наступному Revise 8.b.
> 5. Поза зоною 8.a: у закомічених звіті етапу 7 і `.agentic/evidence/red-team-report.md` (прохід №9) рядок 2.4.3 названо «UX §6» замість «UX §4» — виправити в наступному проході етапу 7 або разом із запитом на зміну №6.
>
> **2026-11-04 02:11:** власник — «Approve & закоміть 8.a» (Revise 8.a №2). Схвалено пункт 1 (ретест на `8c68680`: BUG-010 — Fixed, BUG-011 — Verified, TC-059 — Pass). Пункти 2–5 окремо не вирішено — лишаються відкритими (L-003).
