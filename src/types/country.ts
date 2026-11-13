export interface CountryLanguageApi {
  name?: string;
  iso639_1?: string;
  iso639_2?: string;
  nativeName?: string;
}

export interface CountryCurrencyApi {
  code?: string;
  name?: string;
  symbol?: string;
}

export interface CountryFlagsApi {
  png?: string;
  svg?: string;
  alt?: string;
}

/** Shape returned by GET https://countries.dev/name/{query}. */
export interface CountryApi {
  name: string;
  flag?: string;
  flags?: CountryFlagsApi;
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  borders?: string[];
  languages?: CountryLanguageApi[];
  currencies?: CountryCurrencyApi[];
  alpha2Code?: string;
  alpha3Code?: string;
  nativeName?: string;
  demonym?: string;
  independent?: boolean;
}

/** Normalized country used by the UI. */
export interface Country {
  name: string;
  flagEmoji: string;
  flagUrl: string;
  capital: string;
  region: string;
  subregion: string;
  population: number;
  area: number;
  borders: string[];
  languages: string[];
  currencies: string[];
  nativeName: string;
  demonym: string;
  alpha2Code: string;
  alpha3Code: string;
  description: string;
}
