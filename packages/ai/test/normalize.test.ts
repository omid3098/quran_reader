import { describe, expect, it } from 'vitest';
import { normalizeText } from '../src/util/normalize';

describe('normalizeText', () => {
  it('collapses repeated whitespace and trims outer edges', () => {
    const text = '  بismillah   ar-rahman   ar-rahim  ';
    expect(normalizeText(text)).toBe('بismillah ar-rahman ar-rahim');
  });

  it('preserves intentional spacing inside verses', () => {
    const text = 'Ayah 1\n\nAyah 2';
    expect(normalizeText(text)).toBe('Ayah 1 Ayah 2');
  });
});
