import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('package.json version sync', () => {
  it('matches the latest version in CHANGELOG.md', () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
    const changelog = readFileSync(resolve(__dirname, '../../../CHANGELOG.md'), 'utf8');

    const match = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m);
    expect(match, 'No version heading found in CHANGELOG.md').toBeTruthy();

    expect(pkg.version).toBe(match[1]);
  });
});
