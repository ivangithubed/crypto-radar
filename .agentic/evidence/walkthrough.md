# Walkthrough етапу 7, спринт 1 (Крипто-Радар)

- **Етап:** Stage 7: Реалізація — хвилі DAG, Red-Team аудит, перевірка в браузері.
- **План:** `.agentic/specs/implementation_plan.md` (етап 6, `ddcdf0b`; Revise №3 — запит на зміну №3).
- **Базовий хеш відкату:** `f689fc3`. Чекпоінти (згода власника 2026-11-03 00:23): `62fe221` (Wave 0), `3bc6ee3` (Wave 1), `ccaddfb` (Wave 2), `871334b` (Wave 3). Wave 4, ремонти й документи — незакомічені до гейту етапу 7.
- **Що вийшло:** повний MVP спринту 1 — S-1 «Топ-50 монет» (картки / таблиця, пошук, сортування, «Показати більше», ★, підказки), S-2 «Сторінка монети» (графік 7 днів, поза топ-50), S-3 «Обрані» (порядок за рейтингом, вибулі, порада Safari), S-4 «Сторінку не знайдено», S-5 «Збій застосунку»; дані напряму з CoinGecko, свіжість ≤ 300 с, оновлення раз на 60 с лише у видимій вкладці.

## 1. Що реалізовано (AC → докази)

Оракул — `pnpm exec vitest run --config acceptance/vitest.config.js`: 9 файлів, **91 passed / 91** (2026-11-03 02:54:24). Числа в дужках — виконані тести на файл (JSON-звіт 03:09:20): 17 + 10 + 15 + 5 + 9 + 9 + 9 + 10 + 7 = 91. Модульні тести — `pnpm verify`: 15 файлів, **236 passed** (02:54:18).

| Історія | AC | Де реалізовано | Чим перевірено |
| :--- | :--- | :--- | :--- |
| US-1 Список топ-50 | AC-1.1 – AC-1.5 | `src/features/coin-list/**`, `src/lib/format.js` | оракул `us-1` (17 тестів); `src/lib/lib.test.js`, `CoinListPage.test.jsx` |
| US-2 Сортування | AC-2.1 – AC-2.8 | `src/lib/sort.js`, `coin-list/useCoinListView.js`, `ListToolbar.jsx` | оракул `us-2` (10); `lib.test.js` |
| US-3 Пошук | AC-3.1 – AC-3.9 | `src/lib/index.js` (`searchCoins`, `normalizeQuery`), `coin-list/SearchStatus.jsx` | оракул `us-3` (15); `lib.test.js`, `CoinListPage.test.jsx` |
| US-4 Сторінка монети | AC-4.1 – AC-4.4 | `src/features/coin-page/**`, `src/chart/PriceChart7d.jsx` | оракул `us-4` (5); `CoinPage.test.jsx`, `PriceChart7d.test.jsx` |
| US-5 Обрані: додати / прибрати | AC-5.1 – AC-5.7 | `src/favorites/store.js`, ★ у фічах | оракул `us-5` (9); `favorites.test.jsx` |
| US-6 Обрані між візитами | AC-6.1 – AC-6.7 | `src/features/favorites-view/**`, `src/favorites/**` | оракул `us-6` (9); `FavoritesPage.test.jsx` |
| US-7 Підказки | AC-7.1 – AC-7.4 | `src/ui/TermHintButton.jsx`, `hintOffset.js`, `src/glossary/**` | оракул `us-7` (9); `ui.test.jsx`, `TermHint.test.jsx`; `a11y/reflow.a11y.spec.js` (320 / 1280 px) |
| US-8 Недоступні / застарілі дані | AC-8.1 – AC-8.8 | `src/market-data/**` (клієнт, повтори P-4, свіжість, поллер, центральний вимикач тригерів) | оракул `us-8` (10); `client.test.js`, `useTopCoins.test.jsx`, `navigation.test.jsx`, `focus.test.jsx`, `triggers.test.jsx` |
| US-9 Дисклеймер, джерело, мова | AC-9.1 – AC-9.3 | `src/app/Layout.jsx` | оракул `us-9` (7, з урахуванням запиту №3); `App.test.jsx` |

## 2. Quality Gates

