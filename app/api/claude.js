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
    const diagImageBytes = request.headers.get('X-Diag-Image-Bytes');
    if (diagImageBytes) context.warn(`[diag] client-reported image bytes: ${diagImageBytes} (${(parseInt(diagImageBytes) / 1024 / 1024).toFixed(2)} MB)`);
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
    let serverImageMB = null;
    try {
      body = await request.json();
      const serverImagePart = body?.messages?.[0]?.content?.[0];
      if (serverImagePart?.type === 'image') {
        const serverBytes = Math.round(serverImagePart.source.data.length * 0.75);
        serverImageMB = (serverBytes / 1024 / 1024).toFixed(2);
        context.warn(`[diag] server-received image bytes: ${serverBytes} (${serverImageMB} MB)`);
      }
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
    const requestBodyMB = (requestBody.length * 0.75 / 1024 / 1024).toFixed(2);
    context.warn(`[diag] requestBody length: ${requestBody.length} chars (${requestBodyMB} MB)`);
    let upstream;
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
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
      context.warn(`Anthropic overloaded (529), attempt ${attempt + 1}/5`);
    }

    const data = await upstream.json();
    if (!upstream.ok) {
      const detail = data?.error?.message || 'Unknown error';
      const errorType = data?.error?.type || 'unknown';
      context.error(`Anthropic error [${errorType}]: ${detail}`);
      return new Response(
        JSON.stringify({ error: 'Claude request failed', detail, serverImageMB, requestBodyMB }),
        { status: upstream.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
