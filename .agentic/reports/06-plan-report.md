# Фінальний звіт етапу: Stage 6: План реалізації: хвилі DAG і матриця перевірок

- **Етап:** `Stage 6: План реалізації: хвилі DAG і матриця перевірок`
- **Відповідальний скіл:** `implementation-planner`
- **Дата формування:** `2026-11-02 23:25`
- **Статус аудиту independent-reviewer:** `PASS`

---

## 1. Перевірені передумови (Pre-Flight Summary)

Передумови: етап 4 `APPROVED_AND_COMMITTED` (`4eb4f13`), етап 5 `APPROVED_AND_COMMITTED` (`3c7cc09`); `verify-gate.py --next` — код 0. Базовий стан каркаса: `pnpm install --frozen-lockfile && pnpm verify` — код 0 (розділ 4.1). Планувальник нічого не встановлював: чотири нові пакети внесено в Wave 0 плану як окремий крок, власник дав на нього згоду (трекер, розділ 4, 2026-11-02 23:10).

| Інструмент / SDK / Акаунт | Необхідна версія | Фактичний стан на старті | Запропонована команда | Згода отримана | Результат |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Node.js | 24 LTS (ADR 0001) | `v24.21.0` | Ні, вже було | Не потрібно | `✅ Готово` |
| pnpm | 11 | `11.23.0` | Ні, вже було | Не потрібно | `✅ Готово` |
| Vitest + Testing Library + jsdom (оракул) | з етапу 5 | vitest 5.0.5, @testing-library/react 16.3.3, jsdom 30.1.3 | Ні, вже було | Не потрібно | `✅ Готово` |
| `react-router`, `@tanstack/react-query`, `@fontsource/unbounded`, `@fontsource/onest` | для етапу 7 (ADR 0001, UX §9.2) | не встановлені | `pnpm add …` на Wave 0 етапу 7, після `npm view` | Так, 2026-11-02 23:10 | `⏳ Етап 7, Wave 0` |
| `msw`, `@testing-library/user-event` (ADR 0001, TD-003) | — | не встановлені | не потрібні (план, розділ 12.1) | Не потрібно | `ℹ️ Не застосовно` |
| Python (валідатор) | `>= 3.10` | `3.14.7` | Ні, вже було | Не потрібно | `✅ Готово` |

---

## 2. Застосовані Best Practices vs найпростіший підхід

Власник 2026-11-02 погодив каркас плану й чотири рішення (трекер, розділ 4, 23:10): обсяг спринту, хвилі DAG, залежності, гілка `main`.

| Аспект / Рішення | Найпростіший підхід | Галузева Best Practice | Що обрано та чому |
| :--- | :--- | :--- | :--- |
| Виконання етапу 7 | Один послідовний виконавець | Wave 0 зі спільними контрактами + паралельні хвилі з неперетинними зонами | **Best Practice (рішення власника):** 5 хвиль за шарами `.dependency-cruiser.cjs`, 9 воркерів; зони не перетинаються, бо межі модулів уже перевіряє `pnpm boundaries`. Ціна — ~1,6 млн токенів проти ~1 млн у послідовному варіанті |
| Обсяг спринту 1 | Найменший наскрізний зріз (US-1, US-8, US-9) | Перший спринт — найменший інкремент MVP (розділ 14 контракту) | **Рішення власника:** усі Must US-1 – US-9 одним спринтом, бо строк G-2 (2026-11-09) не вміщує другого повного циклу етапів 6–9; US-10 — спринт 2 |
| Приймальні критерії | Ручна перевірка після коду | Оракул до коду (test-first), захищений від змін | **Best Practice:** 91 тест за 55 Gherkin-сценаріями в `acceptance/**`; червоні зараз саме через відсутню поведінку (розділ 4.2) |
| Мережа в тестах | Справжній CoinGecko або `msw` | Підміна на межі `fetch` без нових залежностей | **Best Practice:** `vi.stubGlobal("fetch", …)` з фікстурою 50 + 1 монет і режимами 200 / 429 / 503 / «немає відповіді»; `msw` не потрібен (TD-003) |
| Годинник у тестах свіжості | `vi.useFakeTimers()` повністю | Заморожений лише `Date`, справжні таймери | **Best Practice:** межі 299 / 300 / 301 с детерміновані, а повтори 2 с / 4 с і перевірка щосекунди працюють як у браузері |
| Контракти модулів | Кожен воркер придумує інтерфейс | Публічні `index.js` із JSDoc-сигнатурами до хвиль | **Best Practice:** таблиця експорту в розділі 5 плану; воркери не змінюють сигнатур |
| Дубль даних картки й таблиці | Обидва макети в DOM, CSS-приховування | Один макет у DOM | **Best Practice (P-3):** `useMediaQuery('(min-width: 768px)')`; зчитувач і тести бачать одну копію |
| Повтори запитів | Повтори TanStack Query за замовчуванням | Одна політика, що відповідає NFR-3 | **Best Practice (P-4):** `retry: false` у Query, власна політика 429 → 0, 5xx / мережа → 2 |
| Відкат | `git reset` «на око» | Контрольна точка перед кожною хвилею, конкретна команда | **Best Practice:** коміт-точка лише за згодою власника; команда відкату з переліком каталогів (план, розділ 13) |

