import type { Country, CountryApi } from '../types/country.js';
import { debounce } from './debounce.js';
import type { DebouncedFunction } from './debounce.js';
import { HttpError } from './http-error.js';
import { mapCountryResponse } from './map-country-response.js';

export type SearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface SearchState {
  query: string;
  status: SearchStatus;
  results: Country[];
  error: string | null;
  lastQuery: string;
  selected: Country | null;
}

export interface SearchControllerOptions {
  search: (query: string, signal: AbortSignal) => Promise<readonly CountryApi[]>;
  debounceMs?: number;
  timeoutMs?: number;
  createTimeoutSignal?: (ms: number) => AbortSignal;
}

export type StateListener = (state: SearchState) => void;

const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_TIMEOUT_MS = 8000;
const TIMEOUT_MESSAGE = 'Запит триває занадто довго. Перевірте з’єднання та спробуйте ще раз.';
const NETWORK_MESSAGE = 'Не вдалося завантажити дані. Перевірте з’єднання та спробуйте ще раз.';

function isNamedError(error: unknown, name: string): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  return (error as { name?: unknown }).name === name;
}

function initialState(): SearchState {
  return {
    query: '',
    status: 'idle',
    results: [],
    error: null,
    lastQuery: '',
    selected: null,
  };
}

/** DOM-independent state machine for the live country search. */
export class SearchController {
  private readonly search: SearchControllerOptions['search'];
  private readonly debounceMs: number;
  private readonly timeoutMs: number;
  private readonly createTimeoutSignal: (ms: number) => AbortSignal;
  private readonly debouncedSearch: DebouncedFunction<[string]>;
  private readonly listeners = new Set<StateListener>();

  private state: SearchState = initialState();
  private activeController: AbortController | null = null;
  private requestId = 0;

  constructor(options: SearchControllerOptions) {
    this.search = options.search;
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.createTimeoutSignal = options.createTimeoutSignal ?? ((ms) => AbortSignal.timeout(ms));
    this.debouncedSearch = debounce((query: string) => {
      void this.execute(query);
    }, this.debounceMs);
  }

  getState(): SearchState {
    return { ...this.state, results: [...this.state.results] };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  setQuery(rawQuery: string): void {
    const query = rawQuery.trim();
    this.debouncedSearch.cancel();

    if (query === '') {
      this.cancelActiveRequest();
      this.patch({ ...initialState(), query: rawQuery });
      return;
    }

    this.patch({
      query: rawQuery,
      status: 'loading',
      results: [],
      error: null,
      selected: null,
      lastQuery: query,
    });
    this.debouncedSearch(query);
  }

  retry(): void {
    const query = this.state.lastQuery;
    if (query === '') {
      return;
    }

    this.debouncedSearch.cancel();
    this.cancelActiveRequest();
    this.patch({ status: 'loading', results: [], error: null, selected: null });
    void this.execute(query);
  }

  selectCountry(country: Country | null): void {
    this.patch({ selected: country });
  }

  destroy(): void {
    this.debouncedSearch.cancel();
    this.cancelActiveRequest();
    this.listeners.clear();
  }

  private cancelActiveRequest(): void {
    this.requestId += 1;
    this.activeController?.abort();
    this.activeController = null;
  }

  private async execute(query: string): Promise<void> {
    this.activeController?.abort();

    const requestId = ++this.requestId;
    const callerController = new AbortController();
    const timeoutSignal = this.createTimeoutSignal(this.timeoutMs);
    const signal = AbortSignal.any([callerController.signal, timeoutSignal]);
    this.activeController = callerController;
    this.patch({ status: 'loading', error: null });

    try {
      const rawCountries = await this.search(query, signal);
      if (requestId !== this.requestId) {
        return;
      }

      const results = rawCountries.map(mapCountryResponse);
      this.patch({
        status: results.length === 0 ? 'empty' : 'success',
        results,
        error: null,
        selected: null,
      });
    } catch (error: unknown) {
      if (requestId !== this.requestId) {
        return;
      }

      if (callerController.signal.aborted) {
        return;
      }

      if (timeoutSignal.aborted || isNamedError(error, 'TimeoutError')) {
        this.patch({ status: 'error', results: [], error: TIMEOUT_MESSAGE, selected: null });
        return;
      }

      if (isNamedError(error, 'AbortError')) {
        return;
      }

      const message =
        error instanceof HttpError
          ? `Сервер повернув помилку ${error.status}. Спробуйте ще раз.`
          : NETWORK_MESSAGE;
      this.patch({ status: 'error', results: [], error: message, selected: null });
    } finally {
      if (this.activeController === callerController) {
        this.activeController = null;
      }
    }
  }

  private patch(partial: Partial<SearchState>): void {
    this.state = { ...this.state, ...partial };
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
