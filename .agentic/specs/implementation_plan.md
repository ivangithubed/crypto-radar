# Крипто-Радар: план реалізації спринту 1 (SDD)

- **Етап:** Stage 6: План реалізації: хвилі DAG і матриця перевірок
- **Дата:** 2026-11-02
- **Вхід:** `01-product-brief.md` (`04c6271`), `02-requirements.md` (`2ff839a`), `03-architecture.md` і ADR 0001–0006 (`2edc20f`), `04-ux-and-contract.md` (етап 4), `05-platform-runbook.md` і каркас (`3c7cc09`), `.agentic/project.json`, `.agentic/tech-debt.md`, розділ 4 `.agentic/pipeline-state.md`.
- **Рішення власника (2026-11-02, трекер, розділ 4):** спринт 1 — усі Must US-1 – US-9; етап 7 — хвилі DAG; на Wave 0 дозволено додати `react-router`, `@tanstack/react-query`, `@fontsource/unbounded`, `@fontsource/onest`; робоча гілка — `main`.
- **Хто використовує:** етап 7 (`sdd-delivery`, `dag-runner`, воркери `dag-worker`), етап 8 (`qa-engineer`: матриця AC → перевірки), `independent-reviewer`, `red-team-auditor`.

---

## Спринт 1: мета спринту й обсяг

- **Мета спринту:** повний MVP за брифом: новачок без реєстрації бачить свіжий топ-50, шукає й сортує, відкриває монету з графіком за 7 днів, веде обрані й розуміє терміни з підказок.
- **Історії:** US-1, US-2, US-3, US-4, US-5, US-6, US-7, US-8, US-9 (усі Must; `.agentic/backlog.md` → статус `Sprint`, спринт 1).
- **Не входить у спринт 1:** US-10 (перемикач теми й `useTheme`) — спринт 2. До того тема лише як на пристрої: `public/theme-init.js` ставить `data-theme` з `prefers-color-scheme` (частина AC-10.1 без перемикача; приймальні тести US-10 не пишуться). Усе з «Won't» беклогу. Workflow публікації на GitHub Pages — етап 9.
- **Версія інкременту:** `0.1.0` (беклог, розділ 3).

## 1. Product Goal & Observable Success Criteria

Посилання: бриф §8–9 (G-1 – G-3, M-1 – M-5), беклог §1. Для хвиль важливо лише одне: **guardrail M-5** — жодної ціни, старшої за 300 с (NFR-1), у жодному стані жодного екрана.

Вимірні критерії готовності спринту (Done When) — розділ 12.4.

## 2. Users & Core Journeys

Посилання: бриф §3–5 (персони, JTBD), вимоги §3 (одна роль «Відвідувач», без входу), UX §2 (UF-1 – UF-6; UF-7 — спринт 2).

## 3. Pages, Routes & UI States

Посилання: UX §1 (карта екранів, заголовки вкладок), UX §3 (матриці станів S-1 – S-5, джерела помилок E-NET, E-SRC, E-429, E-SHAPE, E-STALE, E-STORE, C-TAB), UX §3.1 (компоненти зі станами).

| Маршрут (`HashRouter`) | Екран | Модуль | Стани, які реалізує спринт 1 |
| :--- | :--- | :--- | :--- |
| `#/` | S-1 Список монет | `features/coin-list` | Loading, Data, Data (фонове оновлення), Empty (пошук), Error, Partial, Conflict, Error (сховище) |
| `#/coin/:id` | S-2 Сторінка монети | `features/coin-page` | Loading, Data, Поза топ-50, Error, Partial, Conflict, Error (сховище) |
| `#/favorites` | S-3 Обрані | `features/favorites-view` | Loading, Empty, Data, Error, Порада Safari, Partial, Conflict, Error (сховище) |
| `*` | S-4 Сторінку не знайдено | `app` | Data |
| — | S-5 Збій застосунку (error boundary) | `app` | Error |

## 4. Design Tokens & Responsive

Посилання: UX §6 (брейкпоінти), UX §9.2 (токени; уже в `src/index.css`, етап 5), UX §9.4 (артборди Claude Design).

Рішення плану для хвиль:

