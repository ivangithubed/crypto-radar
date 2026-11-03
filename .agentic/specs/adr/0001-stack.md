---
status: accepted
date: 2026-11-02
decision-makers: власник продукту
---
# Стек: React 19 + JavaScript на Vite 8, статичний frontend-only застосунок без власного HTTP API

## Context and Problem Statement

Крипто-Радар — вебзастосунок для браузера телефона й ПК. У ньому немає входу, обрані зберігаються на пристрої, а дані беруться з публічного API CoinGecko. Бюджет — $0, MVP треба зробити до 2026-11-09, власник — початківець і проходить конвеєр із навчальною метою (`learning_mode: true`). Треба обрати стек, який покриває всі Must-історії US-1 – US-9 і NFR-1 – NFR-16, а також вирішити, чи потрібен продукту власний сервер.

## Decision Drivers

- Бюджет $0 і хостинг без сервера: NFR-15, ADR 0003.
- Строк і досвід власника: найменше рухомих частин (бриф §13, A-6).
- Must US-1 – US-9: список, сортування, пошук, сторінка монети з графіком, обрані на пристрої, підказки, стан помилки, дисклеймер.
- NFR-1 – NFR-3 (свіжість, автооновлення, ліміти джерела), NFR-4 – NFR-5 (швидкість на телефоні), NFR-6 – NFR-7 (WCAG 2.2 AA, адаптивність), NFR-8 – NFR-9 (CSP, ланцюг постачання).
- Вибір власника 2026-11-02: React + **JavaScript** (не TypeScript); React Router лише як бібліотека маршрутизації, не як фреймворк.
- Типовий frontend-стек конвеєра: Vite, Oxlint, Oxfmt, Vitest, Tailwind CSS v4 (`stack-matrix.md`).

## Considered Options

1. **React 19 + JavaScript на Vite 8, лише статика (frontend-only)** — браузер сам звертається до CoinGecko.
2. **Vue + JavaScript на Vite 8, лише статика** — та сама архітектура, інший UI-фреймворк.
3. **Next.js (fullstack) з власним проксі-кешем CoinGecko** — серверні route handlers кешують відповіді для всіх відвідувачів.
4. **Vanilla JavaScript на Vite без UI-фреймворку** — найпростіший за залежностями варіант.

### Матриця придатності

| Вимога | Що потрібно | 1. React + JS на Vite | 2. Vue + JS на Vite | 3. Next.js + проксі | 4. Vanilla JS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| US-1, US-2, US-3 | Список 25 + 25, сортування й пошук у пам'яті | так: стан React + чисті функції `lib` | так | так | так: усе вручну (стан, перерендер) |
| US-4 | Сторінка монети за посиланням, графік за 7 днів | так: React Router `HashRouter`, графік SVG із `sparkline_in_7d` | так: Vue Router hash-режим | так | частково: власний роутер |
| US-5, US-6 | Обрані на пристрої тижнями | **частково**: localStorage; Safari видаляє дані через 7 днів без взаємодії (ADR 0006) | частково (те саме) | частково (те саме без акаунтів) | частково (те саме) |
| US-7 | Доступні підказки на телефоні й ПК | так | так | так | так, але більше ручного коду доступності |
| US-8 | Свіжість ≤ 5 хв, автооновлення, повтори | так: TanStack Query (`refetchInterval`) + власна політика повторів (`fetchTopCoins`, P-4) + перевірка `last_updated` | так: TanStack Query для Vue | так | частково: опитування й повтори вручну |
| US-9, US-10 | Статичні тексти, тема | так: Tailwind CSS v4 `dark:` | так | так | так |
| NFR-4, NFR-5 | LCP ≤ 2,5 с, JS ≤ 150 КБ gzip | так (оцінка: React DOM + Router + Query вкладаються, перевірка на етапі 5) | так | частково: SSR на безкоштовному тарифі має холодні старти | так |
| NFR-15 | $0, GitHub Pages | так | так | **ні**: GitHub Pages не запускає сервер; потрібна безсерверна платформа | так |
| SEO, SSR | Не потрібні (посилання для знайомих) | не потрібно | не потрібно | є, але зайве | не потрібно |
| Реальний час (WebSocket, SSE) | Не потрібен: опитування раз на 60 с | не потрібно | не потрібно | не потрібно | не потрібно |
| Фонові задачі, черги, файли, пошта, повнотекстовий пошук, платежі, мультиорендність, ML, нереляційні дані | Немає в MVP | не потрібно | не потрібно | не потрібно | не потрібно |
| Офлайн і нативний застосунок | Не потрібні (бриф §11); маніфест вебзастосунку — для Safari (ADR 0006) | так: статичний `manifest.webmanifest` | так | так | так |
| Хостинг без контейнерів | Так | так | так | частково | так |
| Зрілість екосистеми | Багато навчальних матеріалів | так: найбільша екосистема | так | так | так |
| Вікно підтримки | Активні версії на горизонті проєкту | так: React 19.3 — остання; Vite 8; Node 24 LTS до 2028-04-30 | так | так | так |
| Досвід і вибір власника | React + JavaScript | **так** | ні | частково (React, але фреймворк) | ні |

