# Фінальний звіт етапу: Stage 9: Реліз: версіонування, staging → production, rollback

- **Етап:** `Stage 9: Реліз: версіонування, staging → production, rollback`
- **Відповідальний скіл:** `release-engineer`
- **Дата формування:** `2026-11-04 18:27` (первинний гейт); Revise етапу 9 №1 — `2026-11-04 23:25`; результати репетиції відкату — `2026-11-05 01:54`
- **Статус аудиту independent-reviewer:** `PASS` (документація репетиції відкату: рев'ю №7 — PASS 2026-11-05; зауваження рев'ю №3 – №6 виправлено; коміт `99a5987` мав PASS рев'ю №2; історія — 4.3)

---

> **Revise етапу 9 №1 (запит на зміну №9, трекер, розділ 4, 2026-11-04 23:05).** Запит: (1) таймаут і повтор кроку встановлення браузерів у `release.yml` (TD-034) та перевірка `ci.yml` на ту саму прогалину (результат — TD-035: `ci.yml` належить етапу 5, тож етап 9 його **не змінює**); (2) репетиція відкату `v0.1.1` → `v0.1.0` (пункт 9.4 runbook); (3) оновлення runbook, CHANGELOG, звіту. Текст секцій нижче до блоків «**Revise №1**» описує **первинний гейт 18:27 (до push, тегу й деплою)** і лишений для трасування; поточний стан — у блоках «Revise №1» кожної секції та в секції 6. Рядки 4.0 без префікса «Revise №1» отримані на первинному гейті (коміт `d0241ce` і раніше, 18:10 – 19:00) і в цьому проході не повторювались. **Станом на 2026-11-05 01:35 репетиція відкату проведена** (4.1, runbook 9.6): `v0.1.1` випущено й відкочено на `v0.1.0` з другої спроби; перша спроба (`--ref main`) виявила дефект відкату (TD-037). Зовнішні дії цього проходу (push, тег `v0.1.1`, запуски Release, два production-деплої) виконано за окремими командами власника.

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
| Зовнішні дії | лише з окремої згоди | станом на 23:05 – 23:15: не виконувались; **пізніше виконано за окремими командами власника** (push, тег `v0.1.1`, два production-деплої, відкат) — див. 4.1 | — | Виконано | ✅ Див. 4.1 |


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
| Таймаут `smoke` | Лишити таймаут job 20 хв | Окремий `timeout-minutes` на мережевих кроках, значення — з виміряної норми | Крок «Install browsers for smoke»: `timeout-minutes: 8`. Норма — 41 с (**один** успішний прогін: спроби 2 і 3 запуску 41887573401 — той самий запис job), зависання — 1200 с. Межа на кроці не дає зависанню з'їсти RTO відкату (NFR-12, ≤ 15 хв). Вибірка була мала — у репетиції зафіксовано викид 350 с, див. TD-036. |
| Повтор | Ручний `gh run rerun --failed` | Автоматичний повтор кроку з власною межею спроби | Цикл у shell: 2 спроби по `timeout --kill-after=10s 3m` (≈ 4× норми); найгірший випадок 2 × (180 + 10) + 2 × 5 = 390 с = 6,5 хв < 8 хв кроку. Без стороннього action (нова залежність і SHA не потрібні). Перевірено стабом (4.1 / 4.2). Повільне, але успішне встановлення спробу 3 хв не витримає — TD-036. |
| `ci.yml` | Додати таймаути в тому ж проході | Файл змінює його етап-власник (L-009) | Така сама прогалина є (два кроки `playwright install` без `timeout-minutes`), але основний CI-workflow належить етапу 5 (скіл `release-engineer`, «Межі етапу»). Етап 9 `ci.yml` **не змінює**; прогалина й пропонована правка (5 хв для Chromium, 15 хв для трьох браузерів — запас над 708 с) записані як TD-035 для Revise етапу 5. |
| Зміст `v0.1.1` | Порожній тег | Реліз з осмисленою зміною | Пропонується: зміцнення workflow (TD-034) + runbook + CHANGELOG; код застосунку = `v0.1.0` (`git diff` порожній). **Вирішено власником 2026-11-05 00:03: «v0.1.1 = workflow»** (секція 6). |
| Куди після репетиції | Повернути на найновіший тег | Мінімум production-змін | Рекомендація — лишити production на `v0.1.0` (вміст ідентичний, на один деплой із фразою менше); **вирішено власником 2026-11-05 00:08** (секція 6). |


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
- [`.agentic/tech-debt.md`](../tech-debt.md) — новий `TD-034` (закрито в цьому ж запиті), `TD-035` (прогалина в `ci.yml`, етап-власник 5, відкрито), `TD-036` (повільне успішне встановлення в `release.yml`; доповнено викидом 350 с, відкрито), `TD-037` (відкат з `--ref main` не замінює сайт, відкрито) і рядок «Оновлення». Рішення власника 2026-11-05: TD-036 і TD-037 — спринт 2.
- [`.agentic/specs/09-release-runbook.md`](../specs/09-release-runbook.md) — актуальний стан репозиторію й production, PATCH для змін лише CI, перевірка Pages перед тегом, бюджет RTO, журнал інцидентів (3 записи), журнал релізів (`v0.1.0` у production; `v0.1.1` випущено й відкочено 2026-11-05), протокол і результат репетиції відкату 9.6.
- [`CHANGELOG.md`](../../CHANGELOG.md) — розділ «[0.1.1] — 2026-11-05» і розділ «[Unreleased]» (правило відкату з `--ref <тег>`, TD-037).
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
| **Revise №1 (репетиція):** відкат v0.1.1 → v0.1.0 | `gh workflow run release.yml --ref v0.1.0 -f tag=v0.1.0` (run 41928801119; спроба 1 з `--ref main`, run 41925323402, не відкотила) | 0 | `version.json` після відкату = `v0.1.0` / `b6c56c2`, `verify-production` success; RTO машинний 8 хв 13 с, очікування власника 34 хв 15 с, загальний 42 хв 28 с | ні | 2026-11-05 00:50:53 – 01:33:21 (22:50:53 – 23:33:21 UTC); вивід і розбивка — 4.1; первинний гейт 19:00 (історія): не запускалась — попередньої версії не було |
| **Revise №1:** розбір `release.yml` | `python -c "import yaml; …safe_load(open('.github/workflows/release.yml'))"` | 0 | 4 jobs; один крок із `timeout-minutes` (8, job 20) | ні | 23:22:16; вивід і `EXIT=` — 4.2 |
| **Revise №1:** закріплення дій у `release.yml` | `grep -c 'uses: .*@[0-9a-f]\{40\}' .github/workflows/release.yml` | 0 | 10 закріплених; друга перевірка (0 незакріплених) — у 4.2 | ні | 23:22:16; вивід і `EXIT=` — 4.2 |
| **Revise №1:** `ci.yml` і код не змінено | `git diff --quiet v0.1.0 -- .github/workflows/ci.yml`; `git diff --quiet v0.1.0 -- src public index.html vite.config.js package.json pnpm-lock.yaml` | 0 | обидва diff порожні | ні | 23:22:16; вивід і `EXIT=` — 4.2 |
| **Revise №1:** сценарії циклу повтору, що мають пройти (стаб `pnpm`) | `./sim_case.sh ok 0 1 && ./sim_case.sh fail_then_ok 0 2 && ./sim_case.sh hang_then_ok 0 2` | 0 | успіх → 1 спроба; збій → 2 спроби, exit 0; зависання → 2 спроби, exit 0 | ні | 23:22:17; вивід і `EXIT=` — 4.2; симуляція, а не запуск у CI |
| **Revise №1:** команди етапу 9 (`python -c`) | 3 команди з `verify_commands["9"]`, розділ «[0.1.1]», `git-cliff --version` | 0 | розбір YAML, «[0.1.0]», «[0.1.1]», `## 5. Rollback`, git-cliff 2.14.2 — усі 0 | ні | 23:22:17; вивід і `EXIT=` — 4.2; ті самі команди — у `--stage 9 --run` |
| **Revise №1:** гейт готовності | `pnpm verify` | 0 | 16 файлів, 268 passed; NFR-5: 106,10 кБ gzip | ні | 23:11; після нього змінювались лише документи; повторюється у `--stage 9 --run` |
| **Revise №1:** виміряний борг | `python .agentic/bundle/skills/gate-check/verify-gate.py --debt` | 0 | 8 команд PASS, `debt_commands`: 7 аспектів; `pnpm audit --audit-level high`: 2 moderate (TD-001), 0 high / critical | ні | 23:13:11 – 23:14:24; вивід — 4.1 |
| **Revise №1:** сканер секретів | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --scan-secrets .` | 0 | 228 файлів, 0 секретів | так (у складі `--stage 9`) | 2026-11-04 23:29:01; запущено останнім, після правок трекера й звіту (L-002); у вердикті рев'ю №2 — 228 файлів, 0; гейт коміту `99a5987` (2026-11-04 23:26 – 2026-11-05 00:02), у проході 7.4 не повторено |
| **Revise №1:** валідатор етапу | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 9 --run` | 0 | усе PASS: звіт, 25+ рядків «Валюти довіри», оракул, 85 файлів коду, 228 файлів без секретів, 5 команд етапу; передумова 8.a — `APPROVED_AND_COMMITTED` (`35d8a3b`) | ні | 2026-11-05 00:02:09 – 00:02:18, після вердикту PASS (L-004); вивід — 4.2, «прогін 2». Прогін 1 (2026-11-04 23:28, код 1 через передумову 8.a) — 4.2; гейт коміту `99a5987` (2026-11-04 23:26 – 2026-11-05 00:02), у проході 7.4 не повторено |
| **Revise №1:** вердикт рев'юера | субагент `independent-reviewer` | 0 | рев'ю №2 — PASS (0 BLOCKER, 0 WARNING, 6 INFO); рев'ю №1 — BLOCKERS FOUND (4 BLOCKER, 2 WARNING), виправлено | так (verify, команди етапу 9, `git diff`, `git rev-parse`) | 23:26; вердикт — 4.3; INFO виправлено автором після вердикту (заголовок §8 runbook, 22:57, час рев'ю №1, примітка про рядки первинного гейту); рев'ю №3 – №5 того самого Revise (документація репетиції) — BLOCKERS FOUND, виправлено, див. 4.3; гейт коміту `99a5987` (2026-11-04 23:26 – 2026-11-05 00:02), у проході 7.4 не повторено |
| **Revise №1 (репетиція):** сканер секретів | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --scan-secrets .` | 0 | 228 файлів, 0 секретів | так (у складі `--stage 9`) | 2026-11-05 02:01:40; запущено останнім, після всіх правок звіту й трекера (L-002) |
| **Revise №1 (репетиція):** валідатор етапу | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 9 --run` | 0 | усе PASS: звіт, 28 рядків «Валюти довіри», оракул, 85 файлів коду, 228 файлів без секретів, 5 команд етапу; передумова 8.a — `APPROVED_AND_COMMITTED` | ні | 2026-11-05 02:01:08 – 02:01:30, після вердикту PASS рев'ю №7 (L-004); вивід — 4.2, «прогін 3» |
| **Revise №1 (репетиція):** вердикт рев'юера | субагент `independent-reviewer` | 0 | рев'ю №7 — PASS (0 BLOCKER, 0 WARNING, 4 INFO); рев'ю №3 – №6 — BLOCKERS FOUND, виправлено | так (`pnpm verify`, `git diff`, `rg` по вердиктах, сканер) | 2026-11-05 ≈02:00; вердикт — 4.3; INFO виправлено автором після вердикту |

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

