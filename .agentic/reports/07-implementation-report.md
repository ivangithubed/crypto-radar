# Фінальний звіт етапу: Stage 7: Реалізація: хвилі DAG, Red-Team аудит, перевірка в браузері

- **Етап:** `Stage 7: Реалізація: хвилі DAG, Red-Team аудит, перевірка в браузері`
- **Відповідальний скіл:** `sdd-delivery` (разом із `dag-runner`, `red-team-review`, `tech-debt-auditor`)
- **Дата формування:** `2026-11-03 03:24`
- **Статус аудиту independent-reviewer:** `PASS`

---

## 1. Перевірені передумови (Pre-Flight Summary)

На старті (2026-11-03 00:07–00:22): етап 6 — `APPROVED_AND_COMMITTED` (`ddcdf0b`), `verify-gate.py --next` — код 0, повтор `--stage 6` після запиту на зміну №1 — код 0. Робоче дерево чисте за вмістом (файли етапів 1–4 з позначкою `M` мають порожній `git diff`). Базовий хеш відкату — `f689fc3`. Базовий прогін: `pnpm install --frozen-lockfile && pnpm verify` — 0; оракул — 91 з 91 червоні (як очікує план, розділ 13).

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
- [`.agentic/evidence/red-team-report.md`](../evidence/red-team-report.md) — Red-Team, проходи №1–№6.
- [`.agentic/tech-debt.md`](../tech-debt.md) — TD-005 – TD-020 (TD-006, TD-010, TD-016, TD-017 закрито).
- [`.agentic/autonomy-journal.md`](../autonomy-journal.md) — рішення, бюджет «план / факт», Sync 0–4.
- [`.agentic/pipeline-state.md`](../pipeline-state.md) — статуси, рішення власника, запити на зміну №2 і №3.
- `.claude/skills/verify/SKILL.md` — доповнено (не комітиться без запиту власника).

---

## 4. Докази працездатності (Verification Evidence)

### 4.0. Валюта довіри (Trust Receipt)

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
| Holdouts | — | не застосовно | — | ні | `oracle.holdouts_command` не задано; `verify-gate.py --stage 6` (01:47:22): «Holdouts не задано (.agentic/holdouts/ порожній)»; власник збирався написати їх до гейту етапу 7 (трекер, 2026-11-03 00:05) — питання на гейті |
| Виміряний борг | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --debt` | 0 | 8 команд, 7 аспектів | ні | лічильники — `.agentic/evidence/debt-checks.md` (02:56) |
| Red-Team | субагент `red-team-auditor`, проходи №5 (повний) і №6 (вузький) | 0 | PASS; P0 = 0, P1 = 0, P2 = 14; оцінка D | ні | вивід — 4.2; `.agentic/evidence/red-team-report.md` |
| Перевірка в браузері | скіл `verify` (preview 4173, справжній CoinGecko) | 0 | 5 маршрутів; консоль 0; `securitypolicyviolation` 0; прокрутка 0 на 320 px з кожною відкритою підказкою; обидві теми й скриншоти (03:08) | ні | вивід — 4.2 |
| Репетиція відкату | `git worktree add --detach … f689fc3` + `pnpm verify` | 0 | 1 тест каркаса, 68,23 кБ; копію прибрано | ні | вивід — 4.2 |
| Вердикт рев'юера | субагент `independent-reviewer` | не запускалось | — | ні | після чернетки звіту |

### 4.1. Збірка, лінтери та автоматичні тести

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

### 4.2. Валідація артефактів, контракту, інфраструктури

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

### 4.3. Вердикт незалежного аудиту (`independent-reviewer`)

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
```

---

## 5. Матриця трасування вимог (Requirements Traceability)

Числа в дужках — виконані тести оракула на файл (зі структур сценаріїв), за JSON-звітом прогону 03:09:20: 17 + 10 + 15 + 5 + 9 + 9 + 9 + 10 + 7 = 91.

