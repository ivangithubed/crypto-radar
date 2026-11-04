# Фінальний звіт етапу: Stage 9: Реліз: версіонування, staging → production, rollback

- **Етап:** `Stage 9: Реліз: версіонування, staging → production, rollback`
- **Відповідальний скіл:** `release-engineer`
- **Дата формування:** `2026-11-04 18:27` (первинний гейт); Revise етапу 9 №1 — `2026-11-04 23:25`
- **Статус аудиту independent-reviewer:** `PASS` (Revise №1, рев'ю №2 — 23:26; історія рев'ю — 4.3)

---

> **Revise етапу 9 №1 (запит на зміну №9, трекер, розділ 4, 2026-11-04 23:05).** Запит: (1) таймаут і повтор кроку встановлення браузерів у `release.yml` (TD-034) та перевірка `ci.yml` на ту саму прогалину (результат — TD-035: `ci.yml` належить етапу 5, тож етап 9 його **не змінює**); (2) репетиція відкату `v0.1.1` → `v0.1.0` (пункт 9.4 runbook); (3) оновлення runbook, CHANGELOG, звіту. Текст секцій нижче до блоків «**Revise №1**» описує **первинний гейт 18:27 (до push, тегу й деплою)** і лишений для трасування; поточний стан — у блоках «Revise №1» кожної секції та в секції 6. Рядки 4.0 без префікса «Revise №1» отримані на первинному гейті (коміт `d0241ce` і раніше, 18:10 – 19:00) і в цьому проході не повторювались. Репетиція відкату **не проведена**: вона потребує push, тега `v0.1.1`, двох production-деплоїв і двох фраз власника — жодної зовнішньої дії в цьому проході не виконано.

## 1. Перевірені передумови (Pre-Flight Summary)

Усе нижче — лише читання й локальні команди; жодної зовнішньої дії (push, тег, деплой, налаштування GitHub) не виконувалось. Єдине встановлення — `git-cliff` за окремою згодою власника.

| Інструмент / SDK / Акаунт | Необхідна версія | Фактичний стан на старті | Запропонована команда | Згода отримана | Результат |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Передумови етапу (трекер) | 8.a і 8.b — термінальний статус | `verify-gate.py --next`: етапи 1–8.b `APPROVED_AND_COMMITTED`, етап 9 `PENDING` (пропуск дозволений) | `verify-gate.py --next` | Не потрібно | ✅ Готово |
| Ціль деплою | `static-hosting`, збігається з ADR 0003 | `deploy_target: "static-hosting"`; ADR 0003 — GitHub Pages через GitHub Actions | `python -c "import json; …['deploy_target']"` | Не потрібно | ✅ Готово |
| Відкриті дефекти Blocker / Critical / Major | немає, або рішення власника | BUG-012 (Critical, Fixed), BUG-010 (Major, Fixed); обидва перевірені власником на справжньому Safari (iPhone) — «ПЕРЕВІРИВ ВСЕ ОК», 2026-11-04 19:00 | `ls .agentic/qa/bugs`, статуси | Рішення власника 2026-11-04 17:57 (запис у розділі 4 трекера): «Перевірю сам, коли вийде реліз-кандидат» (трекер, розділ 4) | ✅ Готово: Safari перевірено власником (секція 6) |
| Git | чисте дерево, крім трекера | 228 файлів проєкту; зміни лише файлів етапу 9 і 4 файли 01 / 02 лише з різницею закінчень рядків (`git diff HEAD --stat` порожній, у коміт не йдуть) | `git status --short` | Не потрібно | ✅ Готово |
| Теги | — | `git describe --tags`: тегів немає (перший реліз) | `git describe --tags --abbrev=0` | Не потрібно | ✅ Готово |
| Node.js / pnpm | Node 24 LTS (`.nvmrc`), pnpm 11 | pnpm 11.23.0; Node 24 | `pnpm --version` | Не потрібно | ✅ Готово |
| `gh` CLI | будь-яка | 2.58.0, вхід `ivangithubed` | `gh auth status` | Не потрібно (лише читання) | ✅ Готово |
| Репозиторій на GitHub | публічний, `main` | `ivangithubed/crypto-radar`, PUBLIC; `origin/main` = `3c7cc09` (етап 5), локально на 30 комітів більше | `gh repo view`, `git ls-remote --heads origin` | Не потрібно | ⚠️ Перший push опублікує всю історію (секція 6) |
| `git-cliff` | генератор CHANGELOG | 2.14.2: `npm view` — MIT OR Apache-2.0, без install-скриптів (бінарники — `optionalDependencies` платформ), останній реліз 2026-09-18; локально не було | `pnpm add -D git-cliff@2.14.2` | **Так** (власник, 2026-11-04, окреме питання) | ✅ Встановлено |
| `actionlint` | лінтер workflow | не встановлено | — | Не встановлював (глобальне ПЗ) | ⚠️ Замість нього — розбір YAML і перевірка SHA-закріплення (4.2) |

### Revise №1: передумови

| Інструмент / стан | Необхідне | Фактичний стан (2026-11-04 23:05 – 23:15) | Команда | Згода | Результат |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Статус етапу 9 | `REJECTED_REVISING` після запису запиту | запис №9 у розділі 4 трекера (23:05), рядок етапу 9 — `REJECTED_REVISING` | `grep -n "release-engineer" .agentic/pipeline-state.md` | Запит від керуючої сесії; власнику — на гейті | ✅ Готово |
| Production | `v0.1.0` | `version.json` = `{"version":"v0.1.0","commit":"b6c56c283bbea13ed4299bd3b0e2b9a2ffc3eeac"}`, `/` — 200, `https_enforced: true`, `build_type: workflow` | `curl`, `gh api repos/ivangithubed/crypto-radar/pages` (лише читання) | Не потрібна | ✅ Готово |
| Тег `v0.1.0` | незмінний | `6e042e4` → коміт `b6c56c2` | `git rev-parse v0.1.0 v0.1.0^{commit}` | Не потрібна | ✅ Готово |
| Історія прогонів Actions | дані для обґрунтування таймаутів | 4 запуски (`gh api …/actions/runs/<id>/jobs`): тривалість кроків, `started_at` / `completed_at` | `gh api` (лише читання) | Не потрібна | ✅ Готово |
| Сусідня сесія | не торкатись її зони | Revise 8.a (запит №8): `.agentic/qa/bugs/BUG-010.md`, `BUG-012.md`, `08-test-plan.md`, `08a-*` — мої правки їх не зачіпають | `git status --short` | — | ✅ Готово |
| Нові інструменти й залежності | немає | PyYAML (вже був), `git-cliff` 2.14.2 (вже встановлено); нічого не встановлювалось | `pnpm exec git-cliff --version` | Не потрібна | ✅ Готово |
| Зовнішні дії | лише з окремої згоди | **не виконувались**: push, теги, запуск workflow, деплой | — | Чекають власника (секція 6) | ⏳ Очікує |


---

## 2. Застосовані Best Practices vs найпростіший підхід

Остаточний вибір власника: затверджений план етапу (2026-11-04), версія `v0.1.0`, CHANGELOG — `git-cliff`.

| Аспект / Рішення | Найпростіший підхід | Галузева Best Practice | Що обрано та чому |
| :--- | :--- | :--- | :--- |
| Версія | Дата або `latest` | SemVer, анотований тег `vX.Y.Z`; `0.y.z` на MVP | **`v0.1.0`** (вибір власника): перша публічна версія MVP, `1.0.0` оголосить власник. |
| CHANGELOG | Ручний список «що пам'ятаю» | Генерація з Conventional Commits + людська редакція | **`git-cliff` 2.14.2** (вибір власника) + ручний розділ «Added / Fixed / Known limitations» українською; згенерований перелік комітів — у згорнутому блоці. Нові версії дописує `--prepend` без втрати ручних правок. |
| Артефакт | Збірка на сервері з `git pull` | Один раз у CI, версія й SHA у `dist/version.json`, той самий артефакт проходить smoke і йде в production | **Best Practice:** job `build` один раз, `smoke` бере той самий артефакт `github-pages`, `deploy` публікує його без перезбирання. Відтворюваність: дві збірки одного коміту дають ідентичні 62 файли (4.2). |
| Staging | Окреме середовище | ADR 0003: окремого staging немає | **Smoke у CI на `vite preview` того самого артефакту** (Chromium і WebKit, `@smoke`) — його роль виконує job `smoke`. Відхилення від буквального тексту ADR («запуск workflow деплою з `main`»): запуск за тегом `vX.Y.Z`, smoke **до** деплою, `verify-production` — **після**; суті ADR це не суперечить (збірка один раз, той самий артефакт, відкат повторним запуском). |
| Права CI | Широкий токен | `contents: read` за замовчуванням, `pages: write` і `id-token: write` лише в job `deploy`; вхід (тег) — через змінну середовища; без кешу залежностей у релізних jobs | **Best Practice:** least privilege; параметр `tag` не підставляється в shell, перевіряється на SemVer регулярним виразом bash `[[ =~ ]]` (однорядково); `cache: pnpm` прибрано з релізних jobs (ризик отруєння кешу). |
| Версії дій | `@v4`, `@main` | Закріплення за SHA коміту з коментарем-версією | **Best Practice:** усі 10 `uses:` — за 40-символьним SHA; кожен SHA звірено з тегом його версії `gh api repos/<repo>/git/ref/tags/<тег>` (лише читання; для анотованого тегу `pnpm/action-setup` — ще `git/tags/<sha>`), вивід — 4.2. Захист від «imposter commit» (SHA з форку). |
| Production | Автодеплой після збірки | Захищене середовище з required reviewers поверх фрази власника в чаті | **Два гейти:** фраза «HUMAN ACCEPTANCE…» і схвалення власника в GitHub (середовище `github-pages`). |
| Відкат | «Полагодимо вперед» | Повторний запуск workflow на попередньому тегу | **Best Practice:** `workflow_dispatch` з існуючим тегом; RTO ≤ 15 хв (NFR-12). |
| Моніторинг | Дивитись вручну | Автоматична перевірка після деплою й зовнішній uptime | `verify-production` у workflow; зовнішній uptime — створює власник (інструкція в runbook). |

