# Фінальний звіт етапу: Stage 3: Архітектура: NFR, ADR, STRIDE і вибір стеку

- **Етап:** `Stage 3: Архітектура`
- **Відповідальний скіл:** `solution-architect`
- **Дата формування:** `2026-11-02 18:40` · **Revise (запит №5, TD-021):** `2026-11-03 14:35` · **Revise (запит №6, TD-020, TD-022):** `2026-11-04 02:27`
- **Статус аудиту independent-reviewer:** `PASS` (запит на зміну №6, рев'ю №3; рев'ю №2 повернуло блокер, його виправлено — див. 4.3)

---

## 1. Перевірені передумови (Pre-Flight Summary)

Етап документний: нічого не встановлювалося, хмарних ресурсів і акаунтів не створювалося. Власник 2026-11-02 дозволив читати лише офіційні джерела (документацію, реєстри, тарифи).

| Інструмент / SDK / Акаунт | Необхідна версія | Фактичний стан на старті | Запропонована команда | Згода отримана | Результат |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Python (валідатор) | `>= 3.10` | `3.14.7` | Ні, вже було | Не потрібно | `✅ Готово` |
| Git | будь-яка | `2.45.2.windows.1` | Ні, вже було | Не потрібно | `✅ Готово` |
| Node.js (для `npm view` і етапу 5) | `>= 22.22` (react-router 8.5.1) | `v24.21.0` | Ні, вже було | Не потрібно | `✅ Готово` |
| npm / pnpm | — | `11.19.0` / `11.23.0` | Ні, вже було | Не потрібно | `✅ Готово` |
| Docker (інформація для етапу 5) | не потрібен (ADR 0003) | `29.9.2` | — | Не потрібно | `ℹ️ Не потрібен` |
| GitHub CLI / обліковий запис | для етапів 5 і 9 | `gh` увійшов як `ivangithubed` | — | Не потрібно | `✅ Готово` |
| Реєстр npm (`npm view`) | читання | 19 пакетів, 2026-11-02 | — | Так (власник, 2026-11-02) | `✅ Перевірено` |

**Перевірені офіційні джерела (2026-11-02):**

- CoinGecko:
  - документація API: https://docs.coingecko.com/demo/reference/coins-markets, https://docs.coingecko.com/demo/reference/endpoint-overview, https://docs.coingecko.com/docs/common-errors-rate-limit, https://docs.coingecko.com/demo/reference/authentication, https://docs.coingecko.com/demo/reference/coins-id-market-chart, https://docs.coingecko.com/reference/coins-categories-list;
  - тарифи, умови й атрибуція: https://www.coingecko.com/en/api, https://www.coingecko.com/en/api_terms, https://brand.coingecko.com/resources/attribution-guide;
  - пробні GET-запити до `api.coingecko.com` без ключа: `/coins/markets`, `/coins/categories/list`, `/coins/markets?category=stablecoins`.
- GitHub:
  - Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits, …/creating-a-github-pages-site, …/about-github-pages, …/securing-your-github-pages-site-with-https, …/creating-a-custom-404-page-for-your-github-pages-site, …/using-custom-workflows-with-github-pages;
  - оплата Actions: https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions;
  - приватність: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement.
- Рантайм і бібліотеки:
  - Node.js: https://github.com/nodejs/Release, https://nodejs.org/en/about/previous-releases, https://nodejs.org/dist/index.json;
  - Vite: https://vite.dev/guide/;
  - React: https://react.dev/versions;
  - React Router: https://reactrouter.com/start/modes, https://reactrouter.com/start/declarative/installation, https://reactrouter.com/api/declarative-routers/HashRouter;
  - TanStack Query: https://tanstack.com/query/latest/docs/framework/react/reference/useQuery, …/guides/polling, …/guides/important-defaults, …/installation.
- Безпека й платформа:
  - OWASP: https://top10.owasp.org/2025/, https://api-security.owasp.org/;
  - MDN: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy (а також сторінки `frame-ancestors`, `sandbox`, `report-uri`), https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage;
  - WebKit: https://webkit.org/tracking-prevention/, https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/.

Одна сторінка недоступна: https://docs.github.com/en/site-policy/acceptable-use-policies/github-pages-policies повернула 404, тож обмеження використання взято зі сторінки лімітів GitHub Pages.

---

**Запит на зміну №6 (команда власника «Так, запит №6», 2026-11-04, після гейту 8.a `706c08a`):** етап документний, нічого не встановлювалось. Етапи 1, 2 — схвалені; етап 3 — `REJECTED_REVISING` на час Revise. Код не змінюється: документи приводяться до коду й рішень власника.

---

## 2. Застосовані Best Practices vs найпростіший підхід

| Аспект / Рішення | Найпростіший підхід | Галузева Best Practice | Що обрано та чому |
| :--- | :--- | :--- | :--- |
| Вибір стеку | «Що знаємо» без перевірки | Матриця придатності кандидатів + ADR 0001 з версіями з реєстру | **Best Practice:** 4 кандидати в матриці; React + JavaScript на Vite (вибір власника), версії з `npm view` і офіційних сторінок |
| Якісні вимоги | «Швидко, надійно, безпечно» | NFR-N з числом, умовою й етапом перевірки | **Best Practice:** NFR-1 – NFR-16 з порогами; незастосовні категорії позначено з причиною |
| Стиль архітектури | Мікросервіси «на виріст» | Модульний моноліт, один деплойний блок | **Best Practice:** один статичний SPA, 11 модулів без циклів |
| Автентифікація | Токен у Web Storage | Серверна сесія в cookie | **Не застосовно:** входу немає (ADR 0002); прийняті загрози S, R, E описано |
| Цілісність даних | Перевірки лише в коді | Обмеження сховища + `version` → 409 | **Адаптовано:** серверного сховища немає; перевірка формату localStorage і форми відповіді CoinGecko; `version` не застосовний (ADR 0004) |
| Безпека | Без моделі загроз | STRIDE + OWASP Top 10 (+ API Top 10 за наявності API) | **Best Practice:** STRIDE по 4 межах довіри, OWASP Top 10:2025 повністю; API Top 10 — лише API10 для стороннього API (`has_http_api: false`) |
| Деплой | Ручне копіювання | Відтворювана збірка в CI, план відкату | **Best Practice:** GitHub Actions + `actions/deploy-pages`, відкат повторним деплоєм попереднього коміту (ADR 0003) |
| Вартість | «Розберемося потім» | Оцінка з джерелами цін | **Best Practice:** $0 з посиланнями на сторінки GitHub і CoinGecko (розділ 10) |
| Залежності | Пакет «з пам'яті» | Перевірка в реєстрі (anti-slopsquatting) | **Best Practice:** 19 пакетів з ADR 0001 перевірено `npm view`: версія, дата, репозиторій, ліцензія. Інструменти `debt_commands` (lhci, dependency-cruiser, cdxgen тощо) перевіряє в реєстрі етап 5 |
| Ключ API (додатково) | Demo-ключ у коді браузера | Ключ лише на сервері за проксі | **Компроміс:** keyless-доступ без ключа (секрету немає); проксі відхилено власником (ADR 0005) |

Власник 2026-11-02 обрав: прямі запити з браузера, GitHub Pages, React + JavaScript, React Router лише як бібліотеку маршрутизації (не фреймворк), компроміс для Safari.

---

## 3. Виконаний обсяг робіт (Deliverables)

