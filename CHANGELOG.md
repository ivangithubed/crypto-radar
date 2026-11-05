# Changelog

Усі помітні зміни Крипто-Радара. Формат — [Keep a Changelog](https://keepachangelog.com/uk/1.1.0/),
версії — [SemVer](https://semver.org/lang/uk/). Службовий перелік комітів нижче генерує `git-cliff` (`pnpm changelog`).

## [Unreleased]

### Changed

- **Runbook релізу:** результат репетиції (2026-11-05): відкат працює лише з `--ref <тег>` (з `--ref main` Pages сайт не замінює, TD-037); відкат на старіший тег виконує workflow того тега — таймаут кроку (TD-034) на ньому не діє. Репетицію відкату `0.1.1` → `0.1.0` проведено 2026-11-05, production після неї — `0.1.0`.

## [0.1.1] — 2026-11-05

Сервісний випуск без змін для відвідувачів: код застосунку й залежності збігаються з 0.1.0 (`git diff v0.1.0 -- src public index.html vite.config.js package.json pnpm-lock.yaml` порожній). Зміцнено релізний workflow; на цій версії проводиться репетиція відкату на 0.1.0 (runbook, 9.6).

### Changed

- **Релізний workflow:** встановлення браузерів для smoke має таймаут кроку 8 хв і дві спроби по 3 хв. Зависання цього кроку на 20 хв під час випуску 0.1.0 більше не з'їдає час релізу й відкату (TD-034).
- **Runbook релізу:** журнал інцидентів, перевірка ввімкненого Pages перед тегом, бюджет RTO відкату та протокол репетиції.

## [0.1.0] — 2026-11-04

Перший випуск (MVP, спринт 1): веб-застосунок для швидкого перегляду курсів 50 найбільших криптовалют без реєстрації. Дані — CoinGecko, хостинг — GitHub Pages. Реліз-кандидат перевірено власником на справжньому Safari (iPhone), 2026-11-04.

### Added

- **Топ-50 монет (US-1):** ціна, зміна за 7 днів, капіталізація, місце в рейтингу; час цін («Ціни на ЧЧ:ХХ»), що оновлюються щохвилини.
- **Сортування й пошук (US-2, US-3):** за ціною, зміною, капіталізацією; пошук за назвою або тікером; «Показати більше».
- **Сторінка монети (US-4):** графік цін за 7 днів із текстовою альтернативою.
- **Обрані (US-5, US-6):** зберігаються лише в браузері; порада для Safari, який стирає дані сайту через 7 днів без взаємодії.
- **Підказки до термінів (US-7):** капіталізація, зміна за 7 днів, тікер, місце в рейтингу, стейблкоїн, волатильність.
- **Недоступні або застарілі дані (US-8):** замість неактуальних цін — зрозуміле повідомлення («Не вдалося отримати ціни», «Немає з'єднання», «Ціни застаріли») і «Спробувати ще раз».
- **Дисклеймер і джерело (US-9):** «Інформація не є інвестиційною порадою», «Powered by CoinGecko», без реклами й аналітики.
- Доступність WCAG 2.2 AA, світла й темна теми за налаштуванням пристрою, адаптація до 320 px.

### Fixed

- Свіжість даних і «Ціни на ЧЧ:ХХ» рахуються за **медіаною** часу оновлення 50 монет, а не за найстарішою: одна рідко оновлювана монета (`figure-heloc`) раніше ховала весь список повідомленням «Ціни застаріли» (BUG-012).
- Під лімітом CoinGecko (429 без CORS) застосунок не повторює запит і не показує хибне «Немає з'єднання» (BUG-001).
- Safari (WebKit): повтори, «Спробувати ще раз» і щохвилинне оновлення більше не отримують закешовану першу відповідь (BUG-010); текст поради Safari — за UX (BUG-011).
- Монета з порожньою зміною за 7 днів показується з «—», а не ховає список (BUG-003); запасний кружок для логотипа (BUG-009); фокус і прокрутка списку при поверненні зі сторінки монети (TD-023).

### Known limitations

- Монета з власною давньою позначкою часу показується з ціною без позначки віку (TD-029, спринт 2).
- Безключовий API CoinGecko має ліміт запитів; при 429 застосунок показує повідомлення й чекає наступного циклу.
- Перемикач теми (US-10) — спринт 2.

<details>
<summary>Службовий перелік комітів (git-cliff)</summary>

### Added

- **stage-7:** Implement sprint 1 mvp screens and data layer (`8645c76`)

### Build and CI

- **stage-5:** Add walking skeleton, verify command and ci (`3c7cc09`)
- **stage-5:** Run acceptance oracle in ci and resolve package exports (`d7d162e`)

### Documentation

- **stage-1:** Add product brief for Крипто-Радар (`04c6271`)
- **stage-2:** Add user stories and gherkin acceptance criteria (`2ff839a`)
- **stage-3:** Add architecture, NFR and ADRs, choose stack (`2edc20f`)
- **stage-4:** Add ux state matrix and interface spec (`4eb4f13`)
- **stage-6:** Add sprint 1 implementation plan and acceptance oracle (`ddcdf0b`)
- **stage-4:** Keep github in privacy note as plain text (`f689fc3`)
- **stage-7:** Record gate decisions and commit hash (`040a537`)
- **stage-3:** Align retry policy with client after bug-001 (`9417669`)
- **stage-4:** Align network error retries with client after bug-001 (`a6719e0`)
- **stage-6:** Align p-4 retry policy with client after bug-001 (`f1ac4b5`)
- **stage-3:** Allow first-load requests in hidden tab, allow null 7d change (`32827ef`)
- **stage-4:** Document null 7d change and focus after returning to the list (`318f1bf`)
- **stage-3:** Compute data freshness by median last_updated (`ee5ce3b`)
- **stage-4:** Align stale error and price time with median freshness (`7af806e`)
- **stage-6:** Align freshness plan with median last_updated (`7b1f7fa`)

### Fixed

- **stage-7:** Fix qa defects bug-001 to bug-008 except bug-003 (`e3fb805`)
- **stage-7:** Fix bug-003 and bug-009, keep list scroll on navigation (`8f0f2a5`)
- **stage-7:** Fix bug-010 and bug-011, focus the returned coin link (`8c68680`)
- **stage-7:** Compute data freshness by median last_updated (`f72a0cd`)

### Maintenance

- **stage-7:** Register hidden scenarios command in project config (`b8e23ff`)

### Tests

- **stage-6:** Allow IP abbreviation in AC-9.3 latin whitelist (`8720a04`)
- **stage-8.a:** Add test plan, manual test run and defect reports (`93d517f`)
- **stage-8.a:** Retest bug-003 and bug-009 after stage 7 revise (`8755fb3`)
- **stage-8.b:** Add e2e acceptance suite with axe in three browsers (`f52746a`)
- **stage-8.b:** Lift webkit quarantine after bug-010 and check safari hint text (`821453d`)
- **stage-8.a:** Retest bug-010 and bug-011 after stage 7 revise 6 (`706c08a`)
- **stage-8.a:** Add bug-012 and tc-092 for median freshness (`c75727c`)
- **stage-8.b:** Cover stale outlier coin in freshness scenario (`fc8a3d5`)

</details>
