export const ALLOWED_MODELS = new Set([
  'claude-sonnet-4-6',
]);
export const MAX_TOKENS_LIMIT = 2000;

// Best-effort only: resets on cold start and is not shared across Azure Function instances.
const rateLimitMap = new Map();
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

export function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_REQUESTS) return false;
  entry.count++;
  return true;
}

export function clearRateLimitMap() {
  rateLimitMap.clear();
}

export async function verifySupabaseJwt(token, supabaseUrl, supabaseAnonKey) {
  if (!token) return null;
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user.id ?? null;
}