- **Шрифти:** `@fontsource/unbounded` (ваги 600) і `@fontsource/onest` (400, 500, 600), лише підмножини `cyrillic` і `latin`; імпорт у `src/main.jsx` (Wave 0). Файли woff2 потрапляють у збірку Vite, жодних запитів до Google (NFR-10, CSP `default-src 'self'`).
- **Один макет у DOM:** список рендерить **або** картки `<ol>` (< 768 px), **або** `<table>` (≥ 768 px), а не обидва з прихованням CSS. Вибір — `useMediaQuery('(min-width: 768px)')` з модуля `ui`, початкове значення синхронне з `matchMedia` (без CLS). Так зчитувач і тести бачать одну копію даних.
- **Тема спринту 1:** `public/theme-init.js` (синхронний, у `<head>` через `<script src>`, UX UF-7.3): `crypto-radar:theme` (`light` / `dark`) → інакше `prefers-color-scheme` → `document.documentElement.dataset.theme`.

## 5. UI Components & Patterns

Посилання: архітектура §5 (модулі й публічні інтерфейси), UX §3.1, UX §9.3. Межі модулів — `.dependency-cruiser.cjs` (не змінюється).

**Публічні інтерфейси (контракти Wave 0).** Кожен модуль експортує лише через `src/<модуль>/index.js`; імпорт глибше за `index.js` з іншого модуля заборонений (перевіряє рев'ю Sync Point). Wave 0 створює `index.js` з JSDoc-сигнатурами й заглушками: функції й хуки кидають `Error('not implemented: <назва>')` лише під час виклику, компоненти повертають `null`; воркери замінюють заглушки реалізацією, **не змінюючи сигнатур**.

**Заглушки з'єднані в граф імпортів уже на Wave 0** (правило `no-orphans` у `.dependency-cruiser.cjs` і `knip.json` не змінюються): `App` імпортує `CoinListPage`, `CoinPage`, `FavoritesPage` і `MarketDataProvider`; заглушка кожної фічі імпортує `index.js` модулів, від яких залежить за розділом 5 архітектури; `glossary` імпортує `ui`, `market-data`, `favorites` і `chart` — `lib`. Окремого файла типів немає: `@typedef` лежать у `src/lib/index.js` (JSDoc-імпорти dependency-cruiser не бачить). Заглушки `theme` у спринті 1 немає (US-10 — спринт 2). Як імпортують заглушки: імпорт без прив'язок (`import "../../lib/index.js";`), щоб `no-unused-vars` під `--deny-warnings` не зробив `pnpm lint` червоним; заглушка `MarketDataProvider` повертає `children`; `App` на Wave 0 рендерить заглушки екранів усередині наявного каркаса (шапка, `<main>` з h1, футер), тож `src/app/App.test.jsx` лишається зеленим. `pnpm deadcode` (невикористані експорти заглушок) до Sync 4 не запускається: Sync 0–3 — `pnpm verify` і `pnpm boundaries`.

| Модуль | Експорт (сигнатура JSDoc) |
| :--- | :--- |
| `lib` | `formatPrice(usd: number): string` · `formatChange(pct: number): {text: string, direction: 'up'\|'down'\|'flat', spoken: string}` · `formatMarketCap(usd: number): string` · `formatPriceTime(date: Date): string` · `sortCoins(coins: Coin[], key: SortKey): Coin[]` · `searchCoins(coins: Coin[], query: string): Coin[]` · `normalizeQuery(raw: string): string` · `isFresh(oldestLastUpdated: Date, now: Date): boolean` · `pluralCoins(n: number, form: 'acc'\|'nom'): string` · константи `SORT_KEYS`, `SORT_LABELS`, `FRESHNESS_LIMIT_MS = 300000`, `QUERY_MAX_LENGTH = 50`, `PAGE_SIZE = 25` |
| `ui` | `Button`, `StatusMessage` (`role="status"`, ввічливе оголошення), `ErrorBlock({kind: 'src'\|'net'\|'stale', onRetry, retrying, retryFailed})`, `Skeleton`, `TermHintButton({term, hintText, id})` (базова доступна підказка UX §4 1.4.13), `useMediaQuery(query): boolean`, `useDocumentTitle(title)` |
| `market-data` | `useTopCoins(): {status: 'loading'\|'fresh'\|'error', errorKind: 'src'\|'net'\|'stale'\|null, coins: Coin[], pricesAt: Date\|null, retry(): void, retrying: boolean, retryFailed: boolean}` · `useStablecoinIds(): Set<string>` · `MarketDataProvider({children})` (створює власний `QueryClient` в `useState`) · `fetchTopCoins({signal})`, `fetchStablecoinIds({signal})` · `parseMarkets(json): Coin[]` (кидає `ShapeError`) |
| `favorites` | `useFavorites(): {ids: string[], add(id, top50Ids: Set<string>): boolean, remove(id): void, has(id): boolean, storeError: 'write'\|'read'\|null}` · `FAVORITES_KEY = 'crypto-radar:favorites'` · `SAFARI_HINT_KEY = 'crypto-radar:safari-hint-dismissed'` · `useSafariHint(): {visible: boolean, dismiss(): void}` |
| `glossary` | `TermHint({term: TermKey})` · `TERM_KEYS` (`marketCap`, `change7d`, `ticker`, `rank`, `stablecoin`, `volatility`) · `TERM_LABELS`, `HINT_TEXTS` (тексти UX §5.1 дослівно) |
| `chart` | `PriceChart7d({prices: number[]})` — SVG `viewBox`, `aria-hidden="true"` + `<p>` текстова альтернатива `coin.chart.alt` |
| `features/*` | `CoinListPage`, `CoinPage`, `FavoritesPage` (default-експорт не використовується; іменовані) |
| `app` | `App` (default export з `src/app/App.jsx`): `MarketDataProvider` → `HashRouter` → макет (шапка, `<main id="main">`, футер) → маршрути; error boundary S-5 |

**Компонентні правила, на які спирається оракул** (UX §3.1, §4, §5.2 — дослівні тексти):

- Назва монети в списку й обраних — посилання `href="#/coin/{id}"` з доступним ім'ям, рівним назві монети.
- ★ — `<button>` без `aria-pressed`, ім'я `Додати в обрані: {назва}` / `Прибрати з обраних: {назва}`; кнопки немає для монети поза топ-50, якої немає в обраних.
- Кнопка підказки «?» — `<button aria-expanded>` з доступним ім'ям **`Що означає «{термін}»?`** (рішення плану: UX задає гліф «?», але не ім'я; ім'я починається з питання, бо видимого тексту немає, WCAG 2.5.3 не застосовний). Панель — текст `HINT_TEXTS[term]`; закрита підказка **відсутня в DOM** (не `hidden`). Esc закриває відкриту підказку незалежно від того, де фокус (обробник `keydown` на `document`, поки підказка відкрита), і повертає фокус на «?».
- Поле пошуку — `<input type="search" maxlength="50" autocomplete="off">` з підписом «Пошук монети»; select — підпис «Сортування», опції з текстами `sort.*`.
- Напрям зміни за 7 днів — візуально прихований текст у картці (`change.up` / `change.down` / `change.flat`: «зростання на 4,2 %», «падіння на 3,7 %», «без змін»), а не `aria-label`: його читає і зчитувач, і `textContent`.
- Ранг у картці/рядку й на сторінці монети — окремий елемент без дочірніх елементів, увесь текст якого — число, необов'язково з префіксом `#` або `№` (`1`, `#49`, `№ 50`).
- Блок помилки даних — `role="alert"`, усередині — кнопка «Спробувати ще раз»; статус невдалого повтору — текст `error.retryFailed` у `role="status"` (UX §5.2).
- Обрані на S-3 — `<ol aria-label="Обрані монети, {N}">`; вибула монета — `<li>` унизу з `id`, позначкою `fav.outOfTop` і ★ «Прибрати з обраних: {id}».
- Вкладка обраних — посилання `#/favorites`, видимий текст `Обрані · {N}` (при 0 — `Обрані`).
- Футер на кожному екрані й у кожному стані: `Інформація не є інвестиційною порадою.`, посилання `https://www.coingecko.com/en/api` з `<span lang="en">Powered by CoinGecko</span>`, `footer.privacy`.

## 6. Functional Rules & Edge Cases

Посилання: вимоги §4–5 (бізнес-правила US-1 – US-9), UX §3 (матриці станів), UX §5.3 (формат чисел), архітектура §6 (інваріанти), §7 (потоки).

Рішення плану, яких немає в документах етапів 1–5 (кожне — у звіті етапу 6, розділ «Рішення»):

| № | Питання | Рішення | Чому |
| :--- | :--- | :--- | :--- |
| P-1 | Як назвати в обраних монету поза топ-50, якщо в localStorage лише `id` (NFR-10)? | Показувати `id` монети як є (`moneta-x`), без перекладу й капіталізації | NFR-10 забороняє зберігати назви; `id` CoinGecko читабельний (`bitcoin`, `usd-coin`) |
| P-2 | Ім'я кнопки «?» | `Що означає «{термін}»?` | UX не задав; має бути унікальним на екрані й зрозумілим без контексту |
| P-3 | Як уникнути подвійних даних картки й таблиці | Один макет у DOM через `useMediaQuery` (розділ 4) | Зчитувач і тести бачать одну копію; CSS-приховування дало б дубль у jsdom |
| P-4 | Повтори TanStack Query vs NFR-3 | `retry` Query вимкнено (`retry: false`); власна політика в `fetchTopCoins`: 429 → 0 повторів, мережа / таймаут 10 с / 5xx → 2 повтори через 2 с і 4 с | Одна політика повторів, яку тестує модульний тест (NFR-3) |
| P-5 | Інтервал перевірки свіжості | `setInterval` 1 с у `useTopCoins`: якщо `!isFresh(oldest, new Date())` → `status: 'error', errorKind: 'stale'` | NFR-1: перехід у Error не пізніше ніж за 1 с |
| P-6 | Фонове оновлення | `refetchInterval: 60000`, `refetchIntervalInBackground: false`, `refetchOnWindowFocus` лише якщо дані старші за 60 с; **перше завантаження не залежить від `visibilityState`** | NFR-2, NFR-3; jsdom і prerender-вкладки не блокують перший запит |
| P-7 | Мінімальна кількість монет у відповіді | Після фільтра `1 ≤ rank ≤ 50` має лишитися рівно 50 монет із коректними полями, інакше `ShapeError` → E-SHAPE. Порожній `sparkline_in_7d.price` формою **не** вважається помилкою (його обробляє P-8) | UX §3 E-SHAPE («менше ніж 50 монет») |
| P-8 | `sparkline_in_7d.price` порожній або < 2 точок для монети | Сторінка монети → Error (`kind: 'src'`), список і обрані не зачіпає | AC-8.7; список не показує графіка |
| P-9 | Час цін для «Ціни на ЧЧ:ХХ» | `pricesAt` = найстаріший `last_updated` серед 50 монет | UX §5.2 `prices.time` |

## 7. Data Model & Persistence

Посилання: архітектура §6 (доменна модель, інваріанти), ADR 0004 (ключі localStorage без суфікса версії), ADR 0006.

- **JSDoc-типи (Wave 0):** у `src/lib/index.js` — `@typedef` `Coin`, `SortKey`, `TopCoinsState`. Поля `Coin` — дослівно архітектура §6 (`id`, `name`, `symbol`, `rank`, `priceUsd`, `change7dPct`, `marketCapUsd`, `imageUrl`, `sparkline7d`, `lastUpdated`, `isStablecoin`).
- **Мапінг відповіді CoinGecko → `Coin`:** архітектура §6, таблиця «Сутність / поле»; `symbol` у верхньому регістрі; `isStablecoin` — `id ∈ useStablecoinIds()` (обчислюється у фічі, не в `parseMarkets`).
- **localStorage:** рівно 3 ключі (NFR-10): `crypto-radar:favorites` (JSON-масив рядків), `crypto-radar:theme` (лише читає `theme-init.js`), `crypto-radar:safari-hint-dismissed` (`"1"`). Некоректне значення → порожній список / ключ ігнорується, без винятку назовні. Видалення за часом немає (NFR-11). Міграцій у спринті 1 немає.
- **Синхронізація вкладок:** подія `storage` для `crypto-radar:favorites` → оновлення стану (C-TAB).

## 8. Stack & Architecture

Посилання: ADR 0001 (стек), архітектура §4–5, `CLAUDE.md`. Нові залежності спринту (Wave 0, лише `pnpm add` після `npm view <pkg>` — версія, дата релізу, репозиторій; NFR-9):

| Пакет | Навіщо | Обмеження |
| :--- | :--- | :--- |
| `react-router` | `HashRouter`, `Routes`, `Route`, `Link`, `useParams` — лише декларативний режим | Без `@react-router/dev`, framework mode, SSR і плагіна Vite (рішення власника, етап 3) |
| `@tanstack/react-query` | Кеш знімка топ-50, фонове оновлення, спільний знімок для S-1 – S-3 | `retry: false` (P-4); devtools не додаються |
| `@fontsource/unbounded`, `@fontsource/onest` | Self-hosted woff2 шрифтів дизайн-системи | Лише потрібні ваги й підмножини (розділ 4) |

Після Wave 0: `pnpm size` ≤ 150 кБ gzip (NFR-5); фактичний розмір записати в журнал автономності.

## 9. Accessibility & Standards

Посилання: NFR-6, NFR-7, UX §4 (таблиця критеріїв WCAG 2.2 AA з перевірками). EAA не застосовна (архітектура §8.5). Для етапу 7: тести Testing Library пишуться за ролями й доступними іменами; `pnpm test:a11y` розширюється на всі екрани й стани UX §3 в обох темах (Wave 4, TD-002).

## 10. Security & Protected Data

Посилання: NFR-8 (CSP, уже у `vite.config.js`), NFR-10, архітектура §8.2 (STRIDE), §8.3 (OWASP), `project.json → quality_rules` (`no-unsafe-html`, `no-dynamic-code`, `only-coingecko-origins`). Секретів немає. Для хвиль: перевірка форми відповіді (`parseMarkets`) обов'язкова; логотипи — лише `https://coin-images.coingecko.com/…` (інакше `imageUrl` = порожній і логотип не рендериться); `console.warn` для `last_updated` із майбутнього > 60 с (архітектура §8.2).

## 11. Performance & Web Vitals

Посилання: NFR-4 (LCP ≤ 2,5 с, CLS ≤ 0,1, TBT ≤ 200 мс), NFR-5 (≤ 150 кБ gzip). Рішення: скелетони в розмір справжніх карток і графіка (CLS), лого `width`/`height` 24 і 40 px, `loading="lazy"` для лого з 7-ї картки; сторінки монети й обраних — у тому самому бандлі (розбиття коду не потрібне, поки `pnpm size` має запас). `pnpm vitals` працює на записаному прикладі відповіді (TD-002, Wave 4).

## 12. Test Strategy

### 12.1. Рівні тестів

| Рівень | Інструмент | Де | Хто пише | Коли |
| :--- | :--- | :--- | :--- | :--- |
| Оракул (приймальні) | Vitest 5 + Testing Library + jsdom, `<App/>` цілком, `fetch` підмінено | `acceptance/**` | етап 6 (цей план), до коду | падають на етапі 6, зелені після Wave 4 |
| Модульні | Vitest 5 (+ fake timers) | `src/**/*.test.{js,jsx}` поруч із кодом | воркер своєї зони | у кожній хвилі |
| Доступність | Playwright + axe | `a11y/**` | головний агент, Wave 4 | після інтеграції |
| Web Vitals | Lighthouse | `scripts/web-vitals.mjs` | головний агент, Wave 4 | після інтеграції |
| Holdouts | власник | `.agentic/holdouts/` | власник | `--stage 7 --run` |
| E2E | Playwright | `e2e/` | етап 8.b | після етапу 7 |

**Борг етапу 5, який закриває план:**

- `TD-002` — Wave 4: `a11y/**` і `scripts/web-vitals.mjs` підміняють `api.coingecko.com` записаним прикладом із `src/test/fixtures/` (Playwright `page.route`; для Lighthouse — збірка з прапорцем фікстури лише в `scripts/`, без коду в бандлі продукту).
- `TD-003` — `msw` і `@testing-library/user-event` **не потрібні**: оракул і модульні тести підміняють `fetch` (`vi.stubGlobal`) і діють через `fireEvent`. Пакети не додаються (менше залежностей, NFR-9); закриття рядка в реєстрі — на гейті етапу 7 після підтвердження власником.
- `TD-004` — Wave 0: після підключення `@fontsource/onest` перевірити ознаку `tnum` у файлі woff2 (`font-variant-numeric: tabular-nums` вирівнює ціни). Якщо її немає — записати в журнал автономності й лишити `tabular-nums` для ціни без зміни шрифту.

### 12.2. Оракул

- **Шляхи:** `acceptance/**` (`.agentic/project.json → oracle.paths`).
- **Команда:** `pnpm exec vitest run --config acceptance/vitest.config.js` (`oracle.command`).
- **Будова:** `acceptance/support/` — фальшиве джерело (`fake-coingecko.js`: 50 монет + Монета-51 у відповіді, керування статусами 200 / 429 / 503 / «ніколи не відповідає», знімок стейблкоїнів), годинник (`vi.useFakeTimers({toFake: ['Date']})` — заморожений `Date`, справжні таймери), рендер `<App/>` за хешем маршруту, `matchMedia` (телефон, < 768 px). Один файл на історію: `acceptance/us-N.acceptance.test.jsx`; назва кожного тесту починається з `AC-N.M`.
- **Цілісність:** після коміту етапу 6 файли `acceptance/**` змінює лише «Revise» етапу 6 (`verify-gate.py --stage 7` порівнює з комітом етапу 6, хук `protect_paths.py`).
- **Holdouts (пропозиція власнику, пише власник):** (1) `last_updated` з майбутнього на 2 хв — ціни видно, у консолі лише `console.warn`; (2) у відповіді `current_price: null` для однієї монети — Error, не «$NaN»; (3) значення `crypto-radar:favorites` = `"{\"a\":1}"` — порожні обрані без падіння; (4) назва монети `<img src=x onerror=alert(1)>` рендериться текстом; (5) дві вкладки: прибрати монету в одній — друга оновлює ★ без перезавантаження. Команда — `oracle.holdouts_command`, задає власник.

### 12.3. Матриця AC → перевірки

Оракул: `acceptance/us-N.acceptance.test.jsx`, тест з префіксом `AC-N.M`. Модульний: що перевіряє воркер у своїй зоні. Ручні й E2E-перевірки — етап 8.

| AC | Оракул | Модульний тест (етап 7) | Додатково |
| :--- | :--- | :--- | :--- |
| AC-1.1 | так | `lib`: `formatPrice`, `formatChange`, `formatMarketCap` | — |
| AC-1.2 | так | — | 8.a |
| AC-1.3 | так (0 і 1 натискання) | `coin-list`: фокус на 26-ту монету | 8.a |
| AC-1.4 | так (1, 49, 50 є; 51 нема) | `market-data`: `parseMarkets` фільтр рангу | — |
| AC-1.5 | так (9 прикладів) | `lib`: `formatChange` межі 0,05 / 0,04 / −0,05 | — |
| AC-2.1 – AC-2.8 | так (AC-2.5 — новий рендер) | `lib`: `sortCoins` тай-брейк за рангом | — |
| AC-3.1 – AC-3.9 | так (AC-3.6 — `maxlength=50` і запит 50 символів) | `lib`: `searchCoins`, `normalizeQuery` | 8.a: введення 51-го символу |
| AC-4.1 – AC-4.4 | так | `chart`: текстова альтернатива, 168 точок | 8.b: E2E |
| AC-5.1 – AC-5.7 | так | `favorites`: `add` лише з топ-50, без дублів, некоректний JSON | — |
| AC-6.1 – AC-6.7 | так (AC-6.1 — localStorage, заповнений до рендеру) | `favorites`: подія `storage` | 8.a: Safari / WebKit (ADR 0006) |
| AC-7.1 – AC-7.4 | так | `glossary`, `ui`: Esc, `aria-expanded`, одна відкрита | 8.a: 1.4.13 вручну |
| AC-8.1 – AC-8.8 | так (AC-8.4 межі 299 / 300 / 301 с; AC-8.5 — зсув годинника, ≤ 2 с) | `market-data`: 429 → 0 повторів, 503 → 2 (2 с, 4 с), таймаут 10 с, `isFresh` межі | 8.b: підрахунок запитів NFR-3 |
| AC-9.1 – AC-9.3 | так (AC-9.3 — латиниця лише в назвах, тікерах, `Powered by CoinGecko`, `CoinGecko`, `GitHub`) | — | 8.a: виняток атрибуції (трекер, 2026-11-02 19:46) |

Must-AC спринту: 55 сценаріїв (US-1 – US-9), 55 з оракулом; 91 тест (кожен приклад структури сценарію — окремий тест). Базовий прогін етапу 6: 91 з 91 червоні, причина в усіх — відсутні елементи інтерфейсу (звіт етапу 6, 4.2).

### 12.4. Done When (етап 7)

- [ ] `pnpm install --frozen-lockfile && pnpm verify` — код 0 (`verify_commands["7"]`).
- [ ] Оракул `pnpm exec vitest run --config acceptance/vitest.config.js` — код 0, усі тести `AC-*` зелені, файли оракула не змінені після коміту етапу 6.
- [ ] `python .agentic/bundle/skills/gate-check/verify-gate.py --debt` — код 0: `lint`, `dup` ≤ 3 %, `deadcode` = 0, `boundaries` 0 порушень, `audit` 0 high/critical, `sbom`, `test:a11y` 0 critical/serious на всіх екранах в обох темах, `vitals` LCP ≤ 2,5 с, CLS ≤ 0,1, TBT ≤ 200 мс.
- [ ] `pnpm size` ≤ 150 кБ gzip.
- [ ] `python .agentic/bundle/skills/gate-check/verify-gate.py --check-code .` — код 0 (`quality_rules`: `no-unsafe-html`, `no-dynamic-code`, `only-coingecko-origins`).
- [ ] Перевірка в браузері скілом проєкту `verify` (`.claude/skills/verify/SKILL.md`): 0 помилок консолі й CSP на `#/`, `#/coin/bitcoin`, `#/favorites`, `#/abc`; ширина 320 px без горизонтальної прокрутки; скриншоти обох тем.
- [ ] Red-Team аудит — PASS; знахідки P2 — у `.agentic/tech-debt.md`.
- [ ] Holdouts власника (якщо написані) — код 0.

## 13. CI, Preview & Rollback

- **Target Branch:** `main` (робоча гілка етапів 1–5, рішення власника 2026-11-02). Окрема гілка не створюється.
- **Baseline Verification:** перед першим рядком коду етапу 7 — `pnpm install --frozen-lockfile && pnpm verify` і `pnpm exec vitest run --config acceptance/vitest.config.js`. Очікувано: verify — код 0; оракул — код 1, бо поведінки ще немає (базовий стан етапу 6: усі тести `AC-*` червоні — див. звіт етапу 6, розділ 4.2). Інший результат — зупинка.
- **Контрольні точки:** перед кожною хвилею головний агент пропонує коміт `chore(stage-7): checkpoint before wave N` явним списком файлів — лише за згодою власника. Без згоди — `git stash` не використовується; базою відкату лишається коміт етапу 6.
- **Rollback Protocol** (лише за явною згодою власника, знищує незакомічені зміни):

  ```bash
  # відкат хвилі до останньої контрольної точки (або коміту етапу 6)
  git reset --hard <хеш контрольної точки> && git clean -fd -- src acceptance a11y scripts public
  ```

  Відкат залежностей Wave 0 — той самий `git reset --hard` (повертає `package.json` і `pnpm-lock.yaml`), далі `pnpm install --frozen-lockfile`.
- **CI:** `.github/workflows/` етапу 5 (verify + `verify-gate.py --ci`) не змінюється; `--ci` перевіряє **цілісність** оракула (файли `acceptance/**` = коміт етапу 6), але не запускає його: `pnpm verify` бере тести лише з `src/**`. Запуск оракула в CI — пропозиція власнику (зона етапу 5, звіт етапу 6, розділ 6). Workflow деплою — етап 9.
- **Preview:** локально `pnpm build && pnpm preview` (http://localhost:4173/crypto-radar/); staging немає (ADR 0003).
- **Completion & PR Protocol:** коміт етапу 7 (`feat(stage-7): …`) явним списком файлів, без `git add .`, лише після «Approve & закоміть» на гейті етапу 7; push і PR — лише за окремою згодою власника; агент не мерджить і не видаляє гілок.

## 14. Observability & Autonomy

Посилання: NFR-13 (0 `console.error` у штатних сценаріях, без віддаленої телеметрії). Журнал: `.agentic/autonomy-journal.md` — таблиця «Бюджет агентів» (план / факт за кожним воркером), рішення головного агента на Sync Points, спрацювання Circuit Breaker.

## 15. Out-of-Scope, Risks, Budget & Multi-Agent DAG

### 15.1. Out of Scope

US-10 (перемикач теми, `src/theme/**`) — спринт 2; усе «Won't» беклогу; workflow деплою, SemVer-тег і CHANGELOG — етап 9; E2E — етап 8.b; зміна `.dependency-cruiser.cjs`, `knip.json`, `.jscpd.json`, `.oxlintrc.json`, порогів `debt_commands` — заборонено (лише власник через ADR етапу 3).

### 15.2. Ризики

| Ризик | Запобіжник |
| :--- | :--- |
| Строк G-2 (2026-11-09): лишається 7 днів на етапи 7–8 | Паралельні хвилі; US-10 винесено; Circuit Breaker 2 спроби на гейт, далі ескалація |
| TanStack Query + заморожений `Date` в оракулі дають нестабільні тести | Оракул заморожує лише `Date`; таймери справжні; таймаут тесту 15 с; P-6 |
| Воркери розходяться з контрактом Wave 0 | Сигнатури в `index.js` незмінні; Sync Point — `pnpm boundaries` + оракул; глибокі імпорти — рев'ю |
| Ліміт CoinGecko без ключа в `test:a11y` і `vitals` | TD-002: підміна `api.coingecko.com` записаним прикладом (Wave 4) |
| Розмір бандла після Router + Query + шрифтів | `pnpm size` після Wave 0 і Wave 4; шрифти — CSS-імпорт, не в JS |
| Safari-підказка не перевіряється в jsdom | `useSafariHint` — модульний тест із підміною `navigator.userAgent`; ручна перевірка 8.a |

### 15.3. Хвилі DAG і матриця володіння файлами

Зони паралельних воркерів однієї хвилі не перетинаються. Спільні файли (`package.json`, `pnpm-lock.yaml`, `index.html`, `src/main.jsx`, `src/app/**`, `src/test/**`, `a11y/**`, `scripts/**`, `public/**`, конфіги) належать лише головному агенту. `acceptance/**` не змінює ніхто (оракул).

| Хвиля | Виконавець / Роль | Рівень моделі | File Ownership Matrix | Залежить від | Бюджет токенів і ходів |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Wave 0** | Root Orchestrator: залежності, контракти, фікстури, шрифти, тема пристрою, маніфест | сесія власника | `package.json`, `pnpm-lock.yaml`, `index.html`, `src/main.jsx`, `public/theme-init.js`, `public/manifest.webmanifest`, `public/icons/**`, `src/app/App.jsx` (лише імпорт заглушок), `src/*/index.js` і `src/features/*/index.js` (заглушки, крім `theme`), `src/test/fixtures/**` | — | ~100k токенів (головний агент) |
| **Sync 0** | Root: `pnpm verify`, `pnpm boundaries`, `pnpm size`; оракул червоний | сесія власника | — | Wave 0 | — |
| **Wave 1** | W1-lib: форматування, сортування, пошук, свіжість | `sonnet` | `src/lib/**` | Sync 0 | ~120k / ≤ 60 ходів |
| **Wave 1** | W1-ui: базові доступні компоненти, `useMediaQuery`, `useDocumentTitle` | `sonnet` | `src/ui/**` | Sync 0 | ~120k / ≤ 60 ходів |
| **Sync 1** | Root: `pnpm verify`, `pnpm boundaries` | сесія власника | — | Wave 1 | — |
| **Wave 2** | W2-market-data: клієнт CoinGecko, `parseMarkets`, політика повторів, `useTopCoins`, `useStablecoinIds`, `MarketDataProvider` | `sonnet` | `src/market-data/**` | Sync 1 | ~150k / ≤ 60 ходів |
| **Wave 2** | W2-favorites: `useFavorites`, подія `storage`, `useSafariHint` | `sonnet` | `src/favorites/**` | Sync 1 | ~100k / ≤ 50 ходів |
| **Wave 2** | W2-glossary: `TermHint`, тексти UX §5.1 | `haiku` | `src/glossary/**` | Sync 1 | ~60k / ≤ 30 ходів |
| **Wave 2** | W2-chart: `PriceChart7d` + текстова альтернатива | `sonnet` | `src/chart/**` | Sync 1 | ~80k / ≤ 40 ходів |
| **Sync 2** | Root: `pnpm verify`, `pnpm boundaries` | сесія власника | — | Wave 2 | — |
| **Wave 3** | W3-coin-list: S-1 (картки/таблиця, пошук, сортування, «Показати більше», ★, підказки, стани) | `sonnet` | `src/features/coin-list/**` | Sync 2 | ~150k / ≤ 60 ходів |
| **Wave 3** | W3-coin-page: S-2 (дані, графік, поза топ-50, стани) | `sonnet` | `src/features/coin-page/**` | Sync 2 | ~120k / ≤ 60 ходів |
| **Wave 3** | W3-favorites-view: S-3 (порядок, вибулі, Empty, порада Safari, стани) | `sonnet` | `src/features/favorites-view/**` | Sync 2 | ~120k / ≤ 60 ходів |
| **Sync 3** | Root: `pnpm verify`, `pnpm boundaries` | сесія власника | — | Wave 3 | — |
| **Wave 4** | Root Integration: `App` (провайдери, `HashRouter`, макет, S-4, S-5, заголовки вкладок), TD-002 (фікстури в `a11y/**` і `scripts/web-vitals.mjs`), a11y усіх екранів | сесія власника | `src/app/**`, `a11y/**`, `scripts/web-vitals.mjs`, `playwright.a11y.config.js` | Sync 3 | ~150k токенів (головний агент) |
| **Sync 4** | Root: `pnpm verify`, оракул, `verify-gate.py --debt`, скіл `verify` у браузері | сесія власника | — | Wave 4 | — |
| **Wave 5** | Red-Team Verifier (`red-team-auditor`) | `opus` | лише читає (`src/**`, `a11y/**`, `scripts/**`) | Sync 4 | ~300k / 1 прохід |

**Разом:** 9 воркерів + 2 хвилі головного агента + Red-Team; орієнтир ~1,6 млн токенів. Факт кожного воркера — у журнал автономності; перевищення ≥ 50 % — пояснення у звіті етапу 7.

**Ремонт на Sync Point:** червоний Sync → ремонтний `dag-worker` у зоні файлів, де падає перевірка, не більше 2 спроб (Circuit Breaker), далі зупинка й ескалація власнику з логом.

**Інструкція воркеру (шаблон для `dag-runner`):** зона файлів; сигнатури з `src/<модуль>/index.js` не змінювати; тексти — дослівно UX §5; модульні тести поруч із кодом; фокусна перевірка `pnpm exec vitest run src/<модуль>` + `pnpm exec oxlint src/<модуль>` + `pnpm exec oxfmt --check src/<модуль>`; не чіпати `acceptance/**`, `package.json`, конфіги; звіт — що зроблено, які тести, відкриті питання.
