# Country Search

Live country search built with TypeScript and the public
[countries.dev](https://countries.dev) API. Typing is debounced; every new input
aborts the previous request with `AbortController`, so a slower old response can
never replace the newer result.

**Deploy URL:** [https://krychvas.github.io/country-search/](https://krychvas.github.io/country-search/)

## Features

- Debounced live search (`debounce(fn, 300)`, implemented without lodash).
- Real cancellation on every input change, not post-response filtering.
- Loading, empty (404), real error and results states.
- Retry button repeats the last submitted query.
- Country cards and a detail dialog (description, area, borders, languages,
  currency).
- Bonus: bounded query cache + in-flight deduplication with independent caller
  signals.
- Bonus: recent queries in `localStorage`; clicking one searches immediately.
- Language switcher in the top-right corner: English (default), Ukrainian,
  Russian and Czech. Country data stays in English; all UI labels, states,
  errors, details and numbers are localized.

## Stack

- TypeScript 5.9 (strict), compiled to native ES modules with `tsc`
- Vitest 5, fake timers, mocked `fetch`
- ESLint 9 (flat config), Prettier, Husky, lint-staged
- No UI framework, no bundler, no backend/proxy

## Scripts

```bash
npm install
npm test          # 36 tests
npm run lint
npm run format:check
npm run typecheck
npm run build     # tsc + Pages-ready static copy in dist/
```

`npm test` also passes on an empty test set during the initial tooling commit
(`passWithNoTests: true` in `vitest.config.ts`).

## Local preview

```bash
npm run build
npx serve dist
```

Open the printed URL. The API is called directly and supports CORS, so no proxy
is required.

## Project layout

```text
src/
  core/
    debounce.ts             # generic cancelable debounce
    http-error.ts           # HttpError with status
    search-countries.ts     # fetch wrapper, response.ok, 404 => []
    map-country-response.ts # pure API -> view model mapper
    search-controller.ts    # DOM-free state machine, abort + timeout logic
    country-repository.ts   # cache and reference-counted deduplication
    search-history.ts       # safe localStorage history
  i18n/
    i18n.ts                 # EN/UK/RU/CS dictionaries and plural rules
  ui/
    country-search-view.ts  # createElement/textContent only
  main.ts                   # composition root
tests/                      # unit and race tests
index.html                  # body contains only the module script
styles.css
DESIGN.md                   # cancellation/debounce/complexity rationale
```

## Cancellation and error semantics

- Every `setQuery` calls `abort()` immediately and invalidates the request id,
  before the 300 ms debounce starts.
- `AbortError` from our own new input/clear is ignored by the UI.
- `TimeoutError` from `AbortSignal.timeout(8000)` is a real error with retry.
- 404 is converted to `[]` and shown as “Нічого не знайдено”.
- Other non-ok statuses throw `HttpError` and show the status plus **Повторити**.

See [DESIGN.md](./DESIGN.md) for the full rationale and complexity analysis.

## TDD commit order

Each mandatory function has a failing-test commit followed by an implementation
commit:

1. `test(debounce)` → `feat(debounce)`
2. `test(search-countries)` → `feat(search-countries)`
3. `test(map-country-response)` → `feat(map-country-response)`
4. `test(error-handling)` → `feat(search-controller)`
5. `test(race)` → `fix(search-controller): abort on every input change`
6. Bonus: `test(cache)` → `feat(cache)`
7. Bonus: `test(history)` → `feat(history)`

The race test uses a fetch mock that rejects with `AbortError` when the passed
signal is aborted, so it proves real cancellation rather than late-response
filtering.

## Behaviour checklist

- [x] Empty input sends no request and clears the list.
- [x] Loading indicator is visible while a request is in flight.
- [x] Fast typing cannot render an older response (automated race test).
- [x] The previous request is actually aborted (`Network` → canceled).
- [x] Our own cancellation never appears as an error.
- [x] 404 shows a friendly empty state, not an error.
- [x] Real errors show a message and a retry button for the last query.
- [x] Clicking a card opens the detail view.
- [x] English is the default language; the switch offers Ukrainian, Russian and
      Czech and updates every visible label immediately.
- [ ] Verify the deployed build manually in DevTools with network throttling and
      offline mode.

## Deployment

The included GitHub Pages workflow builds and publishes `dist/` on every push to
`main` or `country-search`:

1. Enable **Settings → Pages → Build and deployment → GitHub Actions**.
2. Push the `country-search` branch. The workflow also deploys from this branch,
   so a working URL exists before the PR is merged.
3. Open a PR into `main` and do not merge it before review.
4. Put the published URL in the PR description and at the top of this README.

## Notes

- `countries.dev` `/name/{query}` returns 404 for “no matches”; that is mapped
  to an empty result rather than an error.
- The app intentionally does not depend on `restcountries.com` v3.1, which now
  redirects to a static page without CORS headers.