## Decision Outcome

Обрано **варіант 1 «React 19 + JavaScript на Vite 8, лише статика»**: він покриває всі Must-історії й NFR за бюджету $0 на GitHub Pages, збігається з вибором власника і має найбільше навчальних матеріалів. Варіант 3 не вкладається в $0 на GitHub Pages і додає власний API. Варіанти 2 і 4 не відповідають вибору власника, а варіант 4 ще й змушує вручну писати маршрутизацію, стан і повтори.

**Складники** (версії перевірено 2026-11-02 командою `npm view`; остаточні версії фіксує lock-файл етапу 5):

| Складник | Вибір | Версія в реєстрі |
| :--- | :--- | :--- |
| Тип | `frontend-only` (SPA) | — |
| Мова | JavaScript (ES2022+, модулі ES), без TypeScript; доменні типи — JSDoc | — |
| Рантайм збірки | Node.js 24 LTS «Krypton» | 24.22.2 (остання 24.x), встановлено 24.21.0 |
| Збірка | Vite 8 + `@vitejs/plugin-react` | vite 8.3.5, @vitejs/plugin-react 6.2.1 |
| Генератор каркаса | `pnpm create vite@latest .scaffold --template react --no-interactive` (шаблон `react` — JavaScript) | create-vite 9.3.3 |
| UI | React 19 + React DOM | 19.3.1 |
| Маршрутизація | React Router, **декларативний режим**, `<HashRouter>` з пакета `react-router`; без data mode, framework mode, SSR і плагіна Vite від React Router (зауваження власника 2026-11-02) | react-router 8.5.1 |
| Дані й оновлення | TanStack Query v5 (`refetchInterval: 60000`, `refetchIntervalInBackground: false`, `retry: false`); повтори за ADR 0005 — власна політика в `fetchTopCoins` (`src/market-data/client.js`, P-4): на 429 і виняток `fetch` при `navigator.onLine === true` — 0, на 5xx, таймаут і мережу офлайн — 2 з паузами 2 с і 4 с (запит на зміну №5) | @tanstack/react-query 5.105.2 |
| Графік | Власний SVG-компонент (`chart`), без бібліотеки: одна лінія зі 168 точок + текстова альтернатива | — |
| Стилізація | Tailwind CSS v4 через `@tailwindcss/vite`; темна тема — варіант `dark:` | tailwindcss 4.3.3, @tailwindcss/vite 4.3.3 |
| Менеджер пакетів | pnpm | 11.23.0 (встановлено; npm — 11.19.0) |
| Лінтер / форматер | Oxlint / Oxfmt | oxlint 1.90.0, oxfmt 0.75.0 |
| Тести | Vitest + Testing Library + jsdom; підміна мережі в тестах — `msw` (рішення етапу 5) | vitest 5.0.5, @testing-library/react 16.3.3, @testing-library/user-event 14.6.8, @testing-library/jest-dom 7.0.1, jsdom 30.1.3, msw 3.0.3 |
| E2E і доступність (етап 8.b) | Playwright + axe | @playwright/test 1.64.1, @axe-core/playwright 4.14.0 |
| Сховище | Немає серверного; localStorage браузера (ADR 0004) | — |

**`has_http_api: false`.** Продукт не надає власних HTTP-ендпоінтів: немає бекенду, route handlers і вебхуків. Звернення до CoinGecko — зовнішня інтеграція (ADR 0005), тож етап 4 не створює `contract/openapi.yaml`.

**Must-вимоги, закриті компромісом:** US-5 / US-6 у Safari — рішення власника 2026-11-02, ADR 0006.

### Consequences

