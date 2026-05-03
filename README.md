# Workout Lens

Photograph a handwritten gym whiteboard workout, and the app tells you which muscles you trained, visualises them on a body map, and recommends what to train next.

## How it works

1. **Upload** one or more photos of a whiteboard workout program — or **pick a template** from the library
2. **Claude Vision** reads the handwriting and returns a structured list of exercises with muscle IDs
3. **Confirm** — pick the session date (defaults to today), link to a gym class, toggle/rename/adjust exercises before saving
4. **Muscle map** — front and back body SVG; primary muscles glow solid green, secondary muscles show as blue diagonal stripes; hover for exercise names
5. **Recommendations** — ask Claude what to train next based on untrained muscle groups
6. **Save** — session is persisted to Supabase with full exercise and muscle activation data
7. **History** — custom month grid calendar with heat colors per day (darker = more exercises); click a day to see that session's muscle map and exercise list; edit or re-analyse any saved session; edit mode supports library autocomplete — type an exercise name to get suggestions from your library
8. **Library** — build a named exercise library with click-to-toggle muscle selection; create session templates (e.g. "CrossFit - Anna - mandag") as reusable collections of library exercises

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite |
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
cp app/api/local.settings.json.example app/api/local.settings.json  # fill in ANTHROPIC_API_KEY, SUPABASE_URL, VITE_SUPABASE_ANON_KEY
cd app && npm install
cd api && npm install
```

`app/.env.test` is committed with placeholder values — no setup needed. It lets the Vitest test runner import `supabase.js` without crashing (unit tests make no real Supabase calls).

Add `http://localhost:4280` to your Supabase project's allowed redirect URLs (Authentication → URL Configuration).

### Running

```powershell
.\dev.ps1
```

`dev.ps1` is gitignored. It switches to Node 20 via `fnm` (Azure Functions Core Tools v4 requires Node ≤ 20; the system default v24 breaks it), opens Vite in a separate window, waits 3 s, then starts the SWA emulator.

Open **http://localhost:4280** —  The API routes (`/api/claude`, `/api/sporty-sync`) are only available through the SWA proxy at port 4280.

## Project structure

