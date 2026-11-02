# Runbook платформи: Крипто-Радар (етап 5)

> Як зібрати, перевірити й запустити каркас з нуля. Стек — ADR 0001, ціль деплою — ADR 0003 (`static-hosting`, GitHub Pages). Звіт етапу — `.agentic/reports/05-platform-report.md`.

## 1. Передумови й версії

| Інструмент | Потрібна версія | Перевірено 2026-11-02 | Як перевірити |
| :--- | :--- | :--- | :--- |
| Node.js | 24 LTS (`.nvmrc` = `24`, `engines.node` = `>=24.0.0 <25`) | 24.21.0 | `node --version` |
| pnpm | 11 (`packageManager` = `pnpm@11.23.0`) | 11.23.0 | `pnpm --version` |
| Git | будь-яка актуальна | 2.45.2 | `git --version` |
| Python | ≥ 3.10 (лише для валідатора конвеєра) | 3.14.7 | `python --version` |
| Chromium для Playwright | версія, яку очікує `@playwright/test` 1.64 | уже встановлено | `pnpm exec playwright install chromium` (одноразово, ~150 МБ) |
| Docker | не потрібен (ADR 0001: без контейнерів) | — | — |

## 2. Перший запуск з нуля

```bash
git clone https://github.com/ivangithubed/crypto-radar.git
cd crypto-radar
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm verify
pnpm preview
```

`.env` створювати не потрібно: змінних середовища немає (`.env.example` це пояснює). Після `pnpm build` команда `pnpm preview` відкриває застосунок за адресою http://localhost:4173/crypto-radar/. **Живий доказ:** сторінка має заголовок «Крипто-Радар» (`h1`), у консолі браузера немає помилок і порушень CSP. Зупинка — `Ctrl+C`.

## 3. Режим розробки

`pnpm dev` запускає Vite з гарячим перезавантаженням: http://localhost:5173/crypto-radar/. У dev-режимі CSP **не** додається, бо Vite вставляє inline-скрипти. CSP перевіряють лише на збірці (`pnpm build && pnpm preview`).

## 4. Змінні середовища

| Змінна | Хто читає | Обов'язкова | За замовчуванням | Секрет | Опис |
| :--- | :--- | :--- | :--- | :--- | :--- |
| — | — | — | — | — | Змінних немає. Адреса CoinGecko — константа (її фіксує CSP, NFR-8); ключа API немає (ADR 0005). Змінні `VITE_*` потрапляють у публічний бандл, тож секретів там бути не може |
| `CI` | `playwright.a11y.config.js`, `scripts/web-vitals.mjs` | ні | не задано локально, `true` у GitHub Actions | ні | У CI забороняє `test.only` і вимикає пісочницю Chromium для Lighthouse |

Нові змінні етапу 7 додаються в `.env.example` і `walkthrough.md`. Таблицю в цьому runbook оновлюють запитом на зміну через `project-kickoff`.

## 5. Команда `verify`

`pnpm verify` = `pnpm lint && pnpm fmt:check && pnpm test && pnpm build && pnpm size`:

1. `oxlint --deny-warnings` — лінтер; правило `complexity` (≤ 15), заборона `react/no-danger`, `eval`, `new Function`.
2. `oxfmt --check` — формат (лише перевірка, без змін). Документи `.agentic/**` і `*.md` форматер не чіпає.
3. `vitest run` — модульні тести `src/**/*.test.{js,jsx}`.
4. `vite build` — збірка в `dist/` з `base: '/crypto-radar/'` і CSP у `<meta>`.
5. `node scripts/check-bundle-size.mjs` — NFR-5: JS головного екрана ≤ 150 кБ gzip.

**`verify_commands`** (`.agentic/project.json`): етапи `"5"` і `"7"` — `pnpm install --frozen-lockfile`, `pnpm verify`. Ключ `"8.b"` додає етап 8.b.

**`debt_commands`** (виміряний борг, `python .agentic/bundle/skills/gate-check/verify-gate.py --debt`):

