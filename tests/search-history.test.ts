import { describe, expect, it, vi } from 'vitest';

import { SearchHistory } from '../src/core/search-history.js';
import type { StorageLike } from '../src/core/search-history.js';

function memoryStorage(initial: string | null = null): StorageLike & { value: string | null } {
  const storage = {
    value: initial,
    getItem: vi.fn(() => storage.value),
    setItem: vi.fn((_key: string, value: string) => {
      storage.value = value;
    }),
  };
  return storage;
}

describe('SearchHistory', () => {
  it('starts empty and survives corrupted JSON', () => {
    expect(new SearchHistory(memoryStorage()).list()).toEqual([]);
    expect(new SearchHistory(memoryStorage('{not json')).list()).toEqual([]);
    expect(new SearchHistory(memoryStorage('{"a":1}')).list()).toEqual([]);
  });

  it('keeps the newest unique queries first, case-insensitively', () => {
    const history = new SearchHistory(memoryStorage(), 'key', 6);

    history.add('Spain');
    history.add('France');
    history.add('  spain  ');
    history.add('');

    expect(history.list()).toEqual(['spain', 'France']);
  });

  it('limits the list to the configured size', () => {
    const history = new SearchHistory(memoryStorage(), 'key', 3);

    for (const query of ['a', 'b', 'c', 'd']) {
      history.add(query);
    }

    expect(history.list()).toEqual(['d', 'c', 'b']);
  });

  it('clears the list', () => {
    const history = new SearchHistory(memoryStorage());
    history.add('Spain');
    history.clear();
    expect(history.list()).toEqual([]);
  });

  it('never throws when storage is unavailable', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const history = new SearchHistory(broken);

    expect(() => history.add('Spain')).not.toThrow();
    expect(history.list()).toEqual([]);
  });
});