### Revise №1: рішення

| Аспект / Рішення | Найпростіший підхід | Галузева Best Practice | Що обрано та чому |
| :--- | :--- | :--- | :--- |
| Таймаут `smoke` | Лишити таймаут job 20 хв | Окремий `timeout-minutes` на мережевих кроках, значення — з виміряної норми | Крок «Install browsers for smoke»: `timeout-minutes: 8`. Норма — 41 с (**один** успішний прогін: спроби 2 і 3 запуску 41887573401 — той самий запис job), зависання — 1200 с. Межа на кроці не дає зависанню з'їсти RTO відкату (NFR-12, ≤ 15 хв). Вибірка мала — див. TD-036. |
| Повтор | Ручний `gh run rerun --failed` | Автоматичний повтор кроку з власною межею спроби | Цикл у shell: 2 спроби по `timeout --kill-after=10s 3m` (≈ 4× норми); найгірший випадок 2 × (180 + 10) + 2 × 5 = 390 с = 6,5 хв < 8 хв кроку. Без стороннього action (нова залежність і SHA не потрібні). Перевірено стабом (4.1 / 4.2). Повільне, але успішне встановлення спробу 3 хв не витримає — TD-036. |
| `ci.yml` | Додати таймаути в тому ж проході | Файл змінює його етап-власник (L-009) | Така сама прогалина є (два кроки `playwright install` без `timeout-minutes`), але основний CI-workflow належить етапу 5 (скіл `release-engineer`, «Межі етапу»). Етап 9 `ci.yml` **не змінює**; прогалина й пропонована правка (5 хв для Chromium, 15 хв для трьох браузерів — запас над 708 с) записані як TD-035 для Revise етапу 5. |
| Зміст `v0.1.1` | Порожній тег | Реліз з осмисленою зміною | Пропонується: зміцнення workflow (TD-034) + runbook + CHANGELOG; код застосунку = `v0.1.0` (`git diff` порожній). Інший зміст — питання власнику (секція 6). |
| Куди після репетиції | Повернути на найновіший тег | Мінімум production-змін | Рекомендація — лишити production на `v0.1.0` (вміст ідентичний, на один деплой із фразою менше); рішення власника (секція 6). |


---

## 3. Виконаний обсяг робіт (Deliverables)

- [`.github/workflows/release.yml`](../../.github/workflows/release.yml) — release-workflow: запуск за тегом `vX.Y.Z` або вручну з існуючим тегом; `build` → `smoke` → `deploy` (середовище `github-pages`) → `verify-production`.
- [`CHANGELOG.md`](../../CHANGELOG.md) — розділ «[0.1.0]» (Added, Fixed, Known limitations) і згорнутий службовий перелік комітів.
- [`cliff.toml`](../../cliff.toml) — конфіг `git-cliff` (Keep a Changelog, Conventional Commits).
- [`package.json`](../../package.json) і [`pnpm-lock.yaml`](../../pnpm-lock.yaml) — devDependency `git-cliff` 2.14.2 і скрипт `changelog` (за згодою власника; поле `version` лишається `0.0.0`, версія артефакту — у `dist/version.json`).
- [`.agentic/specs/09-release-runbook.md`](../specs/09-release-runbook.md) — версіонування, середовища, підготовка цілі, звичайний реліз, **Rollback / відкат**, моніторинг, інцидент, витрати, журнал релізів, готовність комерційного запуску.
- [`.agentic/project.json`](../project.json) — лише ключ `verify_commands["9"]` (5 команд: встановлення, `pnpm verify`, розбір workflow, наявність розділу «[0.1.0]» у CHANGELOG, наявність розділу відкату в runbook); затверджено в плані.
- [`.agentic/tech-debt.md`](../tech-debt.md) — нові TD-032 (другий гейт production залежить від налаштування власника) і TD-033 (відкат — перезбірка з `audit`); обидва відкриті, ризик не прийнято.
- [`.agentic/backlog.md`](../backlog.md) — US-1 – US-9 `Done`, версія `0.1.0`; рядок спринту 1: публікація — локально (реліз-кандидат).
- [`.agentic/pipeline-state.md`](../pipeline-state.md) — статус етапу 9, рішення власника, запис про Safari.
- [`.agentic/reports/09-release-report.md`](09-release-report.md) — цей звіт.

Код продукту, тести, `e2e/`, `ci.yml`, `vite.config.js`, ADR і специфікації 01 – 08 не змінювались.

### Revise №1: змінені файли

- [`.github/workflows/release.yml`](../../.github/workflows/release.yml) — крок «Install browsers for smoke»: `timeout-minutes: 8` і цикл із двох спроб по 3 хв (TD-034).
- [`.agentic/tech-debt.md`](../tech-debt.md) — новий `TD-034` (закрито в цьому ж запиті), `TD-035` (прогалина в `ci.yml`, етап-власник 5, відкрито), `TD-036` (повільне успішне встановлення в `release.yml`, відкрито) і рядок «Оновлення».
- [`.agentic/specs/09-release-runbook.md`](../specs/09-release-runbook.md) — актуальний стан репозиторію й production, PATCH для змін лише CI, перевірка Pages перед тегом, бюджет RTO, журнал інцидентів (2 записи), журнал релізів (`v0.1.0` у production, `v0.1.1` — кандидат), протокол репетиції відкату 9.6.
- [`CHANGELOG.md`](../../CHANGELOG.md) — розділ «[0.1.1] — 2026-11-04» (дата уточнюється в момент тега).
- [`.agentic/reports/09-release-report.md`](09-release-report.md) — цей звіт.
- [`.agentic/pipeline-state.md`](../pipeline-state.md) — запис запиту №9 і статус етапу 9 (мої записи; файл паралельно править сесія Revise 8.a).

Не змінювались: `.github/workflows/ci.yml` (`git diff --quiet v0.1.0 -- .github/workflows/ci.yml` → код 0), код застосунку (`git diff --quiet v0.1.0 -- src public index.html vite.config.js package.json pnpm-lock.yaml` → код 0), `.agentic/qa/`, `08-test-plan.md`, `08a-*`, беклог, `package.json`.


---

## 4. Докази працездатності (Verification Evidence)

### 4.0. Валюта довіри (Trust Receipt)

