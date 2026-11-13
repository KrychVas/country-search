import { describe, expect, it } from 'vitest';

import { mapCountryResponse } from '../src/core/map-country-response.js';
import type { CountryApi } from '../src/types/country.js';

const spain: CountryApi = {
  name: 'Spain',
  flags: { png: 'https://flagcdn.com/w320/es.png', svg: 'https://flagcdn.com/es.svg' },
  flag: '🇪🇸',
  capital: 'Madrid',
  region: 'Europe',
  subregion: 'Southern Europe',
  population: 47351567,
  area: 505992,
  borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
  languages: [{ name: 'Spanish' }, { name: 'Catalan' }],
  currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
  alpha2Code: 'ES',
  alpha3Code: 'ESP',
  nativeName: 'España',
  demonym: 'Spanish',
};

describe('mapCountryResponse', () => {
  it('maps a complete countries.dev response into card data', () => {
    expect(mapCountryResponse(spain)).toEqual({
      name: 'Spain',
      flagEmoji: '🇪🇸',
      flagUrl: 'https://flagcdn.com/es.svg',
      capital: 'Madrid',
      region: 'Europe',
      subregion: 'Southern Europe',
      population: 47351567,
      area: 505992,
      borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
      languages: ['Spanish', 'Catalan'],
      currencies: ['Euro (€)'],
      nativeName: 'España',
      demonym: 'Spanish',
      alpha2Code: 'ES',
      alpha3Code: 'ESP',
      description:
        'Spain is a country in Europe (Southern Europe). Capital: Madrid. Native name: España.',
    });
  });

  it('uses safe fallbacks when optional API fields are missing', () => {
    const result = mapCountryResponse({ name: 'Atlantis' });

    expect(result).toMatchObject({
      name: 'Atlantis',
      flagEmoji: '🏳️',
      flagUrl: '',
      capital: '—',
      region: '—',
      subregion: '—',
      population: 0,
      area: 0,
      borders: [],
      languages: [],
      currencies: [],
      description: 'Atlantis is a country in —. Capital: —.',
    });
  });

  it('prefers the PNG flag when no SVG is provided and ignores unnamed languages', () => {
    const result = mapCountryResponse({
      name: 'Testland',
      flags: { png: 'https://example.test/flag.png' },
      capital: 'Test City',
      languages: [{ iso639_1: 'xx' }, { name: 'Testish' }],
      currencies: [{ code: 'TST' }],
    });

    expect(result.flagUrl).toBe('https://example.test/flag.png');
    expect(result.languages).toEqual(['Testish']);
    expect(result.currencies).toEqual(['TST']);
  });

  it('does not mutate the API object', () => {
    const raw = structuredClone(spain);
    mapCountryResponse(raw);
    expect(raw).toEqual(spain);
  });
});
