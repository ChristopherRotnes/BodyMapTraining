import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkRateLimit,
  clearRateLimitMap,
  verifySupabaseJwt,
  ALLOWED_MODELS,
  MAX_TOKENS_LIMIT,
} from '../claudeUtils.js';

describe('ALLOWED_MODELS', () => {
  it('contains exactly the two production model IDs', () => {
    expect([...ALLOWED_MODELS].sort()).toEqual(['claude-opus-4-5', 'claude-sonnet-4-6']);
  });

  it('caps max_tokens at 2000', () => {
    expect(MAX_TOKENS_LIMIT).toBe(2000);
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    clearRateLimitMap();
    vi.useRealTimers();
  });

  it('allows up to 10 requests within a window then blocks the 11th', () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit('user1')).toBe(true);
    }
    expect(checkRateLimit('user1')).toBe(false);
  });

  it('rate limits each user independently', () => {
    for (let i = 0; i < 10; i++) checkRateLimit('userA');
    expect(checkRateLimit('userA')).toBe(false);
    expect(checkRateLimit('userB')).toBe(true);
  });

  it('allows new requests after the window expires', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    for (let i = 0; i < 10; i++) checkRateLimit('user2');
    expect(checkRateLimit('user2')).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit('user2')).toBe(true);
  });
});

describe('verifySupabaseJwt', () => {
  it('returns null for null token', async () => {
    expect(await verifySupabaseJwt(null, 'http://supabase', 'key')).toBeNull();
  });

  it('returns null for empty string token', async () => {
    expect(await verifySupabaseJwt('', 'http://supabase', 'key')).toBeNull();
  });

  it('returns null when Supabase returns a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect(await verifySupabaseJwt('bad-token', 'http://supabase', 'key')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('returns the user id on a valid token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'user-123' }),
    }));
    expect(await verifySupabaseJwt('valid-token', 'http://supabase', 'key')).toBe('user-123');
    vi.unstubAllGlobals();
  });

  it('returns null when the Supabase user object has no id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }));
    expect(await verifySupabaseJwt('valid-token', 'http://supabase', 'key')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('passes the token and apikey in the correct headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'user-abc' }),
    });
    vi.stubGlobal('fetch', mockFetch);
    await verifySupabaseJwt('my-jwt', 'http://supabase.example', 'anon-key');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://supabase.example/auth/v1/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-jwt',
          apikey: 'anon-key',
        }),
      })
    );
    vi.unstubAllGlobals();
  });
});