---

## 3. Виконаний обсяг робіт (Deliverables)

**План:**
- [`.agentic/specs/implementation_plan.md`](../specs/implementation_plan.md) — план спринту 1: мета й обсяг, 15 розділів SDD (1–11 посиланнями), рішення P-1 – P-9, матриця AC → перевірки, Done When, Safety & Rollback, хвилі DAG з File Ownership і бюджетами.

**Оракул (приймальні тести, `oracle.paths: acceptance/**`):**
- [`acceptance/vitest.config.js`](../../acceptance/vitest.config.js) — окремий конфіг Vitest для оракула (jsdom, таймаут 15 с).
- [`acceptance/support/setup.js`](../../acceptance/support/setup.js) — `matchMedia` телефона, очищення localStorage і хеша.
- [`acceptance/support/fake-coingecko.js`](../../acceptance/support/fake-coingecko.js) — фальшиве джерело: 50 + 1 монет, стейблкоїни, режими відповіді, заморожений годинник.
- [`acceptance/support/app.jsx`](../../acceptance/support/app.jsx) — рендер `<App/>` за маршрутом і спільні кроки сценаріїв.
- [`acceptance/us-1.acceptance.test.jsx`](../../acceptance/us-1.acceptance.test.jsx) … [`acceptance/us-9.acceptance.test.jsx`](../../acceptance/us-9.acceptance.test.jsx) — 9 файлів, по одному на історію; назва кожного тесту починається з `AC-N.M`.

**Стан конвеєра:**
- [`.agentic/project.json`](../project.json) — змінено лише `oracle` (`paths`, `command`).
- [`.agentic/backlog.md`](../backlog.md) — US-1 – US-9 → `Sprint`, спринт 1; мета спринту 1 у розділі 3.
- [`.agentic/pipeline-state.md`](../pipeline-state.md) — статус етапу 6, рішення власника.
- `.agentic/reports/06-plan-report.md` — цей звіт.

**Не створено (межі етапу):** код продукту (`src/**`), залежності, конфіги; `.agentic/holdouts/` (пише власник); `e2e/` (етап 8.b).

---

## 4. Докази працездатності (Verification Evidence)

### 4.0. Валюта довіри (Trust Receipt)

