# Red-Team аудит етапу 7, спринт 1 (Крипто-Радар)

- **Аудитор:** субагент `red-team-auditor` (`opus`), регламент `red-team-review` + `tech-debt-auditor`, контракт `sdd-delivery` §13; лише читання.
- **Поточний прохід:** №6 (вузький), 2026-11-03 (вивід `pnpm verify` аудитора — «Start at 02:58:57»); повний аудит — прохід №5 («Start at 02:43:55», записано о 02:50 за `date`).
- **База:** `f689fc3`; чекпоінти `62fe221`, `3bc6ee3`, `ccaddfb`, `871334b`; далі незакомічене дерево етапу 7. `has_http_api: false`, `stack.type: frontend-only`.
- **Circuit Breaker:** клас NFR-3 після ескалацій власнику (трекер, розділ 4: 01:56 — центральний вимикач, 02:36 — пакетний ремонт) закрито; нових P1 немає.

VERDICT: PASS
Enterprise Readiness Score: D

Лічильники: P0 = 0 · P1 = 0 · P2 = 14

Оцінка за формулою 13.2 контракту: P0 = 0, P1 = 0, P2 = 14 ≥ 10 → **D**. Гейт можливий (P0/P1 = 0); кожна P2 — у реєстрі `.agentic/tech-debt.md` з тим самим ID.

## Історія проходів

| Прохід | Вердикт | Оцінка | P1 | P2 | Підсумок |
| :--- | :--- | :--- | :--- | :--- | :--- |
| №1 | FAIL | D | 2 (RT-1, RT-2) | 13 | RT-1: NFR-3, запити при переходах між екранами в стані помилки; RT-2: NFR-7, відкрита підказка на 320 px і обрізання в таблиці на 1280 px |
| №2 | FAIL | D | 1 (RT-3) | 13 | RT-1, RT-2 закрито; RT-3: NFR-3, повернення у вкладку в стані помилки |
| №3 | FAIL | D | 1 (RT-4) | 14 | RT-3 закрито для фокусу; RT-4: NFR-3, подія `online` обходить `isAttemptDue`; новий TD-015; ескалація власнику |
| №4 | FAIL | D | 2 (RT-5, RT-6) | 16 | RT-4 закрито центральним вимикачем; RT-5: призупинений в офлайні запит продовжується в прихованій вкладці; RT-6: перехід під час запиту стейблкоїнів — другий запит; нові TD-016, TD-017; ескалація №2 |
| №5 | PASS | D | 0 | 14 | Пакетний ремонт закрив RT-5, RT-6, TD-010, TD-016, TD-017; TD-006 закрито побічно; нові TD-018, TD-019 |
| №6 (вузький) | PASS | D | 0 | 14 | Перевірка в браузері (мобільна емуляція 320 px) знайшла, що RT-2 на телефоні закрито не до кінця (`innerWidth` росте з переповненням); рішення власника 02:53 — межа від `clientWidth`; RT-2 закрито повторно; вимір `reflow` — мобільна емуляція; нових знахідок немає |

## 1. Стан RT-1 – RT-6 і закритих TD

| ID | Стан | Доказ |
| :--- | :--- | :--- |
| RT-1 | закрито | `src/market-data/MarketDataProvider.jsx:9-18` (`refetchOnMount: false`, `retryOnMount: false`); постійний `TopCoinsPoller` (`MarketDataProvider.jsx:31`); тести `navigation.test.jsx`, `triggers.test.jsx` |
| RT-2 | закрито | `src/ui/hintOffset.js`, `TermHintButton.jsx`, `CoinTable.jsx`; `a11y/reflow.a11y.spec.js`; `pnpm test:a11y` 40 passed |
| RT-3 | закрито | `TopCoinsPoller.jsx:14` (`refetchOnWindowFocus: shouldAutoRefresh`), `topCoinsQuery.js:35-48`; query-core `query.ts:583-590`; `focus.test.jsx` |
| RT-4 | закрито | `MarketDataProvider.jsx:16` (`refetchOnReconnect: false`), `TopCoinsPoller.jsx:15`; query-core `query.ts:597-604` |
| RT-5 | закрито | `MarketDataProvider.jsx:12` (`networkMode: "always"`): query-core `retryer.ts:96-100, 300-310` — `pause()` не настає, `continue()` нічого не робить; `triggers.test.jsx:246-300` |
| RT-6 | закрито | `useStablecoinIds.js:26` (`queryFn` без сигналу): `removeObserver` лише `cancelRetry()` (`query.ts:638-647`), новий спостерігач приєднується (`query.ts:707-722`); `triggers.test.jsx:302-329` |
| TD-010 | закрито | `networkMode: "always"`: офлайн → E-NET приблизно за 6 с (P-4), без нескінченного «Завантажуємо…»; `triggers.test.jsx:269-284` |
| TD-016 | закрито | `useTopCoins.js:71-75` (гілка `errorUpdatedAt > 0`); `triggers.test.jsx:358-398` |
| TD-017 | закрито | `useTopCoins.js:41` (`refetch({ cancelRefetch: false })`); `triggers.test.jsx:331-356` |
| TD-006 | закрито побічно (читанням коду) | під час ручного повтору без даних `useTopCoins` віддає `error`, тож S-2 і S-3 тримають блок помилки; `FavoritesPage.test.jsx:101-115`; тесту фокусу на S-2 немає |

