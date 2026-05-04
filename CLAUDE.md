# BodyMapTraining — CLAUDE.md

## Remember this if you are an AI
**Verification before closing issue**
All issues must be verified by the developer before you can close them on github. Either on dev, qa or prod (user decides). Regardless of method, AI must wait until user has verified fix to close issues.

**Issue format**
All GitHub issues follow this structure:
- **Title:** `As a [user/developer] I want to [action] so I can [benefit]`
- **`## Summary`** — one paragraph describing the problem and goal
- **`## Priority`** — High / Medium / Low (include for developer/infra issues)
- **`## UI spec (Carbon g100)`** — bullet-point spec for any UI changes (Carbon rules apply)
- **`## Data model`** — SQL schema snippet for any new or changed tables
- **`## Acceptance criteria`** — GitHub task-list checkboxes (`- [ ]`) covering all done conditions
- **`## Out of scope`** — explicit exclusions to prevent scope creep (optional but recommended for larger issues)


## Project overview
**Workout Lens** — a workout-logging app. User photographs a handwritten training program from a gym whiteboard (sporty.no format), the app analyses the image via Claude Vision, displays which muscles were trained on a body figure, and gives next-session recommendations.

## Tech stack
- **Frontend:** React 19 + Vite (in `app/`)
- **Design system:** IBM Carbon Design System (`@carbon/react`, `@carbon/icons-react`) — see [Carbon design system](#carbon-design-system) section
- **Auth + DB:** Supabase (magic-link login, Supabase Auth + PostgreSQL)
- **AI:** Anthropic Claude API — proxied via Azure Function (server-side); model IDs managed in `app/src/lib/prompts.js`
- **Hosting:** Azure Static Web Apps — **live at [workout.umulig.org](https://workout.umulig.org)**
- **CI/CD:** GitHub Actions — push to `master` → auto-deploy to Azure SWA
- **Language:** Norwegian UI throughout

## Muscle ID system (17 total)
```
chest, shoulders_front, shoulders_side, biceps, forearms, abs, obliques, quads, calves
traps, rear_delts, lats, triceps, lower_back, glutes, hamstrings, calves_back
```
Each has a `view` (front/back) and Norwegian `label` in the `MUSCLES` object in `app/src/lib/bodymap.jsx`.

## Carbon design system

Fully migrated to IBM Carbon Design System (issue #8, resolved 2026-04-29).

### What was done
- Installed `@carbon/react` and `@carbon/icons-react`
- IBM Plex fonts (Sans, Mono, Serif, Condensed) bundled locally in `app/public/fonts/` — no Google Fonts, no CDN
- `app/src/styles/carbon-tokens.css` — all Carbon CSS variables for g10 (light) and g100 (dark) themes, plus `@font-face` declarations; font URLs use `/fonts/...` (Vite public-dir absolute paths)
- `app/src/theme.jsx` — `ThemeProvider` sets `data-theme="g10"` or `data-theme="g100"` on `<html>`, persists to `localStorage`, respects `prefers-color-scheme`, defaults to g100 (dark)
- `Login.jsx` → Carbon `TextInput`, `Button`, `InlineNotification`, `Email` icon
- `MuscleMap.jsx` → Carbon `Header` + `HeaderGlobalBar` (with `RecentlyViewed` history nav, `Book` library nav, light/dark toggle), `ProgressIndicator` (horizontal stepper with step labels), `Button`, `Tag`, `InlineLoading`, `InlineNotification`; dashed-border dropzone on upload step; sticky action bar on confirm step; exercise rows delegated to `ExerciseRow`
- `History.jsx` → `SectionLabel` + `PageHeading` hero (context-aware: default shows month count + per-count motivation message 1–50; filter active + date selected shows "N av total økter den dato"; filter active + no date shows month count with "med disse filtrene"); `PageHeading` has `minHeight: 72` to prevent layout shift; muscle filter chips use `flexWrap: wrap` (all always visible); `borderBottom` separator below chip section; session rows always have 3px left strip (accent when filter-matched); session title in Cond 700; custom `MonthGrid` calendar; edit mode uses `Edit`, `Camera`, `Add`, `Renew` icons; exercise rows delegated to `ExerciseRow`
- `Bibliotek.jsx` → custom pill tab strip (replaces Carbon `Tabs`; keyboard ArrowLeft/ArrowRight); `PageHeading` hero; live search input on exercises tab; Snarvei template carousel; exercise rows use `AccentChip` for primary muscles + Cond 700 name + 3px accent left strip; template cards use `borderRadius: var(--r-card)`; "Ny øvelse" button renders above Snarveier carousel to prevent tab-switch layout shift; exercise form via `ExerciseForm`
- `TemplatePicker.jsx` → Carbon `Button`, `InlineLoading`, `InlineNotification`
- `TemplateSessionEditor.jsx` → Carbon `Button`, `Tag`, `InlineNotification`, `InlineLoading`; body map via `BodyPanel`; exercise rows via `ExerciseRow`; library search via `LibraryPicker`
- `MuscleMap.jsx` confirm step → Carbon `DatePicker`/`DatePickerInput` for session date (defaults to today, max = today)
- `BodySVG` / `HeatmapBodySVG` muscle highlights: primary → `var(--heat-4)` solid green, secondary → diagonal blue hatch (`#001d6c` base + `#4589ff` lines). `HeatmapBodySVG` accepts `onHover(id|null)` and `hovered` props — when `onHover` is provided the internal floating tooltip is suppressed and the caller manages the detail card.
- `Home.jsx` → `SectionLabel` + `PageHeading` headings; last session card with gym-class identity hero; 7-day weekly strip with heat colors — clicking a day that has a session navigates to History pre-selected on that date; `fetchThisWeekSessions` in `db.js`
- `Report.jsx` → `SectionLabel` eyebrow with period + active day filters on two separate `display:block` spans; two-line Cond 700 hero (untrained count in magenta + "aldri trent."); three separate `flexWrap: wrap` filter rows (period / weekdays / session types) with `1px solid var(--border-subtle-wl)` top borders between groups; "Nullstill filter" always rendered (opacity-toggled); gap callout card uses `var(--accent-bg-08)` with `AccentChip` per untrained muscle; recommendation rows have 3px accent left strip + round `+` button that saves the exercise inline via `saveLibraryExercise` (no navigation away); on success button becomes a disabled `Checkmark` icon (grayed out, stays that way); Postgres 23505 duplicate treated as success; save errors show an `InlineNotification kind="error"` above the recs list; `savedRecs` (Set), `savingRec`, `saveRecError` state tracks per-row state; `StickyCta` "Disse bør du legge inn i programmet →"; prefill prop applied on mount via `useRef`; `KpiTile` (42px Plex Light value); `muscleLastDate` in useMemo
- `History.jsx` → custom `MonthGrid` (7-column CSS grid, heat fill, today/selected outlines, month nav); `sessionCountMap` useMemo; `SectionLabel` + `PageHeading` at top; removed `react-day-picker` dependency entirely
- `PageShell.jsx` → exports: `SectionLabel` (mono 12px, 0.16em tracking, 3px `var(--accent)` left border), `PageHeading` (Cond 700 28px), `PageTitle` (alias for SectionLabel), `AccentChip` (magenta pill: `var(--accent-bg-14)` bg, `var(--accent-soft)` text), `StickyCta` (sticky bottom bar with top border), `BackButton`; `NavBtn` active state: 2px `var(--accent)` bottom border + `var(--cds-layer-01)` background
- `carbon-tokens.css` → added `--heat-1..5` green scale (#044317 → #42be65); WL custom tokens: `--accent` (#ee2c80 magenta), `--surface-card`, `--border-subtle-wl`, `--text-muted-wl`, `--accent-bg-08/14/30`, `--accent-soft`, `--r-card` (16px), `--r-pill` (999px), `--r-tile` (10px), `--cond` (IBM Plex Sans Condensed); g10 light-mode overrides for all WL tokens
- `app.css` → global `html, body { overflow-x: hidden }` to prevent horizontal viewport bleed from chip rows; do not use `overflow: hidden` on direct parents of `flexWrap: wrap` chip containers — it clips instead of scrolling
- Removed: Bebas Neue, DM Sans, Google Fonts import, custom `C` token objects, all raw hex colors, rounded corners, `react-day-picker`

### Hard rules (must not regress)
- **Sentence case** for all labels — `Add exercise`, not `Add Exercise`
- **0px border-radius** on buttons, inputs, cards — exceptions: Tags/pill chips use `var(--r-pill)` (999px), cards use `var(--r-card)` (16px), tiles use `var(--r-tile)` (10px)
- **No emoji** — use `@carbon/icons-react` exclusively (exception: motivation messages in History hero are plain strings, not UI)
- **IBM Plex everywhere** — no system-font fallbacks visible in the rendered page
- **Semantic tokens** (`var(--cds-*)` or `var(--wl-*)`) not raw hex — otherwise the theme toggle breaks
- **No gradients** in product UI — solid colors only
- **Focus ring** = 2px solid `#0f62fe` outline (Carbon handles this via its component styles)
- **Filter chips** — always use `flexWrap: wrap`; never `overflowX: auto` on a flex chip container without a constrained parent (it silently fails on mobile Chromium and clips instead of scrolling)

### Token cheat sheet
| Concept | Token |
|---|---|
| Page background | `var(--cds-background)` |
| Card/tile surface | `var(--cds-layer-01)` |
| Nested card | `var(--cds-layer-02)` |
| Border | `var(--cds-border-subtle-01)` |
| Strong border / input border | `var(--cds-border-strong-01)` |
| Primary text | `var(--cds-text-primary)` |
| Secondary/muted text | `var(--cds-text-secondary)` |
| Interactive (blue) | `var(--cds-interactive)` |
| Error | `var(--cds-support-error)` |
| Body font | `var(--cds-font-sans)` |
| Mono font | `var(--cds-font-mono)` |

### Adding more Carbon components
Refer to the official IBM Carbon documentation and `app/src/styles/carbon-tokens.css` for available tokens. The `@carbon/react` package ships full TypeScript types — use them as the component API reference.

## Backlog

Tracked in [GitHub Issues](https://github.com/ChristopherRotnes/BodyMapTraining/issues). Run `gh issue list` for current open work.

## Session data model — edit flow (issue #19)

`updateSession(sessionId, exercises, gymCalendarId)` in `db.js`:
1. Deletes all `session_exercises` for the session (cascades to `muscle_activations`)
2. Re-inserts enabled exercises + their `muscle_activations`
3. Updates `gym_calendar_id` on the `sessions` row

The sessions table has `UNIQUE (gym_calendar_id)` — updating to a gym class that already has a different session raises a Postgres 23505 error, shown to the user as a friendly message.

`saveSession` accepts an optional `sessionDate` param (ISO `yyyy-MM-dd`); defaults to today for backwards compat.

`fetchGymSessionsByDate(dateStr)` generalises `fetchTodayGymSessions` — same query but parameterised. `fetchTodayGymSessions` now delegates to it.

## Exercise data model
```typescript
{
  id: number | string,   // number from Claude parse; string (Date.now()) for manually added rows
  name: string,          // exact name from whiteboard / user-edited
  standardName: string,  // normalised name
  sets: string | null,   // defaults to "1" if not written on board
  reps: string | null,
  primary: string[],     // muscle IDs returned by Claude (or from library)
  secondary: string[],   // muscle IDs returned by Claude (or from library)
  enabled: boolean       // toggled in confirm/template step
}
```

## Exercise library + session templates data model (issue #38)

Three new Supabase tables:

```sql
exercise_library          -- named exercises with muscle maps
  id, user_id, name, primary_muscles text[], secondary_muscles text[],
  default_sets text, default_reps text, created_at

session_templates         -- named session skeletons
  id, user_id, name, sort_order int, used_at timestamptz, created_at

session_template_exercises -- ordered exercises within a template
  id, template_id → session_templates, library_exercise_id → exercise_library (nullable),
  name text (denormalised snapshot), primary_muscles text[], secondary_muscles text[],
  sets text, reps text, sort_order int
```

Name + muscles are denormalised into `session_template_exercises` so renaming a library exercise doesn't silently change existing templates.

`replaceTemplateExercises(templateId, exercises)` in `db.js` does a full delete-and-reinsert — the canonical update path for template exercise lists.

`touchTemplate(id)` updates `used_at` to now — called on "Bruk økt" so templates sort by recency in TemplatePicker.

## Key architecture decisions
- **Shared muscle/SVG module:** `app/src/lib/bodymap.jsx` exports `MUSCLES`, `SHAPES`, `EX_DB`, color constants (`PRIMARY_FILL`, `PRIMARY_HOVER`, `PRIMARY_STROKE`, heat vars), `calcMuscles`, `BodySVG`, `HeatmapBodySVG` (accepts `onHover(id|null)` and `hovered` props — when `onHover` is set the internal tooltip is suppressed), and `useIsMobile`. Do not duplicate these in component files.
- **Shared utilities:** `app/src/lib/utils.js` — exports `toBase64`, `getMediaType`, `buildMuscleMapFromExercises` (with EX_DB fallback, for confirm/edit steps), `buildMuscleMapFromSession` (reads saved DB session for History read mode), `buildRecMuscleMap` (for recommendation body maps), `isInvalidNum` (validates sets/reps as integers 1–99), `callClaude(body)` (authenticated fetch to `/api/claude` — injects Supabase JWT automatically), `extractMuscles(session)` (splits `muscle_activations` into primary/secondary Sets, removes primary from secondary). Do not redefine these locally in component files.
- **Shared Claude config:** `app/src/lib/prompts.js` — exports `CLAUDE_MODEL_VISION` (opus, for image analysis), `CLAUDE_MODEL_TEXT` (sonnet, for recommendations), `ANALYZE_PROMPT`, `buildRecommendPrompt(trained, untrained)`, `buildPeriodRecommendPrompt(periodDays, sessionCount, trainedLabels, untrainedLabels)`. All model IDs and prompt text live here; update in one place.
- Claude returns muscle IDs directly in JSON — local keyword matching (EX_DB) was abandoned because Norwegian abbreviations and whiteboard variants didn't match reliably. EX_DB is kept only as fallback for manually added exercises.
- SVG body uses `BODY_PATH` (bezier curves, viewBox `0 0 160 360`) — improved silhouette with curved shoulders, arms, waist and hips. Still simplified, not anatomically precise. `SHAPES` entries are either ellipses (`{ cx, cy, rx, ry }`) or SVG paths (`{ d }`); the render loop handles both. Key muscles with path shapes: `traps` (trapezoid with neck notch), `lats` (wing paths). `BodySVG` renders primary muscles as solid green glow, secondary as diagonal blue stripes (`<pattern id="sec-stripe-{view}">`).
- `useIsMobile(breakpoint=500)` — exported hook from `bodymap.jsx`. Below breakpoint: single body view with Front/Bak toggle. Above: side-by-side. Consumed via `BodyPanel` — do not use directly in page components.
- **Shared exercise row:** `app/src/components/ExerciseRow.jsx` — renders one editable exercise row (checkbox, inline name edit, sets/reps inputs, delete). Props: `exercise`, `onChange(updates)`, `onDelete()`, `layer` ("layer-01"/"layer-02"), `validateNumbers`, `autoFocusName`. The outer row div has no click handler — only the Checkbox toggles `enabled` (prevents accidental untick when editing fields). Used by `MuscleMap.jsx`, `History.jsx`, and `TemplateSessionEditor.jsx`.
- **BodyPanel:** `app/src/components/BodyPanel.jsx` — shared front/back body map. Manages its own `mobileView` toggle state internally. Props: `primary[]`, `secondary[]`, `muscleMap`, `marginBottom`. Replaces the duplicated mobile/desktop render pattern that previously existed in `MuscleMap`, `History`, and `TemplateSessionEditor`.
- **MusclePicker:** `app/src/components/MusclePicker.jsx` — interactive body map where clicking a muscle cycles off → primary → secondary → off. Props: `primary[]`, `secondary[]`, `onChange({ primary, secondary })`, `instanceId` (unique suffix to avoid SVG filter ID collisions). Used inside `ExerciseForm.jsx`.
- **ExerciseForm:** `app/src/components/ExerciseForm.jsx` — form for creating/editing a library exercise (name, default sets/reps, MusclePicker). Props: `initial`, `onSave(fields)`, `onCancel()`, `saving`. Extracted from inline definition in `Bibliotek.jsx`.
- **LibraryPicker:** `app/src/components/LibraryPicker.jsx` — searchable list of library exercises for adding to a template. Props: `libraryExercises[]`, `onAdd(exercise)`, `onClose()`. Extracted from inline definition in `TemplateSessionEditor.jsx`.
- **ExerciseRowWithAutocomplete:** `app/src/components/ExerciseRowWithAutocomplete.jsx` — wrapper around `ExerciseRow` that adds an inline autocomplete dropdown when a new exercise name is typed. Only activates when `isNew` prop is true (IDs added during the current edit session, tracked via `newExerciseIds` Set in History). Props: all `ExerciseRow` props + `libraryExercises[]` + `isNew`. Library is fetched once when edit mode opens; failure degrades silently to manual entry. Uses `onMouseDown + e.preventDefault()` on suggestions to prevent input blur from closing the dropdown before the click fires. Used in `History.jsx` edit mode only — `ExerciseRow` is unchanged for `MuscleMap` and `TemplateSessionEditor`.
- **API security:** `app/api/claude.js` requires a valid Supabase JWT on every request (`Authorization: Bearer <token>`). Verifies via `GET /auth/v1/user`. Also enforces a model allowlist (`claude-opus-4-5`, `claude-sonnet-4-6`) and caps `max_tokens` at 2000. The `callClaude(body)` helper in `utils.js` injects the token automatically — all Claude calls must go through it.
- **Template navigation:** `App.jsx` manages views `"bibliotek"`, `"template-picker"`, `"template-editor"` alongside existing views. `App.jsx` also accumulates cross-cutting state as features land (`bibliotekInitialTab`, `pendingTemplateExercises`, history context state). This is acceptable at current scale — if more than 2–3 further pieces of cross-component state are needed, extract navigation and shared state to a React Context rather than continuing to lift into `App.jsx`. `bibliotekInitialTab` state ensures returning from template edit lands on the "Mal for gymtime" tab. When "Bruk økt" is pressed in `TemplateSessionEditor` (mode="use"), exercises pass to `MuscleMap` via `templatePreload` prop, triggering a `useEffect` that pre-fills the list and jumps to the confirm step.
- Supabase Auth uses magic links (`emailRedirectTo: window.location.origin`)
- Anthropic API calls go through `app/api/claude.js` — Azure Function v4 model, browser hits `/api/claude`
- **Azure Functions entry point:** `app/api/index.js` imports all function files (`claude.js`, `sportySync.js`). `package.json#main` points to `index.js`. Azure Functions v4 only loads the single file referenced in `main` — add new function files here or they will never be registered.
- **Sporty.no sync:** `app/api/sportySync.js` — timer trigger at 04:00 + 11:00 UTC upserts today's sessions from `https://sporty.no/api/v1/businessunits/8/groupactivities` into `gym_calendar` by `sporty_id`. Business unit `8` is hardcoded — intentional for now (single-gym product); if extended to multiple gyms, this must become an env var or DB config. HTTP trigger `POST /api/sporty-sync` available for manual testing; accepts optional JSON body `{ "shiftDays": -7 }` to offset all timestamps by N days (useful for backfilling historical gym calendar data without re-running the live API). Requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` as Azure app settings (service role needed because the timer has no auth user).
- **Claude API proxy:** `app/api/claude.js` verifies incoming Supabase JWTs via `GET /auth/v1/user`. Requires `ANTHROPIC_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` as Azure app settings. Use `SUPABASE_ANON_KEY` (no `VITE_` prefix) — the `VITE_` prefix is Vite build-time only and is invisible to the Azure Functions runtime.
- **CI/CD build split:** the frontend is pre-built in the GitHub Actions runner (`npm ci && npm run build` with `VITE_*` in `env:`), then the Azure SWA action uploads `app/dist/` directly (`app_location: "app/dist"`). This bypasses Oryx for the frontend — Oryx strips `VITE_*` env vars before spawning Vite and they never reach the bundle. Oryx still handles the API (`app/api`). `vite.config.js` has a build-time assertion that fails immediately if the required vars are missing.
- **Supabase client explicit apikey header:** `createClient` is called with `global: { headers: { apikey: supabaseKey } }` in `app/src/lib/supabase.js`. The Supabase JS v2 fetch interceptor should add this automatically, but it was not reaching browser requests — passing it in `global.headers` puts it directly on `PostgrestClient`'s base headers, bypassing the interceptor. Do not remove this option.

## Known limitations
- SVG body is improved but still geometrically simplified — not anatomically precise; key muscles (traps, lats) use path shapes, rest are ellipses
- `shoulders_front` and `shoulders_side` shapes were previously nearly identical in position (3px apart), causing wrong hover hit targets and incorrect tooltip data in the heatmap. Fixed by moving `shoulders_front` inward (cx:42, cy:60) and `shoulders_side` outward to the arm edge (cx:23, cy:68) — see issue #18. Pending live verification.
- Volume (sets × reps) is logged but not used in muscle analysis
- Recommendations are contextual per session, not based on accumulated history (will improve with data)
- No error handling for API rate limits
- History edit mode re-analyse uses a single image only (the new photo replaces the full exercise list); multi-image re-analysis is not supported in edit mode
- Carbon `DatePicker` uses US date format (`MM/DD/YYYY`) in the confirm step — no Norwegian locale override applied yet

## Local development

```powershell
.\dev.ps1
```

`dev.ps1` is gitignored. It:
1. Calls `fnm use 22` — pins to Node 22 LTS (Node 20 reached EOL April 2026)
2. Spawns `npm run dev` (Vite on port 5173) in a separate PowerShell window
3. Waits 3 s for Vite to start, then calls `swa start`

Open **http://localhost:4280** (not 5173). The SWA emulator proxies `/api/*` to the local Azure Functions process; `npm run dev` alone skips the API layer.

### One-time setup
```bash
npm install -g @azure/static-web-apps-cli
cp app/.env.local.example app/.env.local                             # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
cp app/api/local.settings.json.example app/api/local.settings.json  # fill in ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY, SUPABASE_ANON_KEY
cd app && npm install
```

`app/.env.test` is committed with placeholder values and requires no setup — it exists solely so the Vitest test runner can import `supabase.js` without crashing in CI (no real Supabase calls are made during unit tests).

## Azure deploy notes
- **Resource group:** `rg-muskelkart` (West Europe) — **Azure resource name:** `muskelkart`
- Supabase Auth redirect URLs: localhost + Azure domain both registered
- For secrets/settings/live URL, see README → Deployment section

## Known pitfalls (previously hit, fixed, must not regress)

### Issue #9 — Session save failing (resolved 2026-04-28)
Two bugs combined to break `POST /rest/v1/sessions`:

**Bug 1 — `VITE_SUPABASE_ANON_KEY` not in bundle:**
Azure SWA's Oryx Docker build engine strips `VITE_*` env vars before spawning the Vite subprocess. The key was set as a GitHub Actions secret but never reached the bundle. Fix: pre-build the frontend in the GitHub Actions runner (`npm ci && npm run build` with `VITE_*` in the `env:` block), point `app_location: "app/dist"` so the SWA action uploads the pre-built dist directly without re-building.

**Bug 2 — Supabase JS fetch interceptor not adding `apikey` header in browser:**
Even after the key was correctly baked into the bundle, browser REST requests arrived at Supabase without the `apikey` header. The v2 fetch interceptor (`Ui`) should add it, but did not. Fix: pass `global: { headers: { apikey: supabaseKey } }` to `createClient` — this puts the key directly on `PostgrestClient`'s base headers, bypassing the interceptor entirely. See `app/src/lib/supabase.js`.

**Bug 3 — RLS infinite recursion on `profiles` (Postgres error 42P17):**
Once the apikey was in requests, saves still failed with `42P17: infinite recursion detected in policy for relation "profiles"`. Root cause: `INSERT INTO sessions` with `Prefer: return=representation` triggers a RETURNING select, which evaluated the `"Admin ser alle økter"` SELECT policy on `sessions` — that policy queried `profiles`, which in turn triggered the `"Admin ser alle profiler"` SELECT policy on `profiles` — and that policy queried `profiles` again, looping forever. Fix: dropped both admin policies (`"Admin ser alle profiler"` on `profiles` and `"Admin ser alle økter"` on `sessions`) via Supabase MCP migration. Neither is needed for a single-user workout logger.

### Issue #57 — `/api/claude` returning 401 despite valid session (resolved 2026-05-03)
Symptoms: every upload failed with 401. The browser was sending a valid Supabase JWT in `Authorization: Bearer <token>`, but `claude.js` kept rejecting it with Supabase's `bad_jwt / signature is invalid`.

**Root cause — Azure SWA replaces the `Authorization` header:**
Azure Static Web Apps' proxy layer silently replaces any incoming `Authorization: Bearer` header with its own managed identity token (issued by `*.scm.azurewebsites.net`) before the request reaches the function handler. The Supabase JWT never arrived; Azure's Kudu identity token did instead. Supabase correctly rejected it. This happens even with `authLevel: 'anonymous'` on the function.

**How we diagnosed it:** the Supabase token uses ES256 (asymmetric) and has a `kid` in the JWT header, making it ~900 chars. The server only saw 365 chars — a completely different token with `iss: https://31315134-...scm.azurewebsites.net`.

**Fix:** send the Supabase JWT in a custom header `X-Supabase-Token` that Azure's proxy ignores. See `callClaude` in `app/src/lib/utils.js` and `verifySupabaseJwt` in `app/api/claude.js`.

**Never revert to `Authorization: Bearer` for the Supabase token** — Azure will always intercept it.

