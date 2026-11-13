# Design notes

## 1. Stale-request cancellation

The browser has one `AbortController` for the active request:

```text
input event
  -> debounce.cancel()
  -> activeController.abort()   // immediately, not after the debounce
  -> invalidate request id
  -> schedule the next request in 300 ms
```

The abort happens **on every input change**, before the debounce timer is
started. Aborting only when the next request begins would leave a window of up
to 300 ms in which the previous response can arrive and repaint the list with
results for the old query.

Every request also receives a monotonically increasing id. The id check in
`execute()` is only a second safety net for late promise callbacks; it is **not**
the cancellation mechanism. A real `AbortController.abort()` is required so:

- the browser cancels the network request (visible as `canceled` in DevTools);
- the server/connection work is released;
- a late response cannot call `setState` at all.

A flag such as `isLatestResponse` would still let the old request finish, keep
the connection alive and perform unnecessary work. It would also make the race
test pass by filtering data after the fact instead of proving cancellation. The
race test checks `signal.aborted === true` and uses a fetch mock that rejects
with `AbortError` when aborted, so ignoring the old response is not enough.

### Error classification in `catch`

`src/core/search-controller.ts` checks the causes in this order:

1. **Request id is stale** — ignore the callback completely.
2. **The caller signal is aborted** — the user typed/cleared the field; this is
   normal cancellation, so no error UI and no toast.
3. **The timeout signal is aborted, or `error.name === 'TimeoutError'`** — show
   a retryable timeout message.
4. **`error.name === 'AbortError'`** — ignore a stray abort; it is not a user
   facing failure.
5. **`HttpError`** — show the status and a retry button.
6. **Anything else** — network error with a retry button.

The timeout and caller signals are combined with:

```ts
const signal = AbortSignal.any([callerController.signal, AbortSignal.timeout(8000)]);
```

`AbortSignal.timeout` aborts with a `TimeoutError` reason, while
`controller.abort()` produces `AbortError`. Both reach `fetch`; the controller
distinguishes them by checking the source signals first, then the error name.

### 404 is not an error

`searchCountries` returns `[]` for HTTP 404. The controller maps an empty array
to the friendly `empty` state. Other non-2xx statuses throw `HttpError`, which
is rendered as an error with a **Повторити** button. `response.ok` is checked
explicitly because `fetch` resolves normally for 4xx/5xx.

## 2. Debounce delay

The delay is **300 ms**. A typical fast typist presses a key every 150–250 ms,
so 300 ms coalesces a whole word into one request while still feeling live.
Removing the delay or using 50 ms would send a request per keystroke, create a
burst of aborted requests and waste the API's edge capacity. A delay of 800–1000
ms would feel sluggish and make the loading state appear disconnected from
typing. The timeout is separately **8 s**, long enough for a slow mobile
connection but short enough to give the user a retry action.

`src/core/debounce.ts` is implemented by hand. Each call clears the previous
timer and stores the latest arguments/`this`; `cancel()` clears the pending call
and `flush()` allows an immediate invocation. No lodash or similar dependency is
used.

## 3. Cache and in-flight deduplication (bonus)

`src/core/country-repository.ts` keeps:

- a bounded LRU cache (`Map`, max 50 normalized queries);
- an in-flight `Map` keyed by the same normalized query.

A cache hit touches the key and returns a copy of the cached array. Concurrent
identical queries share one network promise. Each caller still gets its own
signal. The shared request has an internal `AbortController` and a consumer
reference count:

- a caller abort rejects only that caller's promise and decrements the count;
- the network request is aborted only when the last consumer leaves;
- successful results are cached; failures are not cached and the in-flight
  entry is removed so retry can start a fresh request.

This is why one caller's cancellation cannot break another caller waiting on the
same promise. `SearchController` uses the repository through an injected
`search` function, keeping the controller DOM-free and easy to test.

## 4. Complexity

### `mapCountryResponse`