## 2. Тригери query-core 5.105.0 після ремонту

| Тригер | `["top-coins"]` | `["stablecoins"]` | Тест |
| :--- | :--- | :--- | :--- |
| Старт (поллер; preload з тим самим URL) | 1 | 1 після першої відповіді топ-50 | `triggers.test.jsx:163-174` |
| `StrictMode` | 1 | 1 | `:227-233`, `:320-329` |
| Монтування / перехід | 0 | 0 (запит у дорозі не скасовується) | `:102-103`, `:302-318` |
| Фокус | 0 / 1 (видима і ≥ 60 с від спроби) | 0 | `:104-113`, `:137-146`, `focus.test.jsx` |
| Reconnect | 0 / 1 (та сама умова) | 0 | `:114-135`, `:147-156`, `:178-193` |
| Інтервал | 1 на хвилину, не в прихованій вкладці | 0 | `:136`, `:206-225` |
| Офлайн у видимій вкладці | 1 спроба на хвилину (0 запитів у мережу) | 1 локальна відмова (TD-019) | `:246-284` |
| Офлайн → сховали → онлайн | 0 | 0 | `:246-267` |
| Ручний повтор | приєднання або нова спроба (≤ 3 запити P-4) | 0 | `:286-300`, `:331-356` |
| `invalidate` / `prefetch` / `reset` / `setQueryData` | у `src/**` немає | — | — |

## 3. Виміряний борг (debt_commands)

Джерело — `.agentic/evidence/debt-checks.md`, «Повтор після пакетного ремонту» (02:40); повтори аудитора: `pnpm verify` 235 passed (Start at 02:43:55), NFR-5 105,06 кБ; `--check-code .` 82 файли, 0; `--scan-secrets .` 161 файл, 0.

| Аспект | Команда | Код | Метрика / поріг | Висновок |
| :--- | :--- | :--- | :--- | :--- |
| complexity | `pnpm lint`, `pnpm dup` | 0 | 0 попереджень, складність ≤ 15; 6 клонів, 0,86 % / ≤ 3 % | у межах; TD-012 |
| dead_code | `pnpm deadcode` | 0 | 0 / 0 | у межах |
| boundaries | `pnpm boundaries` | 0 | 0 порушень, 90 модулів | у межах |
| vulnerabilities | `pnpm audit --audit-level high` | 0 | 0 high/critical; 2 moderate | у межах; TD-001 |
| sbom | `pnpm sbom:write` | 0 | CycloneDX 1.7 | у межах |
| accessibility | `pnpm test:a11y` | 0 | 40 passed, 0 critical/serious | у межах; TD-007, TD-008 axe не ловить |
| web_vitals | `pnpm vitals` | 0 | LCP 906,5 мс, CLS 0,000, TBT 6,0 мс | у межах; TD-013 |
| NFR-5 | `pnpm size` | 0 | 105,06 кБ / ≤ 150 | у межах |

## 4. NFR-N і STRIDE