| Перевірка | Команда | Код виходу | Лічильники | Повторив рев'юер | Примітка |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Валідатор етапу | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 6` | 0 | 10 PASS, 0 FAIL, 1 WARN (приховані сценарії власника не задані) | так | запущено після вердикту PASS (L-004); рев'юер запускав до вердикту — лише 2 очікувані помилки |
| Сканер секретів | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --scan-secrets .` | 0 | 66 файлів, 0 секретів | так | |
| Правила якості | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --check-code .` | 0 | 3 правила, 6 файлів, 0 порушень | так | |
| Базовий стан каркаса | `pnpm install --frozen-lockfile && pnpm verify` | 0 | lint 0, формат 34 файли, тести 1 passed / 0 failed, JS 68,23 кБ gzip | так | файли `acceptance/**` проходять `oxlint --deny-warnings` і `oxfmt --check` |
| Оракул червоний до коду | `pnpm exec vitest run --config acceptance/vitest.config.js --reporter=json --outputFile=test-results/oracle-baseline.json; python -I -c "import json; d=json.load(open('test-results/oracle-baseline.json',encoding='utf-8')); print(d['numFailedTests'],'of',d['numTotalTests'],'failed'); raise SystemExit(0 if d['numTotalTests']==91 and d['numFailedTests']==91 else 1)"` | 0 | 91 of 91 failed (9 файлів) | ні | лічильник замість заперечної перевірки (L-001): код 0 = усі 91 тест червоні; причина всіх 91 — відсутні елементи інтерфейсу (розділ 4.2) |
| Межі модулів | `pnpm boundaries` | 0 | 0 порушень, 8 модулів | ні | |
| Мертвий код | `pnpm deadcode` | 0 | 0 знахідок | ні | `acceptance/**` поза `knip.json → project` |
| Вердикт рев'юера | субагент `independent-reviewer` | 0 | рев'ю №1: BLOCKERS FOUND (3 blocker, 5 warning — виправлено); рев'ю №2: PASS, 0 blocker, 1 warning (закрито в плані §5) | так | |

### 4.1. Збірка, лінтери та автоматичні тести

`pnpm install --frozen-lockfile && pnpm verify` (останній запуск, ANSI-кольори прибрано):

```text
Already up to date
Done in 264ms using pnpm v11.23.0
$ pnpm lint && pnpm fmt:check && pnpm test && pnpm build && pnpm size
$ oxlint --deny-warnings
$ oxfmt --check
Checking formatting...
All matched files use the correct format.
Finished in 187ms on 34 files using 24 threads.
$ vitest run
 RUN  v5.0.5 D:/crypto-radar
 Test Files  1 passed (1)
      Tests  1 passed (1)
$ vite build
vite v8.3.5 building client environment for production...
✓ 16 modules transformed.
dist/index.html                   0.98 kB │ gzip:  0.55 kB
dist/assets/index-BZrT4PnB.css   11.25 kB │ gzip:  3.02 kB
dist/assets/index-Dj7_-nxJ.js   220.28 kB │ gzip: 68.97 kB
✓ built in 100ms
$ node scripts/check-bundle-size.mjs
    68.23 kB gzip  dist\assets\index-Dj7_-nxJ.js
NFR-5: JS головного екрана 68.23 kB gzip (ліміт 150 kB)
EXIT=0
```

### 4.2. Валідація артефактів, контракту, інфраструктури

**Оракул — базовий прогін** (`pnpm exec vitest run --config acceptance/vitest.config.js --reporter=json`, згруповано за першим рядком повідомлення):

```text
91 failed / 91
60 | Unable to find role="link" and name "Bitcoin"                     (стан Data списку ще не існує)
11 | Unable to find role="heading" and name "Обрані"                   (екрана S-3 немає)
 8 | Unable to find role="alert"                                       (стану Error немає)
 4 | Unable to find role="heading" and name "Bitcoin"                  (сторінки монети немає)
 2 | Unable to find role="heading" and name "Монета зараз поза топ-50"
 2 | Unable to find role="heading" and name "Топ-50 монет"
 1 | Unable to find role="heading" and name "Монета-50"
 1 | Unable to find role="heading" and name "Ethereum"
 1 | Unable to find role="heading" and name "Tether"
 1 | Unable to find an element with the text: Завантажуємо ціни…
EXIT=1
```