- Добре: один деплойний блок, без сервера, секретів і бази; $0; швидкий старт за офіційним генератором; велика екосистема й навчальні матеріали.
- Добре: TanStack Query з коробки дає опитування й паузу в прихованій вкладці (NFR-2); повтори — власна політика `fetchTopCoins` (P-4), `retry: false`, бо типові 3 повтори TanStack Query порушили б NFR-3 (запит на зміну №5).
- Погано: **JavaScript без перевірки типів** — помилки на кшталт «undefined замість числа» видно лише під час роботи. Пом'якшення: Oxlint, JSDoc-типи, перевірка форми відповіді CoinGecko в `market-data`, модульні тести. Перехід на TypeScript пізніше — окремий ADR.
- Погано: ліміти CoinGecko рахуються за IP кожного відвідувача і не задокументовані (ADR 0005).
- Нейтрально: `HashRouter` дає адреси вигляду `…/crypto-radar/#/coin/bitcoin`.
- Для етапу 5: стартовий verify — `pnpm lint && pnpm fmt:check && pnpm test && pnpm build` (кроку `typecheck` немає, бо немає TypeScript; остаточні `verify_commands` визначає етап 5); у `vite.config.js` — `base: '/crypto-radar/'`, плагіни `react()` і `tailwindcss()`; CSP у `index.html` (NFR-8).
- Для етапів 7 і 8: є графічний UI для E2E (Playwright, Chromium і WebKit) і axe; контрактних тестів і фазингу HTTP API немає (`has_http_api: false`). Відповідь CoinGecko підміняється записаним прикладом (fixture) у тестах.

### Confirmation

- Етап 5 піднімає walking skeleton цим генератором; `pnpm verify` завершується з кодом 0; у CI — Node 24.
- `.agentic/project.json → stack` збігається з JSON-блоком нижче.
- На етапі 5 `vite build` показує JS головного екрана ≤ 150 КБ gzip (NFR-5).

## More Information

Джерела (перевірено 2026-11-02):

- Реєстр npm (`npm view <pkg> version time.modified repository.url license`): create-vite 9.3.3, vite 8.3.5, react 19.3.1, react-dom 19.3.1, @vitejs/plugin-react 6.2.1, react-router 8.5.1, @tanstack/react-query 5.105.2, tailwindcss 4.3.3, @tailwindcss/vite 4.3.3, oxlint 1.90.0, oxfmt 0.75.0, vitest 5.0.5, @testing-library/react 16.3.3, @testing-library/user-event 14.6.8, @testing-library/jest-dom 7.0.1, jsdom 30.1.3, msw 3.0.3, @playwright/test 1.64.1, @axe-core/playwright 4.14.0. У кожного пакета є репозиторій на GitHub і ліцензія MIT (Playwright — Apache-2.0, @axe-core/playwright — MPL-2.0).
- Сумісність (`npm view … peerDependencies engines`): react-router 8.5.1 — React ≥ 19.2.7, Node ≥ 22.22.0; @tanstack/react-query 5.105.2 — React ^18 || ^19; @vitejs/plugin-react 6.2.1 — Vite ^8; vitest 5.0.5 — Node ^22.12 || ^24 || ≥ 26.
- Vite: https://vite.dev/guide/ — «Vite requires Node.js version 20.19+, 22.12+»; шаблон `react` (JavaScript) є в списку create-vite.
- React: https://react.dev/versions — «Latest version: 19.3».
- React Router: https://reactrouter.com/start/modes (режими Declarative, Data, Framework); https://reactrouter.com/api/declarative-routers/HashRouter («Available with Declarative»); https://reactrouter.com/start/declarative/installation (`npm i react-router`).
- TanStack Query: https://tanstack.com/query/latest/docs/framework/react/reference/useQuery (`refetchIntervalInBackground` за замовчуванням `false`; `retry` — 3 на клієнті; `retryDelay` — експоненційна пауза до 30 с); https://tanstack.com/query/latest/docs/framework/react/installation («compatible with React v18+»).
- Node.js: https://github.com/nodejs/Release — 24.x Maintenance LTS, кінець підтримки 2028-04-30; 26.x Active LTS з 2026-10-28; https://nodejs.org/dist/index.json — v24.22.2 (`"lts":"Krypton"`).
- Меню стеків: `agentic-harness/references/stack-matrix.md`, розділи 1 і 5.

JSON, записаний у `.agentic/project.json → stack`:

```json
{
  "type": "frontend-only",
  "language": "JavaScript (ES2022+), Node.js 24 LTS для збірки",
  "framework": "React 19.3 + Vite 8.3 (React Router 8 у декларативному режимі)",
  "package_manager": "pnpm 11",
  "test_framework": "Vitest 5 + Testing Library (E2E етапу 8.b — Playwright 1.64)",
  "database": null
}
```
