---
status: accepted
date: 2026-11-02
decision-makers: власник продукту
---
# Ціль деплою: static-hosting на GitHub Pages через GitHub Actions

## Context and Problem Statement

Продукт — статичний SPA без сервера (ADR 0001). Знайомі мають відкривати його за посиланням з телефона й ПК (ціль G-2). Бюджет — $0, власного домену немає (бриф §13). Треба обрати, де й як публікувати збірку, як відкочувати версію і що з цього випливає для етапів 5 і 9.

## Decision Drivers

- $0 на місяць, без домену: NFR-15, бриф §13.
- Публічне посилання для 5–20 знайомих: G-2.
- HTTPS і відтворюваний деплой із CI: NFR-8, NFR-12.
- Мінімум налаштувань для початківця; власник уже має обліковий запис GitHub `ivangithubed`.

## Considered Options

1. **`local-only`** — лише локальний запуск і CI, без публічного середовища.
2. **`static-hosting` на GitHub Pages** (деплой через GitHub Actions `actions/deploy-pages`).
3. **`static-hosting` на Cloudflare Pages** — безкоштовний хостинг статики з CDN і превʼю-деплоями.

## Decision Outcome

Обрано **варіант 2 «GitHub Pages»** (рішення власника 2026-11-02). Він безкоштовний для публічного репозиторію, дає HTTPS на `github.io` і не потребує нового облікового запису: код і CI вже живуть на GitHub. Варіант 1 не виконує G-2, бо знайомі не зможуть відкрити продукт. Варіант 3 потребує окремого облікового запису Cloudflare й нічого не дає для 5–20 відвідувачів.

- **`deploy_target`: `static-hosting`**.
- **Адреса:** `https://ivangithubed.github.io/crypto-radar/` (у Vite — `base: '/crypto-radar/'`; маршрути через `HashRouter`, тож `404.html` не потрібен).
- **Середовища:**
  - local: `pnpm dev` і `pnpm preview`;
  - CI: verify на push і pull request;
  - production: GitHub Pages із `main`.

  Окремого staging немає: роль перевірки перед продакшеном виконує `vite preview` того самого артефакту в CI (smoke, axe).
- **Публікація:** workflow з `actions/configure-pages`, `actions/upload-pages-artifact` і `actions/deploy-pages`, права `pages: write` і `id-token: write`, оточення `github-pages`. Збирається один раз, публікується той самий артефакт. Версії дій фіксує етап 5.
- **Міграції:** серверних немає; формат localStorage — ADR 0004.
- **Відкат:** повторний запуск workflow деплою на попередньому коміті (`workflow_dispatch` з ref) або `git revert` і push у `main`; RTO ≤ 15 хв (NFR-12).
- **Вартість:** $0 на місяць (документ архітектури, розділ 10).
- **Передумова:** на GitHub Free репозиторій для Pages має бути **публічним** (погоджено власником 2026-11-02). Секретів у репозиторії немає (ADR 0001, ADR 0005).

### Consequences

- Добре: $0, HTTPS, деплой без збережених секретів (OIDC), той самий інструмент для коду, CI й хостингу.
- Погано: заголовки HTTP не налаштовуються, тож CSP задається лише через `<meta>`. Директиви `frame-ancestors`, `sandbox` і `report-uri` недоступні; захист від clickjacking — прийнятий ризик (власник, 2026-11-02, гейт етапу 3: «не проблема») (STRIDE, розділ 8.2 документа архітектури).
- Погано: GitHub логує IP-адреси відвідувачів «for security purposes»; це розкривається в примітці про приватність (розділ 8.4).
- Погано: код у публічному репозиторії видно всім.
- Нейтрально: м'які ліміти (сайт ≤ 1 ГБ, 100 ГБ трафіку на місяць, деплой ≤ 10 хв) значно перевищують потреби 5–20 відвідувачів. Обмеження на комерційне використання не зачіпає некомерційний продукт.
- Для етапу 5: репозиторій на GitHub (створює й робить публічним власник), CI verify, `base` у Vite, workflow деплою без запуску продакшен-деплою.
- Для етапу 9: реліз — запуск workflow деплою з `main` за згодою власника; smoke після деплою; репетиція відкату на попередньому коміті. Етап 9 не пропускається, бо `deploy_target` не `local-only`; перенести його можна рішенням власника (бриф §8).

### Confirmation

- Етап 5: workflow проходить на гілці без публікації; `vite build` з `base: '/crypto-radar/'` відкривається через `vite preview` за шляхом `/crypto-radar/`.
- Етап 9: `https://ivangithubed.github.io/crypto-radar/` повертає 200 і HTML з назвою продукту; Enforce HTTPS увімкнено; відкат перевірено.

## More Information

Джерела (перевірено 2026-11-02):

- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site — «If the account that owns the repository uses GitHub Free … the repository must be public».
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits — сайт ≤ 1 ГБ, м'який ліміт трафіку 100 ГБ/міс, таймаут деплою 10 хв, обмеження на комерційне використання.
- https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages, розділ «Data collection» — IP-адреси відвідувачів логуються.
- https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https — HTTPS для `github.io`, «Enforce HTTPS».
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages — `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`, права `pages: write`, `id-token: write`.
- https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions — стандартні раннери безкоштовні для публічних репозиторіїв і GitHub Pages.
- MDN, CSP: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy (CSP через `<meta>`); `frame-ancestors`, `sandbox`, `report-uri` не підтримуються в `<meta>`.
- Cloudflare Pages для порівняння не відкривався (не обраний; ціни не наведені).
