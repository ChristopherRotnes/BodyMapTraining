import { describe, it, expect } from 'vitest';
import { reducer, initialState } from '../muscleMapReducer.js';

describe('MuscleMap reducer', () => {
  it('RESET returns to initial state with fresh sessionDate', () => {
    const dirty = { ...initialState, step: 'muscles', images: [{ id: 1 }], exercises: [{ id: 1 }] };
    const result = reducer(dirty, { type: 'RESET' });
    expect(result.step).toBe('upload');
    expect(result.images).toHaveLength(0);
    expect(result.exercises).toHaveLength(0);
  });

  it('ADD_IMAGE appends image and clears error', () => {
    const state = { ...initialState, error: 'previous error' };
    const image = { id: 99, base64: 'abc', mediaType: 'image/jpeg', preview: 'data:...' };
    const result = reducer(state, { type: 'ADD_IMAGE', image });
    expect(result.images).toHaveLength(1);
    expect(result.images[0].id).toBe(99);
    expect(result.error).toBeNull();
  });

  it('REMOVE_IMAGE filters image by id', () => {
    const state = { ...initialState, images: [{ id: 1 }, { id: 2 }, { id: 3 }] };
    const result = reducer(state, { type: 'REMOVE_IMAGE', id: 2 });
    expect(result.images.map(i => i.id)).toEqual([1, 3]);
  });

  it('ANALYZE_START sets step to analyzing and clears error', () => {
    const state = { ...initialState, step: 'upload', error: 'some error' };
    const result = reducer(state, { type: 'ANALYZE_START' });
    expect(result.step).toBe('analyzing');
    expect(result.error).toBeNull();
  });

  it('ANALYZE_SUCCESS sets exercises and moves to confirm', () => {
    const exercises = [{ id: 0, name: 'Benkpress', enabled: true, primary: ['chest'], secondary: ['triceps'] }];
    const result = reducer({ ...initialState, step: 'analyzing' }, { type: 'ANALYZE_SUCCESS', exercises });
    expect(result.step).toBe('confirm');
    expect(result.exercises).toEqual(exercises);
  });

  it('ANALYZE_SUCCESS filters out invalid muscle IDs', () => {
    const exercises = [{ id: 0, name: 'Benkpress', enabled: true, primary: ['chest', 'invalid_muscle'], secondary: ['not_a_muscle'] }];
    const result = reducer({ ...initialState, step: 'analyzing' }, { type: 'ANALYZE_SUCCESS', exercises });
    expect(result.exercises[0].primary).toEqual(['chest']);
    expect(result.exercises[0].secondary).toEqual([]);
  });

  it('ANALYZE_ERROR moves back to upload with error message', () => {
    const result = reducer({ ...initialState, step: 'analyzing' }, { type: 'ANALYZE_ERROR', error: 'Timeout' });
    expect(result.step).toBe('upload');
    expect(result.error).toBe('Timeout');
  });

  it('UPDATE_EXERCISE updates matching exercise by id', () => {
    const state = { ...initialState, exercises: [{ id: 1, name: 'Old', enabled: true }] };
    const result = reducer(state, { type: 'UPDATE_EXERCISE', id: 1, updates: { name: 'New' } });
    expect(result.exercises[0].name).toBe('New');
    expect(result.exercises[0].enabled).toBe(true);
  });

  it('DELETE_EXERCISE removes matching exercise by id', () => {
    const state = { ...initialState, exercises: [{ id: 1 }, { id: 2 }] };
    const result = reducer(state, { type: 'DELETE_EXERCISE', id: 1 });
    expect(result.exercises.map(e => e.id)).toEqual([2]);
  });

  it('ADD_EXERCISE appends and sets editingId', () => {
    const exercise = { id: 42, name: '', enabled: true };
    const result = reducer(initialState, { type: 'ADD_EXERCISE', exercise });
    expect(result.exercises).toHaveLength(1);
    expect(result.editingId).toBe(42);
  });

  it('CONFIRM transitions to muscles step and sets saving', () => {
    const muscles = { primary: ['chest'], secondary: ['triceps'] };
    const result = reducer(initialState, { type: 'CONFIRM', muscles });
    expect(result.step).toBe('muscles');
    expect(result.muscles).toEqual(muscles);
    expect(result.saving).toBe(true);
    expect(result.saved).toBe(false);
    expect(result.saveError).toBe(false);
  });

  it('SAVE_SUCCESS clears saving and sets saved', () => {
    const state = { ...initialState, saving: true };
    const result = reducer(state, { type: 'SAVE_SUCCESS' });
    expect(result.saving).toBe(false);
    expect(result.saved).toBe(true);
  });

  it('SAVE_ERROR clears saving and sets saveError', () => {
    const state = { ...initialState, saving: true };
    const result = reducer(state, { type: 'SAVE_ERROR' });
    expect(result.saving).toBe(false);
    expect(result.saveError).toBe(true);
  });

  it('SET_SESSION_DATE resets gym selections', () => {
    const state = { ...initialState, gymSessionId: 'abc', gymCalendarConflict: {}, gymSessions: [{ id: 1 }] };
    const result = reducer(state, { type: 'SET_SESSION_DATE', date: '2026-06-01' });
    expect(result.sessionDate).toBe('2026-06-01');
    expect(result.gymSessionId).toBe('');
    expect(result.gymCalendarConflict).toBeNull();
    expect(result.gymSessions).toHaveLength(0);
  });

  it('RECS_START clears recs and sets loading', () => {
    const state = { ...initialState, recs: [{ name: 'old' }], recsError: 'old error' };
    const result = reducer(state, { type: 'RECS_START' });
    expect(result.loadingRecs).toBe(true);
    expect(result.recs).toBeNull();
    expect(result.recsError).toBeNull();
  });

  it('RECS_SUCCESS sets recs and clears loading', () => {
    const recs = [{ name: 'Skulderpress', primary: ['shoulders_front'] }];
    const result = reducer({ ...initialState, loadingRecs: true }, { type: 'RECS_SUCCESS', recs });
    expect(result.loadingRecs).toBe(false);
    expect(result.recs).toEqual(recs);
  });

  it('LOAD_TEMPLATE sets exercises and moves to confirm', () => {
    const exercises = [{ id: 1, name: 'Benkpress' }];
    const result = reducer(initialState, { type: 'LOAD_TEMPLATE', exercises });
    expect(result.step).toBe('confirm');
    expect(result.exercises).toEqual(exercises);
  });

  it('unknown action returns state unchanged', () => {
    const result = reducer(initialState, { type: 'UNKNOWN_ACTION' });
    expect(result).toBe(initialState);
  });
});
