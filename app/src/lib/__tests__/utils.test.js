import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import i18n from '../i18n.js';
import {
  buildMuscleMapFromExercises,
  buildMuscleMapFromSession,
  buildRecMuscleMap,
  extractMuscles,
  isInvalidNum,
  toIsoDate,
  toWeekIso,
  weekIsoToMonday,
  isoWeekMonday,
  getIntlLocale,
  inferMusclesFromName,
} from '../utils.js';

// ── buildMuscleMapFromExercises ───────────────────────────────────────

describe('buildMuscleMapFromExercises', () => {
  it('returns empty map for empty input', () => {
    expect(buildMuscleMapFromExercises([])).toEqual({});
  });

  it('maps muscles to exercise names from explicit primary/secondary', () => {
    const map = buildMuscleMapFromExercises([
      { name: 'Benkpress', primary: ['chest'], secondary: ['triceps'], enabled: true },
    ]);
    expect(map.chest).toEqual(['Benkpress']);
    expect(map.triceps).toEqual(['Benkpress']);
  });

  it('excludes disabled exercises', () => {
    const map = buildMuscleMapFromExercises([
      { name: 'Benkpress', primary: ['chest'], secondary: [], enabled: false },
    ]);
    expect(map).toEqual({});
  });

  it('excludes exercises with no name', () => {
    const map = buildMuscleMapFromExercises([
      { name: '', primary: ['chest'], secondary: [], enabled: true },
    ]);
    expect(map).toEqual({});
  });

  it('accumulates multiple exercises per muscle without duplicates', () => {
    const map = buildMuscleMapFromExercises([
      { name: 'Benkpress', primary: ['chest'], secondary: [], enabled: true },
      { name: 'Cables',    primary: ['chest'], secondary: [], enabled: true },
      { name: 'Cables',    primary: ['chest'], secondary: [], enabled: true }, // duplicate name
    ]);
    expect(map.chest).toContain('Benkpress');
    expect(map.chest).toContain('Cables');
    expect(map.chest.filter(n => n === 'Cables')).toHaveLength(1);
  });

  it('falls back to EX_DB for exercises without muscle data', () => {
    const map = buildMuscleMapFromExercises([
      { name: 'benkpress', standardName: '', primary: [], secondary: [], enabled: true },
    ]);
    expect(map.chest).toContain('benkpress');
    expect(map.triceps).toContain('benkpress');
  });

  it('does not use EX_DB fallback when primary is already set', () => {
    const map = buildMuscleMapFromExercises([
      { name: 'benkpress', standardName: '', primary: ['abs'], secondary: [], enabled: true },
    ]);
    expect(map.abs).toContain('benkpress');
    expect(map.chest).toBeUndefined();
  });
});

// ── buildMuscleMapFromSession ─────────────────────────────────────────

describe('buildMuscleMapFromSession', () => {
  it('returns empty map for session with no exercises', () => {
    expect(buildMuscleMapFromSession({ session_exercises: [] })).toEqual({});
  });

  it('handles missing session_exercises gracefully', () => {
    expect(buildMuscleMapFromSession({})).toEqual({});
  });

  it('builds map from muscle_activations', () => {
    const map = buildMuscleMapFromSession({
      session_exercises: [
        {
          name: 'Benkpress',
          muscle_activations: [
            { muscle_id: 'chest',   activation_type: 'primary' },
            { muscle_id: 'triceps', activation_type: 'secondary' },
          ],
        },
      ],
    });
    expect(map.chest).toEqual(['Benkpress']);
    expect(map.triceps).toEqual(['Benkpress']);
  });

  it('accumulates multiple exercises per muscle', () => {
    const map = buildMuscleMapFromSession({
      session_exercises: [
        { name: 'Benkpress', muscle_activations: [{ muscle_id: 'chest', activation_type: 'primary' }] },
        { name: 'Cables',    muscle_activations: [{ muscle_id: 'chest', activation_type: 'secondary' }] },
      ],
    });
    expect(map.chest).toContain('Benkpress');
    expect(map.chest).toContain('Cables');
  });

  it('handles exercises with no muscle_activations', () => {
    const map = buildMuscleMapFromSession({
      session_exercises: [{ name: 'Benkpress', muscle_activations: [] }],
    });
    expect(map).toEqual({});
  });
});

// ── buildRecMuscleMap ─────────────────────────────────────────────────

