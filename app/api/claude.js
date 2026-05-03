import { app } from '@azure/functions';

// Models and token limits the frontend is permitted to use.
const ALLOWED_MODELS = new Set([
  'claude-opus-4-5',
  'claude-sonnet-4-6',
]);
const MAX_TOKENS_LIMIT = 2000;

async function verifySupabaseJwt(authHeader, supabaseUrl, supabaseAnonKey) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 0, detail: 'missing-auth-header' };
  }
  const token = authHeader.slice(7);
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey },
    });
    const detail = await res.text();
    return { ok: res.ok, status: res.status, detail, tokenLen: token.length, tokenTail: token.slice(-20) };
  } catch (e) {
    return { ok: false, status: 0, detail: `fetch-error: ${e.message}` };
  }
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

    // Require a valid Supabase session — prevents unauthenticated API abuse.
    const authed = await verifySupabaseJwt(
      request.headers.get('Authorization'),
      supabaseUrl,
      supabaseAnonKey
    );
    if (!authed.ok) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', debug: authed }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
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
