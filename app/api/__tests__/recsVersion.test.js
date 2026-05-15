import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('RECS_PROMPT_VERSION sync', () => {
  it('is identical in prompts.js and recsCacheCleanup.js', () => {
    const promptsFile = readFileSync(
      resolve(__dirname, '../../src/lib/prompts.js'),
      'utf8'
    );
    const cleanupFile = readFileSync(
      resolve(__dirname, '../recsCacheCleanup.js'),
      'utf8'
    );

    const promptsMatch = promptsFile.match(/export const RECS_PROMPT_VERSION\s*=\s*(\d+)/);
    const cleanupMatch = cleanupFile.match(/const RECS_PROMPT_VERSION\s*=\s*(\d+)/);

    expect(promptsMatch, 'RECS_PROMPT_VERSION not found in prompts.js').toBeTruthy();
    expect(cleanupMatch, 'RECS_PROMPT_VERSION not found in recsCacheCleanup.js').toBeTruthy();
    expect(Number(cleanupMatch[1])).toBe(Number(promptsMatch[1]));
  });
});
