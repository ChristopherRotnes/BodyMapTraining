# Changelog

All notable changes to Workout Lens are documented here.

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
