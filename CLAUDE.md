# BodyMapTraining — CLAUDE.md

## Project overview
**Workout Lens** — a workout-logging app. User photographs a handwritten training program from a gym whiteboard (sporty.no format), the app analyses the image via Claude Vision, displays which muscles were trained on a body figure, and gives next-session recommendations.

## Tech stack
- **Frontend:** React 19 + Vite (in `app/`)
- **Design system:** IBM Carbon Design System (`@carbon/react`, `@carbon/icons-react`) — see [Carbon design system](#carbon-design-system) section
- **Auth + DB:** Supabase (magic-link login, Supabase Auth + PostgreSQL)
- **AI:** Anthropic Claude API — proxied via Azure Function (server-side); model IDs managed in `app/src/lib/prompts.js`
- **Hosting:** Azure Static Web Apps — **live at [white-island-090dfd003.7.azurestaticapps.net](https://white-island-090dfd003.7.azurestaticapps.net)**
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
- `MuscleMap.jsx` → Carbon `Header` + `HeaderGlobalBar` (with `RecentlyViewed` history nav, `Book` library nav, light/dark toggle), `ProgressIndicator`, `Button`, `Tag`, `InlineLoading`, `InlineNotification`; exercise rows delegated to `ExerciseRow`
- `History.jsx` → Carbon `Header`, `Tag`, `InlineLoading`, `InlineNotification`, `Select`/`SelectItem`; `react-day-picker` calendar themed to Carbon tokens; edit mode uses `Edit`, `Camera`, `Add`, `Renew` icons; exercise rows delegated to `ExerciseRow`
- `Bibliotek.jsx` → Carbon `Tabs`/`Tab`/`TabList`/`TabPanels`/`TabPanel`, `TextInput`, `Button`, `Tag`, `InlineNotification`, `InlineLoading`, `Modal`; exercise form via `ExerciseForm`
- `TemplatePicker.jsx` → Carbon `Button`, `InlineLoading`, `InlineNotification`
- `TemplateSessionEditor.jsx` → Carbon `Button`, `Tag`, `InlineNotification`, `InlineLoading`; body map via `BodyPanel`; exercise rows via `ExerciseRow`; library search via `LibraryPicker`
- `MuscleMap.jsx` confirm step → Carbon `DatePicker`/`DatePickerInput` for session date (defaults to today, max = today)
- `BodySVG` muscle highlights: primary → green-50 `rgba(36,161,72,…)`, secondary → blue-40 `rgba(120,169,255,…)`
- Removed: Bebas Neue, DM Sans, Google Fonts import, custom `C` token objects, all raw hex colors, emoji, rounded corners

### Hard rules (must not regress)
- **Sentence case** for all labels — `Add exercise`, not `Add Exercise`
- **0px border-radius** on buttons, inputs, cards — Carbon's only exception is Tags (16px pill)
- **No emoji** — use `@carbon/icons-react` exclusively
- **IBM Plex everywhere** — no system-font fallbacks visible in the rendered page
- **Semantic tokens** (`var(--cds-*)`) not raw hex — otherwise the theme toggle breaks
- **No gradients** in product UI — solid colors only
- **Focus ring** = 2px solid `#0f62fe` outline (Carbon handles this via its component styles)

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

## What is NOT yet built
- **Favicon** — replace default Vite icon with camera SVG in Carbon style (queued)
- **Page title** — change from "app" to "Workout Lens" (queued)
- **Gym calendar manager** — admin UI to manually trigger sporty.no sync and inspect `gym_calendar` rows; when built, the HTTP trigger on `sportySync.js` can be removed from the user-facing API

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
- **Shared muscle/SVG module:** `app/src/lib/bodymap.jsx` exports `MUSCLES`, `SHAPES`, `EX_DB`, color constants, `calcMuscles`, `BodySVG`, `HeatmapBodySVG`, and `useIsMobile`. Both `MuscleMap.jsx` and `History.jsx` import from here — do not duplicate these in component files.
- **Shared utilities:** `app/src/lib/utils.js` — exports `toBase64`, `getMediaType`, `buildMuscleMapFromExercises` (with EX_DB fallback, for confirm/edit steps), `buildMuscleMapFromSession` (reads saved DB session for History read mode), `buildRecMuscleMap` (for recommendation body maps), `isInvalidNum` (validates sets/reps as integers 1–99), `callClaude(body)` (authenticated fetch to `/api/claude` — injects Supabase JWT automatically). Do not redefine these locally in component files.
- **Shared Claude config:** `app/src/lib/prompts.js` — exports `CLAUDE_MODEL_VISION` (opus, for image analysis), `CLAUDE_MODEL_TEXT` (sonnet, for recommendations), `ANALYZE_PROMPT`, `buildRecommendPrompt(trained, untrained)`, `buildPeriodRecommendPrompt(periodDays, sessionCount, trainedLabels, untrainedLabels)`. All model IDs and prompt text live here; update in one place.
- Claude returns muscle IDs directly in JSON — local keyword matching (EX_DB) was abandoned because Norwegian abbreviations and whiteboard variants didn't match reliably. EX_DB is kept only as fallback for manually added exercises.
- SVG body uses `BODY_PATH` (bezier curves, viewBox `0 0 160 360`) — improved silhouette with curved shoulders, arms, waist and hips. Still simplified, not anatomically precise. `SHAPES` entries are either ellipses (`{ cx, cy, rx, ry }`) or SVG paths (`{ d }`); the render loop handles both. Key muscles with path shapes: `traps` (trapezoid with neck notch), `lats` (wing paths). `BodySVG` renders primary muscles as solid green glow, secondary as diagonal blue stripes (`<pattern id="sec-stripe-{view}">`).
- `useIsMobile(breakpoint=500)` — exported hook from `bodymap.jsx`. Below breakpoint: single body view with Front/Bak toggle. Above: side-by-side. Consumed via `BodyPanel` — do not use directly in page components.
- **Shared exercise row:** `app/src/components/ExerciseRow.jsx` — renders one editable exercise row (checkbox, inline name edit, sets/reps inputs, delete). Props: `exercise`, `onChange(updates)`, `onDelete()`, `layer` ("layer-01"/"layer-02"), `validateNumbers`, `autoFocusName`. The outer row div has no click handler — only the Checkbox toggles `enabled` (prevents accidental untick when editing fields). Used by `MuscleMap.jsx`, `History.jsx`, and `TemplateSessionEditor.jsx`.
- **BodyPanel:** `app/src/components/BodyPanel.jsx` — shared front/back body map. Manages its own `mobileView` toggle state internally. Props: `primary[]`, `secondary[]`, `muscleMap`, `marginBottom`. Replaces the duplicated mobile/desktop render pattern that previously existed in `MuscleMap`, `History`, and `TemplateSessionEditor`.
- **MusclePicker:** `app/src/components/MusclePicker.jsx` — interactive body map where clicking a muscle cycles off → primary → secondary → off. Props: `primary[]`, `secondary[]`, `onChange({ primary, secondary })`, `instanceId` (unique suffix to avoid SVG filter ID collisions). Used inside `ExerciseForm.jsx`.
- **ExerciseForm:** `app/src/components/ExerciseForm.jsx` — form for creating/editing a library exercise (name, default sets/reps, MusclePicker). Props: `initial`, `onSave(fields)`, `onCancel()`, `saving`. Extracted from inline definition in `Bibliotek.jsx`.
- **LibraryPicker:** `app/src/components/LibraryPicker.jsx` — searchable list of library exercises for adding to a template. Props: `libraryExercises[]`, `onAdd(exercise)`, `onClose()`. Extracted from inline definition in `TemplateSessionEditor.jsx`.
- **API security:** `app/api/claude.js` requires a valid Supabase JWT on every request (`Authorization: Bearer <token>`). Verifies via `GET /auth/v1/user`. Also enforces a model allowlist (`claude-opus-4-5`, `claude-sonnet-4-6`) and caps `max_tokens` at 2000. The `callClaude(body)` helper in `utils.js` injects the token automatically — all Claude calls must go through it.
- **Template navigation:** `App.jsx` manages views `"bibliotek"`, `"template-picker"`, `"template-editor"` alongside existing views. `bibliotekInitialTab` state ensures returning from template edit lands on the "Mal for gymtime" tab. When "Bruk økt" is pressed in `TemplateSessionEditor` (mode="use"), exercises pass to `MuscleMap` via `templatePreload` prop, triggering a `useEffect` that pre-fills the list and jumps to the confirm step.
- Supabase Auth uses magic links (`emailRedirectTo: window.location.origin`)
- Anthropic API calls go through `app/api/claude.js` — Azure Function v4 model, browser hits `/api/claude`
- **Azure Functions entry point:** `app/api/index.js` imports all function files (`claude.js`, `sportySync.js`). `package.json#main` points to `index.js`. Azure Functions v4 only loads the single file referenced in `main` — add new function files here or they will never be registered.
- **Sporty.no sync:** `app/api/sportySync.js` — timer trigger at 04:00 + 11:00 UTC upserts today's sessions from `https://sporty.no/api/v1/businessunits/8/groupactivities` into `gym_calendar` by `sporty_id`. HTTP trigger `POST /api/sporty-sync` available for manual testing. Requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` as Azure app settings (service role needed because the timer has no auth user).
- **CI/CD build split:** the frontend is pre-built in the GitHub Actions runner (`npm ci && npm run build` with `VITE_*` in `env:`), then the Azure SWA action uploads `app/dist/` directly (`app_location: "app/dist"`). This bypasses Oryx for the frontend — Oryx strips `VITE_*` env vars before spawning Vite and they never reach the bundle. Oryx still handles the API (`app/api`). `vite.config.js` has a build-time assertion that fails immediately if the required vars are missing.
- **Supabase client explicit apikey header:** `createClient` is called with `global: { headers: { apikey: supabaseKey } }` in `app/src/lib/supabase.js`. The Supabase JS v2 fetch interceptor should add this automatically, but it was not reaching browser requests — passing it in `global.headers` puts it directly on `PostgrestClient`'s base headers, bypassing the interceptor. Do not remove this option.

## Open backlog — issue groupings

| PR | Issues | Description |
|---|---|---|
| A — Shared lib foundation | #24 #25 #27 | Extract duplicate utils/prompts/model constant ✅ Done |
| B — Error resilience | #23 #29 | JSON.parse try-catch + React ErrorBoundary ✅ Done |
| C — Backend security | #26 | API key on sportySync HTTP trigger ✅ Done |
| D — Tests | #28 | Vitest unit tests for lib/ functions ✅ Done |
| E — History improvements | #31 #34 | Muscle filter + skeleton loading ✅ Done |
| F — Input & display polish | #32 #33 #35 #36 | Volume in report, Norwegian date format, form validation ✅ Done |
| G — Image storage | #30 | Supabase Storage for whiteboard photos (low priority) |
| H — Templates + library | #38 | Exercise library, session templates, TemplatePicker, TemplateSessionEditor ✅ Done |
| I — Security + refactor | — | API JWT auth, callClaude helper, useReducer in MuscleMap, BodyPanel/ExerciseForm/LibraryPicker extraction, batch inserts, Carbon Modal ✅ Done |

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
1. Calls `fnm use 20` — Azure Functions Core Tools v4 requires Node ≤ 20; the system default is v24 which breaks the CLI
2. Spawns `npm run dev` (Vite on port 5173) in a separate PowerShell window
3. Waits 3 s for Vite to start, then calls `swa start`

Open **http://localhost:4280** (not 5173). The SWA emulator proxies `/api/*` to the local Azure Functions process; `npm run dev` alone skips the API layer.

### One-time setup
```bash
npm install -g @azure/static-web-apps-cli
cp app/.env.local.example app/.env.local                             # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
cp app/api/local.settings.json.example app/api/local.settings.json  # fill in ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY
cd app && npm install
```

`app/.env.test` is committed with placeholder values and requires no setup — it exists solely so the Vitest test runner can import `supabase.js` without crashing in CI (no real Supabase calls are made during unit tests).

## Azure deploy notes
- **Resource group:** `rg-muskelkart` (West Europe) — **Azure resource name:** `muskelkart`
- Supabase Auth redirect URLs: localhost + Azure domain both registered
- Netlify site is locked (no longer deploys on push)
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