| Перевірка | Команда | Код виходу | Лічильники | Повторив рев'юер | Примітка |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Встановлення за lockfile | `pnpm install --frozen-lockfile` | 0 | «Already up to date» | ні | 2026-11-04 18:11:43; вивід — 4.1 |
| Гейт готовності | `pnpm verify` | 0 | 16 файлів, 268 passed; JS головного екрана 106,10 кБ gzip (ліміт 150) | ні | 18:11:44 – 18:11:52; вивід — 4.1 |
| Виміряний борг | `python .agentic/bundle/skills/gate-check/verify-gate.py --debt` | 0 | 8 команд PASS, `debt_commands`: 7 аспектів | ні | 18:13:19 – 18:14:08; перший прогін 18:11:52 — FAIL `test:a11y` через мій `vite preview` на порту 4173 (історія); вивід — 4.1 |
| Розбір release-workflow | `python -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml', encoding='utf-8'))"` | 0 | 4 jobs: build, smoke, deploy, verify-production | ні | 18:22:32; повтор після `refs/tags/` — 18:27:28; вивід — 4.2 |
| Закріплення версій дій | `grep -c "uses: .*@[0-9a-f]\{40\}" .github/workflows/release.yml` | 0 | 10 закріплених, 0 незакріплених | ні | 18:22:32; повтор 18:27:28; вивід — 4.2 |
| SHA дій ↔ теги версій | `gh api repos/<repo>/git/ref/tags/<тег>` для 7 дій і `git/tags/<sha>` для `pnpm/action-setup` | 0 | 7 з 7 збіглися з SHA в `release.yml` і `ci.yml` | ні | 18:21:25 – 18:21:33; лише читання; вивід — 4.2 |
| Відтворюваність збірки | дві послідовні `pnpm build` і `sha256sum` усіх файлів `dist/` | 0 | 62 файли, `diff` порожній | ні | 18:22:33 (повтор після правок; перший прогін 18:10:58 дав те саме); вивід — 4.2 |
| Версія `git-cliff` | `pnpm exec git-cliff --version` | 0 | `git-cliff 2.14.2` | ні | 18:22:32; вивід — 4.2 |
| Перевірка CHANGELOG і runbook (команди етапу 9) | 3 команди `python -c` з `verify_commands["9"]` | 0 | розбір YAML 0, розділ «[0.1.0]» 0, розділ `## 5. Rollback` 0 | ні | 18:22:32; вивід — 4.2; ті самі команди повторяться в `--stage 9 --run` після вердикту |
| Сканер секретів | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --scan-secrets .` | 0 | 228 файлів, 0 секретів | ні | 2026-11-04 19:00:26; запущено останнім, після всіх правок звіту й створення файлів етапу (L-002); вивід — 4.2 |
| Реліз-кандидат локально | `pnpm preview --host 0.0.0.0 --port 4173` і `curl` | 0 | `http://192.168.231.203:4173/crypto-radar/` — 200, `<title>Крипто-Радар</title>` | ні | 18:22:35; вивід — 4.2; чекліст iPhone — runbook 9.1 |
| Валідатор етапу | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 9 --run` | 0 | EXIT 0 (вивід — 4.2, блок «Валідатор після вердикту») | ні | 2026-11-04 19:00:17 – 19:00:26; після вердикту PASS (L-004); виконав головний агент |
| Вердикт рев'юера | субагент `independent-reviewer` | 0 | рев'ю №2 — PASS (0 BLOCKER, 0 WARNING, 7 INFO); рев'ю №1 — BLOCKERS FOUND, виправлено | так (verify, команди етапу 9, сканер, git-cliff, закріплення SHA) | 2026-11-04 18:25; вердикт перенесено в 4.3; INFO виправлено автором після вердикту |
| `actionlint` | — | не запускалось | — | ні | інструмент не встановлено, глобального ПЗ не ставлю; замінено розбором YAML і перевіркою SHA |
| Репетиція відкату | `workflow_dispatch` з попереднім тегом | не запускалось | — | ні | первинний гейт: попередньої версії не було. Revise №1: потребує push, тега `v0.1.1`, двох production-деплоїв і двох фраз власника — не запускалась, чекає згод (секція 6, runbook 9.6) |
| **Revise №1:** розбір `release.yml` | `python -c "import yaml; …safe_load(open('.github/workflows/release.yml'))"` | 0 | 4 jobs; один крок із `timeout-minutes` (8, job 20) | ні | 23:22:16; вивід і `EXIT=` — 4.2 |
| **Revise №1:** закріплення дій у `release.yml` | `grep -c 'uses: .*@[0-9a-f]\{40\}' .github/workflows/release.yml` | 0 | 10 закріплених; друга перевірка (0 незакріплених) — у 4.2 | ні | 23:22:16; вивід і `EXIT=` — 4.2 |
| **Revise №1:** `ci.yml` і код не змінено | `git diff --quiet v0.1.0 -- .github/workflows/ci.yml`; `git diff --quiet v0.1.0 -- src public index.html vite.config.js package.json pnpm-lock.yaml` | 0 | обидва diff порожні | ні | 23:22:16; вивід і `EXIT=` — 4.2 |
| **Revise №1:** сценарії циклу повтору, що мають пройти (стаб `pnpm`) | `./sim_case.sh ok 0 1 && ./sim_case.sh fail_then_ok 0 2 && ./sim_case.sh hang_then_ok 0 2` | 0 | успіх → 1 спроба; збій → 2 спроби, exit 0; зависання → 2 спроби, exit 0 | ні | 23:22:17; вивід і `EXIT=` — 4.2; симуляція, а не запуск у CI |
| **Revise №1:** команди етапу 9 (`python -c`) | 3 команди з `verify_commands["9"]`, розділ «[0.1.1]», `git-cliff --version` | 0 | розбір YAML, «[0.1.0]», «[0.1.1]», `## 5. Rollback`, git-cliff 2.14.2 — усі 0 | ні | 23:22:17; вивід і `EXIT=` — 4.2; ті самі команди — у `--stage 9 --run` |
| **Revise №1:** гейт готовності | `pnpm verify` | 0 | 16 файлів, 268 passed; NFR-5: 106,10 кБ gzip | ні | 23:11; після нього змінювались лише документи; повторюється у `--stage 9 --run` |
| **Revise №1:** виміряний борг | `python .agentic/bundle/skills/gate-check/verify-gate.py --debt` | 0 | 8 команд PASS, `debt_commands`: 7 аспектів; `pnpm audit --audit-level high`: 2 moderate (TD-001), 0 high / critical | ні | 23:13:11 – 23:14:24; вивід — 4.1 |
| **Revise №1:** сканер секретів | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --scan-secrets .` | 0 | 228 файлів, 0 секретів | так (у складі `--stage 9`) | 2026-11-04 23:29:01; запущено останнім, після правок трекера й звіту (L-002); у вердикті рев'ю №2 — 228 файлів, 0 |
| **Revise №1:** валідатор етапу | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 9 --run` | 0 | усе PASS: звіт, 25+ рядків «Валюти довіри», оракул, 85 файлів коду, 228 файлів без секретів, 5 команд етапу; передумова 8.a — `APPROVED_AND_COMMITTED` (`35d8a3b`) | ні | 2026-11-05 00:02:09 – 00:02:18, після вердикту PASS (L-004); вивід — 4.2, «прогін 2». Прогін 1 (2026-11-04 23:28, код 1 через передумову 8.a) — 4.2 |
| **Revise №1:** вердикт рев'юера | субагент `independent-reviewer` | 0 | рев'ю №2 — PASS (0 BLOCKER, 0 WARNING, 6 INFO); рев'ю №1 — BLOCKERS FOUND (4 BLOCKER, 2 WARNING), виправлено | так (verify, команди етапу 9, `git diff`, `git rev-parse`) | 23:26; вердикт — 4.3; INFO виправлено автором після вердикту (заголовок §8 runbook, 22:57, час рев'ю №1, примітка про рядки первинного гейту) |

### 4.1. Збірка, лінтери та автоматичні тести

```text
$ pnpm install --frozen-lockfile   (18:11:43)
Already up to date
Done in 264ms using pnpm v11.23.0
INSTALL_EXIT=0

$ pnpm verify   (18:11:44 – 18:11:52)
 Test Files  16 passed (16)
      Tests  268 passed (268)
✓ built in 185ms
NFR-5: JS головного екрана 106.10 kB gzip (ліміт 150 kB)
VERIFY_EXIT=0

$ python .agentic/bundle/skills/gate-check/verify-gate.py --debt   (18:13:19 – 18:14:08)
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
DEBT_EXIT=0

$ pnpm exec git-cliff --version
git-cliff 2.14.2
```

