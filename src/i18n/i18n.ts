export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'uk', label: 'Українська' },
  { code: 'ru', label: 'Русский' },
  { code: 'cs', label: 'Čeština' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: Language = 'en';

export interface CountForms {
  one: string;
  few: string;
  many: string;
  other: string;
}

export interface Messages {
  pageTitle: string;
  title: string;
  subtitle: string;
  searchAria: string;
  searchLabel: string;
  searchPlaceholder: string;
  languageAria: string;
  historyTitle: string;
  clearHistory: string;
  loading: string;
  idle: string;
  emptyTitle: string;
  emptyText: string;
  errorTitle: string;
  errorTimeout: string;
  errorHttp: string;
  errorNetwork: string;
  retry: string;
  resultsTitle: string;
  detailsAria: string;
  flagAlt: string;
  capital: string;
  people: string;
  close: string;
  description: string;
  nativeNote: string;
  detailCapital: string;
  detailRegion: string;
  detailSubregion: string;
  detailPopulation: string;
  detailArea: string;
  detailLanguages: string;
  detailCurrency: string;
  detailBorders: string;
  areaUnit: string;
  countryCount: CountForms;
}

export const MESSAGES: Record<Language, Messages> = {
  en: {
    pageTitle: 'Country Search',
    title: 'Country Search',
    subtitle: 'Start typing a name — results update automatically.',
    searchAria: 'Country search',
    searchLabel: 'Country name',
    searchPlaceholder: 'For example, Spain or Ukraine',
    languageAria: 'Application language',
    historyTitle: 'Recent searches',
    clearHistory: 'Clear',
    loading: 'Searching countries…',
    idle: 'Type at least one letter to start searching.',
    emptyTitle: 'Nothing found',
    emptyText: 'Try a different spelling or a shorter query.',
    errorTitle: 'Search failed',
    errorTimeout: 'The request took too long. Check your connection and try again.',
    errorHttp: 'The server returned error {status}. Please try again.',
    errorNetwork: 'Could not load data. Check your connection and try again.',
    retry: 'Retry',
    resultsTitle: 'Results',
    detailsAria: 'Details: {name}',
    flagAlt: 'Flag of {name}',
    capital: 'Capital',
    people: 'people',
    close: 'Close',
    description: '{name} is a country in {location}. Capital: {capital}.',
    nativeNote: 'Native name: {name}.',
    detailCapital: 'Capital',
    detailRegion: 'Region',
    detailSubregion: 'Subregion',
    detailPopulation: 'Population',
    detailArea: 'Area',
    detailLanguages: 'Languages',
    detailCurrency: 'Currency',
    detailBorders: 'Borders',
    areaUnit: 'km²',
    countryCount: {
      one: '{count} country',
      few: '{count} countries',
      many: '{count} countries',
      other: '{count} countries',
    },
  },
  uk: {
    pageTitle: 'Пошук країн',
    title: 'Пошук країн',
    subtitle: 'Почніть вводити назву — результати оновляться автоматично.',
    searchAria: 'Пошук країн',
    searchLabel: 'Назва країни',
    searchPlaceholder: 'Наприклад, Spain або Ukraine',
    languageAria: 'Мова застосунку',
    historyTitle: 'Останні запити',
    clearHistory: 'Очистити',
    loading: 'Шукаємо країни…',
    idle: 'Введіть хоча б одну літеру, щоб почати пошук.',
    emptyTitle: 'Нічого не знайдено',
    emptyText: 'Спробуйте інше написання або коротший запит.',
    errorTitle: 'Не вдалося виконати пошук',
    errorTimeout: 'Запит триває занадто довго. Перевірте з’єднання та спробуйте ще раз.',
    errorHttp: 'Сервер повернув помилку {status}. Спробуйте ще раз.',
    errorNetwork: 'Не вдалося завантажити дані. Перевірте з’єднання та спробуйте ще раз.',
    retry: 'Повторити',
    resultsTitle: 'Результати',
    detailsAria: 'Деталі: {name}',
    flagAlt: 'Прапор: {name}',
    capital: 'Столиця',
    people: 'осіб',
    close: 'Закрити',
    description: '{name} — країна в регіоні {location}. Столиця — {capital}.',
    nativeNote: 'Місцева назва: {name}.',
    detailCapital: 'Столиця',
    detailRegion: 'Регіон',
    detailSubregion: 'Субрегіон',
    detailPopulation: 'Населення',
    detailArea: 'Площа',
    detailLanguages: 'Мови',
    detailCurrency: 'Валюта',
    detailBorders: 'Кордони',
    areaUnit: 'км²',
    countryCount: {
      one: '{count} країна',
      few: '{count} країни',
      many: '{count} країн',
      other: '{count} країни',
    },
  },
  ru: {
    pageTitle: 'Поиск стран',
    title: 'Поиск стран',
    subtitle: 'Начните вводить название — результаты обновятся автоматически.',
    searchAria: 'Поиск стран',
    searchLabel: 'Название страны',
    searchPlaceholder: 'Например, Spain или Ukraine',
    languageAria: 'Язык приложения',
    historyTitle: 'Последние запросы',
    clearHistory: 'Очистить',
    loading: 'Ищем страны…',
    idle: 'Введите хотя бы одну букву, чтобы начать поиск.',
    emptyTitle: 'Ничего не найдено',
    emptyText: 'Попробуйте другое написание или более короткий запрос.',
    errorTitle: 'Не удалось выполнить поиск',
    errorTimeout: 'Запрос выполняется слишком долго. Проверьте соединение и попробуйте снова.',
    errorHttp: 'Сервер вернул ошибку {status}. Попробуйте снова.',
    errorNetwork: 'Не удалось загрузить данные. Проверьте соединение и попробуйте снова.',
    retry: 'Повторить',
    resultsTitle: 'Результаты',
    detailsAria: 'Детали: {name}',
    flagAlt: 'Флаг: {name}',
    capital: 'Столица',
    people: 'человек',
    close: 'Закрыть',
    description: '{name} — страна в регионе {location}. Столица — {capital}.',
    nativeNote: 'Местное название: {name}.',
    detailCapital: 'Столица',
    detailRegion: 'Регион',
    detailSubregion: 'Субрегион',
    detailPopulation: 'Население',
    detailArea: 'Площадь',
    detailLanguages: 'Языки',
    detailCurrency: 'Валюта',
    detailBorders: 'Границы',
    areaUnit: 'км²',
    countryCount: {
      one: '{count} страна',
      few: '{count} страны',
      many: '{count} стран',
      other: '{count} страны',
    },
  },
  cs: {
    pageTitle: 'Hledání zemí',
    title: 'Hledání zemí',
    subtitle: 'Začněte psát název — výsledky se aktualizují automaticky.',
    searchAria: 'Hledání zemí',
    searchLabel: 'Název země',
    searchPlaceholder: 'Například Spain nebo Ukraine',
    languageAria: 'Jazyk aplikace',
    historyTitle: 'Poslední hledání',
    clearHistory: 'Vymazat',
    loading: 'Hledáme země…',
    idle: 'Začněte psát alespoň jedno písmeno.',
    emptyTitle: 'Nic nenalezeno',
    emptyText: 'Zkuste jiný pravopis nebo kratší dotaz.',
    errorTitle: 'Hledání se nezdařilo',
    errorTimeout: 'Požadavek trvá příliš dlouho. Zkontrolujte připojení a zkuste to znovu.',
    errorHttp: 'Server vrátil chybu {status}. Zkuste to znovu.',
    errorNetwork: 'Data se nepodařilo načíst. Zkontrolujte připojení a zkuste to znovu.',
    retry: 'Zkusit znovu',
    resultsTitle: 'Výsledky',
    detailsAria: 'Podrobnosti: {name}',
    flagAlt: 'Vlajka: {name}',
    capital: 'Hlavní město',
    people: 'obyvatel',
    close: 'Zavřít',
    description: '{name} je země v regionu {location}. Hlavní město: {capital}.',
    nativeNote: 'Místní název: {name}.',
    detailCapital: 'Hlavní město',
    detailRegion: 'Region',
    detailSubregion: 'Podregion',
    detailPopulation: 'Obyvatelstvo',
    detailArea: 'Rozloha',
    detailLanguages: 'Jazyky',
    detailCurrency: 'Měna',
    detailBorders: 'Hranice',
    areaUnit: 'km²',
    countryCount: {
      one: '{count} země',
      few: '{count} země',
      many: '{count} země',
      other: '{count} zemí',
    },
  },
};

export const LOCALES: Record<Language, string> = {
  en: 'en-US',
  uk: 'uk-UA',
  ru: 'ru-RU',
  cs: 'cs-CZ',
};

export function isLanguage(value: string): value is Language {
  return LANGUAGES.some((language) => language.code === value);
}

export function getMessages(language: Language): Messages {
  return MESSAGES[language];
}

export function formatTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export function formatCountryCount(count: number, language: Language): string {
  const forms = MESSAGES[language].countryCount;
  const category = new Intl.PluralRules(LOCALES[language]).select(count);
  const template =
    category === 'one' || category === 'few' || category === 'many' ? forms[category] : forms.other;
  return formatTemplate(template, { count });
}
