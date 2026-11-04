---
status: accepted
date: 2026-11-02
decision-makers: власник продукту
---
# Джерело даних: CoinGecko API без ключа, запити напряму з браузера

## Context and Problem Statement

Продукту потрібні для топ-50 за капіталізацією ціна в USD, зміна за 7 днів, капіталізація, ціни за 7 днів для графіка, ознака стейблкоїна й мітка часу для перевірки свіжості ≤ 5 хв (US-1, US-4, US-7, US-8). Джерело має бути безкоштовним і дозволяти показ із вказанням джерела (A-2, бриф §13). Власник обрав прямі запити з браузера без власного сервера (ADR 0001). Треба зафіксувати джерело, режим доступу, ендпоінти й поведінку на межах.

## Decision Drivers

- A-2: усі поля для топ-50 і свіжість ≤ 5 хв у межах безкоштовного доступу.
- NFR-1 – NFR-3: свіжість, автооновлення, обмеження кількості запитів.
- NFR-15: $0; NFR-16: атрибуція; NFR-8: CSP `connect-src`.
- Немає сервера, тож будь-який ключ API потрапив би в код браузера.

## Considered Options

1. **CoinGecko без ключа (keyless)** — `https://api.coingecko.com/api/v3`, ліміт за IP.
2. **CoinGecko з безкоштовним Demo-ключем у коді браузера** — 100 запитів/хв і 10 000 на місяць на ключ, спільні для всіх відвідувачів.
3. **CoinGecko з Demo-ключем за власним проксі** — ключ захований на сервері, але це власний HTTP API і сервер (відхилено в ADR 0001).

Інші постачальники даних не порівнювалися: бриф і kickoff називають CoinGecko, а він покриває всі поля (перевірено нижче).

## Decision Outcome

Обрано **варіант 1 «CoinGecko без ключа»**. Він не потребує секретів і сервера, а ліміт рахується за IP кожного відвідувача. 5–20 знайомих не ділять одну квоту, як у варіанті 2. Варіант 2 розкрив би ключ у публічному коді, а CoinGecko прямо радить так не робити: «Store your API key in your backend and use a proxy». Місячна квота Demo (10 000 запитів ≈ 167 год відкритої вкладки при опитуванні раз на хвилину) для 5–20 відвідувачів раз на тиждень, найімовірніше, не вичерпується, тож вирішальна причина відмови — розкриття ключа в публічному коді. Варіант 3 відхилено в ADR 0001.

**Ендпоінти** (лише GET, HTTPS, `fetch` з таймаутом 10 с):

| Призначення | Запит | Частота |
| :--- | :--- | :--- |
| Топ-50 з цінами, 7d, капіталізацією, графіком | `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=7d` | Під час відкриття, далі кожні 60 с у видимій вкладці; «Спробувати ще раз» |
| Ознака «стейблкоїн» | `/coins/markets?vs_currency=usd&category=stablecoins&per_page=250&page=1` (беруться лише `id`) | Раз за сесію вкладки; збій не блокує ціни (підказка «Стейблкоїн» просто не показується) |

**Відповідність полям:** `market_cap_rank` → місце в рейтингу; `current_price` → ціна; `price_change_percentage_7d_in_currency` → зміна за 7 днів; `market_cap` → капіталізація; `sparkline_in_7d.price` → графік за 7 днів; `last_updated` → свіжість; `name`, `symbol`, `image` → назва, тікер, логотип. Сторінка монети бере дані з того самого знімка топ-50, без запиту `/coins/{id}/market_chart`.

**Свіжість (NFR-1):** давність = час пристрою − медіана `last_updated` серед 50 монет (при парній кількості — старіша з двох середніх; рішення власника 2026-11-04, запит на зміну №7: CoinGecko віддає рідко оновлювані монети, наприклад `figure-heloc`, їхня позначка на години старіша й ховала б увесь список). При давності > 300 с, некоректній формі відповіді, менше ніж 50 монетах або порожньому `sparkline_in_7d` для сторінки монети показується стан «Помилка» без цін.

**Помилки:** на мережеву помилку при `navigator.onLine === false`, таймаут і 5xx — до 2 повторів з паузами 2 с і 4 с (власна політика повторів у `fetchTopCoins` (`src/market-data/client.js`); `retry` TanStack Query вимкнено (`retry: false`, P-4)); на 429 — без повторів до наступного 60-секундного циклу або «Спробувати ще раз», бо кожна невдала спроба теж рахується в хвилинний ліміт. Так само без повторів — виняток `fetch` при `navigator.onLine === true` (так само браузер віддає 429 без CORS-заголовка, BUG-001, L-008) — «джерело недоступне» (E-SRC), 0 повторів, 1 запит; запит на зміну №5, 2026-11-03. Далі — стан «Помилка» з «Спробувати ще раз» (NFR-3).

**Атрибуція (NFR-16):** «Powered by CoinGecko» з посиланням на https://www.coingecko.com/en/api шрифтом ≥ 14 CSS px на кожному екрані. Умови кажуть «no smaller than font size 10» без одиниці; трактуємо суворо як 10 pt = 13,33 px.

