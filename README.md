# Workout Lens

Photograph a handwritten gym whiteboard workout, and the app tells you which muscles you trained, visualises them on a body map, and recommends what to train next.

## How it works

1. **Upload** one or more photos of a whiteboard workout program
2. **Claude Vision** reads the handwriting and returns a structured list of exercises with muscle IDs
3. **Confirm** — toggle, rename, or adjust sets/reps before saving
4. **Muscle map** — front and back body SVG with glow highlights (green = primary, blue = secondary)
5. **Recommendations** — ask Claude what to train next based on untrained muscle groups
6. **Save** — session is persisted to Supabase with full exercise and muscle activation data

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite |
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

```bash
# Terminal 1
cd app && npm run dev

# Terminal 2 (once Vite is ready)
swa start
```

Open **http://localhost:4280** — not 5173. The API is only available through the SWA proxy.

## Project structure

```
app/
  src/
    main.jsx                 # Entry — imports Carbon + app CSS, wraps with ThemeProvider
    App.jsx                  # Auth gate → Login or MuscleMap
    theme.jsx                # ThemeProvider + useTheme hook (g10 ↔ g100 toggle)
    components/
      Login.jsx              # Magic-link email login
      MuscleMap.jsx          # Main component — upload, analyse, confirm, visualise
      ThemeToggle.jsx        # Standalone light/dark toggle
    lib/
      supabase.js            # Supabase client
      db.js                  # DB helpers (sessions, exercises, muscle_activations)
    styles/
      carbon-tokens.css      # IBM Carbon CSS variables (g10 + g100) + IBM Plex @font-face
      app.css                # Global resets and Carbon overrides
  api/
    claude.js                # Azure Function — proxies requests to Anthropic API
    host.json                # Azure Functions runtime config
    package.json             # API dependencies
  staticwebapp.config.json   # Azure SWA routing config
```

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
| `ANTHROPIC_API_KEY` | Used by the Azure Function at runtime — never exposed to browser |

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
| Session save end-to-end | ✅ (fixed #9) |
| Workout history view | 🔧 Planned (#2) |
| Period / volume report | 🔧 Planned (#3) |
| IBM Carbon Design System | ✅ Done (#8) |
| Local dev + branch CI/CD | ✅ Done (#6) |