| ID вимоги | Вимога | Де реалізовано | Чим перевірено | Статус |
| :--- | :--- | :--- | :--- | :--- |
| `US-1 / AC-1.1 – AC-1.5` | Топ-50, формати, 25 + «Показати більше», ранги 1–50, межі зміни | `src/features/coin-list/**`, `src/lib/format.js`, `src/market-data/parse.js` | оракул `us-1` (17); `lib.test.js`, `CoinListPage.test.jsx`, `parse.test.js` | `✅ Виконано` |
| `US-2 / AC-2.1 – AC-2.8` | Сортування, тай-брейк, без збереження між візитами | `src/lib/sort.js`, `useCoinListView.js` | оракул `us-2` (10) | `✅ Виконано` |
| `US-3 / AC-3.1 – AC-3.9` | Пошук за назвою й тікером, ≤ 50 символів | `src/lib/index.js`, `SearchStatus.jsx` | оракул `us-3` (15) | `✅ Виконано` |
| `US-4 / AC-4.1 – AC-4.4` | Сторінка монети, графік і текстова альтернатива, поза топ-50 | `src/features/coin-page/**`, `src/chart/**` | оракул `us-4` (5); `CoinPage.test.jsx`, `PriceChart7d.test.jsx` | `✅ Виконано` |
| `US-5 / AC-5.1 – AC-5.7` | ★ додати / прибрати, без дублів, лише топ-50 | `src/favorites/store.js`, фічі | оракул `us-5` (9); `favorites.test.jsx` | `✅ Виконано` (E-STORE — TD-005) |
| `US-6 / AC-6.1 – AC-6.7` | Обрані між візитами, вибулі, порядок | `src/features/favorites-view/**` | оракул `us-6` (9); `FavoritesPage.test.jsx` | `✅ Виконано` |
| `US-7 / AC-7.1 – AC-7.4` | Підказки, Esc, одна відкрита, без наведення | `src/ui/TermHintButton.jsx`, `hintOffset.js`, `src/glossary/**` | оракул `us-7` (9); `ui.test.jsx`; `a11y/reflow.a11y.spec.js` | `✅ Виконано` (офлайн-старт — TD-019) |
| `US-8 / AC-8.1 – AC-8.8` | Помилки, повтор, межі свіжості 299/300/301 с, Loading | `src/market-data/**`, `ErrorBlock.jsx` | оракул `us-8` (10); `client.test.js`, `useTopCoins.test.jsx`, `triggers.test.jsx` | `✅ Виконано` (класифікація E-NET — TD-018) |
| `US-9 / AC-9.1 – AC-9.3` | Дисклеймер, атрибуція, українська | `src/app/Layout.jsx` | оракул `us-9` (7); `App.test.jsx` | `✅ Виконано` (запит №3) |
| `NFR-1` | Ціни ≤ 300 с, Error ≤ 1 с | `useTopCoins.js`, `lib/index.js` (`isFresh`) | оракул AC-8.4/8.5; модульні тести | `✅ Виконано` (TD-009) |
| `NFR-2` | Оновлення 60 с у видимій вкладці | `TopCoinsPoller.jsx` | `triggers.test.jsx`, `focus.test.jsx` | `✅ Виконано` (текст NFR-2 — TD-015) |
| `NFR-3` | Ліміти CoinGecko | `MarketDataProvider.jsx`, `TopCoinsPoller.jsx`, `client.js` | `triggers.test.jsx` (тригер × стан), `client.test.js`, `navigation.test.jsx` | `✅ Виконано` (Red-Team №5) |
| `NFR-4` | LCP ≤ 2,5 с, CLS ≤ 0,1, TBT ≤ 200 мс | `index.html` (`preload`), `CoinListPage.jsx` | `pnpm vitals` 905,8 / 0 / 6 | `✅ Виконано` (TD-013) |
| `NFR-5` | JS ≤ 150 кБ gzip | — | `pnpm size` 105,08 кБ | `✅ Виконано` |
| `NFR-6` | WCAG 2.2 AA | усі екрани | `pnpm test:a11y` 36 axe | `✅ Виконано` (TD-007, TD-008) |
| `NFR-7` | 320 і 1280 px без прокрутки | `hintOffset.js`, `CoinTable.jsx` | `reflow` (мобільна емуляція), браузер | `✅ Виконано` |
| `NFR-8` | CSP, текст замість HTML | `vite.config.js` | `--check-code .`, браузер (0 порушень CSP) | `✅ Виконано` |
| `NFR-9` | Ланцюг постачання | lockfile, `npm view` | `pnpm audit` 0 high | `✅ Виконано` (TD-001) |
| `NFR-10` | Приватність, 3 ключі localStorage | `favorites/store.js`, `theme-init.js`, `Layout.jsx` | `only-coingecko-origins`, браузер | `✅ Виконано` |
| `NFR-11` | Обрані без строку дії | `favorites/store.js` | `favorites.test.jsx` | `✅ Виконано` |
| `NFR-13`, `NFR-16` | Помилки видно; атрибуція й дисклеймер | `AppErrorBoundary.jsx`, `Layout.jsx` | `App.test.jsx`, оракул US-9, браузер (консоль 0) | `✅ Виконано` |
| `NFR-12`, `NFR-14`, `NFR-15` | Хостинг, браузери, вартість | — | етапи 8–9 | `⏳ Етапи 8–9` |