**Revise (запит на зміну №6, 2026-11-04 02:27):** змінено [`.agentic/specs/03-architecture.md`](../specs/03-architecture.md): NFR-3 — виняток для першого завантаження (≤ 2 запити незалежно від `visibilityState`, рішення власника 2026-11-03 04:41; TD-020); §6 — `change7dPct: number | null` і правило `null` (варіант Б BUG-003; TD-022); STRIDE «SPA · T» — виняток `null`. Діаграма 7.1 — запит стейблкоїнів іде після першої відповіді топ-50, як у коді; діаграми 7.1, 7.2 і 7.3 — `;` і `#` у текстах повідомлень замінено (`,`, `#35;`), бо Mermaid обриває на них рядок; STRIDE I про IP — ризик прийнято власником 2026-11-04 00:11, п. 6. `.agentic/tech-debt.md` — TD-020, TD-022, TD-024, нові TD-027, TD-028. ADR 0005 не змінюється: правило «некоректна форма» уточнює UX §3 E-SHAPE, як погоджено у варіанті Б.

**Revise (запит на зміну №5, 2026-11-03 14:35):** змінено [`.agentic/specs/03-architecture.md`](../specs/03-architecture.md) (NFR-3, діаграма потоку завантаження; STRIDE: рядки I (IP для CoinGecko і GitHub Pages) — «прийняття — підтвердити на гейті», L-003, правка 16:22 після рев'ю №2), [`.agentic/specs/adr/0005-data-source-coingecko.md`](../specs/adr/0005-data-source-coingecko.md) («Помилки») і [`.agentic/specs/adr/0001-stack.md`](../specs/adr/0001-stack.md) (рядок «Дані й оновлення» — дописано 14:43 за знахідкою Red-Team №8, L-002) — повтори при мережевій помилці лише при `navigator.onLine === false`; виняток `fetch` онлайн — E-SRC, 1 запит; трекер — `.agentic/pipeline-state.md` (розділ 4).

- [`.agentic/specs/03-architecture.md`](../specs/03-architecture.md):
  - драйвери, NFR-1 – NFR-16;
  - C4 Context і Container, модулі, доменна модель;
  - потоки, STRIDE, OWASP, реєстр персональних даних, регуляторна таблиця;
  - деплой, вартість.
- [`.agentic/specs/adr/0001-stack.md`](../specs/adr/0001-stack.md) — стек, матриця придатності, версії, `has_http_api: false`.
- [`.agentic/specs/adr/0002-authentication.md`](../specs/adr/0002-authentication.md) — автентифікація не застосовується.
- [`.agentic/specs/adr/0003-deploy-target.md`](../specs/adr/0003-deploy-target.md) — `static-hosting` на GitHub Pages.
- [`.agentic/specs/adr/0004-data-storage.md`](../specs/adr/0004-data-storage.md) — localStorage для обраних і теми.
- [`.agentic/specs/adr/0005-data-source-coingecko.md`](../specs/adr/0005-data-source-coingecko.md) — CoinGecko без ключа, ендпоінти, свіжість, атрибуція.
- [`.agentic/specs/adr/0006-safari-favorites-retention.md`](../specs/adr/0006-safari-favorites-retention.md) — компроміс щодо Must US-5 / US-6 у Safari.
- [`.agentic/project.json`](../project.json) — заповнено `stack`, `has_http_api: false`, `deploy_target: "static-hosting"`; інші ключі не змінено.
- [`.agentic/pipeline-state.md`](../pipeline-state.md) — статус етапу 3, рішення власника в розділі 4.
- [`.agentic/reports/03-architecture-report.md`](03-architecture-report.md) — цей звіт.
- [`.claude/rules/project-lessons.md`](../../.claude/rules/project-lessons.md) — уроки L-001 – L-003 з BLOCKERS FOUND рев'ю етапу 3 (розділ 11 контракту; запис погодив власник).

---

## 4. Докази працездатності (Verification Evidence)

### 4.0. Валюта довіри (Trust Receipt)

| Перевірка | Команда | Код виходу | Лічильники | Повторив рев'юер | Примітка |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Запит №6: виняток NFR-3 | `grep -c "після відкриття — 0 запитів у прихованій вкладці" .agentic/specs/03-architecture.md` | 0 | 1 (очікується 1) | так (рев'ю №1, Grep) | 02:45:21; вивід — 4.2, блок «повтор після рев'ю №2» |
| Запит №6: тип у §6 | `grep -c "change7dPct: number . null" .agentic/specs/03-architecture.md` | 0 | 1 (очікується 1) | так (рев'ю №1, Grep) | 02:45:21; крапка замість риски, яка ламає таблицю; вивід — 4.2 |
| Запит №6: діаграма 7.1 | `grep -c "Після першої відповіді топ-50" .agentic/specs/03-architecture.md` | 0 | 1 (очікується 1) | так (рев'ю №2, №3, Grep) | 02:45:21; вивід — 4.2 |
| Запит №6: STRIDE I про IP | `grep -c "ризик прийнято власником 2026-11-04 00:11, п. 6" .agentic/specs/03-architecture.md` | 0 | 2 (очікується 2) | так (рев'ю №2, №3, Grep) | 02:45:21; вивід — 4.2 |
| Запит №6: `;` у текстах діаграм | `python -c "import re;t=open('.agentic/specs/03-architecture.md',encoding='utf-8').read();print(len(re.findall(r'(?m)^ +\w+-+>>?\w+:.*(?<!#35);',t)))"` | 0 | 0 (очікується 0) | ні | 02:45:21; парсером Mermaid не перевірено: його немає в проєкті; вивід — 4.2, блок «повтор після рев'ю №2» |
| Запит №6: сканер секретів | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --scan-secrets .agentic/specs` | 0 | 13 файлів, 0 секретів | так (рев'ю №1, до останніх правок) | 02:45:21; вивід — 4.2 |
| Запит №6: валідатор етапу | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 3` | 0 | 0 FAIL: передумови, статус аудиту PASS, «Валюта довіри», артефакти, правила якості, секрети | ні | 02:49:30, після вердикту PASS рев'ю №3 (L-004); вивід — 4.2, блок «Запит №6 — валідатор етапу» |
| Запит №6: вердикт рев'юера | субагент `independent-reviewer` | 0 | рев'ю №3 — PASS; рев'ю №2 — BLOCKERS FOUND, виправлено; рев'ю №1 — PASS із WARNING, виправлено | так | вивід — 4.3 |
| Запит №5: нове формулювання повторів | `grep -c "onLine" .agentic/specs/03-architecture.md .agentic/specs/adr/0005-data-source-coingecko.md .agentic/specs/adr/0001-stack.md` | 0 | 03-architecture.md:2, 0005:1, 0001:1 | ні | вивід — 4.2, блок «Запит №5», повтор 2026-11-03 16:27:31; отримано на: запит №5, коміт `9417669` |
| Запит №5: старе формулювання ADR 0001 | `python -c "import sys;t=open('.agentic/specs/adr/0001-stack.md',encoding='utf-8').read();n=t.count('на 5xx і мережу — 2');print('старих формулювань ADR 0001:',n);sys.exit(n)"` | 0 | 0 | ні | вивід — 4.2, блок «Запит №5», повтор 2026-11-03 16:27:31; код 0 = 0 збігів (L-001); отримано на: запит №5, коміт `9417669` |
| Запит №5: механізм повторів у ADR | `python -c "import sys;fs=['.agentic/specs/adr/0005-data-source-coingecko.md','.agentic/specs/adr/0001-stack.md'];old=['власні '+chr(96)+'retry'+chr(96),'на 5xx і мережу — 2'];n=sum(open(f,encoding='utf-8').read().count(o) for f in fs for o in old);print('retry TanStack / старе ADR 0001:',n);sys.exit(n)"` | 0 | 0 | ні | вивід — 4.2, блок «Запит №5», повтор 2026-11-03 16:27:31 (дослівна команда; `chr(96)` — зворотні лапки без підстановки оболонки); код 0 = 0 збігів (L-001); отримано на: запит №5, коміт `9417669` |
| Запит №5: старих формулювань немає | `python -c "import sys;fs=['.agentic/specs/03-architecture.md','.agentic/specs/adr/0005-data-source-coingecko.md','.agentic/specs/04-ux-and-contract.md','.agentic/specs/implementation_plan.md'];old=['мережа після 2 повторів','5xx / мережа / таймаут','5xx, мережа, таймаут','мережа / таймаут 10 с / 5xx','на мережеву помилку, таймаут і 5xx'];n=sum(open(f,encoding='utf-8').read().count(o) for f in fs for o in old);print('старих формулювань:',n);sys.exit(n)"` | 0 | 0 у 4 документах | ні | вивід — 4.2, блок «Запит №5», повтор 2026-11-03 16:27:31; код 0 = 0 збігів (L-001); отримано на: запит №5, коміт `9417669` |
| Запит №5: валідатор етапу і вердикт рев'юера | `python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 3`, субагент `independent-reviewer` | 0 | вердикт PASS (рев'ю №3); валідатор — 10 PASS, 0 FAIL | ні | запущено 2026-11-03 16:28:28 після вердикту PASS (L-004); вивід — 4.2, блок «Запит №5 — валідатор етапу»; отримано на: запит №5, коміт `9417669` |
| Кількість NFR (`2edc20f`, 2026-11-02) | `grep -cE` за рядками таблиці NFR (точна команда — у 4.2) | 0 | 16 | так | — |
| STRIDE у документі (`2edc20f`, 2026-11-02) | `grep -c "STRIDE" .agentic/specs/03-architecture.md` | 0 | 2 | так | — |
| Обов'язкові ADR (`2edc20f`, 2026-11-02) | `ls` трьох обов'язкових ADR (точна команда — у 4.2) | 0 | 3 з 3 (усього 6 ADR) | так | — |
| ADR з варіантами (`2edc20f`, 2026-11-02) | `grep -c "^## Considered Options" .agentic/specs/adr/*.md` | 0 | 6 з 6 | так | Замість `grep -L` зі скіла: він повертає 1 при успіху, а валідатор вважає це провалом |
| Поля `project.json` (`2edc20f`, 2026-11-02) | `python -c "…assert…"` | 0 | 6 ключів stack, bool, рядок, bool | так (через git diff) | Рев'юеру хук не дозволив python -c |
| Зміни `project.json` (`2edc20f`, 2026-11-02) | `git diff -- .agentic/project.json` | 0 | змінено лише `stack`, `has_http_api`, `deploy_target` | так | — |
| Секрети (`2edc20f`, 2026-11-02) | `verify-gate.py --scan-secrets .agentic/` | 0 | 16 файлів, 0 секретів | так | — |
| Валідатор етапу (`2edc20f`, 2026-11-02) | `verify-gate.py --stage 3` | 0 | 0 помилок | так (до вердикту: exit 1, лише 3 очікувані помилки) | Фінальний запуск після вердикту — у 4.2 |
| Збірка й тести (`2edc20f`, 2026-11-02) | — | не застосовно | — | не застосовно | Етап без коду |

### 4.1. Збірка, лінтери та автоматичні тести
```text
Етап без коду: збірка й тести не застосовні.
```

### 4.2. Валідація артефактів, контракту, інфраструктури
```text
$ grep -cE "^\| *NFR-[0-9]+" .agentic/specs/03-architecture.md
16
$ grep -c "STRIDE" .agentic/specs/03-architecture.md
2
$ ls .agentic/specs/adr/0001-stack.md .agentic/specs/adr/0002-authentication.md .agentic/specs/adr/0003-deploy-target.md
.agentic/specs/adr/0001-stack.md
.agentic/specs/adr/0002-authentication.md
.agentic/specs/adr/0003-deploy-target.md
$ grep -c "^## Considered Options" .agentic/specs/adr/*.md
.agentic/specs/adr/0001-stack.md:1
.agentic/specs/adr/0002-authentication.md:1
.agentic/specs/adr/0003-deploy-target.md:1
.agentic/specs/adr/0004-data-storage.md:1
.agentic/specs/adr/0005-data-source-coingecko.md:1
.agentic/specs/adr/0006-safari-favorites-retention.md:1
$ python -c "import json; d = json.load(...); ... print(s, d['has_http_api'], d['deploy_target'], d['learning_mode'])"
{'type': 'frontend-only', 'language': 'JavaScript (ES2022+), Node.js 24 LTS для збірки', 'framework': 'React 19.3 + Vite 8.3 (React Router 8 у декларативному режимі)', 'package_manager': 'pnpm 11', 'test_framework': 'Vitest 5 + Testing Library (E2E етапу 8.b — Playwright 1.64)', 'database': None} False static-hosting True
$ git diff -- .agentic/project.json
-  "stack": null,  "has_http_api": null,  "deploy_target": null,
+  "stack": {…6 ключів…},  "has_http_api": false,  "deploy_target": "static-hosting",
$ python verify-gate.py --scan-secrets .agentic/
ℹ️  [INFO] Проскановано файлів: 16
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
$ python verify-gate.py --stage 3   # exit 0
=== Перевірка етапу: Stage 3 ===
ℹ️  [INFO] Архітектура: NFR, ADR, STRIDE і вибір стеку — скіл solution-architect
✅ [PASS] Передумови схвалено: 2
ℹ️  [INFO] Перевірка звіту: .agentic/reports/03-architecture-report.md
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 9 перевірок із кодами виходу
✅ [PASS] Карта технологій заповнена (11 рядків)
✅ [PASS] Conventional Commit у секції 7 валідний
✅ [PASS] Артефакт .agentic/specs/03-architecture.md знайдено
✅ [PASS] Артефакт '.agentic/specs/adr/*.md': 6 файлів
✅ [PASS] Артефакт .agentic/project.json знайдено

=== Правила якості коду: . ===
ℹ️  [INFO] У .agentic/project.json немає quality_rules: правила якості не застосовуються

=== Сканування секретів: . ===
ℹ️  [INFO] Проскановано файлів: 17
✅ [PASS] Відкритих секретів не виявлено

УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
```

**Запит на зміну №5 (TD-021; перші прогони 14:35:47, 14:46:04, 14:48:24, 16:21:39; нижче — повний повтор усіх чотирьох команд 4.0 о 2026-11-03 16:27:31, після останньої правки 03-architecture.md о 16:22 — STRIDE-рядки IP):** змінено `03-architecture.md` (NFR-3 «шлях помилки», діаграма потоку завантаження), ADR 0005 («Помилки») і ADR 0001 (рядок «Дані й оновлення»): повтори лише при `navigator.onLine === false`, таймауті й 5xx; виняток `fetch` при `navigator.onLine === true` — E-SRC, 0 повторів, 1 запит (як у коді після BUG-001, L-008).
```text
# 2026-11-03 16:27:31
$ grep -c "onLine" .agentic/specs/03-architecture.md .agentic/specs/adr/0005-data-source-coingecko.md .agentic/specs/adr/0001-stack.md
.agentic/specs/03-architecture.md:2
.agentic/specs/adr/0005-data-source-coingecko.md:1
.agentic/specs/adr/0001-stack.md:1
EXIT=0
$ python -c "import sys;t=open('.agentic/specs/adr/0001-stack.md',encoding='utf-8').read();n=t.count('на 5xx і мережу — 2');print('старих формулювань ADR 0001:',n);sys.exit(n)"
старих формулювань ADR 0001: 0
EXIT=0
$ python -c "import sys;fs=['.agentic/specs/adr/0005-data-source-coingecko.md','.agentic/specs/adr/0001-stack.md'];old=['власні '+chr(96)+'retry'+chr(96),'на 5xx і мережу — 2'];n=sum(open(f,encoding='utf-8').read().count(o) for f in fs for o in old);print('retry TanStack / старе ADR 0001:',n);sys.exit(n)"
retry TanStack / старе ADR 0001: 0
EXIT=0
$ python -c "import sys;fs=['.agentic/specs/03-architecture.md','.agentic/specs/adr/0005-data-source-coingecko.md','.agentic/specs/04-ux-and-contract.md','.agentic/specs/implementation_plan.md'];old=['мережа після 2 повторів','5xx / мережа / таймаут','5xx, мережа, таймаут','мережа / таймаут 10 с / 5xx','на мережеву помилку, таймаут і 5xx'];n=sum(open(f,encoding='utf-8').read().count(o) for f in fs for o in old);print('старих формулювань:',n);sys.exit(n)"
старих формулювань: 0
EXIT=0
```

**Запит №5 — валідатор етапу (2026-11-03 16:28:28, після вердикту PASS рев'ю №3, повний вивід):**
```text
$ python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 3

=== Перевірка етапу: Stage 3 ===
ℹ️  [INFO] Архітектура: NFR, ADR, STRIDE і вибір стеку — скіл solution-architect
✅ [PASS] Передумови схвалено: 2
ℹ️  [INFO] Перевірка звіту: .agentic/reports/03-architecture-report.md
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 14 перевірок із кодами виходу
✅ [PASS] Карта технологій заповнена (11 рядків)
✅ [PASS] Conventional Commit у секції 7 валідний
✅ [PASS] Артефакт .agentic/specs/03-architecture.md знайдено
✅ [PASS] Артефакт '.agentic/specs/adr/*.md': 6 файлів
✅ [PASS] Артефакт .agentic/project.json знайдено

=== Правила якості коду: . ===
✅ [PASS] Перевірено файлів: 85, порушень-помилок немає

=== Сканування секретів: . ===
ℹ️  [INFO] Проскановано файлів: 193
✅ [PASS] Відкритих секретів не виявлено

УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

**Запит на зміну №6 (TD-020, TD-022):**

```text
$ date "+%H:%M:%S"
02:26:18
$ grep -c "після відкриття — 0 запитів у прихованій вкладці" .agentic/specs/03-architecture.md
1
EXIT=0
$ grep -c "change7dPct: number . null" .agentic/specs/03-architecture.md        (02:27:42)
1
EXIT=0
$ python verify-gate.py --scan-secrets .agentic/specs        (02:27:24, після останньої правки специфікацій)
ℹ️  [INFO] Проскановано файлів: 13
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

**Запит на зміну №6, повтор після рев'ю №1:**

```text
$ date "+%H:%M:%S"
02:36:50
$ grep -c "після відкриття — 0 запитів у прихованій вкладці" .agentic/specs/03-architecture.md
1
EXIT=0
$ grep -c "change7dPct: number . null" .agentic/specs/03-architecture.md
1
EXIT=0
$ grep -c "Після першої відповіді топ-50" .agentic/specs/03-architecture.md
1
EXIT=0
$ grep -c "ризик прийнято власником 2026-11-04 00:11, п. 6" .agentic/specs/03-architecture.md
2
EXIT=0
$ grep -c "change.none" .agentic/specs/04-ux-and-contract.md
1
EXIT=0
$ grep -c "на посилання цієї монети, якщо воно на екрані" .agentic/specs/04-ux-and-contract.md
1
EXIT=0
$ grep -c "після відкриття — 0 у прихованій" .agentic/specs/04-ux-and-contract.md
1
EXIT=0
$ grep -c "падіння / немає даних" .agentic/specs/04-ux-and-contract.md
1
EXIT=0
$ python verify-gate.py --scan-secrets .agentic/specs        (02:36:50, після останньої правки специфікацій)
ℹ️  [INFO] Проскановано файлів: 13
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

**Запит на зміну №6, повтор після рев'ю №2:**

```text
$ date "+%H:%M:%S"
02:45:21
$ grep -c "після відкриття — 0 запитів у прихованій вкладці" .agentic/specs/03-architecture.md
1
EXIT=0
$ grep -c "change7dPct: number . null" .agentic/specs/03-architecture.md
1
EXIT=0
$ grep -c "Після першої відповіді топ-50" .agentic/specs/03-architecture.md
1
EXIT=0
$ grep -c "ризик прийнято власником 2026-11-04 00:11, п. 6" .agentic/specs/03-architecture.md
2
EXIT=0
$ grep -c "change.none" .agentic/specs/04-ux-and-contract.md
1
EXIT=0
$ grep -c "на посилання цієї монети, якщо воно на екрані" .agentic/specs/04-ux-and-contract.md
1
EXIT=0
$ grep -c "після відкриття — 0 у прихованій" .agentic/specs/04-ux-and-contract.md
1
EXIT=0
$ grep -c "падіння / немає даних" .agentic/specs/04-ux-and-contract.md
1
EXIT=0
$ python -c "import re;t=open('.agentic/specs/03-architecture.md',encoding='utf-8').read();print(len(re.findall(r'(?m)^ +\w+-+>>?\w+:.*(?<!#35);',t)))"
0
EXIT=0
$ python verify-gate.py --scan-secrets .agentic/specs        (02:45:21, після останньої правки специфікацій)
ℹ️  [INFO] Проскановано файлів: 13
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

**Запит №6 — валідатор етапу:**

```text
$ python "C:/Users/learn/.claude/skills/gate-check/verify-gate.py" --stage 3      (02:49:30)
✅ [PASS] Передумови схвалено: 2
✅ [PASS] Статус аудиту independent-reviewer: PASS
✅ [PASS] «Валюта довіри»: 22 перевірок із кодами виходу
✅ [PASS] Карта технологій заповнена (11 рядків)
✅ [PASS] Conventional Commit у секції 7 валідний
✅ [PASS] Артефакт .agentic/specs/03-architecture.md знайдено
✅ [PASS] Артефакт '.agentic/specs/adr/*.md': 6 файлів
✅ [PASS] Артефакт .agentic/project.json знайдено
✅ [PASS] Перевірено файлів: 85, порушень-помилок немає
✅ [PASS] Відкритих секретів не виявлено
УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0)
EXIT=0
```

### 4.3. Вердикт незалежного аудиту (`independent-reviewer`)

**Запит на зміну №6, рев'ю №3 (поточний вердикт):**

```text
PASS — independent-reviewer, 2026-11-04 (після 02:45:22 — mtime звіту й трекера; date заблоковано хуком read-only), Stage 3, запит на зміну №6, рев'ю №3 (вузьке; рев'ю №2 — BLOCKERS FOUND, виправлено).
Межі етапу: git add секції 7.2 — 4 файли (03-architecture.md, tech-debt.md, звіт 03, pipeline-state.md), усі в зоні етапу або завжди дозволені; список збігається з 7.1. git status — 10 рядків, після аудиту не змінився; звіт і специфікація етапу 4 йдуть своїм комітом, 01–02 без змістового diff.
Секрети: --scan-secrets .agentic/specs — 13 файлів, 0, exit 0; --stage 3 — 221 файл, 0. Залежності: не застосовно — етап документний, маніфестів у diff немає. Правила якості: --stage 3 — 85 файлів, 0 помилок. Контракт: не застосовно — has_http_api: false.
Закриття BLOCKER: Grep рядків повідомлень sequenceDiagram дає лише рядок 253 із сутністю #35;; у Note / alt / else / loop / participant / actor `;` і `#` — 0. За diff у діаграмах пунктуацію змінено в 3 рядках: 214 і 242 (`;` на `,`), 253 (`#` на #35;); зміст не змінився. Парсером Mermaid не перевірено: mermaid у проєкті немає.
Усі діаграми: 3 sequenceDiagram — alt / else / loop / end збалансовані, слово end лише як закривач блоків, `%%` немає, Note over без заборонених символів; classDiagram — усі дужки закриті, `|`, `«»`, `[]` лише в тілах класів, підпис зв'язку без `:` і `;`. Конструкцій, які ламають Mermaid, читанням не знайдено.
Запит №5 у 4.0: 5 рядків із позначкою коміту `9417669` (коміт існує, 2026-11-03 17:18:07, після виводів 16:27:31 і 16:28:28); --stage 3 рахує 22 рядки «Валюти довіри» як валідні.
Реєстр боргу: 28 рядків TD, усі по 9 колонок (перевірка регулярним виразом). TD-022 доповнено UX §5.3, §9.3 і STRIDE. TD-027: тестові файли існують, TC-063 має передумову «видима вкладка». TD-028 — факт: запис трекера 2026-11-03 00:53 вимагає справжні поле пошуку й сортування, UX S-1 Loading (рядок 152) каже «скелетон панелі», код CoinListPage.jsx:67 показує панель у loading, звіт 07 рядок 826 і звіт 04 рядок 385 це підтверджують.
Повторний запуск рядків 4.0 на фінальних файлах: виняток NFR-3 — 1; тип у §6 — 1; діаграма 7.1 — 1; STRIDE I — 2; onLine у 03-architecture.md — 2; сканер .agentic/specs — 13 / 0, exit 0. Рядок «`;` у текстах діаграм»: python -c не запускався (поза дозволом хука), Grep-еквівалент — лише рядок 253, який команда автора виключає, тобто 0. Усі збігаються з блоком 4.2 «повтор після рев'ю №2». verify-gate.py --stage 3 — exit 1, єдина помилка «Статус аудиту»; «Валюта довіри» — 22 перевірки.
Звіт: числа й час 4.0 збігаються з блоком 02:45:21; L-002 — застарілих згадок у секціях 3, 6, 7 і блоці гейту немає; L-004 — рядки валідатора й вердикту «не запускалось» з причиною; L-005 — найпізніша позначка 02:45, «Останнє оновлення» трекера 02:45, mtime 02:45:22; блок гейту — 3 пункти, чекбокси порожні.
Трасування: 26/26 рядків матриці без змін, змінено лише NFR-3; умова «≤ 2 при відкритті незалежно від visibilityState» — TD-027, пункт 3 гейту. WARNING немає. INFO: рендер Mermaid не перевірено, блок гейту цього не згадує; дрібні правки звіту (рядки 74, 104-105, 488) і колонка рішення TD-022, TD-024.
```

**Після рев'ю №3 (автор, 2026-11-04 02:49):** INFO — дрібні правки звіту, колонка «Рішення власника» TD-022, TD-024; рендер Mermaid — окремий рядок блоку гейту. Специфікації після вердикту не змінювались.

**Запит на зміну №6, рев'ю №2 (спільне для етапів 3 і 4):**

```text
BLOCKERS FOUND — independent-reviewer, 2026-11-04 (після 02:36:50 — mtime звітів; date заблоковано хуком read-only), Stage 3, запит на зміну №6, рев'ю №2.
Межі етапу: git add секції 7.2 — 4 файли, усі в зоні етапу або завжди дозволені; список збігається з 7.1. git status — 10 рядків, після аудиту не змінився. Коду, тестів, ADR і плану в diff немає.
Секрети: --scan-secrets .agentic/specs — 13 файлів, 0; --stage 3 — 221 файл, 0. Залежності: не застосовно. Правила якості: 85 файлів, 0. Контракт: не застосовно.
Повторний запуск: verify-gate.py --stage 3 — exit 1, єдина помилка «Статус аудиту»; «Валюта довіри» — 21 перевірка. Повторено рядки 4.0: виняток NFR-3 — 1, тип у §6 — 1, діаграма 7.1 — 1, STRIDE I — 2, сканер — 13 / 0, кількість NFR — 16, STRIDE — 2, onLine — 2. Усі збігаються.
Закриття знахідок рев'ю №1: STRIDE I, секція 6, TD-020, TD-021, TD-024, TD-027, пункт гейту про STRIDE «SPA · T» — закрито. Діаграма 7.1: порядок запитів виправлено, синтаксис не закрито.
Звірка з кодом: parse.js:38, TopCoinsPoller.jsx, topCoinsQuery.js, useStablecoinIds.js, client.js:111 — збігаються. L-003, L-005 — дотримано.
L-002: інших застарілих згадок у 03-architecture.md і ADR 0005 немає.
BLOCKER: 03-architecture.md:214 і :242 — `;` у тексті sequenceDiagram ламає розбір діаграм 7.1 і 7.2; парсером не перевірено (mermaid не встановлено), підстава — правило документації Mermaid.
WARNING: рядки 4.0 «Запит №5» без коміту. INFO: `#` у рядку 253; TD-022 без §9.3 і STRIDE; підпис «(поточний вердикт)».
```

**Виправлення після рев'ю №2 (автор, 2026-11-04 02:45):** BLOCKER — `;` у рядках діаграм 7.1 і 7.2 замінено на `,`, `#` у діаграмі 7.3 — на `#35;`; лічильник `;` у рядках повідомлень — 0; парсером Mermaid не перевірено. WARNING — рядки 4.0 «Запит №5» позначено комітом `9417669`. INFO — TD-022 доповнено; підпис попереднього вердикту.

**Запит на зміну №6, рев'ю №1 (спільне для етапів 3 і 4):**

```text
PASS — independent-reviewer, 2026-11-04 (після 02:27:42 — mtime звіту; date заблоковано хуком read-only), Stage 3, запит на зміну №6 (TD-020, TD-022).
Межі етапу: git add секції 7.2 — 4 файли, усі в зоні етапу або завжди дозволені; список збігається з 7.1. git status — 10 рядків, після аудиту не змінився; файли 01–02 змістового diff не мають. Коду, тестів, ADR і плану diff не містить.
Секрети: --scan-secrets .agentic/specs — 13 файлів, 0, exit 0; --stage 3 — 221 файл, 0. Залежності: не застосовно. Правила якості: 85 файлів, 0. Контракт: не застосовно — has_http_api: false.
Повторний запуск: verify-gate.py --stage 3 — exit 1, єдина помилка «Статус аудиту»; «Валюта довіри» — 19 перевірок. Рядки 4.0 запиту №6 повторено: виняток NFR-3 — 1, тип у §6 — 1 (Grep), сканер — 13 / 0. Усі збігаються.
Звірка з кодом: parse.js, sort.js, TopCoinsPoller.jsx, topCoinsQuery.js, useStablecoinIds.js, client.js:111 — збігаються з NFR-3 і §6. L-003, L-004, L-005 — дотримано.
Трасування: 26/26 рядків матриці, змінено лише NFR-3. Нова умова «≤ 2 незалежно від visibilityState» окремої перевірки не має (WARNING).
WARNING: TD-020 закривається лише разом з UX §8; STRIDE I про IP не оновлено після рішення 2026-11-04 00:11, п. 6; зміна STRIDE всупереч фразі рішення 14:18 — на гейт; діаграма 7.1 показує стейблкоїни паралельно; застарілий рядок TD-021 у секції 6; «§6» у рядку TD-024 реєстру.
```

**Виправлення після рев'ю №1 (автор, 2026-11-04 02:36):** TD-020 — гейти 3 і 4, UX §8 у «Місці»; STRIDE I про IP — ризик прийнято 00:11, п. 6, рядок секції 6 оновлено; діаграма 7.1 — запит стейблкоїнів після першої відповіді топ-50; TD-027 — немає перевірки першого завантаження у прихованій вкладці; TD-021 у секції 6 — закрито; TD-024 у реєстрі — UX §4; правка STRIDE «SPA · T» — окремий пункт гейту.


**Рев'ю №3 запиту на зміну №5 (вердикт того запиту):**
```text
PASS — independent-reviewer, 2026-11-03 (після 16:24 — mtime трекера; date хуком read-only недоступний), Stage 3, Revise за запитом на зміну №5 (TD-021), рев'ю №3 (№1 ≈ 14:43 і №2 ≈ 16:18 — BLOCKERS FOUND, виправлено).
Межі етапу: git add секції 7.2 — 6 файлів (.agentic/specs/03-architecture.md, adr/0001-stack.md, adr/0005-data-source-coingecko.md, .agentic/tech-debt.md, .agentic/reports/03-architecture-report.md, .agentic/pipeline-state.md), усі в зоні етапу 3 або завжди дозволені; список збігається з 7.1 і git status. Інші зміни в робочому дереві (етапи 4, 6, 7, 8.a, project.json) до git add етапу 3 не входять. git status після аудиту не змінився (46 рядків).
Секрети: verify-gate.py --stage 3 (сканування .) — 193 файли, 0 секретів; у ADR 0005 — лише назва заголовка x-cg-demo-api-key в цитаті документації, значень немає.
Залежності: не застосовно — етап документний. Правила якості: verify-gate.py --stage 3 — 85 файлів, 0 помилок. Контракт: не застосовно — has_http_api: false (ADR 0001, ADR 0005).
Повторний запуск: verify-gate.py --stage 3 — exit 1, єдина помилка «Статус аудиту … не PASS» (очікувана до вердикту), «Валюта довіри»: 14 перевірок із кодами виходу. Рядки 4.0 «Запит №5» повторено Grep-ом: onLine — 2/1/1; старі формулювання у .agentic/specs — 0. Команда 4.0 «механізм повторів у ADR» дослівно ідентична команді 4.2.
Виправлення рев'ю №2: (1) команда 4.0 = 4.2 — так; (2) STRIDE IP-рядки — «підтвердити на гейті (L-003)», інші «прийнятий ризик» мають запис власника в трекері; (3) секція 6 — реєстр TD-001 – TD-023, рядки TD-020, TD-021, TD-022 узгоджено з tech-debt.md.
Звірка з кодом: src/market-data/client.js, MarketDataProvider.jsx (retry: false), TopCoinsPoller.jsx (refetchInterval 60000, refetchIntervalInBackground: false), client.test.js (таблиця тригерів) — збігаються з NFR-3, діаграмою 7.1, ADR 0005 і ADR 0001.
Трасування: 26/26 рядків матриці без змін; NFR-3 має перевірку на етапах 7, 8.a, 8.b.
WARNING: вивід 4.2 (16:21:39) знято раніше за останню правку 03-architecture.md (16:22:34), лічильники не змінились; секція 3 не згадує зміну STRIDE IP-рядків; шапка «рев'ю ще не проведено» і немає запису рев'ю №2; TD-021 у tech-debt.md не називає ADR 0001.
Після вердикту (автор, 2026-11-03 16:28): 4 команди 4.0 перезапущено о 16:27:31 (вивід у 4.2, лічильники ті самі); секцію 3, шапку, запис рев'ю №2, TD-021 (ADR 0001) і 7.1 («лише CRLF у 01–02») виправлено.
```

**Рев'ю запиту на зміну №5, №1 (2026-11-03 ≈ 14:43, час — «Start at» з виводу рев'юера):** BLOCKERS FOUND — виправлено 14:47 – 14:48: ADR 0005 і ADR 0001 — повтори робить власна політика `fetchTopCoins`, `retry` TanStack Query вимкнено (P-4); ADR 0001 — у секціях 3, 4.0, 4.2, 7 і в трекері; старі рядки 4.0 позначено `2edc20f`; секція 7 — новий список і повідомлення коміту; колонка перевірки NFR-3 доповнена; блок «Запит №5» перенесено в 4.2; ризики Safari й IP — «підтвердити на гейті» (L-003); TD-021 — «вирішено, закривається на гейті етапу 3».

**Рев'ю запиту на зміну №5, №2 (2026-11-03 ≈ 16:18):** BLOCKERS FOUND — (1) вивід 4.2 «механізм повторів у ADR» не відповідав команді 4.0; (2) STRIDE IP-рядки «прийнятий ризик» без запису власника (L-003); (3) секція 6 без реєстру й TD-020/021/022; WARNING — вивід до правок 14:47 – 14:48, формулювання ризику Safari. Виправлено 16:21 – 16:23.

**Попередній вердикт (етап 3, 2026-11-02):**
```text
PASS — independent-reviewer, 2026-11-02, Stage 3 (третій прохід; перші два — BLOCKERS FOUND, виправлено).
Межі етапу: 10 файлів (git status --short --untracked-files=all): .agentic/pipeline-state.md, .agentic/project.json (M); .agentic/reports/03-architecture-report.md, .agentic/specs/03-architecture.md, .agentic/specs/adr/0001…0006 (нові). Усі в зоні етапу 3; коду й маніфестів пакетів немає; список збігається з 7.1; git status після аудиту не змінився. Бриф, вимоги й backlog не змінено.
Секрети: verify-gate.py --scan-secrets .agentic/ — 16 файлів, 0 секретів, exit 0; --scan-secrets . — 17 файлів, 0 секретів.
Залежності: етап документний, маніфестів і lock-файлів немає. Рев'юер повторив npm view для 10 пакетів ADR 0001 (react-router 8.5.1, @tanstack/react-query 5.105.2, vite 8.3.5, tailwindcss 4.3.3, oxlint 1.90.0, oxfmt 0.75.0, react 19.3.1, vitest 5.0.5, @axe-core/playwright 4.14.0, create-vite 9.3.3): усі існують, мають репозиторій і офіційний scope, ознак тайпсквотингу немає.
Правила якості: не застосовно (коду немає, quality_rules порожні). Контракт: не застосовно — has_http_api: false (ADR 0001, ADR 0005).
Повторені перевірки 4.0: NFR — 16; STRIDE — 2; ADR з «## Considered Options» — 6 з 6; обов'язкові ADR — 3 з 3; git diff project.json — змінено лише stack (6 ключів), has_http_api (false), deploy_target ("static-hosting"); поля project.json звірено через git diff (python -c не повторювався: хук read-only); секрети — 16/0.
Узгодженість: NFR-3 (≤ 5 запитів за 3 хв і в успішному сценарії, і з 429) узгоджено з ADR 0001/0005, діаграмою 7.1 і STRIDE; розбіжність годинника — console.warn без суперечності з NFR-13; шрифт атрибуції ≥ 14 CSS px покриває 10 pt; 3 ключі localStorage узгоджено в NFR-10, §6, ADR 0004 і ADR 0006; неприйняті ризики чесно позначені «підтвердити на гейті».
Трасування: US-1 – US-10 і NFR-1 – NFR-16 — 26/26 рядків матриці мають місце в архітектурі чи ADR та етап перевірки; US-6 — компроміс у Safari (ADR 0006).
Відхилені команди: одна (git -C …) — повторено без -C успішно; на результат не вплинуло.
```

Після вердикту (2026-11-02): власник на гейті прийняв 4 ризики, позначені «підтвердити на гейті» (розділ 4 трекера), і погодив запис уроків L-001 – L-003. Документи оновлено лише в статусах цих ризиків і переліку файлів; валідатор --stage 3 після оновлення — exit 0.

---


## 5. Матриця трасування вимог (Requirements Traceability)

| ID вимоги | Вимога | Де реалізовано | Чим перевірено | Статус |
| :--- | :--- | :--- | :--- | :--- |
| US-1 | Список топ-50, 25 + 25 | Архітектура §5 `features/coin-list`, `market-data`, `lib`; §7.1; ADR 0005 | Етап 7: модульні тести `lib` (формат, округлення); 8.b: E2E AC-1.1 – AC-1.5 | `✅ Спроєктовано` |
| US-2 | Сортування | §5 `lib` (тай-брейк за рейтингом), `features/coin-list` | 7: модульні тести сортування; 8.b: AC-2.1 – AC-2.8 | `✅ Спроєктовано` |
| US-3 | Пошук | §5 `lib`, `features/coin-list` | 7: модульні тести пошуку; 8.b: AC-3.1 – AC-3.9 | `✅ Спроєктовано` |
| US-4 | Сторінка монети з графіком | §5 `features/coin-page`, `chart`; §7.3; ADR 0001 (HashRouter), ADR 0005 (`sparkline_in_7d`) | 8.b: AC-4.1 – AC-4.4; NFR-6 (текстова альтернатива графіка) | `✅ Спроєктовано` |
| US-5 | Додавання й прибирання обраних | §5 `favorites`; §7.2; ADR 0004 | 7: модульні тести `favorites`; 8.b: AC-5.1 – AC-5.7 | `✅ Спроєктовано` |
| US-6 | Обрані між візитами | §5 `features/favorites-view`, `favorites`; ADR 0004, ADR 0006 | 8.b: AC-6.1 – AC-6.7; 8.a: підказка Safari; NFR-11 | `⚠️ Компроміс у Safari (ADR 0006)` |
| US-7 | Підказки до 6 термінів | §5 `glossary`, `ui`; ADR 0005 (категорія `stablecoins`) | 8.a: клавіатура й зчитувач екрана; 8.b: AC-7.1 – AC-7.4, axe (NFR-6) | `✅ Спроєктовано` |
| US-8 | Недоступні або застарілі дані | §5 `market-data`; §7.1; ADR 0005 | 7: тести з фальшивим годинником (NFR-1); 8.b: AC-8.1 – AC-8.8 | `✅ Спроєктовано` |
| US-9 | Дисклеймер, джерело, без реклами | §5 `app` (макет); NFR-16; §8.4 (примітка про приватність) | 8.b: AC-9.1 – AC-9.3 | `✅ Спроєктовано` |
| US-10 | Світла й темна тема | §5 `theme`; ADR 0004 | 8.b: AC-10.1 – AC-10.2; axe в обох темах (NFR-6) | `✅ Спроєктовано` |
| NFR-1 | Свіжість ≤ 300 с | §7.1, ADR 0005 | Етап 7 (Vitest fake timers), 8.b (E2E) | `✅ Визначено` |
| NFR-2 | Оновлення кожні 60 с у видимій вкладці | ADR 0001 (TanStack Query) | 7, 8.b | `✅ Визначено` |
| NFR-3 | ≤ 2 запити на старті незалежно від `visibilityState`, ≤ 1/хв, після відкриття — 0 у фоні | ADR 0005 | 8.b (лічильник запитів), 8.a (DevTools); відкриття в прихованій вкладці перевірки не має — TD-027 | `✅ Визначено` |
| NFR-4 | LCP ≤ 2,5 с, CLS ≤ 0,1, TBT ≤ 200 мс | §2 | Етап 5 `debt_commands.web_vitals`, 8.b | `✅ Визначено` |
| NFR-5 | JS ≤ 150 КБ gzip | §2 | Етапи 5–7 (вивід `vite build`) | `✅ Визначено` |
| NFR-6 | WCAG 2.2 AA, axe 0 critical/serious | §2 | Етап 5 (`debt_commands.accessibility`), 8.a, 8.b | `✅ Визначено` |
| NFR-7 | Без горизонтальної прокрутки на 320 і 1280 px | §2 | 8.a, 8.b | `✅ Визначено` |
| NFR-8 | CSP через `<meta>`, без `dangerouslySetInnerHTML` | §8.2, §8.3, ADR 0003 | Етапи 5, 7, 8.b | `✅ Визначено` |
| NFR-9 | Ланцюг постачання, audit, SBOM | §8.3 A03 | Етапи 5, 9 | `✅ Визначено` |
| NFR-10 | 0 cookies і трекерів, лише 2 домени | §8.4 | 8.a, 8.b | `✅ Визначено` |
| NFR-11 | Обрані без строку дії; Safari — компроміс | ADR 0004, ADR 0006 | 7, 8.a, опитування | `✅ Визначено` |
| NFR-12 | RTO відкату ≤ 15 хв | §9, ADR 0003 | Етап 9 (репетиція) | `✅ Визначено` |
| NFR-13 | 0 `console.error`, smoke після деплою | §2 | 8.b, 9 | `✅ Визначено` |
| NFR-14 | Останні 2 версії браузерів, Node 24 LTS | ADR 0001 | 5 (CI), 8.a, 8.b | `✅ Визначено` |
| NFR-15 | $0 на місяць | §10, ADR 0003 | Етап 9 | `✅ Визначено` |
| NFR-16 | «Powered by CoinGecko» + дисклеймер на кожному екрані | ADR 0005 | 8.b (AC-9.1, AC-9.2) | `✅ Визначено` |

---

## 6. Ризики, технічний борг і відкриті питання

Реєстр боргу — `.agentic/tech-debt.md` (TD-001 – TD-028). Цього Revise стосуються TD-020, TD-022 і TD-027 (рядки нижче); TD-021 закрито запитом №5.

| Тип | Опис | Вплив | Що пропонується | Власник рішення |
| :--- | :--- | :--- | :--- | :--- |
| Ризик (захід — ADR 0006; прийнятий власником 2026-11-02 — трекер, розділ 4, запис Stage 3 «Must US-5/US-6 … прийнятий ризик в ADR») | Safari видаляє localStorage через 7 днів без взаємодії: обрані можуть зникнути (Must US-5 / US-6, закрито компромісом) | Середній | Підказка «Додайте на головний екран» + маніфест (ADR 0006); питання в опитуванні (A-4) | Власник продукту (рішення 2026-11-02) |
| Ризик (прийнятий власником 2026-11-02) | Ліміт keyless-доступу CoinGecko не задокументований; відвідувачі за одним NAT ділять квоту | Середній | ≤ 1 запит/хв, пауза в прихованій вкладці, на 429 без швидких повторів; працюємо як є, без запасного плану (рішення власника) | Власник продукту |
| Ризик | CoinGecko кешує відповіді «around 1 to 5 minutes»: можливі хибні стани «Помилка» біля межі 5 хв | Середній | Guardrail M-5 важливіший; спостерігати на 8.a | Власник продукту / етап 8.a |
| Ризик (прийнятий власником 2026-11-02) | Свіжість рахується за годинником пристрою (заголовок `Date` недоступний через CORS); якщо годинник відстає більш ніж на 5 хв, застарілі ціни можуть показатися як свіжі (guardrail M-5) | Середній | Реалізувати саме цю схему (рішення власника); `last_updated` із майбутнього — `console.warn` (ADR 0005) | Власник продукту |
| Ризик (прийнятий власником 2026-11-02) | Clickjacking: `frame-ancestors` неможливо задати на GitHub Pages | Низький | «Не проблема» (рішення власника): на сторінці немає небезпечних дій | Власник продукту |
| Ризик (прийнятий власником 2026-11-02) | Підроблений сайт під схожою адресою (STRIDE S) | Низький | «Не проблема» (рішення власника): немає входу й платежів; посилання надсилається особисто | Власник продукту |
| Ризик (прийнятий власником 2026-11-04 00:11, п. 6 — трекер, розділ 4) | GitHub і CoinGecko бачать IP-адреси відвідувачів | Низький | Примітка про приватність (§8.4) | Власник продукту |
| Борг TD-021 (закрито 2026-11-03, гейти 3 `9417669`, 4 `a6719e0`, 6 `f1ac4b5`) | NFR-3, діаграма 7.1, ADR 0005 і ADR 0001 вимагали 2 повторів на будь-яку мережеву помилку, а код після BUG-001 повторює лише офлайн, при таймауті й 5xx | Низький | Документи приведено до коду запитом №5 (рішення власника 14:35) | Власник продукту |
| Борг TD-020 (вирішено запитом №6, закривається гейтами етапів 3 і 4) | Виняток першого завантаження (перший запит топ-50 і перший запит стейблкоїнів у прихованій вкладці, 2 запити) записано в NFR-3. `preload` прибрано в Revise №6 етапу 7, кількість запитів це не змінило | — | — | Власник продукту (рішення 2026-11-03 04:41) |
| Борг TD-022 (вирішено запитом №6, закривається гейтами етапів 3 і 4) | §6 — `change7dPct: number \| null`, правило `null`; код за варіантом Б BUG-003 не змінювався. TC-086 вже переписано (Revise 8.a) | — | Частина UX — гейт етапу 4 | Власник продукту |
| Борг TD-027 (новий, відкрито) | Умова NFR-3 «≤ 2 запити при відкритті незалежно від `visibilityState`» не має перевірки: ні тесту, ні TC | Низький | Рядок таблиці тригерів і TC у наступному Revise етапів 7 і 8.a або прийняти як борг — пункт 3 гейту | Власник продукту |
| Борг (свідомий) | JavaScript без перевірки типів | Середній | JSDoc, Oxlint, перевірка форми відповіді, тести; TypeScript — окремий ADR у майбутньому | Власник продукту |
| Наслідок | Репозиторій має бути публічним для GitHub Pages на GitHub Free | Низький | Секретів немає; власник робить репозиторій публічним на етапі 5 | Власник продукту |
| Питання | Тексти примітки про приватність, підказки Safari, помилки «сховище недоступне» | Низький | Етап 4 | Етап 4 |
| Питання | Окремого staging немає | Низький | `vite preview` артефакту в CI перед деплоєм (ADR 0003) | Етап 9 |

### 6.1. Карта технологій для самостійного опанування

| Технологія / Інструмент / Патерн | Рівень опанування | Ключові концепції | Офіційне першоджерело |
| :--- | :--- | :--- | :--- |
| C4-модель | **Розуміти** | Context, Container, Component; межі системи | https://c4model.com/ |
| ADR у форматі MADR | **Вміти** | Контекст, драйвери, варіанти, рішення, наслідки, підтвердження | https://adr.github.io/madr/ |
| NFR і атрибути якості | **Вміти** | Поріг + умова вимірювання + етап перевірки | https://iso25000.com/index.php/en/iso-25000-standards/iso-25010 |
| STRIDE | **Розуміти** | Spoofing, Tampering, Repudiation, Information disclosure, DoS, Elevation; межі довіри | https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats |
| OWASP Top 10:2025 | **Знати** | A01 – A10, зокрема A03 Supply Chain і A05 Injection (XSS) | https://top10.owasp.org/2025/ |
| Content Security Policy | **Вміти** | `default-src`, `connect-src`, `img-src`; обмеження `<meta>` | https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP |
| React 19 | **Вміти** | Компоненти, стан, хуки | https://react.dev/learn |
| React Router (декларативний режим) | **Вміти** | `HashRouter`, `Routes`, `Route`, параметри `:id` | https://reactrouter.com/start/declarative/installation |
| TanStack Query | **Вміти** | `useQuery`, `refetchInterval`, `retry`, стани запиту | https://tanstack.com/query/latest/docs/framework/react/overview |
| Web Storage і ITP у Safari | **Розуміти** | `localStorage`, 7-денний ліміт WebKit, виняток для головного екрана | https://webkit.org/tracking-prevention/ |
| GitHub Pages + Actions | **Вміти** | `deploy-pages`, `base` у Vite, відкат повторним деплоєм | https://docs.github.com/en/pages |

---

## 7. Точка фіксації в Git (Recommended Git Commit Checkpoint)

### 7.1. Список файлів для індексації (`git status --short`)

Revise за запитом на зміну №6 (TD-020, TD-022). Попередні коміти етапу — у журналі трекера (розділ 3). Файли 01–02 (лише закінчення рядків) у коміт не йдуть.

```text
 M .agentic/specs/03-architecture.md
 M .agentic/tech-debt.md
 M .agentic/reports/03-architecture-report.md
 M .agentic/pipeline-state.md
 M .claude/rules/project-lessons.md
```

### 7.2. Явна індексація та коміт (Conventional Commits)

```bash
git add -- .agentic/specs/03-architecture.md .agentic/tech-debt.md .agentic/reports/03-architecture-report.md .agentic/pipeline-state.md .claude/rules/project-lessons.md
git commit -m "docs(stage-3): allow first-load requests in hidden tab, allow null 7d change"
```

---

### 🛑 Рішення власника продукту (Human Approval Gate)

**Запит на зміну №6 — на цьому гейті:**

1. Схвалити зміни етапу 3: NFR-3 (виняток першого завантаження), §6 (`change7dPct: number | null`), діаграма 7.1 (запит стейблкоїнів після першої відповіді топ-50), STRIDE.
2. Рядок STRIDE «SPA · T» змінено (виняток `null`), хоча рішення 2026-11-03 14:18 казало «ADR 0005 і STRIDE не змінюються»; підстава — рішення 2026-11-04 00:11, п. 4 (документи етапів 3 і 4). Підтвердити цю правку.
3. TD-027 (немає перевірки «≤ 2 запити при відкритті в прихованій вкладці»): тест і TC у наступному Revise етапів 7 і 8.a чи прийняти як борг.

Діаграми перевірено читанням і підрахунком символів; парсером Mermaid не перевірено — його немає в проєкті. Рендер видно на GitHub після push.

- [x] **Approve & закоміть** — статус `APPROVED_AND_COMMITTED`: агент оновлює `.agentic/pipeline-state.md`, позначає цей чекбокс, виконує явний `git add` і `git commit`.
- [ ] **Approve без коміту** — статус `APPROVED_MANUAL_COMMIT`: власник комітить самостійно.
- [ ] **Revise** — статус `REJECTED_REVISING`: зауваження нижче, етап повертається на Фазу 3.

**Коментарі / Зауваження:**
> 2026-11-02: власник обрав «Approve & закоміть». На гейті прийнято 4 ризики (розділ 4 трекера) і погоджено запис уроків L-001 – L-003.
> 2026-11-03 14:35: Revise за запитом на зміну №5 (TD-021, рішення власника «Оновити документи»): документи про повтори приведено до коду; статус `REJECTED_REVISING`, чекбокси знову порожні до гейту (порядок гейтів 3 → 4 → 6 → 7).
> 2026-11-04 02:27: Revise за запитом на зміну №6 (TD-020, TD-022, команда власника «Так, запит №6»): статус `REJECTED_REVISING`, чекбокс знову порожній до гейту.
> 2026-11-04 13:46: власник обрав «Закоміть 3 і 4, борг у спринт 2» (APPROVED_AND_COMMITTED). Підтверджено правку STRIDE «SPA · T» (виняток `null`); TD-027 лишається відкритим боргом на спринт 2, ризик не прийнято (L-003).