Висновки: норма двох браузерів у релізному `smoke` — 41 с на момент написання (стан 2026-11-04 23:22: один прогін); у репетиції додалися 48 с (run 41924336490 і 41925323402) і викид 350 с (run 41928801119, workflow `v0.1.0`) → спроба 3 хв (≈ 4× норми) виявилась замалою (TD-036); повільне, але успішне встановлення (клас 708 с, який бачили лише в CI із трьома браузерами) спробу 3 хв не витримає — TD-036. Для `ci.yml` (TD-035) норма Chromium 19 – 21 с, трьох браузерів 117 с, успішний максимум 708 с — межа має бути вищою за 708 с. Машинний час релізного запуску ≈ 3 хв (31 + 90 + 45 + 3 с без черг) — бюджет RTO ≤ 15 хв (NFR-12) за нормою лишав би ≈ 12 хв на схвалення власника; у репетиції машинний час був 8 хв 13 с, очікування власника — 34 хв 15 с (таблиця вище).

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

Відкат на `v0.1.0` станом на 2026-11-04 23:11 не блокується аудитом (TD-033; репетиція 2026-11-05 це підтвердила — `build` з `pnpm audit` пройшов): `pnpm-lock.yaml` і `package.json` збігаються з тегом (4.2), а `pnpm audit --audit-level high` — 0 high / critical.

