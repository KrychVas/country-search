import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { searchCountries } from '../src/core/search-countries.js';
import { SearchController } from '../src/core/search-controller.js';
import type { CountryApi } from '../src/types/country.js';

const spainResponse: CountryApi = {
  name: 'Spain',
  flag: '🇪🇸',
  capital: 'Madrid',
  region: 'Europe',
  population: 47351567,
  languages: [{ name: 'Spanish' }],
  currencies: [{ name: 'Euro', symbol: '€' }],
};

const spResponse: CountryApi = {
  name: 'SP',
  capital: 'Old result',
  region: 'Europe',
};

interface PendingRequest {
  query: string;
  signal: AbortSignal;
  resolve: () => void;
}

function createFetchMock(): { fetchMock: ReturnType<typeof vi.fn>; requests: PendingRequest[] } {
  const requests: PendingRequest[] = [];
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const query = decodeURIComponent(url.split('/name/')[1] ?? '');
    const signal = init?.signal;
    if (!(signal instanceof AbortSignal)) {
      throw new Error('The app must pass an AbortSignal to fetch');
    }

    return new Promise<Response>((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      requests.push({
        query,
        signal,
        resolve: () =>
          resolve(
            new Response(JSON.stringify([query === 'sp' ? spResponse : spainResponse]), {
              status: 200,
            }),
          ),
      });
    });
  });

  return { fetchMock, requests };
}

async function flushPromises(): Promise<void> {
  for (let index = 0; index < 10; index += 1) {
    await Promise.resolve();
  }
}

describe('stale request race', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aborts the old request immediately and never renders it after a newer input', async () => {
    const { fetchMock, requests } = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    const controller = new SearchController({
      search: searchCountries,
      debounceMs: 300,
      timeoutMs: 5000,
    });

    controller.setQuery('sp');
    await vi.advanceTimersByTimeAsync(300);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.query).toBe('sp');

    controller.setQuery('spain');
    const oldRequest = requests[0];
    expect(oldRequest?.signal.aborted).toBe(true);

    // Even if the old response is produced now, it must not overwrite the UI.
    oldRequest?.resolve();
    await flushPromises();
    expect(controller.getState()).toMatchObject({
      status: 'loading',
      results: [],
      error: null,
    });

    await vi.advanceTimersByTimeAsync(300);
    expect(requests[1]?.query).toBe('spain');
    requests[1]?.resolve();
    await flushPromises();

    expect(controller.getState().status).toBe('success');
    expect(controller.getState().results.map((country) => country.name)).toEqual(['Spain']);
    controller.destroy();
  });
});
