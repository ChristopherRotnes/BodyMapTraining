import { app } from '@azure/functions';
import { createClient } from '@supabase/supabase-js';

// Keep in sync with RECS_PROMPT_VERSION in app/src/lib/prompts.js.
// Bump both together whenever the recommendation prompt or model changes.
const RECS_PROMPT_VERSION = 1;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.timer('recsCacheCleanup', {
  schedule: '0 3 * * 0',
  handler: async (_myTimer, context) => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { count: expired, error: err1 } = await supabase
      .from('recommendation_cache')
      .delete({ count: 'exact' })
      .lt('fetched_at', cutoff);

    const { count: orphaned, error: err2 } = await supabase
      .from('recommendation_cache')
      .delete({ count: 'exact' })
      .not('cache_key', 'like', `v${RECS_PROMPT_VERSION}_%`);

    if (err1) context.error('recsCacheCleanup TTL error:', err1.message);
    if (err2) context.error('recsCacheCleanup orphan error:', err2.message);

    context.log(`rec cache cleanup: ${expired ?? 0} expired, ${orphaned ?? 0} orphaned`);
  },
});