---

## 6. Ризики, технічний борг і відкриті питання

Борг — реєстр `.agentic/tech-debt.md` (ID без повторення опису). Red-Team прохід №5: P2 = 14 → оцінка D.

| Тип | Опис | Вплив | Що пропонується | Власник рішення |
| :--- | :--- | :--- | :--- | :--- |
| Борг | TD-001, TD-002, TD-003, TD-005, TD-007, TD-008, TD-009, TD-011, TD-012, TD-013, TD-014, TD-015, TD-018, TD-019 (14 P2 Red-Team); TD-020 (WARNING рев'юера: NFR-3 проти P-6 / `preload`) | Середній | Quick wins: TD-018, TD-019, TD-007, TD-008, TD-012 (мертва гілка й коментарі) — наступний спринт або окремий ремонт; документи TD-002, TD-003, TD-014, TD-015 — запит на зміну через `project-kickoff` | Власник продукту |
| Борг | TD-004 (`tnum` виміряно), TD-003 (`msw` / `user-event` не потрібні) — пропозиція закрити | Низький | Закрити на гейті | Власник продукту |
| Питання | TD-020: вкладка, відкрита у фоні — `preload` і перший запит стейблкоїнів ідуть у прихованій вкладці (P-6 допускає, NFR-3 — без винятку) | Низький | Рішення на гейті: виняток для першого завантаження в NFR-3 або без `preload` | Власник продукту |
| Ризик | 429 без заголовків CORS від CDN CoinGecko → `TypeError` → 2 повтори й E-NET (не перевірено) | Середній | Перевірити на 8.a (DevTools) / 8.b (E2E) | Етап 8 |
| Питання | Ручний повтор приєднується до фонового ланцюга: результат може відображати запит, надісланий до кліку (≤ 10 с) | Низький | Записати як прийнятий компроміс | Власник продукту |
| Питання | UX S-1 Partial «повтор при наступному відкритті» неоднозначний | Низький | Уточнити разом із TD-019 | Власник продукту |
| Відхилення | Панель пошуку в стані Loading (відступ від артборда M-List-Loading) | Низький | Рішення власника 00:53; записати в UX наступним Revise етапу 4 | Власник продукту |
| Процес | Red-Team — 6 проходів замість 1: 953 080 токенів проти ~300k у плані (≈ 3,2×); 6 P1 одного класу закривались по одному тригеру; 3 спрацювання Circuit Breaker | Середній | Уроки L-006 (таблиця «тригер → наслідок» до ремонту) і L-007 (`clientWidth`, мобільна емуляція) записано й автоматизовано | Скіл етапу 7 |
| Відхилення | Шрифти: `src/main.jsx` імпортує CSS ваг `@fontsource` з усіма підмножинами (у `dist/` ≈ 50 файлів woff/woff2), а план §4 — «лише cyrillic і latin». Автономне рішення Wave 0 (журнал): файли підмножин без `unicode-range` затирають одна одну, `knip` не бачить `url()` у CSS. Браузер вантажить лише потрібні: 10 файлів, 119 040 Б (cyrillic, latin і symbols для ★ ▲ ▼) — 4.2 | Низький | Підтвердити відхилення на гейті або доручити власний `@font-face` з `unicode-range` (із записом для `knip`) | Власник продукту |
| Файли | `.agentic/design-ref/` — копія приватних макетів для воркерів; `.claude/skills/verify/SKILL.md` — доповнено | Низький | Не комітити; `design-ref` видалити після гейту (репозиторій публічний) | Власник продукту |

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

Коміт Revise №3 етапу 6 виконано (`8720a04`); коміт етапу 7 — файли нижче.

```text
 M index.html
 M vite.config.js
 M scripts/web-vitals.mjs
 M a11y/shell.a11y.spec.js
?? a11y/reflow.a11y.spec.js
?? a11y/support/fake-coingecko.js
 M src/app/App.jsx
 M src/app/App.test.jsx
?? src/app/AppErrorBoundary.jsx
?? src/app/Layout.jsx
?? src/app/NotFoundPage.jsx
 M src/favorites/safari.js
 M src/favorites/store.js
 M src/features/coin-list/CoinListPage.jsx
 M src/features/coin-list/CoinListPage.test.jsx
 M src/features/coin-list/CoinTable.jsx
 M src/features/coin-list/ListStates.jsx
 M src/features/coin-list/LoadedList.jsx
 M src/market-data/MarketDataProvider.jsx
 M src/market-data/client.js
 M src/market-data/client.test.js
 M src/market-data/parse.test.js
 M src/market-data/useStablecoinIds.js
 M src/market-data/useTopCoins.js
 M src/market-data/useTopCoins.test.jsx
?? src/market-data/TopCoinsPoller.jsx
?? src/market-data/focus.test.jsx
?? src/market-data/navigation.test.jsx
?? src/market-data/topCoinsQuery.js
?? src/market-data/triggers.test.jsx
 M src/ui/TermHintButton.jsx
 M src/ui/ui.test.jsx
?? src/ui/hintOffset.js
?? .agentic/evidence/debt-checks.md
?? .agentic/evidence/red-team-report.md
?? .agentic/evidence/walkthrough.md
?? .agentic/reports/07-implementation-report.md
 M .agentic/tech-debt.md
 M .agentic/autonomy-journal.md
 M .agentic/pipeline-state.md
 M .claude/rules/project-lessons.md
?? .agentic/evidence/screens/s1-list-light-360.jpg
?? .agentic/evidence/screens/s2-coin-dark-360.jpg
```

Не індексуються: `.agentic/design-ref/` (приватні макети; додано в `.git/info/exclude`), `.claude/skills/verify/SKILL.md` (без окремого запиту власника), файли етапів 1–4 з позначкою `M` і порожнім `git diff`.

### 7.2. Явна індексація та коміт (Conventional Commits)

```bash
git add index.html vite.config.js scripts/web-vitals.mjs a11y/shell.a11y.spec.js a11y/reflow.a11y.spec.js a11y/support/fake-coingecko.js src/app/App.jsx src/app/App.test.jsx src/app/AppErrorBoundary.jsx src/app/Layout.jsx src/app/NotFoundPage.jsx src/favorites/safari.js src/favorites/store.js src/features/coin-list/CoinListPage.jsx src/features/coin-list/CoinListPage.test.jsx src/features/coin-list/CoinTable.jsx src/features/coin-list/ListStates.jsx src/features/coin-list/LoadedList.jsx src/market-data/MarketDataProvider.jsx src/market-data/client.js src/market-data/client.test.js src/market-data/parse.test.js src/market-data/useStablecoinIds.js src/market-data/useTopCoins.js src/market-data/useTopCoins.test.jsx src/market-data/TopCoinsPoller.jsx src/market-data/focus.test.jsx src/market-data/navigation.test.jsx src/market-data/topCoinsQuery.js src/market-data/triggers.test.jsx src/ui/TermHintButton.jsx src/ui/ui.test.jsx src/ui/hintOffset.js .agentic/evidence/debt-checks.md .agentic/evidence/red-team-report.md .agentic/evidence/walkthrough.md .agentic/reports/07-implementation-report.md .agentic/tech-debt.md .agentic/autonomy-journal.md .agentic/pipeline-state.md .claude/rules/project-lessons.md .agentic/evidence/screens/s1-list-light-360.jpg .agentic/evidence/screens/s2-coin-dark-360.jpg
git commit -m "feat(stage-7): implement sprint 1 mvp screens and data layer"
```

---

### 🛑 Рішення власника продукту (Human Approval Gate)

- [x] **Approve & закоміть** — статус `APPROVED_AND_COMMITTED`: агент оновлює `.agentic/pipeline-state.md`, позначає цей чекбокс, виконує явний `git add` і `git commit`.
- [ ] **Approve без коміту** — статус `APPROVED_MANUAL_COMMIT`: власник комітить самостійно.
- [ ] **Revise** — статус `REJECTED_REVISING`: зауваження нижче, етап повертається на Фазу 3.

**Коментарі / Зауваження:**
> Передумова виконана: етап 6 (Revise №3) — `8720a04` (03:23). На гейті етапу 7:
> 1. Закриття TD-003 і TD-004.
> 2. TD-020: вкладка у фоні (NFR-3 проти P-6 / `preload`).
> 3. Відхилення шрифтів від плану §4 (секція 6).
> 4. Компроміс ручного повтору (приєднання до фонового ланцюга).
> 5. Приховані сценарії власника не задано — писати до коміту етапу 7 чи ні.
> 6. `.agentic/design-ref/` (у `.git/info/exclude`) — видалити після гейту; `.claude/skills/verify/SKILL.md` — комітити чи ні.
