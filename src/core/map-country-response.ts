import type {
  Country,
  CountryApi,
  CountryCurrencyApi,
  CountryLanguageApi,
} from '../types/country.js';

const FALLBACK = '—';
const FALLBACK_FLAG = '🏳️';

function text(value: string | undefined): string {
  const normalized = value?.trim();
  return normalized === undefined || normalized === '' ? FALLBACK : normalized;
}

function amount(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function languageName(language: CountryLanguageApi): string | undefined {
  return language.name?.trim() || undefined;
}

function currencyName(currency: CountryCurrencyApi): string | undefined {
  const name = currency.name?.trim() || currency.code?.trim();
  if (!name) {
    return undefined;
  }
  const symbol = currency.symbol?.trim();
  return symbol ? `${name} (${symbol})` : name;
}

/**
 * Converts one countries.dev object into the flat view model used by the UI.
 * Pure: allocates new arrays/strings and never mutates `raw`.
 * Complexity: O(l + c + b), where l/c/b are languages/currencies/borders sizes.
 */
export function mapCountryResponse(raw: CountryApi): Country {
  const name = text(raw.name);
  const capital = text(raw.capital);
  const region = text(raw.region);
  const subregion = text(raw.subregion);
  const nativeName = raw.nativeName?.trim() ?? '';
  const location = subregion === FALLBACK ? region : `${region} (${subregion})`;
  const nativeNote = nativeName !== '' && nativeName !== name ? ` Native name: ${nativeName}.` : '';

  return {
    name,
    flagEmoji: raw.flag?.trim() || FALLBACK_FLAG,
    flagUrl: raw.flags?.svg?.trim() || raw.flags?.png?.trim() || '',
    capital,
    region,
    subregion,
    population: amount(raw.population),
    area: amount(raw.area),
    borders: [...(raw.borders ?? [])],
    languages: (raw.languages ?? []).map(languageName).filter((value) => value !== undefined),
    currencies: (raw.currencies ?? []).map(currencyName).filter((value) => value !== undefined),
    nativeName,
    demonym: raw.demonym?.trim() ?? '',
    alpha2Code: raw.alpha2Code?.trim() ?? '',
    alpha3Code: raw.alpha3Code?.trim() ?? '',
    description: `${name} is a country in ${location}. Capital: ${capital}.${nativeNote}`,
  };
}