**Revise №1: результат репетиції відкату (2026-11-05, лише читання `gh api` після кожного запуску).**

| Запуск | Створено (UTC) | `build` | `smoke` | `deploy` | `verify-production` | Результат |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 41924336490, тег `v0.1.1` (випуск) | 22:20:00 | 22:20:05 – 22:20:40 | 22:20:42 – 22:22:30 (браузери 48 с) | 22:23:24 – 22:23:34 (очікування з 22:22:30) | 22:23:36 – 22:23:40, success | production `v0.1.1` / `99a5987`, `/` — 200 |
| 41925323402, `--ref main`, `tag=v0.1.0` | 22:26:42 | 22:26:45 – 22:27:11 | 22:27:13 – 22:28:54 | 22:29:36 – 22:29:51 | 22:29:54 – 22:31:58, **failure** | сайт лишився `v0.1.1` ≥ до 22:49 (одна перевірка); TD-037 |
| 41928801119, `--ref v0.1.0`, `tag=v0.1.0` | 22:50:53 | 22:50:57 – 22:51:35 | 22:51:37 – 22:58:25 (браузери 5 хв 50 с) | 23:32:40 – 23:32:57 (очікування з 22:58:25) | 23:32:59 – 23:33:21, success | production `v0.1.0` / `b6c56c2`, SHA-256 `index.html` збігається |

RTO відкату (запуск 41928801119): загальний `23:33:21 − 22:50:53` = 42 хв 28 с; очікування власника `23:32:40 − 22:58:25` = 34 хв 15 с; машинний 8 хв 13 с. Висновок про NFR-12 — runbook 9.6, секції 5 і 6.

