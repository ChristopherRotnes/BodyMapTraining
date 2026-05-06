# Changelog

All notable changes to Workout Lens are documented here.

## [1.2.0-rc.3] — 2026-05-06

### Fixed
- **Planlegger save feedback** — "Lagre plan" button now cycles through a spinner then a green checkmark ("Plan lagret") for 2.5 s after a successful save, so users know the plan was stored (#142)

---

## [1.2.0-rc.2] — 2026-05-06

### Added
- **AI muscle inference for manual exercises** — when a user types an exercise name and blurs the field (including tabbing to sets/reps), the app fires a Claude Sonnet text call to infer primary and secondary muscles automatically. Works in both History edit mode (adding new exercises) and the library exercise form (Bibliotek). Shows a spinner while the call is in flight, a brief checkmark flourish on success, then a static "Muskler satt av AI – verifiser" label. Silent failure if the API is unavailable or the name is unrecognised (#130)
- **No-muscles warning in library form** — if the name field is filled but no muscles are selected (and inference returned nothing), a red warning prompts the user to click the body figure to register muscles manually (#130)

### Fixed
- Tabbing from the exercise name field to sets/reps now correctly triggers muscle inference (previously only clicking outside the entire row did so) (#130)
- `callClaude()` response body was never parsed — `await res.json()` is now called before reading `.content[0].text`; this was silently causing all inference calls to return no muscles (#130)
- `sportySync` timer trigger is now skipped in local dev (SWA CLI only supports HTTP triggers); guarded by `process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Production'`

### Changed
- "Dine byggklosser" typo fixed in Norwegian locale (`byggklosser` → `byggeklosser`)

---

## [1.2.0-rc.1] — 2026-05-05

### Added
- **Weekly training planner** — new `Planlegger` view (calendar icon in nav) lets users assign templates to each day of the week; a live `HeatmapBodySVG` shows projected cumulative muscle coverage; a Forslag card surfaces neglected muscles when ≥2 have no planned coverage; plan is persisted to Supabase (`week_plans` / `week_plan_days` tables with RLS) (#59)
- **Settings view** — dedicated settings screen (gear icon in nav) with theme toggle + live body map preview, account section (email + logout), version/changelog, and a contact section; replaces the old inline theme toggle and logout button in the header (#123)

### Changed
- `EventSchedule` nav icon now navigates to the weekly planner (was a non-interactive placeholder after issue #123)
- Header reduced from a cluttered mix of function + utility icons to 6 clean icons: Camera, History, Report, Library, Planner, Settings — all at 48px on a 390px iPhone (#123)
- `ChangelogModal` moved from `PageShell` inline rendering to the Settings view (#123)
- Version footer button removed from `PageShell` (now shown in Settings → Om appen) (#123)

### Infrastructure
- New Supabase tables: `week_plans` (user_id, week_iso UNIQUE per user) and `week_plan_days` (plan_id FK cascade, day_of_week 1–7, template_id nullable FK); RLS policies restrict to owning user (#59)

---

## [1.1.0-rc.1] — 2026-05-05

First release candidate for beta testing. Builds on 1.0.0 with a full UI redesign and several usability improvements.

### Added
- **Inline save to library from Report** — the `+` button on each recommendation row saves the exercise to your library without navigating away; button becomes a disabled checkmark on success (#113)
- **Full Carbon g100 redesign** — History, Report, Bibliotek, and PageShell rebuilt with WL design tokens, `SectionLabel` / `PageHeading` / `AccentChip` / `StickyCta` components, and consistent filter chip layout (#96)
- **Custom month grid calendar** — replaced `react-day-picker` with a hand-rolled 7-column CSS grid (heat fill, today/selected outlines, month nav) in History (#96)
- **Pill tab strip in Bibliotek** — keyboard-navigable `ArrowLeft`/`ArrowRight` custom tabs replacing Carbon `Tabs`; `Ny øvelse` button positioned to prevent tab-switch layout shift (#96)
- **Contextual History hero** — heading adapts to active filters and selected date; `minHeight: 72` prevents layout shift (#96)
- **Report filter rows** — three separate `flexWrap: wrap` rows (period / weekdays / session types) with border separators; `Nullstill filter` always rendered (opacity-toggled) (#96)

### Changed
- `BodySVG` secondary muscle highlight changed from solid tint to diagonal blue hatch pattern
- `HeatmapBodySVG` now accepts `onHover` / `hovered` props — callers manage the detail card instead of the internal tooltip
- Filter chips always use `flexWrap: wrap`; `overflow-x: auto` removed from chip containers (fixes silent clip on mobile Chromium)

### Infrastructure
- Node engine pinned to 22.x (Node 20 reached EOL April 2026)

---

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
