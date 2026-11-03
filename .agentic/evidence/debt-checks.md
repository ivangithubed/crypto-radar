# Виміряний борг етапу 7 (debt_commands)

- **Дата:** 2026-11-03 01:00, спринт 1, після Wave 4 і ремонтів Sync 4.
- **Команда:** `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --debt` — **код 0** (8 команд, 7 аспектів).
- Валідатор не друкує вивід команд, тому лічильники нижче зняті окремим запуском кожної команди на тому самому дереві.

## Вивід валідатора

```text
=== Виміряний технічний борг (debt_commands) ===
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

## Лічильники за аспектами

| Аспект | Команда | Код | Результат | Поріг |
| :--- | :--- | :--- | :--- | :--- |
| complexity | `pnpm lint` | 0 | 0 помилок і попереджень (`--deny-warnings`, `complexity` ≤ 15) | 0 |
| complexity | `pnpm dup` | 0 | 2 клони, 16 рядків (0,35 %), 138 токенів (0,44 %) у 64 файлах `src` | ≤ 3 % |
| dead_code | `pnpm deadcode` | 0 | 0 знахідок (лише підказка конфігурації про `.css`) | 0 |
| boundaries | `pnpm boundaries` | 0 | 0 порушень, 84 модулі, 200 залежностей | 0 |
| vulnerabilities | `pnpm audit --audit-level high` | 0 | 0 high/critical; 2 moderate (TD-001, лише dev-ланцюг `lighthouse`) | 0 high/critical |
| sbom | `pnpm sbom:write` | 0 | `sbom/crypto-radar.cdx.json`, CycloneDX 1.7, 289 компонентів (у Git не потрапляє) | файл створено |
| accessibility | `pnpm test:a11y` | 0 | 36 passed: 9 екранів і станів × 2 теми × 2 ширини (375, 1280 px), 0 порушень critical/serious | 0 critical/serious |
| web_vitals | `pnpm vitals` | 0 | медіани з 3 прогонів: LCP 907,6 мс (907,6 / 903,0 / 907,7), CLS 0,000, TBT 8,0 мс | LCP ≤ 2500 мс, CLS ≤ 0,1, TBT ≤ 200 мс |

## Як міряли a11y і Web Vitals (TD-002)

- CoinGecko підмінено записаною відповіддю `src/test/fixtures/markets-top50.json` і `stablecoins.json` (`a11y/support/fake-coingecko.js`): `page.route` для axe; для Lighthouse Playwright під'єднується до того самого Chrome (`connectOverCDP`) і ставить маршрути на типовий контекст. У бандл продукту нічого не додано.
- Обмеження підміни: Chrome не розпаковує тіло з `route.fulfill`, тож фікстура йде без gzip (≈ 200 КБ проти ≈ 82 КБ у CoinGecko) — вимір песимістичніший за реальність.
- Контрольний прогін Lighthouse проти справжнього CoinGecko (одноразова копія скрипта без підміни, ≈ 6 GET-запитів): до ремонту Sync 4 — LCP 2853 мс (FAIL), після — 906,2 мс; CLS 0,000; TBT 7,0 мс.

## Історія Sync 4 (NFR-4)

| Крок | LCP (медіана) | Елемент LCP | Що змінилося |
| :--- | :--- | :--- | :--- |
| Перший вимір з фікстурою | 4909 мс | плейсхолдер поля пошуку | — |
| `preload` запиту топ-50 у `index.html` | 4606 мс | те саме | запит стартує на 15-й мс, разом 1 запит топ-50 (NFR-3) |
| Справжній CoinGecko (gzip) | 2853 мс | те саме | контроль: порушення реальне, не лише через фікстуру |
| Рішення власника (трекер, 00:53): панель пошуку й сортування в стані Loading + стейблкоїни після топ-50 | 907,6 мс (фікстура), 906,2 мс (CoinGecko) | плейсхолдер поля пошуку з першого кадру | поле рендериться до даних; 41 КБ стейблкоїнів не конкурують за канал |

Обмеження метрики: тепер LCP — поле пошуку з першого кадру, тож LCP більше не відображає момент появи цін. Час до цін на повільному 4G — ≈ 2,9 с за контрольним прогоном до ремонту; NFR-4 його окремо не нормує (секція 6 звіту етапу 7).

## Повтор після ремонту знахідок Red-Team P1 (2026-11-03 01:28)

Ремонт RT-1 (NFR-3: запити при переходах у стані помилки) і RT-2 (NFR-7: відкрита підказка — горизонтальна прокрутка на 320 px і обрізання в таблиці на 1280 px). До набору a11y додано `a11y/reflow.a11y.spec.js`: кожна підказка S-1 і S-2 відкривається по черзі на 320 і 1280 px, вимір `scrollWidth − clientWidth = 0`, панель у межах вікна, 4 кути панелі видимі (не обрізані предком). До ремонту (браузер, 01:21): на 320 px прокрутка 59 / 146 / 118 / 257 px («Місце в рейтингу», «Тікер», «Зміна за 7 днів», «Капіталізація»); на 1280 px обрізання 38 і 211 px.

| Команда | Код | Результат |
| :--- | :--- | :--- |
| `python verify-gate.py --debt` | 0 | `УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)` |
| `pnpm install --frozen-lockfile && pnpm verify` | 0 | 13 файлів, 184 passed (Start at 01:26:09); JS 104,94 кБ gzip |
| оракул `pnpm exec vitest run --config acceptance/vitest.config.js` | 0 | 9 файлів, 91 passed (Start at 01:26:15) |
| `verify-gate.py --check-code .` | 0 | 0 порушень |
| `pnpm dup` | 0 | 3 клони, 22 рядки (0,46 %), 200 токенів (0,61 %), 67 файлів |
| `pnpm deadcode` | 0 | 0 знахідок |
| `pnpm boundaries` | 0 | 0 порушень, 88 модулів, 212 залежностей |
| `pnpm audit --audit-level high` | 0 | 0 high/critical; 2 moderate (TD-001) |
| `pnpm test:a11y` | 0 | 40 passed: 36 axe + 4 виміри підказок (320 / 1280 px × S-1 / S-2) |
| `pnpm vitals` | 0 | LCP 906,7 мс (906,7 / 902,6 / 906,9), CLS 0,000, TBT 7,0 мс |

## Повтор після ремонту RT-3 (2026-11-03 01:41)

RT-3 (Red-Team прохід №2, клас NFR-3): повернення у вкладку оновлює дані лише через ≥ 60 с від останньої спроби (`src/market-data/topCoinsQuery.js` `isAttemptDue`, `TopCoinsPoller.jsx`; тести `src/market-data/focus.test.jsx`). **Виправлення 2026-11-03 01:47:** у первинному тексті стояло «й відновлення мережі» — це неправда: тесту на подію `online` немає, а сторінкові спостерігачі мають типове `refetchOnReconnect: true` (Red-Team прохід №3, RT-4).

| Команда | Код | Результат |
| :--- | :--- | :--- |
| `python verify-gate.py --debt` | 0 | `УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)` |
| `pnpm install --frozen-lockfile && pnpm verify` | 0 | 14 файлів, 189 passed (Start at 01:38:31); JS 104,95 кБ gzip |
| оракул | 0 | 9 файлів, 91 passed (Start at 01:38:37) |
| `verify-gate.py --check-code .` | 0 | 0 порушень |
| `pnpm dup` | 0 | 4 клони, 29 рядків (0,59 %), 252 токени (0,74 %), 69 файлів |
| `pnpm deadcode` | 0 | 0 знахідок |
| `pnpm boundaries` | 0 | 0 порушень, 89 модулів, 216 залежностей |
| `pnpm audit --audit-level high` | 0 | 0 high/critical; 2 moderate (TD-001) |
| `pnpm test:a11y` | 0 | 40 passed |
| `pnpm vitals` | 0 | LCP 906,3 мс (907,2 / 902,6 / 906,3), CLS 0,000, TBT 8,5 мс |

## Повтор після ремонту RT-4 (2026-11-03 02:02)

RT-4 (Red-Team прохід №3, клас NFR-3; рішення власника — центральний вимикач): `src/market-data/MarketDataProvider.jsx` — у `defaultOptions.queries` вимкнено `refetchOnMount`, `refetchOnWindowFocus`, `refetchOnReconnect`, `retryOnMount`, `retry`; лише `TopCoinsPoller` оновлює дані: інтервал 60 с (не в прихованій вкладці), фокус і reconnect — за `shouldAutoRefresh` (вкладка видима і ≥ 60 с від останньої спроби). Таблиця тестів «тригер → кількість запитів» — `src/market-data/triggers.test.jsx` (32 рядки: 8 тригерів × 4 стани + окремі сценарії, зокрема `onlineManager` і `StrictMode`).

| Команда | Код | Результат |
| :--- | :--- | :--- |
| `python verify-gate.py --debt` | 0 | `УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)` |
| `pnpm install --frozen-lockfile && pnpm verify` | 0 | 15 файлів, 226 passed (Start at 02:00:37); JS 105,01 кБ gzip |
| оракул | 0 | 9 файлів, 91 passed (Start at 02:00:43) |
| `verify-gate.py --check-code .` | 0 | 0 порушень |
| `pnpm dup` | 0 | 5 клонів, 36 рядків (0,70 %), 330 токенів (0,93 %), 70 файлів |
| `pnpm deadcode` | 0 | 0 знахідок |
| `pnpm boundaries` | 0 | 0 порушень, 90 модулів, 224 залежності |
| `pnpm audit --audit-level high` | 0 | 0 high/critical; 2 moderate (TD-001) |
| `pnpm test:a11y` | 0 | 40 passed |
| `pnpm vitals` | 0 | LCP 907,1 мс (908,5 / 902,4 / 907,1), CLS 0,000, TBT 7,5 мс |

## Повтор після пакетного ремонту (2026-11-03 02:40)

Пакетний ремонт за рішенням власника (02:36): `networkMode: 'always'` (RT-5, TD-010), стейблкоїни без сигналу скасування (RT-6), ручний повтор приєднується до поточного ланцюга (TD-017), утримання Error під час фонової спроби без даних (TD-016); 9 нових тестів у `src/market-data/triggers.test.jsx` (кожен падав без виправлення — звіт воркера).

| Команда | Код | Результат |
| :--- | :--- | :--- |
| `python verify-gate.py --debt` | 0 | `УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)` |
| `pnpm install --frozen-lockfile && pnpm verify` | 0 | 15 файлів, 235 passed (Start at 02:38:38); JS 105,06 кБ gzip |
| оракул | 0 | 9 файлів, 91 passed (Start at 02:38:44) |
| `verify-gate.py --check-code .` | 0 | 0 порушень |
| `pnpm dup` | 0 | 6 клонів, 46 рядків (0,86 %), 382 токени (1,03 %), 70 файлів |
| `pnpm deadcode` | 0 | 0 знахідок |
| `pnpm boundaries` | 0 | 0 порушень, 90 модулів, 224 залежності |
| `pnpm audit --audit-level high` | 0 | 0 high/critical; 2 moderate (TD-001) |
| `pnpm test:a11y` | 0 | 40 passed |
| `pnpm vitals` | 0 | LCP 906,5 мс (906,5 / 902,2 / 906,8), CLS 0,000, TBT 6,0 мс |

## Повтор після ремонту підказок від `clientWidth` (2026-11-03 02:57)

Перевірка в браузері (02:51, мобільна емуляція 320 px) знайшла, що RT-2 закрито не повністю: панель рахувала межу від `window.innerWidth`, який на телефоні росте разом із переповненням — прокрутка 11–210 px з відкритою підказкою на S-1 і S-2. Тест `a11y/reflow.a11y.spec.js` переведено на мобільну емуляцію для 320 px і межу `clientWidth` — до ремонту 2 з 4 червоні. Рішення власника (02:53): межа від `clientWidth` (`src/ui/hintOffset.js` `getPageWidth`, `computeHintMaxWidth`; `TermHintButton.jsx`).

| Команда | Код | Результат |
| :--- | :--- | :--- |
| `python verify-gate.py --debt` | 0 | `УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)` |
| `pnpm install --frozen-lockfile && pnpm verify` | 0 | 15 файлів, 236 passed (Start at 02:54:18); JS 105,08 кБ gzip |
| оракул | 0 | 9 файлів, 91 passed (Start at 02:54:24) |
| `verify-gate.py --check-code .` | 0 | 0 порушень |
| `pnpm dup` | 0 | 6 клонів, 46 рядків (0,85 %), 70 файлів |
| `pnpm deadcode` | 0 | 0 знахідок |
| `pnpm boundaries` | 0 | 0 порушень, 90 модулів, 224 залежності |
| `pnpm audit --audit-level high` | 0 | 0 high/critical; 2 moderate (TD-001) |
| `pnpm test:a11y` | 0 | 40 passed (36 axe + 4 `reflow`, 320 px — мобільна емуляція) |
| `pnpm vitals` | 0 | LCP 905,8 мс (905,9 / 902,1 / 905,8), CLS 0,000, TBT 6,0 мс |
| браузер (preview, 320 px, мобільна емуляція, справжній CoinGecko) | — | 5 маршрутів, кожна підказка відкрита по черзі: прокрутка 0; консоль порожня; `securitypolicyviolation` 0 |

## Revise №4 етапу 7 (ремонт BUG-001, 002, 004–008 з етапу 8.a)

Записано 2026-11-03 05:45 за виводом останніх прогонів.

| Команда | Код | Результат |
| :--- | :--- | :--- |
| `python verify-gate.py --debt` (05:35:05 – 05:35:53) | 0 | 7 аспектів PASS, `УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)` |
| `pnpm verify` (05:34:45) | 0 | 16 файлів, 252 passed; JS 105,66 кБ gzip (NFR-5 ≤ 150) |
| оракул `pnpm exec vitest run --config acceptance/vitest.config.js` | 0 | 9 файлів, 91 passed |
| `pnpm lint` (05:43:24) | 0 | 0 попереджень |
| `pnpm dup` (05:43:25) | 0 | 8 клонів, 65 рядків (1,13 %), 72 файли; поріг ≤ 3 % |
| `pnpm deadcode` (05:43:25) | 0 | 0 знахідок |
| `pnpm boundaries` (05:43:27) | 0 | 0 порушень, 92 модулі, 233 залежності |
| `pnpm audit --audit-level high` (05:43:28) | 0 | 0 high/critical; 2 moderate (TD-001) |
| `pnpm sbom:write` (05:43:29) | 0 | `sbom/crypto-radar.cdx.json` |
| `pnpm test:a11y` (05:43:30) | 0 | 40 passed (18.7s) |
| `pnpm vitals` (05:43:49) | 0 | LCP 905,3 мс (906,5 / 902,7 / 905,3), CLS 0,000, TBT 7,5 мс (7,5 / 5,5 / 8,5) |

Фактичний вивід (рядки лічильників):

```text
$ date: 2026-11-03 05:43:24
$ pnpm lint
$ oxlint --deny-warnings
EXIT=0
$ date: 2026-11-03 05:43:25
$ pnpm dup
│ Format     │ Files analyzed │ Total lines │ Total tokens │ Clones found │ Duplicated lines │ Duplicated tokens │
│ css        │ 1              │ 62          │ 869          │ 0            │ 0 (0.00%)        │ 0 (0.00%)         │
│ javascript │ 23             │ 1677        │ 10127        │ 3            │ 25 (1.49%)       │ 215 (2.12%)       │
│ jsx        │ 48             │ 4014        │ 29482        │ 5            │ 40 (1.00%)       │ 328 (1.11%)       │
│ Total:     │ 72             │ 5753        │ 40478        │ 8            │ 65 (1.13%)       │ 543 (1.34%)       │
Found 8 clones.
EXIT=0
$ date: 2026-11-03 05:43:25
$ pnpm deadcode
EXIT=0
$ date: 2026-11-03 05:43:27
$ pnpm boundaries
✔ no dependency violations found (92 modules, 233 dependencies cruised)
EXIT=0
$ date: 2026-11-03 05:43:28
$ pnpm audit --audit-level high
2 vulnerabilities found
Severity: 2 moderate
EXIT=0
$ date: 2026-11-03 05:43:29
$ pnpm sbom:write
$ pnpm sbom --sbom-format cyclonedx --sbom-type application --out sbom/crypto-radar.cdx.json
sbom/crypto-radar.cdx.json
EXIT=0
$ date: 2026-11-03 05:43:30
$ pnpm test:a11y
  ok 36 [chromium] › a11y\shell.a11y.spec.js:43:7 › сторінка монети: 0 critical/serious (dark, ПК) (439ms)
  ok 37 [chromium] › a11y\shell.a11y.spec.js:43:7 › поза топ-50: 0 critical/serious (dark, ПК) (403ms)
  ok 38 [chromium] › a11y\shell.a11y.spec.js:43:7 › обрані порожні: 0 critical/serious (dark, ПК) (397ms)
  ok 39 [chromium] › a11y\shell.a11y.spec.js:43:7 › обрані заповнені: 0 critical/serious (dark, ПК) (429ms)
  ok 40 [chromium] › a11y\shell.a11y.spec.js:43:7 › сторінку не знайдено: 0 critical/serious (dark, ПК) (391ms)
  40 passed (18.7s)
EXIT=0
$ date: 2026-11-03 05:43:49
$ pnpm vitals
✓ 205 modules transformed.
OK   LCP: медіана 905.346 мс (поріг ≤ 2500 мс; прогони: 906.508, 902.664, 905.346)
OK   CLS: медіана 0.000  (поріг ≤ 0.1 ; прогони: 0.000, 0.000, 0.000)
OK   TBT: медіана 7.500 мс (поріг ≤ 200 мс; прогони: 7.500, 5.500, 8.500)
EXIT=0
```
