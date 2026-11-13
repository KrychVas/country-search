import type { CountryApi } from '../types/country.js';
import { HttpError } from './http-error.js';

export const COUNTRIES_API_BASE_URL = 'https://countries.dev';

/**
 * Fetches countries by name. A 404 means "no matches" and resolves to [].
 * Every other non-ok response is an HttpError. Network and abort failures
 * are intentionally propagated so the caller can classify them.
 */
export async function searchCountries(query: string, signal: AbortSignal): Promise<CountryApi[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery === '') {
    return [];
  }

  const url = `${COUNTRIES_API_BASE_URL}/name/${encodeURIComponent(normalizedQuery)}`;
  const response = await fetch(url, { signal });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new HttpError(response.status, url);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new TypeError('Unexpected response from countries API: expected an array');
  }

  return data as CountryApi[];
}