Жоден тест не падає через `TypeError`, `ReferenceError`, синтаксис чи імпорт: усі 91 падають на пошуку елемента, якого каркас ще не рендерить.

**Лінт і формат оракула:** `pnpm exec oxlint --deny-warnings acceptance` → код 0; `pnpm exec oxfmt --check acceptance` → «All matched files use the correct format», 13 файлів.

**Валідатор етапу** `verify-gate.py --stage 6` (після вердикту PASS):

```text
✅ [PASS] Передумови схвалено: 4, 5
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 8 перевірок із кодами виходу
✅ [PASS] Карта технологій заповнена (5 рядків)
✅ [PASS] Conventional Commit у секції 7 валідний
✅ [PASS] Артефакт .agentic/specs/implementation_plan.md знайдено
✅ [PASS] Артефакт .agentic/project.json знайдено
✅ [PASS] Оракул: 13 файлів приймальних тестів за acceptance/**
⚠️  [WARN] Holdouts не задано (.agentic/holdouts/ порожній): рекомендовано кілька прихованих сценаріїв
✅ [PASS] Перевірено файлів: 6, порушень-помилок немає
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0) (попереджень: 1)
EXIT=0
```

### 4.3. Вердикт незалежного аудиту (`independent-reviewer`)

```text
Рев'ю №1 (2026-11-02 23:35): BLOCKERS FOUND.
  BLOCKER: AC-2.2 (зростання, падіння) і AC-7.3 неможливо пройти — монети поза першими 25 → тести натискають «Показати більше».
  BLOCKER: заглушки Wave 0 і src/lib/types.js — «сироти» для no-orphans → заглушки з'єднано в граф, typedef-и в src/lib/index.js, без заглушки theme.
  WARNING: невидимі правила оракула (Esc на document, закрита підказка поза DOM, прихований текст напряму) → дописано в план §5;
           GitHub-посилання vs only-coingecko-origins → питання на гейт; --ci не запускає оракул → виправлено формулювання, пропозиція на гейт;
           rg -c у Done When (L-001) → --check-code; лічильник сканера 65 → 66.
  INFO: коментар us-3, мета спринту вирівняна з беклогом.
Рев'ю №2 (2026-11-02 23:40): PASS — independent-reviewer, Stage 6.
Межі етапу: 18 файлів етапу в зоні (план, 14 файлів acceptance/**, oracle у project.json, Sprint і мета спринту в беклозі, звіт, трекер); 10 файлів етапів 1–4 з позначкою M мають порожній diff; .claude/skills/verify/SKILL.md поза комітом. Секрети: --scan-secrets . — код 0, 66 файлів, 0 знахідок.
Залежності: не застосовно — package.json і pnpm-lock.yaml не змінено; 4 пакети заплановано на Wave 0 етапу 7 за згодою власника (трекер, 2026-11-02 23:10).
Правила якості: --check-code . — код 0, 6 файлів, 0 порушень. Контракт: не застосовно — has_http_api: false (ADR 0001, UX §8).
Повторний запуск `pnpm verify`: код 0 — lint 0, формат 34 файли, 1 passed / 1, JS 68,23 кБ gzip; збігається з 4.1. --stage 6: код 1, лише 2 очікувані помилки (статус аудиту, повтор рев'юера).
Не перевірено повторно (хук read-only): оракул, `pnpm boundaries`, `pnpm deadcode`; статично звірено 91 тест, 55/55 AC і групування причин у 4.2.
Трасування: 55/55 Must-AC US-1 – US-9 мають тест AC-N.M; виправлені AC-2.2 і AC-7.3 досяжні для правильної реалізації. Виправлення рев'ю №1 (3 BLOCKER, 5 WARNING) підтверджено.
WARNING: спосіб імпортів заглушок Wave 0 (no-unused-vars) і MarketDataProvider → children — закрито в плані §5 після рев'ю (імпорт без прив'язок, заглушка провайдера повертає children, App рендерить заглушки в наявному каркасі).
```

