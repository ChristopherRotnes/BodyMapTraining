# BodyMapTraining — CLAUDE.md

## Project overview
**Workout Lens** — a workout-logging app. User photographs a handwritten training program from a gym whiteboard (sporty.no format), the app analyses the image via Claude Vision, displays which muscles were trained on a body figure, and gives next-session recommendations.

## Tech stack
- **Frontend:** React 19 + Vite (in `app/`)
- **Auth + DB:** Supabase (magic-link login, Supabase Auth + PostgreSQL)
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`) — proxied via Azure Function (server-side)
- **Hosting:** Azure Static Web Apps — **live at [white-island-090dfd003.7.azurestaticapps.net](https://white-island-090dfd003.7.azurestaticapps.net)**
- **CI/CD:** GitHub Actions — push to `master` → auto-deploy to Azure SWA
- **Language:** Norwegian UI throughout

## Project structure
```
app/
  src/
    App.jsx                  # Root: auth gate → Login or MuscleMap
    components/
      Login.jsx              # Magic-link email login
      MuscleMap.jsx          # Main component — all workout flow
    lib/
      supabase.js            # Supabase client (reads VITE_SUPABASE_*)
      db.js                  # Supabase DB helpers (sessions, exercises, muscle_activations)
  api/
    claude.js                # Azure Function (v4 model) — proxies requests to Anthropic API
    host.json                # Azure Functions runtime config
    package.json             # API dependencies (@azure/functions)
  public/
    favicon.svg              # App favicon (TODO: replace with camera icon)
  index.html                 # Page title currently "app" (TODO: rename to "Workout Lens")
  staticwebapp.config.json   # Azure SWA routing + API config
  .nvmrc                     # Node 20.11.0
  .env.local                 # Supabase URL + anon key (NOT committed)
.github/
  workflows/
    azure-static-web-apps-white-island-090dfd003.yml  # CI/CD pipeline
```

## Environment variables
| Variable | Where set | Used by |
|---|---|---|
| `VITE_SUPABASE_URL` | GitHub Actions secret | Supabase client (baked into bundle at build time) |
| `VITE_SUPABASE_ANON_KEY` | GitHub Actions secret | Supabase client (baked into bundle at build time) |
| `ANTHROPIC_API_KEY` | Azure SWA app settings only | Azure Function — server-side, never in browser |

> **Important:** `VITE_*` vars are injected via the `env:` block on the **"Build app"** GitHub Actions step (not the Azure SWA deploy step). Azure app settings are runtime-only and never reach the Vite build. Do NOT rely on passing them to the Azure SWA action — Oryx strips them before spawning Vite.

## Muscle ID system (17 total)
```
chest, shoulders_front, shoulders_side, biceps, forearms, abs, obliques, quads, calves
traps, rear_delts, lats, triceps, lower_back, glutes, hamstrings, calves_back
```
Each has a `view` (front/back) and Norwegian `label` in the `MUSCLES` object in MuscleMap.jsx.

## Current state (implemented and live)
- Image upload (drag & drop, file picker, camera, multi-image)
- Claude Vision analysis → structured JSON with exercise + muscle IDs
- Confirm step (toggle, edit, adjust sets/reps, add manually)
- Muscle map display (SVG front+back, glow highlights, hover tooltips)
- Next-session recommendation via Claude API
- Supabase schema: `sessions`, `exercises`, `muscle_activations` tables
- Session persistence — completed workouts saved to Supabase
- Azure Function proxy for Anthropic API — API key is server-side only
- Live deploy on Azure SWA with GitHub Actions CI/CD
- Magic link login verified working on Azure domain
- Supabase Auth redirect URLs updated to include Azure domain

## What is NOT yet built
- **Session save working end-to-end** — fix deployed (issue #9), pending live verification
- **History view** — past sessions with muscle maps (GitHub issue #2)
- **Period/volume report** — aggregate muscle coverage + undertrained muscles (GitHub issue #3)
- **Favicon** — replace default Vite icon with camera SVG in accent colour (queued)
- **Page title** — change from "app" to "Workout Lens" (queued)

## Exercise data model
```typescript
{
  id: number,
  name: string,          // exact name from whiteboard / user-edited
  standardName: string,  // normalised name
  sets: string | null,   // defaults to "1" if not written on board
  reps: string | null,
  primary: string[],     // muscle IDs returned by Claude
  secondary: string[],   // muscle IDs returned by Claude
  enabled: boolean       // toggled in confirm step
}
```

## Key architecture decisions
- Claude returns muscle IDs directly in JSON — local keyword matching (EX_DB) was abandoned because Norwegian abbreviations and whiteboard variants didn't match reliably. EX_DB is kept only as fallback for manually added exercises.
- SVG body is simplified geometry (viewBox `0 0 160 360`), not anatomically precise — good enough for PoC, could be replaced with a proper anatomical SVG later.
- Supabase Auth uses magic links (`emailRedirectTo: window.location.origin`)
- Anthropic API calls go through `app/api/claude.js` — Azure Function v4 model, browser hits `/api/claude`
- **CI/CD build split:** the frontend is pre-built in the GitHub Actions runner (`npm ci && npm run build` with `VITE_*` in `env:`), then the Azure SWA action uploads `app/dist/` directly (`app_location: "app/dist"`). This bypasses Oryx for the frontend — Oryx strips `VITE_*` env vars before spawning Vite and they never reach the bundle. Oryx still handles the API (`app/api`). `vite.config.js` has a build-time assertion that fails immediately if the required vars are missing.

## Known limitations
- SVG body is geometrically simplified, not anatomically precise
- Volume (sets × reps) is logged but not used in muscle analysis
- Recommendations are contextual per session, not based on accumulated history (will improve with data)
- No error handling for API rate limits

## Azure deploy notes
- **Live URL:** `https://white-island-090dfd003.7.azurestaticapps.net`
- **Resource group:** `rg-muskelkart` (West Europe)
- **Azure resource name:** `muskelkart`
- Build triggered on every push to `master`
- App settings (runtime): `ANTHROPIC_API_KEY`
- GitHub secrets (build-time): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `AZURE_STATIC_WEB_APPS_API_TOKEN_WHITE_ISLAND_090DFD003`
- Supabase Auth redirect URLs: localhost + Azure domain registered
- Netlify site is locked (no longer deploys on push)
- **CI/CD pipeline:** frontend built in runner → `app/dist/` uploaded via `app_location: "app/dist"`, `output_location: "."`. API built by Oryx from `app/api`. Do NOT move the frontend build back into Oryx — see Key architecture decisions.

## GitHub issues
| # | Title | Status |
|---|---|---|
| #2 | History view | Open |
| #3 | Period/volume report | Open |
| #6 | Dev/prod pipeline (CI/CD) | Largely covered by Azure SWA — review/close |
| #7 | Move to Azure (replace Netlify) | In progress — API function fix pending |
