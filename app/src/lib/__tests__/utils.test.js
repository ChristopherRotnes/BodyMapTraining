import { describe, it, expect } from 'vitest';
import {
  buildMuscleMapFromExercises,
  buildMuscleMapFromSession,
  buildRecMuscleMap,
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
