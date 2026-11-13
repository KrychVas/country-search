import type { SearchError, SearchState } from '../core/search-controller.js';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LOCALES,
  formatCountryCount,
  formatTemplate,
  getMessages,
  isLanguage,
} from '../i18n/i18n.js';
import type { Language, Messages } from '../i18n/i18n.js';
import type { Country } from '../types/country.js';

export interface CountrySearchViewCallbacks {
  onQueryChange(query: string): void;
  onRetry(): void;
  onSelect(country: Country | null): void;
  onHistorySelect(query: string): void;
  getHistory(): string[];
  clearHistory(): void;
}

export interface CountrySearchViewOptions {
  initialLanguage?: Language;
}

export interface CountrySearchView {
  render(state: SearchState): void;
  setLanguage(language: Language): void;
  getLanguage(): Language;
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

function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(LOCALES[language]).format(value);
}

function errorMessage(error: SearchError | null, messages: Messages): string {
  if (error?.kind === 'timeout') {
    return messages.errorTimeout;
  }
  if (error?.kind === 'http') {
    return formatTemplate(messages.errorHttp, { status: error.status });
  }
  return messages.errorNetwork;
}

function createCard(
  country: Country,
  onSelect: (country: Country) => void,
  messages: Messages,
  language: Language,
): HTMLButtonElement {
  const button = element('button', {
    className: 'country-card',
    attributes: {
      type: 'button',
      'aria-label': formatTemplate(messages.detailsAria, { name: country.name }),
    },
  });

  if (country.flagUrl !== '') {
    const image = element('img', {
      className: 'country-card__flag',
      attributes: {
        src: country.flagUrl,
        alt: formatTemplate(messages.flagAlt, { name: country.name }),
        loading: 'lazy',
      },
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
    element('span', {
      className: 'country-card__meta',
      text: `${messages.capital}: ${country.capital}`,
    }),
    element('span', {
      className: 'country-card__meta',
      text: `${country.region} · ${formatNumber(country.population, language)} ${messages.people}`,
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
  options: CountrySearchViewOptions = {},
): CountrySearchView {
  let language: Language = options.initialLanguage ?? DEFAULT_LANGUAGE;
  let messages = getMessages(language);
  let lastState: SearchState | null = null;

  const languageSwitcher = element('div', { className: 'language-switcher' });
  const languageButton = element('button', {
    className: 'language-switcher__button',
    attributes: {
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-controls': 'language-menu',
    },
  });
  const languageButtonText = element('span', { className: 'language-switcher__current' });
  languageButton.append(
    element('span', {
      className: 'language-switcher__globe',
      text: '🌐',
      attributes: { 'aria-hidden': 'true' },
    }),
    languageButtonText,
    element('span', {
      className: 'language-switcher__chevron',
      attributes: { 'aria-hidden': 'true' },
    }),
  );

  const languageMenu = element('div', {
    className: 'language-switcher__menu',
    attributes: { id: 'language-menu', role: 'menu' },
  });
  languageMenu.hidden = true;
  const languageOptions = LANGUAGES.map((item) => {
    const option = element('button', {
      className: 'language-switcher__option',
      text: item.label,
      attributes: { type: 'button', role: 'menuitem' },
    });
    option.addEventListener('click', () => {
      setLanguage(item.code);
      closeLanguageMenu();
    });
    languageMenu.append(option);
    return { code: item.code, node: option };
  });
  languageSwitcher.append(languageButton, languageMenu);

  function closeLanguageMenu(): void {
    languageMenu.hidden = true;
    languageButton.setAttribute('aria-expanded', 'false');
  }

  function toggleLanguageMenu(): void {
    const willOpen = languageMenu.hidden;
    languageMenu.hidden = !willOpen;
    languageButton.setAttribute('aria-expanded', String(willOpen));
  }

  languageButton.addEventListener('click', toggleLanguageMenu);
  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && !languageSwitcher.contains(event.target)) {
      closeLanguageMenu();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !languageMenu.hidden) {
      closeLanguageMenu();
      languageButton.focus();
    }
  });

  const shell = element('main', { className: 'app' });
  const header = element('header', { className: 'hero' });
  const eyebrow = element('p', { className: 'hero__eyebrow', text: 'countries.dev · live search' });
  const title = element('h1', { className: 'hero__title' });
  const subtitle = element('p', { className: 'hero__subtitle' });
  header.append(eyebrow, title, subtitle);

  const search = element('section', { className: 'search-panel' });
  const label = element('label', {
    className: 'search-panel__label',
    attributes: { for: 'country-query' },
  });
  const input = element('input', {
    className: 'search-panel__input',
    attributes: {
      id: 'country-query',
      type: 'search',
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
  const historyTitle = element('h2', {
    className: 'history__title',
    attributes: { id: 'history-title' },
  });
  const clearHistory = element('button', {
    className: 'button button--ghost button--small',
    attributes: { type: 'button' },
  });
  clearHistory.addEventListener('click', () => {
    callbacks.clearHistory();
    renderHistory();
  });
  historyHeader.append(historyTitle, clearHistory);
  const historyList = element('div', { className: 'history__list' });
  historySection.append(historyHeader, historyList);

  const status = element('section', {
    className: 'status',
    attributes: { 'aria-live': 'polite', 'aria-atomic': 'true' },
  });

  const dialog = element('dialog', { className: 'country-dialog' });
  const dialogClose = element('button', {
    className: 'country-dialog__close',
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

  const footer = element('footer', { className: 'footer' });
  const madeBy = element('p', { className: 'footer__item', text: 'Made by ' });
  madeBy.append(
    element('a', {
      className: 'footer__link',
      text: 'Vasyl Krychfalushii',
      attributes: {
        href: 'https://github.com/KrychVas',
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
  );
  const rsSchool = element('p', { className: 'footer__item', text: 'Powered by ' });
  rsSchool.append(
    element('a', {
      className: 'footer__link',
      text: 'RS School',
      attributes: {
        href: 'https://rs.school/',
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
  );
  footer.append(
    madeBy,
    element('p', { className: 'footer__item footer__year', text: '© 2026' }),
    rsSchool,
  );

  shell.append(header, search, historySection, status, footer);
  root.append(shell, languageSwitcher, dialog);

  function updateLanguageControl(): void {
    const current = LANGUAGES.find((item) => item.code === language);
    languageButtonText.textContent = current?.label ?? 'English';
    languageButton.setAttribute('aria-label', messages.languageAria);
    languageMenu.setAttribute('aria-label', messages.languageAria);
    for (const option of languageOptions) {
      option.node.setAttribute('aria-current', option.code === language ? 'true' : 'false');
    }
  }

  function applyCopy(): void {
    document.documentElement.lang = language;
    document.title = messages.pageTitle;
    updateLanguageControl();
    search.setAttribute('aria-label', messages.searchAria);
    title.textContent = messages.title;
    subtitle.textContent = messages.subtitle;
    label.textContent = messages.searchLabel;
    input.placeholder = messages.searchPlaceholder;
    historyTitle.textContent = messages.historyTitle;
    clearHistory.textContent = messages.clearHistory;
    dialogClose.textContent = messages.close;

    if (lastState !== null) {
      render(lastState);
    }
  }

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
      element('p', { text: messages.loading }),
    );
    status.replaceChildren(wrapper);
  }

  function renderIdle(): void {
    status.replaceChildren(element('p', { className: 'state state--idle', text: messages.idle }));
  }

  function renderEmpty(): void {
    const wrapper = element('div', { className: 'state state--empty' });
    wrapper.append(
      element('span', {
        className: 'state__icon',
        text: '🔎',
        attributes: { 'aria-hidden': 'true' },
      }),
      element('h2', { text: messages.emptyTitle }),
      element('p', { text: messages.emptyText }),
    );
    status.replaceChildren(wrapper);
  }

  function renderError(error: SearchError | null): void {
    const wrapper = element('div', {
      className: 'state state--error',
      attributes: { role: 'alert' },
    });
    const retry = element('button', {
      className: 'button button--primary',
      text: messages.retry,
      attributes: { type: 'button' },
    });
    retry.addEventListener('click', () => callbacks.onRetry());
    wrapper.append(
      element('span', {
        className: 'state__icon',
        text: '⚠️',
        attributes: { 'aria-hidden': 'true' },
      }),
      element('h2', { text: messages.errorTitle }),
      element('p', { text: errorMessage(error, messages) }),
      retry,
    );
    status.replaceChildren(wrapper);
  }

  function renderResults(results: Country[]): void {
    const heading = element('div', { className: 'results__heading' });
    heading.append(
      element('h2', { text: messages.resultsTitle }),
      element('span', {
        className: 'results__count',
        text: formatCountryCount(results.length, language),
      }),
    );
    const list = element('div', { className: 'results__grid' });
    list.append(
      ...results.map((country) => createCard(country, callbacks.onSelect, messages, language)),
    );
    status.replaceChildren(heading, list);
  }

  function localizedDescription(country: Country): string {
    const location =
      country.subregion === '—' ? country.region : `${country.region} (${country.subregion})`;
    const base = formatTemplate(messages.description, {
      name: country.name,
      location,
      capital: country.capital,
    });
    const native =
      country.nativeName !== '' && country.nativeName !== country.name
        ? ` ${formatTemplate(messages.nativeNote, { name: country.nativeName })}`
        : '';
    return `${base}${native}`;
  }

  function renderDetails(country: Country | null): void {
    if (country === null) {
      if (dialog.open) {
        dialog.close();
      }
      return;
    }

    const heading = element('div', { className: 'country-dialog__heading' });
    if (country.flagUrl !== '') {
      heading.append(
        element('img', {
          className: 'country-dialog__flag',
          attributes: {
            src: country.flagUrl,
            alt: formatTemplate(messages.flagAlt, { name: country.name }),
          },
        }),
      );
    } else {
      heading.append(
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
    heading.append(names);

    const description = element('p', {
      className: 'country-dialog__description',
      text: localizedDescription(country),
    });
    const facts = document.createElement('dl');
    facts.append(
      detailRow(messages.detailCapital, country.capital),
      detailRow(messages.detailRegion, country.region),
      detailRow(messages.detailSubregion, country.subregion),
      detailRow(
        messages.detailPopulation,
        `${formatNumber(country.population, language)} ${messages.people}`,
      ),
      detailRow(
        messages.detailArea,
        `${formatNumber(country.area, language)} ${messages.areaUnit}`,
      ),
      detailRow(messages.detailLanguages, country.languages.join(', ')),
      detailRow(messages.detailCurrency, country.currencies.join(', ')),
      detailRow(messages.detailBorders, country.borders.join(', ')),
    );
    dialogContent.replaceChildren(heading, description, facts);
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  function render(state: SearchState): void {
    lastState = state;
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
  }

  function setLanguage(nextLanguage: Language): void {
    language = isLanguage(nextLanguage) ? nextLanguage : DEFAULT_LANGUAGE;
    messages = getMessages(language);
    applyCopy();
  }

  applyCopy();

  return {
    render,
    setLanguage,
    getLanguage: () => language,
  };
}