| Аспект | Команда | Поріг | Джерело порогу |
| :--- | :--- | :--- | :--- |
| `complexity` | `pnpm lint`, `pnpm dup` | цикломатична складність функції ≤ 15; дублювання в `src` ≤ 3 % (`.jscpd.json`) | рішення власника 2026-11-02 (трекер, розділ 4), NFR не задає |
| `dead_code` | `pnpm deadcode` (knip) | 0 невикористаних файлів, експортів і залежностей. Виняток у `knip.json`: `tailwindcss` (його імпортує лише CSS — `@import "tailwindcss"`, а knip CSS не аналізує) | NFR не задає; рішення власника на гейті етапу 5 (2026-11-02, трекер, розділ 4) |
| `boundaries` | `pnpm boundaries` (dependency-cruiser) | 0 порушень `.dependency-cruiser.cjs` (без циклів, без сиріт, межі розділу 5 архітектури); `options.enhancedResolveOptions` читає поле `exports` пакетів (`react-router` 8 має лише його; запит на зміну №2) | архітектура, розділ 5 |
| `vulnerabilities` | `pnpm audit --audit-level high` | 0 знахідок high/critical | NFR-9 |
| `sbom` | `pnpm sbom:write` | SBOM CycloneDX 1.7 згенеровано в `sbom/crypto-radar.cdx.json` | NFR-9 |
| `accessibility` | `pnpm test:a11y` | axe, теги WCAG 2.2 AA: 0 порушень critical/serious у світлій і темній темах | NFR-6 |
| `web_vitals` | `pnpm vitals` | Lighthouse, мобільний профіль, медіана 3 прогонів: LCP ≤ 2500 мс, CLS ≤ 0,1, TBT ≤ 200 мс | NFR-4 |

**Правила якості** (`.agentic/project.json → quality_rules`, `verify-gate.py --check-code src`): `no-unsafe-html` і `no-dynamic-code` (NFR-8), `only-coingecko-origins` (NFR-10). Кожне — помилка; вимкнення — лише через `disabled_rules` з `reason`.

`pnpm test:a11y` і `pnpm vitals` самі збирають застосунок і піднімають `vite preview` на портах 4173 і 4174, а після перевірки зупиняють його. Звіти Lighthouse лягають у `.lighthouse/` (у Git не потрапляють).

## 6. CI

- **Провайдер:** GitHub Actions, `.github/workflows/ci.yml`, job `verify`.
- **Тригери:** push у `main` і кожен pull request.
- **Захист:** `permissions: contents: read`, `timeout-minutes: 20`, `concurrency` скасовує застарілі запуски, дії запінено на повний SHA з коментарем-тегом, `persist-credentials: false`, без `pull_request_target`, секретів немає.
- **Кроки:**
  1. checkout з `fetch-depth: 0`;
  2. pnpm і Node з `.nvmrc`, Python 3.12;
  3. `pnpm install --frozen-lockfile`;
  4. `pnpm audit --audit-level high`;
  5. `pnpm verify`;
  6. оракул етапу 6 — `pnpm exec vitest run --config acceptance/vitest.config.js` (запит на зміну №2, 2026-11-03);
  7. встановлення Chromium;
  8. `verify-gate.py --debt`;
  9. `verify-gate.py --ci` — схвалені етапи, цілісність оракула, секрети.
- **Червоний job:** відкрий лог кроку й відтвори його локально тією самою командою з кореня проєкту. Наприклад, червоний «Measured tech debt» відтворює `python .agentic/bundle/skills/gate-check/verify-gate.py --debt`. Виправляй код, а не поріг.
- **Dependabot** (`.github/dependabot.yml`): npm і GitHub Actions щотижня, ≤ 5 відкритих PR, cooldown 7 днів для свіжих релізів, dev-залежності minor/patch — однією групою.
- Релізний workflow (публікація на GitHub Pages) додає етап 9 (рішення власника 2026-11-02).

## 7. Приймальні тести й E2E