| Перевірка | Команда | Код | Результат |
| :--- | :--- | :--- | :--- |
| verify | `pnpm install --frozen-lockfile && pnpm verify` | 0 | lint 0, формат, 236 passed, build, JS 105,08 кБ gzip ≤ 150 |
| Оракул | `pnpm exec vitest run --config acceptance/vitest.config.js` | 0 | 91 / 91 |
| Виміряний борг | `verify-gate.py --debt` | 0 | 8 команд, 7 аспектів (`.agentic/evidence/debt-checks.md`) |
| Дублювання | `pnpm dup` | 0 | 0,85 % ≤ 3 % |
| Мертвий код | `pnpm deadcode` | 0 | 0 |
| Межі модулів | `pnpm boundaries` | 0 | 0 порушень, 90 модулів |
| Вразливості | `pnpm audit --audit-level high` | 0 | 0 high/critical (2 moderate — TD-001) |
| Доступність | `pnpm test:a11y` | 0 | 40 passed: 36 axe (9 екранів і станів × 2 теми × 375 / 1280 px) + 4 виміри підказок (320 px — мобільна емуляція) |
| Web Vitals | `pnpm vitals` | 0 | LCP 905,8 мс, CLS 0,000, TBT 6,0 мс |
| Правила якості | `verify-gate.py --check-code .` | 0 | 82 файли, 0 порушень |
| Секрети | `verify-gate.py --scan-secrets .` | 0 | 152 файли, 0 (03:16:56) |
| Браузер | скіл `verify` (preview, справжній CoinGecko) | — | 5 маршрутів, консоль порожня, `securitypolicyviolation` 0, прокрутка 0 на 320 px з кожною відкритою підказкою; теми `rgb(247, 245, 251)` / `rgb(21, 18, 31)`, скриншоти `screens/s1-list-light-360.jpg`, `screens/s2-coin-dark-360.jpg`; 10 файлів шрифтів, 119 040 Б |
| Репетиція відкату | `git worktree add` з `f689fc3` у scratchpad, `pnpm verify` | 0 | дерево чисте, 1 тест каркаса, 68,23 кБ; копію прибрано (`git worktree prune`) |

## 3. Red-Team аудит

`.agentic/evidence/red-team-report.md`. П'ять повних проходів і вузький прохід №6 (STRIDE — таблиця 17 рядків у звіті):

| Прохід | Вердикт | Оцінка | P1 | P2 |
| :--- | :--- | :--- | :--- | :--- |
| №1 | FAIL | D | RT-1 (NFR-3, переходи), RT-2 (NFR-7, підказки) | 13 |
| №2 | FAIL | D | RT-3 (NFR-3, фокус вкладки) | 13 |
| №3 | FAIL | D | RT-4 (NFR-3, `online`) → ескалація власнику | 14 |
| №4 | FAIL | D | RT-5 (призупинений запит), RT-6 (стейблкоїни) → ескалація №2 | 16 |
| №5 | PASS | D | 0 | 14 |
| №6 (вузький) | PASS | D | 0 | 14 |

Після проходу №5 перевірка в браузері знайшла, що RT-2 на телефоні закрито не до кінця (`innerWidth` росте з переповненням) — ескалація, рішення власника «межа від `clientWidth`», ремонт, вузький прохід №6 (підсумок — звіт етапу 7, секція 4). Поточна оцінка D — через P2 = 14 ≥ 10 (усі в `.agentic/tech-debt.md`).

## 4. Рішення з журналу автономності

Повний перелік — `.agentic/autonomy-journal.md`, розділ 1; рішення власника — трекер, розділ 4. Ключові:

- Wave 0: `@tanstack/react-query` 5.105.0 (cooldown 7 днів замість 5.105.3); шрифти — CSS ваг `@fontsource` з `unicode-range`; `tnum` в Onest виміряно (TD-004); фікстури CoinGecko записано.
- Sync 3: резолвер `react-router` у `.dependency-cruiser.cjs` — запит на зміну №2 (власник 00:41; закомічено `d7d162e`).
- Wave 4: «IP» у білому списку AC-9.3 — запит на зміну №3 (власник 00:45; гейт етапу 6 очікує).
- Sync 4: NFR-4 LCP 2,85 с на справжньому CoinGecko → власник (00:53): панель пошуку в стані Loading + стейблкоїни після топ-50 → LCP 906 мс; `preload as=fetch` топ-50; шрифти без вбудовування `data:` (CSP).
- NFR-3: центральний вимикач неявних тригерів TanStack Query (власник 01:56), пакетний ремонт (власник 02:36).
- NFR-7: межа панелі підказки від `clientWidth` (власник 02:53); тест `reflow` у мобільній емуляції.
- Уроки проєкту: L-004 посилено, L-005 (час із годинника), L-006 (таблиця «тригер → наслідок» до ремонту), L-007 (`clientWidth`, мобільна емуляція) — `.claude/rules/project-lessons.md`.

## 5. Бюджет «план / факт»

Фактичні `subagent_tokens` / `tool_uses` кожного субагента — `.agentic/autonomy-journal.md`, розділ 3.

