import { app } from '@azure/functions';

// Keep in sync with RECS_PROMPT_VERSION in app/src/lib/prompts.js.
// Bump both together whenever the recommendation prompt or model changes.
const RECS_PROMPT_VERSION = 1;

async function deleteRows(supabaseUrl, serviceKey, filter) {
  const res = await fetch(`${supabaseUrl}/rest/v1/recommendation_cache?${filter}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'count=exact',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase DELETE failed (${res.status}): ${body}`);
  }
  const range = res.headers.get('content-range');
  const match = range?.match(/\*\/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

app.timer('recsCacheCleanup', {
  schedule: '0 3 * * 0',
  handler: async (_myTimer, context) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      context.error('recsCacheCleanup: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return;
    }

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const expired = await deleteRows(supabaseUrl, serviceKey,
        `fetched_at=lt.${cutoff}`);
      const orphaned = await deleteRows(supabaseUrl, serviceKey,
        `cache_key=not.like.v${RECS_PROMPT_VERSION}_%`);
      context.log(`rec cache cleanup: ${expired} expired, ${orphaned} orphaned`);
    } catch (err) {
      context.error('recsCacheCleanup error:', err.message);
    }
  },
});
