# Фінальний звіт етапу: Stage 7: Реалізація: хвилі DAG, Red-Team аудит, перевірка в браузері

- **Етап:** `Stage 7: Реалізація: хвилі DAG, Red-Team аудит, перевірка в браузері`
- **Відповідальний скіл:** `sdd-delivery` (разом із `dag-runner`, `red-team-review`, `tech-debt-auditor`)
- **Дата формування:** `2026-11-03 03:24`; Revise №4 (ремонт BUG-001, 002, 004–008 етапу 8.a) — `2026-11-03 05:49`; Revise №5 (BUG-003, BUG-009, фокус після переходу; запит на зміну №5 / TD-021) — `2026-11-03 14:37`; Revise №6 (BUG-010, BUG-011, TD-023; рішення власника 2026-11-04 00:11) — `2026-11-04 00:42`
- **Статус аудиту independent-reviewer:** `PASS` (Revise №6, рев'ю №10; рев'ю №9 повернуло блокери, їх виправлено — див. 4.3)

---

## 1. Перевірені передумови (Pre-Flight Summary)

На старті (2026-11-03 00:07–00:22): етап 6 — `APPROVED_AND_COMMITTED` (`ddcdf0b`), `verify-gate.py --next` — код 0, повтор `--stage 6` після запиту на зміну №1 — код 0. Робоче дерево чисте за вмістом (файли етапів 1–4 з позначкою `M` мають порожній `git diff`). Базовий хеш відкату — `f689fc3`. Базовий прогін: `pnpm install --frozen-lockfile && pnpm verify` — 0; оракул — 91 з 91 червоні (як очікує план, розділ 13).

**Зараз (Revise №6, 2026-11-04):** етапи 6 (`f1ac4b5`), 8.a (`8755fb3`) і 8.b (`f52746a`) — `APPROVED_AND_COMMITTED`; етап 7 — `REJECTED_REVISING` за рішенням власника 00:11 (пункти 1, 2, 5) і командою «Start Revise №6 of stage 7?». Базовий хеш відкату — `b8e23ff`. `git status --short` на старті: лише `.agentic/pipeline-state.md` і файли 01–02 з самими закінченнями рядків (`git diff HEAD` порожній). Базовий прогін — останній прогін 8.b (`pnpm verify` 0, E2E 279 passed з 3 очікуваними падіннями WebKit, BUG-010).

**Revise №5 (трекер 20:59):** етапи 3, 4 і 6 за запитом на зміну №5 (TD-021) схвалено й закомічено — `APPROVED_AND_COMMITTED`: 3 — `9417669` (17:18), 4 — `a6719e0` (19:01), 6 — `f1ac4b5` (20:59). `verify-gate.py --stage 7`: «Передумови схвалено: 6» — PASS; лишається лише «Статус аудиту» до вердикту рев'юера. Коміт етапу 7 — на гейті етапу 7.

Під час етапу передумови змінювались: етап 5 — Revise №2 (запит №2) → `APPROVED_AND_COMMITTED` `d7d162e` (2026-11-03 01:47); етап 6 — Revise №3 (запит №3, «IP» у білому списку AC-9.3) → `APPROVED_AND_COMMITTED` `8720a04` (2026-11-03 03:23).

| Інструмент / SDK / Акаунт | Необхідна версія | Фактичний стан на старті | Запропонована команда | Згода отримана | Результат |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Node.js | 24 LTS (ADR 0001) | `v24.21.0` | Ні, вже було | Не потрібно | `✅ Готово` |
| pnpm | 11 | `11.23.0` | Ні, вже було | Не потрібно | `✅ Готово` |
| `react-router` 8.5.1, `@tanstack/react-query` 5.105.0, `@fontsource/unbounded` 5.3.0, `@fontsource/onest` 5.3.1 | план етапу 6, §8 | не встановлені | `pnpm add …` після `npm view` (версія, дата, репозиторій, ліцензія) | Так, 2026-11-02 23:10 (трекер) | `✅ Встановлено на Wave 0` |
| Playwright Chromium (axe, Lighthouse) | з етапу 5 | встановлено | Ні, вже було | Не потрібно | `✅ Готово` |
| Python (валідатор) | `>= 3.10` | `3.14.7` | Ні, вже було | Не потрібно | `✅ Готово` |
| Макети Claude Design і дизайн-система | UX §9.1 | доступні | `Artifact read` (копія в `.agentic/design-ref/`, не комітиться) | Не потрібно | `✅ Готово` |

---

## 2. Застосовані Best Practices vs найпростіший підхід

| Аспект / Рішення | Найпростіший підхід | Галузева Best Practice | Що обрано та чому |
| :--- | :--- | :--- | :--- |
| Шрифти | файли підмножин `@fontsource` | CSS ваг з `unicode-range`, self-hosted | **Best Practice:** без `unicode-range` грані затирають одна одну; браузер вантажить лише потрібні підмножини; без запитів до Google (NFR-10). Відхилення від «лише cyrillic і latin» у збірці — журнал |
| Шрифти й CSP | типове вбудовування Vite (≤ 4 КБ як `data:`) | шрифти завжди окремими файлами | **Best Practice:** CSP `default-src 'self'` блокує `data:`-шрифти; `build.assetsInlineLimit` вимикає вбудовування лише для `.woff`/`.woff2`, CSP не послаблено |
| Підміна CoinGecko для axe і Lighthouse (TD-002) | вимір на живому API | записана фікстура, без коду в бандлі | **Best Practice:** `page.route` і `connectOverCDP` до Chrome від `chrome-launcher`; стабільні виміри, ліміт NFR-3 не витрачається |
| LCP (NFR-4) | лише `preload` | ранній статичний каркас + `preload as=fetch` + стейблкоїни після топ-50 | **Рішення власника (00:53):** LCP 2,85 с → 0,91 с; обмеження метрики — секція 6 (TD-013) |
| Запити до CoinGecko (NFR-3) | типові тригери TanStack Query | один постійний поллер, центральний вимикач неявних тригерів, `networkMode: 'always'` | **Рішення власника (01:56, 02:36):** після 4 проходів Red-Team — таблиця тестів «тригер → кількість запитів» (`triggers.test.jsx`) |
| Підказки на телефоні (NFR-7) | `left: 0` від кнопки | межа від `clientWidth`, вимір у мобільній емуляції | **Рішення власника (02:53):** `innerWidth` на телефоні росте з переповненням |
| Межі модулів | глибокі імпорти | лише `index.js` модулів, `.dependency-cruiser.cjs` | **Best Practice:** `pnpm boundaries` 0 порушень (90 модулів) |

---

## 3. Виконаний обсяг робіт (Deliverables)

**Wave 0 (головний агент):** `package.json`, `pnpm-lock.yaml` (4 пакети), `index.html` (тема, маніфест, іконки, `preload` топ-50), `src/main.jsx` (шрифти), `public/theme-init.js`, `public/manifest.webmanifest`, `public/favicon.svg`, `public/icons/*`, `src/*/index.js` і `src/features/*/index.js` (контракти), `src/test/fixtures/*.json` — чекпоінт `62fe221`.

**Wave 1–3 (воркери `dag-worker`):** `src/lib/**` (формати, сортування, пошук, свіжість), `src/ui/**` (`Button`, `StatusMessage`, `ErrorBlock`, `Skeleton`, `TermHintButton`, `hintOffset.js`, хуки), `src/market-data/**` (клієнт CoinGecko, `parseMarkets`, повтори P-4, `useTopCoins`, `useStablecoinIds`, `MarketDataProvider`, `TopCoinsPoller`, `topCoinsQuery.js`), `src/favorites/**` (сховище, `storage`, порада Safari), `src/glossary/**`, `src/chart/**`, `src/features/coin-list/**`, `src/features/coin-page/**`, `src/features/favorites-view/**` — чекпоінти `3bc6ee3`, `ccaddfb`, `871334b`.

**Wave 4 (головний агент):** `src/app/App.jsx`, `Layout.jsx`, `NotFoundPage.jsx`, `AppErrorBoundary.jsx`, `App.test.jsx`; `a11y/shell.a11y.spec.js` (36 станів), `a11y/reflow.a11y.spec.js`, `a11y/support/fake-coingecko.js`, `scripts/web-vitals.mjs` (TD-002), `vite.config.js` (`assetsInlineLimit`).

**Ремонти Sync 4 і Red-Team:** 11 ремонтних воркерів (журнал автономності, розділ 3) — `src/market-data/**`, `src/ui/**`, `src/favorites/**`, `src/features/coin-list/**`.

**Документи етапу:**
- [`.agentic/evidence/walkthrough.md`](../evidence/walkthrough.md) — AC → докази, Quality Gates, Red-Team, рішення, бюджет, відкат.
- [`.agentic/evidence/debt-checks.md`](../evidence/debt-checks.md) — виміряний борг і повтори після кожного ремонту.
- [`.agentic/evidence/red-team-report.md`](../evidence/red-team-report.md) — Red-Team, проходи №1–№9 (№7 — Revise №4, №8 — Revise №5, №9 — Revise №6).
- [`.agentic/tech-debt.md`](../tech-debt.md) — TD-001 – TD-025: закрито TD-003, TD-004 (власник, 04:41), TD-005, TD-018 (Revise №4), TD-006, TD-010, TD-016, TD-017; відкрито 12 P2 Red-Team №7 і TD-020. Revise №5: TD-021 закрито 2026-11-03 (гейти 3 `9417669`, 4 `a6719e0`, 6 `f1ac4b5`), нові TD-022, TD-023; відкрито 13 P2 Red-Team №8 і TD-020. Revise №6: TD-023, TD-025 закрито, новий TD-024, TD-020 уточнено; відкрито 13 P2 Red-Team №9 і TD-020.
- [`.agentic/autonomy-journal.md`](../autonomy-journal.md) — рішення, бюджет «план / факт», Sync 0–4.
- [`.agentic/pipeline-state.md`](../pipeline-state.md) — статуси, рішення власника, запити на зміну №2, №3, №4 і №5.
- `.claude/skills/verify/SKILL.md` — доповнено (не комітиться без запиту власника).

---

### 3.1. Revise №4 (2026-11-03, рішення власника на гейті 8.a, трекер 05:30)

Ремонтні воркери `dag-worker` W1 – W3 (зони не перетинались, перевірено `git status --short` / `git diff --stat` о 05:34:34), базовий хеш відкату — `040a537`:

- W1 BUG-001: `src/market-data/client.js`, `client.test.js` (таблиця «тригер × стан», урок L-006), `triggers.test.jsx`, `useTopCoins.test.jsx` (офлайн-сценарії — `navigator.onLine = false`).
- W2 BUG-002, 004, 005, 008: `src/app/App.jsx`, нові `src/app/FocusOnNavigate.jsx`, `src/app/App.navigation.test.jsx`; `src/features/coin-list/useCoinListView.js`, `index.js`; `src/features/coin-page/FavoriteToggle.jsx`; `src/lib/format.js`, `sort.js`, `lib.test.js`.
- W3 BUG-006, 007: `src/favorites/store.js`, `favorites.test.jsx`; `src/chart/PriceChart7d.jsx`, `PriceChart7d.test.jsx`; `src/features/coin-page/CoinView.jsx`.
- Докази: `.agentic/evidence/red-team-report.md` (прохід №7), `.agentic/evidence/debt-checks.md` (розділ Revise №4), `.agentic/tech-debt.md` (TD-005, TD-018 закрито; TD-021), `.agentic/autonomy-journal.md` (бюджет W1 – W3, Red-Team №7), `.claude/rules/project-lessons.md` (L-008). `.agentic/evidence/walkthrough.md` веде сесія-координатор — Revise №4 у ньому оновлює вона.
- BUG-003 не ремонтувався: рекомендоване виправлення суперечить ADR 0005 — запит на зміну №4 (трекер, 05:30).

---

**Revise №5 (головний агент, без воркерів — 3 малі виправлення; рішення власника 14:18 і 14:35):** BUG-003 (варіант Б) — `src/market-data/parse.js` (`change7dPct: null` лише для зміни за 7 днів), `src/lib/format.js` («—», «немає даних»), `src/lib/sort.js` (null у кінці), `src/lib/index.js` (тип), JSDoc у `Change.jsx`, `CoinParts.jsx`, `FavoriteCard.jsx`; BUG-009 — `src/ui/CoinLogo.jsx` (новий, `onError` → кружок з літерою), `src/ui/index.js`, `CoinIdentity.jsx`, `CoinParts.jsx`, `CoinHeader.jsx`, `FavoriteCard.jsx`; фокус після переходу — `src/app/FocusOnNavigate.jsx` (`focus({preventScroll: true})`, прокрутка списку відновлюється, інші екрани — на початок, `history.scrollRestoration = "manual"`), рамка на h1 лише при `:focus-visible` (`[&:focus:not(:focus-visible)]:outline-none focus-visible:outline-2 …`) у 5 файлах: `CoinListPage.jsx`, `CoinHeader.jsx`, `FavoritesPage.jsx`, `NotFoundPage.jsx`, `AppErrorBoundary.jsx` (ремонт 14:43 за Red-Team №8, TD-023 частково); тести — `parse.test.js`, `lib.test.js`, `ui.test.jsx`, `App.navigation.test.jsx`, `src/test/setup.js` (заглушка `scrollTo`). Red-Team прохід №8 — PASS, D, P2 = 13 (TD-021 вирішено, нові TD-022, TD-023); `.agentic/evidence/debt-checks.md` — розділ Revise №5. TD-021 — код не змінено, документи приведено до коду запитом на зміну №5 (етапи 3, 4, 6, окремі гейти). Скіл `verify`: крок 6 і `.claude/skills/verify/logo-focus-check.mjs` (не відстежуються; для скрипта — підтвердити на гейті, рішення 04:41 називає лише `SKILL.md`). Ретест 8.a (статуси BUG-003, BUG-009, докази, тест-план) — не в коміті етапу 7, див. 7.1.

**Revise №6 (головний агент, без воркерів — 3 малі правки; рішення власника 2026-11-04 00:11, пункти 1, 2, 5):**

