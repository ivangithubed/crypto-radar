# Журнал Автономності та Рішень Агентів (Autonomy Journal)

## Проєкт: Крипто-Радар
Дата старту: 2026-11-02

---

## 1. Зафіксовані Автономні Рішення (Agent Decisions)
| Хвиля / Модуль | Рішення | Мотивація / Альтернативи | Вплив на архітектуру |
|---|---|---|---|
| Етап 7 · перевірка в браузері після Red-Team PASS | На 320 px у мобільній емуляції відкрита підказка давала прокрутку 11–210 px: `innerWidth` / `100vw` на телефоні ростуть разом із переповненням; десктопний профіль Playwright цього не показує | Тест `reflow` переведено на мобільну емуляцію (`isMobile`) і межу `clientWidth`; скіл `verify` доповнено кроком «кожна підказка відкрита на 320 px» | Ескалація власнику (2 спроби класу RT-2 вичерпано); рішення 02:53 — межа від `clientWidth` |
| Етап 7 · Wave 4 · AC-9.3 | Оракул 88/91: «IP» у схваленому тексті `footer.privacy` (UX §5.2) відсутнє в білому списку латиниці `acceptance/us-9` | Змінювати оракул чи UX без власника заборонено | Власник: запит №3, Revise етапу 6 — «IP» додано в `ALLOWED_LATIN`, рядок AC-9.3 плану уточнено; гейт етапу 6 заново |
| Етап 7 · Wave 4 · TD-002 | `a11y/support/fake-coingecko.js`: `page.route` для axe; для Lighthouse — `chromium.connectOverCDP` до Chrome від `chrome-launcher` і маршрути на типовий контекст | Без коду в бандлі (план §12.1); `chrome-launcher` лишається потрібним (knip) | Обмеження: `route.fulfill` не стискає тіло (gzip ламає розбір) — фікстура 200 КБ проти ≈ 82 КБ у CoinGecko, вимір песимістичніший |
| Етап 7 · Wave 4 · axe | Набір a11y: 9 екранів і станів × 2 теми × 375/1280 px = 36 тестів; тема — через `crypto-radar:theme` до завантаження | NFR-6 перелічує екрани й стани; обидва макети списку (картки / таблиця) | Перший прогін: 4 червоні — вада локатора тесту («Bitcoin» і «Bitcoin Cash»), не продукту |
| Етап 7 · Sync 4 · NFR-4 | LCP 4909 мс (фікстура) → `preload as=fetch` топ-50 у `index.html` → 4606 мс; контроль на справжньому CoinGecko — 2853 мс (FAIL) | Елемент LCP — поле пошуку, що з'являлося лише після даних | Власник (00:53): панель у Loading + стейблкоїни після топ-50 → LCP 905,8 мс (фікстура), 906,2 мс (CoinGecko). Обмеження метрики — у звіті, секція 6 |
| Етап 7 · Sync 4 · CSP шрифтів | У браузері 2 порушення CSP: Vite вбудовував дрібні woff/woff2 як `data:` (`assetsInlineLimit` 4 КБ), `default-src 'self'` їх блокує | CSP не послаблюю; `vite.config.js` → `build.assetsInlineLimit` вимикає вбудовування лише для `.woff`/`.woff2` | Після: 0 `data:font` у CSS, 0 подій `securitypolicyviolation`; перевірку додано в `.claude/skills/verify/SKILL.md` |
| Етап 7 · Sync 3 · межі модулів | `pnpm boundaries` червоний: `not-to-unresolvable` на кожному імпорті `react-router` (8 порушень). Першопричина: `react-router` 8 має лише поле `exports` (без `main` / `module`), а `.dependency-cruiser.cjs` не задавав `enhancedResolveOptions` — `depcruise` не читав `exports`. Перевірено: `enhanced-resolve` 5.26 з `conditionNames` розв'язує пакет у `dist/production/index.js` | Змінювати файл без власника план забороняє (розділ 15.1); питання власнику | Власник (00:41): у запит №2 (Revise етапу 5); у `options` додано лише `enhancedResolveOptions`, правила й пороги без змін; гейт етапу 5 — після хвилі 4 |
| Етап 7 · Wave 0 · залежності | `react-router` 8.5.1, `@tanstack/react-query` **5.105.0** (не 5.105.3), `@fontsource/unbounded` 5.3.0, `@fontsource/onest` 5.3.1; кожен перевірено `npm view` (версія, дата, репозиторій, ліцензія MIT / OFL-1.1) | 5.105.1–5.105.3 вийшли 2026-11-01…02 (< 7 днів); як і для vitest 5.0.5 на етапі 5, беру реліз старший за cooldown Dependabot (7 днів). `react-router` 8.5.1 — 2026-10-27 (7 днів) | Немає: версії в межах дозволу власника (трекер, 2026-11-02 23:10) |
| Етап 7 · Wave 0 · шрифти | `src/main.jsx` імпортує `@fontsource/onest/{400,500,600}.css` і `@fontsource/unbounded/600.css` (усі підмножини з `unicode-range`), а не файли `cyrillic-*.css` / `latin-*.css` | Файли підмножин без `unicode-range`: дві грані з однаковими дескрипторами затирають одна одну, кирилиця падала б на запасний шрифт. Власний `@font-face` з `url()` у CSS `knip` не бачить (CSS не в `project` `knip.json`, змінювати заборонено) → «Unused dependencies». Браузер завантажує лише підмножини, потрібні тексту (кирилиця, латиниця); інші woff2 лише лежать у `dist/` | Відхилення від буквального «лише підмножини cyrillic і latin» (план, розділ 4): у збірці є файли інших підмножин, мережевий трафік той самий |
| Етап 7 · Wave 0 · TD-004 | `tnum` в Onest є: Chromium, 32 px, `tabular-nums` — «1111111111» = «0000000000» = 215,05 px; без `tnum` — 116,17 і 212,81 px | Перевірка вимірюванням замість розбору GSUB (fontTools не встановлено, нових інструментів не додаю) | TD-004 — до закриття на гейті етапу 7 |
| Етап 7 · Wave 0 · фікстури TD-002 | `src/test/fixtures/markets-top50.json` — справжня відповідь `/coins/markets` (топ-50, `sparkline=true`, 2026-11-02 22:13 UTC); `stablecoins.json` — відповідь `category=stablecoins`, скорочена до `id`, `symbol`, `name` | 2 GET-запити до публічного API (як робить сам продукт). У записі: ранги 36/37 і 45/46 ідуть не по зростанню, `sparkline` має 131–168 точок — корисні крайові випадки для `parseMarkets` | Немає |
| Етап 7 · Wave 0 · іконки | `public/favicon.svg` (був логотип Vite) замінено іконкою «радар» у кольорах токенів; `public/icons/icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180, без прозорих кутів) — PNG намальовано Playwright Chromium з SVG; `manifest.webmanifest` (`display: standalone`, ADR 0006) | Маніфесту й iOS потрібні PNG-іконки; власний логотип замість шаблонного Vite | Немає |
| Етап 7 · Wave 0 · тема | `public/theme-init.js` — класичний скрипт у `<head>` (`index.html`), Vite додає `base` (`/crypto-radar/theme-init.js`), CSP `script-src 'self'` дозволяє | План, розділ 4 | Немає |

---

## 2. Втручання та Рішення Людини (Human Decisions & Overrides)
| Дата / Час | Етап / Розділ | Запит ШІ | Рішення людини |
|---|---|---|---|
| 2026-11-02 13:23 | Init | Чи виконати `git init` у D:\crypto-radar? | Так |
| 2026-11-02 13:23 | Init | Чи вмикати навчальний режим? | Так (`learning_mode: true`) |
| 2026-11-02 13:23 | Init | Чи є матеріали або обмеження? | Немає; стек — запропонувати на етапі 3 |

---

## 3. Бюджет агентів (план / факт)
| Хвиля / задача | Субагент | План: токени / ходи | Факт: `subagent_tokens` / `tool_uses` | Статус | Примітка |
|---|---|---|---|---|---|
| Етап 7 · Wave 1 · W1-lib | `dag-worker` (`sonnet`) | ~120k / ≤ 60 | 42 285 / 16 | DONE | 45 тестів; фокусна перевірка 0 |
| Етап 7 · Wave 1 · W1-ui | `dag-worker` (`sonnet`) | ~120k / ≤ 60 | 42 413 / 18 | DONE | 19 тестів; JSDoc контракту перенесено в файли реалізацій, імена й props незмінні |
| Етап 7 · Wave 2 · W2-market-data | `dag-worker` (`sonnet`) | ~150k / ≤ 60 | 63 749 / 26 | DONE | 33 тести; рішення: виняток `fetch` → `net`, таймаут / 5xx / 429 / форма → `src` (UX §3 суперечливий) |
| Етап 7 · Wave 2 · W2-favorites | `dag-worker` (`sonnet`) | ~100k / ≤ 50 | 35 505 / 12 | DONE | 24 тести; спільний store через `useSyncExternalStore` |
| Етап 7 · Wave 2 · W2-glossary | `dag-worker` (`haiku`) | ~60k / ≤ 30 | 29 693 / 15 | DONE | 13 тестів; тексти винесено в `terms.js` |
| Етап 7 · Wave 2 · W2-chart | `dag-worker` (`sonnet`) | ~80k / ≤ 40 | 26 358 / 10 | DONE | 4 тести; чистий SVG |
| Етап 7 · Wave 3 · W3-coin-list | `dag-worker` (`sonnet`) | ~150k / ≤ 60 | 113 019 / 38 | PARTIAL → закрито | 9 тестів; PARTIAL лише через `boundaries` (резолвер `react-router`, поза зоною) |
| Етап 7 · Wave 3 · W3-coin-page | `dag-worker` (`sonnet`) | ~120k / ≤ 60 | 91 677 / 34 | PARTIAL → закрито | 9 тестів; та сама причина; текст loading — `loading.coin` UX §5.2 |
| Етап 7 · Wave 3 · W3-favorites-view | `dag-worker` (`sonnet`) | ~120k / ≤ 60 | 62 990 / 21 | PARTIAL → закрито | 7 тестів; та сама причина |
| Етап 7 · Wave 4 · ремонт (`--check-code`) | `dag-worker` (`haiku`) | ~20k / ≤ 10 | 23 033 / 8 | DONE (спроба 1) | `parse.test.js:66`: адреса чужого хоста → підробка субдомену `coin-images.coingecko.com.evil.test` |
| Етап 7 · Wave 4 · ремонт (`deadcode`) | `dag-worker` (`haiku`) | ~15k / ≤ 8 | 23 946 / 12 | DONE (спроба 1) | 3 невикористані експорти `favorites` → приватні |
| Етап 7 · Sync 4 · ремонт NFR-4 (coin-list) | `dag-worker` (`sonnet`) | ~60k / ≤ 30 | 35 843 / 11 | DONE (спроба 1) | панель пошуку й сортування в стані Loading (рішення власника 00:53) |
| Етап 7 · Sync 4 · ремонт NFR-4 (market-data) | `dag-worker` (`sonnet`) | ~50k / ≤ 25 | 27 073 / 8 | DONE (спроба 1) | стейблкоїни після першої відповіді топ-50 |
| Етап 7 · Red-Team прохід №1 | `red-team-auditor` (`opus`) | ~300k / 1 прохід | 265 253 / 118 | FAIL, D (P1 = 2, P2 = 13) | `.agentic/evidence/red-team-report.md` |
| Етап 7 · ремонт RT-1 (NFR-3) | `dag-worker` (`sonnet`) | ~80k / ≤ 40 | 49 275 / 28 | DONE (спроба 1) | постійний `TopCoinsPoller`, `refetchOnMount` / `retryOnMount: false`, без повтору в прихованій вкладці |
| Етап 7 · ремонт RT-2 (NFR-7), спроба 1 | `dag-worker` (`sonnet`) | ~70k / ≤ 40 | 29 443 / 15 | частково | зсув панелі в межі вікна, таблиця без `overflow-hidden`; лишилося `nowrap` у заголовку таблиці (вимір `reflow`) |
| Етап 7 · ремонт RT-2, спроба 2 | `dag-worker` (`haiku`) | ~15k / ≤ 8 | 27 457 / 8 | DONE | `whitespace-normal`, `min-w-0`; `reflow` 4/4 |
| Етап 7 · Red-Team прохід №2 | `red-team-auditor` (`opus`) | ~300k / 1 прохід | 147 652 / 60 | FAIL, D (P1 = 1: RT-3, P2 = 13) | RT-1, RT-2 закрито |
| Етап 7 · ремонт RT-3 (NFR-3, спроба 2 класу) | `dag-worker` (`sonnet`) | ~60k / ≤ 30 | 28 535 / 11 | DONE для фокусу; reconnect — ні (RT-4) | `isAttemptDue` для фокусу; твердження про reconnect у звіті воркера й evidence хибне (виправлено) |
| Етап 7 · Red-Team прохід №3 | `red-team-auditor` (`opus`) | ~300k / 1 прохід | 131 579 / 55 | FAIL, D (P1 = 1: RT-4, P2 = 14) | ескалація Circuit Breaker власнику |
| Етап 7 · рев'ю Revise №2 / №3, №7 | `independent-reviewer` (`opus`) | — | 98 662 / 29; 98 297 / 37 | PASS ×2 | гейт етапу 5 — `d7d162e` |
| Етап 7 · ремонт RT-4 (понад Circuit Breaker, згода власника) | `dag-worker` (`sonnet`) | ~80k / ≤ 40 | 65 634 / 26 | DONE | центральний вимикач; +3 приховані дефекти (стейблкоїни при `retry()`, reconnect без `queryFn`, `StrictMode` 2 запити) |
| Етап 7 · Red-Team прохід №4 | `red-team-auditor` (`opus`) | ~300k / 1 прохід | 172 245 / 67 | FAIL, D (P1 = 2: RT-5, RT-6; P2 = 16) | ескалація №2 власнику |
| Етап 7 · пакетний ремонт (RT-5, RT-6, TD-016, TD-017; згода власника) | `dag-worker` (`sonnet`) | ~90k / ≤ 45 | 44 284 / 14 | DONE | 9 тестів, кожен падав без виправлення |
| Етап 7 · Red-Team прохід №5 | `red-team-auditor` (`opus`) | ~300k / 1 прохід | 161 179 / 55 | PASS, D (P1 = 0, P2 = 14) | TD-006, TD-010, TD-016, TD-017 закрито; нові TD-018, TD-019 |
| Етап 7 · ремонт підказок від `clientWidth` (згода власника 02:53) | `dag-worker` (`sonnet`) | ~30k / ≤ 15 | 26 501 / 7 | DONE | мобільний `reflow` 4/4; браузер 320 px — прокрутка 0 |
| Етап 7 · Red-Team прохід №6 (вузький) | `red-team-auditor` (`opus`) | — | 75 172 / 31 | PASS, D (P1 = 0, P2 = 14) | RT-2 закрито повторно; знахідки без змін |
| Етап 7 · рев'ю Revise №2 / №3, №6 | `independent-reviewer` (`opus`) | — | 112 974 / 31; 103 053 / 29 | BLOCKERS FOUND ×2 | рядки журналу в матриці, §15.1 плану, гейт |
| Етап 7 · рев'ю Revise №2 / №3, №3–№5 (6 проходів) | `independent-reviewer` (`opus`) | — | 92 334 / 45; 80 008 / 33; 98 688 / 33; 110 206 / 37; 121 367 / 39; 79 753 / 30 | BLOCKERS FOUND ×6 | час записів (L-005), рядки без виводу (L-004) |
| Етап 7 · Revise №4 · W1 BUG-001 | `dag-worker` (`sonnet`) | ~60k / ≤ 60 | 42 116 / 22 (з продовженням: зону розширено на `triggers.test.jsx`, `useTopCoins.test.jsx`) | DONE | 101 тест `src/market-data`; таблиця тригерів L-006; оракул 91/91 |
| Етап 7 · Revise №4 · W2 BUG-002/004/005/008 | `dag-worker` (`sonnet`) | ~100k / ≤ 60 | 56 623 / 13 | DONE | 82 тести `src/app src/lib src/features`; оракул 91/91 |
| Етап 7 · Revise №4 · W3 BUG-006/007 | `dag-worker` (`sonnet`) | ~60k / ≤ 60 | 32 674 / 11 | DONE | 38 тестів; оракул 91/91 |
| Етап 7 · Revise №4 · Red-Team №7 | `red-team-auditor` (`opus`) | ~150k / — | 162 182 / 68 | DONE | PASS, D, P2 = 12; TD-005, TD-018 закрито, TD-021 новий |
| Етап 7 · Revise №6 · рев'ю №9 | `independent-reviewer` (`opus`) | — | 181 426 / 49 | BLOCKERS FOUND | BUG-файли зони 8.a у коміті етапу 7; 4 WARNING — виправлено |
| Етап 7 · Revise №6 · Red-Team №9 | `red-team-auditor` (`opus`) | ~150k / — | 155 463 / 44 | DONE | PASS, D, P2 = 14 (після ремонту TD-025 головним агентом — 13); TD-023 закрито; нові TD-024, TD-025 |

---

## 4. Записи етапів (валюта довіри й рішення)

### Етап 7 · Sync 0 (2026-11-03 00:19)

- Базовий хеш для відкату: `f689fc3`. Базовий прогін до змін: `pnpm install --frozen-lockfile && pnpm verify` — 0; оракул — 1 (91 з 91 червоні), як очікує план (розділ 13).
- Після Wave 0: `pnpm verify` — 0 (lint, fmt, 1 тест, build); `pnpm size` — 68,74 кБ gzip (ліміт 150); `pnpm boundaries` — 0 порушень (21 модуль, 34 залежності); оракул — 1 (91 з 91 червоні, поведінки ще немає).

### Етап 7 · Sync 1 (2026-11-03 00:28)

- Зони: W1-lib змінив лише `src/lib/**`, W1-ui — лише `src/ui/**` (`git status --short`).
- `pnpm verify` — 0 (3 файли тестів, 65 тестів); `pnpm size` — 68,73 кБ; `pnpm boundaries` — 0 порушень (34 модулі, 56 залежностей); `pnpm dup` — 0 клонів.

### Етап 7 · Sync 2 (2026-11-03 00:34)

- Зони: кожен воркер змінив лише свій модуль (`git status --short`).
- `pnpm verify` — 0 (9 файлів, 139 тестів); `pnpm size` — 75,85 кБ; `pnpm boundaries` — 0 порушень (51 модуль, 96 залежностей); `pnpm dup` — 1 клон, 0,39 % (поріг 3 %).

### Етап 7 · Sync 3 (2026-11-03 00:41)

- Зони: воркери змінили лише `src/features/<свій екран>/**`; поза зонами — лише `.dependency-cruiser.cjs` (головний агент, рішення власника, запит №2).
- `pnpm boundaries` — 0 порушень (81 модуль, 186 залежностей) після правки резолвера; `pnpm dup` — 2 клони, 0,38 %.
- `pnpm verify` — 1: 163 з 164 тестів, падає лише `src/app/App.test.jsx` (`Link` без роутера: `App` Wave 0 рендерить справжні екрани поза `HashRouter`). Це прогалина інтеграції, яку за планом закриває Wave 4 (`src/app/**`, головний агент); ремонтний воркер не потрібен. Sync 3 вважається закритим після Wave 4 разом із Sync 4.

### Етап 7 · Wave 4 і Sync 4 (2026-11-03 01:03)

- Wave 4 (головний агент): `src/app/App.jsx` (`MarketDataProvider` → `HashRouter` → `Layout` → межа помилок S-5 → маршрути), `Layout.jsx` (посилання «Перейти до вмісту», шапка з вкладками «Монети / Обрані · N», `<main id="main">`, футер), `NotFoundPage.jsx` (S-4), `AppErrorBoundary.jsx` (S-5), `App.test.jsx` (5 тестів); `a11y/**`, `scripts/web-vitals.mjs` (TD-002); `index.html` (`preload` топ-50); `vite.config.js` (`assetsInlineLimit` для шрифтів). Sync 3 закрито разом із Sync 4.
- `pnpm install --frozen-lockfile && pnpm verify` — 0 (12 файлів, 172 тести; JS 104,67 кБ gzip).
- Оракул `pnpm exec vitest run --config acceptance/vitest.config.js` — 0 (91 з 91; після запиту №3).
- `verify-gate.py --check-code .` — 0 (76 файлів); `verify-gate.py --debt` — 0 (8 команд, 7 аспектів; лічильники — `.agentic/evidence/debt-checks.md`).
- Браузер (скіл `verify`, preview 4173, справжній CoinGecko): 4 маршрути, 0 повідомлень у консолі, 0 `securitypolicyviolation`, 0 горизонтальної прокрутки на 320 px, фон тем `rgb(21, 18, 31)` / `rgb(247, 245, 251)`, асети 200.

### Етап 7 · Перевірка зон ремонтних воркерів після Sync 4 (записано 2026-11-03 03:10, постфактум)

Під час ремонтів після Sync 4 (01:03–02:58) зону кожного воркера перевіряли повним Sync (`git status --short` + `verify` + оракул + `--debt`), але окремих записів «воркер → змінені файли» в журнал не робили (рев'юер етапу 7, WARNING). Звірка постфактум — звіти воркерів (змінені файли) проти `git diff --name-only 871334b -- src` і `git ls-files --others src` (2026-11-03 03:10): `src/market-data` — 7 змінено + 5 нових (RT-1, RT-3, RT-4, пакетний ремонт; лише ця зона в їхніх звітах); `src/ui` — 2 змінено + 1 новий (RT-2 ×2, `clientWidth`); `src/features/coin-list` — 5 змінено (NFR-4 Loading; RT-2 спроба 1 — `CoinTable.jsx`, дозволено брифом); `src/favorites` — 2 змінено (ремонт `deadcode`); `src/app` — 2 змінено + 3 нові (Wave 4, головний агент). Файлів поза зонами брифів немає. Тести ремонтів (`navigation`, `focus`, `triggers`, `client`, `ui`) — у тих самих зонах.

### Етап 7 · Revise №6 (2026-11-04 00:23 – 00:40)

- **Рішення власника:** 2026-11-04 00:11 (трекер, розділ 4), пункти 1, 2, 5; старт — «Start Revise №6 of stage 7?». Базовий хеш відкату — `b8e23ff`.
- **Без воркерів:** 3 малі правки в 4 файлах коду (`index.html`, `src/features/favorites-view/model.js`, `src/app/FocusOnNavigate.jsx`, тест `src/app/App.navigation.test.jsx`) — головний агент, як у Revise №5; паралельних хвиль немає (Handoff Rule не застосовується).
- **Поза зоною етапу 7:** `e2e/us-8.e2e.spec.js`, `e2e/support/app.js` (зона 8.b) — зняття карантину WebKit за рішенням власника 00:11, п. 1; потрібен повтор `--stage 8.b --run` і гейт 8.b (Red-Team №9, 9.5).
- **Red-Team №9** знайшов регресію TD-025 (фокус на посиланні поза екраном на S-3 і без збереженої прокрутки); головний агент закрив її рекомендацією аудитора (`inViewport`, L-007), тест і браузерна перевірка `favoritesBack`.
- **Валюта довіри:** `pnpm verify` 0 (264 passed, 00:37:00); E2E 279 passed / 3 skipped; smoke 39; `test:a11y` 40; оракул 91; `--debt` 0 (00:28:44 – 00:29:33); LCP 906 мс.
- **Рев'ю №9 — BLOCKERS FOUND:** правки BUG-010.md / BUG-011.md скасовано (зона 8.a); фокус обмежено поверненням до списку; `logo-focus-check.mjs` звіряє 21 очікування з кодом виходу; повтори `verify`, E2E, smoke, оракул, `--debt` (00:50 – 00:53).
