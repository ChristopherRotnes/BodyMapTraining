import { app } from '@azure/functions';
import { ALLOWED_MODELS, MAX_TOKENS_LIMIT, checkRateLimit, verifySupabaseJwt } from './claudeUtils.js';

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

    const requestBody = JSON.stringify(body);
    let upstream;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 2000));
      upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: requestBody,
      });
      if (upstream.status !== 529) break;
      context.warn(`Anthropic overloaded (529), attempt ${attempt + 1}/3`);
    }

    const data = await upstream.json();
    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