| ID | Результат |
| :--- | :--- |
| NFR-1 | виконано (оракул AC-8.4, AC-8.5); крайовий випадок — TD-009 |
| NFR-2 | виконано за кодом; розбіжність тексту з правилом «≥ 60 с від спроби» — TD-015; E2E — 8.b |
| NFR-3 | **виконано**: RT-1, RT-3–RT-6 закрито, нових шляхів немає (розділ 2); E2E з підрахунком — 8.b |
| NFR-4 | 906,5 мс / 0,000 / 6,0 мс; TD-002, TD-013 |
| NFR-5 | 105,06 кБ |
| NFR-6 | 40 passed; TD-007, TD-008 |
| NFR-7 | виконано (RT-2) |
| NFR-8 | виконано (`--check-code .` 0, CSP) |
| NFR-9 | виконано; TD-001 |
| NFR-10 | виконано (`only-coingecko-origins` 0) |
| NFR-11 | виконано; TD-005 |
| NFR-12, NFR-15 | етап 9 |
| NFR-13, NFR-14, NFR-16 | без змін (захід є; E2E — 8.b) |

STRIDE — усі 17 рядків §8.2 `03-architecture.md` (таблицю зведено головним агентом з висновків проходів №1–№6 на вимогу рев'юера; висновки — аудиторів, доказ — файл):

| Компонент · загроза | Висновок | Доказ |
| :--- | :--- | :--- |
| Статичні файли · S (підроблений сайт) | прийнятий ризик (власник, 2026-11-02) | трекер, розділ 4 |
| Статичні файли · T (підміна в дорозі, HTTPS + Enforce HTTPS) | етап 9: деплою ще немає | ADR 0003 |
| Ланцюг збірки · T (slopsquatting) | захід є | `npm view` для 4 пакетів (журнал), `pnpm-lock.yaml`, `--frozen-lockfile`, `pnpm audit` 0 high, SBOM |
| Ланцюг збірки · E (workflow, токен деплою, `pages: write`) | етап 9: workflow деплою ще немає; CI — `permissions: contents: read` | `.github/workflows/ci.yml:8-9` |
| SPA · T (XSS через дані джерела) | захід є | рендер лише текстом; `--check-code .` 0; CSP `vite.config.js` |
| SPA · T (некоректні дані CoinGecko) | захід є | `src/market-data/parse.js` (`ShapeError`), `parse.test.js` |
| SPA · I (витік у сторонні сервіси) | захід є | CSP `connect-src https://api.coingecko.com`; `only-coingecko-origins` 0 |
| SPA · I (clickjacking) | прийнятий ризик (власник) | трекер, розділ 4 |
| SPA ↔ CoinGecko · S (підміна джерела) | захід є | `client.js:4` (лише HTTPS), CSP |
| SPA ↔ CoinGecko · D (429, недоступність) | захід є, відхилень немає (RT-1, RT-3–RT-6 закрито) | `MarketDataProvider.jsx`, `TopCoinsPoller.jsx`, `client.js`; `triggers.test.jsx` |
| SPA (свіжість) · T (годинник пристрою) | прийнятий ризик (власник) + `console.warn` | `parse.js` |
| SPA ↔ CoinGecko · I (IP, User-Agent) | прийнятий ризик + примітка про приватність | `src/app/Layout.jsx` |
| GitHub Pages · I (логи IP) | прийнятий ризик + примітка про приватність | `src/app/Layout.jsx` |
| localStorage · T (зміна значень) | захід є | `src/favorites/store.js` (`parseIds`), `safari.js`, `public/theme-init.js` |
| localStorage · D (Safari 7 днів, очищення) | прийнятий ризик + порада «Додайте на головний екран» | `src/favorites/safari.js`, `FavoritesBlocks.jsx` |
| Усі · R | не застосовно: немає дій, що потребують незаперечності (ADR 0002) | — |
| Усі · E | не застосовно: ролей і привілеїв немає (ADR 0002) | — |

## 5. Застосовність векторів

Безпека й межі — частково (BOLA і RSC не застосовні: немає власного HTTP API і SSR); бекенд — ні; продуктивність — так; мікрофронтенди — ні; правова відповідність — частково (EAA, CRA, GDPR не діють за §8.5; WCAG 2.2 AA і SBOM — так); агентний і стохастичний борг — ні (продукт без LLM); AI Slop — так (TD-012); когнітивний борг і ADR — так (TD-002, TD-003, TD-014, TD-015); екологічний — так, мало (TD-009).

## 6. Знахідки

| ID | Рівень | Місце | Вектор | Проблема й сценарій | Виправлення |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TD-001 | P2 | `pnpm-lock.yaml` (dev-ланцюг `lighthouse`) | ланцюг постачання · CWE-1333, CWE-400 | 2 moderate лише в dev-інструменті | як у реєстрі |
| TD-002 | P2 | NFR-4 (`lhci autorun`) проти `scripts/web-vitals.mjs` | когнітивний борг · CWE-1053 | текст NFR-4 розходиться з інструментом | запит на зміну NFR-4 |
| TD-003 | P2 | `.agentic/specs/adr/0001-stack.md` («Тести») | когнітивний борг · CWE-1053 | ADR називає `msw` і `user-event` | рішення власника, ADR 0001 |
| TD-005 | P2 | `src/favorites/store.js`; `LoadedList.jsx`; `useCoinFavorite.js` | надійність (E-STORE) · CWE-252 | при помилці запису оголошується «додано», стан не змінюється | резерв у пам'яті; оголошення за результатом |
| TD-007 | P2 | `CoinListPage.jsx:13-19`; `useCoinView.js:31-41`; `ErrorBlock.jsx` | доступність | Data → Error губить фокус; автоматичне відновлення (`error → fresh` після TD-016) переносить фокус на h1 на S-1 і S-2 без дії користувача | фокус на h1 лише після ручного повтору; на `h2` блоку, якщо елемент зник |
| TD-008 | P2 | `FavoriteStatus.jsx:13`; `ErrorBlock.jsx:39-47` | доступність (4.1.3) | `empty:hidden` на `role="status"`; кнопка в `role="alert"` | без `empty:hidden`; alert лише на заголовку й тексті |
| TD-009 | P2 | `useTopCoins.js:19-32, 59-62` | надійність (M-5) · CWE-367; SCI · CWE-1050 | ≤ 1 с застарілих цін після повернення; ре-рендер 1 Гц | свіжість у рендері; таймер до межі |
| TD-011 | P2 | `useCoinListView.js` | функціональна відповідність | порівнюється порядок, а не склад топ-50 | множини `id` |
| TD-012 | P2 | `CoinParts.jsx`, `Change.jsx`, `FavoriteCard.jsx`, тексти; `store.js:2`; `CoinListPage.jsx:37-45`; `useStablecoinIds.js:13-14` | AI Slop · CWE-1041 | дублікати, що вже розійшлися; після ремонту — неправдивий коментар і недосяжна гілка `retryingError`, застарілий коментар про призупинення | спільні компоненти й тексти; прибрати мертву гілку, виправити коментарі |
| TD-013 | P2 | `CoinListPage.jsx`; `scripts/web-vitals.mjs` | продуктивність | LCP не міряє появу цін | вимір «час до першої ціни» або рішення власника |
| TD-014 | P2 | `adr/0005-data-source-coingecko.md:42`; `adr/0001-stack.md:64` | когнітивний борг · CWE-1053 | ADR про повтори й версію розходяться з кодом; `networkMode: 'always'`, центральний вимикач і поллер не описані | запит на зміну ADR 0005, 0001 |
| TD-015 | P2 | NFR-2; P-6; ADR 0005; `topCoinsQuery.js:35-38` | борг намірів · CWE-1053 | оновлення відкладається до 60 с від невдалої спроби, NFR-2 / P-6 — «одразу»; офлайн-спроби теж рахуються (після reconnect E-NET до ≤ 60 с) | запит на зміну NFR-2 / P-6 / ADR 0005 |
| TD-018 | P2 | `client.js:40-42, 90`; `useTopCoins.js:70, 74`; UX §3 | функціональна відповідність · CWE-755 | E-NET на будь-який виняток `fetch`, без `navigator.onLine`: заблокований домен → «Перевірте інтернет» замість «CoinGecko не відповідає» | `net` лише при `navigator.onLine === false`, інакше `src` |
| TD-019 | P2 | `useStablecoinIds.js:21-30`; наслідок `MarketDataProvider.jsx:12` | функціональна відповідність (AC-7.3) · CWE-755 | офлайн-старт → стейблкоїни падають локально й більше не запитуються: мітки «Стейблкоїн» відсутні всю сесію | після мережевої відмови чекати першого успіху топ-50 |

## 7. Матриця усунення

- **Quick wins:** TD-018, TD-019, тест фокусу S-2 (TD-006), TD-007, TD-012 (мертва гілка й коментарі), TD-008.
- **Structural:** TD-005, TD-009, TD-011, TD-012.
- **Strategic / документи:** TD-002, TD-003, TD-014, TD-015 (запит на зміну через `project-kickoff`); TD-013.

## 8. Поза планом етапу 6 (власнику)

- Вкладка, відкрита у фоні: preload дає 1 запит топ-50 і 1 запит стейблкоїнів у прихованій вкладці (P-6 допускає, NFR-3 — без винятку); записати рішення.
- Неперевірений ризик: 429 без заголовків CORS → браузер показує `TypeError` → клієнт робить 2 повтори і показує E-NET; перевірити на етапах 8.a / 8.b.
- Ручний повтор приєднується до фонового ланцюга (TD-017): результат може відображати запит, надісланий до кліку (вікно ≤ 10 с) — прийнятний компроміс, записати.
- UX S-1 Partial «Повтор при наступному відкритті» неоднозначний (перезавантаження чи екран) — уточнити разом із TD-019.
- TD-003 і TD-004 запропоновано закрити — рішення власника.

## 9. Що перевірено і що ні

Прочитано: `src/market-data/*`, `CoinListPage.jsx`, `CoinPage.jsx`, `useCoinView.js`, `FavoritesPage.jsx` (і тест), `ErrorBlock.jsx`, `index.html`; NFR і STRIDE, US-8 / AC-8.x, UX §3, P-4–P-9, реєстр, evidence, контракт §13; query-core 5.105.0 (`query.ts`, `retryer.ts`, `queryObserver.ts`, `queryClient.ts`). Запущено: `pnpm verify` (235 passed), `--check-code .`, `--scan-secrets .`, `git status`, `git diff --stat 871334b`. Не повторено (хук read-only): оракул, `dup`, `deadcode`, `boundaries`, `audit`, `sbom:write`, `test:a11y`, `vitals`, `--debt` — значення з evidence 02:40. Браузера в аудитора немає: TD-007, TD-018, TD-019 встановлено читанням коду.

## Прохід №6 (вузький): ремонт RT-2 від `clientWidth`

- **Межі:** `src/ui/hintOffset.js`, `src/ui/TermHintButton.jsx`, `src/ui/ui.test.jsx`, `a11y/reflow.a11y.spec.js`.
- **Вердикт:** PASS; Enterprise Readiness Score — D; P0 = 0 · P1 = 0 · P2 = 14 (формула 13.2: P2 ≥ 10 → D). Таблиця «Знахідки» — **без змін** відносно проходу №5; наступний вільний ID — TD-020.

| Перевірка RT-2 | Висновок | Доказ |
| :--- | :--- | :--- |
| Телефон, 1.4.10: `innerWidth` росте з переповненням | закрито: межа й `maxWidth` від `clientWidth` | `hintOffset.js:20-22`; `TermHintButton.jsx:29-33`; `ui.test.jsx:238-257` |
| ПК: вертикальна смуга прокрутки | закрито кодом (`clientWidth` без смуги); headless не відтворює | `hintOffset.js:21` |
| `maxWidth` до першого виміру, один вимір до відмальовки, `resize` | без регресії (`useLayoutEffect`, слухач знімається при закритті) | `TermHintButton.jsx:25-37, 92` |
| 1.4.13 (не перекриває кнопку, не зникає під курсором, Esc) | так | `TermHintButton.jsx:42-51, 93` |
| CLS | без регресії (CLS 0,000) | `.agentic/evidence/debt-checks.md` |
| Фолбек `\|\| innerWidth` | безпечний: 0 лише в jsdom, документ не в quirks | `index.html:1` |
| Чесність `reflow` | так: 320 px — мобільна емуляція, межа `clientWidth`, 4 кути панелі; до ремонту 2 з 4 червоні | `a11y/reflow.a11y.spec.js:45-90` |

**Залишкові ризики (не підтверджені):** смуга прокрутки з'являється без події `resize` (до 1 px переповнення теоретично, лише без прокрутки сторінки — на S-1 і S-2 не відтворюється; ремонт — `ResizeObserver`); шрифт завантажився після відкриття підказки (ширина без перерахунку).

**Перевірено:** `pnpm verify` — 0 (236 passed, Start at 02:58:57, 105,08 кБ); `--check-code .` — 0 (82 файли); `--scan-secrets .` — 0 (162 файли); читання змінених файлів. **Не повторено** (хук read-only): `test:a11y`, `vitals`, `--debt`, оракул, браузер — значення з `.agentic/evidence/debt-checks.md`.
