# Workout Lens

Photograph a handwritten gym whiteboard workout, and the app tells you which muscles you trained, visualises them on a body map, and recommends what to train next.

## How it works

1. **Upload** one or more photos of a whiteboard workout program — or **pick a template** from the library
2. **Claude Vision** reads the handwriting and returns a structured list of exercises with muscle IDs
3. **Confirm** — pick the session date (defaults to today), link to a gym class, toggle/rename exercises before saving
4. **Muscle map** — front and back body SVG; primary muscles glow solid green, secondary muscles show as blue diagonal stripes; hover for exercise names
5. **Recommendations** — ask Claude what to train next based on untrained muscle groups
6. **Save** — session is persisted to Supabase with full exercise and muscle activation data
7. **History** — custom month grid calendar with heat colors per day (darker = more exercises); click a day to see that session's muscle map and exercise list; sessions are always editable when expanded — a Save / Discard bar appears automatically when changes are detected; add exercises with library autocomplete and AI muscle inference; upload a new photo at any time to re-analyse
8. **Sett sammen gruppetimer** — shared gym-wide exercise library and session templates: any co-instructor can create, edit, or delete exercises and templates; AI muscle inference fires when you type an exercise name; creator attribution ("Av [name]") shown on items created by colleagues
9. **Weekly planner** — assign templates to each day of the week; an "Ikke trent denne uken" chip row lists the muscles you have not yet trained in logged sessions for the visible ISO week (History-style mono pills); a live "Projisert dekning" heatmap body map shows projected cumulative muscle coverage from the assigned templates; a Forslag card flags muscle groups with no planned coverage; plan is saved to Supabase and reloaded on next visit
10. **Language** — switch between Norsk, English and فارسی (RTL) at any time from Settings; all UI strings, date formats, and month names update instantly
11. **Settings** — language selector (top), theme toggle (dark/light) + nav hints toggle with live body map preview, contact, Om appen section (version + "Vis introduksjonsguide" replay button + changelog accordion), and account section: display name input + sign-out (bottom)
12. **First-login intro guide** — a 5-slide modal appears automatically on first login (gated by `localStorage` key `wl-intro-seen`); walks through Upload → History → Report → Planner → Library; skippable and replayable from Settings
13. **Joint class history** — when a gym-linked session is expanded in History, a "Kolleger i denne klassen" panel shows co-instructor sessions for the same class slot (display name + exercise list). All sessions are always visible to co-instructors at the same gym — this cross-instructor transparency is the core value of the shared view
14. **Report instructor filter** — when sessions from multiple co-instructors appear in the selected period, a fourth filter row with instructor name chips appears on the Report page; default is all instructors visible; display names are auto-set to the email prefix on first login so the filter always shows a meaningful label
14. **Polished dark/light theme** — IBM Carbon g100 (dark) and g10 (light) themes with no flash-of-unstyled-content on page load or view navigation; theme persists across sessions and respects `prefers-color-scheme` on first visit

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

Run the test suite from `app/`:

```bash
npm test           # one-shot
npm run test:ci    # one-shot with v8 coverage
npm run test:watch # watch mode
```

Tests live next to the modules they cover under `app/src/lib/__tests__/` and `app/api/__tests__/`. The suite is intentionally pure-logic — reducers, date helpers, validators, prompt builders, the Claude/JWT proxy guards — so it runs in milliseconds and needs no DOM or live Supabase.

Add the following to Supabase **Authentication → URL Configuration → Additional redirect URLs**:

| URL | Purpose |
|---|---|
| `http://localhost:4280` | Local dev (SWA emulator) |
| `https://<your-swa-subdomain>-*.westeurope.7.azurestaticapps.net` | Azure SWA PR previews (wildcard covers all PR numbers) |

The app uses `emailRedirectTo: window.location.origin` so magic-link emails automatically point back to whichever environment the login was initiated from.

### Running

```powershell
.\dev.ps1
```

