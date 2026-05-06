import { describe, it, expect } from 'vitest';
import { MUSCLES } from '../bodymap.jsx';
import {
  ANALYZE_PROMPT,
  buildRecommendPrompt,
  buildPeriodRecommendPrompt,
  buildMuscleInferencePrompt,
} from '../prompts.js';

const allIds = Object.keys(MUSCLES);

describe('prompts muscle ID list', () => {
  it('ANALYZE_PROMPT contains every muscle ID from MUSCLES in canonical order', () => {
    expect(ANALYZE_PROMPT).toContain(allIds.join(', '));
  });

  it('buildRecommendPrompt contains every muscle ID from MUSCLES', () => {
    const prompt = buildRecommendPrompt(['chest'], ['biceps']);
    for (const id of allIds) {
      expect(prompt).toContain(id);
    }
  });

  it('buildPeriodRecommendPrompt contains every muscle ID from MUSCLES', () => {
    const prompt = buildPeriodRecommendPrompt(30, 8, 'chest', 'biceps');
    for (const id of allIds) {
      expect(prompt).toContain(id);
    }
  });

  it('buildMuscleInferencePrompt embeds the input name and every muscle ID', () => {
    const prompt = buildMuscleInferencePrompt('Markløft');
    expect(prompt).toContain('Markløft');
    for (const id of allIds) {
      expect(prompt).toContain(id);
    }
  });
});