- **Оракул етапу 6:** `acceptance/` — приймальні тести за Gherkin-сценаріями (`@AC-N.M`). Інструмент — Vitest + Testing Library для логіки й компонентів, Playwright — для сценаріїв у браузері. Етап 6 записує шляхи й команду в `.agentic/project.json → oracle`. CI запускає оракул окремим кроком після `pnpm verify` (розділ 6); `pnpm verify` бере тести лише з `src/**`.
- **E2E етапу 8.b:** `e2e/` — Playwright (Chromium і WebKit) + `@axe-core/playwright`. Застосунок піднімається через `pnpm build && pnpm preview --port 4173 --strictPort`, origin — `http://localhost:4173`, шлях — `/crypto-radar/`. Відповіді CoinGecko підміняються в тестах (fixture, `page.route`).
- `pnpm test` і `pnpm verify` E2E не запускають.

## 8. Середовища й секрети

| Середовище | Де | Як потрапляє код | Секрети |
| :--- | :--- | :--- | :--- |
| local | комп'ютер розробника | `pnpm dev`, `pnpm preview` | немає |
| CI | GitHub Actions | push / pull request | немає |
| production | GitHub Pages, `https://ivangithubed.github.io/crypto-radar/` | workflow етапу 9 (`actions/deploy-pages`, OIDC, без збережених секретів) | немає |

**Що робить лише власник:**

1. Створює на GitHub **публічний** репозиторій `ivangithubed/crypto-radar` без README, `.gitignore` і ліцензії: на GitHub Free Pages працює лише з публічним репозиторієм (ADR 0003).
2. Додає remote і пушить `main` у своєму терміналі: `git remote add origin https://github.com/ivangithubed/crypto-radar.git`, потім `git push -u origin main`. Після першого push запуститься CI.
3. Рекомендовано: Settings → Branches → правило захисту `main` з обов'язковим статусом `CI / verify`.
4. Налаштування Pages (Source: GitHub Actions) і середовище `github-pages` — на етапі 9.

## 9. Дані

Серверних даних немає: RPO — не застосовно (NFR-12). Обрані й тема лежать у localStorage браузера відвідувача (ADR 0004). Міграцій і бекапів немає.

## 10. Витрати й ліміти

$0: GitHub Pages і Actions безкоштовні для публічного репозиторію, CoinGecko — без ключа (NFR-15). Платних ресурсів немає.

## 11. Типові проблеми

| Симптом | Причина | Виправлення |
| :--- | :--- | :--- |
| `pnpm install --frozen-lockfile` падає | `package.json` розійшовся з `pnpm-lock.yaml` | `pnpm install` локально й закомітити lockfile |
| `pnpm add` ставить не найсвіжішу версію | pnpm 11 за замовчуванням не бере релізи, молодші за 1 день | Так задумано (захист ланцюга постачання); через день повторити |
| `pnpm test:a11y` або `pnpm vitals`: «Executable doesn't exist» | Не встановлено Chromium для Playwright | `pnpm exec playwright install chromium` |
| `Port 4173/4174 is already in use` | Лишився запущений `vite preview` | Знайти процес (`netstat -ano \| findstr :4174`) і зупинити його |
| У `pnpm dev` усе працює, а в `pnpm preview` порожня сторінка й порушення CSP | Код вставляє inline-скрипт чи стиль або звертається до домену поза CSP | Прибрати inline-код; новий домен — лише через зміну NFR-8 |
| `pnpm verify` падає на `fmt:check` | Файл не відформатовано | `pnpm fmt` |
| `oxlint` падає з `complexity` | Функція складніша за 15 | Розбити функцію; поріг не підіймати |

## 12. Повне прибирання

```bash
rm -rf node_modules dist sbom .lighthouse playwright-report test-results
```

Глобальних ресурсів, контейнерів і даних немає. Видалення репозиторію на GitHub (якщо знадобиться) робить власник: Settings → Danger Zone. Ця дія незворотна.