describe('buildRecMuscleMap', () => {
  it('returns empty map for null input', () => {
    expect(buildRecMuscleMap(null)).toEqual({});
  });

  it('returns empty map for empty array', () => {
    expect(buildRecMuscleMap([])).toEqual({});
  });

  it('maps muscles to recommendation names', () => {
    const map = buildRecMuscleMap([
      { name: 'Skulderpress', primary: ['shoulders_front'], secondary: ['triceps'] },
    ]);
    expect(map.shoulders_front).toEqual(['Skulderpress']);
    expect(map.triceps).toEqual(['Skulderpress']);
  });

  it('accumulates multiple recommendations per muscle without duplicates', () => {
    const map = buildRecMuscleMap([
      { name: 'Ex A', primary: ['chest'], secondary: [] },
      { name: 'Ex B', primary: ['chest'], secondary: [] },
      { name: 'Ex B', primary: ['chest'], secondary: [] }, // duplicate
    ]);
    expect(map.chest).toContain('Ex A');
    expect(map.chest).toContain('Ex B');
    expect(map.chest.filter(n => n === 'Ex B')).toHaveLength(1);
  });

  it('handles recs with missing primary or secondary', () => {
    const map = buildRecMuscleMap([
      { name: 'Ex A', primary: ['chest'] },          // no secondary
      { name: 'Ex B', secondary: ['triceps'] },       // no primary
    ]);
    expect(map.chest).toContain('Ex A');
    expect(map.triceps).toContain('Ex B');
  });
});

// ── extractMuscles ────────────────────────────────────────────────────

describe('extractMuscles', () => {
  it('returns empty arrays when session has no exercises', () => {
    expect(extractMuscles({})).toEqual({ primary: [], secondary: [] });
    expect(extractMuscles({ session_exercises: [] })).toEqual({ primary: [], secondary: [] });
  });

  it('splits muscle_activations by activation_type', () => {
    const result = extractMuscles({
      session_exercises: [{
        muscle_activations: [
          { muscle_id: 'chest', activation_type: 'primary' },
          { muscle_id: 'triceps', activation_type: 'secondary' },
        ],
      }],
    });
    expect(result.primary).toEqual(['chest']);
    expect(result.secondary).toEqual(['triceps']);
  });

  it('removes a muscle from secondary if it appears as primary in any exercise', () => {
    const result = extractMuscles({
      session_exercises: [
        { muscle_activations: [{ muscle_id: 'chest', activation_type: 'secondary' }] },
        { muscle_activations: [{ muscle_id: 'chest', activation_type: 'primary' }] },
      ],
    });
    expect(result.primary).toEqual(['chest']);
    expect(result.secondary).toEqual([]);
  });

  it('deduplicates across exercises', () => {
    const result = extractMuscles({
      session_exercises: [
        { muscle_activations: [{ muscle_id: 'chest', activation_type: 'primary' }] },
        { muscle_activations: [{ muscle_id: 'chest', activation_type: 'primary' }] },
      ],
    });
    expect(result.primary).toEqual(['chest']);
  });
});

// ── isInvalidNum ──────────────────────────────────────────────────────

describe('isInvalidNum', () => {
  it('treats null/undefined/empty as valid (no required field)', () => {
    expect(isInvalidNum(null)).toBe(false);
    expect(isInvalidNum(undefined)).toBe(false);
    expect(isInvalidNum('')).toBe(false);
  });

  it('accepts integers between 1 and 99 inclusive', () => {
    expect(isInvalidNum('1')).toBe(false);
    expect(isInvalidNum('10')).toBe(false);
    expect(isInvalidNum('99')).toBe(false);
    expect(isInvalidNum(' 5 ')).toBe(false); // trimmed
  });

  it('rejects 0, negatives, and values above 99', () => {
    expect(isInvalidNum('0')).toBe(true);
    expect(isInvalidNum('100')).toBe(true);
    expect(isInvalidNum('-5')).toBe(true);
  });

  it('rejects non-integer strings', () => {
    expect(isInvalidNum('abc')).toBe(true);
    expect(isInvalidNum('5.5')).toBe(true);
    expect(isInvalidNum('5x')).toBe(true);
  });
});

// ── toIsoDate ─────────────────────────────────────────────────────────

