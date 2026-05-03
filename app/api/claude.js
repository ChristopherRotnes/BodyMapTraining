import { app } from '@azure/functions';

// Models and token limits the frontend is permitted to use.
const ALLOWED_MODELS = new Set([
  'claude-opus-4-5',
  'claude-sonnet-4-6',
]);
const MAX_TOKENS_LIMIT = 2000;

// In-memory rate limiter: 10 requests per user per minute.
// Works for a single function instance; sufficient at current scale.
const rateLimitMap = new Map();
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(userId) {
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

// Returns the user's ID if the token is valid, otherwise null.
async function verifySupabaseJwt(token, supabaseUrl, supabaseAnonKey) {
  if (!token) return null;
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user.id ?? null;
}

app.http('claude', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!apiKey || !supabaseUrl || !supabaseAnonKey) {
      context.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Azure SWA replaces the Authorization header with its own managed identity
    // token, so the Supabase JWT is passed in X-Supabase-Token instead.
    const token = request.headers.get('X-Supabase-Token');
    const userId = await verifySupabaseJwt(token, supabaseUrl, supabaseAnonKey);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Clamp model and max_tokens to prevent cost amplification.
    if (!ALLOWED_MODELS.has(body.model)) {
      return new Response(
        JSON.stringify({ error: 'Model not allowed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (typeof body.max_tokens !== 'number' || body.max_tokens > MAX_TOKENS_LIMIT) {
      body = { ...body, max_tokens: MAX_TOKENS_LIMIT };
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();
    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