- BUG-010 (Major / P1): `index.html` — прибрано `<link rel="preload" as="fetch">` топ-50 (WebKit повторно віддавав його відповідь, повтори й «Спробувати ще раз» не доходили до джерела).
- BUG-011 (Minor / P3): `src/features/favorites-view/model.js` — `safariText` дослівно за UX §5.2 `safari.text`.
- TD-023: `src/app/FocusOnNavigate.jsx` — лише після повернення зі сторінки монети до списку фокус (`preventScroll`) на посиланні цієї монети, якщо воно в межах екрана (TD-025, знахідка Red-Team №9, закрито тут же), інакше h1; на інших екранах (зокрема вкладка «Обрані») — h1 (рев'ю №9, WARNING). Тести — `src/app/App.navigation.test.jsx` (4 нові, 2 оновлені).
- Поза зоною етапу 7 (зона 8.b, рішення власника 00:11, п. 1): `e2e/us-8.e2e.spec.js` — знято `test.fail` і гілку WebKit; `e2e/support/app.js` — `page.goto` знову чекає `load`.
- Документи: `.agentic/evidence/red-team-report.md` (прохід №9), `debt-checks.md` (розділ Revise №6), `walkthrough.md` (розділ 7), `.agentic/tech-debt.md` (TD-020 уточнено; TD-023, TD-025 закрито; TD-024 новий), `.agentic/autonomy-journal.md`. Статуси `.agentic/qa/bugs/BUG-010.md`, `BUG-011.md` (зона 8.a) не змінено: «Fixed» / ретест фіксує Revise 8.a (рев'ю №9, BLOCKER).
- Скіл `verify` (не відстежується, `.git/info/exclude`): крок 3 — перевірка «без `preload`», крок 6 — `mouseBackLink`, `browserBack`, `keyboardBack`, `favoritesBack` (TD-023, TD-025) і вбудовані очікування (`OK` / `FAIL`, `CHECKS N/N`, код виходу 1 при розбіжності — рев'ю №9); бекапи — у scratchpad сесії.

## 4. Докази працездатності (Verification Evidence)

### 4.0. Валюта довіри (Trust Receipt)

Рядки з позначкою «(Revise №6)» — прогони після BUG-010, BUG-011, TD-023, TD-025 і обмеження фокуса списком за рев'ю №9 (2026-11-04 00:24 – 00:53). Рядки з позначкою «(Revise №5)» — прогони після BUG-003, BUG-009, фокуса й ремонту рамки (2026-11-03 14:22 – 14:54); рядки з позначкою «(Revise №4)» — прогони після ремонту BUG-001, 002, 004–008 (2026-11-03); інші рядки — первинний прогін етапу (коміт `8645c76`), у цьому проході не повторювались.

| Перевірка | Команда | Код виходу | Лічильники | Повторив рев'юер | Примітка |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Валідатор етапу | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 7 --run` | 0 | 24 PASS, 0 FAIL, 1 WARN (приховані сценарії власника не задано) | ні | запущено 2026-11-03 03:23:15–03:24:21 після вердикту PASS рев'ю №2 і гейту етапу 6 (`8720a04`; оракул збігається з комітом етапу 6); виконав `verify_commands["7"]`, усі `debt_commands`, оракул; вивід — 4.2 |
| Сканер секретів | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --scan-secrets .` | 0 | 152 файли, 0 секретів | так | вивід — 4.2 (03:16:56); 152 = 161 − 11 файлів `.agentic/design-ref/` (тепер ігнорується) + 2 скриншоти; рев'ю №2 — 152 файли, 0 |
| Правила якості | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --check-code .` | 0 | 82 файли, 0 порушень | так | вивід — 4.2 |
| Заморожене встановлення | `pnpm install --frozen-lockfile` | 0 | «Already up to date» | ні | вивід — 4.1 (03:09:11) |
| Типи | — | не застосовно | — | ні | JavaScript без TypeScript (ADR 0001) |
| Лінт | `pnpm lint` (`oxlint --deny-warnings`, складність ≤ 15) | 0 | 0 помилок, 0 попереджень | так | вивід — 4.1 |
| Формат | `pnpm fmt:check` | 0 | 116 файлів | так | вивід — 4.1 |
| Тести | `pnpm test` | 0 | 15 файлів, 236 passed / 0 failed / 0 skipped | так | вивід — 4.1 (Start at 02:54:18) |
| Збірка | `pnpm build` | 0 | JS 105,66 кБ gzip (Vite) | так | вивід — 4.1 |
| Розмір бандла (NFR-5) | `pnpm size` | 0 | 105,08 кБ gzip ≤ 150 | так | вивід — 4.1 |
| Оракул | `pnpm exec vitest run --config acceptance/vitest.config.js` | 0 | 9 файлів, 91 passed / 91 | ні | вивід — 4.1 (Start at 02:54:24); цілісність: оракул збігається з комітом етапу 6 `8720a04` (Revise №3 закомічено 03:23) — `--stage 7 --run`, 4.2 |
| Holdouts | `oracle.holdouts_command` (через `--stage 7 --run`) | не застосовно | — | ні | Первинний прогін: команду не було задано (`verify-gate.py --stage 6`, 01:47:22); власник вирішив не задавати сценарії для етапу 7 (04:41). У Revise №4 команду задала сесія власника — рядок «Holdouts (Revise №4)» нижче: 2 файли, код 0 |
| Виміряний борг | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --debt` | 0 | 8 команд, 7 аспектів | ні | лічильники — `.agentic/evidence/debt-checks.md` (02:56) |
| Red-Team | субагент `red-team-auditor`, проходи №5 (повний) і №6 (вузький) | 0 | PASS; P0 = 0, P1 = 0, P2 = 14; оцінка D | ні | первинний прогін (до Revise №4); поточний стан — рядок «Red-Team (Revise №4)»: P2 = 12; вивід — 4.2; `.agentic/evidence/red-team-report.md` |
| Перевірка в браузері | скіл `verify` (preview 4173, справжній CoinGecko) | 0 | 5 маршрутів; консоль 0; `securitypolicyviolation` 0; прокрутка 0 на 320 px з кожною відкритою підказкою; обидві теми й скриншоти (03:08) | ні | вивід — 4.2 |
| Репетиція відкату | `git worktree add --detach … f689fc3` + `pnpm verify` | 0 | 1 тест каркаса, 68,23 кБ; копію прибрано | ні | вивід — 4.2 |
| Вердикт рев'юера | субагент `independent-reviewer` | 0 | рев'ю №2 — PASS (03:13) | так | вивід — 4.3 |
| Валідатор етапу (Revise №4) | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 7 --run` | 0 | 0 FAIL; звіт, артефакти, оракул, приховані сценарії (2 файли, код 0), Red-Team D ↔ P2 = 12, реєстр 12 з 12, 84 файли правил якості, секрети, `verify_commands["7"]`, 8 команд `debt_commands` | так (без `--run`: єдина помилка — статус аудиту, до вердикту) | після вердикту PASS рев'ю №4 (L-004); повний вивід — 4.2 |
| Тести (Revise №4) | `pnpm verify` | 0 | 16 файлів, 252 passed / 0 failed / 0 skipped; lint 0; fmt 0; JS 105,66 кБ gzip | так | 05:34:45; вивід — 4.1 |
| Оракул (Revise №4) | `pnpm exec vitest run --config acceptance/vitest.config.js` | 0 | 9 файлів, 91 passed | ні | 05:34:45 – 05:35:01; не змінено від коміту етапу 6 `8720a04` |
| Holdouts (Revise №4) | `oracle.holdouts_command` через `--stage 7 --run` | 0 | 2 файли, вміст не показується | ні | 05:47 – 05:48, пробний прогін валідатора |
| Виміряний борг (Revise №4) | `verify-gate.py --debt` + 8 команд окремо | 0 | dup 1,13 %; deadcode 0; boundaries 0 (92 модулі); audit 0 high (2 moderate, TD-001); a11y 40 passed; LCP 905,3 мс, CLS 0, TBT 7,5 мс | ні | 05:35 і 05:43; вивід — `.agentic/evidence/debt-checks.md` |
| Red-Team (Revise №4) | субагент `red-team-auditor`, прохід №7 (вузький) | 0 | PASS; P0 = 0, P1 = 0, P2 = 12; оцінка D | ні | `.agentic/evidence/red-team-report.md` |
| Перевірка в браузері (Revise №4) | вбудований браузер (живий CoinGecko) + `qa8a-retest.mjs` / `qa8a.mjs` (Chromium, фікстура) | 0 | живий 429 без CORS → «Не вдалося отримати ціни», 1 запит; 5 маршрутів 320 px — переповнення 0; фокус на h1; консоль 0, CSP 0 (фікстура) | ні | 05:36 – 05:41; вивід — `.agentic/qa/runs/RUN-2026-11-03-2.md` |
| Сканер секретів (Revise №4) | `verify-gate.py --scan-secrets .` (у складі `--stage 7 --run`) | 0 | 188 файлів, 0 секретів | так | пробний прогін 05:47 |
| Вердикт рев'юера (Revise №4) | субагент `independent-reviewer` | 0 | рев'ю №3 — BLOCKERS FOUND (виправлено), рев'ю №4 — PASS (1 WARNING — TD-021, на гейт) | так | вивід — 4.3 |
| Тести (Revise №5) | `pnpm verify` | 0 | oxlint — без виводу помилок; oxfmt — «All matched files use the correct format», 120 файлів; 16 файлів, 261 passed / 0 failed / 0 skipped; JS 105,93 кБ gzip | частково — рев'ю №6 (Start at 16:25:12): lint 0, fmt 120 файлів, 16 файлів / 261 passed; build і size не повторено (помилка копіювання в dist/ у пісочниці рев'юера; так само рев'ю №5, 16:18:04) | останній прогін 2026-11-03 16:23:09 – 16:23:17 (Start at 16:23:11), EXIT=0; вивід — 4.1, блок «Revise №5» |
| Оракул (Revise №5) | `pnpm exec vitest run --config acceptance/vitest.config.js` | 0 | 9 файлів, 91 passed / 91 | ні | останній прогін 14:53:51 – 14:54:00; вивід — 4.1, блок «Revise №5»; оракул не змінено |
| Сканер секретів (Revise №5) | `verify-gate.py --scan-secrets .` | 0 | 193 файли, 0 секретів | ні | 14:36:42; вивід — 4.2, блок «Revise №5» |
| Правила якості (Revise №5) | `verify-gate.py --check-code .` | 0 | 85 файлів, 0 порушень | ні | 14:36:42; вивід — 4.2, блок «Revise №5» |
| Виміряний борг (Revise №5) | `verify-gate.py --debt`; повтор `deadcode`, `boundaries`, `dup` і `test:a11y` після ремонту рамки | 0 | 8 команд PASS; boundaries 0 (93 модулі); dup 1,30 %; a11y 40 passed (14:44:22 – 14:44:52) | ні | `--debt` 14:36:42 – 14:37:34; повтори boundaries / dup / deadcode 16:22:44 – 16:23:09 (вивід — 4.1, блок «Revise №5»; a11y — 14:44:22 – 14:44:52); `.agentic/evidence/debt-checks.md`, розділ Revise №5 |
| Перевірка в браузері (Revise №5) | скіл `verify`, крок 6: `node .claude/skills/verify/logo-focus-check.mjs` (preview 4173, Chromium, фікстура) | 0 | 50 рядків, «—» у рядку з null; 0 зламаних img, 50 кружків; фокус на h1: мишею `outline: none`, клавіатурою `solid 2px`; прокрутка 1500 → 0 → 1500 (посилання й «Назад»); 320 px — переповнення 0 на 5 маршрутах; консоль 0, CSP 0 | ні | останній прогін 14:44:07 (після ремонту рамки); вивід — 4.2, блок «Revise №5» |
| Red-Team (Revise №5) | субагент `red-team-auditor`, прохід №8 (вузький) | 0 | PASS; P0 = 0, P1 = 0, P2 = 13; оцінка D; TD-021 вирішено (на час проходу №8; закрито 2026-11-03 (гейти 3 `9417669`, 4 `a6719e0`, 6 `f1ac4b5`)), нові TD-022, TD-023 | ні | `.agentic/evidence/red-team-report.md`, «Прохід №8» |
| Валідатор етапу (Revise №5) | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 7 --run` | 0 | 26 PASS, 0 FAIL: оракул, приховані сценарії, Red-Team D ↔ P2 = 13, реєстр 13 з 13, `pnpm verify` і всі `debt_commands` | ні | запущено 2026-11-03 22:21:53 – 22:23:41 після вердикту PASS рев'ю №8 (L-004); вивід — 4.2, блок «Revise №5 — валідатор етапу» |
| Вердикт рев'юера (Revise №5) | субагент `independent-reviewer` | 0 | рев'ю №8 — PASS; рев'ю №5, №6, №7 — BLOCKERS FOUND (виправлено) | ні | рев'ю №6 — до гейтів; після гейтів 3 (`9417669`), 4 (`a6719e0`), 6 (`f1ac4b5`) — рев'ю №7 (BLOCKERS FOUND, виправлено) і рев'ю №8 (PASS, ≈22:20); записи — 4.3 |
| Тести (Revise №6) | `pnpm verify` | 0 | oxlint без помилок; «All matched files use the correct format»; 16 файлів, 265 passed / 0 failed / 0 skipped; NFR-5 106,08 кБ gzip | так — рев'ю №9 (Start at 00:43:17): 264 passed, NFR-5 106,08 кБ (до обмеження фокуса списком) | останній прогін 2026-11-04 00:50:08 (Start at 00:50:10), EXIT=0; вивід — 4.1, блок «Revise №6» |
| Оракул (Revise №6) | `pnpm exec vitest run --config acceptance/vitest.config.js` | 0 | 9 файлів, 91 passed / 91 | ні | 00:51:32 (Start at 00:51:33), EXIT=0; оракул не змінено; вивід — 4.1, блок «Revise №6» |
| E2E (Revise №6) | `pnpm exec playwright test -c e2e/playwright.config.js`; `--grep @smoke`; US-8 WebKit `--repeat-each=5` | 0 | 279 passed, 3 skipped (без карантину WebKit); smoke 39 passed; US-8 WebKit × 5 — 50 passed | так — рев'ю №9: повний набір 279 passed, 3 skipped | повний — 00:50:15, smoke — 00:51:10 (EXIT=0 кожен); US-8 × 5 — 00:25:45 – 00:26:05; вивід — 4.1 |
| Виміряний борг (Revise №6) | `verify-gate.py --debt`; лічильники окремо | 0 | 8 команд PASS; dup 1,20 %; deadcode 0; boundaries 0; audit 0 high (2 moderate, TD-001); a11y 40 passed; LCP 906,0 мс, CLS 0, TBT 6,5 мс | ні | останній `--debt` 00:51:42 – 00:52:31 (після обмеження фокуса), лічильники 00:52:34 – 00:53:20; `.agentic/evidence/debt-checks.md`, розділ Revise №6 |
| Сканер секретів (Revise №6) | `verify-gate.py --scan-secrets .` | 0 | 213 файлів, 0 секретів | так — рев'ю №9 (у складі `--stage 7`): 213, 0 | 00:40:55; вивід — 4.2, блок «Revise №6» |
| Правила якості (Revise №6) | `verify-gate.py --check-code .` | 0 | 85 файлів, 0 порушень | так — рев'ю №9 (у складі `--stage 7`): 85, 0 | 00:40:55; вивід — 4.2, блок «Revise №6» |
| Перевірка в браузері (Revise №6) | скіл `verify`, крок 6: `node .claude/skills/verify/logo-focus-check.mjs` (preview 4173, Chromium, фікстура; скрипт сам звіряє 21 очікування й повертає 1 при розбіжності) | 0 | CHECKS 21/21: фокус після повернення до списку на посиланні монети (мишею `outline: none`, клавіатурою `solid`, на екрані, `scrollY` збережено); 50 обраних → остання → «Назад» — h1; 0 зламаних img, 50 кружків; 320 px — переповнення 0 на 5 маршрутах; консоль 0, CSP 0; `dist/index.html` — `preload` 0, CSP 1 | ні | останній прогін 00:49:45, EXIT=0; вивід — 4.2, блок «Revise №6» |
| Red-Team (Revise №6) | субагент `red-team-auditor`, прохід №9 (вузький) | 0 | PASS; P0 = 0, P1 = 0, P2 = 14 → після ремонту TD-025 головним агентом — 13 (повторного проходу не було); оцінка D; TD-023, TD-025 закрито; новий TD-024; TD-020 не закрито | ні | `.agentic/evidence/red-team-report.md`, «Прохід №9» (9.7 — ремонт TD-025 і обмеження списком) |
| Holdouts (Revise №6) | `oracle.holdouts_command` через `--stage 7 --run` | 0 | 2 файли, вміст не показується | ні | 2026-11-04 00:58:16 – 00:59:24, у складі валідатора після вердикту PASS рев'ю №10 (L-004); вивід — 4.2, блок «Revise №6 — валідатор етапу» |
| Валідатор етапу (Revise №6) | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 7 --run` | 0 | 26 PASS, 0 FAIL: передумови, статус аудиту, «Валюта довіри» 46 перевірок, оракул незмінний і зелений, приховані сценарії (2 файли, код 0), Red-Team D ↔ P2 = 13, реєстр 13 з 13, правила якості 85, секрети, `pnpm verify` і 8 `debt_commands` | ні | 2026-11-04 00:58:16 – 00:59:24 після вердикту PASS рев'ю №10 (L-004); вивід — 4.2, блок «Revise №6 — валідатор етапу» |
| Вердикт рев'юера (Revise №6) | субагент `independent-reviewer` | 0 | рев'ю №10 — PASS (1 WARNING — LCP у секції 5, виправлено); рев'ю №9 — BLOCKERS FOUND (виправлено) | так | рев'ю №10 ≈00:57 (vitest 00:56:27); записи — 4.3 |

### 4.1. Збірка, лінтери та автоматичні тести

**Revise №5** (2026-11-03, уривки останнього прогону):
```text
$ pnpm verify            (start 2026-11-03 14:36:25, end 14:36:32)
 Test Files  16 passed (16)
      Tests  261 passed (261)
NFR-5: JS головного екрана 105.88 kB gzip (ліміт 150 kB)
EXIT=0
$ pnpm exec vitest run --config acceptance/vitest.config.js   (14:36:32 – 14:36:42)
 Test Files  9 passed (9)
      Tests  91 passed (91)
EXIT=0
$ python verify-gate.py --debt   (14:36:42 – 14:37:34)
✅ [PASS] Команда успішна: pnpm lint
✅ [PASS] Команда успішна: pnpm dup
✅ [PASS] Команда успішна: pnpm deadcode
✅ [PASS] Команда успішна: pnpm boundaries
✅ [PASS] Команда успішна: pnpm audit --audit-level high
✅ [PASS] Команда успішна: pnpm sbom:write
✅ [PASS] Команда успішна: pnpm test:a11y
✅ [PASS] Команда успішна: pnpm vitals
✅ [PASS] debt_commands: 7 аспектів задано
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
# останній прогін після ремонту рамки фокуса й scrollRestoration (Red-Team №8, TD-023 частково):
$ pnpm verify   (start 2026-11-03 14:53:43, end 14:53:51)
$ pnpm lint && pnpm fmt:check && pnpm test && pnpm build && pnpm size
$ oxlint --deny-warnings
$ oxfmt --check
All matched files use the correct format.
Finished in 179ms on 120 files using 24 threads.
 Test Files  16 passed (16)
      Tests  261 passed (261)
NFR-5: JS головного екрана 105.93 kB gzip (ліміт 150 kB)
EXIT=0
$ pnpm exec vitest run --config acceptance/vitest.config.js   (14:53:51 – 14:54:00)
 Test Files  9 passed (9)
      Tests  91 passed (91)
EXIT=0
$ pnpm test:a11y   (14:44:22 – 14:44:52)
  40 passed (19.1s)
EXIT=0
$ pnpm deadcode   (14:45:38) → лише «Configuration hints (1): .css knip.json …» — EXIT=0
# повтор 2026-11-03 16:22:44 – 16:23:17 (з EXIT= і часом кожного прогону):
$ pnpm boundaries (16:22:44 – 16:22:50) → ✔ no dependency violations found (93 modules, 238 dependencies cruised) — EXIT=0
$ pnpm dup        (16:22:50 – 16:22:52) → Total: 74 файли, 5912 рядків, 8 клонів, 65 рядків (1.10%), 543 токени (1.30%) — EXIT=0
$ pnpm deadcode   (16:22:52 – 16:23:09) → «Configuration hints (1)» — EXIT=0
$ pnpm verify     (16:23:09 – 16:23:17, Start at 16:23:11) → «All matched files use the correct format.»; Test Files 16 passed (16); Tests 261 passed (261); NFR-5: JS головного екрана 105.93 kB gzip (ліміт 150 kB) — EXIT=0
# vitals після ремонту рамки не повторено (зміна — лише класи CSS); останній прогін — у складі --debt 14:36:42 – 14:37:34 (вище): ✅ [PASS] pnpm vitals; окремий прогін до того: LCP 906.170 мс, CLS 0.000, TBT 5.500 мс
```

**Revise №4:**

```text
$ date: 2026-11-03 05:34:45
$ pnpm verify
EXIT=0
$ oxlint --deny-warnings
 Test Files  16 passed (16)
      Tests  252 passed (252)
dist/assets/index-B4e6vtFN.js                                 343.03 kB │ gzip: 106.25 kB
✓ built in 189ms
NFR-5: JS головного екрана 105.66 kB gzip (ліміт 150 kB)
$ pnpm exec vitest run --config acceptance/vitest.config.js
 Test Files  9 passed (9)
      Tests  91 passed (91)
EXIT=0
$ date: 2026-11-03 05:35:01
$ date: 2026-11-03 05:55:17
$ pnpm fmt:check
All matched files use the correct format.
Finished in 174ms on 118 files using 24 threads.
EXIT=0
```

**Первинний прогін етапу:**

```text
$ pnpm install --frozen-lockfile   (2026-11-03 03:09:11)
Already up to date
Done in 260ms using pnpm v11.23.0
EXIT=0

$ pnpm install --frozen-lockfile && pnpm verify   (2026-11-03 02:54)
$ pnpm lint && pnpm fmt:check && pnpm test && pnpm build && pnpm size
$ oxlint --deny-warnings
$ oxfmt --check
Checking formatting...
All matched files use the correct format.
Finished in 183ms on 116 files using 24 threads.
$ vitest run
 RUN  v5.0.5 D:/crypto-radar
 Test Files  15 passed (15)
      Tests  236 passed (236)
   Start at  02:54:18
$ vite build
vite v8.3.5 building client environment for production...
dist/index.html                                                 1.52 kB │ gzip:   0.74 kB
dist/assets/index-DsyQQnWv.css                                 34.82 kB │ gzip:   7.23 kB
dist/assets/index-DCGd_22o.js                                 341.42 kB │ gzip: 105.66 kB
$ node scripts/check-bundle-size.mjs
     0.47 kB gzip  dist\theme-init.js
   104.62 kB gzip  dist\assets\index-DCGd_22o.js
NFR-5: JS головного екрана 105.08 kB gzip (ліміт 150 kB)
EXIT=0

$ pnpm exec vitest run --config acceptance/vitest.config.js   (2026-11-03 02:54)
 Test Files  9 passed (9)
      Tests  91 passed (91)
   Start at  02:54:24
EXIT=0
```

**Revise №6 (2026-11-04), останні прогони після обмеження фокуса списком (рев'ю №9):**

```text
$ pnpm verify                                        (00:50:08)
$ oxlint --deny-warnings                             (без помилок)
All matched files use the correct format.
      Tests  265 passed (265)
   Start at  00:50:10
NFR-5: JS головного екрана 106.08 kB gzip (ліміт 150 kB)
EXIT=0
# попередні: 00:24:36 (263 passed, NFR-5 106.01 kB), 00:36:58 (264 passed, після TD-025) — EXIT=0

$ pnpm exec playwright test -c e2e/playwright.config.js --reporter=line      (00:50:15)
  3 skipped
  279 passed (53.7s)
EXIT=0
$ pnpm exec playwright test -c e2e/playwright.config.js --grep @smoke --reporter=line   (00:51:10)
  39 passed (21.5s)
EXIT=0
$ pnpm exec playwright test -c e2e/playwright.config.js --project=webkit e2e/us-8.e2e.spec.js --repeat-each=5   (00:25:45 – 00:26:05)
  50 passed (18.9s)
EXIT=0
$ pnpm exec vitest run --config acceptance/vitest.config.js                  (00:51:32)
      Tests  91 passed (91)
   Start at  00:51:33
EXIT=0
$ pnpm test:a11y                                     (00:52:34 – 00:53:20, разом із dup / boundaries / vitals)
  40 passed (18.8s)
EXIT=0
$ pnpm vitals
OK   LCP: медіана 905.954 мс (поріг ≤ 2500 мс; прогони: 905.954, 902.732, 906.110)
OK   CLS: медіана 0.000  (поріг ≤ 0.1 ; прогони: 0.000, 0.000, 0.000)
OK   TBT: медіана 6.500 мс (поріг ≤ 200 мс; прогони: 7.500, 6.500, 6.000)
EXIT=0

# мутаційні перевірки тестів фокуса (00:49; тимчасова зміна коду, потім відновлено — git diff звірено):
$ (код HEAD) pnpm exec vitest run src/app/App.navigation.test.jsx   → Tests 3 failed | 4 passed (7)   # TD-023 (перший прогін, 00:24)
$ (без inViewport)                                                   → Tests 1 failed | 8 passed (9)   # TD-025
$ (без умови pathname === LIST_PATH)                                 → Tests 1 failed | 8 passed (9)   # вкладка «Обрані» → h1
```

### 4.2. Валідація артефактів, контракту, інфраструктури

**Revise №5 — валідатор етапу (2026-11-03 22:21:53 – 22:23:41, після вердикту PASS рев'ю №8, повний вивід):**

```text
$ python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 7 --run

=== Перевірка етапу: Stage 7 ===
ℹ️  [INFO] Реалізація: хвилі DAG, Red-Team аудит, перевірка в браузері — скіл sdd-delivery
✅ [PASS] Передумови схвалено: 6
ℹ️  [INFO] Перевірка звіту: .agentic/reports/07-implementation-report.md
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 35 перевірок із кодами виходу
✅ [PASS] Карта технологій заповнена (5 рядків)
✅ [PASS] Conventional Commit у секції 7 валідний
✅ [PASS] Артефакт .agentic/evidence/red-team-report.md знайдено
✅ [PASS] Артефакт .agentic/evidence/walkthrough.md знайдено

=== Оракул (приймальні тести) — режим run ===
✅ [PASS] Оракул незмінний від коміту етапу 6 (f1ac4b57)
ℹ️  [INFO] $ pnpm exec vitest run --config acceptance/vitest.config.js
✅ [PASS] Команда успішна: pnpm exec vitest run --config acceptance/vitest.config.js
✅ [PASS] Holdouts: 2 файлів (вміст не показується)
✅ [PASS] Holdouts: код виходу 0

=== Red-Team: оцінка A–F і реєстр боргу ===
✅ [PASS] Enterprise Readiness Score D відповідає знахідкам (P0 = 0, P1 = 0, P2 = 13)
✅ [PASS] Реєстр боргу .agentic/tech-debt.md: усі знахідки P2 (13) на місці

=== Правила якості коду: . ===
✅ [PASS] Перевірено файлів: 85, порушень-помилок немає

=== Сканування секретів: . ===
ℹ️  [INFO] Проскановано файлів: 193
✅ [PASS] Відкритих секретів не виявлено

=== Команди перевірки етапу 7 ===
ℹ️  [INFO] $ pnpm install --frozen-lockfile
✅ [PASS] Команда успішна: pnpm install --frozen-lockfile
ℹ️  [INFO] $ pnpm verify
✅ [PASS] Команда успішна: pnpm verify

=== Виміряний технічний борг (debt_commands) ===
ℹ️  [INFO] $ pnpm lint
✅ [PASS] Команда успішна: pnpm lint
ℹ️  [INFO] $ pnpm dup
✅ [PASS] Команда успішна: pnpm dup
ℹ️  [INFO] $ pnpm deadcode
✅ [PASS] Команда успішна: pnpm deadcode
ℹ️  [INFO] $ pnpm boundaries
✅ [PASS] Команда успішна: pnpm boundaries
ℹ️  [INFO] $ pnpm audit --audit-level high
✅ [PASS] Команда успішна: pnpm audit --audit-level high
ℹ️  [INFO] $ pnpm sbom:write
✅ [PASS] Команда успішна: pnpm sbom:write
ℹ️  [INFO] $ pnpm test:a11y
✅ [PASS] Команда успішна: pnpm test:a11y
ℹ️  [INFO] $ pnpm vitals
✅ [PASS] Команда успішна: pnpm vitals
✅ [PASS] debt_commands: 7 аспектів задано

УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

**Revise №4 — пробний прогін валідатора, уривок** (2026-11-03 05:47:10 – 05:48:18, ще зі старою шапкою `PASS` рев'ю №2; рядок «pnpm lint / … / pnpm vitals» зведено вручну з 8 окремих рядків PASS). Повний вивід фінального прогону — після вердикту рев'ю (L-004), нижче в цьому розділі:

```text
✅ [PASS] Передумови схвалено: 6
✅ [PASS] «Валюта довіри»: 17 перевірок із кодами виходу
✅ [PASS] Оракул незмінний від коміту етапу 6 (8720a047)
✅ [PASS] Команда успішна: pnpm exec vitest run --config acceptance/vitest.config.js
✅ [PASS] Holdouts: 2 файлів (вміст не показується)
✅ [PASS] Holdouts: код виходу 0
✅ [PASS] Enterprise Readiness Score D відповідає знахідкам (P0 = 0, P1 = 0, P2 = 12)
✅ [PASS] Реєстр боргу .agentic/tech-debt.md: усі знахідки P2 (12) на місці
✅ [PASS] Перевірено файлів: 84, порушень-помилок немає
ℹ️  [INFO] Проскановано файлів: 188
✅ [PASS] Відкритих секретів не виявлено
✅ [PASS] Команда успішна: pnpm install --frozen-lockfile
✅ [PASS] Команда успішна: pnpm verify
✅ [PASS] Команда успішна: pnpm lint / pnpm dup / pnpm deadcode / pnpm boundaries / pnpm audit --audit-level high / pnpm sbom:write / pnpm test:a11y / pnpm vitals
✅ [PASS] debt_commands: 7 аспектів задано
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

**Revise №4 — фінальний прогін валідатора після вердикту PASS рев'ю №4 (повний вивід):**

```text
$ date: 2026-11-03 05:57:55
$ python verify-gate.py --stage 7 --run
=== Перевірка етапу: Stage 7 ===
ℹ️  [INFO] Реалізація: хвилі DAG, Red-Team аудит, перевірка в браузері — скіл sdd-delivery
✅ [PASS] Передумови схвалено: 6
ℹ️  [INFO] Перевірка звіту: .agentic/reports/07-implementation-report.md
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 26 перевірок із кодами виходу
✅ [PASS] Карта технологій заповнена (5 рядків)
✅ [PASS] Conventional Commit у секції 7 валідний
✅ [PASS] Артефакт .agentic/evidence/red-team-report.md знайдено
✅ [PASS] Артефакт .agentic/evidence/walkthrough.md знайдено
=== Оракул (приймальні тести) — режим run ===
✅ [PASS] Оракул незмінний від коміту етапу 6 (8720a047)
ℹ️  [INFO] $ pnpm exec vitest run --config acceptance/vitest.config.js
✅ [PASS] Команда успішна: pnpm exec vitest run --config acceptance/vitest.config.js
✅ [PASS] Holdouts: 2 файлів (вміст не показується)
✅ [PASS] Holdouts: код виходу 0
=== Red-Team: оцінка A–F і реєстр боргу ===
✅ [PASS] Enterprise Readiness Score D відповідає знахідкам (P0 = 0, P1 = 0, P2 = 12)
✅ [PASS] Реєстр боргу .agentic/tech-debt.md: усі знахідки P2 (12) на місці
=== Правила якості коду: . ===
✅ [PASS] Перевірено файлів: 84, порушень-помилок немає
=== Сканування секретів: . ===
ℹ️  [INFO] Проскановано файлів: 190
✅ [PASS] Відкритих секретів не виявлено
=== Команди перевірки етапу 7 ===
ℹ️  [INFO] $ pnpm install --frozen-lockfile
✅ [PASS] Команда успішна: pnpm install --frozen-lockfile
ℹ️  [INFO] $ pnpm verify
✅ [PASS] Команда успішна: pnpm verify
=== Виміряний технічний борг (debt_commands) ===
ℹ️  [INFO] $ pnpm lint
✅ [PASS] Команда успішна: pnpm lint
ℹ️  [INFO] $ pnpm dup
✅ [PASS] Команда успішна: pnpm dup
ℹ️  [INFO] $ pnpm deadcode
✅ [PASS] Команда успішна: pnpm deadcode
ℹ️  [INFO] $ pnpm boundaries
✅ [PASS] Команда успішна: pnpm boundaries
ℹ️  [INFO] $ pnpm audit --audit-level high
✅ [PASS] Команда успішна: pnpm audit --audit-level high
ℹ️  [INFO] $ pnpm sbom:write
✅ [PASS] Команда успішна: pnpm sbom:write
ℹ️  [INFO] $ pnpm test:a11y
✅ [PASS] Команда успішна: pnpm test:a11y
ℹ️  [INFO] $ pnpm vitals
✅ [PASS] Команда успішна: pnpm vitals
✅ [PASS] debt_commands: 7 аспектів задано
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
$ date: 2026-11-03 05:59:03
```

**Revise №4 — живий браузер (BUG-001):** `curl` 05:38:33 → `HTTP/1.1 429 Too Many Requests`, `Retry-After: 43`, без `Access-Control-Allow-Origin`; сторінка 05:38:41 → `{"alert":["Не вдалося отримати ціни"],"online":true,"prices":false,"reqs":["top50 status=0 start=14ms"],"sinceLoadMs":24394}` (до ремонту — «Немає з'єднання» і 3 запити, 04:53:14).

**Первинний прогін етапу:**

**Валідатор етапу після вердикту рев'ю №2 і гейту етапу 6 (2026-11-03 03:23:15–03:24:21):**

```text
$ python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 7 --run
=== Перевірка етапу: Stage 7 ===
ℹ️  [INFO] Реалізація: хвилі DAG, Red-Team аудит, перевірка в браузері — скіл sdd-delivery
✅ [PASS] Передумови схвалено: 6
ℹ️  [INFO] Перевірка звіту: .agentic/reports/07-implementation-report.md
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 17 перевірок із кодами виходу
✅ [PASS] Карта технологій заповнена (5 рядків)
✅ [PASS] Conventional Commit у секції 7 валідний
✅ [PASS] Артефакт .agentic/evidence/red-team-report.md знайдено
✅ [PASS] Артефакт .agentic/evidence/walkthrough.md знайдено
=== Оракул (приймальні тести) — режим run ===
✅ [PASS] Оракул незмінний від коміту етапу 6 (8720a047)
ℹ️  [INFO] $ pnpm exec vitest run --config acceptance/vitest.config.js
✅ [PASS] Команда успішна: pnpm exec vitest run --config acceptance/vitest.config.js
⚠️  [WARN] Holdouts не задано (.agentic/holdouts/ порожній): рекомендовано кілька прихованих сценаріїв
=== Red-Team: оцінка A–F і реєстр боргу ===
✅ [PASS] Enterprise Readiness Score D відповідає знахідкам (P0 = 0, P1 = 0, P2 = 14)
✅ [PASS] Реєстр боргу .agentic/tech-debt.md: усі знахідки P2 (14) на місці
=== Правила якості коду: . ===
✅ [PASS] Перевірено файлів: 82, порушень-помилок немає
=== Сканування секретів: . ===
ℹ️  [INFO] Проскановано файлів: 152
✅ [PASS] Відкритих секретів не виявлено
=== Команди перевірки етапу 7 ===
ℹ️  [INFO] $ pnpm install --frozen-lockfile
✅ [PASS] Команда успішна: pnpm install --frozen-lockfile
ℹ️  [INFO] $ pnpm verify
✅ [PASS] Команда успішна: pnpm verify
=== Виміряний технічний борг (debt_commands) ===
ℹ️  [INFO] $ pnpm lint
✅ [PASS] Команда успішна: pnpm lint
ℹ️  [INFO] $ pnpm dup
✅ [PASS] Команда успішна: pnpm dup
ℹ️  [INFO] $ pnpm deadcode
✅ [PASS] Команда успішна: pnpm deadcode
ℹ️  [INFO] $ pnpm boundaries
✅ [PASS] Команда успішна: pnpm boundaries
ℹ️  [INFO] $ pnpm audit --audit-level high
✅ [PASS] Команда успішна: pnpm audit --audit-level high
ℹ️  [INFO] $ pnpm sbom:write
✅ [PASS] Команда успішна: pnpm sbom:write
ℹ️  [INFO] $ pnpm test:a11y
✅ [PASS] Команда успішна: pnpm test:a11y
ℹ️  [INFO] $ pnpm vitals
✅ [PASS] Команда успішна: pnpm vitals
✅ [PASS] debt_commands: 7 аспектів задано
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0) (попереджень: 1)
EXIT=0
```


```text
$ python verify-gate.py --scan-secrets .   (2026-11-03 03:16:56)
ℹ️  [INFO] Проскановано файлів: 152
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)

$ python verify-gate.py --check-code .   (2026-11-03 02:57)
✅ [PASS] Перевірено файлів: 82, порушень-помилок немає
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)

$ python verify-gate.py --debt   (2026-11-03 02:56)
✅ [PASS] Команда успішна: pnpm lint / pnpm dup / pnpm deadcode / pnpm boundaries /
          pnpm audit --audit-level high / pnpm sbom:write / pnpm test:a11y / pnpm vitals
✅ [PASS] debt_commands: 7 аспектів задано
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
  dup 6 клонів 0,85 %; deadcode 0; boundaries 0 (90 модулів, 224 залежності); audit 0 high/critical, 2 moderate;
  test:a11y 40 passed; vitals LCP 905,8 мс, CLS 0,000, TBT 6,0 мс

Перевірка в браузері (скіл verify, 2026-11-03 02:55, preview http://localhost:4173/crypto-radar/, справжній CoinGecko):
  мобільна емуляція 320×640 (UA Mobile, clientWidth 320):
    #/            h1 «Топ-50 монет»          прокрутка 0; 4 підказки по черзі — max 0
    #/coin/tether h1 «Tether»                прокрутка 0; 6 підказок — max 0
    #/coin/bitcoin h1 «Bitcoin»              прокрутка 0; 5 підказок — max 0
    #/favorites   h1 «Обрані»                прокрутка 0
    #/abc         h1 «Сторінку не знайдено»  прокрутка 0
  консоль: No console logs; securitypolicyviolation: [] ; document.cookie: "" ; localStorage: crypto-radar:favorites
  теми й шрифти на поточній збірці (03:08, 360×760, мобільна емуляція):
    світла (#/):            фон rgb(247, 245, 251), прокрутка 0 — .agentic/evidence/screens/s1-list-light-360.jpg
    темна (#/coin/bitcoin): фон rgb(21, 18, 31), прокрутка 0 — .agentic/evidence/screens/s2-coin-dark-360.jpg
    шрифти (document.fonts): Onest 400, Onest 500, Onest 600, Unbounded 600
    завантажені файли шрифтів (performance, transferSize, Б): onest-latin-400 15048, onest-cyrillic-400 6980,
      onest-latin-500 15648, onest-cyrillic-500 7168, onest-latin-600 15712, onest-cyrillic-600 7140,
      unbounded-latin-600 21252, unbounded-cyrillic-600 12816, onest-symbols-400 8480, onest-symbols-500 8796
      — 10 файлів, 119 040 Б; підмножина symbols — для гліфів ★ ▲ ▼; інших підмножин браузер не вантажив
    консоль: No console logs
  асети (curl): /, theme-init.js, favicon.svg, manifest.webmanifest, icons/*.png, assets/* — 200

Репетиція відкату (2026-11-03 01:04):
  git worktree add --detach <scratchpad>/rollback-f689fc3 f689fc3 → HEAD f689fc3, 0 змін
  pnpm install --frozen-lockfile && pnpm verify → EXIT=0 (Tests 1 passed; NFR-5 68.23 kB)
  копію видалено (Remove-Item \\?\…), git worktree prune → git worktree list: D:/crypto-radar 871334b [main]

Red-Team (`.agentic/evidence/red-team-report.md`): проходи №1–№4 FAIL (D), №5 PASS — VERDICT: PASS,
  Enterprise Readiness Score: D, P0 = 0 · P1 = 0 · P2 = 14 (формула 13.2: P2 ≥ 10 → D).
  Прохід №6 (вузький, після ремонту підказок від clientWidth, Start at 02:58:57) — VERDICT: PASS, D,
  P0 = 0 · P1 = 0 · P2 = 14; таблиця «Знахідки» без змін; RT-2 закрито по суті (телефон і ПК).
```

**Revise №5 — сканер, правила якості й браузер:**
```text
$ python verify-gate.py --scan-secrets .   (14:36:42)
ℹ️  [INFO] Проскановано файлів: 193
✅ [PASS] Відкритих секретів не виявлено
EXIT=0
$ python verify-gate.py --check-code .   (14:36:42)
✅ [PASS] Перевірено файлів: 85, порушень-помилок немає
EXIT=0
$ node .claude/skills/verify/logo-focus-check.mjs <scratchpad>   (останній прогін 14:44:07, після ремонту рамки)
list: rows 50, nullRowChange "—\nнемає даних", alert false, brokenImgs 0, imgs 0, fallbacks 50, firstFallback "B"
mouseToCoin: listY 1500, h1 "Ethena USDe", focused true, focusVisible false, outlineStyle none, scrollY 0
coinLogo: img false, fallback "E", size 40
mouseBackLink: h1 "Топ-50 монет", focused true, outlineStyle none, scrollY 1500
browserBack:   h1 "Топ-50 монет", focused true, outlineStyle none, scrollY 1500
keyboard: h1 "Bitcoin", focused true, focusVisible true, outlineStyle solid, outlineWidth 2px, scrollY 0; наступний Tab → "☆Додати в обрані"
nullCoinPage: dash true, spoken ["немає даних за 7 днів", "немає даних"]
desktop: errors [], csp 0
mobile 320 px (iPhone SE, isMobile): #/, #/coin/bitcoin, #/coin/binancecoin, #/favorites, #/abc — overflow 0, broken 0; errors [], csp 0
EXIT=0
```

**Revise №6 (2026-11-04):**

```text
$ python verify-gate.py --scan-secrets .            (00:40:55)
ℹ️  [INFO] Проскановано файлів: 213
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
$ python verify-gate.py --check-code .              (00:40:55)
✅ [PASS] Перевірено файлів: 85, порушень-помилок немає
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)

$ grep -c 'rel="preload"' dist/index.html → 0;  grep -c 'Content-Security-Policy' dist/index.html → 1;  curl → 200

$ node .claude/skills/verify/logo-focus-check.mjs <scratchpad>/r6-shots      (00:49:45, preview 4173)
# дослівно: рядки звірки очікувань (JSON із сирими значеннями — у <scratchpad>/r6-browser.log, вибірка нижче)
OK   list.rows = 50
OK   list.alert = false
OK   list.nullRowChange починається з «—»
OK   list.brokenImgs = 0
OK   list.fallbacks = 50
OK   coinLogo: без img, 40 px
OK   mouseToCoin: фокус h1 без рамки, scrollY 0
OK   mouseBackLink: фокус на посиланні монети без рамки, на екрані, scrollY = listY
OK   browserBack: фокус на посиланні монети без рамки, на екрані, scrollY = listY
OK   keyboard: h1 з рамкою solid 2px
OK   keyboardBack: посилання bitcoin з рамкою, на екрані, scrollY 0
OK   keyboardBackNextTab = «Додати в обрані: Bitcoin»
OK   favoritesBack: фокус на h1 «Обрані», scrollY 0
OK   nullCoinPage: «—» і «немає даних»
OK   desktop: консоль 0, CSP 0
OK   mobile: консоль 0, CSP 0
OK   mobile #/: overflow 0, broken 0
OK   mobile #/coin/bitcoin: overflow 0, broken 0
OK   mobile #/coin/binancecoin: overflow 0, broken 0
OK   mobile #/favorites: overflow 0, broken 0
OK   mobile #/abc: overflow 0, broken 0
CHECKS 21/21
EXIT=0
```

Очікування (крок 6 скіла `verify`) скрипт перевіряє сам і повертає 1 при розбіжності (додано за рев'ю №9). Перший прогін (00:27:07) показав `keyboardBack.inViewport: false`: сценарій прокручував список до 0 і одразу натискав Enter, подія `scroll` не встигала дійти (наступний кадр). У скрипт додано паузу 300 мс; поведінка застосунку від цього не залежить.

**Revise №6 — валідатор етапу:**

```text
$ python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 7 --run      (2026-11-04 00:58:16 – 00:59:24)
✅ [PASS] Передумови схвалено: 6
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 46 перевірок із кодами виходу
✅ [PASS] Карта технологій заповнена (5 рядків)
✅ [PASS] Conventional Commit у секції 7 валідний
✅ [PASS] Артефакт .agentic/evidence/red-team-report.md знайдено
✅ [PASS] Артефакт .agentic/evidence/walkthrough.md знайдено
✅ [PASS] Оракул незмінний від коміту етапу 6 (f1ac4b57)
✅ [PASS] Команда успішна: pnpm exec vitest run --config acceptance/vitest.config.js
✅ [PASS] Holdouts: 2 файлів (вміст не показується)
✅ [PASS] Holdouts: код виходу 0
✅ [PASS] Enterprise Readiness Score D відповідає знахідкам (P0 = 0, P1 = 0, P2 = 13)
✅ [PASS] Реєстр боргу .agentic/tech-debt.md: усі знахідки P2 (13) на місці
✅ [PASS] Перевірено файлів: 85, порушень-помилок немає
✅ [PASS] Відкритих секретів не виявлено
✅ [PASS] Команда успішна: pnpm install --frozen-lockfile
✅ [PASS] Команда успішна: pnpm verify
✅ [PASS] Команда успішна: pnpm lint
✅ [PASS] Команда успішна: pnpm dup
✅ [PASS] Команда успішна: pnpm deadcode
✅ [PASS] Команда успішна: pnpm boundaries
✅ [PASS] Команда успішна: pnpm audit --audit-level high
✅ [PASS] Команда успішна: pnpm sbom:write
✅ [PASS] Команда успішна: pnpm test:a11y
✅ [PASS] Команда успішна: pnpm vitals
✅ [PASS] debt_commands: 7 аспектів задано
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

### 4.3. Вердикт незалежного аудиту (`independent-reviewer`)

**Рев'ю №10 (поточний вердикт Revise №6): PASS**

```text
PASS — independent-reviewer, 2026-11-04 ≈00:57 (`date` відхилено хуком read-only; час — за стартом vitest 00:56:27), Stage 7, Revise №6, рев'ю №10.
Закриття рев'ю №9: (1) BLOCKER закрито — BUG-010.md / BUG-011.md немає ні в 7.1, ні в 7.2; `git diff HEAD -- .agentic/qa` порожній. (2) Секція 5 — NFR-5 106,08 кБ; секція 3 — проходи №1–№9, TD-001 – TD-025. (3) FocusOnNavigate.jsx: fromCoinId лише при pathname === LIST_PATH і previous.startsWith("/coin/"); тест «зі сторінки монети на вкладку «Обрані» → h1» є; у App.navigation.test.jsx 9 тестів (збігається з «1 failed | 8 passed (9)»). (4) logo-focus-check.mjs (.git/info/exclude:12) звіряє 21 очікування (OK/FAIL, CHECKS, process.exit(failed ? 1 : 0)); рядки 4.2 дослівно відповідають рядкам скрипта, mobile #/coin/binancecoin = M[3] фікстури; в 4.1 / 4.2 є EXIT=. (5) Секція 6, 7.1 і п. 2 гейту — лише Revise 8.b для e2e/. (7) debt-checks.md: --debt 00:51:42 – 00:52:31 після останньої правки коду (00:46 – 00:49), EXIT=0.
Валідатор: verify-gate.py --stage 7 — код 1, єдина помилка — «Статус аудиту» (очікувано до вердикту); «Передумови схвалено: 6»; «Валюта довіри» — 46 перевірок; Conventional Commit валідний; «Оракул незмінний від коміту етапу 6 (f1ac4b57)»; Red-Team D ↔ P0 = 0, P1 = 0, P2 = 13; реєстр — 13 з 13.
Межі етапу: git status — 17 рядків, однаковий до й після повторного запуску. 11 файлів у зоні етапу 7 збігаються з git add 7.2 (index.html, FocusOnNavigate.jsx, App.navigation.test.jsx, favorites-view/model.js, 3 файли evidence, autonomy-journal, tech-debt, звіт, pipeline-state). Поза комітом: e2e/us-8.e2e.spec.js, e2e/support/app.js (зона 8.b, рішення власника 00:11 п. 1, далі Revise 8.b); файли 01–02 — лише закінчення рядків (git diff --stat HEAD їх не показує).
Секрети: --scan-secrets . (у складі --stage 7) — 213 файлів, 0. Залежності: не застосовно — package.json і pnpm-lock.yaml не змінено. Правила якості: --check-code . — 85 файлів, 0 порушень; .only / .skip / xit / test.fail у src, e2e, acceptance, a11y — 0. Контракт: не застосовно — has_http_api: false.
Код: BUG-010 — preload прибрано з index.html, у свіжозібраному dist/index.html preload — 0, CSP — є. BUG-011 — safariText = UX §5.2 safari.text (04-ux-and-contract.md:326). TD-023 / TD-025 — посилання монети лише при поверненні до списку і лише в межах clientHeight, інакше h1.
Повторний запуск pnpm verify (Start at 00:56:27): EXIT 0; oxlint без помилок; oxfmt — 132 файли; Test Files 16 passed, Tests 265 passed; NFR-5 106.08 kB — збігається з 4.0 «Тести (Revise №6)» і 4.1.
Повторив рядки 4.0: «Тести (Revise №6)»; «Сканер секретів (Revise №6)» і «Правила якості (Revise №6)» — у складі --stage 7. Не перевірено повторно (хук read-only / немає браузера): оракул (цілісність — так, прогін — ні), E2E, smoke, US-8 WebKit × 5, --debt, браузер, Red-Team, приховані сценарії, --stage 7 --run.
Валюта довіри (L-004): рядки з кодом 0 мають вивід з EXIT= у 4.1 / 4.2 або в debt-checks.md; приховані сценарії, «Валідатор етапу» і «Вердикт рев'юера» (Revise №6) — «не запускалось»; шапка — «очікує рев'ю». Числа (L-002): 265 passed, NFR-5 106,08, P2 = 13, dup 1,20 % узгоджені. WARNING: у секції 5 для NFR-4 стоїть 906,3 мс (прогін 00:26), а останній прогін дав 905.954 мс. Час (L-005): найпізніша позначка в .agentic/ — 00:55 (трекер), не пізніша за vitest 00:56:27.
Лічильник P2: red-team-report.md — 13 (TD-001, 002, 007, 008, 009, 011, 012, 013, 014, 015, 019, 022, 024) = реєстр tech-debt.md = секція 6; TD-023 і TD-025 закрито, TD-020 відкрито окремо.
Трасування: AC етапу 7 не змінилися (оракул збігається з комітом етапу 6); у секції 5 рядки BUG-010, BUG-011, TD-023 / TD-025 мають реалізацію й перевірку (E2E, Red-Team №9, App.navigation.test.jsx, браузер). Для BUG-011 немає автотесту повного тексту (позначено). TD-025 у браузері перевірено лише через умову pathname (INFO).
INFO: logo-focus-check.mjs `backState` рахує «на екрані» від innerHeight, застосунок — від clientHeight (на десктопі збігаються).
```

**Після рев'ю №10 (автор, 2026-11-04 00:58):** WARNING — секція 5 NFR-4: 906,0 / 0 / 6,5 (останній прогін 00:52); `906,3` лишився лише в red-team-report.md 9.4 (значення проходу №9). INFO — у `.agentic/tech-debt.md` (TD-025) уточнено: гілку `inViewport` покриває тест jsdom, браузерний `favoritesBack` перевіряє умову списку.

**Рев'ю №9 (Revise №6): BLOCKERS FOUND** — виправлено:

```text
BLOCKERS FOUND — independent-reviewer, 2026-11-04 ≈00:45 (`date` відхилено хуком read-only; час — за стартом vitest 00:43:17), Stage 7, Revise №6.
Валідатор: verify-gate.py --stage 7 — код 1, єдина помилка — «Статус аудиту» (очікувана до вердикту); «Передумови схвалено: 6»; «Валюта довіри» — 46 перевірок; Карта технологій — 5 рядків; Conventional Commit валідний; артефакти red-team-report.md і walkthrough.md є; «Оракул незмінний від коміту етапу 6 (f1ac4b57)»; Red-Team D ↔ P0 = 0, P1 = 0, P2 = 13; реєстр — 13 з 13; правила якості — 85 файлів, 0 порушень; секрети — 213 файлів, 0.
BLOCKER: .agentic/qa/bugs/BUG-010.md і BUG-011.md (зона 8.a / 8.b, sdd-delivery §10.6) стоять у 7.1 / 7.2 як файли етапу 7; Revise №5 таких файлів не комітив (8f0f2a5), рішення власника 00:11 їх не згадує.
WARNING: секція 5 — NFR-5 105,08 кБ проти фактичних 106,08; секція 3 :58-59 — проходи №1–№8 і TD-001 – TD-023 (L-002). FocusOnNavigate переносить фокус на посилання після будь-якого переходу з /coin/:id, зокрема після кліку по вкладці «Обрані», а рішення 00:11 п. 5 стосується лише «повернення до списку». У блоках 4.2 браузера й 4.1 smoke немає EXIT=, блок браузера — переформатоване зведення, logo-focus-check.mjs нічого не перевіряє (L-004). e2e/ — зона 8.b (§10.6), правка дозволена власником 00:11 п. 1, у 7.2 файлів немає; варіант «у коміт етапу 7» суперечить §10.6 — лишити тільки шлях Revise 8.b.
Межі етапу: git status — 19 рядків, однаковий до й після повторних запусків. Поза зоною: BUG-010.md і BUG-011.md (BLOCKER), e2e/us-8.e2e.spec.js і e2e/support/app.js (рішення власника, у 7.2 не входять). Файли 01–02 — лише закінчення рядків. .claude/skills/verify/** ігнорує .git/info/exclude:12.
Секрети: --scan-secrets . (у складі --stage 7) — 213 файлів, 0. Залежності: не застосовно. Правила якості: --check-code . — 85 файлів, 0; .only / .skip у src — 0; у e2e лише test.fixme US-10. Контракт: не застосовно — has_http_api: false.
Повторний запуск pnpm verify (Start at 00:43:17): EXIT 0; oxlint 0; oxfmt 132 файли; 16 файлів, 264 passed; NFR-5 106.08 kB — збігається. dist/index.html: preload — 0, Content-Security-Policy — 1.
Повторний запуск pnpm exec playwright test -c e2e/playwright.config.js: EXIT 0; 279 passed, 3 skipped; у WebKit AC-8.1 – AC-8.6 без test.fail зелені.
Повторив рядки 4.0: «Тести», «E2E», «Сканер секретів», «Правила якості» (Revise №6). Не перевірено повторно (хук read-only): оракул (цілісність — так, прогін — ні), smoke, US-8 WebKit × 5, --debt, браузер, Red-Team, приховані сценарії, --stage 7 --run.
Валюта довіри (L-004): рядки прихованих сценаріїв, «Валідатор етапу» і «Вердикт рев'юера» — «не запускалось»; шапка — «очікує рев'ю». Час (L-005): найпізніша позначка 00:42, не пізніша за vitest 00:43:17.
Код: BUG-010 — preload прибрано. BUG-011 — safariText побайтово = UX §5.2. TD-023 / TD-025 — посилання, якщо в межах clientHeight, інакше h1; мутаційні результати відтворено (3 / 7 з HEAD, 1 / 8 без inViewport). Лічильник P2: 13 = реєстр; TD-023 і TD-025 закрито, TD-024 відкрито.
```

**Виправлення після рев'ю №9 (автор, 2026-11-04 00:46 – 00:55):** BLOCKER — правки `.agentic/qa/bugs/BUG-010.md`, `BUG-011.md` скасовано (`git restore`), файли прибрано з 7.1 / 7.2; статус «Fixed» і ретест — Revise 8.a. WARNING 2 — секція 5 NFR-5 106,08 кБ, секція 3 — проходи №1–№9, TD-001 – TD-025. WARNING 3 — фокус на посиланні лише при поверненні до списку (`pathname === LIST_PATH`), новий тест «зі сторінки монети на вкладку «Обрані» → h1» (мутаційна перевірка — 1 failed без умови). WARNING 4 — `logo-focus-check.mjs` звіряє 21 очікування (`OK` / `FAIL`, `CHECKS`, код виходу), у 4.1 і 4.2 — `EXIT=`, блок браузера — дослівний вивід звірки. WARNING 5 — лишено один шлях для `e2e/`: Revise 8.b. INFO 7 — `--debt`, `dup`, `boundaries`, `vitals`, `test:a11y` повторено після останньої правки коду (00:51 – 00:53).


**Рев'ю №8 (поточний вердикт Revise №5):**
```text
Рев'ю №8 (Revise №5): PASS — independent-reviewer, 2026-11-03 ≈22:20 (`date` відхилено хуком read-only; час — за стартом vitest 22:20:08), Stage 7, Revise №5.
Закриття рев'ю №7 підтверджено:
  BLOCKER 1 закрито: секція 1 («Зараз … 3 — 9417669 (17:18), 4 — a6719e0 (19:01), 6 — f1ac4b5 (20:59)»), рядок 4.0 «Вердикт рев'юера (Revise №5)», рядок 4.0 «Red-Team (Revise №5)», секції 3 і 6, текст 7.1 і пункт 1 гейту — у минулому часі з хешами; git log збігається (9417669 17:18, a6719e0 19:01, f1ac4b5 20:59).
  BLOCKER 2 закрито: .agentic/tech-debt.md знову « M»; git diff HEAD — лише рядок TD-021 («закрито 2026-11-03 (гейти 3 9417669, 4 a6719e0, 6 f1ac4b5)») і запис «Оновлення 2026-11-03 22:17» — відповідає 7.1 («у коміт етапу 7 іде лише закриття TD-021»).
  WARNING закрито: «закривається на гейті етапу 3» лишилось лише в історичних записах tech-debt.md з датами (14:35, 14:45), у тексті проходу №8 red-team-report.md (рядки 26, 132, 221; примітка 22:17 — рядок 222) і в записах рев'ю 4.3. «REJECTED_REVISING» щодо етапів 3, 4, 6 у звіті 07, трекері, реєстрі й доказах у поточному стані відсутнє; трекер: «Поточний активний етап» = «Stage 7: Revise №5 (гейт), далі Stage 8.b», рядок 6 — «ddcdf0b, запит №5 — f1ac4b5», запис 22:17 у розділі 4. 7.1 — «01–02».
Валідатор: verify-gate.py --stage 7 — код 1, єдина помилка — «Статус аудиту» (очікувана до вердикту); «Передумови схвалено: 6»; «Валюта довіри» 35 перевірок; Карта технологій 5 рядків; Conventional Commit; артефакти red-team-report.md і walkthrough.md; «Оракул незмінний від коміту етапу 6 (f1ac4b57)»; Red-Team D ↔ P0 = 0, P1 = 0, P2 = 13; реєстр 13 з 13; 85 файлів правил якості — 0; 193 файли — 0 секретів. Лічильник P2 = 13 не зламався: рядок TD-021 у red-team-report.md має першу клітинку «TD-021 (вирішено, прохід №8; …)», яку FINDING_ROW_RE не рахує; статус у tech-debt.md на лічильник не впливає.
Межі етапу: git status — 37 рядків, однаковий до й після повторного запуску. 7.1 / 7.2 = 20 M файлів src + ?? src/ui/CoinLogo.jsx + 5 документів (debt-checks.md, red-team-report.md, 07-implementation-report.md, tech-debt.md, pipeline-state.md) — збігається з git status; поза git add — артефакти 8.a (08-test-plan.md, BUG-003.md, BUG-009.md, 2 PNG), project.json (holdouts_command, сесія власника), .claude/skills/verify/** і 01–02 (у git diff --stat змін вмісту немає) — так і пояснено у 7.1 і пунктах 5–6 гейту. acceptance/, a11y/, package.json, pnpm-lock.yaml, vite.config.js, index.html, 03-architecture.md, 04-ux-and-contract.md, implementation_plan.md, adr/ — git diff --stat HEAD порожній.
Секрети: 193 файли, 0 (у складі --stage 7). Залежності: не застосовно — маніфест і lockfile не змінено. Правила якості: --check-code . — 85 файлів, 0; у src dangerouslySetInnerHTML / innerHTML / eval / new Function / .only / .skip / xit / fit — 0. Контракт: не застосовно — has_http_api: false.
Повторний запуск pnpm verify (Start at 22:20:08): EXIT 0; oxlint 0; oxfmt «All matched files use the correct format», 120 файлів; Test Files 16 passed, Tests 261 passed; vite build ✓, index-fiVsxdXU.js gzip 106.52 kB; NFR-5 105.93 kB ≤ 150 — збігається з 4.0 «Тести (Revise №5)» і 4.1.
Повторив рядки 4.0: «Тести (Revise №5)» (повністю), «Правила якості (Revise №5)» (85 файлів, 0, у складі --stage 7), «Сканер секретів (Revise №5)» (193 файли, 0, у складі --stage 7). Не перевірено повторно (хук read-only): оракул (цілісність — так, прогін — ні), holdouts, --debt, --stage 7 --run, браузер, Red-Team.
Валюта довіри (L-004): «Валідатор етапу (Revise №5)» і «Вердикт рев'юера (Revise №5)» — «не запускалось»; шапка — PENDING. Позначки часу 22:16 / 22:17 у звіті, трекері, реєстрі й red-team-report.md не пізніші за годинник (vitest 22:20:08) (L-005).
Трасування: без змін від рев'ю №7 — BUG-003 (parse.js, format.js, sort.js; parse.test.js, lib.test.js), BUG-009 (src/ui/CoinLogo.jsx; ui.test.jsx), фокус (FocusOnNavigate.jsx; App.navigation.test.jsx); TD-022, TD-023 — відкриті, на гейт (L-003).
INFO: red-team-report.md:26 і :132 — формулювання проходу №8 «закривається на гейті етапу 3» уточнено приміткою 22:17 (рядок 222); перша клітинка рядка 132 потрібна валідатору — не робити її чистим «TD-021».
```

**Рев'ю №7 (Revise №5, після гейтів 3 → 4 → 6):**
```text
Рев'ю №7 (Revise №5): BLOCKERS FOUND — independent-reviewer, 2026-11-03 ≈22:16 (`date` відхилено хуком read-only; час — за стартом vitest 22:15:49), Stage 7, Revise №5.
Валідатор: verify-gate.py --stage 7 — код 1, єдина помилка — «Статус аудиту» (очікувана до вердикту); «Передумови схвалено: 6» — PASS; «Валюта довіри» 35 перевірок; Карта технологій 5 рядків; Conventional Commit; артефакти red-team-report.md і walkthrough.md; «Оракул незмінний від коміту етапу 6 (f1ac4b57)»; Red-Team D ↔ P2 = 13; реєстр 13 з 13; 85 файлів правил якості — 0; 193 файли — 0 секретів.
BLOCKER: секція 1 («Зараз … етапи 3, 4 і 6 — REJECTED_REVISING … --stage 7 падає на передумові Stage 6»), рядок 4.0 «Вердикт рев'юера (Revise №5)», 7.1 і пункт 1 гейту описують гейти 3 → 4 → 6 як майбутні; фактично 9417669 (17:18), a6719e0 (19:01), f1ac4b5 (20:59), передумова — PASS.
BLOCKER: 7.1 / 7.2 містять « M .agentic/tech-debt.md», а файл не змінено — правки Revise №5 (TD-021 – TD-023) закомічено в 9417669; список не збігається з git status.
WARNING: TD-021 — «вирішено, закривається на гейті етапу 3» (tech-debt.md, звіт: рядки 57, 118, 534, 538; red-team-report.md: рядки 26, 132, 221) проти трекера «закрито для етапу 3 / 4 / 6» (L-002); трекер, «Поточний активний етап» — застарілий.
INFO: 7.1 — «specs/reports 01–03» → зараз лише 01–02; project.json, файли 8.a і .claude/skills/verify/** не в git add 7.2 — правильно, пункти 5 і 6 гейту.
Межі етапу: 20 M файлів src + новий src/ui/CoinLogo.jsx і документи debt-checks.md, red-team-report.md, 07-implementation-report.md, pipeline-state.md — у зоні етапу 7; acceptance/, a11y/, package.json, pnpm-lock.yaml, vite.config.js, index.html не змінено від e3fb805 (git diff --stat — порожньо); git status до й після повторних запусків однаковий (37 рядків).
Секрети: 193 файли, 0 (у складі --stage 7); Grep password|secret|token|api_key у src — лише назви монет у фікстурах. Залежності: не застосовно — маніфест і lockfile не змінено. Правила якості: --check-code src — 84 файли, 0; .only / .skip / xit / fit — 0; dangerouslySetInnerHTML / innerHTML / eval / new Function — 0. Контракт: не застосовно — has_http_api: false.
Повторний запуск pnpm verify (Start at 22:15:49): EXIT 0; oxlint 0; oxfmt «All matched files use the correct format», 120 файлів; Test Files 16 passed, Tests 261 passed; vite build ✓, index-fiVsxdXU.js gzip 106.52 kB; NFR-5 105.93 kB — збігається з 4.0 «Тести (Revise №5)» і 4.1 (16:23:11). Build і size цього разу пройшли повністю.
Повторив рядки 4.0: «Тести (Revise №5)» (повністю), «Правила якості» (--check-code src — 84 файли, 0), «Сканер секретів (Revise №5)» (193 файли, 0, у складі --stage 7). Не перевірено повторно (хук read-only): оракул, holdouts, --debt, --stage 7 --run, браузер, Red-Team.
Трасування: BUG-003 — parse.js (null лише для 7д, інше — ShapeError), format.js («—», «немає даних»), sort.js (null у кінці); parse.test.js (2), lib.test.js (рядок таблиці + 1 тест). BUG-009 — src/ui/CoinLogo.jsx (onError → кружок-літера, aria-hidden); ui.test.jsx (3). Фокус — FocusOnNavigate.jsx (preventScroll, прокрутка списку, scrollRestoration manual); App.navigation.test.jsx (2). TD-022, TD-023 — відкриті, на гейт (L-003).
Після вердикту (автор, 2026-11-03 22:17): секція 1 — поточний стан (3, 4, 6 — APPROVED_AND_COMMITTED з хешами); рядки 57, 118, 120, 534, 538, 7.1 і пункт 1 гейту — минулий час із хешами; TD-021 у tech-debt.md — «закрито 2026-11-03 (гейти 3 9417669, 4 a6719e0, 6 f1ac4b5)» (файл знову M, 7.1 / 7.2 правдиві); red-team-report.md — примітка про закриття (текст проходу №8 не змінено); трекер — «Поточний активний етап»; 7.1 — 01–02.
```

**Рев'ю №6 (Revise №5, до гейтів 3 → 4 → 6):**
```text
BLOCKERS FOUND — independent-reviewer, 2026-11-03 ≈16:26 (час за стартом vitest 16:25:12), Stage 7, Revise №5, рев'ю №6.
BLOCKER (знімається лише гейтами попередніх етапів 3 → 4 → 6, не правкою звіту): verify-gate.py --stage 7 — код 1: «Передумова Stage 6 не схвалена … REJECTED_REVISING» (запит на зміну №5); друга помилка — «Статус аудиту» (очікувана до вердикту). Решта перевірок валідатора: «Валюта довіри» 35 перевірок, Conventional Commit, артефакти, «Оракул незмінний від коміту етапу 6 (8720a047)», Red-Team D ↔ P2 = 13, реєстр 13 з 13, 85 файлів правил якості, 193 файли без секретів — PASS.
Виправлення рев'ю №5 перевірено: колонка «Повторив рев'юер» — «частково», збігається з повтором; boundaries / dup / deadcode / verify — блок 4.1 з часом і EXIT= (16:22:44 – 16:23:17); TD-021 — «вирішено, закривається на гейті етапу 3» у звіті, tech-debt.md і red-team-report.md.
WARNING: секція 1 без поточного стану передумов; рев'ю №5 немає в 4.3; debt-checks.md — підпис a11y «до ремонту о 14:45» проти ремонту о 14:43, рядки verify і оракула без часу; рядок 4.0 «Виміряний борг (Revise №5)» — старі часи повторів; змінені артефакти 8.a при статусі APPROVED_AND_COMMITTED — рішення власника до гейту.
Межі етапу: 21 файл src (20 M + новий src/ui/CoinLogo.jsx) і 5 документів — у зоні етапу 7, збігаються з git add 7.2; оракул acceptance/ не змінено.
Секрети: 193 файли, 0. Залежності: не застосовно. Правила якості: 85 файлів, 0; .only / .skip — 0; dangerouslySetInnerHTML / innerHTML / eval — 0; нових доменів немає. Контракт: не застосовно.
Код і тести: BUG-003 — parse.js, format.js, sort.js; parse.test.js (2), lib.test.js (2). BUG-009 — src/ui/CoinLogo.jsx; ui.test.jsx (3). Фокус — FocusOnNavigate.jsx, рамка лише при :focus-visible; App.navigation.test.jsx (2). Залишок — TD-023 (P2, на гейт).
Повторний запуск pnpm verify (Start at 16:25:12): lint 0; oxfmt 120 файлів; 16 файлів, 261 passed; build у пісочниці рев'юера — помилка копіювання в dist/, size не запускався.
Після вердикту (автор, 2026-11-03 16:29): секція 1, записи рев'ю №5 і №6, рядки 4.0 «Тести», «Виміряний борг», «Вердикт рев'юера», час у debt-checks.md виправлено. Блокер передумови лишається до гейтів 3 → 4 → 6.
```

**Рев'ю №5 (2026-11-03 ≈ 16:18):** BLOCKERS FOUND — (1) передумова Stage 6 (знімається гейтами); (2) колонка «Повторив рев'юер» приписувала рев'юеру повтор 14:50:01 без запису; WARNING — TD-021 «закрито», повтори boundaries / dup без EXIT=, підпис a11y. Виправлено 16:22 – 16:23.

**Попередні рев'ю етапу:**
```text
Рев'ю №1 (2026-11-03 03:02): BLOCKERS FOUND — independent-reviewer, Stage 7.
  BLOCKER: уроки трьох спрацювань Circuit Breaker відкладено «на гейт» (контракт §11) → записано L-006 (таблиця «тригер → наслідок», автоматизовано triggers.test.jsx) і L-007 (clientWidth, мобільна емуляція; автоматизовано reflow.a11y.spec.js і скіл verify); урок у секції 7.
  WARNING: шрифти поза планом §4 без рішення власника → секція 6, вимір завантажених файлів у 4.2, пункт гейту; бюджет Red-Team — 6 проходів, ≈ 3,2× → виправлено в звіті, walkthrough і журналі; STRIDE без таблиці → таблиця 17 рядків у red-team-report.md; теми без скриншотів у фінальному прогоні → 4.2 (03:08), .agentic/evidence/screens/; NFR-3 проти P-6 / preload → TD-020; design-ref не ігнорується → .git/info/exclude; перевірки зон ремонтних воркерів не записано → журнал (постфактум); рядок «Заморожене встановлення» без виводу → 4.1.
  INFO: рядок прихованих сценаріїв — посилання на вивід --stage 6, питання на гейті; лічильники оракула в секції 5 — виконані тести (сума 91).
Рев'ю №2 (2026-11-03 03:13): PASS — independent-reviewer, Stage 7.
  Закриття рев'ю №1 підтверджено: L-006 і L-007 записано й автоматизовано (triggers.test.jsx; reflow.a11y.spec.js — isMobile/hasTouch, межа clientWidth), файл уроків у git add 7.2; шрифти — секція 6, 4.2, пункт гейту; бюджет Red-Team — 6 проходів, 953 080 = сума журналу, ≈ 3,2×; STRIDE — 17 рядків; теми й скриншоти 03:07–03:08 (хеш бандла збігається); TD-020; design-ref → .git/info/exclude:9; зони ремонтних воркерів збігаються з git status; вивід pnpm install у 4.1; рядок прихованих сценаріїв і сума оракула 91.
  Межі: 18 нових і 23 змінені файли етапу 7 у зонах плану; файли Revise №3 етапу 6 у git add не входять. Секрети: 152 файли, 0. Залежності: 4 пакети Wave 0 реальні, у lockfile немає чужих хостів. Правила якості: 82 файли, 0; .only/.skip — 0.
  Повторив рядки 4.0: Лінт, Формат, Тести, Збірка, Розмір бандла (pnpm verify — код 0, 236 passed, Start at 03:13:24), Правила якості (82 файли, 0), Сканер секретів (152 файли, 0). Не повторено (хук read-only): оракул, --debt, install, браузер, відкат, Red-Team.
  WARNING (виправлено 2026-11-03 03:17): лічильник сканера 161 → 152 (4.0, 4.2, walkthrough); сума шрифтів 118 040 → 119 040 Б (4.2, секція 6, walkthrough); числа оракула у walkthrough — виконані тести (91), як у секції 5; секція 3 — TD-005 – TD-020.
Рев'ю №3 (Revise №4, ≈05:53 за стартом vitest 05:51:58): BLOCKERS FOUND — independent-reviewer, Stage 7, Revise №4.
  Межі: 18 файлів src (16 M + 2 нові) і 7 документів — у зоні етапу 7, збігаються з git add 7.2; оракул і a11y/ не змінено; specs/ADR за вмістом не змінено. Секрети: 188 файлів, 0. Залежності не змінено. --check-code: 84 файли, 0; .only/.skip — 0; послаблених очікувань немає. Повтор pnpm verify (Start at 05:51:58): EXIT 0, oxfmt 118 файлів, 252 passed, NFR-5 105.66 kB. Виправлення BUG-001, 002, 004–008 відповідають BUG-файлам.
  BLOCKER: секція 6 (P2 = 14; TD-003, TD-005, TD-018 як відкриті й quick wins), секція 3, рядок прихованих сценаріїв 4.0 і пункти 1–6 гейту не оновлено під Red-Team №7 (P2 = 12), реєстр і рішення власника 04:41 (L-002).
  WARNING: пробний вивід валідатора в 4.2 — уривок зі зведеним рядком; TD-021 — код розходиться з UX §3 / P-4 / §7.1 / ADR 0005 до запиту на зміну.
  INFO: «fmt 0» без виводу oxfmt у 4.1; прогалини тестів (ціна < $0,10, онлайн-виняток × тик поллера, гілка MutationObserver).
  Виправлено (05:55): секція 3 (проходи №1–№7, реєстр TD-001 – TD-021, запити №2–№4); секція 6 — «Red-Team №7: P2 = 12», відкриті 12 P2 + TD-020 окремо, TD-003/004/005/018 — закрито; рядки й пункти, вирішені о 04:41, позначено «вирішено власником 2026-11-03 04:41 (трекер)»; рядок прихованих сценаріїв первинного прогону уточнено; рядок Red-Team первинного прогону позначено історичним; блок 4.2 підписано як уривок (повний вивід фінального прогону — після вердикту); у 4.1 додано вивід pnpm fmt:check (05:55:17, 118 файлів, EXIT=0). TD-021 — пункт 3 гейту Revise №4 (до етапу 8.b).
Рев'ю №4 (Revise №4, ≈05:57; `date` відхилено хуком, час — за стартом vitest 05:51:58 і записом виправлень 05:55): PASS — independent-reviewer, Stage 7, Revise №4.
  Закриття рев'ю №3 підтверджено: секція 6 — «Red-Team №7: P2 = 12», 12 відкритих P2 (TD-001, 002, 007, 008, 009, 011, 012, 013, 014, 015, 019, 021) збігаються з таблицею розділу 6 red-team-report.md і з валідатором (12 з 12); TD-020 окремо; TD-003/004/005/018 — закрито; рішення 04:41 позначено «вирішено власником» у секції 6 і в блоці гейту; секція 3 — проходи №1–№7, TD-001 – TD-021; рядки Holdouts і Red-Team первинного прогону уточнено; блок пробного валідатора 4.2 підписано як уривок; вивід pnpm fmt:check (05:55:17, 118 файлів, EXIT=0) у 4.1. «P2 = 14» лишилось лише в історичних блоках первинного прогону.
  Межі етапу: 18 файлів src (16 M + 2 нові) і 7 документів — у зоні етапу 7, збігаються з git add 7.2; оракул acceptance/ і a11y/ не змінено («Оракул незмінний від коміту етапу 6 (8720a047)»); specs/ADR за вмістом не змінено; git status до й після повторних запусків однаковий; diff src після виправлень звіту не змінився (16 файлів, 255+/45−).
  Секрети: --scan-secrets . (у складі --stage 7) — 188 файлів, 0. Залежності: не застосовно — package.json і pnpm-lock.yaml не змінено. Правила якості: --check-code . — 84 файли, 0; .only/.skip/xit — 0; послаблених очікувань у тестах немає. Контракт: не застосовно — has_http_api: false.
  Повторний запуск pnpm verify (Start at 05:51:58): EXIT 0; oxlint 0; oxfmt 118 файлів; Test Files 16 passed, Tests 252 passed; index-B4e6vtFN.js gzip 106.25 kB; NFR-5 105.66 kB — збігається з 4.0 «Тести (Revise №4)» і 4.1. --stage 7 і --report: єдина помилка — «Статус аудиту»; «Валюта довіри» — 26 перевірок.
  Повторив рядки 4.0: «Тести (Revise №4)», «Сканер секретів (Revise №4)», «Правила якості» (84 файли, 0). Не перевірено повторно (хук read-only): оракул, holdouts, --debt і 8 команд боргу, --stage 7 --run, браузер, Red-Team.
  Трасування: BUG-001, 002, 004–008 мають реалізацію й модульні тести (client.test.js — таблиця «тригер × стан», App.navigation.test.jsx, lib.test.js, favorites.test.jsx, PriceChart7d.test.jsx), виправлення відповідають BUG-файлам; BUG-003 — запит на зміну №4.
  WARNING: TD-021 — код розходиться з UX §3 / P-4 / §7.1 / ADR 0005 до запиту на зміну (пункт 3 гейту, до етапу 8.b).
  INFO: прогалини тестів — рівні ціни < $0,10, «онлайн-виняток × тик поллера», гілка MutationObserver у FocusOnNavigate.
  Після рев'ю №4 (05:58): у секції 5 рядок NFR-3 доповнено Red-Team №7; «Вирішено» з великої літери; у секцію 6 і гейт додано BUG-009 (новий дефект ретесту 8.a о 05:56, на рішення власника; код не змінювався).
```

---

## 5. Матриця трасування вимог (Requirements Traceability)

Числа в дужках — виконані тести оракула на файл (зі структур сценаріїв), за JSON-звітом прогону 03:09:20: 17 + 10 + 15 + 5 + 9 + 9 + 9 + 10 + 7 = 91.

| ID вимоги | Вимога | Де реалізовано | Чим перевірено | Статус |
| :--- | :--- | :--- | :--- | :--- |
| `US-1 / AC-1.1 – AC-1.5` | Топ-50, формати, 25 + «Показати більше», ранги 1–50, межі зміни | `src/features/coin-list/**`, `src/lib/format.js`, `src/market-data/parse.js` | оракул `us-1` (17); `lib.test.js`, `CoinListPage.test.jsx`, `parse.test.js` | `✅ Виконано` |
| `US-2 / AC-2.1 – AC-2.8` | Сортування, тай-брейк, без збереження між візитами | `src/lib/sort.js`, `useCoinListView.js` | оракул `us-2` (10); `lib.test.js` (тай-брейк за показаним значенням), `App.navigation.test.jsx` | `✅ Виконано` (Revise №4: BUG-002, BUG-004) |
| `US-3 / AC-3.1 – AC-3.9` | Пошук за назвою й тікером, ≤ 50 символів | `src/lib/index.js`, `SearchStatus.jsx` | оракул `us-3` (15) | `✅ Виконано` |
| `US-4 / AC-4.1 – AC-4.4` | Сторінка монети, графік і текстова альтернатива, поза топ-50 | `src/features/coin-page/**`, `src/chart/**` | оракул `us-4` (5); `CoinPage.test.jsx`, `PriceChart7d.test.jsx` | `✅ Виконано` (Revise №4: підписи днів — BUG-007) |
| `US-5 / AC-5.1 – AC-5.7` | ★ додати / прибрати, без дублів, лише топ-50 | `src/favorites/store.js`, фічі | оракул `us-5` (9); `favorites.test.jsx` | `✅ Виконано` (E-STORE — TD-005 закрито, Revise №4 BUG-006; ім'я ★ — BUG-008) |
| `US-6 / AC-6.1 – AC-6.7` | Обрані між візитами, вибулі, порядок | `src/features/favorites-view/**` | оракул `us-6` (9); `FavoritesPage.test.jsx` | `✅ Виконано` |
| `US-7 / AC-7.1 – AC-7.4` | Підказки, Esc, одна відкрита, без наведення | `src/ui/TermHintButton.jsx`, `hintOffset.js`, `src/glossary/**` | оракул `us-7` (9); `ui.test.jsx`; `a11y/reflow.a11y.spec.js` | `✅ Виконано` (офлайн-старт — TD-019) |
| `US-8 / AC-8.1 – AC-8.8` | Помилки, повтор, межі свіжості 299/300/301 с, Loading | `src/market-data/**`, `ErrorBlock.jsx` | оракул `us-8` (10); `client.test.js`, `useTopCoins.test.jsx`, `triggers.test.jsx` | `✅ Виконано` (класифікація E-NET — TD-018 закрито, Revise №4 BUG-001; BUG-003 — запит на зміну №4) |
| `US-9 / AC-9.1 – AC-9.3` | Дисклеймер, атрибуція, українська | `src/app/Layout.jsx` | оракул `us-9` (7); `App.test.jsx` | `✅ Виконано` (запит №3) |
| `NFR-1` | Ціни ≤ 300 с, Error ≤ 1 с | `useTopCoins.js`, `lib/index.js` (`isFresh`) | оракул AC-8.4/8.5; модульні тести | `✅ Виконано` (TD-009) |
| `NFR-2` | Оновлення 60 с у видимій вкладці | `TopCoinsPoller.jsx` | `triggers.test.jsx`, `focus.test.jsx` | `✅ Виконано` (текст NFR-2 — TD-015) |
| `NFR-3` | Ліміти CoinGecko | `MarketDataProvider.jsx`, `TopCoinsPoller.jsx`, `client.js` | `triggers.test.jsx` (тригер × стан), `client.test.js`, `navigation.test.jsx` | `✅ Виконано` (Red-Team №5; №7 — під 429 без CORS 1 запит замість 3, BUG-001) |
| `NFR-4` | LCP ≤ 2,5 с, CLS ≤ 0,1, TBT ≤ 200 мс | `CoinListPage.jsx` (`preload` прибрано — BUG-010, Revise №6) | `pnpm vitals` 906,0 / 0 / 6,5 (Revise №6, 00:52) | `✅ Виконано` (TD-013) |
| `NFR-5` | JS ≤ 150 кБ gzip | — | `pnpm size` 106,08 кБ (Revise №6) | `✅ Виконано` |
| `NFR-6` | WCAG 2.2 AA | усі екрани | `pnpm test:a11y` 36 axe | `✅ Виконано` (TD-007, TD-008) |
| `NFR-7` | 320 і 1280 px без прокрутки | `hintOffset.js`, `CoinTable.jsx` | `reflow` (мобільна емуляція), браузер | `✅ Виконано` |
| `NFR-8` | CSP, текст замість HTML | `vite.config.js` | `--check-code .`, браузер (0 порушень CSP) | `✅ Виконано` |
| `NFR-9` | Ланцюг постачання | lockfile, `npm view` | `pnpm audit` 0 high | `✅ Виконано` (TD-001) |
| `NFR-10` | Приватність, 3 ключі localStorage | `favorites/store.js`, `theme-init.js`, `Layout.jsx` | `only-coingecko-origins`, браузер | `✅ Виконано` |
| `NFR-11` | Обрані без строку дії | `favorites/store.js` | `favorites.test.jsx` | `✅ Виконано` |
| `NFR-13`, `NFR-16` | Помилки видно; атрибуція й дисклеймер | `AppErrorBoundary.jsx`, `Layout.jsx` | `App.test.jsx`, оракул US-9, браузер (консоль 0) | `✅ Виконано` |
| `NFR-12`, `NFR-14`, `NFR-15` | Хостинг, браузери, вартість | — | етапи 8–9 | `⏳ Етапи 8–9` |
| `BUG-003` / NFR-1, ADR 0005 (варіант Б) | `null` у зміні за 7 днів → «—», монета лишається; інші `null` → Error | `src/market-data/parse.js`, `src/lib/format.js`, `src/lib/sort.js` | `parse.test.js` (2), `lib.test.js` (2); браузер — Revise №5 | `✅ Виконано` (Revise №5, не закомічено) |
| `BUG-009` / UX §8 | Логотип не завантажився → кружок `brand-soft` з першою літерою | `src/ui/CoinLogo.jsx` | `ui.test.jsx` (3, подія `error` у `img`); браузер — 0 зламаних, 50 кружків | `✅ Виконано` (Revise №5) |
| UX §4, WCAG 2.4.3 / рішення власника 14:18 | Фокус на h1 після переходу без рамки й без стрибка; список повертається на свою прокрутку | `src/app/FocusOnNavigate.jsx` | `App.navigation.test.jsx` (2); браузер — `outline: none`, 1500 → 1500 | `✅ Виконано` (Revise №5) |
| `BUG-010` / NFR-1, AC-8.1 – AC-8.3, AC-8.6 | Повтори й «Спробувати ще раз» у WebKit доходять до джерела | `index.html` (без `preload`) | E2E US-8 у трьох браузерах без карантину; US-8 WebKit × 5 — 50 passed; справжній Safari — не перевірено | `✅ Виконано` (Revise №6; статус BUG і ретест — Revise 8.a) |
| `BUG-011` / UX §5.2 `safari.text` | Текст поради Safari дослівно за UX | `src/features/favorites-view/model.js` | збіг рядка (Red-Team №9); автоматичного тесту повного тексту немає | `✅ Виконано` (Revise №6; статус BUG і ретест — Revise 8.a) |
| `TD-023`, `TD-025` / WCAG 2.4.3, 2.4.7 (рішення власника 2026-11-04 00:11, п. 5) | Після повернення зі сторінки монети до списку фокус на її посиланні, якщо воно на екрані; інакше й на інших екранах — h1 | `src/app/FocusOnNavigate.jsx` | `App.navigation.test.jsx` (4 нові, 2 оновлені; мутаційні перевірки); браузер — `mouseBackLink`, `browserBack`, `keyboardBack`, `favoritesBack` (CHECKS 21/21) | `✅ Виконано` (Revise №6; UX §6 2.4.3 і TC-059 — TD-024) |

---

## 6. Ризики, технічний борг і відкриті питання

Борг — реєстр `.agentic/tech-debt.md` (ID без повторення опису). Red-Team прохід №9 (Revise №6): P2 = 13 після ремонту TD-025 → оцінка D (прохід №8: P2 = 13).

| Тип | Опис | Вплив | Що пропонується | Власник рішення |
| :--- | :--- | :--- | :--- | :--- |
| Борг | TD-001, TD-002, TD-007, TD-008, TD-009, TD-011, TD-012, TD-013, TD-014, TD-015, TD-019, TD-022, TD-024 (13 P2 Red-Team №9 після ремонту TD-025; TD-023, TD-025 закрито в Revise №6; TD-021 вирішено запитом на зміну №5 і закрито 2026-11-03 (гейти 3 `9417669`, 4 `a6719e0`, 6 `f1ac4b5`)) | Середній | Quick wins: TD-019, TD-007, TD-008, TD-012 (мертва гілка й коментарі) — наступний спринт або окремий ремонт; документи TD-002, TD-014, TD-015 — запит на зміну через `project-kickoff` | Власник продукту |
| Борг → закрито | TD-003, TD-004 — вирішено власником 2026-11-03 04:41 (трекер, розділ 4); TD-005, TD-018 — Revise №4 (BUG-006, BUG-001), Red-Team №7 | — | — | — |
| Борг | TD-020 (WARNING рев'юера): вкладка, відкрита у фоні — перший запит топ-50 і перший запит стейблкоїнів у прихованій вкладці (2 запити). `preload` прибрано в Revise №6 (BUG-010), але кількість запитів не змінилась (Red-Team №9, 9.3): запис трекера 00:11 «закриває й TD-020» кодом не підтверджується. Рішення власника 2026-11-03 04:41 — виняток для першого завантаження в NFR-3 | Низький | Додати виняток NFR-3 у запит на зміну №6 (етап 3 там уже є — TD-022) або спільний `enabled` у `topCoinsQuery` | Власник продукту |
| Ризик → закрито | 429 без заголовків CORS → `TypeError` → 2 повтори й E-NET: підтверджено на 8.a (BUG-001), виправлено в Revise №4 (варіант 1), ретест у браузері 05:38 | — | E2E з `route.abort` при `onLine=true` — етап 8.b (урок L-008) | Етап 8.b |
| Борг → закрито | TD-021: документи приведено до коду запитом на зміну №5 (рішення власника «Оновити документи», трекер 14:35); код повторів не змінено | — | Чинне з гейтами етапів 3 (`9417669`), 4 (`a6719e0`), 6 (`f1ac4b5`) | Власник продукту |
| Дефект → виправлено | BUG-003: «BUG-003 - ок» витлумачено як варіант Б (пропозиція попередньої сесії), ADR 0005 без змін; запит №4 закрито без зміни артефактів — тлумачення підтвердити на гейті (L-003) | — | Verified — після коміту Revise №5 | Власник продукту |
| Дефект → виправлено | BUG-009 (Minor / P3): спільний `CoinLogo` з кружком-літерою. «BUG-009 - ок» витлумачено сесією-координатором як «виправити зараз» (трекер 14:18) — підтвердити на гейті (L-003) | — | Verified — після коміту Revise №5 | Власник продукту |
| Рішення → виправлено | Фокус після переходу (рішення власника 14:18 «змінити»): h1 без рамки при фокусі мишею, з рамкою 2 px при `:focus-visible` (клавіатура), `preventScroll`, прокрутка списку відновлюється, `history.scrollRestoration = "manual"` | Низький | — | Власник продукту |
| Борг → закрито | TD-023 (Red-Team №8): фокус після повернення до списку — на посиланні монети, з якої повернулись (рішення власника 2026-11-04 00:11, п. 5); TD-025 (Red-Team №9, регресія на S-3 і без збереженої прокрутки) — закрито перевіркою «посилання на екрані» | — | — | — |
| Борг | TD-024 (Red-Team №9): UX §6 рядок 2.4.3 і TC-059 (крок 2) досі вимагають фокус на h1 після повернення | Середній | Рядок 2.4.3 — у запит на зміну №6 (етап 4, разом із TD-022); TC-059 — у Revise 8.a з ретестом BUG-010, BUG-011 | Власник продукту |
| Межі етапу | Revise №6 змінив `e2e/us-8.e2e.spec.js` і `e2e/support/app.js` (зона 8.b, `APPROVED_AND_COMMITTED`, `f52746a`; §10.6: етапу 7 `e2e/` змінювати не можна) за рішенням власника 00:11, п. 1 («зняти test.fail у e2e/us-8»; `app.js` — без нього карантин не знімається). Статуси `.agentic/qa/bugs/BUG-010.md`, `BUG-011.md` (зона 8.a) Revise №6 не змінює. У коміт етапу 7 ці файли не входять | Середній | Після гейту 7: Revise 8.b (ці 2 файли, звіт 8.b без карантину, `verify-gate.py --stage 8.b --run`, гейт 8.b) і Revise 8.a (ретест BUG-010, BUG-011, статуси, TC-059 — TD-024) | Власник продукту |
| Ризик | BUG-010 перевірено лише в WebKit Playwright; справжній Safari (iOS / macOS) — ні; `fetch` без `cache: "no-store"`, заголовки `Cache-Control` CoinGecko в Safari не перевірені | Середній | Ретест на справжньому Safari на етапі 8.a або рішення власника прийняти WebKit Playwright | Власник продукту |
| Ризик | Без `preload` запит топ-50 стартує після виконання бандла: LCP (поле пошуку) не змінився — 906 мс, але час до першої ціни зріс і не виміряний (TD-013) | Низький | Вимір часу до першої ціни — разом із TD-013 | Власник продукту |
| Борг | TD-022 (Red-Team №8): §6 архітектури (`change7dPct: number`), UX §3 E-SHAPE і §5.2, TC-086 не знають `null` у зміні за 7 днів (варіант Б BUG-003) | Середній | Запит на зміну через `project-kickoff` або рішення власника «лишити як є» | Власник продукту |
| Рішення | Ручний повтор приєднується до фонового ланцюга (результат може бути від запиту ≤ 10 с до кліку) — прийнятий компроміс, вирішено власником 2026-11-03 04:41 (трекер, розділ 4) | — | — | — |
| Питання | UX S-1 Partial «повтор при наступному відкритті» неоднозначний | Низький | Уточнити разом із TD-019 | Власник продукту |
| Відхилення | Панель пошуку в стані Loading (відступ від артборда M-List-Loading) | Низький | Рішення власника 00:53; записати в UX наступним Revise етапу 4 | Власник продукту |
| Процес | Red-Team — 6 проходів замість 1: 953 080 токенів проти ~300k у плані (≈ 3,2×); 6 P1 одного класу закривались по одному тригеру; 3 спрацювання Circuit Breaker | Середній | Уроки L-006 (таблиця «тригер → наслідок» до ремонту) і L-007 (`clientWidth`, мобільна емуляція) записано й автоматизовано | Скіл етапу 7 |
| Рішення | Шрифти: усі підмножини `@fontsource` у `dist/`, браузер вантажить 10 файлів, 119 040 Б — відхилення від плану §4 прийнято, вирішено власником 2026-11-03 04:41 (трекер, розділ 4) | — | — | — |
| Рішення | `.agentic/design-ref/` — видаляє власник (агентові видалення заборонено); `.claude/skills/verify/SKILL.md` не комітиться — вирішено власником 2026-11-03 04:41 (трекер, розділ 4) | — | — | — |

### 6.1. Карта технологій для самостійного опанування

| Технологія / Інструмент / Патерн | Рівень опанування | Ключові концепції | Офіційне першоджерело |
| :--- | :--- | :--- | :--- |
| TanStack Query v5 | **Розуміти** | спостерігачі запиту, `staleTime`, неявні тригери (монтування, фокус, reconnect), `networkMode`, `cancelRefetch` | https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults |
| React Router 8 (декларативний режим) | **Вміти** | `HashRouter`, `Routes`, `NavLink` і `aria-current` | https://reactrouter.com/start/declarative/installation |
| CSP і шрифти | **Розуміти** | `default-src 'self'`, `font-src`, `data:`-URI, `assetsInlineLimit` Vite | https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy |
| WCAG 2.2 Reflow (1.4.10) і мобільний viewport | **Розуміти** | layout viewport vs `clientWidth`, мобільна емуляція в тестах | https://www.w3.org/WAI/WCAG22/Understanding/reflow.html |
| Lighthouse LCP (Lantern) | **Знати** | симуляція тротлінгу, елемент LCP, `preload as=fetch` | https://developer.chrome.com/docs/lighthouse/performance/lighthouse-largest-contentful-paint |

---

## 7. Точка фіксації в Git (Recommended Git Commit Checkpoint)

### 7.1. Список файлів для індексації (`git status --short`)

Коміти етапу 7: первинний `8645c76`, Revise №4 — `e3fb805`, Revise №5 — `8f0f2a5`. **Revise №6** — файли нижче. `e2e/us-8.e2e.spec.js` і `e2e/support/app.js` (зона 8.b) у коміт етапу 7 не входять (§10.6): їх комітить Revise 8.b (секція 6). Файли `.agentic/reports/01-*`, `02-*`, `.agentic/specs/01-*`, `02-*` (лише закінчення рядків) і `.claude/skills/verify/*` (`.git/info/exclude`) у коміт не йдуть.

```text
 M index.html
 M src/app/FocusOnNavigate.jsx
 M src/app/App.navigation.test.jsx
 M src/features/favorites-view/model.js
 M .agentic/evidence/debt-checks.md
 M .agentic/evidence/red-team-report.md
 M .agentic/evidence/walkthrough.md
 M .agentic/autonomy-journal.md
 M .agentic/tech-debt.md
 M .agentic/reports/07-implementation-report.md
 M .agentic/pipeline-state.md
 M .claude/rules/project-lessons.md     (урок L-009, рев'ю №9)
 M e2e/us-8.e2e.spec.js            (зона 8.b — не в коміті етапу 7; Revise 8.b)
 M e2e/support/app.js              (зона 8.b — не в коміті етапу 7; Revise 8.b)
```

### 7.2. Явна індексація та коміт (Conventional Commits)

```bash
git add index.html src/app/FocusOnNavigate.jsx src/app/App.navigation.test.jsx src/features/favorites-view/model.js .agentic/evidence/debt-checks.md .agentic/evidence/red-team-report.md .agentic/evidence/walkthrough.md .agentic/autonomy-journal.md .agentic/tech-debt.md .agentic/reports/07-implementation-report.md .agentic/pipeline-state.md .claude/rules/project-lessons.md
git commit -m "fix(stage-7): fix bug-010 and bug-011, focus the returned coin link"
```

---

### 🛑 Рішення власника продукту (Human Approval Gate)

- [x] **Approve & закоміть** — статус `APPROVED_AND_COMMITTED`: агент оновлює `.agentic/pipeline-state.md`, позначає цей чекбокс, виконує явний `git add` і `git commit`.
- [ ] **Approve без коміту** — статус `APPROVED_MANUAL_COMMIT`: власник комітить самостійно.
- [ ] **Revise** — статус `REJECTED_REVISING`: зауваження нижче, етап повертається на Фазу 3.

**Коментарі / Зауваження:**
> Первинний гейт етапу 7 (04:21, `8645c76`). Пункти 1–6 первинного гейту вирішено власником 2026-11-03 04:41 (трекер, розділ 4): (1) TD-003 і TD-004 закрито; (2) TD-020 — виняток для першого завантаження в NFR-3 (чекає запиту на зміну етапу 3); (3) відхилення шрифтів прийнято; (4) компроміс ручного повтору прийнято; (5) приховані сценарії для етапу 7 не задаються; (6) `.agentic/design-ref/` видаляє власник, `.claude/skills/verify/SKILL.md` не комітиться.
>
> **Revise №4 (2026-11-03 05:30, рішення власника на гейті 8.a «виправ все згідно твоїм рекомендаціям»):** первинне схвалення етапу 7 — `APPROVED_AND_COMMITTED` о 04:21 (`8645c76`); статус етапу тепер `REJECTED_REVISING`, гейт Revise №4 — чекбокси вище знову порожні. На гейті:
> 1. Схвалити ремонт BUG-001, 002, 004–008 (коміт `fix(stage-7): …`).
> 2. Запит на зміну №4 (BUG-003, ADR 0005): варіант А / Б / В.
> 3. TD-021: запит на зміну UX §3, P-4, §7.1, ADR 0005 (повтори мережевої помилки).
> 4. Фокус на h1 після переходу: лишити видиму рамку й прокрутку до h1 чи `preventScroll` + стиль.
> 5. BUG-009 (новий, Minor / P3, запасний логотип UX §8): виправити зараз окремим Revise чи в спринті 2.
>
> **Revise №5 (2026-11-03 14:18, рішення власника «BUG-003 - ок; BUG-009 - ок; Ручний чек-лист - відкладаємо; TD-021 - повторюй; Фокус після переходу між екранами - змінити»; TD-021 уточнено 14:35 — «Оновити документи»):** етап 7 — `REJECTED_REVISING`, чекбокси вище знову порожні. На гейті:
> 1. Схвалити Revise №5: BUG-003, BUG-009, фокус і прокрутка (коміт `fix(stage-7): …`); гейти етапів 3 → 4 → 6 (запит на зміну №5) пройдено: `9417669`, `a6719e0`, `f1ac4b5`. Підтвердити тлумачення: «BUG-003 - ок» = варіант Б; «BUG-009 - ок» = виправити зараз (L-003).
> 2. TD-023: після повернення до списку фокус на h1 поза екраном — лишити (як просив власник) чи ставити фокус на посилання монети, з якої повернулись. Рамка: мишею — немає, клавіатурою — є (2 px).
> 3. TD-022: документи (§6 архітектури, UX §3 / §5.2, TC-086) не знають `null` у зміні за 7 днів — запит на зміну чи «лишити як є».
> 4. Чек-лист TC-087 – TC-090 — відкладено власником; не пройдено, ризик не прийнято (L-003).
> 5. Етап 8.a: згода на Revise 8.a (ретест BUG-003 і BUG-009, TC-061 / TC-062 за запитом №5, примітка TC-087 – TC-090) з окремим комітом і гейтом 8.a.
> 6. `.claude/skills/verify/logo-focus-check.mjs` — не комітити, як `SKILL.md` (рішення 04:41), чи комітити.
>
> **2026-11-03 22:25:** власник — «Approve & закоміть 7» (Revise №5). Схвалено пункт 1 (BUG-003 варіант Б, BUG-009, фокус і прокрутка; коміт `fix(stage-7): …`). Пункти 2–6 окремо не вирішено — лишаються відкритими (L-003): TD-023, TD-022, чек-лист TC-087 – TC-090, Revise 8.a, `logo-focus-check.mjs` (не в коміті етапу 7). Також відкрито: ризики IP (STRIDE I), рядок `.agentic/project.json`.
>
> **Revise №6 (2026-11-04 00:11, рішення власника щодо відкритих пунктів після гейту 8.b, пункти 1, 2, 5; старт — «Start Revise №6 of stage 7?»):** статус етапу — `REJECTED_REVISING`, гейт Revise №6:
> 1. Схвалити Revise №6: BUG-010 (без `preload`), BUG-011 (текст UX §5.2), TD-023 + TD-025 (після повернення до списку фокус на посиланні монети, якщо воно на екрані, інакше h1; на інших екранах — h1) — коміт `fix(stage-7): …`.
> 2. Після гейту 7 — Revise 8.b (`e2e/us-8.e2e.spec.js`, `e2e/support/app.js`, `--stage 8.b --run`, гейт 8.b) і Revise 8.a (ретест BUG-010, BUG-011, TC-059).
> 3. TD-020 не закрито прибиранням `preload` (2 запити в прихованій вкладці): виняток NFR-3 у запиті на зміну №6 чи `enabled` у `topCoinsQuery`.
> 4. TD-024: рядок 2.4.3 UX §6 — у запит на зміну №6 (разом із TD-022); TC-059 — у Revise 8.a з ретестом BUG-010, BUG-011.
> 5. BUG-010 у справжньому Safari не перевірено: ретест на 8.a чи прийняти перевірку WebKit Playwright.
>
> **2026-11-04 01:10:** власник — «Approve & закоміть 7» (Revise №6). Схвалено пункт 1 (BUG-010, BUG-011, TD-023 + TD-025; коміт `fix(stage-7): …`). Пункти 2–5 окремо не вирішено — лишаються відкритими (L-003).
