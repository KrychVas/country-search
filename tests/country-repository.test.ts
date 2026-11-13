import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCountriesRepository } from '../src/core/country-repository.js';
import type { CountryApi } from '../src/types/country.js';

const spain: CountryApi = { name: 'Spain', capital: 'Madrid' };

function jsonResponse(): Response {
  return new Response(JSON.stringify([spain]), { status: 200 });
}

function abortReason(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

describe('countries repository cache and in-flight deduplication', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serves repeated normalized queries from cache', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse());
    vi.stubGlobal('fetch', fetchMock);
    const repository = createCountriesRepository();

    await repository.search('Spain', new AbortController().signal);
    await repository.search('  spain  ', new AbortController().signal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares one network request between concurrent identical queries', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse());
    vi.stubGlobal('fetch', fetchMock);
    const repository = createCountriesRepository();

    const [first, second] = await Promise.all([
      repository.search('spain', new AbortController().signal),
      repository.search('SPAIN', new AbortController().signal),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual([spain]);
    expect(second).toEqual([spain]);
  });

  it('does not cancel the shared request when only one caller aborts', async () => {
    let fetchSignal: AbortSignal | undefined;
    let release: (() => void) | undefined;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      fetchSignal = init?.signal ?? undefined;
      return new Promise<Response>((resolve, reject) => {
        fetchSignal?.addEventListener('abort', () => reject(fetchSignal?.reason), { once: true });
        release = () => resolve(jsonResponse());
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const repository = createCountriesRepository();
    const firstController = new AbortController();
    const secondController = new AbortController();

    const first = repository.search('spain', firstController.signal);
    const second = repository.search('spain', secondController.signal);
    firstController.abort(abortReason());

    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchSignal?.aborted).toBe(false);

    release?.();
    await expect(second).resolves.toEqual([spain]);
    expect(fetchSignal?.aborted).toBe(false);
  });

  it('aborts the shared request when every caller has aborted', async () => {
    let fetchSignal: AbortSignal | undefined;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      fetchSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        fetchSignal?.addEventListener('abort', () => reject(fetchSignal?.reason), { once: true });
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const repository = createCountriesRepository();
    const firstController = new AbortController();
    const secondController = new AbortController();

    const first = repository.search('spain', firstController.signal);
    const second = repository.search('spain', secondController.signal);
    firstController.abort(abortReason());
    secondController.abort(abortReason());

    await Promise.allSettled([first, second]);
    expect(fetchSignal?.aborted).toBe(true);
  });

  it('does not cache failures', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockResolvedValueOnce(jsonResponse());
    vi.stubGlobal('fetch', fetchMock);
    const repository = createCountriesRepository();

    await expect(repository.search('spain', new AbortController().signal)).rejects.toMatchObject({
      status: 500,
    });
    await expect(repository.search('spain', new AbortController().signal)).resolves.toEqual([
      spain,
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
