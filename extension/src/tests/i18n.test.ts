import { describe, it, expect } from 'vitest';
import { translations } from '../i18n';

describe('i18n translations', () => {
  it('contains complete keys for English and Hausa', () => {
    const enKeys = Object.keys(translations.en) as (keyof typeof translations.en)[];
    const haKeys = Object.keys(translations.ha) as (keyof typeof translations.ha)[];

    expect(enKeys.length).toBeGreaterThan(40);
    expect(enKeys.length).toBe(haKeys.length);

    for (const key of enKeys) {
      expect(translations.en[key]).toBeDefined();
      expect(translations.ha[key]).toBeDefined();
      expect(translations.en[key].length).toBeGreaterThan(0);
      expect(translations.ha[key].length).toBeGreaterThan(0);
    }
  });

  it('provides exact one-sentence explanations in English and Hausa', () => {
    expect(translations.en.trustlineExplanation).toContain('opt in to it');
    expect(translations.ha.trustlineExplanation).toContain('ba da izini');
  });

  it('keeps brand name as Stellith across languages', () => {
    expect(translations.en.appName).toBe('Stellith');
    expect(translations.ha.appName).toBe('Stellith');
  });
});
