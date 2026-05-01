import { app } from '@azure/functions';

const SPORTY_URL =
  'https://sporty.no/api/v1/businessunits/8/groupactivities';

async function syncGymCalendar(context) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    const msg = 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured';
    context.error(msg);
    return { ok: false, error: msg };
  }

  let sportyData;
  try {
    const res = await fetch(SPORTY_URL);
    if (!res.ok) throw new Error(`sporty.no returned ${res.status}`);
    const json = await res.json();
    sportyData = json.data ?? [];
  } catch (err) {
    context.error('Failed to fetch sporty.no:', err.message);
    return { ok: false, error: err.message };
  }

  const rows = sportyData.map(item => ({
    sporty_id:  item.id,
    name:       item.name,
    start_time: item.duration?.start ?? null,
    end_time:   item.duration?.end ?? null,
    instructor: item.instructors?.[0]?.name ?? null,
    cancelled:  item.cancelled ?? false,
  })).filter(r => r.start_time && r.end_time);

  if (rows.length === 0) {
    context.log('No sessions returned from sporty.no');
    return { ok: true, upserted: 0 };
  }

  const upsertRes = await fetch(
    `${supabaseUrl}/rest/v1/gym_calendar`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    }
  );

  if (!upsertRes.ok) {
    const detail = await upsertRes.text();
    context.error('Supabase upsert failed:', detail);
    return { ok: false, error: detail };
  }

  context.log(`Upserted ${rows.length} gym_calendar rows`);
  return { ok: true, upserted: rows.length };
}

// ── Timer trigger: 04:00 and 11:00 UTC daily ──────────────────────────
app.timer('sportySyncTimer', {
  schedule: '0 4,11 * * *',
  handler: async (myTimer, context) => {
    await syncGymCalendar(context);
  },
});

// ── HTTP trigger: manual kick for testing ─────────────────────────────
app.http('sportySyncHttp', {
  methods: ['POST'],
  route: 'sporty-sync',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const result = await syncGymCalendar(context);
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
