import type { SearchState } from '../core/search-controller.js';
import type { Country } from '../types/country.js';

export interface CountrySearchViewCallbacks {
  onQueryChange(query: string): void;
  onRetry(): void;
  onSelect(country: Country | null): void;
  onHistorySelect(query: string): void;
  getHistory(): string[];
  clearHistory(): void;
}

export interface CountrySearchView {
  render(state: SearchState): void;
}

type ElementOptions = {
  className?: string;
  text?: string;
  attributes?: Record<string, string>;
};

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className !== undefined) {
    node.className = options.className;
  }
  if (options.text !== undefined) {
    node.textContent = options.text;
  }
  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    node.setAttribute(name, value);
  }
  return node;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('uk-UA').format(value);
}

function card(country: Country, onSelect: (country: Country) => void): HTMLButtonElement {
  const button = element('button', {
    className: 'country-card',
    attributes: { type: 'button', 'aria-label': `Деталі: ${country.name}` },
  });

  if (country.flagUrl !== '') {
    const image = element('img', {
      className: 'country-card__flag',
      attributes: { src: country.flagUrl, alt: `Прапор: ${country.name}`, loading: 'lazy' },
    });
    image.addEventListener('error', () => {
      image.replaceWith(
        element('span', { className: 'country-card__flag-emoji', text: country.flagEmoji }),
      );
    });
    button.append(image);
  } else {
    button.append(
      element('span', { className: 'country-card__flag-emoji', text: country.flagEmoji }),
    );
  }

  const body = element('span', { className: 'country-card__body' });
  body.append(
    element('strong', { className: 'country-card__name', text: country.name }),
    element('span', { className: 'country-card__meta', text: `Столиця: ${country.capital}` }),
    element('span', {
      className: 'country-card__meta',
      text: `${country.region} · ${formatNumber(country.population)} осіб`,
    }),
  );
  button.append(body);
  button.addEventListener('click', () => onSelect(country));
  return button;
}

function detailRow(term: string, value: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  fragment.append(
    element('dt', { text: term }),
    element('dd', { text: value === '' ? '—' : value }),
  );
  return fragment;
}

