# Фінальний звіт етапу: Stage 5: Платформа: каркас, команда verify, CI

- **Етап:** `Stage 5: Платформа: каркас, команда verify, CI`
- **Відповідальний скіл:** `platform-devops`
- **Дата формування:** `2026-11-02 20:05`
- **Статус аудиту independent-reviewer:** `PASS`
- **Revise №2 (2026-11-03 01:05):** запит на зміну №2 (трекер, розділ 4): `.github/workflows/ci.yml` — крок «Acceptance oracle (stage 6)» після `pnpm verify` (оракул став зеленим після хвилі 4 етапу 7); `.dependency-cruiser.cjs` — `options.enhancedResolveOptions` (`exportsFields`, `conditionNames`), бо `react-router` 8 має лише поле `exports` і без цього кожен його імпорт — порушення `not-to-unresolvable`; правила й пороги не змінено; runbook §5–§7. Решта звіту — стан на коміті `3c7cc09`; нові факти позначено «Revise №2».

---

## 1. Перевірені передумови (Pre-Flight Summary)

Передумова: етап 3 `APPROVED_AND_COMMITTED` (`2edc20f`). Етап 4 закомічено паралельно (`4eb4f13`, 19:31); його токени дизайн-системи перенесено в `@theme`. У `.agentic/project.json`: `stack.type: "frontend-only"`, `has_http_api: false`, `deploy_target: "static-hosting"`. Глобально нічого не встановлювалося. Залежності поставлено в проєкт за згодою власника на план (2026-11-02).

| Інструмент / SDK / Акаунт | Необхідна версія | Фактичний стан на старті | Запропонована команда | Згода отримана | Результат |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Node.js | 24 LTS (ADR 0001) | `v24.21.0` | Ні, вже було | Не потрібно | `✅ Готово` |
| pnpm | 11 | `11.23.0` | Ні, вже було | Не потрібно | `✅ Готово` |
| Git | будь-яка | `2.45.2.windows.1` | Ні, вже було | Не потрібно | `✅ Готово` |
| Python (валідатор) | `>= 3.10` | `3.14.7` | Ні, вже було | Не потрібно | `✅ Готово` |
| Chromium для Playwright / Lighthouse | версія `@playwright/test` 1.64 | уже в `%LOCALAPPDATA%\ms-playwright` | `pnpm exec playwright install chromium` — не знадобилася | Не потрібно | `✅ Готово` |
| Docker | не потрібен (ADR 0001, без контейнерів) | — | — | — | `ℹ️ Не застосовно` |
| Порти 4173, 4174, 5173 | вільні | вільні (`netstat -ano`) | — | — | `✅ Готово` |
| Git remote / репозиторій GitHub | для CI | **немає remote** | інструкція власнику (runbook, розділ 8) | Створює власник | `⏳ Дія власника` |
| Пакети npm (anti-slopsquatting) | з ADR 0001 і stack-matrix | 21 пакет (19 з плану + `@types/react`, `@types/react-dom` від генератора) існують у реєстрі (`npm view`: версія, ліцензія, репозиторій) | `pnpm add -D …` | Так, план 2026-11-02 | `✅ Готово` |

**Фактичні версії після встановлення** (`pnpm-lock.yaml`):

- **Залежності продукту:** react 19.3.1, react-dom 19.3.1.
- **Збірка й стилі:** vite 8.3.5, @vitejs/plugin-react 6.1.2, tailwindcss 4.3.3, @tailwindcss/vite 4.3.3.
- **Лінт, формат і тести:** oxlint 1.90.0, oxfmt 0.75.0, vitest 5.0.5, @testing-library/react 16.3.3, @testing-library/jest-dom 7.0.1, jsdom 30.1.3.
- **Виміряний борг:** jscpd 5.4.2, knip 6.44.1, dependency-cruiser 18.7.0, @playwright/test 1.64.1, @axe-core/playwright 4.14.0, lighthouse 13.6.0, chrome-launcher 1.2.2.
- **Від генератора:** @types/react 19.3.0, @types/react-dom 19.3.0 (для підказок JSDoc у редакторі).

Розбіжності з ADR 0001 і їхні причини:

- `vitest` закріплено на 5.0.5 за рішенням власника. Версію 5.1.0 опубліковано 2026-11-02 о 16:12, у день етапу.
- pnpm 11 сам обрав `@vitejs/plugin-react` 6.1.2 замість 6.2.1 і `dependency-cruiser` 18.7.0 замість 18.7.1. Він не бере релізи, молодші за 1 день.
- `@lhci/cli` 0.15.1 (з плану) замінено на `lighthouse` 13.6.0 + `chrome-launcher` 1.2.2 (розділ 2).
- `@cyclonedx/cdxgen` не додано: SBOM генерує вбудована команда `pnpm sbom`.
- `msw` і `@testing-library/user-event` з ADR 0001 не встановлено: у каркасі немає мережевих запитів і взаємодій, тож `knip` позначив би їх як невикористані. Рішення про `msw` переходить до етапу 6 (`TD-003`).

---

## 2. Застосовані Best Practices vs найпростіший підхід

Власник 2026-11-02 прийняв усі рекомендації плану й три рішення (трекер, розділ 4): пороги складності й дублювання, workflow публікації на етапі 9, Dependabot щотижня.