---

## 5. Матриця трасування вимог (Requirements Traceability)

Етап 6 не реалізує історій: «де реалізовано» — модуль і хвиля плану; «чим перевірено» — тест оракула. Повна матриця — план, розділ 12.3.

| ID вимоги | Вимога | Де реалізовано | Чим перевірено | Статус |
| :--- | :--- | :--- | :--- | :--- |
| `US-1 / AC-1.1 – AC-1.5` | Топ-50: дані монети, 25 + 25, лише місця 1–50, знак зміни | `features/coin-list`, `lib`, `market-data` (Wave 1–3) | `acceptance/us-1.acceptance.test.jsx`: 17 тестів | `⏳ Оракул червоний` |
| `US-2 / AC-2.1 – AC-2.8` | Сортування по всіх 50, тай-брейк, разом із пошуком, недоступне в Error | `features/coin-list`, `lib` | `acceptance/us-2.acceptance.test.jsx`: 10 тестів | `⏳ Оракул червоний` |
| `US-3 / AC-3.1 – AC-3.9` | Пошук за назвою / тікером, межі 0 / 1 / 50 / 51, пробіли, кирилиця | `features/coin-list`, `lib` | `acceptance/us-3.acceptance.test.jsx`: 15 тестів | `⏳ Оракул червоний` |
| `US-4 / AC-4.1 – AC-4.4` | Сторінка монети, графік 7 днів, межа 50 / 51 | `features/coin-page`, `chart` | `acceptance/us-4.acceptance.test.jsx`: 5 тестів | `⏳ Оракул червоний` |
| `US-5 / AC-5.1 – AC-5.7` | ★ додати / прибрати, без дублів, лише топ-50, 0–50 | `favorites`, `features/*` | `acceptance/us-5.acceptance.test.jsx`: 9 тестів | `⏳ Оракул червоний` |
| `US-6 / AC-6.1 – AC-6.7` | Обрані між візитами, Empty, вибулі внизу, порядок за місцем | `features/favorites-view`, `favorites` | `acceptance/us-6.acceptance.test.jsx`: 9 тестів | `⏳ Оракул червоний` |
| `US-7 / AC-7.1 – AC-7.4` | 6 підказок, закриття Esc, стейблкоїн лише біля стейблкоїнів, телефон | `glossary`, `ui`, `features/*` | `acceptance/us-7.acceptance.test.jsx`: 9 тестів | `⏳ Оракул червоний` |
| `US-8 / AC-8.1 – AC-8.8` | Error без цін, повтор, межа 299 / 300 / 301 с, застарівання на екрані, обрані в Error, графік, Loading | `market-data`, `ui`, `features/*` | `acceptance/us-8.acceptance.test.jsx`: 10 тестів | `⏳ Оракул червоний` |
| `US-9 / AC-9.1 – AC-9.3` | Дисклеймер і атрибуція скрізь, зокрема в Error; українська без реклами | `app` (Wave 4) | `acceptance/us-9.acceptance.test.jsx`: 7 тестів | `⏳ Оракул червоний` |
| `NFR-1, NFR-2, NFR-3` | Свіжість ≤ 300 с, оновлення 60 с, політика повторів | `market-data` (Wave 2, P-4 – P-6) | оракул AC-8.4, AC-8.5; модульні тести W2-market-data | `⏳ План` |
| `NFR-4, NFR-6` | Web Vitals і axe на всіх екранах на фікстурі | Wave 4 (TD-002) | `pnpm vitals`, `pnpm test:a11y` у `--debt` | `⏳ План` |
| `NFR-5` | ≤ 150 кБ gzip | Wave 0, Wave 4 | `pnpm size` | `⏳ План` |
| `NFR-8, NFR-10` | CSP, лише домени CoinGecko, 3 ключі localStorage | усі хвилі; `quality_rules` | `--check-code`, Red-Team (Wave 5) | `⏳ План` |
| `US-10` | Перемикач теми | — | — | `➖ Спринт 2` |

