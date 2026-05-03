import { describe, it, expect } from 'vitest';
import { MUSCLES } from '../bodymap.jsx';
import { ANALYZE_PROMPT, buildRecommendPrompt, buildPeriodRecommendPrompt } from '../prompts.js';

const allIds = Object.keys(MUSCLES);

describe('prompts muscle ID list', () => {
  it('ANALYZE_PROMPT contains every muscle ID from MUSCLES', () => {
    for (const id of allIds) {
      expect(ANALYZE_PROMPT).toContain(id);
    }
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

  it('muscle ID list in ANALYZE_PROMPT matches Object.keys(MUSCLES) exactly', () => {
    const expected = allIds.join(', ');
    expect(ANALYZE_PROMPT).toContain(expected);
  });
});