| Аспект / Рішення | Найпростіший підхід | Галузева Best Practice | Що обрано та чому |
| :--- | :--- | :--- | :--- |
| Команда перевірки | Різні команди в README, CI і в голові | Одна детермінована `verify` | **Best Practice:** `pnpm verify` = lint → fmt:check → test → build → size. Та сама команда локально, у CI і в `verify_commands`. Кроку `typecheck` немає, бо проєкт без TypeScript (ADR 0001) |
| Створення каркаса | Маніфести вручну | Офіційний генератор `@latest`, залежності — командами менеджера | **Best Practice:** `pnpm create vite@latest .scaffold --template react --no-interactive` (create-vite 9.3.3), перенесення без перезапису `README.md` і `.agentic/`; скрипти — `npm pkg set` |
| Стилізація | Власні CSS-класи | Tailwind CSS v4 з токенами етапу 4 в `@theme` | **Best Practice:** 14 кольорових токенів, тінь, шрифти й радіуси з розділу 9.2 документа UX; темна тема через `data-theme` (`@custom-variant dark`) |
| Залежності | `install` без lockfile | Lockfile у Git, `--frozen-lockfile`, аудит, свіжі релізи з затримкою | **Best Practice:** `pnpm-lock.yaml`; `pnpm audit --audit-level high` у CI й `debt_commands`; затримка свіжих релізів у pnpm 11 і cooldown 7 днів у Dependabot |
| Технічний борг | Оцінка «на око» | `debt_commands` з порогами з NFR | **Best Practice:** 7 аспектів з порогами; на каркасі доведено, що кожен поріг дає код ≠ 0 (розділ 4.1) |
| Тести каркаса | `--passWithNoTests` | ≥ 1 справжній тест на набір | **Best Practice:** Vitest — тест рендеру оболонки (один `h1`, banner / main / contentinfo); a11y — axe у світлій і темній темах |
| Конфігурація | `import.meta.env` по всьому коду | Модуль конфігурації з fail-fast | **Не застосовно:** змінних середовища немає. Адреса CoinGecko — константа, бо її фіксує CSP (NFR-8); ключа немає (ADR 0005). `.env.example` пояснює це |
| Секрети | Значення в репозиторії | `.env.example` з плейсхолдерами, секрети — у сховищі CI | **Best Practice:** секретів немає взагалі; `.gitignore` закриває `.env` і `.env.*`; CI без секретів |
| CI | Один job з правами за замовчуванням | Мінімальні права, `timeout`, `concurrency`, пін на SHA | **Best Practice:** `contents: read`, `timeout-minutes: 20`, `concurrency` з `cancel-in-progress`, 4 дії запінено на SHA, `persist-credentials: false` |
| Здоров'я сервісу (`health` / `ready`) | — | — | **Не застосовно:** `has_http_api: false`, сервера немає |
| Контейнери, порядок старту, мережа БД | — | — | **Не застосовно:** ADR 0001 і ADR 0003 — статичний хостинг без контейнерів і БД |
| Спостережуваність | `console.log` | Структуровані логи без персональних даних | **Не застосовно на каркасі:** серверних логів немає (NFR-13); у консолі браузера 0 помилок (розділ 4.2) |
| Дані й RPO/RTO | — | — | **Не застосовно:** серверних даних немає (NFR-12). RTO ≤ 15 хв — етап 9 |
| Витрати | — | Ліміти до створення ресурсу | **Не застосовно:** $0, платних ресурсів немає (NFR-15) |
| CSP (NFR-8) | `<meta>` прямо в `index.html` | CSP лише у збірці | **Best Practice:** плагін `crypto-radar:csp` (`apply: 'build'`) додає `<meta>` у `dist/index.html`. Dev-сервер Vite вставляє inline-скрипти, тож CSP у dev його зламала б |
| Web Vitals (NFR-4) (стан `3c7cc09`) | `@lhci/cli` (план) | Інструмент без відомих high-вразливостей | **Заміна в межах плану:** `@lhci/cli` 0.15.1 (останній реліз — 2025-06) тягнув 5 high-вразливостей (`extract-zip` без патчу, `tmp`, `basic-ftp`, `zod`), і поріг NFR-9 був би червоним. `lighthouse` 13.6.0 + `scripts/web-vitals.mjs` з тими самими порогами NFR-4 дає 0 high |
| Правила якості (`--check-code`) | `quality_rules: []` | Детерміновані заборони з NFR у валідаторі | **Best Practice (після рев'ю №1):** `no-unsafe-html`, `no-dynamic-code` (NFR-8), `only-coingecko-origins` (NFR-10) для `src/**` (зокрема CSS) і `index.html`; працюють і в CI (`--ci`) |
| SBOM (NFR-9) | `cdxgen` (≈ сотні транзитивних пакетів) | Найменша поверхня ланцюга постачання | **Best Practice:** вбудований `pnpm sbom --sbom-format cyclonedx` (CycloneDX 1.7), без нової залежності |
| Бот оновлень | — | Dependabot / Renovate | **Рішення власника:** Dependabot щотижня (npm і GitHub Actions), cooldown 7 днів, ≤ 5 PR, група minor/patch для dev-залежностей |

---

## 3. Виконаний обсяг робіт (Deliverables)

**Revise №2:** `.github/workflows/ci.yml` (крок оракула), `.dependency-cruiser.cjs` (`enhancedResolveOptions`), `.agentic/specs/05-platform-runbook.md` (§5–§7), [`.claude/rules/project-lessons.md`](../../.claude/rules/project-lessons.md) — L-004 посилено (повтор), новий L-005 (час із годинника) за рев'ю Revise №2 і №3.

**Каркас (генератор create-vite 9.3.3 + правки оболонки):**
- [`package.json`](../../package.json) — маніфест: `name`, `engines.node` `>=24.0.0 <25`, `packageManager` `pnpm@11.23.0`, скрипти `verify`, `lint`, `fmt`, `fmt:check`, `test`, `size`, `dup`, `deadcode`, `boundaries`, `test:a11y`, `vitals`, `sbom:write`.
- [`pnpm-lock.yaml`](../../pnpm-lock.yaml) — lockfile.
- [`index.html`](../../index.html) — `lang="uk"`, назва, опис.
- [`vite.config.js`](../../vite.config.js) — `base: '/crypto-radar/'`, плагіни react і tailwindcss, CSP у збірці (NFR-8), налаштування Vitest.
- [`src/main.jsx`](../../src/main.jsx) — точка входу.
- [`src/app/App.jsx`](../../src/app/App.jsx) — оболонка: header / main з одним `h1` / footer на токенах.
- [`src/index.css`](../../src/index.css) — Tailwind CSS v4 і токени етапу 4 в `@theme`.
- [`src/app/App.test.jsx`](../../src/app/App.test.jsx) — тест оболонки.
- [`src/test/setup.js`](../../src/test/setup.js) — jest-dom і cleanup.
- [`public/favicon.svg`](../../public/favicon.svg) — іконка від генератора.

**Якість і виміряний борг:**
- [`.oxlintrc.json`](../../.oxlintrc.json) — `complexity` ≤ 15, `react/no-danger`, `no-eval`, `no-new-func`.
- [`.oxfmtrc.json`](../../.oxfmtrc.json) — форматер, без `.agentic/**` і `*.md`.
- [`.jscpd.json`](../../.jscpd.json) — дублювання ≤ 3 %.
- [`knip.json`](../../knip.json) — мертвий код.
- [`.dependency-cruiser.cjs`](../../.dependency-cruiser.cjs) — межі модулів з розділу 5 архітектури.
- [`playwright.a11y.config.js`](../../playwright.a11y.config.js) і [`a11y/shell.a11y.spec.js`](../../a11y/shell.a11y.spec.js) — axe (NFR-6).
- [`scripts/check-bundle-size.mjs`](../../scripts/check-bundle-size.mjs) — NFR-5.
- [`scripts/web-vitals.mjs`](../../scripts/web-vitals.mjs) — NFR-4.

**Репозиторій і CI:**
- [`.nvmrc`](../../.nvmrc) — `24`.
- [`.gitignore`](../../.gitignore) — новий: залежності, збірка, звіти, `sbom`, `.lighthouse`, `.env*` (крім `.env.example`), `.agentic/holdouts/`.
- [`.gitattributes`](../../.gitattributes) — `eol=lf`.
- [`.env.example`](../../.env.example) — пояснення, що змінних немає.
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — CI.
- [`.github/dependabot.yml`](../../.github/dependabot.yml) — бот оновлень.
- [`CLAUDE.md`](../../CLAUDE.md) — стек, команди, структура, guardrails.

**Механізми конвеєра:**
- [`.agentic/bundle/`](../bundle/) — копія валідатора (`verify-gate.py --vendor`): `verify-gate.py`, `pipeline.json`, 3 хуки, шаблон звіту.
- [`.claude/settings.json`](../../.claude/settings.json) — хук `holdout_guard.py` (новий файл).
- [`.claude/launch.json`](../../.claude/launch.json) — конфігурації `preview` і `dev` для перевірки в браузері.
- [`.claude/skills/verify/SKILL.md`](../../.claude/skills/verify/SKILL.md) — verify-скіл проєкту (глобальне правило власника). Не комітиться без окремого запиту.

**Документи етапу:**
- [`.agentic/specs/05-platform-runbook.md`](../specs/05-platform-runbook.md) — runbook.
- [`.agentic/project.json`](../project.json) — змінено лише `verify_commands` (`"5"`, `"7"`), `debt_commands` (7 аспектів) і `quality_rules` (3 правила).
- [`.agentic/tech-debt.md`](../tech-debt.md) — реєстр боргу, `TD-001` – `TD-004`.
- [`.claude/rules/project-lessons.md`](../../.claude/rules/project-lessons.md) — урок `L-004` (BLOCKERS FOUND рев'ю №1).
- [`.agentic/pipeline-state.md`](../pipeline-state.md) — статус етапу 5, рішення власника.
- `.agentic/reports/05-platform-report.md` — цей звіт.

**Не створено (межі етапу):** маршрути, React Router, TanStack Query, екрани й модулі `features/*`, `market-data` тощо (етап 7); `acceptance/` (етап 6); `e2e/` (етап 8.b); workflow публікації на GitHub Pages (етап 9, рішення власника); `contract/` (не застосовно).

---

## 4. Докази працездатності (Verification Evidence)

### 4.0. Валюта довіри (Trust Receipt)

| Перевірка | Команда | Код виходу | Лічильники | Повторив рев'юер | Примітка |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Валідатор етапу | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 5 --run` | 0 | 24 PASS, 0 FAIL; 10 команд (`verify_commands["5"]` і 8 `debt_commands`) | ні | Revise №2: запущено 2026-11-03 01:44:40–01:45:37 після вердикту PASS рев'ю №7 (L-004); вивід — 4.2, блок «Revise №2 — валідатор етапу» |
| Сканер секретів (стан `3c7cc09`) | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --scan-secrets .` | 0 | 51 файл, 0 секретів | так | рев'ю №1 і №2: код 0, 51 файл |
| Правила якості (стан `3c7cc09`) | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --check-code src` | 0 | 3 правила, 4 файли, 0 порушень; штучне порушення → 3 помилки, код 1 | так | додано після рев'ю №1; рев'ю №2: код 0, 0 порушень |
| Заморожене встановлення (стан `3c7cc09`) | `pnpm install --frozen-lockfile` | 0 | lockfile актуальний | ні | |
| Типи | — | не застосовно | — | ні | JavaScript без TypeScript (ADR 0001) |
| Лінт (стан `3c7cc09`) | `pnpm lint` (`oxlint --deny-warnings`) | 0 | 0 помилок, 0 попереджень | так | рев'ю №1 і №2: `pnpm verify` код 0 |
| Формат (стан `3c7cc09`) | `pnpm fmt:check` | 0 | 21 файл, усі відформатовані | так | рев'ю №1 і №2: `pnpm verify` код 0 |
| Тести (стан `3c7cc09`) | `pnpm test` | 0 | 1 passed / 0 failed / 0 skipped | так | рев'ю №1 і №2: `pnpm verify` код 0 |
| Збірка (стан `3c7cc09`) | `pnpm build` | 0 | 16 модулів, JS 68,97 кБ gzip | так | рев'ю №1 і №2: `pnpm verify` код 0 |
| Розмір бандла (NFR-5) (стан `3c7cc09`) | `pnpm size` | 0 | 68,23 кБ gzip ≤ 150 кБ | так | рев'ю №1 і №2: `pnpm verify` код 0 |
| Виміряний борг (стан `3c7cc09`) | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --debt` | 0 | 7 з 7 аспектів, 8 з 8 команд PASS | ні | |
| Доступність (NFR-6) (стан `3c7cc09`) | `pnpm test:a11y` | 0 | 2 passed (світла й темна теми), 0 critical/serious | ні | |
| Web Vitals (NFR-4) (стан `3c7cc09`) | `pnpm vitals` | 0 | медіана LCP 753 мс, CLS 0, TBT 0 мс | ні | |
| Живий старт (UI) (стан `3c7cc09`) | `preview_start` → `http://localhost:4173/crypto-radar/`; `curl -fsS` | 0 | HTTP 200, 1 `h1`, 0 повідомлень у консолі | ні | |
| Revise №2: оракул, як у новому кроці CI | `pnpm exec vitest run --config acceptance/vitest.config.js` | 0 | 9 файлів, 91 passed / 0 failed | ні | вивід — 4.1, блок «Revise №2»; на коді етапу 7 і запиту №3 (незакомічені) — див. ризик у секції 6 |
| Revise №2: межі модулів | `pnpm boundaries` | 0 | 0 порушень, 84 модулі, 200 залежностей | ні | вивід — 4.1, блок «Revise №2»; причину правки описано в журналі автономності (Sync 3 етапу 7) |
| Revise №2: синтаксис workflow | — | не запускалось | — | ні | `actionlint` у проєкті немає; новий крок повторює формат сусідніх; перший запуск — після push власника |
| Вердикт рев'юера | субагент `independent-reviewer` | не запускалось | — | ні | Revise №2: після рев'ю; попередні рев'ю (№1 BLOCKERS FOUND, №2 PASS) — розділ 4.3 |

### 4.1. Збірка, лінтери та автоматичні тести

> Блоки нижче до «Revise №2» — стан `3c7cc09` (рев'ю №1 і №2), у цьому проході не повторювалися; поточні виміри дерева з кодом етапу 7 — у блоці «Revise №2» і в `.agentic/evidence/debt-checks.md`.

`pnpm install --frozen-lockfile && pnpm verify` (останній запуск, ANSI-кольори прибрано):

```text
Done in 301ms using pnpm v11.23.0
$ pnpm lint && pnpm fmt:check && pnpm test && pnpm build && pnpm size
$ oxlint --deny-warnings
$ oxfmt --check
Checking formatting...

All matched files use the correct format.
Finished in 286ms on 21 files using 24 threads.
$ vitest run

 RUN  v5.0.5 D:/crypto-radar

 Test Files  1 passed (1)
      Tests  1 passed (1)

$ vite build
vite v8.3.5 building client environment for production...
✓ 16 modules transformed.
dist/index.html                   0.98 kB │ gzip:  0.55 kB
dist/assets/index-C7DtWOLw.css   11.22 kB │ gzip:  3.01 kB
dist/assets/index-CkLdbhnG.js   220.28 kB │ gzip: 68.97 kB
✓ built in 107ms
$ node scripts/check-bundle-size.mjs
    68.23 kB gzip  dist\assets\index-CkLdbhnG.js
NFR-5: JS головного екрана 68.23 kB gzip (ліміт 150 kB)
EXIT=0
```

`verify-gate.py --debt` (усі `debt_commands`):

```text
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
```

Окремі зелені прогони (лічильники):

```text
pnpm dup        → Found 0 clones. (4 файли, 0,00 % дублювання)
pnpm deadcode   → без знахідок (1 підказка конфігурації про .css, код 0)
pnpm boundaries → ✔ no dependency violations found (8 modules, 7 dependencies cruised)   (стан 3c7cc09)
pnpm audit --audit-level high → 2 vulnerabilities found, Severity: 2 moderate (код 0; TD-001)
pnpm sbom:write → sbom/crypto-radar.cdx.json, CycloneDX 1.7, 282 components
pnpm test:a11y  → ok light, ok dark — 2 passed
pnpm vitals     → OK LCP 753.597 мс; OK CLS 0.000; OK TBT 0.000 мс (3 прогони)
```

**Доказ, що пороги спрацьовують.** Тимчасові порушення в робочому дереві. Після кожної перевірки файли видалено або відновлено з копії (`cmp` → identical), `git status` чистий.

```text
### complexity: pnpm lint (функція з 17 гілками)
src/lib/tmp-complex.js:1:8: error eslint(complexity): function `tooComplex` has a complexity of 18. Maximum allowed is 15.
EXIT=1
### complexity: pnpm dup (два однакові файли по 14 рядків)
Found 1 clones.
EXIT=1
### dead_code: pnpm deadcode (файл, який ніхто не імпортує)
Unused files (1)
EXIT=1
### boundaries: pnpm boundaries (src/lib імпортує src/ui)
  error lib-deps: src/lib/tmp-bad.js → src/ui/tmp-ui.js
x 1 dependency violations (1 errors, 0 warnings). 11 modules, 9 dependencies cruised.
EXIT=1
### vulnerabilities: pnpm audit --audit-level moderate (нижчий рівень, щоб показати спрацювання на наявних знахідках)
2 vulnerabilities found
EXIT=1
### NFR-5 size: node scripts/check-bundle-size.mjs 50 (ліміт 50 кБ замість 150)
NFR-5: JS головного екрана 68.23 kB gzip (ліміт 50 kB)
NFR-5: ліміт перевищено
EXIT=1
### accessibility: pnpm test:a11y (img без alt + текст #cccccc)
    +   "serious: color-contrast (1)",
    +   "critical: image-alt (1)",
  2 failed
EXIT=1
### web_vitals: pnpm vitals (1,5 с блокування головного потоку в main.jsx)
OK   LCP: медіана 754.810 мс (поріг ≤ 2500 мс)
OK   CLS: медіана 0.000  (поріг ≤ 0.1)
FAIL TBT: медіана 5964.000 мс (поріг ≤ 200 мс; прогони: 5964.000, 5965.000, 5964.000)
NFR-4: поріг Web Vitals перевищено
EXIT=1
```

`sbom` — генерація, а не поріг: команда червоніє лише тоді, коли не може прочитати lockfile чи store. Штучне порушення для неї не має сенсу.

**Revise №2 — оракул (команда нового кроку CI) і межі модулів:**

```text
$ pnpm exec vitest run --config acceptance/vitest.config.js   (2026-11-03 01:10, код етапу 7 + запит №3)
 RUN  v5.0.5 D:/crypto-radar
 Test Files  9 passed (9)
      Tests  91 passed (91)
   Start at  01:10:52
EXIT=0
```

```text
$ pnpm boundaries   (2026-11-03 01:10, код етапу 7, .dependency-cruiser.cjs з enhancedResolveOptions)
✔ no dependency violations found (84 modules, 200 dependencies cruised)
EXIT=0
```

### 4.2. Валідація артефактів, контракту, інфраструктури

**Revise №2 — валідатор етапу (після вердикту рев'ю №7, 2026-11-03 01:44:40–01:45:37):**

```text
$ python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 5 --run
=== Перевірка етапу: Stage 5 ===
✅ [PASS] Передумови схвалено: 3
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] Артефакт .agentic/specs/05-platform-runbook.md знайдено
✅ [PASS] Артефакт CLAUDE.md знайдено
✅ [PASS] Артефакт .agentic/project.json знайдено
✅ [PASS] Артефакт .agentic/bundle/skills/gate-check/verify-gate.py знайдено
✅ [PASS] Артефакт .claude/settings.json знайдено
✅ [PASS] Артефакт .gitignore знайдено
=== Правила якості коду: . ===
=== Сканування секретів: . ===
=== Команди перевірки етапу 5 ===
✅ [PASS] Команда успішна: pnpm install --frozen-lockfile
✅ [PASS] Команда успішна: pnpm verify
=== Виміряний технічний борг (debt_commands) ===
✅ [PASS] Команда успішна: pnpm lint
✅ [PASS] Команда успішна: pnpm dup
✅ [PASS] Команда успішна: pnpm deadcode
✅ [PASS] Команда успішна: pnpm boundaries
✅ [PASS] Команда успішна: pnpm audit --audit-level high
✅ [PASS] Команда успішна: pnpm sbom:write
✅ [PASS] Команда успішна: pnpm test:a11y
✅ [PASS] Команда успішна: pnpm vitals
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```


> Блоки нижче — стан `3c7cc09` (рев'ю №1 і №2), у Revise №2 не повторювалися; `index.html` і `vite.config.js` відтоді змінено етапом 7 (його звіт і `.agentic/evidence/`).

**Живий старт** (`.claude/launch.json` → `preview`, браузер сесії, `http://localhost:4173/crypto-radar/`):

```text
curl -fsS http://localhost:4173/crypto-radar/ → HTTP 200, <title>Крипто-Радар</title>
DOM: h1 = ["Крипто-Радар"], lang = "uk", header/main/footer = 1/1/1,
     <meta http-equiv="Content-Security-Policy"> присутній, фон світлої теми rgb(247, 245, 251)
read_console_messages → No console logs (0 помилок, 0 порушень CSP)
data-theme="dark", 320×640: фон rgb(21, 18, 31), h1 rgb(237, 233, 246),
     scrollWidth 320 = clientWidth 320 (немає горизонтальної прокрутки)
preview_stop; netstat :4173/:4174 LISTEN → порожньо
```

CSP у зібраному `dist/index.html`:

```text
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https://coin-images.coingecko.com data:; connect-src https://api.coingecko.com; object-src 'none'; base-uri 'self'; form-action 'none'">
```

**Пін дій CI** (`git ls-remote https://github.com/<repo> refs/tags/<тег>`):

```text
actions/checkout     v7.0.1 3d3c42e5aac5ba805825da76410c181273ba90b1
actions/setup-node   v7.1.0 949feb2413d6458794dcd2491c4babbbce0c15c1
actions/setup-python v7.1.0 6d4fd22b20465ccc0f7354476588e8df7c9ca0e0
pnpm/action-setup    v6.1.0 ea17c68df8912ef543352723c149a84f56e3d413
```

**Копія валідатора:** `verify-gate.py --vendor` → `УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)`.

**Валідатор етапу** `verify-gate.py --stage 5 --run`:

```text
✅ [PASS] Передумови схвалено: 3
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 15 перевірок із кодами виходу
✅ [PASS] Карта технологій заповнена (6 рядків)
✅ [PASS] Conventional Commit у секції 7 валідний
✅ [PASS] Артефакт .agentic/specs/05-platform-runbook.md знайдено
✅ [PASS] Артефакт CLAUDE.md знайдено
✅ [PASS] Артефакт .agentic/project.json знайдено
✅ [PASS] Артефакт .agentic/bundle/skills/gate-check/verify-gate.py знайдено
✅ [PASS] Артефакт .claude/settings.json знайдено
✅ [PASS] Артефакт .gitignore знайдено
✅ [PASS] Перевірено файлів: 6, порушень-помилок немає
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
EXIT=0  (2026-11-02, після вердикту PASS; порти 4173/4174 після запуску вільні)
```

### 4.3. Вердикт незалежного аудиту (`independent-reviewer`)

```text
Рев'ю №1 (2026-11-02 19:58): BLOCKERS FOUND.
  BLOCKER: рядки 4.0 «Валідатор етапу» і «Вердикт рев'юера» мали код 0 до вердикту, 4.2 без виводу → виправлено («не запускалось», L-004).
  WARNING: quality_rules порожні → додано 3 правила; поріг dead_code без NFR → питання на гейті, виняток tailwindcss описано в runbook;
           NFR-4 підміна джерела і lhci → TD-002; msw / user-event з ADR 0001 → TD-003; tnum Onest → TD-004.
  INFO: 9 файлів .agentic/ з позначкою M побайтово = HEAD; лічильник сканера 49 → 51.
Рев'ю №2 (2026-11-02 20:01): PASS — independent-reviewer, Stage 5.
Блокер рев'ю №1 закрито: рядки 4.0 «Валідатор етапу» і «Вердикт рев'юера» — «не запускалось» (L-004), 4.2 без вигаданого виводу. verify-gate.py --stage 5: єдина помилка — статус аудиту (очікувано); «Валюта довіри» 15 рядків, Conventional Commit валідний, 6 артефактів знайдено.
Межі етапу: фактичні зміни tracked-файлів (git diff --stat HEAD) — .agentic/pipeline-state.md, .agentic/project.json, .claude/rules/project-lessons.md; 9 інших файлів .agentic/ з позначкою M мають порожній diff. .claude/skills/verify/SKILL.md поза git add. dist, node_modules, sbom, .lighthouse ігноруються.
project.json проти HEAD: змінено лише verify_commands ("5", "7"), debt_commands (7 аспектів, 8 команд), quality_rules (3 правила).
Секрети: --scan-secrets . — 51 файл, 0 знахідок, код 0. Правила якості: --check-code src — 4 файли, 0 порушень, код 0.
Контракт: не застосовно — has_http_api: false. pnpm verify: код 0, лічильники збігаються з 4.1.
Не перевірено повторно рев'юером: pnpm install --frozen-lockfile, --debt, test:a11y, vitals, живий старт (заборонені встановлення / браузер).
Узгодженість (L-002): TD-001…TD-004, 3 правила якості, лічильник сканера 51, пороги complexity 15 / jscpd 3 % — однакові в усіх документах.
INFO (внесено після рев'ю): 21 пакет замість 19; globs only-coingecko-origins охоплюють CSS; примітки «Повторив рев'юер».
Рев'ю №3, Revise №2 (2026-11-03 01:10): BLOCKERS FOUND.
  BLOCKER: рядки 4.0 «оракул» і «межі модулів» з кодом 0 без виводу; рядок 4.1 boundaries (8 modules) суперечив 4.0 → додано блок «Revise №2» у 4.1 (прогін 01:10), рядок 4.1 позначено «стан 3c7cc09», твердження про 8 порушень без резолвера прибрано з 4.0 (посилання на журнал).
  WARNING: крок оракула червоний на коміті Revise №2, поки не закомічено етап 7 і запит №3 → ризик у секції 6 і на гейті; часові позначки трекера й шапки → виправлено за git log і часом зміни файлів, урок L-005.
  INFO: forbidden без змін (13 правил), лише options.enhancedResolveOptions; runbook узгоджений з ci.yml; трекер у коміті — дозволено.
Рев'ю №4, Revise №2 (2026-11-03 01:14): BLOCKERS FOUND.
  BLOCKER: «час уточнено 01:15» у трекері записано до 01:15 (повтор L-005) → позначки й «Останнє оновлення» замінено виводом `date` (2026-11-03 01:15).
  BLOCKER: урок без .claude/rules/project-lessons.md у секціях 3 і 7 → додано в секції 3, 7.1, 7.2.
  WARNING: «о 00:10» у записі «≤ 00:05» → виправлено; звіт етапу 4 зберігає первинні 00:20/00:40 → запис у трекері, питання на гейт; рядки 4.0 і блок 4.1 стану 3c7cc09 → позначено «стан 3c7cc09».
Рев'ю №5, Revise №2 (2026-11-03 01:19): BLOCKERS FOUND.
  BLOCKER: розбіжність часу звіту етапу 4 відсутня в секції 6 і на гейті → додано (01:20, після читання рев'юером); трекер доповнено позначками 00:05 / 00:10.
  BLOCKER: рядок 4.0 «Web Vitals» без позначки → «стан 3c7cc09».
  BLOCKER: записи трекера етапів 2, 3, 6 пізніші за коміти, що їх містять → звірка всіх записів з git log одним проходом (скрипт), позначки «≤ HH:MM (час уточнено …)», журнал комітів вирівняно й доповнено.
  WARNING: план «.dependency-cruiser.cjs не змінюється» → примітки в плані (§5, §13, §15.1) у межах Revise №3 етапу 6; блоки 4.2 → позначено «стан 3c7cc09».
Рев'ю №6, Revise №2 (2026-11-03 01:30): BLOCKERS FOUND.
  BLOCKER: рядки журналу комітів у матриці етапів трекера → перенесено в розділ 3 (01:31).
  BLOCKER: розбіжність часу звіту етапу 4 відсутня в блоці гейту → окремий пункт на гейті (L-003).
  WARNING: позначка 00:10 не названа → «00:10, 00:20, 00:40» у секції 6 і на гейті обох звітів.
Рев'ю №7, Revise №2 (2026-11-03 01:42): PASS — independent-reviewer, Stage 5.
  Закриття рев'ю №6 підтверджено: матриця розділу 2 трекера — 10 рядків етапів; f689fc3 і чекпоінти етапу 7 — у розділі 3 (час = git log); розбіжність часу звіту етапу 4 — секція 6 і пункт 2 блоку гейту («00:10, 00:20, 00:40»).
  Годинник: vitest «Start at 01:41:52»; найпізніша позначка в .agentic/ — 01:41; Revise №2: ci.yml і runbook 01:05:34, .dependency-cruiser.cjs 00:41:04, project-lessons.md 01:11:59.
  Межі: 6 файлів Revise №2 у зоні етапу 5; git add 7.2 — явний список; решта дерева — етап 7 і Revise №3, у коміт не входять. ci.yml — лише крок оракула; .dependency-cruiser.cjs — лише options.enhancedResolveOptions; runbook §5–§7 узгоджений.
  Секрети: --scan-secrets . — 160 файлів, 0. Правила якості: --check-code . — 81 файл, 0. Залежності, контракт — не застосовно.
  Повторний pnpm verify (дерево етапу 7): код 0 — 14 файлів / 189 passed, JS 104,95 кБ. Не повторено (хук read-only): оракул, pnpm boundaries, --debt, test:a11y, vitals — звірено статично з блоками 4.1 і evidence.
  WARNING: записи 4.3 №1 і №2 стояли після №6 → упорядковано за часом (2026-11-03 01:44).
  INFO: запис трекера 01:31 стосується обох Revise; «Останнє оновлення» на 1 хв раніше за час зміни файла; мітка уроків змішує етапи — без впливу на правила.
```

---

## 5. Матриця трасування вимог (Requirements Traceability)

Історії US-N на етапі 5 **не реалізуються**: це етап 7. Тут трасуються NFR і ADR, які етап 5 закриває інструментами й каркасом.

| ID вимоги | Вимога | Де реалізовано | Чим перевірено | Статус |
| :--- | :--- | :--- | :--- | :--- |
| `NFR-4` | LCP ≤ 2,5 с, CLS ≤ 0,1, TBT ≤ 200 мс, мобільний профіль, медіана 3 прогонів | `scripts/web-vitals.mjs`, `debt_commands.web_vitals` | `pnpm vitals`: зелений прогін + спрацювання на TBT 5964 мс | `✅ На каркасі` (8.b — усі екрани) |
| `NFR-5` | JS головного екрана ≤ 150 кБ gzip | `scripts/check-bundle-size.mjs`, `pnpm verify` | `pnpm size`: 68,23 кБ; ліміт 50 → код 1 | `✅ Виконано` |
| `NFR-6` | WCAG 2.2 AA, 0 critical/serious, обидві теми | `a11y/shell.a11y.spec.js`, `debt_commands.accessibility` | `pnpm test:a11y`: 2 passed; порушення → 2 failed | `✅ На каркасі` (8.a / 8.b — усі екрани) |
| `NFR-7` | Без горизонтальної прокрутки на 320 px | оболонка `src/app/App.jsx` | браузер: `scrollWidth` 320 = `clientWidth` 320 | `✅ На каркасі` (8.b — E2E) |
| `NFR-8` | CSP у `<meta>`, заборона `dangerouslySetInnerHTML` / `eval` | `vite.config.js` (плагін `crypto-radar:csp`), `.oxlintrc.json` | `dist/index.html` містить CSP; консоль — 0 порушень; правила `react/no-danger`, `no-eval`, `no-new-func` | `✅ Виконано` (рядок `innerHTML` — пошуком `rg` на етапі 7) |
| `NFR-9` | Lockfile, `--frozen-lockfile`, 0 high/critical, SBOM CycloneDX, пакети перевірено в реєстрі | `pnpm-lock.yaml`, `ci.yml`, `debt_commands.vulnerabilities` / `sbom` | `pnpm audit --audit-level high` → 0 high; `pnpm sbom:write` → 282 компоненти; `npm view` для 21 пакета | `✅ Виконано` (TD-001: 2 moderate) |
| `NFR-13` | 0 помилок у консолі | оболонка | браузер: `No console logs` | `✅ На каркасі` |
| `NFR-14` | Node 24 LTS однаково в `.nvmrc`, `engines` і CI | `.nvmrc`, `package.json` (`engines`), `ci.yml` (`node-version-file`) | ручний огляд; CI ще не запускався в GitHub | `⏳ Частково` (перший запуск CI — після push власника) |
| `NFR-15` | $0 | GitHub Actions без платних ресурсів | огляд: стандартний раннер, публічний репозиторій | `✅ Виконано` |
| `ADR 0001` | React 19 + JS на Vite 8, Tailwind v4, Oxlint / Oxfmt / Vitest, pnpm 11 | маніфест і конфіги | `pnpm verify` → 0 | `✅ Виконано` |
| `ADR 0003` | `base: '/crypto-radar/'`, CI verify, без публікації на етапі 5 | `vite.config.js`, `ci.yml` | preview за шляхом `/crypto-radar/` → 200 | `✅ Виконано` |
| `Архітектура §5` | Межі модулів перевіряє dependency-cruiser | `.dependency-cruiser.cjs` | `pnpm boundaries` → 0 порушень; `lib → ui` → код 1 | `✅ Виконано` |
| `UX §9.2` | Токени дизайн-системи в `@theme`, `dark:` через `data-theme` | `src/index.css` | браузер: фон обох тем збігається з токенами | `✅ Виконано` |

---

## 6. Ризики, технічний борг і відкриті питання

| Тип | Опис | Вплив | Що пропонується | Власник рішення |
| :--- | :--- | :--- | :--- | :--- |
| Борг | `TD-001`: 2 знахідки moderate у ланцюгу `lighthouse` (лише dev-інструмент); поріг NFR-9 (0 high/critical) дотримано | Низький | Підтвердити на гейті: лишити відкритим і стежити через Dependabot | Власник продукту |
| Ризик | CI ще жодного разу не запускався в GitHub Actions: немає remote і репозиторію. Ubuntu-специфіку (пісочниця Chromium, `process.kill` групи процесів у `web-vitals.mjs`) локально не перевірено | Середній | Власник створює публічний репозиторій і робить push (runbook §8). Перший червоний запуск виправляє етап 5 (тип коміту `ci(stage-5)`) | Власник продукту |
| Питання | Захист гілки `main` з обов'язковим `CI / verify` налаштовує лише власник | Низький | Settings → Branches після першого push | Власник продукту |
| Відхилення від плану | `@lhci/cli` замінено на `lighthouse` + `chrome-launcher` + `scripts/web-vitals.mjs`: lhci тягнув 5 high-вразливостей, а `extract-zip` без патчу. Аспект і пороги NFR-4 ті самі | Низький | Підтвердити на гейті | Власник продукту |
| Відхилення від плану | `@cyclonedx/cdxgen` не додано; SBOM — вбудований `pnpm sbom` | Низький | Підтвердити на гейті | Власник продукту |
| Питання | Поріг `dead_code` = 0 невикористаних файлів, експортів і залежностей (knip) NFR не задає; виняток `tailwindcss` (імпорт лише з CSS) | Низький | Підтвердити поріг на гейті й записати рішення в трекер | Власник продукту |
| Борг | `TD-002`: підміна відповіді CoinGecko в `pnpm vitals` / `pnpm test:a11y` до появи даних; NFR-4 називає `lhci autorun` | Середній | Етап 6/7 + запит на зміну NFR-4 через `project-kickoff` після рішення на гейті | Власник продукту |
| Борг | `TD-003`: `msw` і `@testing-library/user-event` (ADR 0001) не встановлено | Низький | Етап 6 планує встановлення | Скіл етапу 6 |
| Борг | `TD-004`: шрифти й ознака `tnum` в Onest не перевірені | Низький | Етап 6, задача «шрифти» | Скіл етапу 6 |
| Питання для етапів 6–7 | Шрифти Unbounded і Onest (UX §9.2) ще не підключено. У реєстрі є `@fontsource/onest` 5.3.1 і `@fontsource/unbounded` 5.3.0 (OFL-1.1, репозиторій fontsource/font-files): файли woff2 лягають у збірку, без запитів до Google Fonts. Чи має Onest ознаку `tnum`, не перевірено | Низький | Етап 6 включає задачу «шрифти» в план; етап 7 перевіряє `tnum` на файлі | Скіл етапу 6 |
| Інцидент етапу | Перший запуск `pnpm fmt` (oxfmt без ignore) переформатував 17 Markdown-файлів `.agentic/`, зокрема схвалені специфікації етапів 1–4. Їх відновлено з HEAD (`4eb4f13`) після резервної копії; побайтову рівність перевірено (`git diff` порожній, `git hash-object` = blob HEAD). У `.oxfmtrc.json` додано `.agentic/**` і `**/*.md` | Середній (виправлено) | Записати урок у `.claude/rules/project-lessons.md` — за згодою власника | Власник продукту |
| Спостереження | `git status` показує 9 файлів `.agentic/` як `M`, хоча їхній вміст побайтово збігається з HEAD (кеш стану після відновлення і появи `.gitattributes`). У коміт етапу 5 вони не потрапляють | Низький | Нічого; `git add` цих файлів дав би порожню зміну | — |
| Межі етапу | ADR 0003 згадує workflow деплою для етапу 5. Власник вирішив перенести його на етап 9 | — | Етап 9 | Власник продукту (2026-11-02) |

**Revise №2 — ризик порядку комітів (підтвердити на гейті, L-003):** новий крок CI «Acceptance oracle (stage 6)» зелений лише разом із кодом етапу 7 і запитом №3 (етап 6). На коміті Revise №2 окремо оракул червоний (на `3c7cc09` / `f689fc3` — 91 з 91). Remote і push ще немає, тож CI зараз не запускається; пропозиція — push лише після комітів запиту №3 і етапу 7.

**Revise №2 — розбіжність часу у звіті етапу 4 (підтвердити на гейті, L-003):** `.agentic/reports/04-ux-api-report.md` (коміт `f689fc3`, 00:05:46) містить позначки 00:10, 00:20 і 00:40, пізніші за коміт; уточнений час — у трекері, розділ 4 («≤ 00:05»). Те саме питання — на гейті етапу 6; власник вирішує один раз: запит на зміну до етапу 4 або лишити трекер джерелом правди.

### 6.1. Карта технологій для самостійного опанування

| Технологія / Інструмент / Патерн | Рівень опанування | Ключові концепції | Офіційне першоджерело |
| :--- | :--- | :--- | :--- |
| Vite (збірка, `base`, `preview`, плагіни) | **Вміти** | dev-сервер ≠ продакшен-збірка; `base` для GitHub Pages; `transformIndexHtml` з `apply: 'build'` | https://vite.dev/guide/ |
| pnpm (lockfile, `--frozen-lockfile`, затримка свіжих релізів, `pnpm sbom`, `pnpm audit`) | **Вміти** | Відтворювана збірка; захист від щойно опублікованих пакетів; SBOM CycloneDX | https://pnpm.io/cli/install |
| Tailwind CSS v4 (`@theme`, `@custom-variant`) | **Вміти** | Токени як CSS-змінні; темна тема через атрибут `data-theme` | https://tailwindcss.com/docs/theme |
| Content Security Policy | **Розуміти** | `script-src 'self'` блокує inline-скрипти; `<meta>` не підтримує `frame-ancestors` | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy |
| GitHub Actions (permissions, concurrency, пін на SHA) | **Розуміти** | Least privilege токена; чому тег дії можна підмінити, а SHA — ні | https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions |
| Виміряний борг (knip, dependency-cruiser, jscpd, axe, Lighthouse) | **Знати** | Поріг має червоніти на порушенні; виправляють код, а не поріг | https://knip.dev, https://github.com/sverweij/dependency-cruiser, https://developer.chrome.com/docs/lighthouse |

---

## 7. Точка фіксації в Git (Recommended Git Commit Checkpoint)

### 7.1. Список файлів для індексації (`git status --short`)

```text
Revise №2:
 M .github/workflows/ci.yml
 M .dependency-cruiser.cjs
 M .agentic/specs/05-platform-runbook.md
 M .agentic/reports/05-platform-report.md
 M .agentic/pipeline-state.md
 M .claude/rules/project-lessons.md
```

`.claude/rules/project-lessons.md` — уроки L-004 (посилено) і L-005 з рев'ю Revise №2 і №3 (розділ 11 контракту); у коміт Revise №2 як першого гейту. Інші незакомічені файли робочого дерева належать етапу 7 (`IN_PROGRESS`) і запиту №3 (етап 6) — у коміт Revise №2 не входять.

Початковий коміт `3c7cc09`:

```text
 M .agentic/pipeline-state.md
 M .agentic/project.json
?? .agentic/bundle/skills/gate-check/hooks/holdout_guard.py
?? .agentic/bundle/skills/gate-check/hooks/protect_paths.py
?? .agentic/bundle/skills/gate-check/hooks/readonly_bash.py
?? .agentic/bundle/skills/gate-check/pipeline.json
?? .agentic/bundle/skills/gate-check/verify-gate.py
?? .agentic/bundle/skills/sdd-delivery/assets/stage-report.template.md
?? .agentic/reports/05-platform-report.md
?? .agentic/specs/05-platform-runbook.md
?? .agentic/tech-debt.md
 M .claude/rules/project-lessons.md
?? .claude/launch.json
?? .claude/settings.json
?? .dependency-cruiser.cjs
?? .env.example
?? .gitattributes
?? .github/dependabot.yml
?? .github/workflows/ci.yml
?? .gitignore
?? .jscpd.json
?? .nvmrc
?? .oxfmtrc.json
?? .oxlintrc.json
?? CLAUDE.md
?? a11y/shell.a11y.spec.js
?? index.html
?? knip.json
?? package.json
?? playwright.a11y.config.js
?? pnpm-lock.yaml
?? public/favicon.svg
?? scripts/check-bundle-size.mjs
?? scripts/web-vitals.mjs
?? src/app/App.jsx
?? src/app/App.test.jsx
?? src/index.css
?? src/main.jsx
?? src/test/setup.js
?? vite.config.js
```

`.claude/skills/verify/SKILL.md` не індексується (без окремого запиту власника). `node_modules/`, `dist/`, `sbom/` і `.lighthouse/` закриває `.gitignore`.

### 7.2. Явна індексація та коміт (Conventional Commits)

```bash
# Revise №2
git add .github/workflows/ci.yml .dependency-cruiser.cjs .agentic/specs/05-platform-runbook.md .agentic/reports/05-platform-report.md .agentic/pipeline-state.md .claude/rules/project-lessons.md
git commit -m "ci(stage-5): run acceptance oracle in ci and resolve package exports"

# Початковий коміт етапу 5 (3c7cc09)
git add package.json pnpm-lock.yaml index.html vite.config.js src/main.jsx src/index.css src/app/App.jsx src/app/App.test.jsx src/test/setup.js public/favicon.svg scripts/check-bundle-size.mjs scripts/web-vitals.mjs a11y/shell.a11y.spec.js playwright.a11y.config.js knip.json .jscpd.json .dependency-cruiser.cjs .oxlintrc.json .oxfmtrc.json .nvmrc .gitignore .gitattributes .env.example .github/workflows/ci.yml .github/dependabot.yml CLAUDE.md .claude/settings.json .claude/launch.json .agentic/bundle .agentic/specs/05-platform-runbook.md .agentic/project.json .agentic/tech-debt.md .agentic/reports/05-platform-report.md .agentic/pipeline-state.md .claude/rules/project-lessons.md
git commit -m "build(stage-5): add walking skeleton, verify command and ci"
```

---

### 🛑 Рішення власника продукту (Human Approval Gate)

- [x] **Approve & закоміть** — статус `APPROVED_AND_COMMITTED`: агент оновлює `.agentic/pipeline-state.md`, позначає цей чекбокс, виконує явний `git add` і `git commit`.
- [ ] **Approve без коміту** — статус `APPROVED_MANUAL_COMMIT`: власник комітить самостійно.
- [ ] **Revise** — статус `REJECTED_REVISING`: зауваження нижче, етап повертається на Фазу 3.

**Коментарі / Зауваження:**
> Початковий гейт: «Approve & закоміть» (2026-11-02 22:39) → `3c7cc09`.
> Revise №2: «Approve & закоміть» (2026-11-03 01:47). Підтверджено на гейті: push лише після комітів запиту №3 і етапу 7; трекер — джерело правди для часу звіту етапу 4. Пункти гейту:
> 1. Ризик порядку комітів (секція 6) — push / CI лише після комітів запиту №3 і етапу 7.
> 2. Розбіжність часу у звіті етапу 4 (секція 6): позначки 00:10, 00:20, 00:40 пізніші за `f689fc3` — запит на зміну до етапу 4 або трекер як джерело правди; власник вирішує один раз для етапів 5 і 6.
