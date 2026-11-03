# Фінальний звіт етапу: Stage 8.a — тест-дизайн і ручне тестування

- **Етап:** `Stage 8.a: QA A — тест-дизайн і ручне тестування`
- **Відповідальний скіл:** `qa-engineer`
- **Дата формування:** `2026-11-03 05:17` (чернетка — 05:10); ретест після Revise №4 етапу 7 — `2026-11-03 05:50`; правки за рев'ю — 06:01 і `14:05` (після коміту етапу 7 `e3fb805`)
- **Revise 8.a:** `2026-11-03 22:29` — ретест на коміті етапу 7 `8f0f2a5` (RUN-2026-11-03-3), рішення власника 22:25 «Так, Revise 8.a».
- **Статус аудиту independent-reviewer:** `PASS` (Revise 8.a, рев'ю №2; рев'ю №1 повернуло блокери, їх виправлено — див. 4.3)

---

## 1. Перевірені передумови (Pre-Flight Summary)

Передумови трекера (первинний прогін): етап 4 — `APPROVED_AND_COMMITTED` (старт), етап 7 — `APPROVED_AND_COMMITTED`, коміт `8645c76`. **Після рішення 05:30 етап 7 пройшов Revise №4**: власник схвалив його «Approve & закоміть» — коміт `e3fb805` (2026-11-03 14:00), статус етапу 7 знову `APPROVED_AND_COMMITTED`. Хеш вписано в RUN-2026-11-03-2 і статуси BUG; `git diff --stat e3fb805 -- src` порожній — ретест виконано на тому самому коді. Ще один доказ: хеш бандла `index-B4e6vtFN.js` однаковий у `pnpm verify` 05:34:45 (база ретесту), у повторі рев'юера етапу 7 05:51:58 і в `pnpm verify` 13:59:48 перед комітом. Первинна примітка (гейт, живий прогін). Нічого не встановлювалось: усі інструменти вже були в проєкті з етапів 5 і 7.

**Revise 8.a (2026-11-03 22:29):** передумова — Revise №5 етапу 7 схвалено й закомічено (`8f0f2a5`, 22:25), статус етапу 7 `APPROVED_AND_COMMITTED`. Ретест — на збірці HEAD `8f0f2a5` (`git status --short src` порожній; бандл `index-fiVsxdXU.js`, той самий, що в `verify-gate.py --stage 7 --run` 22:21:53 – 22:23:41). Нічого не встановлювалось.

