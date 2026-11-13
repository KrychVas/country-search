import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '../src/core/http-error.js';
import { SearchController } from '../src/core/search-controller.js';
import type { CountryApi } from '../src/types/country.js';

const spain: CountryApi = {
  name: 'Spain',
  flag: '🇪🇸',
  flags: { svg: 'https://flagcdn.com/es.svg' },
  capital: 'Madrid',
  region: 'Europe',
  subregion: 'Southern Europe',
  population: 47351567,
  area: 505992,
  borders: ['FRA', 'PRT'],
  languages: [{ name: 'Spanish' }],
  currencies: [{ name: 'Euro', symbol: '€' }],
  alpha2Code: 'ES',
  alpha3Code: 'ESP',
};

function pendingUntilAbort(_query: string, signal: AbortSignal): Promise<CountryApi[]> {
  return new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('SearchController errors and states', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not request anything for an empty or whitespace-only query', () => {
    const search = vi.fn(async () => []);
    const controller = new SearchController({ search, debounceMs: 300 });

    controller.setQuery('   ');
    vi.advanceTimersByTime(1000);

    expect(search).not.toHaveBeenCalled();
    expect(controller.getState()).toMatchObject({
      status: 'idle',
      results: [],
      error: null,
    });
  });

  it('shows loading, maps results and debounces the request', async () => {
    const search = vi.fn(async () => [spain]);
    const controller = new SearchController({ search, debounceMs: 300 });

    controller.setQuery('Spain');
    expect(controller.getState().status).toBe('loading');
    expect(search).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();

    expect(search).toHaveBeenCalledWith('Spain', expect.any(AbortSignal));
    expect(controller.getState()).toMatchObject({
      status: 'success',
      error: null,
    });
    expect(controller.getState().results[0]?.name).toBe('Spain');
  });

  it('treats an empty successful result as the friendly empty state', async () => {
    const controller = new SearchController({ search: vi.fn(async () => []), debounceMs: 300 });

    controller.setQuery('zzzzzz');
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();

    expect(controller.getState()).toMatchObject({
      status: 'empty',
      results: [],
      error: null,
    });
  });

  it('shows HttpError as a retryable error and retries the last query immediately', async () => {
    const search = vi
      .fn<(query: string, signal: AbortSignal) => Promise<CountryApi[]>>()
      .mockRejectedValueOnce(new HttpError(500))
      .mockResolvedValueOnce([spain]);
    const controller = new SearchController({ search, debounceMs: 300 });

    controller.setQuery('Spain');
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    expect(controller.getState().status).toBe('error');
    expect(controller.getState().error).toContain('500');

    controller.retry();
    await flushPromises();

    expect(search).toHaveBeenLastCalledWith('Spain', expect.any(AbortSignal));
    expect(controller.getState().status).toBe('success');
    expect(controller.getState().results[0]?.name).toBe('Spain');
  });

  it('does not render an AbortError caused by a newer input as an error', async () => {
    const search = vi.fn(pendingUntilAbort);
    const controller = new SearchController({ search, debounceMs: 300 });

    controller.setQuery('sp');
    await vi.advanceTimersByTimeAsync(300);
    controller.setQuery('spain');
    await flushPromises();

    expect(controller.getState()).toMatchObject({
      status: 'loading',
      error: null,
      results: [],
    });

    controller.destroy();
  });

  it('ignores a stray AbortError that did not trigger the retry UI', async () => {
    const controller = new SearchController({
      search: vi.fn(async () => {
        throw new DOMException('Aborted', 'AbortError');
      }),
      debounceMs: 300,
    });

    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();

    expect(controller.getState().status).not.toBe('error');
    expect(controller.getState().error).toBeNull();
  });

  it('shows TimeoutError separately from user cancellation', async () => {
    let timeoutController: AbortController | undefined;
    const controller = new SearchController({
      search: vi.fn(pendingUntilAbort),
      debounceMs: 300,
      timeoutMs: 8000,
      createTimeoutSignal: () => {
        timeoutController = new AbortController();
        return timeoutController.signal;
      },
    });

    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(300);
    timeoutController?.abort(new DOMException('The operation timed out.', 'TimeoutError'));
    await flushPromises();

    expect(controller.getState().status).toBe('error');
    expect(controller.getState().error).toContain('занадто довго');
  });

  it('selects and clears a country detail without changing search results', async () => {
    const controller = new SearchController({
      search: vi.fn(async () => [spain]),
      debounceMs: 300,
    });

    controller.setQuery('Spain');
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    const country = controller.getState().results[0];
    expect(country).toBeDefined();

    controller.selectCountry(country ?? null);
    expect(controller.getState().selected?.name).toBe('Spain');
    controller.selectCountry(null);
    expect(controller.getState().selected).toBeNull();
  });
});
