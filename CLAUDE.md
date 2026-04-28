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
| `VITE_SUPABASE_URL` | GitHub Actions secret + Azure SWA app settings | Supabase client (build-time, baked in by Vite) |
| `VITE_SUPABASE_ANON_KEY` | GitHub Actions secret + Azure SWA app settings | Supabase client (build-time, baked in by Vite) |
| `ANTHROPIC_API_KEY` | Azure SWA app settings only | Azure Function — server-side, never in browser |

> **Important:** `VITE_*` vars must be in **GitHub Actions secrets** (not just Azure app settings) because Vite bakes them into the bundle at build time. Azure app settings are runtime-only and only reach the API function.

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
- **Azure API function working end-to-end** — fix deployed (v4 model rewrite), pending verification
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
- `VITE_*` env vars injected at build time via GitHub Actions secrets; Azure app settings cover runtime API vars only

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
- App settings (runtime): `ANTHROPIC_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- GitHub secrets (build-time): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `AZURE_STATIC_WEB_APPS_API_TOKEN_WHITE_ISLAND_090DFD003`
- Supabase Auth redirect URLs: Netlify + localhost + Azure domain all registered
- Netlify site is locked (no longer deploys on push)

## GitHub issues
| # | Title | Status |
|---|---|---|
| #2 | History view | Open |
| #3 | Period/volume report | Open |
| #6 | Dev/prod pipeline (CI/CD) | Largely covered by Azure SWA — review/close |
| #7 | Move to Azure (replace Netlify) | In progress — API function fix pending |