| Інструмент / SDK / Акаунт | Необхідна версія | Фактичний стан на старті | Запропонована команда | Згода отримана | Результат |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Node.js | 24 LTS (`.nvmrc`, `engines`) | v24.21.0 | Ні, вже було | Не потрібно | ✅ Готово |
| pnpm | 11 (`packageManager`) | 11.23.0 (`packageManager`), збірка зелена | Ні, вже було | Не потрібно | ✅ Готово |
| Збірка + preview | `pnpm build`, `vite preview` :4173 (`.claude/launch.json`) | `✓ built`, сторінка відповідає, h1 «Топ-50 монет» | Ні, вже було | Не потрібно | ✅ Готово |
| Вбудований браузер (Chromium) | — | Доступний, мобільна емуляція 320×640 і схема кольорів працюють | Ні | Не потрібно | ✅ Готово |
| `@playwright/test` + Chromium | 1.64 (етап 5, `pnpm test:a11y`) | Встановлено, `pnpm test:a11y` 40 passed | Ні, вже було | Не потрібно | ✅ Готово |
| CoinGecko без ключа | Публічний API | 200 о 04:48; 429 без CORS о 04:52:56 | — | Не потрібно | ⚠️ Нестабільний (це й був об'єкт перевірки) |
| Safari, Firefox, Edge, зчитувач екрана | NFR-14, UX §4 | Недоступні агенту (Windows, без NVDA) | Чек-лист власнику (TC-087 – TC-090) | — | ⏳ Чекає власника |
| Тестові акаунти й облікові дані | — | Не застосовно: входу немає (ADR 0002) | — | — | Не застосовно |

## 2. Застосовані Best Practices vs найпростіший підхід

Етап запустила сесія-координатор за дорученням власника з визначеним обсягом (тест-план, ручні сесії в браузері, ризик «429 без CORS», звіт, рев'ю, гейт). План етапу і вибір нижче власник підтвердив на першому гейті 8.a (трекер, 2026-11-03 05:30).

| Аспект / Рішення | Найпростіший підхід | Галузева Best Practice | Що обрано та чому |
| :--- | :--- | :--- | :--- |
| Тест-дизайн | «Щасливий шлях» кожної історії | Класи еквівалентності, граничні значення, таблиці рішень, переходи станів; трасування AC → TC | **Best Practice:** 91 TC (TC-091 додано після рев'ю ретесту), кожен з 57 AC має ≥ 1 TC; межі 25/50, 0/1/49/50, 0/1/50/51, 299/300/301 с, ±0,04/±0,05/±0,06 %. |
| Негативні сценарії | Лише валідація поля пошуку | Таблиця «джерело помилки → текст і кількість запитів», некоректна відповідь джерела, недоступне сховище | **Best Practice:** BOLA / 409 / problem+json — не застосовно (`has_http_api: false`, входу немає); замість них — E-NET / E-SRC / E-429 / E-SHAPE / E-STALE / E-STORE / C-TAB. |
| Дефекти | Опис у чаті | `BUG-NNN`: кроки, очікуване й фактичне, Severity ≠ Priority, середовище, докази | **Best Practice:** 9 BUG у `.agentic/qa/bugs/` (BUG-009 — з ретесту). |
| Дані для станів | Чекати, коли джерело само зламається | Керовані стани: підміна відповіді й годинник сторінки | **Best Practice + живий доказ:** фікстура проєкту через `route` і `page.clock`; ризик CORS — лише на живому CoinGecko, бо підміна CORS не блокує. |
| Локатори й вивід | CSS / XPath, скриншоти | Ролі й доступні імена; текст і дерево доступності, скриншот — лише коли важливий вигляд | **Best Practice:** `getByRole`, `javascript_tool`, ARIA-знімок; скриншоти робились у сесіях (320 px з підказкою, сторінка монети), у репозиторії збережено один — доказ BUG-001. |
| Доступність | «На око» | axe + ручна клавіатура, фокус, 320 px у мобільній емуляції (урок L-007), скрінрідер — людина | **Best Practice:** axe 40/40; ручні TC-065 – TC-074; зчитувач — чек-лист власника. |
| Автоматизація | Писати E2E зараз | E2E — етап 8.b; на 8.a — одноразові сценарії без тестового проєкту | **Best Practice:** сценарії лежать у `.agentic/qa/runs/support/` як доказ, у `package.json` нічого не додано. |
| Контракт / фазинг | — | Schemathesis за `contract/openapi.yaml` | **Не застосовно:** власного API немає (ADR 0001). |

## 3. Виконаний обсяг робіт (Deliverables)

- [`.agentic/specs/08-test-plan.md`](../specs/08-test-plan.md) — тест-план: скоуп, підхід, середовища, критерії входу й виходу, ризики, 91 тест-кейс TC-001 – TC-091 (Must 74, Should 15, Could 2), сесії, матриця AC → TC і NFR → TC.
- [`.agentic/qa/sessions/SES-01-list.md`](../qa/sessions/SES-01-list.md) … [`SES-11-accessibility.md`](../qa/sessions/SES-11-accessibility.md) — 11 дослідницьких сесій: по одній на кожну Must-історію US-1 – US-9, наскрізний шлях (SES-10) і ручна доступність (SES-11).
- [`.agentic/qa/runs/RUN-2026-11-03.md`](../qa/runs/RUN-2026-11-03.md) — журнал прогону: результат кожного TC, підсумок, виводи сценаріїв.
- [`.agentic/qa/runs/support/`](../qa/runs/support/) — одноразові сценарії керованих станів (`qa8a.mjs`, `qa8a-extra.mjs`, `qa8a-gaps.mjs`, `busy.mjs`, `name.mjs`) і їхні виводи (`qa8a-out.json`, `qa8a-gaps-out.json`). Запускаються при працюючому `vite preview` :4173: `node .agentic/qa/runs/support/qa8a.mjs`.
- [`.agentic/qa/bugs/BUG-001.md`](../qa/bugs/BUG-001.md) … [`BUG-009.md`](../qa/bugs/BUG-009.md) — 9 дефектів (BUG-009 — з ретесту).
- [`.agentic/qa/evidence/BUG-001-429-shows-no-connection-320px.jpg`](../qa/evidence/BUG-001-429-shows-no-connection-320px.jpg) — скриншот живого 429 без CORS.
- `.agentic/pipeline-state.md` — статус 8.a: `IN_PROGRESS` (04:59) → `WAITING_FOR_APPROVAL` (05:17) → `REJECTED_REVISING` (05:30, рішення власника, ретест) → `IN_PROGRESS` (14:01, після коміту етапу 7 `e3fb805`) → `WAITING_FOR_APPROVAL` (після вердикту рев'ю) — записи в розділі 4 (06:01, 14:01). Revise 8.a: `APPROVED_AND_COMMITTED` (`93d517f`) → `REJECTED_REVISING` (22:25, «Так, Revise 8.a») → `IN_PROGRESS` (22:29) → `WAITING_FOR_APPROVAL` (після вердикту рев'ю).
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

## 4. Докази працездатності (Verification Evidence)

### 4.0. Валюта довіри (Trust Receipt)

| Перевірка | Команда | Код виходу | Лічильники | Повторив рев'юер | Примітка |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Валідатор етапу (Revise 8.a) | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 8.a` | 0 | 10 PASS, 0 FAIL: передумови 4, 7; «Валюта довіри» 23; 3 RUN; оракул незмінний; 85 файлів правил якості; 198 файлів секретів | ні | 22:40:06, після вердикту PASS рев'ю №2 (L-004); вивід — 4.2, блок «Revise 8.a — валідатор етапу» |
| Вердикт рев'юера (Revise 8.a) | субагент `independent-reviewer` | 0 | рев'ю №2 — PASS (0 BLOCKER, 2 WARNING — виправлено); рев'ю №1 — BLOCKERS FOUND (виправлено) | ні | записи — 4.3 |
| Ретест таблиці помилок (Revise 8.a) | `node .agentic/qa/runs/support/qa8a.mjs errors` | 0 | 5 випадків: 429+CORS 1, 429 без CORS 1, 500 3, обрив онлайн 1, форма 1 запит; усі «Не вдалося отримати ціни» | ні | 22:27:02 – 22:27:43, коміт `8f0f2a5`; вивід — 4.1, блок «Revise 8.a» |
| Ретест BUG-003, BUG-009, фокус, 320 px (Revise 8.a) | `node .claude/skills/verify/logo-focus-check.mjs <каталог знімків>` (копія — `.agentic/qa/runs/support/qa8a-retest3-logo.mjs`, SHA-256 однаковий) | 0 | 50 рядків, «—» / «немає даних»; 0 зламаних `img`, 50 кружків; фокус мишею без рамки, прокрутка 1500; клавіатурою — рамка 2 px; 5 маршрутів 320 px (iPhone SE, без підказок) — переповнення 0; консоль 0 (без «coin-images» / «ERR_FAILED»), CSP 0 | ні | 22:27:43 – 22:27:51; вивід — 4.1, блок «Revise 8.a» |
| Ретест потоків (Revise 8.a, після рев'ю 8.a) | `node .agentic/qa/runs/support/qa8a-retest.mjs` | 0 | TC-059 кроки 1–4: h1 у фокусі на 4 екранах; TC-058: `cap` 50 / «sol» 1 / `price` 25; TC-068: 5 маршрутів 320 px (Pixel 7) з кожною підказкою — переповнення 0 | ні | 22:34:48 – 22:34:57, коміт `8f0f2a5`; вивід — 4.1, блок «Revise 8.a — потоки» |
| Код ретесту = коміт етапу 7 (Revise 8.a) | `git status --short src` (HEAD `8f0f2a5`) | 0 | порожній вивід | ні | 22:39:32; збірка `pnpm build` 22:26 — `index-fiVsxdXU.js` gzip 106.52 kB, той самий хеш, що в `--stage 7 --run`; вивід — 4.2, блок «Revise 8.a» |
| Трасування AC → TC (Revise 8.a) | `python -c "import re;r=set(re.findall(r'AC-\d+\.\d+',open('.agentic/specs/02-requirements.md',encoding='utf-8').read()));t=set(re.findall(r'AC-\d+\.\d+',open('.agentic/specs/08-test-plan.md',encoding='utf-8').read()));tc=set(re.findall(r'TC-\d+',open('.agentic/specs/08-test-plan.md',encoding='utf-8').read()));print('AC',len(r),'без TC',len(r-t),sorted(r-t),'TC',len(tc))"` | 0 | AC 57, без TC 0, TC 91 | ні | 22:39:32; вивід — 4.2, блок «Revise 8.a» |
| Відкриті Blocker / Critical (Revise 8.a) | `python -c "import glob,re;b=sorted(glob.glob('.agentic/qa/bugs/BUG-*.md'));t={f:open(f,encoding='utf-8').read() for f in b};o=[f for f in b if any(re.search(r'Severity:\**\s*'+w,t[f]) for w in ('Blocker','Critical')) and not any(re.search(r'Статус:\**\s*'+w,t[f]) for w in ('Verified','Closed'))];v=[f[-10:-3] for f in b if re.search(r'Статус:\**\s*Verified',t[f])];print('BUG',len(b),'відкритих Blocker/Critical',len(o),'Verified',len(v),v)"` | 0 | 9 BUG, 0 відкритих Blocker / Critical, 9 Verified | ні | 22:39:32; лічильник замість `grep -L` (L-001); вивід — 4.2, блок «Revise 8.a» |
| Сканер секретів (Revise 8.a) | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --scan-secrets .agentic/qa` і `--scan-secrets .agentic/specs/08-test-plan.md` | 0 | 40 + 1 файл, 0 секретів | ні | 22:39:32; вивід — 4.2, блок «Revise 8.a» |
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
| Ручний прогін | вбудований браузер + журнал RUN | не застосовно | Первинний прогін (база `040a537`): 90 TC — Pass 76, Fail 9, Not run 5; 8 BUG. Після рев'ю ретесту: 91 TC, 9 BUG. Ретест: 10 TC з BUG — Pass 9, Fail 1 (TC-086, BUG-003); регресія TC-068 Pass; новий TC-091 Pass; TC-078 (уточнене очікування) Fail → BUG-009. Revise 8.a (`8f0f2a5`, RUN-2026-11-03-3): TC-086, TC-078, TC-062, TC-058, TC-059, TC-068 — Pass; TC-061 не повторювався; 9 BUG — усі Verified | — | Ручна сесія без коду виходу; докази — SES-01 – SES-11, RUN-2026-11-03, RUN-2026-11-03-2, RUN-2026-11-03-3 |

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

### 4.3. Вердикт незалежного аудиту (`independent-reviewer`)

**Рев'ю Revise 8.a №2 (поточний вердикт):**
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

Повна матриця AC → TC — розділ 8 тест-плану; результати — RUN-2026-11-03.

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
| AC-8.1 – AC-8.8 | Недоступні й застарілі дані | `src/market-data/`, `src/ui/ErrorBlock.jsx` | TC-047 – TC-054, SES-08 | ✅ Pass; живий 429 без CORS — TC-061 Pass після Revise №4 (BUG-001 Verified) |
| AC-9.1 – AC-9.3 | Дисклеймер, джерело, мова | `src/app/Layout.jsx` | TC-055 – TC-057, SES-09 | ✅ Pass |
| AC-10.1 | Тема як на пристрої | `public/theme-init.js` | TC-075 | ✅ Pass (US-10 — Should, спринт 2) |
| AC-10.2 | Перемикання теми | — (спринт 2) | TC-076 | Not run — поза спринтом 1 |
| UX §1 | Стан списку в межах вкладки | `src/features/coin-list/` | TC-058, SES-04, SES-10 | ✅ Pass після Revise №4 (BUG-002 Verified) |
| UX §4 2.4.3 | Фокус на h1 після зміни маршруту | `src/app/`, `src/features/*` | TC-059 | ✅ Pass після Revise №4 (BUG-005 Verified); повтор кроків 1–4 на `8f0f2a5` — Pass (RUN-2026-11-03-3) |
| UX §3 E-STORE | ★ у пам'яті вкладки | `src/favorites/store.js` | TC-083, TC-084 | ✅ Pass після Revise №4 (BUG-006 Verified) |
| NFR-1 | Свіжість ≤ 5 хв | `src/market-data/` | TC-050, TC-051 | ✅ Pass |
| NFR-1 / US-8 / ADR 0005 | Неповна монета не кладе весь знімок | `src/market-data/parse.js` | TC-086 | ✅ Pass після Revise №5 етапу 7 (BUG-003 Verified, варіант Б: `null` → «—», RUN-2026-11-03-3) |
| NFR-3 | Ліміт запитів, 429 без повторів | `src/market-data/client.js` | TC-061 – TC-063, TC-091 | ✅ Pass після Revise №4 (BUG-001 Verified; офлайн-гілка — TC-091); TC-062 повторено на `8f0f2a5` за UX §3 після запиту №5 — Pass |
| NFR-6, NFR-7 | WCAG 2.2 AA, 320 px | весь UI | TC-065 – TC-074, TC-082, `pnpm test:a11y` 40/40, SES-11 | ✅ Pass (BUG-005 Verified після Revise №4); зчитувач — TC-087 власник |
| NFR-8, NFR-10, NFR-13, NFR-16 | CSP, приватність, консоль, атрибуція | `index.html` (збірка), `Layout.jsx` | TC-055, TC-064, TC-080, TC-081 | ✅ Pass |
| NFR-14 | Браузери | — | TC-088, TC-089 | ⏳ Not run — відкладено власником 2026-11-03 14:18; ризик не прийнято (L-003) |

## 6. Ризики, технічний борг і відкриті питання

**Критерії виходу (тест-план, розділ 4), Revise 8.a:** Blocker / Critical — 0 ✅; axe 0 critical / serious ✅ (`pnpm test:a11y` у `--stage 7 --run` 22:21 – 22:23); усі 9 BUG — `Verified` ✅; 100 % Must TC, які може виконати агент, — виконано (72 з 74) ⚠️: TC-087, TC-088 (чек-лист власника) **відкладено рішенням власника 2026-11-03 14:18** — не виконано й не пройдено, ризик не прийнято (L-003). Критерій виходу «100 % Must» не виконано лише через ці два TC; рішення — на гейті 8.a.

| Тип | Опис | Вплив | Що пропонується | Власник рішення |
| :--- | :--- | :--- | :--- | :--- |
| Дефект → Verified (Revise №4, ретест RUN-2026-11-03-2) | **BUG-001** (Major / P1): 429 CoinGecko без CORS → «Немає з'єднання» + 2 повтори (3 запити під лімітом) | Високий: ліміт — щоденна ситуація без ключа; хибна порада, подовження блокування; NFR-3 порушено | Варіант 1 з BUG-001: E-NET лише при `navigator.onLine === false`, інакше «Не вдалося отримати ціни» без повторів → Revise етапу 7. Для 8.b: тест через `route.abort` при `onLine=true` | Власник продукту → етап 7 |
| Дефект → Verified (Revise №4, ретест RUN-2026-11-03-2) | **BUG-002** (Major / P2): повернення зі сторінки монети скидає сортування, пошук і «Показати більше» | Середній: головний шлях JTBD-1 втрачає контекст | Revise етапу 7 (стан списку в пам'яті вкладки за UX §1) | Власник продукту → етап 7 |
| Дефект → Verified (Revise №5 етапу 7, ретест RUN-2026-11-03-3) | **BUG-003** (Major / P2): одна монета з `null` у полі → увесь список у помилці | Середній | Варіант Б (тлумачення «BUG-003 - ок», підтверджено гейтом етапу 7 22:25): `null` у зміні за 7 днів → «—», монета лишається; документи (§6 архітектури, UX §3 / §5.2, TC-086) — TD-022, відкритий | Власник продукту → етап 7 |
| Дефект → Verified (Revise №4, ретест RUN-2026-11-03-2) | **BUG-004** (Minor / P2): рівні показані значення не за місцем у рейтингу (AC-2.4) | Низький | Сортувати за округленим значенням (як бачить відвідувач) або уточнити AC-2.4 (етап 2) | Власник продукту → етап 7 / 2 |
| Дефект → Verified (Revise №4, ретест RUN-2026-11-03-2) | **BUG-005** (Minor / P3), **BUG-006** (Minor / P3), **BUG-007** (Minor / P3), **BUG-008** (Trivial / P3) | Низький | Пакетом у наступному Revise етапу 7 або в спринті 2 | Власник продукту → етап 7 |
| Ризик | Фікстура Playwright і оракул (jsdom) не відтворюють блокування CORS — клас дефектів BUG-001 невидимий для автотестів | Середній | На 8.b: сценарій з `route.abort` при `onLine=true` і перевіркою кількості запитів; живий smoke на staging (етап 9) | Етап 8.b |
| Питання | Вибула з топ-50 монета в «Обраних» показується за id CoinGecko (`moneta-x`, у житті — `avalanche-2`), бо сховище має лише id (ADR 0004, P-1) | Низький | Залишити (рішення P-1) або зберігати назву поруч з id — запит на зміну ADR 0004 | Власник продукту |
| Рішення | План етапу 8.a і вибір секції 2 — підтверджено власником (трекер 2026-11-03 05:30) | — | — | Власник продукту |
| Дефект → Verified (Revise №5 етапу 7, ретест RUN-2026-11-03-3) | **BUG-009** (Minor / P3): логотип, що не завантажився, — значок зламаного зображення замість кружка з літерою (UX §8); TC-078 | Низький | Виправлено спільним `src/ui/CoinLogo.jsx` | Власник продукту → етап 7 |
| Спостереження → вирішено (Revise №5 етапу 7) | Після Revise №4: видима рамка фокуса на h1 після переходу й прокрутка списку до h1 після повернення | Низький | Рамка лише при `:focus-visible`, прокрутка списку зберігається (TC-059, RUN-2026-11-03-3); залишок — TD-023 (фокус на h1 поза екраном після повернення), відкритий, на рішення власника | Власник продукту |
| Прогалина тест-плану | Сортування за зміною за 7 днів, коли в монети `null` (`src/lib/sort.js`, `byChange`: `null` у кінці за обох напрямів, змінено в `8f0f2a5`) — окремого TC немає, вручну не перевірялось | Низький | Покрито модульним тестом `src/lib/lib.test.js` («BUG-003: монета без зміни (null) — у кінці за зростанням і за падінням»); E2E — етап 8.b; документи — TD-022 | Етап 8.b |
| Ризик | Під час ретесту CoinGecko знову відповідав 429 без CORS (05:38): ліміт без ключа досягається за кілька хвилин активного тестування | Середній | E2E етапу 8.b — лише на фікстурі; живий smoke — рідко, з паузами | Етап 8.b |
| Чек-лист (відкладено) | TC-087 (зчитувач), TC-088 (Safari iOS), TC-089 (Firefox, Edge), TC-090 (зрозумілість підказок) | Середній (NFR-14, WCAG 4.1.3) | Відкладено рішенням власника 2026-11-03 14:18; не виконано; ризик **не прийнято** (L-003) — підтвердити на гейті: прийняти ризик чи виконати перед етапом 9 | Власник продукту |
| Спостереження | `aria-busy` у стані Loading стоїть на обгортці екрана всередині `<main>`, а не на `<main>` (UX §3); статус «Нічого не знайдено» обгортає й кнопку «Очистити пошук» | Низький | Перевірити зчитувачем у TC-087; без BUG до результату | Власник продукту |
| Не застосовно | Контракт API, фазинг, BOLA, сесії, тестові акаунти | — | `has_http_api: false`, входу немає (ADR 0001, 0002) | — |
| Борг | Нового запису в `.agentic/tech-debt.md` етап не додає: знахідки оформлено як BUG | — | — | — |

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
```text
 M .agentic/pipeline-state.md
 M .agentic/qa/bugs/BUG-003.md
 M .agentic/qa/bugs/BUG-009.md
 M .agentic/reports/08a-qa-manual-report.md
 M .agentic/specs/08-test-plan.md
?? .agentic/qa/evidence/BUG-009-retest-coin-page-focus.png
?? .agentic/qa/evidence/BUG-009-retest-list-320px.png
?? .agentic/qa/evidence/RUN-3-coin-page-focus.png
?? .agentic/qa/evidence/RUN-3-list-320-fallback.png
?? .agentic/qa/evidence/RUN-3-list-after-back.png
?? .agentic/qa/runs/RUN-2026-11-03-3.md
?? .agentic/qa/runs/support/qa8a-retest3-errors-out.json
?? .agentic/qa/runs/support/qa8a-retest3-flow-out.json
?? .agentic/qa/runs/support/qa8a-retest3-logo-out.json
?? .agentic/qa/runs/support/qa8a-retest3-logo.mjs
```

Попередні коміти етапу: `93d517f` (Revise №4). Код Revise №5 закомічено комітом етапу 7 `8f0f2a5` (22:25); трекер — у коміт 8.a (у ньому ще хеш `8f0f2a5`, вписаний після коміту етапу 7).

Чужі незакомічені зміни, які в коміт етапу не йдуть: `.agentic/project.json` (`holdouts_command`, сесія власника), `.agentic/reports/01–02`, `.agentic/specs/01–02` (лише закінчення рядків), `.claude/skills/` (сценарій `logo-focus-check.mjs` не комітиться — пункт гейту етапу 7; його копію для відтворення доказу комітить 8.a як `.agentic/qa/runs/support/qa8a-retest3-logo.mjs`).

### 7.2. Явна індексація та коміт (Conventional Commits)
```bash
git add -- .agentic/specs/08-test-plan.md .agentic/qa/bugs/BUG-003.md .agentic/qa/bugs/BUG-009.md .agentic/qa/evidence/BUG-009-retest-coin-page-focus.png .agentic/qa/evidence/BUG-009-retest-list-320px.png .agentic/qa/evidence/RUN-3-coin-page-focus.png .agentic/qa/evidence/RUN-3-list-320-fallback.png .agentic/qa/evidence/RUN-3-list-after-back.png .agentic/qa/runs/RUN-2026-11-03-3.md .agentic/qa/runs/support/qa8a-retest3-errors-out.json .agentic/qa/runs/support/qa8a-retest3-flow-out.json .agentic/qa/runs/support/qa8a-retest3-logo-out.json .agentic/qa/runs/support/qa8a-retest3-logo.mjs .agentic/reports/08a-qa-manual-report.md .agentic/pipeline-state.md
git commit -m "test(stage-8.a): retest bug-003 and bug-009 after stage 7 revise"
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
