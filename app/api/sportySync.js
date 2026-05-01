import { app } from '@azure/functions';

const SPORTY_URL =
  'https://sporty.no/api/v1/businessunits/8/groupactivities';

function shiftRow(row, shiftMs) {
  if (!shiftMs) return row;
  return {
    ...row,
    sporty_id:  `${row.sporty_id}_shifted_${Math.abs(shiftMs / 86400000)}d`,
    start_time: new Date(new Date(row.start_time).getTime() + shiftMs).toISOString(),
    end_time:   new Date(new Date(row.end_time).getTime()   + shiftMs).toISOString(),
  };
}

async function syncGymCalendar(context, { shiftDays = 0 } = {}) {
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

  let rows = sportyData.map(item => ({
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

  // Backfill: shift timestamps backward by shiftDays (negative = past)
  if (shiftDays !== 0) {
    const shiftMs = shiftDays * 24 * 60 * 60 * 1000;
    rows = rows.map(r => shiftRow(r, shiftMs));
    context.log(`Shifting ${rows.length} rows by ${shiftDays} days`);
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

// ── HTTP trigger: manual kick + optional backfill ─────────────────────
// POST /api/sporty-sync                    → sync today
// POST /api/sporty-sync  {"shiftDays":-7}  → duplicate current data 7 days back
// Requires header:  x-api-key: <SPORTY_SYNC_API_KEY>
app.http('sportySyncHttp', {
  methods: ['POST'],
  route: 'sporty-sync',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const expectedKey = process.env.SPORTY_SYNC_API_KEY;
    if (!expectedKey || request.headers.get('x-api-key') !== expectedKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const body = await request.json().catch(() => ({}));
    const shiftDays = typeof body.shiftDays === 'number' ? body.shiftDays : 0;
    const result = await syncGymCalendar(context, { shiftDays });
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