Must-AC: 55 з 55 мають тест оракула (91 тест).

---

## 6. Ризики, технічний борг і відкриті питання

| Тип | Опис | Вплив | Що пропонується | Власник рішення |
| :--- | :--- | :--- | :--- | :--- |
| Рішення плану | P-1: монета поза топ-50 в обраних показується своїм `id` (`moneta-x`), бо NFR-10 дозволяє зберігати лише `id`. AC-6.4 перевіряє саме `id` | Низький | Підтвердити на гейті; інакше — «Revise» етапу 3 (NFR-10: дозволити зберігати назви) | Власник продукту |
| Рішення плану | P-2: ім'я кнопки «?» — `Що означає «{термін}»?`; UX його не задавав. Оракул прив'язаний до цього імені | Низький | Підтвердити на гейті | Власник продукту |
| Ризик | Строк G-2 (2026-11-09): на етапи 7–8 лишається 7 днів | Високий | Паралельні хвилі, US-10 винесено, Circuit Breaker 2 спроби; при загрозі строку власник може перенести етап 9 (трекер, етап 1) | Власник продукту |
| Ризик | Оракул залежить від таймерів у jsdom: AC-8.1 з 503 чекає ~6 с повторів, AC-8.5 — до 2 с перевірки свіжості; таймаут тесту 15 с | Середній | Якщо на етапі 7 тест нестабільний через час, а не поведінку, — «Revise» етапу 6, не правка оракула воркером | Скіл етапу 7 |
| Борг | `TD-002` — закриває Wave 4 (підміна CoinGecko в `a11y/**` і `scripts/web-vitals.mjs`) | Середній | Етап 7, Wave 4 | Скіл етапу 7 |
| Борг | `TD-003` — `msw` і `user-event` не потрібні (план, 12.1) | Низький | Закрити рядок у реєстрі на гейті етапу 7 | Власник продукту |
| Борг | `TD-004` — перевірка `tnum` шрифту Onest у Wave 0 | Низький | Етап 7, Wave 0 | Скіл етапу 7 |
| Питання | Holdouts не написані (`--stage 6`: WARN). Запропоновано 5 сценаріїв (план, 12.2) | Середній | Власник пише їх сам або в сесії `SDD_HOLDOUTS=author` до старту етапу 7 і задає `oracle.holdouts_command` | Власник продукту |
| Питання | Маніфест і іконки для підказки Safari (ADR 0006): PNG 180 / 192 / 512 треба згенерувати з `favicon.svg` | Низький | Wave 0 етапу 7; спосіб генерації без нової залежності — на розсуд головного агента, з записом у журнал | Скіл етапу 7 |
| Питання (суперечність етапів 4 і 5) | UX §5.2 `footer.privacy` робить «GitHub» посиланням на політику приватності GitHub, а правило `only-coingecko-origins` (`project.json → quality_rules`) дає помилку на будь-яку не-CoinGecko адресу в `src/**`. Wave 4 упреться в це правило | Середній | Вирішити на гейті до старту етапу 7: (а) «Revise» етапу 5 — додати `docs.github.com` у виняток правила; або (б) «Revise» етапу 4 — «GitHub» без посилання, лише текст | Власник продукту |
| Пропозиція (зона етапу 5) | `verify-gate.py --ci` перевіряє лише цілісність оракула, а не запускає його; `pnpm verify` бере тести тільки з `src/**`. Приймальні тести в CI зараз не виконуються | Середній | «Revise» етапу 5: додати крок CI `pnpm exec vitest run --config acceptance/vitest.config.js` (після етапу 7, коли оракул зелений) | Власник продукту |
| Спостереження | `git status` показує 10 файлів `.agentic/` етапів 1–4 як `M`, хоча `git diff` для них порожній (кеш стану, як на етапі 5) | Низький | Нічого; у коміт етапу 6 вони не потрапляють | — |