`dev.ps1` is gitignored. It pins to Node 22 via `fnm`, opens Vite in a separate window, waits 3 s, then starts the SWA emulator.

Open **http://localhost:4280** —  The API routes (`/api/claude`, `/api/sporty-sync`) are only available through the SWA proxy at port 4280.

## Project structure

```
app/
  src/
    main.jsx                       # Entry — imports Carbon + app CSS, wraps with ThemeProvider
    App.jsx                        # Auth gate + view router (logger, history, report, sett-sammen,
                                   #   template-picker, template-editor, settings, planlegger)
    theme.jsx                      # ThemeProvider + useTheme hook (g10 ↔ g100 toggle)
    components/
      Login.jsx                    # Magic-link email login
      MuscleMap.jsx                # Logger — upload/template-preload, analyse, confirm, visualise
      History.jsx                  # History — custom month grid calendar + session detail + edit mode
      Report.jsx                   # Period report — heatmap body map + muscle coverage stats
      ExerciseRow.jsx              # Shared editable exercise row (checkbox, name, delete)
      ExerciseRowWithAutocomplete.jsx # ExerciseRow wrapper with library autocomplete dropdown (History edit only)
      BodyPanel.jsx                # Shared front/back body map with mobile toggle (used in 3 views)
      MusclePicker.jsx             # Click-to-toggle body map for assigning muscles to exercises
      ExerciseForm.jsx             # Create/edit a library exercise with MusclePicker
      LibraryPicker.jsx            # Searchable exercise picker for adding library exercises to templates
      TemplatePicker.jsx           # Template selection screen (recently used first)
      TemplateSessionEditor.jsx    # Edit/use a template with live body map; save-back or hand off to logger
      Planlegger.jsx               # Weekly training planner — untrained-this-week chip list + projected heatmap, assign templates
      Settings.jsx                 # Settings view — theme toggle, account, changelog, contact
      PageShell.jsx                # Shared nav shell (6-icon header with 2-line labels: Logg økt / historikken / perioden / uka / gruppetimer / appen)
      Home.jsx                     # Landing page — last session summary + quick-nav
      ErrorBoundary.jsx            # Catches render errors and shows a reload prompt
    lib/
      supabase.js                  # Supabase client
      db.js                        # DB helpers: sessions, exercises, muscle_activations, gym_calendar,
                                   #   exercise_library, session_templates, session_template_exercises,
                                   #   week_plans, week_plan_days
      bodymap.jsx                  # Shared: MUSCLES, SHAPES, BodySVG, HeatmapBodySVG (onHover/hovered), calcMuscles, useIsMobile
      utils.js                     # toBase64, getMediaType, buildMuscleMap*, isInvalidNum, callClaude, extractMuscles,
                                   #   toWeekIso, weekIsoToMonday, getIntlLocale, inferMusclesFromName
      prompts.js                   # Claude model IDs + prompt builders
      i18n.js                      # i18next init — nb/en/fa resources, fallbackLng, RTL direction wiring
    styles/
      carbon-tokens.css            # IBM Carbon CSS variables (g10 + g100) + IBM Plex @font-face
      app.css                      # Global resets and Carbon overrides
  public/
    locales/
      nb/translation.json          # Norwegian strings (default)
      en/translation.json          # English strings
      fa/translation.json          # Persian strings (RTL)
    staticwebapp.config.json       # Azure SWA routing config
  api/
    index.js                       # Entry point — imports all Azure Functions
    claude.js                      # Azure Function — proxies requests to Anthropic API
    sportySync.js                  # Azure Function — HTTP triggers for sporty.no sync (driven by GitHub Actions cron; SWA managed functions can't run timers)
    sportyUtils.js                 # Pure utility — normalizeName() (no Azure SDK dep; unit-tested)
    host.json                      # Azure Functions runtime config
    package.json                   # API dependencies
```

## Branch strategy