```text
$ gh workflow run release.yml --ref v0.1.0 -f tag=v0.1.0      (2026-11-05 00:50:52, run 41928801119, headSha b6c56c2)
$ curl -s https://ivangithubed.github.io/crypto-radar/version.json   (23:33:55 UTC)
{"version":"v0.1.0","commit":"b6c56c283bbea13ed4299bd3b0e2b9a2ffc3eeac"}
$ curl -s https://ivangithubed.github.io/crypto-radar/ | sha256sum ; sha256sum dist/index.html
87ae479db4ecf476d96b77a8c4630008d3980aa340db2d5381cbf2307baea334 *-
87ae479db4ecf476d96b77a8c4630008d3980aa340db2d5381cbf2307baea334 *dist/index.html
EXIT=0
```

Причина невдачі запуску 41925323402 — з логів `Deploy`: `"pages_build_version": "99a59871f59aaa30423c07fdbccc78c7b62fa0e1"`, `Created deployment for 99a5987…, ID: 99a5987…`, `Reported success!` у обох запусках (v0.1.1 і відкат з `--ref main`); у запуску 41928801119 sha — `b6c56c2`. Це висновок із логів і результату; документацією GitHub не підтверджено.

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

Допоміжні файли симуляції (поза репозиторієм, у scratchpad сесії): `stub/pnpm` — заглушка, що за змінною `MODE` поводиться як успіх (`ok`), збій на 1-й спробі (`fail_then_ok`, exit 3), зависання на 1-й спробі (`hang_then_ok`, `sleep 60`) або зависання на кожній (`always_hang`); `retry.sh` — поле `run` кроку з `release.yml`, витягнуте розбором YAML (не копією); `retry_fast.sh` — він же з масштабом часу `--kill-after=1s 3s`, `sleep 1`; `sim_case.sh MODE EXPECT_RC EXPECT_ATTEMPTS` — запускає `retry_fast.sh` із заглушкою й повертає 0, лише якщо код виходу і число спроб збіглися з очікуваними. Симуляція доводить логіку циклу й те, що `timeout` обриває зависання; вона не доводить поведінку `playwright install --with-deps` на раннері GitHub (стан 23:22: це мав показати перший запуск із цим кроком; запуски відбулися пізніше — run 41924336490 і 41925323402, success, по 48 с; повтор і `timeout` на справжньому зависанні не спрацьовували). Відомий нюанс: `timeout` завершує `pnpm`, але не гарантує чистого стану `apt` / `dpkg`; якщо `dpkg` лишився перерваним, друга спроба впаде, і крок завершиться помилкою за дві спроби (чесний провал, а не 20 хв очікування).

Валідатор етапу (`--stage 9 --run`), первинний гейт 18:27: не запускався до вердикту рев'юера (L-004).

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