For one country object it is **O(l + c + b)**, where `l`, `c` and `b` are the
number of languages, currencies and borders. It performs a constant number of
operations per item and allocates new arrays/strings; it does not mutate the API
object. Memory is O(l + c + b) for the output.

### Cache and deduplication

- Cache lookup / LRU touch / insertion / eviction: **O(1)** average.
- Cache hit copies the result array: **O(k)** where `k` is the number of
  countries in the cached array (normally a handful).
- In-flight lookup, insertion and reference counting: **O(1)** average.
- Memory: O(50 · k) for the bounded cache plus O(number of active queries) for
  in-flight entries.

### Search history (bonus)

`SearchHistory` keeps at most six items. Listing is O(h) with h ≤ 6, i.e.
effectively O(1); adding is O(h) for the uniqueness scan and JSON serialization.

## 5. Clean-code principles and where they are applied

- **Single responsibility**: `debounce.ts`, `http-error.ts`,
  `search-countries.ts`, `map-country-response.ts`, `country-repository.ts`,
  `search-controller.ts` and `ui/country-search-view.ts` each own one concern.
- **Pure functions**: `mapCountryResponse` has no I/O and no mutation;
  `debounce` is a generic higher-order function independent of the UI.
- **Dependency inversion / testability**: `SearchController` receives `search`
  and an optional `createTimeoutSignal`; tests control time and network without
  a browser. `SearchHistory` receives a small `StorageLike` interface.
- **Explicit errors**: `HttpError` carries `status` and the request URL;
  timeout/abort classification is centralized in `execute()`.
- **Single source of truth**: `SearchController` owns a typed `SearchState`
  (`idle | loading | success | empty | error`); the view only renders snapshots.
- **Defensive boundaries**: `response.ok` is checked, the JSON shape is
  validated as an array, `localStorage` access is wrapped, and cache results are
  copied before being handed out.
- **Safe DOM construction**: `country-search-view.ts` uses `createElement`,
  `textContent`, `replaceChildren` and `append`; there is no `innerHTML` or
  `insertAdjacentHTML` for dynamic content.
- **Accessibility**: the input has a label, the status region uses
  `aria-live`, errors use `role="alert"`, and the detail view is a native
  `<dialog>` with a visible close button.

## 6. Testing strategy

- Fake timers verify debounce reset/cancel and the controller state machine.
- `fetch` is stubbed with explicit `Response` objects for 200, 404 and 5xx.
- The error tests inject a timeout signal so `AbortError` and `TimeoutError`
  travel through different branches.
- `tests/request-race.test.ts` uses a fetch mock that **listens to the passed
  signal and rejects with `AbortError` on abort**. It resolves the earlier `sp`
  request after the newer `spain` input and asserts that the old signal is
  aborted and the UI never renders the old country.
- Cache tests cover a hit, concurrent deduplication, one-of-two cancellation,
  all-consumers cancellation and uncached failures.

## 7. Localization

The UI starts in English (`DEFAULT_LANGUAGE` in `src/i18n/i18n.ts`). The
top-right selector switches between English, Ukrainian, Russian and Czech. All
static copy, loading/empty/error messages, labels, ARIA text, number formatting
and plural forms come from one typed `Messages` dictionary per language.
`document.documentElement.lang` and `document.title` are updated too.

The controller deliberately stores a language-neutral `SearchError`
(`timeout`, `http` with a status, or `network`) instead of a ready-made string.
The view translates it at render time, so changing the language can re-render an
already failed request without repeating the network call. `Intl.PluralRules`
and `Intl.NumberFormat` use the selected locale. Adding a language requires one
new dictionary entry and one entry in `LANGUAGES`; the completeness test fails
if a key is missing.

## 8. Deployment

`npm run build` compiles TypeScript to ES modules with `tsc` and copies a
Pages-ready `index.html` (referencing `./main.js`) plus `styles.css` into
`dist/`. `.github/workflows/deploy.yml` publishes that directory to GitHub
Pages. The app talks directly to `https://countries.dev`; no proxy or backend is
used.
