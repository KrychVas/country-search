import { afterEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '../src/core/http-error.js';
import { searchCountries } from '../src/core/search-countries.js';
import type { CountryApi } from '../src/types/country.js';

const spain: CountryApi = {
  name: 'Spain',
  flag: '🇪🇸',
  flags: { png: 'https://flagcdn.com/w320/es.png', svg: 'https://flagcdn.com/es.svg' },
  capital: 'Madrid',
  region: 'Europe',
  population: 47351567,
  languages: [{ name: 'Spanish' }],
  currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('searchCountries', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests the encoded name endpoint and returns the parsed array', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([spain]));
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;

    const result = await searchCountries('  Spain  ', signal);

    expect(result).toEqual([spain]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://countries.dev/name/Spain', { signal });
  });

  it('encodes spaces and special characters in the query', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    await searchCountries('bosnia and herzegovina', new AbortController().signal);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://countries.dev/name/bosnia%20and%20herzegovina',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('treats HTTP 404 as an empty result instead of an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'Country not found' }, 404)),
    );

    await expect(searchCountries('zzzzzz', new AbortController().signal)).resolves.toEqual([]);
  });

  it.each([400, 429, 500, 503])(
    'throws HttpError with status %i for a failed response',
    async (status) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'failure' }, status)));

      await expect(searchCountries('spain', new AbortController().signal)).rejects.toMatchObject({
        name: 'HttpError',
        status,
      });
    },
  );

  it('uses a dedicated HttpError class that extends Error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'failure' }, 500)));

    const error = await searchCountries('spain', new AbortController().signal).catch(
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toBeInstanceOf(Error);
    expect((error as HttpError).message).toContain('500');
  });

  it('passes network failures through unchanged', async () => {
    const networkError = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError));

    await expect(searchCountries('spain', new AbortController().signal)).rejects.toBe(networkError);
  });
});