| Група | План (план етапу 6) | Факт | Пояснення |
| :--- | :--- | :--- | :--- |
| Wave 1 (2 воркери) | ~240k / ≤ 120 ходів | 84 698 / 34 | у межах |
| Wave 2 (4 воркери) | ~390k / ≤ 180 | 155 305 / 63 | у межах |
| Wave 3 (3 воркери) | ~390k / ≤ 180 | 267 686 / 93 | у межах |
| Ремонти Sync 4 і Red-Team (11 воркерів) | не плановані | 381 024 / 148 | ремонти P1 і NFR-4; найбільший — RT-4 (65 634) |
| Red-Team | ~300k / 1 прохід | 953 080 / 386 (6 проходів: 877 908 / 355 за №1–№5 + 75 172 / 31 за №6) | **перевищення ≈ 3,2×**: 6 проходів замість 1 через 6 P1 класу NFR-3 / NFR-7, що відкривались по одному; уроки L-006, L-007 |
| Рев'ю Revise №2 і №3 (10 проходів, №3–№7) | не плановані | 995 342 | ланцюг BLOCKERS через вигадані позначки часу й рядки без виводу (уроки L-004, L-005) |

Головний агент (Wave 0, Wave 4, Sync, звіти) — сесія власника, лічильника немає.

## 6. Кроки відкату

- **Хвиля або весь етап (лише за явною згодою власника — знищує незакомічені зміни):** `git reset --hard <чекпоінт або f689fc3> && git clean -fd -- src acceptance a11y scripts public`, далі `pnpm install --frozen-lockfile`.
- **Після коміту етапу 7:** `git revert <коміт етапу 7>` (безпечно, нова історія).
- **Репетиція виконана** без втрати роботи: `git worktree add --detach <scratchpad>/rollback-f689fc3 f689fc3` → `pnpm install --frozen-lockfile && pnpm verify` — код 0 → копію видалено, `git worktree prune`; у робочому дереві сміттєвих файлів немає (`git worktree list` — лише основне дерево).

## 7. Revise №6 (2026-11-04): BUG-010, BUG-011, TD-023

| Пункт | Що змінено | Чим перевірено |
| :--- | :--- | :--- |
| BUG-010 (WebKit повторно віддавав відповідь `preload`) | `index.html` — прибрано `<link rel="preload" as="fetch">` топ-50 | E2E без карантину WebKit: 279 passed, 3 skipped (00:37:05 – 00:37:58); US-8 WebKit × 5 — 50 passed; LCP 906 мс (до правки 905 мс) |
| BUG-011 (текст поради Safari) | `src/features/favorites-view/model.js` — `safariText` дослівно за UX §5.2 | збіг рядка з `04-ux-and-contract.md:326` (Red-Team №9) |
| TD-023 (фокус після повернення до списку) | `src/app/FocusOnNavigate.jsx` — після повернення до списку фокус на посиланні монети, з якої повернулись, якщо воно на екрані (TD-025), інакше h1; інші екрани — h1 | `App.navigation.test.jsx` (4 нові тести, 2 оновлені; мутаційні перевірки); `logo-focus-check.mjs`: мишею без рамки, клавіатурою `solid 2px`, у межах екрана, `scrollY` збережено; S-3 → h1 |
| e2e (зона 8.b, рішення власника 00:11, п. 1) | `e2e/us-8.e2e.spec.js` — без `test.fail` і гілки WebKit; `e2e/support/app.js` — `page.goto` чекає `load` | повний набір і smoke (вище) |

- **Quality Gates:** `pnpm verify` 0 (16 файлів, 265 passed; NFR-5 106,08 кБ; 00:50:10); оракул 91 / 91 (00:51:33); E2E 279 passed / 3 skipped (00:50:15); `--debt` 0 (00:51:42 – 00:52:31, `.agentic/evidence/debt-checks.md`); `test:a11y` 40 passed; браузер CHECKS 21/21 (00:49:45).
- **Red-Team №9:** PASS, D; аудитор — P2 = 14, після ремонту TD-025 — 13; TD-023, TD-025 закрито; новий TD-024; TD-020 не закрито (`.agentic/evidence/red-team-report.md`, «Прохід №9»).
- **Бюджет:** Red-Team №9 — 155 463 токени / 44 ходи (план ~150k); воркерів не було.
- **Відкат:** до коміту — `git restore -- index.html src/app/FocusOnNavigate.jsx src/app/App.navigation.test.jsx src/features/favorites-view/model.js e2e/us-8.e2e.spec.js e2e/support/app.js` (лише за згодою власника); після коміту — `git revert <коміт>`. Базовий хеш — `b8e23ff`.
- **Рев'ю №9 — BLOCKERS FOUND (виправлено):** BUG-файли зони 8.a прибрано з коміту етапу 7; фокус обмежено поверненням до списку; скрипт браузера звіряє очікування; `e2e/` — лише через Revise 8.b.
