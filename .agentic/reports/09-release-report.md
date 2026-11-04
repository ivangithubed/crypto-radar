# Фінальний звіт етапу: Stage 9: Реліз: версіонування, staging → production, rollback

- **Етап:** `Stage 9: Реліз: версіонування, staging → production, rollback`
- **Відповідальний скіл:** `release-engineer`
- **Дата формування:** `2026-11-04 18:27`
- **Статус аудиту independent-reviewer:** `PASS` (повторне рев'ю; історія рев'ю — 4.3)

---

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
| Репетиція відкату | `workflow_dispatch` з попереднім тегом | не запускалось | — | ні | попередньої версії немає (перший реліз); зовнішні дії потребують згоди (секція 6) |

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

---

## 5. Матриця трасування вимог (Requirements Traceability)

| ID вимоги | Вимога | Де реалізовано | Чим перевірено | Статус |
| :--- | :--- | :--- | :--- | :--- |
| ADR 0003 «Публікація» | Збирається один раз, публікується той самий артефакт; `pages: write`, `id-token: write`, середовище `github-pages` | `.github/workflows/release.yml` (build → smoke → deploy) | розбір YAML, закріплення SHA, відтворюваність збірки (4.2) | ✅ Виконано (запуск у CI — після push і тегу, секція 6) |
| ADR 0003 «Відкат» | Повторний запуск workflow на попередньому коміті, RTO ≤ 15 хв | `release.yml` (`workflow_dispatch` з тегом), runbook розділ 5 | документ; репетиція — після `v0.1.0` | ⏳ Репетиція не проведена |
| ADR 0003 «Confirmation» (етап 9) | URL повертає 200 і HTML з назвою; Enforce HTTPS; відкат перевірено | job `verify-production`, runbook 9.2 | після деплою | ⏳ Після production |
| NFR-12 | Відкат ≤ 15 хв | runbook розділ 5 | документ | ⏳ Репетиція |
| NFR-15 / бриф §13 | $0 на місяць | runbook розділ 8; публічний репозиторій, безкоштовні runner-и й Pages | ADR 0003, розділ 10 архітектури; метод NFR — огляд налаштувань GitHub (Pages, Actions) перед релізом | ✅ За документами; огляд налаштувань — перед тегом |
| NFR-8, NFR-9 | HTTPS, CSP; пакети перевірені; ланцюг постачання | `release.yml` (SHA дій), `pnpm audit --audit-level high` у `build`, `git-cliff` перевірено в реєстрі (`npm view`) | `--debt` 7 аспектів, секція 4.1 | ✅ Виконано |
| NFR-1, NFR-3, NFR-5 (регрес) | Свіжість, ліміти запитів, розмір бандла | код етапу 7 без змін; `pnpm verify` | 268 passed, JS 106,10 кБ | ✅ Виконано |
| G-2 / US-1 – US-9 | Продукт доступний знайомим за посиланням | `CHANGELOG.md` «[0.1.0]», backlog `Done` | публікація — після згод власника | ⏳ Публікація |

---

## 6. Ризики, технічний борг і відкриті питання

Технічний борг живе в `.agentic/tech-debt.md` (TD-001 – TD-033); етап 9 додав TD-032 і TD-033.