export function createCountrySearchView(
  root: HTMLElement,
  callbacks: CountrySearchViewCallbacks,
): CountrySearchView {
  const shell = element('main', { className: 'app' });
  const header = element('header', { className: 'hero' });
  header.append(
    element('p', { className: 'hero__eyebrow', text: 'countries.dev · live search' }),
    element('h1', { className: 'hero__title', text: 'Пошук країн' }),
    element('p', {
      className: 'hero__subtitle',
      text: 'Почніть вводити назву — результати оновляться автоматично.',
    }),
  );

  const search = element('section', {
    className: 'search-panel',
    attributes: { 'aria-label': 'Пошук країн' },
  });
  const label = element('label', {
    className: 'search-panel__label',
    text: 'Назва країни',
    attributes: { for: 'country-query' },
  });
  const input = element('input', {
    className: 'search-panel__input',
    attributes: {
      id: 'country-query',
      type: 'search',
      placeholder: 'Наприклад, Spain або Ukraine',
      autocomplete: 'off',
      spellcheck: 'false',
    },
  });
  input.addEventListener('input', () => callbacks.onQueryChange(input.value));
  search.append(label, input);

  const historySection = element('section', {
    className: 'history',
    attributes: { 'aria-labelledby': 'history-title' },
  });
  const historyHeader = element('div', { className: 'history__header' });
  historyHeader.append(element('h2', { className: 'history__title', text: 'Останні запити' }));
  const clearHistory = element('button', {
    className: 'button button--ghost button--small',
    text: 'Очистити',
    attributes: { type: 'button' },
  });
  clearHistory.addEventListener('click', () => {
    callbacks.clearHistory();
    renderHistory();
  });
  historyHeader.append(clearHistory);
  const historyList = element('div', { className: 'history__list' });
  historySection.append(historyHeader, historyList);

  const status = element('section', {
    className: 'status',
    attributes: { 'aria-live': 'polite', 'aria-atomic': 'true' },
  });

  const dialog = element('dialog', { className: 'country-dialog' });
  const dialogClose = element('button', {
    className: 'country-dialog__close',
    text: 'Закрити',
    attributes: { type: 'button' },
  });
  dialogClose.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
  dialog.addEventListener('close', () => callbacks.onSelect(null));
  const dialogContent = element('div', { className: 'country-dialog__content' });
  dialog.append(dialogClose, dialogContent);

  shell.append(header, search, historySection, status);
  root.append(shell, dialog);

  function renderHistory(): void {
    const items = callbacks.getHistory();
    historySection.hidden = items.length === 0;
    historyList.replaceChildren(
      ...items.map((query) => {
        const button = element('button', {
          className: 'history__chip',
          text: query,
          attributes: { type: 'button' },
        });
        button.addEventListener('click', () => {
          input.value = query;
          callbacks.onHistorySelect(query);
        });
        return button;
      }),
    );
  }

  function renderLoading(): void {
    const wrapper = element('div', { className: 'state state--loading' });
    wrapper.append(
      element('span', { className: 'spinner', attributes: { 'aria-hidden': 'true' } }),
      element('p', { text: 'Шукаємо країни…' }),
    );
    status.replaceChildren(wrapper);
  }

  function renderIdle(): void {
    status.replaceChildren(
      element('p', {
        className: 'state state--idle',
        text: 'Введіть хоча б одну літеру, щоб почати пошук.',
      }),
    );
  }

  function renderEmpty(): void {
    const wrapper = element('div', { className: 'state state--empty' });
    wrapper.append(
      element('span', {
        className: 'state__icon',
        text: '🔎',
        attributes: { 'aria-hidden': 'true' },
      }),
      element('h2', { text: 'Нічого не знайдено' }),
      element('p', { text: 'Спробуйте інше написання або коротший запит.' }),
    );
    status.replaceChildren(wrapper);
  }

  function renderError(message: string | null): void {
    const wrapper = element('div', {
      className: 'state state--error',
      attributes: { role: 'alert' },
    });
    const retry = element('button', {
      className: 'button button--primary',
      text: 'Повторити',
      attributes: { type: 'button' },
    });
    retry.addEventListener('click', () => callbacks.onRetry());
    wrapper.append(
      element('span', {
        className: 'state__icon',
        text: '⚠️',
        attributes: { 'aria-hidden': 'true' },
      }),
      element('h2', { text: 'Не вдалося виконати пошук' }),
      element('p', { text: message ?? 'Спробуйте ще раз.' }),
      retry,
    );
    status.replaceChildren(wrapper);
  }

  function renderResults(results: Country[]): void {
    const heading = element('div', { className: 'results__heading' });
    heading.append(
      element('h2', { text: 'Результати' }),
      element('span', {
        className: 'results__count',
        text: `${results.length} ${results.length === 1 ? 'країна' : 'країн'}`,
      }),
    );
    const list = element('div', { className: 'results__grid' });
    list.append(
      ...results.map((country) => card(country, (selected) => callbacks.onSelect(selected))),
    );
    status.replaceChildren(heading, list);
  }

  function renderDetails(country: Country | null): void {
    if (country === null) {
      if (dialog.open) {
        dialog.close();
      }
      return;
    }

    const title = element('div', { className: 'country-dialog__heading' });
    if (country.flagUrl !== '') {
      title.append(
        element('img', {
          className: 'country-dialog__flag',
          attributes: { src: country.flagUrl, alt: `Прапор: ${country.name}` },
        }),
      );
    } else {
      title.append(
        element('span', { className: 'country-dialog__flag-emoji', text: country.flagEmoji }),
      );
    }
    const names = element('div');
    names.append(
      element('h2', { text: country.name }),
      element('p', {
        className: 'country-dialog__native',
        text: country.nativeName === '' ? country.alpha3Code : country.nativeName,
      }),
    );
    title.append(names);

    const description = element('p', {
      className: 'country-dialog__description',
      text: country.description,
    });
    const facts = document.createElement('dl');
    facts.append(
      detailRow('Столиця', country.capital),
      detailRow('Регіон', country.region),
      detailRow('Субрегіон', country.subregion),
      detailRow('Населення', `${formatNumber(country.population)} осіб`),
      detailRow('Площа', `${formatNumber(country.area)} км²`),
      detailRow('Мови', country.languages.join(', ')),
      detailRow('Валюта', country.currencies.join(', ')),
      detailRow('Кордони', country.borders.join(', ')),
    );
    dialogContent.replaceChildren(title, description, facts);
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  renderHistory();

  return {
    render(state: SearchState): void {
      if (input.value !== state.query) {
        input.value = state.query;
      }
      renderHistory();

      if (state.status === 'loading') {
        renderLoading();
      } else if (state.status === 'empty') {
        renderEmpty();
      } else if (state.status === 'error') {
        renderError(state.error);
      } else if (state.status === 'success') {
        renderResults(state.results);
      } else {
        renderIdle();
      }

      renderDetails(state.selected);
    },
  };
}
