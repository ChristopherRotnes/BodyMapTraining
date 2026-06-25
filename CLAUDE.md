# BodyMapTraining — CLAUDE.md

## AI rules
- **Never close a GitHub issue** without developer verification on dev, QA, or prod.
- **Before every push or PR**, update `CLAUDE.md`, `README.md`, and `CHANGELOG.md`.
- **Issue format:** Title: `As a [user] I want to [action] so I can [benefit]`. Sections: Summary, Priority, UI spec (Carbon g100), Data model, Acceptance criteria, Out of scope.

## Project
**Workout Lens** — gym instructors photograph a whiteboard workout, Claude Vision identifies muscles trained, app shows a body map + recommendations. Live at [workout.umulig.org](https://workout.umulig.org).

**Stack:** React 19 + Vite · IBM Carbon Design System · Supabase (magic-link auth + PostgreSQL) · Anthropic Claude API (proxied via Azure Function) · Azure Static Web Apps · GitHub Actions CI/CD · `react-i18next` (nb default, en, fa/RTL)

## Muscle IDs (17)
```
chest, shoulders_front, shoulders_side, biceps, forearms, abs, obliques, quads, calves
traps, rear_delts, lats, triceps, lower_back, glutes, hamstrings, calves_back
```
Defined in `MUSCLES` in `app/src/lib/bodymap.js`. Primary = solid green, secondary = blue diagonal hatch.

## Glossary
| Term | Definition |
|---|---|
| **User** | Logged-in gym instructor. Maps to `auth.uid()`, `sessions.trainer_id`. |
| **Trainer** | Avoid — ambiguous. `trainer_id` in DB = the app user (legacy column name). |
| **Instructor** | Person who *leads* a gym class (from sporty.no). No app account. |
| **Co-instructor** | Another app user at the same gym. Can read each other's sessions via RLS. |
| **Session** | One logged workout row in `sessions`. |
| **Gym class** | Sporty.no scheduled class in `gym_calendar`, synced by `sportySync.js`. |
| **Template** | Named reusable workout skeleton in `session_templates`. |
| **Week plan** | Templates assigned to days of an ISO week (`week_plans` + `week_plan_days`). |
| **Business unit** | Gym location — `sporty_business_unit_id = 8` (hardcoded). |
| **Period** | Report filter duration — 7, 30, or 90 days. |

## Carbon design system — hard rules
- **Sentence case** for all labels
- **0px border-radius** on buttons/inputs/cards — exceptions: pills `var(--r-pill)`, cards `var(--r-card)`, tiles `var(--r-tile)`
- **No emoji** — use `@carbon/icons-react` exclusively
- **IBM Plex everywhere** — no system-font fallbacks
- **Semantic tokens only** (`var(--cds-*)` or `var(--wl-*)`) — raw hex breaks the theme toggle
- **No gradients** — solid colors only
- **Filter chips** — always `flexWrap: wrap`; never `overflowX: auto` without a constrained parent

### Key custom tokens
`--accent` (#ee2c80 magenta, decorative only) · `--accent-active` (#b5116a, WCAG AA ~6.45:1 vs white — **use this for filled backgrounds with white text**) · `--accent-soft` (#ff7eb6 dark / #b5116a light, text on tinted bg) · `--exercise` (#7af2a4 dark / #1a8c4e light green) · `--heat-1..5` (green scale) · `--r-card` (16px) · `--r-pill` (999px) · `--r-tile` (10px) · `--cond` (IBM Plex Condensed)

**WCAG rule:** Never use `--accent` (#ee2c80) as a `background` with white/light text — it fails AA (3.95:1). Use `--accent-active` instead for any filled interactive element (buttons, active pills, CTAs).

Skeleton dark-mode tokens must be added to `[data-theme="g100"]` in `carbon-tokens.css` — Carbon emits them under `.cds--g100` class only (see pitfall #164).

### Token cheat sheet
| Concept | Token |
|---|---|
| Page bg | `var(--cds-background)` |
| Card | `var(--cds-layer-01)` |
| Nested card | `var(--cds-layer-02)` |
| Border | `var(--cds-border-subtle-01)` |
| Input border | `var(--cds-border-strong-01)` |
| Primary text | `var(--cds-text-primary)` |
| Muted text | `var(--cds-text-secondary)` |
| Interactive | `var(--cds-interactive)` |
| Error | `var(--cds-support-error)` |

## Key architecture decisions

**Shared modules** (import from these, never redefine locally):
- `app/src/lib/bodymap.js` — constants/utils: `MUSCLES`, `SHAPES`, `EX_DB`, `calcMuscles`, `useIsMobile`
- `app/src/lib/bodymap.jsx` — only `BodySVG` and `HeatmapBodySVG` (use explicit `.jsx` extension)
- `app/src/lib/hooks.js` — `useDebouncedSearch`, `useFetch`, `useTheme`, `useNavHints`
- `app/src/lib/utils.js` — `callClaude`, `inferMusclesFromName`, `buildMuscleMapFromExercises`, `buildMuscleMapFromSession`, `buildRecMuscleMap`, `extractMuscles`, `toIsoDate`, `toWeekIso`, `isoWeekMonday`, `weekIsoToMonday`, `getIntlLocale`
- `app/src/lib/prompts.js` — `CLAUDE_MODEL_VISION`, `CLAUDE_MODEL_TEXT`, `RECS_PROMPT_VERSION`, all prompt builders

**Never** add new debounce `useEffect`s — use `useDebouncedSearch`.  
**Never** write inline `session_exercises(... muscle_activations(...))` SELECT strings in `db.js` — use `SESSION_EXERCISES_SELECT` / `SESSION_EXERCISES_FULL_SELECT`.

**i18n:** All date/time via `Intl.DateTimeFormat` + `getIntlLocale()`. Never hardcode `"no-NO"` or use `date-fns` locale objects.

**API security:** All Claude calls must go through `callClaude()` in `utils.js`. The proxy (`app/api/claude.js`) requires `X-Supabase-Token` header — NOT `Authorization: Bearer` (Azure SWA intercepts that — see pitfall #57).

**Azure Functions entry:** `app/api/index.js` must import every new function file — Azure v4 only loads what `main` references. API files must use raw `fetch` to Supabase REST — never `import { createClient } from '@supabase/supabase-js'`.

**Sporty sync:** SWA managed functions run **HTTP triggers only** — Azure Functions timer triggers never fire in production (see pitfall #270). The sync is driven by a GitHub Actions cron workflow (`.github/workflows/sporty-sync.yml`) that `POST`s to `/api/sporty-sync` at 04:00, 11:00, 14:00, 22:00 UTC with `{"daysBack":7}`. The endpoint accepts either `X-Api-Key: <SPORTY_SYNC_API_KEY>` (automation) or `X-Supabase-Token: <JWT>` (manual kick from a signed-in user). Do NOT re-add an `app.timer(...)` — it is dead code on this platform.

**Recs cache:** Bump `RECS_PROMPT_VERSION` in both `prompts.js` AND `recsCacheCleanup.js` whenever the recommendation prompt or model changes. A CI test (`recsVersion.test.js`) fails if they drift.

**CI/CD:** Frontend pre-built in GitHub Actions runner with `VITE_*` env vars, uploaded as `app/dist/`. Do NOT let Oryx build the frontend — it strips `VITE_*` vars.

**Supabase client:** `createClient` must pass `global: { headers: { apikey: supabaseKey } }` — the v2 fetch interceptor doesn't reliably add it in browser (see pitfall #9).

**FK constraint:** `session_templates.user_id` and `exercise_library.user_id` reference `profiles(id)`, not `auth.users(id)`. Do not change these FKs.

## Data models

### Session edit flow
`updateSession(sessionId, exercises, gymCalendarId)` in `db.js`: deletes all `session_exercises` (cascades to `muscle_activations`), re-inserts enabled exercises + activations, updates `gym_calendar_id`. `sessions` has `UNIQUE (gym_calendar_id)` → 23505 error shown as friendly message on conflict.

### Exercise (in-memory shape)
```typescript
{ id: number|string, name: string, standardName: string, primary: string[], secondary: string[], enabled: boolean }
```
Sets/reps not tracked — app logs *what* exercises were in the program, not volume.

### DB tables (abbreviated)
```sql
exercise_library           -- id, user_id, name, primary_muscles[], secondary_muscles[], created_at
session_templates          -- id, user_id, name, sort_order, used_at, created_at
session_template_exercises -- id, template_id, library_exercise_id(nullable), name(snapshot), primary_muscles[], secondary_muscles[], sort_order
week_plans                 -- id, user_id, week_iso, created_at; UNIQUE(user_id, week_iso)
week_plan_days             -- id, plan_id, day_of_week(1-7), template_id(nullable), sort_order
recommendation_cache       -- cache_key(PK), recs jsonb, fetched_at, written_by
```

`session_templates` and `exercise_library` are **gym-wide** (any co-instructor can CRUD). `user_id` = "created by" only.  
`replaceTemplateExercises(templateId, exercises)` = canonical full delete+reinsert for template exercises.  
Recs `cache_key` format: `v{RECS_PROMPT_VERSION}_{periodDays}_{sessionCount}_{trainedIds}_{untrainedIds}` — no `user_id`, shared across users.

## Supabase migration hygiene
New tables require explicit grants (enforced Oct 30, 2026):
```sql
grant select on public.your_table to anon;
grant select, insert, update, delete on public.your_table to authenticated;
grant select, insert, update, delete on public.your_table to service_role;
alter table public.your_table enable row level security;
```
Always use `IF NOT EXISTS` / `CREATE OR REPLACE` for idempotency. Always `DROP POLICY IF EXISTS` before recreating. New tables must also be added to the baseline migration `20260101000000_baseline_schema.sql`.

## Local development
```powershell
.\dev.ps1   # runs fnm use 22, starts Vite + swa start
```
Open **http://localhost:4280** (not 5173). `dev.ps1` is gitignored.

One-time setup:
```powershell
npm install -g @azure/static-web-apps-cli
cp app/.env.local.example app/.env.local                            # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
cp app/api/local.settings.json.example app/api/local.settings.json  # ANTHROPIC_API_KEY, SUPABASE_*
cd app && npm install
```

## Tests
`npm test` in `app/` — Vitest, pure logic only, <2s. Coverage scoped to `src/lib/**` + `api/claudeUtils.js`.

Key files: `claudeUtils.test.js` (API guards), `sportySync.test.js` (`normalizeName`), `bodymap.test.js` (`calcMuscles`), `muscleMapReducer.test.js` (reducer), `prompts.test.js` (all 17 muscle IDs in every prompt), `utils.test.js` (all util exports).

When testing `inferMusclesFromName`/`callClaude`: stub `globalThis.fetch` with `vi.stubGlobal`, unstub in `afterEach`.

## Azure deploy
- Supabase redirect URLs: `http://localhost:4280`, prod URL + `/**`, `<swa-subdomain>-*.westeurope.7.azurestaticapps.net`
- GitHub Environments: `production` (master) and `preview` (PRs) — both use repo-level secrets (do not move to environment-level)

## Backlog
Tracked in [GitHub Issues](https://github.com/ChristopherRotnes/BodyMapTraining/issues). Run `gh issue list` for current open work.

## Known pitfalls

### #9 — VITE_* vars missing from bundle
Oryx strips `VITE_*` env vars. **Fix: pre-build in GitHub Actions runner, upload `app/dist/`.** Never let Oryx build the frontend.

### #9 — Supabase apikey not in browser requests
Supabase JS v2 fetch interceptor doesn't reliably add `apikey` header. **Fix: `global: { headers: { apikey: supabaseKey } }` in `createClient`. Do not remove this.**

### #9 — RLS infinite recursion (42P17)
Admin policies that queried `profiles` from within a `sessions` INSERT RETURNING caused infinite recursion. Fix: dropped both admin policies. Don't create cross-table RLS policies that can loop.

### #57 — Azure SWA intercepts Authorization header
Azure SWA proxy replaces `Authorization: Bearer` with its own managed identity token. **Never send the Supabase JWT in `Authorization`. Use `X-Supabase-Token` instead.**

### #164 — Carbon skeleton flash in dark mode
Carbon emits skeleton token overrides under `.cds--g100` class, but `ThemeProvider` only sets `data-theme="g100"`. **Fix: add `--cds-skeleton-background: #393939` and `--cds-skeleton-element: #525252` to `[data-theme="g100"]` in `carbon-tokens.css`.** Repeat for any new Carbon token only emitted under `.cds--g100`.

### #173 — Image compression (iOS)
- Compare `b64.length <= 5,242,880` — not `b64.length * 0.75`. **Never compare decoded byte size against Anthropic's limit.**
- **Never use `img.src = dataUrl` for large images** — iOS Safari silently zeros `naturalWidth`/`naturalHeight`. Use `URL.createObjectURL(file)` instead.
- iOS Safari ignores `canvas.toDataURL` quality param — use dimension reduction, not quality stepping.

### #173 — `.maybeSingle()` with multi-row tables
`.limit(1).maybeSingle()` silently returns null when the table has >1 rows (PostgREST 406 → JS v2 converts to null). **Use `.limit(1)` + `data?.[0] ?? null` instead.**

### #247 — Supabase preview branches missing baseline
Preview branches apply all migrations on a fresh empty DB. Delta migrations fail without CREATE TABLE first. **New tables must be added to `20260101000000_baseline_schema.sql` with `IF NOT EXISTS`.**

### #237 — Excess anon grants + duplicate RLS policies
Default `GRANT ALL` gives anon TRUNCATE (bypasses RLS). **Only grant what PostgREST needs.** Always `DROP POLICY IF EXISTS` old policies when replacing them.

### #268 — Supabase blocks sb_secret writes without User-Agent
Supabase treats POST/DELETE with an `sb_secret` service role key and no `User-Agent` as a browser request and returns 403 "Forbidden use of secret API key in browser". Azure Functions' built-in `fetch` sends no User-Agent by default. **Always add `'User-Agent': 'WorkoutLens/1.0 sporty-sync (Azure Functions)'` to every write request (POST, DELETE, PATCH) that uses the service role key.** GET requests are unaffected.

### #270 — SWA managed functions ignore timer triggers
Azure Static Web Apps **managed** functions (`api_location: "app/api"` in `ci.yml`) run **HTTP triggers only** — `app.timer(...)` and every other non-HTTP trigger is silently dropped, never registers, and never fires. This is why the sporty.no sync never ran: it was an `app.timer('sportySyncTimer', ...)`. **Fix: drive scheduled work from outside** — a GitHub Actions cron workflow (`.github/workflows/sporty-sync.yml`) that `POST`s to the HTTP endpoint. Never schedule recurring work with `app.timer` on this platform; the only escape hatch is "bring your own Functions app". [Docs](https://learn.microsoft.com/azure/static-web-apps/apis-functions#constraints).
