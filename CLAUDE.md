# Крипто-Радар — інструкції для агентів

Статичний вебзастосунок (SPA) для перегляду курсів криптовалют із CoinGecko. Власного сервера, бази й секретів немає.
Проєкт ведеться за конвеєром SDD: стан етапів — `.agentic/pipeline-state.md`, уроки проєкту — `.claude/rules/project-lessons.md` (обов'язкові).

## Стек (ADR 0001)

- JavaScript (ES2022+, модулі ES), **без TypeScript**; доменні типи — JSDoc.
- React 19.3 + Vite 8.3 (`@vitejs/plugin-react`), Tailwind CSS 4.3 через `@tailwindcss/vite`, токени — `src/index.css` (`@theme`).
- Node.js 24 LTS (`.nvmrc`, `engines`), pnpm 11 (`packageManager`).
- Oxlint (лінтер), Oxfmt (форматер), Vitest 5 + Testing Library + jsdom (модульні тести).
- Playwright 1.64 + axe (доступність), Lighthouse 13 (Web Vitals), knip, dependency-cruiser, jscpd (виміряний борг).
- Хостинг — GitHub Pages за шляхом `/crypto-radar/` (`base` у `vite.config.js`, ADR 0003).

## Команди

| Команда | Що робить |
| :--- | :--- |
| `pnpm install --frozen-lockfile` | Встановлення строго за `pnpm-lock.yaml` |
| `pnpm dev` | Dev-сервер з перезавантаженням (http://localhost:5173/crypto-radar/) |
| `pnpm verify` | **Гейт готовності:** `lint` → `fmt:check` → `test` → `build` → `size` |
| `pnpm lint` / `pnpm fmt` / `pnpm fmt:check` | Oxlint (з порогом складності 15) / форматування / перевірка формату |
| `pnpm test` | Модульні тести Vitest (`src/**/*.test.{js,jsx}`) |
| `pnpm build` / `pnpm preview` | Збірка в `dist/` / локальний перегляд збірки (http://localhost:4173/crypto-radar/) |
| `pnpm size` | NFR-5: JS головного екрана ≤ 150 кБ gzip (після `build`) |
| `pnpm dup`, `pnpm deadcode`, `pnpm boundaries` | Дублювання ≤ 3 %, мертвий код, межі модулів |
| `pnpm test:a11y` | axe, WCAG 2.2 AA, 0 порушень critical/serious в обох темах |
| `pnpm vitals` | Lighthouse (мобільний профіль): LCP ≤ 2,5 с, CLS ≤ 0,1, TBT ≤ 200 мс |
| `pnpm sbom:write` | SBOM CycloneDX у `sbom/` (у Git не потрапляє) |
| `python .agentic/bundle/skills/gate-check/verify-gate.py --debt` | Усі `debt_commands` з `.agentic/project.json` |

Команди гейтів етапів — `.agentic/project.json → verify_commands`, `debt_commands`. Покроковий runbook — `.agentic/specs/05-platform-runbook.md`.

## Структура

```text
src/
  main.jsx          точка входу
  index.css         Tailwind + токени дизайн-системи (етап 4, розділ 9.2)
  app/              корінь застосунку: макет, провайдери, маршрути (етап 7)
  features/<екран>  екрани: coin-list, coin-page, favorites-view (етап 7)
  market-data/ favorites/ theme/ glossary/ chart/ ui/ lib/   модулі з розділу 5 архітектури
  test/setup.js     налаштування Testing Library
a11y/               перевірка доступності каркаса (debt_commands.accessibility)
scripts/            check-bundle-size.mjs (NFR-5), web-vitals.mjs (NFR-4)
acceptance/         приймальні тести-оракул етапу 6 (ще не створено)
e2e/                E2E етапу 8.b (ще не створено)
```

Межі модулів (хто кого імпортує) задає `.dependency-cruiser.cjs` за розділом 5 `.agentic/specs/03-architecture.md`. Порушення меж — червоний `pnpm boundaries`.

## Guardrails

- Жодних секретів у репозиторії й у змінних `VITE_*` (вони потрапляють у публічний бандл). `.env` і `.env.*` не комітяться, лише `.env.example`.
- Залежності додаються лише командою `pnpm add` після перевірки пакета в реєстрі npm (`npm view <pkg>`); маніфест і lockfile вручну не редагуються.
- CSP (NFR-8) додається в `index.html` лише при збірці (`vite.config.js`); не додавай сторонніх скриптів, шрифтів чи доменів — `connect-src` дозволяє тільки `https://api.coingecko.com`.
- Заборонено `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`; дані з CoinGecko рендеряться лише як текст.
- Не вимикай правила лінтера, пороги `debt_commands` і тести, щоб стало зелено: поріг змінює лише власник через ADR етапу 3.
- Схвалені `.agentic/specs/*`, `.agentic/specs/adr/*` і `contract/` змінює лише їхній етап (через `project-kickoff`). `.agentic/holdouts/` — лише власник.
- Не комітити, не пушити й не деплоїти без явної команди власника.