| Тип | Опис | Вплив | Що пропонується | Власник рішення |
| :--- | :--- | :--- | :--- | :--- |
| Питання (зовнішня дія) | Перший `git push origin main` опублікує ~30 комітів історії і весь `.agentic/` (специфікації, звіти, QA) у публічний репозиторій; на GitHub зараз лише коміт етапу 5 (`3c7cc09`). Секретів немає (сканер 228 файлів, 0) | Середній | Власник вирішує, чи публікувати історію як є; push — окрема згода | Власник продукту |
| Ризик | `ci.yml` на GitHub після етапу 5 не запускався: перший запуск (verify, оракул, `--debt`, e2e у 3 браузерах) може виявити відмінності середовища | Середній | Після push дочекатися зеленого CI; червоний — виправити, не обходити | Скіл етапу 5 / власник |
| Ризик | `release.yml` не виконувався на GitHub (лише розбір YAML); `actionlint` не встановлено | Середній | Перший запуск — тег `v0.1.0` після зеленого CI; відкат за runbook | Власник продукту |
| Дія власника | Settings → Pages → Source: GitHub Actions і дозвіл тегів `v*` у середовищі `github-pages` (без них деплой не пройде); Required reviewers (власник) — другий гейт production (**TD-032**: без нього `deploy` опублікує production одразу після зеленого `smoke`) | Високий | Інструкція — runbook розділ 3; перед тегом — перевірка `gh api …/environments/github-pages` (runbook 4.5); налаштування — власник або `gh api` за окремою згодою | Власник продукту |
| Борг | TD-033: відкат через `workflow_dispatch` — перезбірка старого коміту з `pnpm audit --audit-level high`; нове advisory на старі залежності заблокує відкат, RTO ≤ 15 хв (NFR-12) не буде виконано | Середній | Запасні шляхи в runbook розділ 5 (Unpublish або `git revert` + PATCH); у спринті 2 — режим відкату без `audit` за згодою власника | Власник продукту |
| Дефект | BUG-012 (Critical) і BUG-010 (Major): власник перевірив реліз-кандидат на справжньому Safari (iPhone) 2026-11-04 19:00 — «ПЕРЕВІРИВ ВСЕ ОК» (трекер, розділ 4). Статуси в `.agentic/qa/bugs/` (зона 8.a) лишаються `Fixed` до наступного Revise 8.a, де їх буде переведено в `Verified` (L-009) | Низький | Revise 8.a: статуси BUG-010 і BUG-012, рядок у RUN-2026-11-04-2 | Скіл 8.a / власник продукту |
| Борг | TD-027 (немає тесту «2 запити у фоновій вкладці»), TD-028 (UX Loading), TD-029 (позначка віку окремих монет; відступ від AC-8.5) — відкриті, ризик не прийнято (L-003) | Низький – середній | Спринт 2 | Власник продукту |
| Питання | Репетицію відкату на production виконати неможливо до першого релізу (попередньої версії немає) | Низький | Після `v0.1.0`: `v0.1.1` і відкат на `v0.1.0` через `workflow_dispatch` (окрема згода) | Власник продукту |
| Питання | `/.well-known/security.txt` не додано: потрібен контакт власника; до того — issues репозиторію | Низький | Додати у спринті 2 за контактом власника | Власник продукту |
| Питання | Зовнішній uptime-моніторинг не створено | Низький | Власник створює безкоштовний сервіс за runbook розділ 6 | Власник продукту |
| Процес | `release.yml` додає `dist/version.json` (публічний файл із версією й SHA коміту) | Низький | Рішення затвердженого плану етапу (ознака версії для `verify-production`); чутливих даних немає | Скіл етапу 9 |

### 6.1. Карта технологій для самостійного опанування

| Технологія / Інструмент / Патерн | Рівень опанування | Ключові концепції | Офіційне першоджерело |
| :--- | :--- | :--- | :--- |
| SemVer і Conventional Commits | **Розуміти** | `MAJOR.MINOR.PATCH`; `fix` → PATCH, `feat` → MINOR, `!` / `BREAKING CHANGE` → MAJOR; `0.y.z` для MVP; опублікований тег незмінний | https://semver.org/lang/uk/ · https://www.conventionalcommits.org/uk/ |
| GitHub Pages через GitHub Actions і захищені середовища | **Вміти** | `configure-pages` → `upload-pages-artifact` → `deploy-pages`; права `pages: write`, `id-token: write`; середовище `github-pages` з required reviewers | https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages · https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment |
| Один артефакт — багато кроків (build once, promote) | **Розуміти** | артефакт збирається один раз і несе версію; smoke на тому самому артефакті; відкат = повторний деплой попереднього тегу | https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts |
| Закріплення дій за SHA й least privilege | **Знати** | `uses: <repo>@<40-символьний SHA>`; `permissions` за замовчуванням `contents: read`; вхід через змінні середовища | https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions |
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

### 🛑 Рішення власника продукту (Human Approval Gate)

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
