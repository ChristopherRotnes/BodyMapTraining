# Changelog

All notable changes to Workout Lens are documented here.

## [1.0.0] — 2026-05-03

First stable release. Core product is fully functional: photograph a gym whiteboard, get a muscle map, track history, plan sessions.

### Features

**Workout logging**
- Photograph a handwritten gym program (sporty.no whiteboard format) — Claude Vision parses exercises, sets, and reps
- Confirm step: toggle exercises on/off, edit names and sets/reps, set session date
- Muscle map rendered on a front/back body SVG with primary (green) and secondary (blue hatch) highlights
- Next-session recommendations based on what was and wasn't trained

**Body map**
- Anatomical SVG silhouette (viewBox 160×360) with 17 named muscle groups
- Front/back toggle on mobile; side-by-side on desktop
- Interactive hover tooltips; heatmap view for history and reports
- Muscle picker component for manual muscle selection in library exercises

**Training history**
- Monthly calendar grid with heat-fill indicating session volume
- Session detail view with exercise list; edit mode with inline name editing, sets/reps, re-analyse, add/delete exercises
- Autocomplete from exercise library when adding new exercises in edit mode

**Period report**
- Heatmap body map showing aggregate muscle coverage over a selectable period
- KPI tiles per muscle group; hover detail card with last trained date
- Period-based AI recommendation calling Claude for untrained muscles

**Exercise library + session templates**
- Save named exercises with default sets/reps and a muscle map
- Build named session templates from library exercises
- "Bruk økt" flow: pick a template, edit exercises, log directly to confirm step

**Sporty.no integration**
- Daily sync of gym class schedule into `gym_calendar` (timer trigger 04:00 + 11:00 UTC)
- Session confirm step links logged session to a gym class entry
- Home page displays today's gym classes

**Home page**
- Last session hero card with gym class identity
- 7-day weekly strip with heat colors; tap a day to jump to that date in history

### Design system

Fully migrated to IBM Carbon Design System (g100 dark / g10 light) with local IBM Plex fonts. No Google Fonts, no CDN dependencies. Theme toggle persists to localStorage and respects `prefers-color-scheme`.

### Infrastructure

- React 19 + Vite frontend on Azure Static Web Apps — [workout.umulig.org](https://workout.umulig.org)
- Supabase (magic-link auth + PostgreSQL with RLS)
- Claude API proxied via Azure Function (Vision for image analysis, Sonnet for recommendations)
- GitHub Actions CI/CD: push to `master` → auto-deploy
