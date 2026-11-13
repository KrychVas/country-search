import type { CountryApi } from '../types/country.js';
import { searchCountries } from './search-countries.js';

export interface CountriesRepository {
  search(query: string, signal: AbortSignal): Promise<CountryApi[]>;
}

interface InFlightRequest {
  controller: AbortController;
  promise: Promise<CountryApi[]>;
  consumers: number;
}

const DEFAULT_CACHE_SIZE = 50;

function normalizedKey(query: string): string {
  return query.trim().toLocaleLowerCase();
}

function abortedError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

/**
 * Adds a bounded LRU cache and in-flight deduplication on top of searchCountries.
 * Each caller owns its signal; aborting one consumer never rejects the shared
 * promise for the others. The network request is aborted only when the last
 * consumer has gone away.
 */
export function createCountriesRepository(
  maxCacheEntries = DEFAULT_CACHE_SIZE,
): CountriesRepository {
  const cache = new Map<string, CountryApi[]>();
  const inFlight = new Map<string, InFlightRequest>();

  const release = (key: string, entry: InFlightRequest): void => {
    entry.consumers -= 1;
    if (entry.consumers <= 0 && inFlight.get(key) === entry) {
      inFlight.delete(key);
      entry.controller.abort();
    }
  };

  const remember = (key: string, countries: CountryApi[]): void => {
    cache.delete(key);
    cache.set(key, countries);
    while (cache.size > maxCacheEntries) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      cache.delete(oldestKey);
    }
  };

  return {
    search(query: string, signal: AbortSignal): Promise<CountryApi[]> {
      const key = normalizedKey(query);
      if (key === '') {
        return Promise.resolve([]);
      }
      if (signal.aborted) {
        return Promise.reject(signal.reason ?? abortedError());
      }

      const cached = cache.get(key);
      if (cached !== undefined) {
        remember(key, cached);
        return Promise.resolve([...cached]);
      }

      let entry = inFlight.get(key);
      if (entry === undefined) {
        const controller = new AbortController();
        const created: InFlightRequest = {
          controller,
          promise: Promise.resolve([]),
          consumers: 0,
        };
        created.promise = searchCountries(key, controller.signal)
          .then((countries) => {
            remember(key, countries);
            return countries;
          })
          .finally(() => {
            if (inFlight.get(key) === created) {
              inFlight.delete(key);
            }
          });
        // Consumers observe the rejection; this prevents an unhandled rejection
        // when every consumer aborts before the shared promise settles.
        created.promise.catch(() => undefined);
        entry = created;
        inFlight.set(key, entry);
      }

      const shared = entry;
      shared.consumers += 1;

      return new Promise<CountryApi[]>((resolve, reject) => {
        let settled = false;
        const finish = (): boolean => {
          if (settled) {
            return false;
          }
          settled = true;
          signal.removeEventListener('abort', onAbort);
          return true;
        };
        const onAbort = (): void => {
          if (!finish()) {
            return;
          }
          release(key, shared);
          reject(signal.reason ?? abortedError());
        };

        signal.addEventListener('abort', onAbort, { once: true });
        shared.promise.then(
          (countries) => {
            if (!finish()) {
              return;
            }
            shared.consumers -= 1;
            resolve([...countries]);
          },
          (error: unknown) => {
            if (!finish()) {
              return;
            }
            shared.consumers -= 1;
            reject(error);
          },
        );
      });
    },
  };
}