| Branch | Purpose |
|---|---|
| `master` | Production — auto-deploys to Azure SWA on every push |
| `dev` | Pre-merge integration — deploys to the same production slot as `master`; use sparingly |
| Feature branches | PR against `master` or `dev`; Azure SWA creates an isolated preview URL per open PR |

## Issue format

All GitHub issues follow a consistent user-story structure:

**Title:** `As a [user/developer] I want to [action] so I can [benefit]`

**Body sections:**

| Section | Required | Notes |
|---|---|---|
| `## Summary` | Always | One paragraph — problem and goal |
| `## Priority` | Developer/infra issues | High / Medium / Low |
| `## UI spec (Carbon g100)` | UI changes | Bullet-point spec; Carbon hard rules apply |
| `## Data model` | DB changes | SQL schema for new/changed tables |
| `## Acceptance criteria` | Always | GitHub task-list checkboxes (`- [ ]`) |
| `## Out of scope` | Larger issues | Explicit exclusions to prevent scope creep |

## Deployment

Hosted on **Azure Static Web Apps** — every push to `master` triggers a build and deploy via GitHub Actions.

Live URL: `https://workout.umulig.org`

### Scheduled sporty.no sync

Azure SWA managed functions run **HTTP triggers only** — Azure Functions timer/cron triggers are silently ignored ([docs](https://learn.microsoft.com/azure/static-web-apps/apis-functions#constraints)). The sporty.no calendar sync is therefore driven by a GitHub Actions cron workflow (`.github/workflows/sporty-sync.yml`) that `POST`s to `/api/sporty-sync` at 04:00, 11:00, 14:00 and 22:00 UTC with a 7-day self-healing lookback. It authenticates with the `SPORTY_SYNC_API_KEY` secret. Run it on demand via **Actions → Sporty sync → Run workflow**.

### Required secrets (GitHub Actions)

| Secret | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Injected into frontend bundle via `env:` block on the build step |
| `VITE_SUPABASE_ANON_KEY` | Injected into frontend bundle via `env:` block on the build step |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_<YOUR_SWA_NAME>` | Azure deploy token (the exact name is generated by Azure when you create the SWA resource; find it in the deployment workflow Azure downloads to your repo) |
| `SPORTY_SYNC_URL` | Full sync endpoint URL (e.g. `https://workout.umulig.org/api/sporty-sync`) — used by the `Sporty sync` cron workflow |
| `SPORTY_SYNC_API_KEY` | Machine auth for the `Sporty sync` cron workflow — must match the `SPORTY_SYNC_API_KEY` Azure app setting |

### Required app settings (Azure SWA)

| Setting | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Used by the Claude proxy function — never exposed to browser |
| `SUPABASE_URL` | Used by the Claude proxy (JWT verification) and sporty.no sync function |
| `VITE_SUPABASE_ANON_KEY` | Used by the Claude proxy to verify Supabase JWTs — same value as the GitHub Actions secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Used by the sporty.no sync function (bypasses RLS — sync has no auth user) |
| `SPORTY_SYNC_API_KEY` | Required `X-Api-Key` header for `GET /api/sporty-health` (monitoring) **and** the scheduled `POST /api/sporty-sync` (GitHub Actions cron). `POST /api/sporty-sync` also accepts a Supabase JWT (`X-Supabase-Token`) for manual kicks from a signed-in user. |

> **Note:** The frontend is built in the GitHub Actions runner (not by Oryx inside Azure SWA's Docker container). Oryx strips `VITE_*` env vars before spawning Vite, so they would never reach the bundle if built there. The workflow pre-builds `app/dist/` and the Azure SWA action uploads it directly via `app_location: "app/dist"`. Do not revert this.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, branch conventions, and how to submit a pull request.

## Backlog

Open work is tracked in [GitHub Issues](https://github.com/ChristopherRotnes/BodyMapTraining/issues).

## License

MIT — see [LICENSE](LICENSE).

IBM Plex fonts are licensed under the SIL Open Font License 1.1 — see [`app/public/fonts/LICENSE.txt`](app/public/fonts/LICENSE.txt).
