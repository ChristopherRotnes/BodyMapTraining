# Workout Lens

Photograph a handwritten gym whiteboard workout, and the app tells you which muscles you trained, visualises them on a body map, and recommends what to train next.

## How it works

1. **Upload** one or more photos of a whiteboard workout program
2. **Claude Vision** reads the handwriting and returns a structured list of exercises with muscle IDs
3. **Confirm** — pick the session date (defaults to today), link to a gym class, toggle/rename/adjust exercises before saving
4. **Muscle map** — front and back body SVG; primary muscles glow solid green, secondary muscles show as blue diagonal stripes; hover for exercise names
5. **Recommendations** — ask Claude what to train next based on untrained muscle groups
6. **Save** — session is persisted to Supabase with full exercise and muscle activation data
7. **History** — two-month calendar view with trained dates highlighted; click a date to see that session's muscle map and exercise list; edit or re-analyse any saved session

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite, react-day-picker |
| Design system | IBM Carbon Design System |
| Auth | Supabase Auth (magic link) |
| Database | Supabase (Postgres) |
| AI | Anthropic Claude API (proxied via Azure Function) |
| Hosting | Azure Static Web Apps |
| CI/CD | GitHub Actions — push to `master` → auto-deploy |

## Local development

### One-time setup

```bash
npm install -g @azure/static-web-apps-cli
cp app/.env.local.example app/.env.local                             # fill in Supabase credentials
cp app/api/local.settings.json.example app/api/local.settings.json  # fill in ANTHROPIC_API_KEY
cd app && npm install
cd api && npm install
```

Add `http://localhost:4280` to your Supabase project's allowed redirect URLs (Authentication → URL Configuration).

### Running

```powershell
.\dev.ps1
```

`dev.ps1` is gitignored. It switches to Node 20 via `fnm` (Azure Functions Core Tools v4 requires Node ≤ 20; the system default v24 breaks it), opens Vite in a separate window, waits 3 s, then starts the SWA emulator.

Open **http://localhost:4280** — not 5173. The API routes (`/api/claude`, `/api/sporty-sync`) are only available through the SWA proxy at port 4280.

## Project structure

```
app/
  src/
    main.jsx                 # Entry — imports Carbon + app CSS, wraps with ThemeProvider
    App.jsx                  # Auth gate → Login, MuscleMap, or History
    theme.jsx                # ThemeProvider + useTheme hook (g10 ↔ g100 toggle)
    components/
      Login.jsx              # Magic-link email login
      MuscleMap.jsx          # Logger — upload, analyse, confirm (date picker + gym selector), visualise
      History.jsx            # History — two-month calendar + session detail + edit mode
    lib/
      supabase.js            # Supabase client
      db.js                  # DB helpers: sessions, exercises, muscle_activations, gym_calendar;
                             #   fetchGymSessionsByDate, saveSession, updateSession
      bodymap.jsx            # Shared: MUSCLES, SHAPES, BodySVG, HeatmapBodySVG, calcMuscles, useIsMobile
    styles/
      carbon-tokens.css      # IBM Carbon CSS variables (g10 + g100) + IBM Plex @font-face
      app.css                # Global resets and Carbon overrides
  api/
    index.js                 # Entry point — imports all Azure Functions
    claude.js                # Azure Function — proxies requests to Anthropic API
    sportySync.js            # Azure Function — timer (04:00+11:00 UTC) + HTTP trigger for sporty.no sync
    host.json                # Azure Functions runtime config
    package.json             # API dependencies
  staticwebapp.config.json   # Azure SWA routing config
```

## Branch strategy

| Branch | Purpose |
|---|---|
| `master` | Production — auto-deploys to Azure SWA on every push |
| `dev` | Staging — Azure SWA creates a preview URL on push |
| Feature branches | PR against `dev`; Azure SWA creates a preview per PR |

## Deployment

Hosted on **Azure Static Web Apps** — every push to `master` triggers a build and deploy via GitHub Actions.

Live URL: `https://white-island-090dfd003.7.azurestaticapps.net`

### Required secrets (GitHub Actions)

| Secret | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Injected into frontend bundle via `env:` block on the build step |
| `VITE_SUPABASE_ANON_KEY` | Injected into frontend bundle via `env:` block on the build step |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_WHITE_ISLAND_090DFD003` | Azure deploy token |

### Required app settings (Azure SWA)

| Setting | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Used by the Claude proxy function — never exposed to browser |
| `SUPABASE_URL` | Used by the sporty.no sync function to upsert gym_calendar rows |
| `SUPABASE_SERVICE_ROLE_KEY` | Used by the sporty.no sync function (bypasses RLS — timer has no auth user) |

> **Note:** The frontend is built in the GitHub Actions runner (not by Oryx inside Azure SWA's Docker container). Oryx strips `VITE_*` env vars before spawning Vite, so they would never reach the bundle if built there. The workflow pre-builds `app/dist/` and the Azure SWA action uploads it directly via `app_location: "app/dist"`. Do not revert this.

## Status

| Feature | Status |
|---|---|
| Image upload (drag & drop, multi-image, camera) | ✅ |
| Claude Vision analysis | ✅ |
| Exercise confirm + edit step | ✅ |
| Checkbox/exercise inline layout in confirm step | ✅ Fixed (#11) |
| Muscle map SVG with tooltips | ✅ |
| Magic link login | ✅ |
| Next-session recommendations | ✅ |
| Session persistence (Supabase) | ✅ |
| Session save end-to-end | ✅ Fixed (#9) |
| IBM Carbon Design System | ✅ Done (#8) |
| Local dev + branch CI/CD | ✅ Done (#6) |
| Workout history view | ✅ Done (#2) |
| Sporty.no gym calendar sync + session picker | ✅ Done (#12) |
| Bodymap layout and graphics improvements | ✅ Done (#10) |
| Shoulder shape separation (correct hover hit targets) | 🔧 In verification (#18) |
| Period / volume report | ✅ Done (#3) |
| Duplicate session prevention (unique constraint per class) | ✅ Done (#13) |
| Past-date logging + edit existing sessions | ✅ Done (#19) |
| Shared lib: utils.js + prompts.js (model constants, prompts, utilities) | ✅ Done (#24 #25 #27) |

## Backlog

| PR group | Issues | Priority |
|---|---|---|
| B — Error resilience (JSON.parse + ErrorBoundary) | #23 #29 | High |
| C — Backend security (sportySync API key) | #26 | High |
| D — Unit tests | #28 | High |
| E — History improvements (muscle filter, skeleton loading) | #31 #34 | Low |
| F — Input & display polish (volume, date format, form validation) | #32 #33 #35 | Low |
| G — Image storage | #30 | Low |
