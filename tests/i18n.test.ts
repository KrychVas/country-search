import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  MESSAGES,
  formatCountryCount,
  formatTemplate,
  getMessages,
  isLanguage,
} from '../src/i18n/i18n.js';

describe('i18n', () => {
  it('defaults to English and offers four languages', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
    expect(LANGUAGES.map((language) => language.code)).toEqual(['en', 'uk', 'ru', 'cs']);
    expect(getMessages(DEFAULT_LANGUAGE).title).toBe('Country Search');
  });

  it('keeps every language dictionary complete', () => {
    const englishKeys = Object.keys(MESSAGES.en).sort();
    for (const language of LANGUAGES) {
      expect(Object.keys(MESSAGES[language.code]).sort()).toEqual(englishKeys);
    }
  });

  it('recognises only supported language codes', () => {
    expect(isLanguage('uk')).toBe(true);
    expect(isLanguage('de')).toBe(false);
  });

  it('interpolates templates and plural forms', () => {
    expect(formatTemplate('Error {status}', { status: 500 })).toBe('Error 500');
    expect(formatCountryCount(1, 'uk')).toBe('1 країна');
    expect(formatCountryCount(3, 'uk')).toBe('3 країни');
    expect(formatCountryCount(5, 'uk')).toBe('5 країн');
    expect(formatCountryCount(2, 'en')).toBe('2 countries');
  });
});
