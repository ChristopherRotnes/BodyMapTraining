import { describe, it, expect } from 'vitest';
import { calcMuscles } from '../bodymap';

describe('calcMuscles', () => {
  it('returns empty arrays for empty input', () => {
    expect(calcMuscles([])).toEqual({ primary: [], secondary: [] });
  });

  it('uses explicit primary/secondary when provided', () => {
    const result = calcMuscles([
      { name: 'Benkpress', primary: ['chest'], secondary: ['triceps', 'shoulders_front'] },
    ]);
    expect(result.primary).toContain('chest');
    expect(result.secondary).toContain('triceps');
    expect(result.secondary).toContain('shoulders_front');
  });

  it('falls back to EX_DB keyword matching when no muscle data', () => {
    const result = calcMuscles([
      { name: 'benkpress', standardName: '', primary: [], secondary: [] },
    ]);
    expect(result.primary).toContain('chest');
    expect(result.secondary).toContain('triceps');
  });

  it('removes primary muscles from secondary (deduplication)', () => {
    const result = calcMuscles([
      { name: 'Ex A', primary: ['chest'], secondary: ['triceps'] },
      { name: 'Ex B', primary: ['triceps'], secondary: ['chest'] },
    ]);
    expect(result.primary).toContain('chest');
    expect(result.primary).toContain('triceps');
    expect(result.secondary).not.toContain('chest');
    expect(result.secondary).not.toContain('triceps');
  });

  it('returns empty arrays when no keyword matches EX_DB', () => {
    const result = calcMuscles([
      { name: 'ukjent øvelse xyz', standardName: '', primary: [], secondary: [] },
    ]);
    expect(result.primary).toEqual([]);
    expect(result.secondary).toEqual([]);
  });

  it('deduplicates muscles across multiple exercises', () => {
    const result = calcMuscles([
      { name: 'Ex A', primary: ['chest'], secondary: [] },
      { name: 'Ex B', primary: ['chest'], secondary: [] },
    ]);
    expect(result.primary.filter(m => m === 'chest')).toHaveLength(1);
  });

  it('matches EX_DB by standardName as well as name', () => {
    const result = calcMuscles([
      { name: 'Press', standardName: 'bench press', primary: [], secondary: [] },
    ]);
    expect(result.primary).toContain('chest');
  });
});
