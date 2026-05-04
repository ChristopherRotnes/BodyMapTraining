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
    const res = await fetch(SPORTY_URL, {
      headers: { 'User-Agent': 'WorkoutLens/1.0 sporty-sync (Azure Functions)' },
    });
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
    `${supabaseUrl}/rest/v1/gym_calendar?on_conflict=sporty_id`,
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

// ── HTTP trigger: health check ────────────────────────────────────────
// GET /api/sporty-health  → returns most-recent gym_calendar row + count
app.http('sportySyncHealth', {
  methods: ['GET'],
  route: 'sporty-health',
  authLevel: 'anonymous',
  handler: async (_request, context) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    const [countRes, earliestRes, latestRes, todayRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/gym_calendar?select=count`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'count=exact',
          'Range-Unit': 'items',
          'Range': '0-0',
        },
      }),
      fetch(`${supabaseUrl}/rest/v1/gym_calendar?select=start_time&order=start_time.asc&limit=1`, {
        headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
      }),
      fetch(`${supabaseUrl}/rest/v1/gym_calendar?select=start_time&order=start_time.desc&limit=1`, {
        headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
      }),
      fetch(`${supabaseUrl}/rest/v1/gym_calendar?select=id,name,start_time&start_time=gte.${today}T00:00:00Z&start_time=lte.${today}T23:59:59Z&cancelled=eq.false`, {
        headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
      }),
    ]);

    const totalCount = countRes.headers.get('Content-Range')?.split('/')[1] ?? 'unknown';
    const [earliest] = earliestRes.ok ? await earliestRes.json() : [];
    const [latest] = latestRes.ok ? await latestRes.json() : [];
    const todaySessions = todayRes.ok ? await todayRes.json() : [];

    context.log(`Health: ${totalCount} rows, range ${earliest?.start_time} → ${latest?.start_time}, today: ${todaySessions.length}`);
    return new Response(JSON.stringify({
      totalRows: totalCount,
      earliestRow: earliest?.start_time ?? null,
      latestRow: latest?.start_time ?? null,
      todayCount: todaySessions.length,
      todaySessions,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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