**Валідатор після вердикту, прогін 3 (Revise №1, документація репетиції; після PASS рев'ю №7):**

```text
$ python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 9 --run   (02:01:08 – 02:01:30)
=== Перевірка етапу: Stage 9 ===
ℹ️  [INFO] Реліз: версіонування, staging → production, rollback — скіл release-engineer
✅ [PASS] Передумови схвалено: 8.a, 8.b
ℹ️  [INFO] Перевірка звіту: .agentic/reports/09-release-report.md
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 28 перевірок із кодами виходу
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

**Revise №1, рев'ю №3 (документація результатів репетиції, 2026-11-05 після запису трекера 01:35): BLOCKERS FOUND — виправлено.** Суть: (1) вердикт щодо NFR-12 підмінював поріг протоколу 9.6 (загальний ≤ 15 хв) — тепер «не виконано: 42 хв 28 с; машинний 8 хв 13 с у межах», питання власнику — уточнення NFR-12; (2) застарілі стани й суперечливі числа (L-002): «відкат не перевірено», «перший запуск на раннері», TD-036 «5 хв / один прогін» проти виміру 350 с, TD-033 «репетиція покаже», дата «2026-11-04 23:15», «відкритих кроків немає»; (3) розділ «[0.1.1]» CHANGELOG приписував опублікованому тегу правило `--ref` — винесено в «[Unreleased]»; (4) у runbook 9.4 дата «2026-11-05 23:33 UTC» (має бути 2026-11-04 23:33 UTC = 2026-11-05 01:33 локально); (5) для поточних правок не було точки фіксації й гейту — додано 7.4, статус етапу 9 у трекері — `WAITING_FOR_APPROVAL`. WARNING: механізм збою подано як факт — додано «висновок із логів, документацією GitHub не підтверджено»; відкат на старіший тег виконує workflow того тега — додано в runbook §5 і TD-037. INFO враховано: SHA-256 `index.html` не відрізняє `v0.1.0` від `v0.1.1`, «≥ 19 хв» після деплою, знімки з датою позначено застарілими, «міг би впасти». Рев'ю №4 (2026-11-05 01:45): BLOCKERS FOUND (3 BLOCKER) — виправлено: час знімка стану репозиторію в runbook (тепер з `date`), рядок ADR 0003 «Відкат» без «✅» для RTO, застарілі «вибірка — один прогін» / «покаже перший запуск» / TD-034 «підтвердження — репетиція». INFO враховано: «вирішено власником» у секції 2, загальний RTO в журналі релізів, узгоджено текст кроку 5 протоколу. Рев'ю №5 (2026-11-05 01:50): BLOCKERS FOUND (5 BLOCKER) — виправлено: рядок 4.0 про репетицію перейменовано й позначено історію первинного гейту, додано рядки «не запускалось» для сканера, валідатора й вердикту проходу 7.4, два прогони нового кроку на раннері (run 41924336490 і 41925323402), ризик про трекер закрито (закомічено в `99a5987`), текст закритого гейту 00:08 повернуто до оригіналу. INFO враховано; рішення власника 2026-11-05 про NFR-12 і TD-036 / TD-037 внесено. Рев'ю №6 (2026-11-05 ≈01:57): BLOCKERS FOUND (1 BLOCKER: у runbook 9.4 лишився вердикт «NFR-12 не виконано» проти чинного «виконано за тлумаченням власника») — виправлено; INFO враховано (примітка про першу редакцію порогу в гейті 7.4 і секції 6, редакція TD-036 / TD-037 «спринт 2», CHANGELOG, дата [0.1.1]). Рев'ю №7 (контроль виправлення, 2026-11-05): PASS — текст нижче.

**Revise №1, рев'ю №7 (контроль виправлення рев'ю №6, 2026-11-05): PASS.**

```text
PASS — independent-reviewer, 2026-11-05 (після рев'ю №6 ≈01:57; `date` заблоковано хуком read-only), Stage 9, Revise №1, рев'ю №7 (контроль виправлення рев'ю №6).
Межі етапу: `git diff --stat HEAD` — 5 файлів (CHANGELOG.md, 09-release-runbook.md, tech-debt.md, 09-release-report.md, pipeline-state.md), усі в зоні етапу 9; 4 файли 01/02 — лише кінці рядків, у `git add` 7.4 не входять.
Секрети: `verify-gate.py --stage 9` (без --run) — сканер 228 файлів, 0 знахідок.
Залежності: не застосовно — маніфести й lockfile не змінювались.
Правила якості: `verify-gate.py --stage 9` — 85 файлів коду без помилок, оракул незмінний (7b1f7fa2), «Валюта довіри» — 28 рядків; єдина помилка — статус аудиту (очікувано до вердикту).
Контракт: не застосовно — `has_http_api: false`.
Повторний запуск: `pnpm verify` у рев'ю №6 (01:55:48) — 16 файлів, 268 passed, NFR-5 106.10 kB gzip; у контролі змінились лише документи. `gh` / `date` заблоковано хуком — стан production не перевірено повторно.
Виправлення рев'ю №6: runbook 9.4 (v0.1.0) — NFR-12 виконано за тлумаченням власника, узгоджено з кроком 4 і вердиктом 9.6; протилежних вердиктів поза історичними записами (трекер 01:41, звіт 4.3 рев'ю №3) немає. CHANGELOG — незакритий `**` прибрано, факт репетиції в [Unreleased]. TD-036 / TD-037 — «у спринті 2», без «окремим Revise етапу 9 №2» і без дублів. Гейт 7.4 п. 3 і секція 6 — примітка про першу редакцію порогу; секція 6 — рядок про дату [0.1.1]. L-003: TD-036 / TD-037 — «спринт 2», ризик не прийнято.
Знахідки: 0 BLOCKER, 0 WARNING, 4 INFO (рядок 4.0 «вердикт рев'юера» і запис трекера оновлено автором після вердикту; речення TD-036 виправлено; `gh` / `date` не перевірено повторно).
```

---

## 5. Матриця трасування вимог (Requirements Traceability)

| ID вимоги | Вимога | Де реалізовано | Чим перевірено | Статус |
| :--- | :--- | :--- | :--- | :--- |
| ADR 0003 «Публікація» | Збирається один раз, публікується той самий артефакт; `pages: write`, `id-token: write`, середовище `github-pages` | `.github/workflows/release.yml` (build → smoke → deploy) | розбір YAML, закріплення SHA, відтворюваність збірки (4.2); запуск у CI: run 41887573401 — build, smoke, deploy, verify-production success | ✅ Виконано (production `v0.1.0`, 2026-11-04 22:57) |
| ADR 0003 «Відкат» | Повторний запуск workflow на попередньому коміті, RTO ≤ 15 хв | `release.yml` (`workflow_dispatch` з тегом), runbook розділ 5, 9.6 | репетиція 2026-11-05 (4.1): відкат з `--ref v0.1.0` вдався, з `--ref main` — ні (TD-037) | ⚠️ Відкат працює (лише з `--ref <тег>`, за workflow цього тега) · ✅ RTO ≤ 15 хв: машинний час 8 хв 13 с (тлумачення власника — рядок NFR-12 нижче) |
| ADR 0003 «Confirmation» (етап 9) | URL повертає 200 і HTML з назвою; Enforce HTTPS; відкат перевірено | job `verify-production`, runbook 9.2 | `v0.1.0`: `verify-production` success, `/` — 200, `version.json` = `v0.1.0` / `b6c56c2`, `https_enforced: true` (перевірено 23:13); відкат перевірено 2026-11-05 (4.1): з `--ref v0.1.0` вдався, з `--ref main` ні | ✅ Production · ✅ Відкат (лише з `--ref <тег>`) |
| NFR-12 | Відкат ≤ 15 хв | runbook розділ 5, 9.6; `timeout-minutes` і повтор у `release.yml` (TD-034) | вимір у репетиції: машинний час 8 хв 13 с, очікування власника 34 хв 15 с, загальний 42 хв 28 с (4.1) | ✅ **Виконано за тлумаченням власника (2026-11-05: «не входить час очікування мене»): машинний час 8 хв 13 с ≤ 15 хв.** Загальний 42 хв 28 с (очікування гейтів 34 хв 15 с) за першою редакцією порогу протоколу 9.6 перевищував 15 хв; поріг змінено тлумаченням власника, формулювання в `03-architecture.md` не змінювалось |
| NFR-15 / бриф §13 | $0 на місяць | runbook розділ 8; публічний репозиторій, безкоштовні runner-и й Pages | ADR 0003, розділ 10 архітектури; метод NFR — огляд налаштувань GitHub (Pages, Actions) перед релізом | ✅ За документами; огляд налаштувань виконано частково (reviewers і Pages перевірено перед тегами, трекер 22:49, 22:57, 2026-11-05 00:19); платних ресурсів не створювалось |
| NFR-8, NFR-9 | HTTPS, CSP; пакети перевірені; ланцюг постачання | `release.yml` (SHA дій), `pnpm audit --audit-level high` у `build`, `git-cliff` перевірено в реєстрі (`npm view`) | `--debt` 7 аспектів, секція 4.1 | ✅ Виконано |
| NFR-12 / надійність релізу (Revise №1, TD-034) | Крок без власної межі не має з'їдати час відкату | `release.yml` (`timeout-minutes: 8`, 2 × 3 хв) | норма й викид із історії прогонів (4.1); симуляція циклу (4.2) | ✅ Локально; на раннері крок виконувався двічі (run 41924336490 і 41925323402, по 48 с), повтор і `timeout` на реальному зависанні не спрацьовували |
| Надійність CI (TD-035, TD-036) | Така сама межа для `ci.yml`; повільне успішне встановлення в `smoke` | `ci.yml` — етап 5 (не змінено); `release.yml` — спроба 3 хв | дані прогонів (4.1) | ⏳ Відкрито: TD-035 (етап 5), TD-036 |
| NFR-1, NFR-3, NFR-5 (регрес) | Свіжість, ліміти запитів, розмір бандла | код етапу 7 без змін; `pnpm verify` | 268 passed, JS 106,10 кБ | ✅ Виконано |
| G-2 / US-1 – US-9 | Продукт доступний знайомим за посиланням | `CHANGELOG.md` «[0.1.0]», backlog `Done` | production `v0.1.0` 22:57 (run 41887573401), 200 + `version.json` | ✅ Опубліковано |

---

## 6. Ризики, технічний борг і відкриті питання

Технічний борг живе в `.agentic/tech-debt.md` (TD-001 – TD-037); етап 9 додав TD-032 і TD-033 (первинний гейт), TD-034 (Revise №1, закрито), TD-035, TD-036 і TD-037 (Revise №1, відкрито). Стан — на 2026-11-05 01:54; рядки первинного гейту про push, CI, Pages і перший запуск виконані (трекер, розділ 4, записи 19:55 – 22:57), репетицію відкату проведено (4.1).

| Тип | Опис | Вплив | Що пропонується | Власник рішення |
| :--- | :--- | :--- | :--- | :--- |
| Рішення власника | Зміст `v0.1.1`: **рішення власника 2026-11-05 00:03 — «v0.1.1 = workflow»**: лише зміцнення workflow (TD-034), runbook і CHANGELOG; код застосунку = `v0.1.0`, production-артефакт відрізняється від `v0.1.0` лише `version.json`. Це рішення про зміст, а не згода на коміт, push, тег чи деплой | Низький | Виконано в розділі «[0.1.1]» CHANGELOG; жодних змін коду | Власник продукту |
| Рішення власника | Після репетиції production лишити на `v0.1.0` (**рішення власника 2026-11-05 00:08: «вміст ідентичний, на один деплой менше»**); тег `v0.1.1` залишається в git | Низький | Другий деплой після відкату не потрібен | Власник продукту |
| Виконано | Репетиція відкату: push (3 коміти), тег `v0.1.1` (00:19:59), деплой `v0.1.1` (00:23), відкат з `--ref main` (не відкотив), відкат з `--ref v0.1.0` (01:33) — усе за окремими командами власника; production — `v0.1.0` | Низький | Результат — 4.1, runbook 9.6; не виконано крок 5 протоколу в частині браузера (320 px, теми, консоль); лише `curl` | Власник продукту |
| Ризик | Новий крок із `timeout` у `release.yml` на раннері: два реальні прогони (run 41924336490 і 41925323402, обидва з workflow `99a5987`) — success, браузери за 48 с в обох; цикл повтору й `timeout` на реальному зависанні/повільності не спрацьовували (без повтору — не видно). Прогін 350 с зі старим workflow показав, що межа 3 хв × 2 могла б хибно спрацювати на повільному, але успішному встановленні (TD-036) | Середній | TD-036 (спроба 6 хв, крок 14 хв) — спринт 2, рішення власника 2026-11-05 | Власник продукту |
| Борг | TD-035: у `ci.yml` (файл етапу 5) такі самі кроки `playwright install` без `timeout-minutes`; успішний максимум 708 с. Етап 9 файл не змінює (L-009) | Низький | **рішення власника 2026-11-05 00:08: «лишити до спринту 2»**; статус лишається «відкрито» | Власник продукту |
| Борг | TD-036: спроба 3 хв × 2 у `release.yml` розрахована на зависання; повільне, але успішне встановлення (клас 708 с) вичерпає обидві спроби за ≈ 6,5 хв, і `smoke` / відкат потребуватиме ручного `gh run rerun --failed`. Виміряна норма релізного кроку — 41 – 48 с; викид 350 с (5 хв 50 с, run 41928801119) зафіксовано в репетиції | Низький – середній | Спроба 6 хв (> 350 с), крок 14 хв — у спринті 2; **рішення власника 2026-11-05 00:08: «переглянути після репетиції за фактичною тривалістю кроку»**; **після репетиції: «спринт 2» (власник, 2026-11-05)**; ризик не прийнято (L-003) | Власник продукту |
| Борг | TD-037: відкат з `--ref main` повертає `deploy` success, але Pages сайт не замінює (sha запуску = активний деплой); `verify-production` падає лише через 2 хв. Runbook виправлено; захисту в `release.yml` немає | Середній | Спринт 2: крок у `build`, що порівнює коміт тега з `GITHUB_SHA` і зупиняє `workflow_dispatch` з розбіжністю; **рішення власника 2026-11-05: «спринт 2»**; ризик не прийнято (L-003) | Власник продукту |
| Рішення власника | NFR-12: чи входить очікування гейтів у «RTO ≤ 15 хв»? **Вирішено 2026-11-05: «не входить час очікування мене»** — машинний час 8 хв 13 с у межах (перша редакція протоколу 9.6 рахувала загальний час 42 хв 28 с; поріг змінено цим тлумаченням) | Низький | Тлумачення записано в runbook 9.6, цьому звіті й трекері; формулювання в `03-architecture.md` не змінювалось — за бажанням запит на зміну етапу 3 | Власник продукту |
| Ризик | Закрито: записи сусідньої сесії Revise 8.a у трекері закомічено в `99a5987` (2026-11-05 00:08); у поточному незакоміченому трекері лише записи етапу 9 (рядок статусу, журнал комітів, записи 00:24 і пізніші) | Низький | — | Власник продукту |
| Борг | TD-033: відкат — перезбірка з `pnpm audit --audit-level high`. На 23:11 audit: 0 high / critical (2 moderate = TD-001), lockfile `v0.1.0` = поточному — відкат не заблоковано; принциповий ризик лишається (ризик прийнято 19:10, спринт 2) | Низький – середній | Репетиція (4.1): `pnpm audit` у відкаті не заблокував `build` (success) | Власник продукту |
| Дефект | BUG-012 (Critical) і BUG-010 (Major): перевірено власником на Safari 19:00; статуси `Verified` переведено сусідньою сесією Revise 8.a (запит №8, рішення власника 23:30; зона 8.a, L-009) закомічено `35d8a3b` (2026-11-05 00:00) — у цьому Revise ці файли не змінювались | Низький | Revise 8.a | Скіл 8.a / власник продукту |
| Борг | TD-027, TD-028, TD-029 — відкриті, ризик прийнято власником 19:10, спринт 2. TD-001 (2 moderate у dev-інструменті) — відкрито | Низький | Спринт 2 | Власник продукту |
| Питання | `/.well-known/security.txt` не додано: потрібен контакт власника; до того — issues репозиторію | Низький | Додати у спринті 2 за контактом власника | Власник продукту |
| Питання | Зовнішній uptime-моніторинг не створено | Низький | Власник створює безкоштовний сервіс за runbook розділ 6 | Власник продукту |
| Процес | `release.yml` додає `dist/version.json` (публічний файл із версією й SHA коміту) | Низький | Рішення затвердженого плану етапу; чутливих даних немає | Скіл етапу 9 |
| Процес | Передумова валідатора (етап 8.a схвалено) виконана: 8.a — `APPROVED_AND_COMMITTED`, коміт `35d8a3b`, схвалення власника записано в розділі 4 трекера (2026-11-05 00:03, координатор). Прогін 1 валідатора (23:28, код 1) і прогін 2 (код 0) — 4.2 | Низький | — | Власник продукту |
| Процес | Розділ «[0.1.1]» CHANGELOG має дату 2026-11-05 (локальний час тега 00:19:59); у самому тегу `v0.1.1` файл мав 2026-11-04 (= 22:19 UTC) | Низький | Дату виправлено в `main` після тега; тег не переміщується | Скіл етапу 9 |
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

### 7.3. Revise №1 (запит на зміну №9): файли й коміт — виконано, коміт `99a5987`

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

### 🛑 Рішення власника продукту (Human Approval Gate) — Revise №1 (виконано, коміт `99a5987`)

**На цьому гейті:**

1. Схвалити зміни Revise №1: таймаут і повтор кроку встановлення браузерів у `release.yml`, TD-034 (закрито за локальною перевіркою), TD-035 і TD-036 (відкриті, ризик не прийнято — потрібне ваше рішення), оновлений runbook (журнали релізів та інцидентів, протокол 9.6), розділ «[0.1.1]» CHANGELOG.
2. Відповісти на питання: зміст `v0.1.1` (пропозиція — лише зміцнення workflow; код = `v0.1.0`) і куди після репетиції (рекомендація — лишити на `v0.1.0`).
3. Гейт 8.a закрито (коміт `35d8a3b`), передумова валідатора виконана; трекер (з записами обох сесій) комітиться разом з комітом етапу 9 лише за вашою командою.
4. Репетицію відкату (пункт 9.4 — відкрито) виконувати лише крок за кроком, кожен — окрема згода (секція 6); production-деплої — тільки з окремою фразою «HUMAN ACCEPTANCE: ACCEPTED. ДОЗВОЛЯЮ PRODUCTION DEPLOYMENT.» і власним Approve and deploy у GitHub. *(Текст гейту 00:08. Станом на 2026-11-05 01:35 репетицію проведено — 4.1, гейт 7.4.)*

- [x] **Approve & закоміть** — статус `APPROVED_AND_COMMITTED`: агент оновлює `.agentic/pipeline-state.md`, виконує явний `git add` і `git commit` за списком 7.3.
- [ ] **Approve без коміту** — статус `APPROVED_MANUAL_COMMIT`: власник комітить самостійно.
- [ ] **Revise** — статус `REJECTED_REVISING`: зауваження нижче.
- [ ] **Пропусти** — не застосовується: етап 9 уже виконано, `v0.1.0` у production.

**Коментарі / Зауваження:**
> 2026-11-05 00:03: власник — «v0.1.1 = workflow» (зміст v0.1.1 вирішено). Коміт, push, тег, деплої, рішення «куди після репетиції», TD-035 і TD-036 — ще чекають.
> 2026-11-05 00:08: власник — «Коміт Revise: … вже після цього репетиція відкату» (коміт Revise схвалено; push, тег, деплої і фрази HUMAN ACCEPTANCE — окремо); «вміст ідентичний, на один деплой менше» (production лишається на v0.1.0 після репетиції); TD-035 — «лишити до спринту 2»; TD-036 — «переглянути після репетиції за фактичною тривалістю кроку».

---

### 7.4. Результати репетиції відкату: файли й коміт (після рев'ю)

```text
 M CHANGELOG.md
 M .agentic/specs/09-release-runbook.md
 M .agentic/tech-debt.md
 M .agentic/reports/09-release-report.md
 M .agentic/pipeline-state.md
```

`release.yml`, `ci.yml`, код застосунку, `.agentic/qa/**` у цей коміт не йдуть; 4 файли 01/02 (лише кінці рядків) — теж.

```bash
git add -- CHANGELOG.md .agentic/specs/09-release-runbook.md .agentic/tech-debt.md .agentic/reports/09-release-report.md .agentic/pipeline-state.md
git commit -m "docs(stage-9): record rollback rehearsal and rollback rule"
```

### 🛑 Рішення власника продукту (Human Approval Gate) — результати репетиції відкату

**На цьому гейті:**

1. Схвалити документацію репетиції: runbook (відкат лише з `--ref <тег>`, журнали, результат 9.6), TD-036 (викид 350 с) і TD-037, розділ «[Unreleased]» CHANGELOG.
2. TD-036 і TD-037 (зміни `release.yml`): **власник 2026-11-05 — «спринт 2»**; Revise етапу 9 №2 не відкривається.
3. NFR-12: **тлумачення власника 2026-11-05 — «не входить час очікування мене»**: очікування гейтів у RTO не входить, машинний час 8 хв 13 с ≤ 15 хв (перша редакція протоколу 9.6 рахувала загальний час — 42 хв 28 с — і перевищувала поріг; поріг змінено цим тлумаченням). Формулювання в `03-architecture.md` не змінювалось (за бажанням — запит на зміну етапу 3).

- [x] **Approve & закоміть** — статус `APPROVED_AND_COMMITTED`: явний `git add` і `git commit` за списком 7.4.
- [ ] **Approve без коміту** — статус `APPROVED_MANUAL_COMMIT`.
- [ ] **Revise** — статус `REJECTED_REVISING`: зауваження нижче.

**Коментарі / Зауваження:**
> 2026-11-05 02:18: власник — «закоміть» (Approve & закоміть, список 7.4).