Перший прогін `--debt` (18:11:52) дав `FAIL: pnpm test:a11y` («http://localhost:4173/crypto-radar/ is already used»): порт займав мій власний `vite preview` реліз-кандидата; процес зупинено, повторний прогін (вище) зелений. Помилка коду не була.

**Revise №1: що змінилося й чим перевірено.**

Тривалість кроків з історії прогонів (`gh api repos/ivangithubed/crypto-radar/actions/runs/<id>/jobs`, лише читання; обчислено з `started_at` / `completed_at`), яка обґрунтовує таймаути (TD-034):

| Крок | Прогін | Результат | Тривалість |
| :--- | :--- | :--- | :--- |
| `release.yml` / `smoke` / Install browsers for smoke | 41887573401, спроба 1 | cancelled (таймаут job) | 1200 с |
| те саме | 41887573401, спроби 2 і 3 (**один** запис job: `started_at` однаковий, job 126854684046 → 126857938129 перенесено без перезапуску) | success | 41 с |
| наступний крок «Smoke suite» | те саме | success | 30 с |
| `ci.yml` / `verify` / Install Chromium (дані для TD-035) | 41882777980, 41875849265, 41521556149 | success | 21 с, 20 с, 19 с |
| `ci.yml` / `e2e` / Install browsers for E2E (дані для TD-035) | 41882777980 | success | 117 с |
| те саме | 41875849265 | success | **708 с** |
| `release.yml` jobs запуску 41887573401 | `build` — спроба 1; `smoke` — спроба 2; `deploy`, `verify-production` — спроба 3 | success | `build` 31 с, `smoke` 90 с, `deploy` 45 с, `verify-production` 3 с |

Висновки: норма двох браузерів у релізному `smoke` — 41 с (**вибірка — один прогін**) → спроба 3 хв (≈ 4× норми), крок 8 хв; повільне, але успішне встановлення (клас 708 с, який бачили лише в CI із трьома браузерами) спробу 3 хв не витримає — TD-036. Для `ci.yml` (TD-035) норма Chromium 19 – 21 с, трьох браузерів 117 с, успішний максимум 708 с — межа має бути вищою за 708 с. Машинний час релізного запуску ≈ 3 хв (31 + 90 + 45 + 3 с без черг) — бюджет RTO ≤ 15 хв (NFR-12) лишає ≈ 12 хв на схвалення власника.

**Негативний контроль (очікуваний `EXIT=1`)** — два зависання поспіль, масштаб 3 хв → 3 с (23:22:23), скрипт кроку з `release.yml` через `retry_fast.sh`:

```text
$ rm -f counter; PATH="$PWD/stub:$PATH" COUNTER="$PWD/counter" MODE=always_hang bash retry_fast.sh
attempts=2 elapsed=9s
EXIT=1
```

Очікувано: після двох спроб крок завершується помилкою (`::error::Браузери для smoke не встановлено за дві спроби`), а не чекає 20 хв.

```text
$ pnpm verify   (23:11)
 Test Files  16 passed (16)
      Tests  268 passed (268)
NFR-5: JS головного екрана 106.10 kB gzip (ліміт 150 kB)
VERIFY_EXIT=0

$ python .agentic/bundle/skills/gate-check/verify-gate.py --debt   (23:13:11 – 23:14:24)
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
DEBT_EXIT=0

$ pnpm audit --audit-level high   (23:11)
2 vulnerabilities found
Severity: 2 moderate
EXIT=0
```

Відкат на `v0.1.0` сьогодні не блокується аудитом (TD-033): `pnpm-lock.yaml` і `package.json` збігаються з тегом (4.2), а `pnpm audit --audit-level high` — 0 high / critical.

### 4.2. Валідація артефактів, контракту, інфраструктури

Перший прогін (18:10 – 18:14) — блоки нижче до напису «Повтор після правок за рев'ю»; повтор (18:21 – 18:23) — після правок за рев'ю (SHA дій, `release.yml`, runbook, TD-032 / TD-033), він і є остаточним доказом.

**Повтор після правок за рев'ю (18:21 – 18:23), дослівно з журналу головного агента:**

```text
## yaml 18:22:32
jobs ['build', 'smoke', 'deploy', 'verify-production']
EXIT=0
## pinned 18:22:32
pinned: 10
unpinned: 0
EXIT=0
## verify_commands[9] python checks 18:22:32
EXIT=0  python -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml', encoding='utf-8'))"
EXIT=0  python -c "import re,sys; t=open('CHANGELOG.md',encoding='utf-8').read(); sys.exit(0 if re.searc
EXIT=0  python -c "import re,sys; t=open('.agentic/specs/09-release-runbook.md',encoding='utf-8').read()
## git-cliff 18:22:32
git-cliff 2.14.2
EXIT=0
## reproducibility 18:22:33
build1 EXIT=0
build2 EXIT=0
files: 62
IDENTICAL
EXIT=0
sha256(listing): 0b8c576c8f217648
## preview 18:22:35   $ curl -s -o /dev/null -w "lan http=%{http_code}" http://192.168.231.203:4173/crypto-radar/ ; curl -s <той самий URL> | grep -o "<title>[^<]*</title>"
lan http=200
<title>Крипто-Радар</title>
EXIT=0
## end 18:22:35
```

**Після останньої правки `release.yml` (`ref: refs/tags/…`, 18:27:28):**

```text
$ розбір YAML + перевірка закріплення SHA і `ref: refs/tags/` (python, 18:27:28)
jobs ['build', 'smoke', 'deploy', 'verify-production']
10 закріплених, 0 незакріплених `uses:`; `ref: refs/tags/${{ env.RELEASE_TAG }}` — 2 входження
EXIT=0
```

**SHA дій ↔ теги версій (лише читання, `gh api`):**

```text
## shaverify 18:21:25
actions/configure-pages v6.0.0 -> commit 45bfe0192ca1faeb007ade9deae92b16b8254a0d
actions/upload-pages-artifact v5.0.0 -> commit fc324d3547104276b827a68afc52ff2a11cc49c9
actions/deploy-pages v5.0.1 -> commit 368f82528645a54fb793d4d04e342629a3f51346
actions/download-artifact v8.0.2 -> commit 9000827ccba6bdab643e8b6fd33ac0654aef8333
actions/checkout v7.0.1 -> commit 3d3c42e5aac5ba805825da76410c181273ba90b1
actions/setup-node v7.1.0 -> commit 949feb2413d6458794dcd2491c4babbbce0c15c1
pnpm/action-setup v6.1.0 -> tag d9184bf108216479bc5a137cc391f4d7b14c870b
## release.yml SHAs
uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
uses: actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d
uses: actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346
uses: actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333
uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1
uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9
uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413
## end 18:21:29
pnpm/action-setup v6.1.0: анотований тег d9184bf1… → `gh api repos/pnpm/action-setup/git/tags/d9184bf108216479bc5a137cc391f4d7b14c870b` → commit ea17c68df8912ef543352723c149a84f56e3d413 (18:21:33, EXIT=0) = SHA у release.yml і ci.yml
```

```text
$ python -c "import yaml; d=yaml.safe_load(open('.github/workflows/release.yml', encoding='utf-8')); print('jobs', list(d['jobs']))"   (18:12)
jobs ['build', 'smoke', 'deploy', 'verify-production']
YAML_EXIT=0

$ grep -c "uses: .*@[0-9a-f]\{40\}" .github/workflows/release.yml   → 10
$ grep "uses:" .github/workflows/release.yml | grep -vc "@[0-9a-f]\{40\}"   → 0
Версії (звірено `gh api repos/actions/<name>/releases/latest`, лише читання): actions/configure-pages v6.0.0 (2026-03-25),
  actions/upload-pages-artifact v5.0.0 (2026-04-10), actions/deploy-pages v5.0.1 (2026-09-01), actions/download-artifact v8.0.2;
  checkout v7.0.1, pnpm/action-setup v6.1.0, setup-node v7.1.0 — ті самі SHA, що в ci.yml.

$ 2 × pnpm build; sha256sum усіх файлів dist/   (18:10:58 – 18:11:00)
62 файли; diff h1.txt h2.txt → порожній (IDENTICAL); sha256 переліку: 0b8c576c8f217648…

$ python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --scan-secrets .   (18:23:38)
ℹ️  [INFO] Проскановано файлів: 228
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0

Реліз-кандидат: curl http://192.168.231.203:4173/crypto-radar/ → 200; <title>Крипто-Радар</title>
```

**Revise №1 (23:22:16 – 23:22:23), дослівно з журналу головного агента** (повтор після рев'ю №1 Revise: `ci.yml` повернуто до стану тега, див. TD-035):

```text
$ date  -> 2026-11-04 23:22:16
$ python -c "import yaml; ...safe_load(open('.github/workflows/release.yml'))"   (23:22:16)
jobs ['build', 'smoke', 'deploy', 'verify-production']
step-timeout: smoke | Install browsers for smoke | 8 хв (job: 20 хв)
EXIT=0
$ grep -c 'uses: .*@[0-9a-f]\{40\}' .github/workflows/release.yml   (23:22:16)
10
EXIT=0
$ test "$(grep 'uses:' .github/workflows/release.yml | grep -vc '@[0-9a-f]\{40\}')" = 0   (0 незакріплених)
EXIT=0
$ git diff --quiet v0.1.0 -- .github/workflows/ci.yml   (ci.yml не змінено)
EXIT=0
$ git diff --quiet v0.1.0 -- src public index.html vite.config.js package.json pnpm-lock.yaml   (23:22:16)
EXIT=0
EXIT=0  CHANGELOG [0.1.0]
EXIT=0  CHANGELOG [0.1.1]
EXIT=0  runbook ## 5. Rollback
git-cliff 2.14.2
EXIT=0
$ sim_case.sh ok 0 1 && sim_case.sh fail_then_ok 0 2 && sim_case.sh hang_then_ok 0 2   (23:22:17, масштаб 3 хв -> 3 с)
ok: exit=0 attempts=1 elapsed=0s (очікувалось exit=0 attempts=1)
fail_then_ok: exit=0 attempts=2 elapsed=1s (очікувалось exit=0 attempts=2)
hang_then_ok: exit=0 attempts=2 elapsed=4s (очікувалось exit=0 attempts=2)
EXIT=0
$ негативний контроль: два зависання, bash retry_fast.sh (очікується EXIT=1)   (23:22:23)
attempts=2 elapsed=9s
EXIT=1
```

Допоміжні файли симуляції (поза репозиторієм, у scratchpad сесії): `stub/pnpm` — заглушка, що за змінною `MODE` поводиться як успіх (`ok`), збій на 1-й спробі (`fail_then_ok`, exit 3), зависання на 1-й спробі (`hang_then_ok`, `sleep 60`) або зависання на кожній (`always_hang`); `retry.sh` — поле `run` кроку з `release.yml`, витягнуте розбором YAML (не копією); `retry_fast.sh` — він же з масштабом часу `--kill-after=1s 3s`, `sleep 1`; `sim_case.sh MODE EXPECT_RC EXPECT_ATTEMPTS` — запускає `retry_fast.sh` із заглушкою й повертає 0, лише якщо код виходу і число спроб збіглися з очікуваними. Симуляція доводить логіку циклу й те, що `timeout` обриває зависання; вона не доводить поведінку `playwright install --with-deps` на раннері GitHub — це покаже перший запуск `release.yml` із цим кроком (репетиція `v0.1.1`). Відомий нюанс: `timeout` завершує `pnpm`, але не гарантує чистого стану `apt` / `dpkg`; якщо `dpkg` лишився перерваним, друга спроба впаде, і крок завершиться помилкою за дві спроби (чесний провал, а не 20 хв очікування).

Валідатор етапу (`--stage 9 --run`) не запускався: після вердикту рев'юера (L-004).

**Валідатор після вердикту (гейт):**

```text
$ python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 9 --run   (19:00:17 – 19:00:26)
ℹ️  [INFO] Проскановано файлів: 228
✅ [PASS] Відкритих секретів не виявлено

=== Команди перевірки етапу 9 ===
ℹ️  [INFO] $ pnpm install --frozen-lockfile
✅ [PASS] Команда успішна: pnpm install --frozen-lockfile
ℹ️  [INFO] $ pnpm verify
✅ [PASS] Команда успішна: pnpm verify
ℹ️  [INFO] $ python -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml', encoding='utf-8'))"
✅ [PASS] Команда успішна: python -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml', encoding='utf-8'))"
ℹ️  [INFO] $ python -c "import re,sys; t=open('CHANGELOG.md',encoding='utf-8').read(); sys.exit(0 if re.search(r'^## \[0\.1\.0\]', t, re.M) else 1)"
✅ [PASS] Команда успішна: python -c "import re,sys; t=open('CHANGELOG.md',encoding='utf-8').read(); sys.exit(0 if re.search(r'^## \[0\.1\.0\]', t, re.M) else 1)"
ℹ️  [INFO] $ python -c "import re,sys; t=open('.agentic/specs/09-release-runbook.md',encoding='utf-8').read(); sys.exit(0 if re.search(r'^## 5\. Rollback', t, re.M) else 1)"
✅ [PASS] Команда успішна: python -c "import re,sys; t=open('.agentic/specs/09-release-runbook.md',encoding='utf-8').read(); sys.exit(0 if re.search(r'^## 5\. Rollback', t, re.M) else 1)"

УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

**Валідатор після вердикту (Revise №1):**

```text
$ python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 9 --run   (23:28:19 – 23:28:28)
=== Перевірка етапу: Stage 9 ===
ℹ️  [INFO] Реліз: версіонування, staging → production, rollback — скіл release-engineer
❌ [FAIL] Передумова Stage 8.a не схвалена (потрібно APPROVED_AND_COMMITTED / APPROVED_MANUAL_COMMIT / SKIPPED_APPROVED, фактично: WAITING_FOR_APPROVAL)
ℹ️  [INFO] Перевірка звіту: .agentic/reports/09-release-report.md
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 25 перевірок із кодами виходу
✅ [PASS] Карта технологій заповнена (6 рядків)
✅ [PASS] Conventional Commit у секції 7 валідний
✅ [PASS] Артефакт .agentic/specs/09-release-runbook.md знайдено
✅ [PASS] Артефакт CHANGELOG.md знайдено

=== Оракул (приймальні тести) — режим protect ===
✅ [PASS] Оракул незмінний від коміту етапу 6 (7b1f7fa2)

=== Правила якості коду: . ===
✅ [PASS] Перевірено файлів: 85, порушень-помилок немає

=== Сканування секретів: . ===
ℹ️  [INFO] Проскановано файлів: 228
✅ [PASS] Відкритих секретів не виявлено

=== Команди перевірки етапу 9 ===
ℹ️  [INFO] $ pnpm install --frozen-lockfile
✅ [PASS] Команда успішна: pnpm install --frozen-lockfile
ℹ️  [INFO] $ pnpm verify
✅ [PASS] Команда успішна: pnpm verify
ℹ️  [INFO] $ python -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml', encoding='utf-8'))"
✅ [PASS] Команда успішна: python -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml', encoding='utf-8'))"
ℹ️  [INFO] $ python -c "import re,sys; t=open('CHANGELOG.md',encoding='utf-8').read(); sys.exit(0 if re.search(r'^## \[0\.1\.0\]', t, re.M) else 1)"
✅ [PASS] Команда успішна: python -c "import re,sys; t=open('CHANGELOG.md',encoding='utf-8').read(); sys.exit(0 if re.search(r'^## \[0\.1\.0\]', t, re.M) else 1)"
ℹ️  [INFO] $ python -c "import re,sys; t=open('.agentic/specs/09-release-runbook.md',encoding='utf-8').read(); sys.exit(0 if re.search(r'^## 5\. Rollback', t, re.M) else 1)"
✅ [PASS] Команда успішна: python -c "import re,sys; t=open('.agentic/specs/09-release-runbook.md',encoding='utf-8').read(); sys.exit(0 if re.search(r'^## 5\. Rollback', t, re.M) else 1)"

ЗНАЙДЕНО ПОМИЛОК: 1
  • Передумова Stage 8.a не схвалена (потрібно APPROVED_AND_COMMITTED / APPROVED_MANUAL_COMMIT / SKIPPED_APPROVED, фактично: WAITING_FOR_APPROVAL)
EXIT=1
```

Єдина помилка — передумова етапу 8.a (`WAITING_FOR_APPROVAL`: сусідня сесія веде Revise 8.a, запит №8, гейт чекає власника). Усі перевірки самого етапу 9 пройдено. Прогін 2 після виконання передумови — нижче.

**Валідатор після вердикту, прогін 2 (Revise №1; етап 8.a — `APPROVED_AND_COMMITTED`, `35d8a3b`):**

```text
$ python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 9 --run
=== Перевірка етапу: Stage 9 ===
ℹ️  [INFO] Реліз: версіонування, staging → production, rollback — скіл release-engineer
✅ [PASS] Передумови схвалено: 8.a, 8.b
ℹ️  [INFO] Перевірка звіту: .agentic/reports/09-release-report.md
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 25 перевірок із кодами виходу
✅ [PASS] Карта технологій заповнена (6 рядків)
✅ [PASS] Conventional Commit у секції 7 валідний
✅ [PASS] Артефакт .agentic/specs/09-release-runbook.md знайдено
✅ [PASS] Артефакт CHANGELOG.md знайдено

=== Оракул (приймальні тести) — режим protect ===
✅ [PASS] Оракул незмінний від коміту етапу 6 (7b1f7fa2)

=== Правила якості коду: . ===
✅ [PASS] Перевірено файлів: 85, порушень-помилок немає

=== Сканування секретів: . ===
ℹ️  [INFO] Проскановано файлів: 228
✅ [PASS] Відкритих секретів не виявлено

=== Команди перевірки етапу 9 ===
ℹ️  [INFO] $ pnpm install --frozen-lockfile
✅ [PASS] Команда успішна: pnpm install --frozen-lockfile
ℹ️  [INFO] $ pnpm verify
✅ [PASS] Команда успішна: pnpm verify
ℹ️  [INFO] $ python -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml', encoding='utf-8'))"
✅ [PASS] Команда успішна: python -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml', encoding='utf-8'))"
ℹ️  [INFO] $ python -c "import re,sys; t=open('CHANGELOG.md',encoding='utf-8').read(); sys.exit(0 if re.search(r'^## \[0\.1\.0\]', t, re.M) else 1)"
✅ [PASS] Команда успішна: python -c "import re,sys; t=open('CHANGELOG.md',encoding='utf-8').read(); sys.exit(0 if re.search(r'^## \[0\.1\.0\]', t, re.M) else 1)"
ℹ️  [INFO] $ python -c "import re,sys; t=open('.agentic/specs/09-release-runbook.md',encoding='utf-8').read(); sys.exit(0 if re.search(r'^## 5\. Rollback', t, re.M) else 1)"
✅ [PASS] Команда успішна: python -c "import re,sys; t=open('.agentic/specs/09-release-runbook.md',encoding='utf-8').read(); sys.exit(0 if re.search(r'^## 5\. Rollback', t, re.M) else 1)"

УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

### 4.3. Вердикт незалежного аудиту (`independent-reviewer`)

**Рев'ю №1 (≈18:18, перше): BLOCKERS FOUND — виправлено.** Суть: сканер секретів запущено до останньої правки звіту (227 проти 228 файлів, L-002); рядки 4.0 з кодом 0 без блоку «команда, час, вивід, EXIT=» у 4.1 / 4.2 (L-004); збіг SHA дій і їхніх тегів нічим не доведено (для 4 нових дій). WARNING: другий гейт production залежить від налаштування власника (TD-032); відкат — перезбірка з `pnpm audit` (TD-033). Усе виправлено: сканер запущено останнім, блоки з `EXIT=` у 4.2, SHA ↔ теги (`gh api`), runbook, TD-032 і TD-033.

**Рев'ю №2 (18:25): PASS.**

```text
PASS — independent-reviewer, 2026-11-04 18:25, Stage 9, рев'ю №2 (повторне після першого рев'ю: 3 BLOCKER, 2 WARNING — виправлено; нижче — вердикт повторного рев'ю).
Межі етапу: 11 файлів етапу (release.yml, CHANGELOG.md, cliff.toml, 09-release-runbook.md, package.json, pnpm-lock.yaml, project.json — лише verify_commands["9"], backlog.md, tech-debt.md, 09-release-report.md, pipeline-state.md) збігаються з git status і секцією 7. 4 файли 01/02 мають порожній git diff HEAD --stat (лише закінчення рядків) і в коміт не йдуть. Код продукту, тести, e2e/, ci.yml, специфікації 01–08 і ADR не змінені. Секція 7: явний git add 11 файлів, ci(stage-9) — тип із commit_types.
Секрети: verify-gate.py --scan-secrets . — 228 файлів, 0. У release.yml і runbook секретів немає (лише `id-token: write`, OIDC).
Залежності: 1 нова пряма — git-cliff 2.14.2 (npm view: існує, github.com/orhun/git-cliff, створено 2023-01-09, install-скриптів немає); транзитивні — execa 9.6.1 і його залежності, платформні git-cliff-* як optional; tarball-URL на сторонні хости в lockfile немає. Згода власника — в трекері.
Правила якості: --stage 9 (--check-code .) — 85 файлів, 0 помилок. Оракул незмінний. Контракт: не застосовно — has_http_api: false.
Workflow: 10 з 10 uses: закріплені за SHA; contents: read за замовчуванням, pages / id-token: write лише в deploy; тег — через env і SemVer; cache: pnpm прибрано; збірка один раз, smoke і deploy беруть той самий артефакт.
Повторний запуск рев'юера: pnpm verify — 16 файлів, 268 passed, NFR-5 106.10 kB, код 0; 3 команди python -c з verify_commands["9"] — код 0; git log origin/main..HEAD — 30 комітів; dist — 62 файли. Не повторено (хук read-only, інші причини): встановлення за lockfile, --debt, SHA дій ↔ теги (gh api), відтворюваність збірки, preview + curl.
Трасування: ADR 0003 «Публікація» — release.yml; «Відкат», NFR-12 — runbook розділ 5, репетиція відкрита; NFR-15 — за документами; NFR-8/9 — SHA дій і pnpm audit; BUG-012 і BUG-010 — Fixed, не Verified, рішення власника в трекері; TD-032 і TD-033 — у реєстрі.
Знахідки: 0 BLOCKER, 0 WARNING, 7 INFO. Після вердикту автор виправив: рядок «Реліз-кандидат» (команда й EXIT=), рядок «Git» у секції 1, час шапки, `ref: refs/tags/…` у release.yml (YAML і закріплення SHA повторено), текст CHANGELOG («Перший випуск»). Не виправлено свідомо (INFO): `CI: ""` у job smoke вимикає `forbidOnly` і ретраї Playwright — ризик закриває зелений ci.yml перед тегом (runbook 4.4); скрипт `pnpm changelog` без `--tag` — у runbook дана повна команда.
```

**Revise №1, рев'ю №1 (23:18 – 23:19, за часом запуску vitest рев'юера 23:18:33): BLOCKERS FOUND — виправлено.** Суть: (1) `ci.yml` — основний CI-workflow етапу 5, поза зоною етапу 9 (L-009): правки `ci.yml` скасовано (`git restore`), прогалину винесено в TD-035 з етапом-власником 5; (2) runbook подавав `origin/main` = `9438300`, фактично `b6c56c2` (коміт `9438300` не запушено) — виправлено; (3) рядки 4.0 «закріплення дій» і «цикл повтору» без `EXIT=`, негативний контроль у рядку з кодом 0 (L-004) — команди з `EXIT=` у 4.2, негативний контроль (`EXIT=1`) перенесено в 4.1, скрипти симуляції описано; (4) статус 8.a у секції 6 застарів (`REJECTED_REVISING` → `WAITING_FOR_APPROVAL`) і блок гейту не пояснював, що `--stage 9 --run` потребує закритого гейта 8.a — виправлено. WARNING: межа 3 хв не витримає повільного, але успішного встановлення → TD-036; «2 з 2 прогонів» рахувало один job двічі (спроби 2 і 3) → «один прогін». INFO: 6,4 / 6,5 хв узгоджено (6,5 хв); дату закриття TD-034 прив'язано до прогону 23:22; права workflow, env-передачу тега, закріплення SHA і твердження «код = 0.1.0» рев'юер підтвердив.

**Revise №1, рев'ю №2 (23:26): PASS.**

```text
PASS — independent-reviewer, 2026-11-04 23:26 (час з виводу vitest «Start at 23:25:48»), Stage 9, Revise №1, рев'ю №2 (повторне після рев'ю №1 Revise: 4 BLOCKER, 2 WARNING — виправлено).
Межі етапу: 6 файлів Revise (release.yml, CHANGELOG.md, 09-release-runbook.md, tech-debt.md, 09-release-report.md, pipeline-state.md) збігаються з git status і git add секції 7.3; усі в зоні етапу 9 або завжди дозволені. ci.yml і код застосунку не змінені: git diff --stat v0.1.0 -- .github/workflows/ci.yml src public index.html vite.config.js package.json pnpm-lock.yaml — порожній. Файли .agentic/qa/**, 08-test-plan.md, 08a-* — сусідня сесія 8.a (WAITING_FOR_APPROVAL), у 7.3 не входять; 4 файли 01/02 — порожній git diff HEAD --stat. pipeline-state.md містить і записи 8.a — розкрито в секції 6 і в п. 3 блоку гейту.
Секрети: verify-gate.py --stage 9 (вбудоване --scan-secrets .) — 228 файлів, 0 секретів; у release.yml, runbook і CHANGELOG лише OIDC `id-token`.
Залежності: нових немає (package.json і pnpm-lock.yaml = v0.1.0).
Правила якості: --stage 9 (--check-code .) — 85 файлів, 0 помилок; оракул незмінний від 7b1f7fa2. Контракт: не застосовно — has_http_api: false.
Workflow: 10 з 10 uses: закріплені за SHA; крок «Install browsers for smoke» — timeout-minutes: 8, 2 спроби timeout --kill-after=10s 3m, найгірший випадок 390 с = 6,5 хв < 8 хв; таймаути jobs і права не змінені.
Повторний запуск рев'юера: pnpm verify — 16 файлів, 268 passed, NFR-5 106.10 kB gzip, код 0; python -c «## [0.1.0]» і «## 5. Rollback» — код 0; «## [0.1.1]» є в CHANGELOG; git rev-parse: origin/main = v0.1.0^{commit} = b6c56c2, HEAD = 9438300. Не повторено (хук read-only або поза репозиторієм): --debt, git-cliff --version, симуляція циклу, gh api, стан production.
Трасування: ADR 0003 «Публікація» — release.yml, production v0.1.0; «Відкат» / NFR-12 — runbook 5, 9.6, репетиція відкрита й чекає згод власника; TD-034 закрито за локальною перевіркою; TD-035 (етап 5) і TD-036 — відкриті, ризик не прийнято (L-003); TD-033 — ризик прийнято власником 19:10 (трекер, розділ 4).
Знахідки: 0 BLOCKER, 0 WARNING, 6 INFO.
```

---

## 5. Матриця трасування вимог (Requirements Traceability)

| ID вимоги | Вимога | Де реалізовано | Чим перевірено | Статус |
| :--- | :--- | :--- | :--- | :--- |
| ADR 0003 «Публікація» | Збирається один раз, публікується той самий артефакт; `pages: write`, `id-token: write`, середовище `github-pages` | `.github/workflows/release.yml` (build → smoke → deploy) | розбір YAML, закріплення SHA, відтворюваність збірки (4.2); запуск у CI: run 41887573401 — build, smoke, deploy, verify-production success | ✅ Виконано (production `v0.1.0`, 2026-11-04 22:57) |
| ADR 0003 «Відкат» | Повторний запуск workflow на попередньому коміті, RTO ≤ 15 хв | `release.yml` (`workflow_dispatch` з тегом), runbook розділ 5 | документ; бюджет RTO (машинний час ≈ 3 хв за run 41887573401, 4.1); протокол репетиції — runbook 9.6 | ⏳ Репетиція не проведена: чекає згод власника (секція 6) |
| ADR 0003 «Confirmation» (етап 9) | URL повертає 200 і HTML з назвою; Enforce HTTPS; відкат перевірено | job `verify-production`, runbook 9.2 | `v0.1.0`: `verify-production` success, `/` — 200, `version.json` = `v0.1.0` / `b6c56c2`, `https_enforced: true` (перевірено 23:13); відкат — не перевірено | ✅ Production · ⏳ Відкат |
| NFR-12 | Відкат ≤ 15 хв | runbook розділ 5, 9.6; `timeout-minutes` і повтор у `release.yml` (TD-034) | документ; симуляція повтору (4.1 / 4.2); вимір — репетиція | ⏳ Репетиція (RTO не виміряно) |
| NFR-15 / бриф §13 | $0 на місяць | runbook розділ 8; публічний репозиторій, безкоштовні runner-и й Pages | ADR 0003, розділ 10 архітектури; метод NFR — огляд налаштувань GitHub (Pages, Actions) перед релізом | ✅ За документами; огляд налаштувань — перед тегом |
| NFR-8, NFR-9 | HTTPS, CSP; пакети перевірені; ланцюг постачання | `release.yml` (SHA дій), `pnpm audit --audit-level high` у `build`, `git-cliff` перевірено в реєстрі (`npm view`) | `--debt` 7 аспектів, секція 4.1 | ✅ Виконано |
| NFR-12 / надійність релізу (Revise №1, TD-034) | Крок без власної межі не має з'їдати час відкату | `release.yml` (`timeout-minutes: 8`, 2 × 3 хв) | норма й викид із історії прогонів (4.1); симуляція циклу (4.2) | ✅ Локально · ⏳ Перший запуск на раннері |
| Надійність CI (TD-035, TD-036) | Така сама межа для `ci.yml`; повільне успішне встановлення в `smoke` | `ci.yml` — етап 5 (не змінено); `release.yml` — спроба 3 хв | дані прогонів (4.1) | ⏳ Відкрито: TD-035 (етап 5), TD-036 |
| NFR-1, NFR-3, NFR-5 (регрес) | Свіжість, ліміти запитів, розмір бандла | код етапу 7 без змін; `pnpm verify` | 268 passed, JS 106,10 кБ | ✅ Виконано |
| G-2 / US-1 – US-9 | Продукт доступний знайомим за посиланням | `CHANGELOG.md` «[0.1.0]», backlog `Done` | production `v0.1.0` 22:57 (run 41887573401), 200 + `version.json` | ✅ Опубліковано |

---

## 6. Ризики, технічний борг і відкриті питання

Технічний борг живе в `.agentic/tech-debt.md` (TD-001 – TD-036); етап 9 додав TD-032 і TD-033 (первинний гейт), TD-034 (Revise №1, закрито), TD-035 і TD-036 (Revise №1, відкрито). Стан — на 2026-11-04 23:15; рядки первинного гейту про push, CI, Pages і перший запуск виконані (трекер, розділ 4, записи 19:55 – 22:57).

| Тип | Опис | Вплив | Що пропонується | Власник рішення |
| :--- | :--- | :--- | :--- | :--- |
| Рішення власника | Зміст `v0.1.1`: **рішення власника 2026-11-05 00:03 — «v0.1.1 = workflow»**: лише зміцнення workflow (TD-034), runbook і CHANGELOG; код застосунку = `v0.1.0`, production-артефакт відрізняється від `v0.1.0` лише `version.json`. Це рішення про зміст, а не згода на коміт, push, тег чи деплой | Низький | Виконано в розділі «[0.1.1]» CHANGELOG; жодних змін коду | Власник продукту |
| Рішення власника | Після репетиції production лишити на `v0.1.0` (**рішення власника 2026-11-05 00:08: «вміст ідентичний, на один деплой менше»**); тег `v0.1.1` залишається в git | Низький | Другий деплой після відкату не потрібен | Власник продукту |
| Дії власника для репетиції (кожна окремо) | (а) «Approve & закоміть» цього Revise; (б) `git push origin main` (двох комітів: `9438300` і коміт Revise); (в) зелений CI; (г) тег `v0.1.1` і `git push origin v0.1.1`; (д) фраза `HUMAN ACCEPTANCE: ACCEPTED. ДОЗВОЛЯЮ PRODUCTION DEPLOYMENT.` і власне натискання Approve and deploy для `v0.1.1`; (е) запуск Release → Run workflow з `tag=v0.1.0`; (ж) нова фраза й Approve and deploy для відкату; (з) рішення «куди після репетиції». Фраза для `v0.1.0` на (д) і (ж) не поширюється | Високий (production) | Кроки (г) – (з) виконуються лише після окремої згоди; результат — у runbook 9.4 / 9.6, цей звіт і трекер (наступний коміт `docs(stage-9): record rollback rehearsal`) | Власник продукту |
| Ризик | Новий крок із `timeout` у `release.yml` ще не виконувався на раннері GitHub (локально — розбір YAML і симуляція стабом). Якщо `timeout --kill-after` або повтор поводяться інакше, `smoke` впаде на кроці встановлення браузерів — видно одразу, production не зачіпається | Низький | Перший реальний запуск — тег `v0.1.1`; червоний `smoke` — діагностика, а не обхід | Скіл етапу 9 |
| Борг | TD-035: у `ci.yml` (файл етапу 5) такі самі кроки `playwright install` без `timeout-minutes`; успішний максимум 708 с. Етап 9 файл не змінює (L-009) | Низький | **рішення власника 2026-11-05 00:08: «лишити до спринту 2»**; статус лишається «відкрито» | Власник продукту |
| Борг | TD-036: спроба 3 хв × 2 у `release.yml` розрахована на зависання; повільне, але успішне встановлення (клас 708 с) вичерпає обидві спроби за ≈ 6,5 хв, і `smoke` / відкат потребуватиме ручного `gh run rerun --failed`. Виміряна норма релізного кроку — лише один прогін (41 с) | Низький – середній | Після репетиції звірити фактичну тривалість; за потреби спроба 5 хв (крок 12 хв); **рішення власника 2026-11-05 00:08: «переглянути після репетиції за фактичною тривалістю кроку»**; ризик не прийнято (L-003) | Власник продукту |
| Ризик | `.agentic/pipeline-state.md` містить незакомічені записи сусідньої сесії Revise 8.a (запит №8: записи 23:04, 23:14, 23:30, 00:03, рядок 8.a = `APPROVED_AND_COMMITTED` з комітом `35d8a3b`) і координатора; коміт цього Revise з файлом трекера захопить і їх | Середній | Трекер комітиться разом з комітом етапу 9 лише за командою власника; без неї не комічу | Власник продукту |
| Борг | TD-033: відкат — перезбірка з `pnpm audit --audit-level high`. На 23:11 audit: 0 high / critical (2 moderate = TD-001), lockfile `v0.1.0` = поточному — відкат не заблоковано; принциповий ризик лишається (ризик прийнято 19:10, спринт 2) | Низький – середній | Репетиція покаже реальний час | Власник продукту |
| Дефект | BUG-012 (Critical) і BUG-010 (Major): перевірено власником на Safari 19:00; статуси `Verified` переведено сусідньою сесією Revise 8.a (запит №8, рішення власника 23:30; зона 8.a, L-009) закомічено `35d8a3b` (2026-11-05 00:00) — у цьому Revise ці файли не змінювались | Низький | Revise 8.a | Скіл 8.a / власник продукту |
| Борг | TD-027, TD-028, TD-029 — відкриті, ризик прийнято власником 19:10, спринт 2. TD-001 (2 moderate у dev-інструменті) — відкрито | Низький | Спринт 2 | Власник продукту |
| Питання | `/.well-known/security.txt` не додано: потрібен контакт власника; до того — issues репозиторію | Низький | Додати у спринті 2 за контактом власника | Власник продукту |
| Питання | Зовнішній uptime-моніторинг не створено | Низький | Власник створює безкоштовний сервіс за runbook розділ 6 | Власник продукту |
| Процес | `release.yml` додає `dist/version.json` (публічний файл із версією й SHA коміту) | Низький | Рішення затвердженого плану етапу; чутливих даних немає | Скіл етапу 9 |
| Процес | Передумова валідатора (етап 8.a схвалено) виконана: 8.a — `APPROVED_AND_COMMITTED`, коміт `35d8a3b`, схвалення власника записано в розділі 4 трекера (2026-11-05 00:03, координатор). Прогін 1 валідатора (23:28, код 1) і прогін 2 (код 0) — 4.2 | Низький | — | Власник продукту |
| Процес | Інші мережеві кроки (`pnpm install`, `pnpm audit`, завантаження дій) покриті лише таймаутом job: 20 хв у `build` і `smoke` | Низький | Зменшення таймаутів jobs — рішення власника (не борг TD-034) | Власник продукту |

### 6.1. Карта технологій для самостійного опанування

| Технологія / Інструмент / Патерн | Рівень опанування | Ключові концепції | Офіційне першоджерело |
| :--- | :--- | :--- | :--- |
| SemVer і Conventional Commits | **Розуміти** | `MAJOR.MINOR.PATCH`; `fix` → PATCH, `feat` → MINOR, `!` / `BREAKING CHANGE` → MAJOR; `0.y.z` для MVP; опублікований тег незмінний | https://semver.org/lang/uk/ · https://www.conventionalcommits.org/uk/ |
| GitHub Pages через GitHub Actions і захищені середовища | **Вміти** | `configure-pages` → `upload-pages-artifact` → `deploy-pages`; права `pages: write`, `id-token: write`; середовище `github-pages` з required reviewers | https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages · https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment |
| Один артефакт — багато кроків (build once, promote) | **Розуміти** | артефакт збирається один раз і несе версію; smoke на тому самому артефакті; відкат = повторний деплой попереднього тегу | https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts |
| Закріплення дій за SHA й least privilege | **Знати** | `uses: <repo>@<40-символьний SHA>`; `permissions` за замовчуванням `contents: read`; вхід через змінні середовища | https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions |
| Таймаути та повтор кроків GitHub Actions | **Розуміти** | `timeout-minutes` на кроці й на job; межа має бути вищою за спостережуваний успішний максимум; `timeout --kill-after` у shell для повтору; повтор лікує зависання, але не повільний крок | https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions |
| Keep a Changelog і `git-cliff` | **Знати** | розділи Added / Changed / Fixed; генерація з комітів; `--prepend` для нових версій | https://keepachangelog.com/uk/1.1.0/ · https://git-cliff.org/docs/ |

---

## 7. Точка фіксації в Git (Recommended Git Commit Checkpoint)

### 7.1. Список файлів для індексації (`git status --short`)

```text
?? .github/workflows/release.yml
?? CHANGELOG.md
?? cliff.toml
?? .agentic/specs/09-release-runbook.md
 M package.json
 M pnpm-lock.yaml
 M .agentic/project.json
 M .agentic/backlog.md
 M .agentic/tech-debt.md
?? .agentic/reports/09-release-report.md
 M .agentic/pipeline-state.md
```

Файли `.agentic/reports/01-*`, `02-*`, `.agentic/specs/01-*`, `02-*` (лише закінчення рядків) у коміт не йдуть.

### 7.2. Явна індексація та коміт (Conventional Commits)

```bash
git add -- .github/workflows/release.yml CHANGELOG.md cliff.toml .agentic/specs/09-release-runbook.md package.json pnpm-lock.yaml .agentic/project.json .agentic/backlog.md .agentic/tech-debt.md .agentic/reports/09-release-report.md .agentic/pipeline-state.md
git commit -m "ci(stage-9): add release workflow, changelog and rollback runbook"
```

---

### 🛑 Рішення власника продукту (Human Approval Gate) — первинний гейт 2026-11-04 19:00 (виконано, коміт `d0241ce`)

**На цьому гейті:**

1. Схвалити артефакти етапу 9: `release.yml`, `CHANGELOG.md` (`v0.1.0`), `cliff.toml`, runbook, `git-cliff` як devDependency, `verify_commands["9"]`, backlog, борги TD-032 і TD-033 (відкриті, ризик не прийнято).
2. Перевірка реліз-кандидата на iPhone Safari (BUG-012, BUG-010): власник — «ПЕРЕВІРИВ ВСЕ ОК» (2026-11-04 19:00); перехід BUG-012 і BUG-010 у `Verified` — у наступному Revise 8.a (зона 8.a).
3. Рішення про публікацію інкремента: публікуємо `v0.1.0` чи лишаємо локальним (спринт кількох інкрементів). Якщо публікуємо — кроки лише з вашої окремої згоди кожен: `git push origin main` (30 комітів історії), зелений CI, налаштування Pages і середовища `github-pages`, тег `v0.1.0`, схвалення production (фраза «HUMAN ACCEPTANCE: ACCEPTED. ДОЗВОЛЯЮ PRODUCTION DEPLOYMENT.» і Review deployments у GitHub).

- [x] **Approve & закоміть** — статус `APPROVED_AND_COMMITTED`: агент оновлює `.agentic/pipeline-state.md`, позначає цей чекбокс, виконує явний `git add` і `git commit`.
- [ ] **Approve без коміту** — статус `APPROVED_MANUAL_COMMIT`: власник комітить самостійно.
- [ ] **Revise** — статус `REJECTED_REVISING`: зауваження нижче, етап повертається на Фазу 3.
- [ ] **Пропусти етап 9** + причина — статус `SKIPPED_APPROVED`: релізу не буде.

**Коментарі / Зауваження:**
> 2026-11-04 19:00: власник — перевірка на iPhone Safari «ПЕРЕВІРИВ ВСЕ ОК»; «закомітити артефакти» (APPROVED_AND_COMMITTED). Push, тег і production — окремо з згоди власника (TD-032, TD-033 і TD-027 – TD-029 відкриті, ризик не прийнято).

---

### 7.3. Revise №1 (запит на зміну №9): файли й коміт

```text
 M .github/workflows/release.yml
 M CHANGELOG.md
 M .agentic/specs/09-release-runbook.md
 M .agentic/tech-debt.md
 M .agentic/reports/09-release-report.md
 M .agentic/pipeline-state.md
```

Файли `.agentic/reports/01-*`, `02-*`, `.agentic/specs/01-*`, `02-*` (лише закінчення рядків) і `.agentic/qa/**` (сесія Revise 8.a) у цей коміт не йдуть. У `.agentic/pipeline-state.md` є також записи сесії Revise 8.a (див. секцію 6).

```bash
git add -- .github/workflows/release.yml CHANGELOG.md .agentic/specs/09-release-runbook.md .agentic/tech-debt.md .agentic/reports/09-release-report.md .agentic/pipeline-state.md
git commit -m "ci(stage-9): add step timeouts for browser install and plan rollback rehearsal"
```

### 🛑 Рішення власника продукту (Human Approval Gate) — Revise №1

**На цьому гейті:**

1. Схвалити зміни Revise №1: таймаут і повтор кроку встановлення браузерів у `release.yml`, TD-034 (закрито за локальною перевіркою), TD-035 і TD-036 (відкриті, ризик не прийнято — потрібне ваше рішення), оновлений runbook (журнали релізів та інцидентів, протокол 9.6), розділ «[0.1.1]» CHANGELOG.
2. Відповісти на питання: зміст `v0.1.1` (пропозиція — лише зміцнення workflow; код = `v0.1.0`) і куди після репетиції (рекомендація — лишити на `v0.1.0`).
3. Гейт 8.a закрито (коміт `35d8a3b`), передумова валідатора виконана; трекер (з записами обох сесій) комітиться разом з комітом етапу 9 лише за вашою командою.
4. Репетицію відкату (пункт 9.4 — відкрито) виконувати лише крок за кроком, кожен — окрема згода (секція 6); production-деплої — тільки з окремою фразою «HUMAN ACCEPTANCE: ACCEPTED. ДОЗВОЛЯЮ PRODUCTION DEPLOYMENT.» і власним Approve and deploy у GitHub.

- [x] **Approve & закоміть** — статус `APPROVED_AND_COMMITTED`: агент оновлює `.agentic/pipeline-state.md`, виконує явний `git add` і `git commit` за списком 7.3.
- [ ] **Approve без коміту** — статус `APPROVED_MANUAL_COMMIT`: власник комітить самостійно.
- [ ] **Revise** — статус `REJECTED_REVISING`: зауваження нижче.
- [ ] **Пропусти** — не застосовується: етап 9 уже виконано, `v0.1.0` у production.

**Коментарі / Зауваження:**
> 2026-11-05 00:03: власник — «v0.1.1 = workflow» (зміст v0.1.1 вирішено). Коміт, push, тег, деплої, рішення «куди після репетиції», TD-035 і TD-036 — ще чекають.
> 2026-11-05 00:08: власник — «Коміт Revise: … вже після цього репетиція відкату» (коміт Revise схвалено; push, тег, деплої і фрази HUMAN ACCEPTANCE — окремо); «вміст ідентичний, на один деплой менше» (production лишається на v0.1.0 після репетиції); TD-035 — «лишити до спринту 2»; TD-036 — «переглянути після репетиції за фактичною тривалістю кроку».
