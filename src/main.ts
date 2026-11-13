import { createCountriesRepository } from './core/country-repository.js';
import { SearchController } from './core/search-controller.js';
import { SearchHistory } from './core/search-history.js';
import type { StorageLike } from './core/search-history.js';
import { createCountrySearchView } from './ui/country-search-view.js';

function memoryStorage(): StorageLike {
  let value: string | null = null;
  return {
    getItem: () => value,
    setItem: (_key: string, nextValue: string) => {
      value = nextValue;
    },
  };
}

function safeLocalStorage(): StorageLike {
  try {
    const storage = window.localStorage;
    const probe = 'country-search:probe';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return memoryStorage();
  }
}

const root = document.createElement('div');
root.id = 'app';
document.body.append(root);

const repository = createCountriesRepository();
const history = new SearchHistory(safeLocalStorage());

const controller = new SearchController({
  search: (query, signal) => {
    history.add(query);
    return repository.search(query, signal);
  },
  debounceMs: 300,
  timeoutMs: 8000,
});

const view = createCountrySearchView(root, {
  onQueryChange: (query) => controller.setQuery(query),
  onRetry: () => controller.retry(),
  onSelect: (country) => controller.selectCountry(country),
  onHistorySelect: (query) => {
    controller.setQuery(query);
    controller.retry();
  },
  getHistory: () => history.list(),
  clearHistory: () => history.clear(),
});

controller.subscribe((state) => view.render(state));
window.addEventListener('pagehide', () => controller.destroy());