### 6.1. Карта технологій для самостійного опанування

| Технологія / Інструмент / Патерн | Рівень опанування | Ключові концепції | Офіційне першоджерело |
| :--- | :--- | :--- | :--- |
| Приймальні тести як оракул (test-first) | **Розуміти** | Тест пишуть до коду й захищають від змін; червоний тест доводить, що він перевіряє неготову поведінку | https://vitest.dev/guide/ |
| Testing Library (запити за ролями й іменами) | **Вміти** | `getByRole(name)`, `findBy*` для асинхронного стану, `within`; тест бачить те, що бачить зчитувач екрана | https://testing-library.com/docs/queries/about |
| Фальшиві таймери Vitest | **Вміти** | `vi.useFakeTimers({toFake: ['Date']})`, `vi.setSystemTime`: керований годинник без зупинки справжніх таймерів | https://vitest.dev/api/vi.html#vi-usefaketimers |
| DAG хвиль і File Ownership | **Розуміти** | Паралельні виконавці не ділять файлів; контракти — до хвиль; точка синхронізації після кожної хвилі | https://docs.claude.com/en/docs/claude-code/sub-agents |
| TanStack Query (кеш, `refetchInterval`, `retry`) | **Знати** | Один знімок даних на кілька екранів; фонове оновлення лише у видимій вкладці | https://tanstack.com/query/latest/docs/framework/react/overview |

---

## 7. Точка фіксації в Git (Recommended Git Commit Checkpoint)

### 7.1. Список файлів для індексації (`git status --short`)

```text
 M .agentic/backlog.md
 M .agentic/pipeline-state.md
 M .agentic/project.json
?? .agentic/specs/implementation_plan.md
?? .agentic/reports/06-plan-report.md
?? acceptance/
```

`.claude/skills/verify/SKILL.md` не індексується (без окремого запиту власника). 10 файлів `.agentic/` етапів 1–4 з позначкою `M` мають порожній `git diff` і не індексуються.

### 7.2. Явна індексація та коміт (Conventional Commits)

```bash
git add .agentic/specs/implementation_plan.md acceptance/vitest.config.js acceptance/support/setup.js acceptance/support/fake-coingecko.js acceptance/support/app.jsx acceptance/us-1.acceptance.test.jsx acceptance/us-2.acceptance.test.jsx acceptance/us-3.acceptance.test.jsx acceptance/us-4.acceptance.test.jsx acceptance/us-5.acceptance.test.jsx acceptance/us-6.acceptance.test.jsx acceptance/us-7.acceptance.test.jsx acceptance/us-8.acceptance.test.jsx acceptance/us-9.acceptance.test.jsx .agentic/project.json .agentic/backlog.md .agentic/reports/06-plan-report.md .agentic/pipeline-state.md
git commit -m "docs(stage-6): add sprint 1 implementation plan and acceptance oracle"
```

---

### 🛑 Рішення власника продукту (Human Approval Gate)

Схвалення етапу 6 — лише фразою **«ПЛАН ЗАТВЕРДЖЕНО. ПОЧИНАЙ IMPLEMENTATION.»** (сама — «Approve & закоміть»; зі словами «без коміту» — «Approve без коміту»).

- [x] **Approve & закоміть** — статус `APPROVED_AND_COMMITTED`: агент оновлює `.agentic/pipeline-state.md`, позначає цей чекбокс, виконує явний `git add` і `git commit`.
- [ ] **Approve без коміту** — статус `APPROVED_MANUAL_COMMIT`: власник комітить самостійно.
- [ ] **Revise** — статус `REJECTED_REVISING`: зауваження нижче, етап повертається на Фазу 3.

**Коментарі / Зауваження:**
> «ПЛАН ЗАТВЕРДЖЕНО. ПОЧИНАЙ IMPLEMENTATION.» (2026-11-02 23:55)
