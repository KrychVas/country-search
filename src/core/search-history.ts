export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DEFAULT_KEY = 'country-search:history';
const DEFAULT_LIMIT = 6;

/** Recently requested queries persisted in Web Storage. */
export class SearchHistory {
  private readonly storage: StorageLike;
  private readonly key: string;
  private readonly limit: number;

  constructor(storage: StorageLike, key = DEFAULT_KEY, limit = DEFAULT_LIMIT) {
    this.storage = storage;
    this.key = key;
    this.limit = limit;
  }

  list(): string[] {
    try {
      const raw = this.storage.getItem(this.key);
      if (raw === null) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((item): item is string => typeof item === 'string').slice(0, this.limit);
    } catch {
      return [];
    }
  }

  add(rawQuery: string): void {
    const query = rawQuery.trim();
    if (query === '') {
      return;
    }

    const lower = query.toLocaleLowerCase();
    const next = [query, ...this.list().filter((item) => item.toLocaleLowerCase() !== lower)].slice(
      0,
      this.limit,
    );

    try {
      this.storage.setItem(this.key, JSON.stringify(next));
    } catch {
      // Storage can be unavailable (private mode, quota); search must still work.
    }
  }

  clear(): void {
    try {
      this.storage.setItem(this.key, JSON.stringify([]));
    } catch {
      // Ignore storage failures.
    }
  }
}