```
app/
  src/
    main.jsx                       # Entry — imports Carbon + app CSS, wraps with ThemeProvider
    App.jsx                        # Auth gate + view router (logger, history, report, bibliotek,
                                   #   template-picker, template-editor)
    theme.jsx                      # ThemeProvider + useTheme hook (g10 ↔ g100 toggle)
    components/
      Login.jsx                    # Magic-link email login
      MuscleMap.jsx                # Logger — upload/template-preload, analyse, confirm, visualise
      History.jsx                  # History — custom month grid calendar + session detail + edit mode
      Report.jsx                   # Period report — heatmap body map + muscle coverage stats
      ExerciseRow.jsx              # Shared editable exercise row (checkbox, name, sets, reps, delete)
      ExerciseRowWithAutocomplete.jsx # ExerciseRow wrapper with library autocomplete dropdown (History edit only)
      BodyPanel.jsx                # Shared front/back body map with mobile toggle (used in 3 views)
      MusclePicker.jsx             # Click-to-toggle body map for assigning muscles to exercises
      ExerciseForm.jsx             # Create/edit a library exercise with MusclePicker
      LibraryPicker.jsx            # Searchable exercise picker for adding library exercises to templates
      Bibliotek.jsx                # Library page — exercise library CRUD + template CRUD (two tabs)
      TemplatePicker.jsx           # Template selection screen (recently used first)
      TemplateSessionEditor.jsx    # Edit/use a template with live body map; save-back or hand off to logger
      PageShell.jsx                # Shared nav shell (header, nav buttons, theme toggle, logout)
      Home.jsx                     # Landing page — last session summary + quick-nav
      ErrorBoundary.jsx            # Catches render errors and shows a reload prompt
    lib/
      supabase.js                  # Supabase client
      db.js                        # DB helpers: sessions, exercises, muscle_activations, gym_calendar,
                                   #   exercise_library, session_templates, session_template_exercises
      bodymap.jsx                  # Shared: MUSCLES, SHAPES, BodySVG, HeatmapBodySVG (onHover/hovered), calcMuscles, useIsMobile
      utils.js                     # toBase64, getMediaType, buildMuscleMap*, isInvalidNum, callClaude, extractMuscles
      prompts.js                   # Claude model IDs + prompt builders
    styles/
      carbon-tokens.css            # IBM Carbon CSS variables (g10 + g100) + IBM Plex @font-face
      app.css                      # Global resets and Carbon overrides
  api/
    index.js                       # Entry point — imports all Azure Functions
    claude.js                      # Azure Function — proxies requests to Anthropic API
    sportySync.js                  # Azure Function — timer (04:00+11:00 UTC) + HTTP trigger for sporty.no sync
    host.json                      # Azure Functions runtime config
    package.json                   # API dependencies
  staticwebapp.config.json         # Azure SWA routing config
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
| `SUPABASE_URL` | Used by the Claude proxy (JWT verification) and sporty.no sync function |
| `VITE_SUPABASE_ANON_KEY` | Used by the Claude proxy to verify Supabase JWTs — same value as the GitHub Actions secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Used by the sporty.no sync function (bypasses RLS — timer has no auth user) |
| `SPORTY_SYNC_API_KEY` | Required `x-api-key` header value for `POST /api/sporty-sync` — any secret string; endpoint returns 401 without it |

> **Note:** The frontend is built in the GitHub Actions runner (not by Oryx inside Azure SWA's Docker container). Oryx strips `VITE_*` env vars before spawning Vite, so they would never reach the bundle if built there. The workflow pre-builds `app/dist/` and the Azure SWA action uploads it directly via `app_location: "app/dist"`. Do not revert this.

## Status

| Feature | Status |
|---|---|
| Image upload (drag & drop, multi-image, camera) | ✅ |
| Claude Vision analysis | ✅ |
| Exercise confirm + edit step | ✅ |
| Muscle map SVG with tooltips | ✅ |
| Magic link login | ✅ |
| Next-session recommendations | ✅ |
| Session persistence (Supabase) | ✅ |
| IBM Carbon Design System | ✅ Done (#8) |
| Local dev + branch CI/CD | ✅ Done (#6) |
| Workout history view | ✅ Done (#2) |
| Sporty.no gym calendar sync + session picker | ✅ Done (#12) |
| Bodymap layout and graphics improvements | ✅ Done (#10) |
| Period / volume report | ✅ Done (#3) |
| Duplicate session prevention | ✅ Done (#13) |
| Past-date logging + edit existing sessions | ✅ Done (#19) |
| Shared lib (utils, prompts, model constants) | ✅ Done (#24 #25 #27) |
| Backend security (sportySync API key) | ✅ Done (#26) |
| Unit tests (Vitest) | ✅ Done (#28) |
| History muscle filter + skeleton loading | ✅ Done (#31 #34) |
| Input & display polish (volume, date format, validation) | ✅ Done (#32 #33 #35 #36) |
| Exercise library + session templates | ✅ Done (#38) |
| Error resilience (JSON.parse try-catch + ErrorBoundary) | ✅ Done (#23 #29) |
| API authentication (Supabase JWT on Claude proxy) | ✅ Done |
| Code refactor (useReducer, shared BodyPanel, batch DB inserts) | ✅ Done |
| Carbon g100 redesign — all views (#40–#48) | ✅ Done (#40) |
| Library autocomplete in History edit mode | ✅ Done (#51) |
| Weekly strip navigation (Home → History) | ✅ Done (#53) |

## Backlog

| Issue(s) | Description | Priority |
|---|---|---|
| #41 | Keep app on latest tech stack | High |
| #30 | Image storage — Supabase Storage for whiteboard photos | Low |