**Кешування:** лише в пам'яті вкладки (≤ 60 с між оновленнями), без запису цін у сховище (ADR 0004); це вкладається в умову «оновлювати кеш щонайменше раз на 24 год».

### Consequences

- Добре: $0, без секретів і сервера; усі поля приходять одним запитом (пробний запит 2026-11-02: 50 монет, 168 точок `sparkline_in_7d`, однаковий `last_updated` з відставанням близько 1 хв).
- Погано: **ліміт keyless-доступу не задокументований** («IP-based rate limiting — shared across all users on the same IP»). Відвідувачі за одним NAT (одна Wi-Fi-мережа) ділять квоту. Це **прийнятий ризик** (власник, 2026-11-02, гейт етапу 3): працюємо як є, **без запасного плану**. Якщо часті 429 з'являться на 8.a чи після релізу, це нове рішення власника через окремий ADR.
- Погано: умови й ліміти CoinGecko «may be varied … at any time … without notice»; офіційний кеш відповідей — «around 1 to 5 minutes». Якщо CoinGecko віддаватиме дані з медіанною давністю понад 5 хв, відвідувач побачить «Помилка» (guardrail M-5 важливіший).
- Погано: свіжість рахується за годинником пристрою. Заголовок `Date` не відкритий для CORS (`Access-Control-Expose-Headers: link, per-page, total`), тож годинник, що відстає чи поспішає більш ніж на кілька хвилин, може дати хибну помилку або хибну свіжість. Якщо годинник відстає більш ніж на 5 хв, застарілі ціни можуть показатися як свіжі (зачіпає guardrail M-5). Це **прийнятий ризик** (власник, 2026-11-02, гейт етапу 3: «реалізуй саме таку схему»); захист: якщо `last_updated` пізніше за час пристрою на > 60 с, давність вважається 0 і показ дозволяється, а розбіжність годинника записується в консоль як `console.warn` для діагностики (не `console.error`, NFR-13) (етап 7).
- Погано: CoinGecko та його CDN зображень бачать IP-адресу відвідувача (примітка про приватність).
- Нейтрально: CORS дозволено (`Access-Control-Allow-Origin: *`), хоча документація CoinGecko про браузерний доступ окремо не говорить і в таблиці помилок радить проксі. Етап 5 перевіряє запит із каркаса в браузері.
- Для етапу 4: тексти помилки, завантаження й атрибуції; підказку «Стейблкоїн» показувати лише біля `id` зі списку стейблкоїнів.
- Для етапів 7 і 8.b: записаний приклад відповіді (fixture) для тестів; підміна мережі в Playwright; тести межі 299 / 300 / 301 с.

### Confirmation

- Етап 5: каркас із `vite preview` робить запит до `/coins/markets` у браузері без помилок CORS і CSP.
- Етап 8.b: E2E на fixture перевіряє поля, межу свіжості й кількість запитів (NFR-1 – NFR-3); AC-7.3 перевіряє підказку «Стейблкоїн» лише біля стейблкоїнів.
- Етап 8.a: ручне спостереження в DevTools: немає 429 за 10 хв роботи однієї вкладки.

## More Information

Джерела (перевірено 2026-11-02):

- https://docs.coingecko.com/demo/reference/coins-markets — параметри `vs_currency`, `order` (`market_cap_desc`), `per_page` (1…250), `sparkline` («Include sparkline 7-day data»), `price_change_percentage` (`7d`), `category`; поля `market_cap_rank`, `last_updated`, `price_change_percentage_7d_in_currency`.
- https://docs.coingecko.com/demo/reference/endpoint-overview — «Complete list of endpoints available in the Demo / Keyless API».
- https://docs.coingecko.com/docs/common-errors-rate-limit — «Keyless (no API key): IP-based rate limiting — shared across all users on the same IP»; «Demo plan: 100 calls/min»; рядок про CORS із порадою проксі.
- https://docs.coingecko.com/demo/reference/authentication — заголовок `x-cg-demo-api-key`; «Store your API key in your backend and use a proxy to inject it into requests».
- https://www.coingecko.com/en/api — Demo: «monthly cap of 10,000 calls»; оновлення: «endpoints are all cached to around 1 to 5 minutes».
- https://www.coingecko.com/en/api_terms (оновлено 5 Sept 2025) — §4: атрибуція «displaying prominently the message 'Powered by CoinGecko' in a legible font … no smaller than font size 10» (одиниця не вказана); заборона перепродажу; ліміти можуть змінюватися; §6.1: кеш оновлювати щонайменше раз на 24 год.
- https://brand.coingecko.com/resources/attribution-guide — варіанти тексту атрибуції й посилання.
- https://docs.coingecko.com/reference/coins-categories-list — список категорій.
- Пробні запити без ключа 2026-11-02 ≈ 15:44 UTC:
  - `/coins/markets` — HTTP 200, `access-control-allow-origin: *`, `Cache-Control: max-age=30, public, must-revalidate, s-maxage=60`; 50 монет, місця 1–50, `sparkline_in_7d.price` — 168 точок, `last_updated` 2026-11-02T15:42:55Z в усіх монет;
  - `/coins/categories/list` містить категорії стейблкоїнів;
  - `/coins/markets?category=stablecoins` повернув 100 монет, зокрема `tether` і `usd-coin`.