describe('toIsoDate', () => {
  it('formats a date as yyyy-MM-dd using local time', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toIsoDate(new Date(2026, 2, 9))).toBe('2026-03-09');
  });
});

// ── toWeekIso / weekIsoToMonday / isoWeekMonday ───────────────────────

describe('ISO week helpers', () => {
  it('toWeekIso returns the canonical week string', () => {
    // 2026-05-06 is a Wednesday in ISO week 19 of 2026
    expect(toWeekIso(new Date(Date.UTC(2026, 4, 6)))).toBe('2026-W19');
  });

  it('toWeekIso assigns early-January Sunday to the previous year', () => {
    // 2027-01-03 (Sunday) belongs to ISO week 53 of 2026
    expect(toWeekIso(new Date(Date.UTC(2027, 0, 3)))).toBe('2026-W53');
  });

  it('toWeekIso pads single-digit weeks', () => {
    expect(toWeekIso(new Date(Date.UTC(2026, 0, 5)))).toBe('2026-W02');
  });

  it('weekIsoToMonday returns the Monday of the given ISO week', () => {
    const monday = weekIsoToMonday('2026-W19');
    expect(monday.getUTCFullYear()).toBe(2026);
    expect(monday.getUTCMonth()).toBe(4); // May
    expect(monday.getUTCDate()).toBe(4);
    expect(monday.getUTCDay()).toBe(1);
  });

  it('toWeekIso and weekIsoToMonday round-trip for any weekday in the week', () => {
    const wednesday = new Date(Date.UTC(2026, 4, 6));
    const iso = toWeekIso(wednesday);
    const monday = weekIsoToMonday(iso);
    expect(toWeekIso(monday)).toBe(iso);
  });

  it('isoWeekMonday returns the local Monday at midnight', () => {
    // Wednesday 2026-05-06 → Monday 2026-05-04
    const monday = isoWeekMonday(new Date(2026, 4, 6, 14, 30));
    expect(monday.getFullYear()).toBe(2026);
    expect(monday.getMonth()).toBe(4);
    expect(monday.getDate()).toBe(4);
    expect(monday.getHours()).toBe(0);
    expect(monday.getMinutes()).toBe(0);
  });

  it('isoWeekMonday handles Sunday as end of the previous ISO week', () => {
    // Sunday 2026-05-10 → Monday 2026-05-04
    const monday = isoWeekMonday(new Date(2026, 4, 10));
    expect(monday.getDate()).toBe(4);
  });
});

// ── getIntlLocale ─────────────────────────────────────────────────────

describe('getIntlLocale', () => {
  const original = i18n.language;
  afterEach(() => { i18n.language = original; });

  it('maps "nb" to "no" for Intl APIs', () => {
    i18n.language = 'nb';
    expect(getIntlLocale()).toBe('no');
  });

  it('passes through other languages unchanged', () => {
    i18n.language = 'en';
    expect(getIntlLocale()).toBe('en');
    i18n.language = 'fa';
    expect(getIntlLocale()).toBe('fa');
  });
});

// ── inferMusclesFromName ──────────────────────────────────────────────

describe('inferMusclesFromName', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  const stubFetchOnce = (text) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ content: [{ text }] }),
    }));
  };

  it('returns null for empty/whitespace name without making a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await inferMusclesFromName('')).toBeNull();
    expect(await inferMusclesFromName('   ')).toBeNull();
    expect(await inferMusclesFromName(null)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('parses a clean JSON response', async () => {
    stubFetchOnce('{"primary":["chest"],"secondary":["triceps"]}');
    expect(await inferMusclesFromName('Benkpress')).toEqual({
      primary: ['chest'],
      secondary: ['triceps'],
    });
  });

  it('extracts JSON from a markdown code fence', async () => {
    stubFetchOnce('```json\n{"primary":["lats"],"secondary":[]}\n```');
    expect(await inferMusclesFromName('Pull-up')).toEqual({
      primary: ['lats'],
      secondary: [],
    });
  });

  it('returns null when both primary and secondary are empty', async () => {
    stubFetchOnce('{"primary":[],"secondary":[]}');
    expect(await inferMusclesFromName('Ukjent')).toBeNull();
  });

  it('returns null on malformed JSON', async () => {
    stubFetchOnce('not json at all');
    expect(await inferMusclesFromName('Foo')).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect(await inferMusclesFromName('Foo')).toBeNull();
  });
});
