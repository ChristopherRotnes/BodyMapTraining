import { describe, it, expect } from 'vitest';
import { normalizeName } from '../sportyUtils.js';

describe('normalizeName', () => {
  it('strips a straight-quote annotation', () => {
    expect(normalizeName('CROSSFIT "SVART TRØYE"')).toBe('CROSSFIT');
  });

  it('strips a curly-quote annotation', () => {
    // U+201C left double quotation mark, U+201D right double quotation mark
    expect(normalizeName('YOGA “KVELDSRO”')).toBe('YOGA');
  });

  it('leaves a plain name unchanged', () => {
    expect(normalizeName('PILATES')).toBe('PILATES');
  });

  it('returns empty string when the entire name is an annotation', () => {
    expect(normalizeName('"ANNONSERT"')).toBe('');
  });

  it('trims whitespace left after stripping', () => {
    expect(normalizeName('CROSSFIT  "SVART TRØYE"  ')).toBe('CROSSFIT');
  });
});
