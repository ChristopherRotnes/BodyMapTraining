# BodyMapTraining — CLAUDE.md

## Remember this if you are an AI
**Verification before closing issue**
All issues must be verified by the developer before you can close them on github. Either on dev, qa or prod (user decides). Regardless of method, AI must wait until user has verified fix to close issues.

**Update docs before every push or PR**
Before pushing to master or opening a PR, update all three of:
1. **`CLAUDE.md`** — architecture decisions, component descriptions, utility exports, known pitfalls
2. **`README.md`** — user-facing feature summary and deployment notes
3. **`CHANGELOG.md`** — add an entry under the current version (or create one) describing what changed and why

**Issue format**
All GitHub issues follow this structure:
- **Title:** `As a [user/developer] I want to [action] so I can [benefit]`
- **`## Summary`** — one paragraph describing the problem and goal
- **`## Priority`** — High / Medium / Low (include for developer/infra issues)
- **`## UI spec (Carbon g100)`** — bullet-point spec for any UI changes (Carbon rules apply)
- **`## Data model`** — SQL schema snippet for any new or changed tables
- **`## Acceptance criteria`** — GitHub task-list checkboxes (`- [ ]`) covering all done conditions
- **`## Out of scope`** — explicit exclusions to prevent scope creep (optional but recommended for larger issues)


## Glossary

Canonical definitions for domain terms. When a term is ambiguous in an issue or conversation, refer here — or ask for clarification before implementing.

### People & roles

| Term | Definition |
|---|---|
| **User** | The person logged into Workout Lens. A gym instructor employed at a sporty.no gym. Maps to `auth.uid()`, `sessions.trainer_id`, `user_id` across all tables. |
| **Trainer** | Avoid this term. It is ambiguous — could mean the app user or the gym class instructor. If someone says "trainer" in an issue or conversation, ask: do you mean the app user, or the instructor who led the class? In code, `trainer_id` is a legacy DB column name that refers to the app user. |
| **Instructor** | The person who *leads* a gym class, sourced from sporty.no. Stored in `gym_calendar.instructor`. Has no account in the app. Example: "Linda Hatlevik." When unqualified, "instructor" always means this — the class leader, not the app user. |
| **Co-instructor** | Another app user registered at the same gym (`sporty_business_unit_id`). Their sessions are cross-readable via RLS. |
| **Display name** | A user's visible name in the app. Stored in `profiles.display_name`. Auto-set to email prefix on first login. |

### Training concepts

| Term | Definition |
|---|---|
| **Session** | One logged workout. One row in `sessions`. Logged by a user (`trainer_id`). Optionally linked to a gym class (`gym_calendar_id`). |
| **Gym class** | A scheduled class from sporty.no. Stored in `gym_calendar`. Has a name, instructor, start/end time. Synced by `sportySync.js`. |
| **Session exercise** | One exercise performed within a session. Stored in `session_exercises`. Has name, sets, reps, and muscle activations. |
| **Library exercise** | A saved, reusable exercise with a standardised name and default muscle map. Stored in `exercise_library`. Can be referenced by templates. |
| **Template** | A named, reusable workout skeleton owned by a user. Stored in `session_templates`. Contains ordered template exercises. |
| **Template exercise** | An exercise slot inside a template. Stored in `session_template_exercises`. Name and muscles are a denormalised snapshot — renaming the library source doesn't affect it. |
| **Week plan** | An assignment of templates to days of a specific ISO week. Stored in `week_plans` + `week_plan_days`. |

### Muscle concepts

| Term | Definition |
|---|---|
| **Muscle ID** | One of 17 fixed string keys (e.g. `chest`, `lats`, `quads`). The canonical identifier used in the DB, prompts, and bodymap. Full list in `MUSCLES` in `bodymap.jsx`. |
| **Primary muscle** | A muscle directly targeted by an exercise. `muscle_activations.activation_type = 'primary'`. Shown as solid green on the body map. |
| **Secondary muscle** | A muscle engaged in a supporting/stabilising role. `activation_type = 'secondary'`. Shown as blue diagonal hatch on the body map. |
| **Muscle activation** | A DB record linking a session exercise to a muscle ID with a type. Stored in `muscle_activations`. |

### System concepts

| Term | Definition |
|---|---|
| **Business unit** | A gym location in sporty.no. Identified by `sporty_business_unit_id` (hardcoded as `8`). Used to scope RLS policies and the sporty sync. |
| **Gym calendar** | The sporty.no schedule mirrored in the `gym_calendar` table. Populated by `sportySync.js` three times daily. |
| **Recommendation** | A Claude-generated exercise suggestion based on untrained muscle gap analysis for a period. Cached in `recommendation_cache` keyed by prompt version + period + muscle coverage. |
| **Period** | A filter duration on the Report page — 7, 30, or 90 days back from today. |
| **View** | Front or back side of the body SVG. Not to be confused with React "views" (the full-page components). |

## Project overview
**Workout Lens** — a workout-logging app. User photographs a handwritten training program from a gym whiteboard (sporty.no format), the app analyses the image via Claude Vision, displays which muscles were trained on a body figure, and gives next-session recommendations.

## Tech stack
- **Frontend:** React 19 + Vite (in `app/`)
- **Design system:** IBM Carbon Design System (`@carbon/react`, `@carbon/icons-react`) — see [Carbon design system](#carbon-design-system) section
- **Auth + DB:** Supabase (magic-link login, Supabase Auth + PostgreSQL)
- **AI:** Anthropic Claude API — proxied via Azure Function (server-side); model IDs managed in `app/src/lib/prompts.js`
- **Hosting:** Azure Static Web Apps — **live at [workout.umulig.org](https://workout.umulig.org)**
- **CI/CD:** GitHub Actions — push to `master` → auto-deploy to Azure SWA
- **i18n:** `react-i18next` — three locales: `nb` (Norwegian, default), `en` (English), `fa` (Persian/RTL); locale files in `app/public/locales/`; singleton in `app/src/lib/i18n.js`; all date/time formatting via `Intl.DateTimeFormat`; `date-fns` has been removed entirely — use `toIsoDate()` and `isoWeekMonday()` from `utils.js` for any new date-string / ISO-week-start needs

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
- `app/src/theme.jsx` — `ThemeProvider` sets `data-theme="g10"` or `data-theme="g100"` on `<html>`, persists to `localStorage`. Default (no saved preference): respects OS `prefers-color-scheme` — dark OS → g100, light OS → g10. This is intentional; the app does not force dark mode on first visit.
- `Login.jsx` → Carbon `TextInput`, `Button`, `InlineNotification`, `Email` icon; `getDailyQuote()` renders a date-aware motivational quote below the subtitle — English only (hardcoded; language preference is unknown before login); keyed by `MM-DD` for special dates (`01-01`, `12-24`), falls back to a per-weekday quote; 13px italic `var(--cds-text-secondary)`
- `MuscleMap.jsx` → Carbon `Header` + `HeaderGlobalBar` (with `RecentlyViewed` history nav, `Book` library nav, light/dark toggle), `ProgressIndicator` (horizontal stepper with step labels), `Button`, `Tag`, `InlineLoading`, `InlineNotification`; dashed-border dropzone on upload step; sticky action bar on confirm step; exercise rows delegated to `ExerciseRow`
- `History.jsx` → `SectionLabel` + `PageHeading` hero (context-aware: default shows month count; filter active + date selected shows "N av total økter den dato"; filter active + no date shows month count with "med disse filtrene"); `PageHeading` has `minHeight: 72` to prevent layout shift; muscle filter chips use `flexWrap: wrap` (all always visible); `borderBottom` separator below chip section; session rows always have 3px left strip (accent when filter-matched); session title in Cond 700; custom `MonthGrid` calendar; expanded sessions are always editable — per-session edit state in a `Map<sessionId, editState>` (no global `editMode` boolean); a dirty-state Save / Discard bar appears when changes are detected; "Legg til øvelse manuelt" (`Add` icon) and "Last opp nytt bilde" (`Camera` icon) rendered as sibling `Button kind="ghost"` on one row below the exercise list; session header chips capped at 2 visible with `+N` overflow span; library exercises pre-fetched on mount (not on first expand) to ensure autocomplete is ready when user adds first exercise to a session with 0 exercises; exercise rows delegated to `ExerciseRowWithAutocomplete`; all date formatting via `Intl.DateTimeFormat` driven by `i18n.language`
- `Bibliotek.jsx` → **RETIRED** (issue #174). Replaced by the SetSammen ecosystem below. File kept in the repo for reference but no longer referenced by `App.jsx`.
- `SetSammen.jsx` → landing page for the «Sett sammen»-tab. Two-column grid of `ActionCard` components. Two-color system: magenta (`--accent`) = gruppetimer, green (`--exercise`) = øvelser. Props: `onShowGruppetimePicker`, `onShowOvelsePicker`.
- `GruppetimePicker.jsx` → lists all templates with live search, mini front-view `BodySVG` thumbnail per row, and a featured magenta «Ny gruppetime» card that expands to a `TextInput` + create form inline. On row click → `onEditTemplate(tpl)`.
- `OvelsePicker.jsx` → lists all library exercises with region filter chips (Alle / Overkropp / Kjerne / Underkropp / Kondisjon; chips with count=0 are hidden except «Alle»), debounced search, and a featured green «Ny øvelse» card. Exercise rows show up to 3 primary muscle names + «BRUKT I N GT» count. Clicking a row opens `ExerciseForm` directly for editing (no intermediate detail screen). Uses `fetchExerciseTemplateCounts()` to batch-load template usage counts on mount.
- `GruppetimeEditor.jsx` → dedicated editor for group-class templates (issue #174, sprint 4). **Separate from `TemplateSessionEditor` — do not merge.** Features: live `BodyPanel` coverage, gap-hint chips for untrained muscles, up/down reorder handles per exercise row, «Velg øvelse» (opens `ExFlyt`) + «Ny øvelse» (manual) add controls as green bar-buttons, inline template name rename via `TextInput`, creator + last-used metadata footer. Saves via `replaceTemplateExercises` + `updateTemplateDetails`. `template_type` column exists on `session_templates` but has no UI consumer yet.
- `ExFlyt.jsx` → slide-up overlay modal for adding exercises to a GruppetimeEditor template. Search existing library exercises or quick-create a new entry with AI muscle inference. Closes via `onClose`; adds via `onAdd(exercise)`.
- `TemplatePicker.jsx` → Carbon `Button`, `InlineLoading`, `InlineNotification`
- `TemplateSessionEditor.jsx` → `layer-02` + 2px accent top border container; `SectionLabel renderIcon={Edit}` header; Carbon `TextInput` for template name (inline rename); step indicator in use mode ("Steg 2 av 3"); no "Lagre mal" in use mode; body map via `BodyPanel`; exercise rows via `ExerciseRowWithAutocomplete`; library search via `LibraryPicker`
- `MuscleMap.jsx` confirm step → wrapped in `layer-02` + 2px accent top border container; `SectionLabel renderIcon={Edit}` header; Carbon `DatePicker`/`DatePickerInput` for session date (defaults to today, max = today)
- `BodySVG` / `HeatmapBodySVG` muscle highlights: primary → `var(--heat-4)` solid green, secondary → diagonal blue hatch (`#001d6c` base + `#4589ff` lines). `HeatmapBodySVG` accepts `onHover(id|null)` and `hovered` props — when `onHover` is provided the internal floating tooltip is suppressed and the caller manages the detail card.
- `Home.jsx` → `SectionLabel` + `PageHeading` headings; last session card with gym-class identity hero; 7-day weekly strip with heat colors — clicking a day that has a session navigates to History pre-selected on that date; `fetchThisWeekSessions` in `db.js`
- `Report.jsx` → `SectionLabel` eyebrow with period + active day filters on two separate `display:block` spans; three separate `flexWrap: wrap` filter rows (period / weekdays / session types) with `1px solid var(--border-subtle-wl)` top borders between groups; "Nullstill filter" always rendered (opacity-toggled); KPI tiles → heatmap body → hover detail → heat legend → frequency table → gap callout card (with `AccentChip` per untrained muscle) → recommendation button → recs list; when all primary muscles trained shows positive fallback message; when some muscles secondary-only shows those as blue tags; recommendation rows have 3px accent left strip + round `+` button that saves the exercise inline via `saveLibraryExercise`; "Oppdater anbefalinger" ghost button (`Renew` icon) below the recs list — re-runs Claude call and overwrites the cache entry; no `StickyCta`; recs are persisted in the shared `recommendation_cache` Supabase table (see data model) and restored on mount/filter-change via `fetchRecsCache`; prefill prop applied on mount via `useRef` — supports `periodDays`, `selectedDays`, `selectedTypes`, `weekday`, `sessionType`; `KpiTile` (42px Plex Light value); `muscleLastDate` in useMemo
- `History.jsx` → custom `MonthGrid` (7-column CSS grid, heat fill, today/selected outlines, month nav); `sessionCountMap` useMemo; `SectionLabel` + `PageHeading` at top; removed `react-day-picker` dependency entirely
- `PageShell.jsx` → exports: `SectionLabel` (mono 12px, 0.16em tracking, 3px `var(--accent)` left border; accepts optional `renderIcon` prop — renders the Carbon icon at 14px before the label text), `PageHeading` (Cond 700 28px), `PageTitle` (alias for SectionLabel), `AccentChip` (magenta pill: `var(--accent-bg-14)` bg, `var(--accent-soft)` text), `StickyCta` (sticky bottom bar with top border), `BackButton`, `useNavHints()` hook (returns `[hints: boolean, toggle(val): void]`; reads/writes `localStorage` key `wl-nav-hints`, defaults `true`; syncs across all instances in the same tab via a `wl-nav-hints-change` custom event); `NavBtn` is a `forwardRef` component accepting `l1` and `l2` props — renders a 2-line Plex Condensed (8px) label below the icon; nav bar height is 56px; nav icons in order: Camera → RecentlyViewed → Analytics → EventSchedule (Planlegger) → Notebook (Sett-sammen) → Settings — 6 icons each 48px wide; theme toggle and logout removed from header (now in Settings view); `ChangelogModal` no longer rendered here
- `carbon-tokens.css` → added `--heat-1..5` green scale (#044317 → #42be65); WL custom tokens: `--accent` (#ee2c80 magenta), `--surface-card`, `--border-subtle-wl`, `--text-muted-wl`, `--accent-bg-08/14/30`, `--accent-soft`, `--r-card` (16px), `--r-pill` (999px), `--r-tile` (10px), `--cond` (IBM Plex Sans Condensed), `--exercise` (#7af2a4 green, g10 override #1a8c4e), `--exercise-soft` (rgba 12%), `--exercise-mid` (rgba 35%); g10 light-mode overrides for all WL tokens
- `app.css` → global `html, body { overflow-x: hidden }` to prevent horizontal viewport bleed from chip rows; do not use `overflow: hidden` on direct parents of `flexWrap: wrap` chip containers — it clips instead of scrolling
- Removed: Bebas Neue, DM Sans, Google Fonts import, custom `C` token objects, all raw hex colors, rounded corners, `react-day-picker`, `date-fns`

### Hard rules (must not regress)
- **Sentence case** for all labels — `Add exercise`, not `Add Exercise`
- **0px border-radius** on buttons, inputs, cards — exceptions: Tags/pill chips use `var(--r-pill)` (999px), cards use `var(--r-card)` (16px), tiles use `var(--r-tile)` (10px)
- **No emoji** — use `@carbon/icons-react` exclusively
- **IBM Plex everywhere** — no system-font fallbacks visible in the rendered page
- **Semantic tokens** (`var(--cds-*)` or `var(--wl-*)`) not raw hex — otherwise the theme toggle breaks
- **No gradients** in product UI — solid colors only
- **Focus ring** = 2px solid `#0f62fe` outline (Carbon handles this via its component styles)
- **Filter chips** — always use `flexWrap: wrap`; never `overflowX: auto` on a flex chip container without a constrained parent (it silently fails on mobile Chromium and clips instead of scrolling)

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

## Backlog

Tracked in [GitHub Issues](https://github.com/ChristopherRotnes/BodyMapTraining/issues). Run `gh issue list` for current open work.

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
  primary: string[],     // muscle IDs returned by Claude (or from library)
  secondary: string[],   // muscle IDs returned by Claude (or from library)
  enabled: boolean       // toggled in confirm/template step
}
```
Sets and reps were removed in issue #200. Group class instructors log *what exercises were in the program*, not volume. DB columns (`sets`, `reps`, `default_sets`, `default_reps`) still exist and are nullable — no destructive migration.

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

## Week plan data model (issue #59)

Two new Supabase tables:

```sql
week_plans
  id, user_id, week_iso text (e.g. "2026-W19"), created_at
  UNIQUE (user_id, week_iso)

week_plan_days
  id, plan_id → week_plans (on delete cascade), day_of_week int (1=Mon…7=Sun),
  template_id → session_templates (on delete set null, nullable), sort_order int
```

`week_plan_days.template_id` nullable — an empty slot is a valid row with `template_id = null`. RLS on both tables restricts all operations to the owning user (`auth.uid() = user_id` / exists check via join).

## Gym-wide shared templates and exercise library (2026-05-14)

`session_templates` and `exercise_library` are **gym-wide**: any co-instructor at the same gym (via `user_gyms` join) can SELECT, INSERT, UPDATE, and DELETE. `user_id` is retained on both tables as "created by" for attribution display only — it is no longer an ownership gate.

RLS policies replaced (migration `gym_wide_templates_and_exercises`):
- Old: `auth.uid() = user_id` (ALL ops) on all three tables
- New: separate INSERT policy (`auth.uid() = user_id`) + SELECT/UPDATE/DELETE policies using the same-gym EXISTS subquery already used for sessions; `session_template_exercises` uses a JOIN via `session_templates.user_id`

`db.js` changes: removed `.eq("user_id", user.id)` defensive filters from `updateTemplateName`, `deleteTemplate`, `touchTemplate`, `updateLibraryExercise`, `deleteLibraryExercise`; added `profiles!user_id(display_name)` join to `fetchTemplates` and `fetchLibraryExercises`.

**FK pitfall (migration `rewire_user_id_fk_to_profiles`):** `session_templates.user_id` and `exercise_library.user_id` originally referenced `auth.users(id)`. PostgREST cannot traverse `auth.users → profiles` so the `profiles!user_id(display_name)` join failed at runtime. Both FKs were rewired to reference `profiles(id)` instead — matching the pattern used by `sessions.trainer_id`. Do not change these back to `auth.users`.

**Editing an exercise does NOT rewrite historical sessions.** `muscle_activations` rows are permanent snapshots written at log time with no FK to `exercise_library`. Correcting a muscle mapping in the library only affects future sessions.

`db.js` functions:
| Function | Description |
|---|---|
| `fetchWeekPlan(weekIso)` | Fetches `week_plans` + `week_plan_days` with joined template data. Returns `{ plan, days }`. |
| `saveWeekPlan(weekIso, assignments)` | Upserts `week_plans`, deletes + reinserts all `week_plan_days`. `assignments: [{ day_of_week, template_id }]`. |
| `deleteWeekPlan(weekIso)` | Deletes the `week_plans` row (cascade removes days automatically). |
| `fetchSessionsForWeek(weekIso)` | Fetches all `sessions` (with `session_exercises` + `muscle_activations.activation_type`) whose `session_date` falls within the ISO week (Mon–Sun). `fetchThisWeekSessions()` now delegates to this with `toWeekIso(new Date())`. Powers Planlegger's "Trent denne uken" body map (#143). |
| `fetchExerciseTemplateCounts()` | Returns `{ [exercise_id]: number }` — distinct template count per library exercise, using Set deduplication on `template_id`. Used by OvelsePicker to show «BRUKT I N GT». |

## Recommendation cache data model (issue #150)

Shared lookup table — no `user_id` column. Any authenticated user whose filters resolve to the same muscle coverage pattern reuses the cached Claude response without an extra API call.

```sql
recommendation_cache
  cache_key   text PRIMARY KEY,   -- v{RECS_PROMPT_VERSION}_{periodDays}_{sessionCount}_{trainedIds}_{untrainedIds}
  recs        jsonb NOT NULL,      -- array of { name, primary[], secondary[], tip }
  fetched_at  timestamptz NOT NULL DEFAULT now()
```

`cache_key` encodes everything Claude sees: prompt version, period, session count, and sorted trained/untrained muscle ID lists. Changing any of these produces a different key → natural cache miss → fresh fetch.

`db.js` functions:
| Function | Description |
|---|---|
| `fetchRecsCache(cacheKey)` | SELECT by `cache_key`, returns `recs` array or `null`. Silent on error. |
| `saveRecsCache(cacheKey, recs)` | UPSERT on conflict. Fire-and-forget (errors are silent). |

**Cache invalidation:** No explicit invalidation on session changes — if trained/untrained muscles change, the key changes naturally. The weekly `recsCacheCleanup` Azure Function deletes entries older than 7 days (TTL) and entries from a stale `RECS_PROMPT_VERSION`. **Bump `RECS_PROMPT_VERSION` in both `prompts.js` and `recsCacheCleanup.js` whenever the recommendation prompt or model changes.**

## Key architecture decisions
- **i18n:** `app/src/lib/i18n.js` initialises `i18next` with `fallbackLng: "nb"` and three resource bundles (`nb`, `en`, `fa`). All components use `useTranslation()` for strings. All locale-aware date/time rendering uses `Intl.DateTimeFormat` with a `getIntlLocale()` helper that maps `"nb" → "no"` (the IETF tag `Intl` expects). Never use hardcoded locale strings like `"no-NO"` or `date-fns` locale objects — they break when the user switches language. The `i18n` singleton can be imported directly (`import i18n from "../lib/i18n"`) for `i18n.language` access outside hooks. RTL (`dir="rtl"`) is applied to `<html>` automatically on language change.
- **Shared muscle/SVG module:** `app/src/lib/bodymap.jsx` exports `MUSCLES`, `SHAPES`, `EX_DB`, color constants (`PRIMARY_FILL`, `PRIMARY_HOVER`, `PRIMARY_STROKE`, heat vars), `calcMuscles`, `BodySVG`, `HeatmapBodySVG` (accepts `onHover(id|null)` and `hovered` props — when `onHover` is set the internal tooltip is suppressed), and `useIsMobile`. Do not duplicate these in component files.
- **Shared utilities:** `app/src/lib/utils.js` — exports `toBase64`, `getMediaType`, `buildMuscleMapFromExercises` (with EX_DB fallback, for confirm/edit steps), `buildMuscleMapFromSession` (reads saved DB session for History read mode), `buildRecMuscleMap` (for recommendation body maps), `isInvalidNum` (validates sets/reps as integers 1–99), `callClaude(body)` (authenticated fetch to `/api/claude` — returns raw `Response`; always call `await res.json()` to read the body), `inferMusclesFromName(name)` (calls Claude Sonnet text API to infer muscle IDs for a single exercise name — returns `{ primary, secondary }` or `null`; handles markdown code fences defensively), `extractMuscles(session)` (splits `muscle_activations` into primary/secondary Sets, removes primary from secondary), `toWeekIso(date)` (Date → `"2026-W19"` ISO week string), `weekIsoToMonday(weekIso)` (`"2026-W19"` → Monday `Date`), `isoWeekMonday(date)` (Date → Monday `Date` of that ISO week, local time), `toIsoDate(date)` (Date → `"yyyy-MM-dd"` string using local time getters — replaces `date-fns` `format`), `getIntlLocale()` (maps `i18n.language` to the IETF tag `Intl` expects, e.g. `"nb" → "no"`). Do not redefine these locally in component files.
- **Shared Claude config:** `app/src/lib/prompts.js` — exports `CLAUDE_MODEL_VISION` (sonnet-4-6, for image analysis), `CLAUDE_MODEL_TEXT` (sonnet-4-6, for recommendations), `RECS_PROMPT_VERSION` (integer — bump whenever `buildPeriodRecommendPrompt` or the model changes; old cache entries are swept by the weekly cleanup job; also keep `RECS_PROMPT_VERSION` in `app/api/recsCacheCleanup.js` in sync), `ANALYZE_PROMPT`, `buildRecommendPrompt(trained, untrained)`, `buildPeriodRecommendPrompt(periodDays, sessionCount, trainedLabels, untrainedLabels)`, `buildMuscleInferencePrompt(name)` (cheap text-only call for single-exercise muscle inference). All model IDs and prompt text live here; update in one place.
- Claude returns muscle IDs directly in JSON — local keyword matching (EX_DB) was abandoned because Norwegian abbreviations and whiteboard variants didn't match reliably. EX_DB is kept only as fallback for manually added exercises.
- SVG body uses `BODY_PATH` (bezier curves, viewBox `0 0 160 360`) — improved silhouette with curved shoulders, arms, waist and hips. Still simplified, not anatomically precise. `SHAPES` entries are either ellipses (`{ cx, cy, rx, ry }`) or SVG paths (`{ d }`); the render loop handles both. Key muscles with path shapes: `traps` (trapezoid with neck notch), `lats` (wing paths). `BodySVG` renders primary muscles as solid green glow, secondary as diagonal blue stripes (`<pattern id="sec-stripe-{view}">`).
- `useIsMobile(breakpoint=500)` — exported hook from `bodymap.jsx`. Below breakpoint: single body view with Front/Bak toggle. Above: side-by-side. Consumed via `BodyPanel` — do not use directly in page components.
- **Shared exercise row:** `app/src/components/ExerciseRow.jsx` — renders one editable exercise row (checkbox, inline name edit, sets/reps inputs, delete). Props: `exercise`, `onChange(updates)`, `onDelete()`, `layer` ("layer-01"/"layer-02"), `validateNumbers`, `autoFocusName`, `onNameBlur` (optional callback fired when the name input blurs — used by `ExerciseRowWithAutocomplete` to trigger muscle inference). The outer row div has no click handler — only the Checkbox toggles `enabled` (prevents accidental untick when editing fields). Used by `MuscleMap.jsx`, `History.jsx`, and `TemplateSessionEditor.jsx`.
- **Planlegger:** `app/src/components/Planlegger.jsx` — weekly training planner view (issue #59). State: `weekOffset` (±week navigation), `assignments` (`{ [dow 1-7]: template | null }`), `templates`, `weekSessions` (logged sessions for the visible ISO week — issue #143), `pickerDow`, `saving`, `saveError`, `hoveredMuscle`. Computed via `useMemo`: `monday`, `weekIso`, `weekLabel` (built inline with `Intl.DateTimeFormat` for the locale-aware month abbreviation + `t("planlegger.weekLabel", ...)`), `untrainedThisWeekIds` (muscle IDs not trained in any logged session for the visible ISO week — derived from `weekSessions` via `extractMuscles`; issue #143), `projectedExerciseMap` (union of all assigned templates' exercises via `buildMuscleMapFromExercises`), `sessionCount`, `muscleGroupCount`, `untrainedMuscleIds`, `showForslag` (≥2 untrained muscles), `forslagTemplates` (up to 3 templates from library covering untrained muscles). Layout: week nav chevrons → `PageHeading` → `SectionLabel "IKKE TRENT DENNE UKEN"` → wrap row of mono pill chips (History-style: `var(--r-pill)`, `var(--border-subtle-wl)`, `var(--text-muted-wl)`, `var(--cds-font-mono)` 11px) listing muscles not yet trained that week (or a single mono message when all 17 are trained) → `SectionLabel "PROJISERT DEKNING"` → projected `HeatmapBodySVG` (side-by-side/toggle) → fixed-height 48px hover-detail container (always rendered, prevents layout shift) → optional Forslag card → `SectionLabel "UKESPLAN"` → 7 × DayRow → inline `TemplatePicker` bottom-sheet overlay. No sticky save/delete bar — plan auto-saves on every add/remove; `deleteWeekPlan` is called automatically when all slots are cleared. Persists via `fetchWeekPlan` / `saveWeekPlan` / `deleteWeekPlan` in `db.js`; loads logged sessions via `fetchSessionsForWeek` in parallel with the plan fetch. Duration (`N MIN`) omitted — `session_templates` has no duration column.
- **IntroModal:** `app/src/components/IntroModal.jsx` — one-time 5-slide onboarding modal (issue #162). Controlled by `open`/`onClose` props from `App.jsx`. Resets `step` to 0 via `useEffect` whenever `open` becomes true. `dismiss()` sets `localStorage` key `wl-intro-seen=1` then calls `onClose()`; the ×-close button and "Hopp over" also call `dismiss()`. Slide data is a static constant array of `{ Icon, titleKey, bodyKey }`. Step indicator and replay hint rendered in body below slide content. Responsive via an inline `<style>` block: max-width 560px on desktop, full-viewport on ≤500px. Wrapped in `<Theme>` matching the current app theme.
- **Settings:** `app/src/components/Settings.jsx` — settings view reachable via the gear icon in the header (issue #123). Accepts optional `onShowIntro` prop from `App.jsx`. Sections in order: (1) Språk — `RadioButtonGroup` for nb/en/fa; calls `i18n.changeLanguage()` + persists to `localStorage`; (2) Utseende — Carbon `Toggle` for dark/light theme + Carbon `Toggle` for nav hints (`useNavHints()`) with a live `BodyPanel` preview (fixed sample: primary `chest, quads, lats`; secondary `shoulders_front, hamstrings, triceps`); (3) Kontakt — feedback text + GitHub link; (4) Om appen — version number + ghost "Vis introduksjonsguide" button (calls `onShowIntro`) + changelog accordion; (5) Konto — logged-in email (read-only) + danger logout button. `ChangelogModal` is no longer rendered in `PageShell` — it lives here exclusively.
- **BodyPanel:** `app/src/components/BodyPanel.jsx` — shared front/back body map. Manages its own `mobileView` toggle state internally. Props: `primary[]`, `secondary[]`, `muscleMap`, `marginBottom`. Replaces the duplicated mobile/desktop render pattern that previously existed in `MuscleMap`, `History`, and `TemplateSessionEditor`.
- **MusclePicker:** `app/src/components/MusclePicker.jsx` — interactive body map where clicking a muscle cycles off → primary → secondary → off. Props: `primary[]`, `secondary[]`, `onChange({ primary, secondary })`, `instanceId` (unique suffix to avoid SVG filter ID collisions). On mobile (≤500px) renders a front/back toggle (one view at a time) instead of side-by-side. Used inside `ExerciseForm.jsx`.
- **ExerciseForm:** `app/src/components/ExerciseForm.jsx` — form for creating/editing a library exercise (name, default sets/reps, MusclePicker). Props: `initial`, `onSave(fields)`, `onCancel()`, `saving`. On name field blur, fires `inferMusclesFromName` if no muscles are set yet — shows `InlineLoading` spinner → finished flourish → static «AI» pill label + «NULLSTILL» button to clear the inference and start over. Shows a red warning when name is filled but muscles are still empty. Extracted from inline definition in `Bibliotek.jsx`.
- **LibraryPicker:** `app/src/components/LibraryPicker.jsx` — searchable list of library exercises for adding to a template. Props: `libraryExercises[]`, `onAdd(exercise)`, `onClose()`. Extracted from inline definition in `TemplateSessionEditor.jsx`.
- **ExerciseRowWithAutocomplete:** `app/src/components/ExerciseRowWithAutocomplete.jsx` — wrapper around `ExerciseRow` that adds an inline autocomplete dropdown and AI muscle inference when a new exercise name is typed. Only activates when `isNew` prop is true (IDs added during the current edit session, tracked via `newExerciseIds` Set in History). Props: all `ExerciseRow` props + `libraryExercises[]` + `isNew`. On name field blur (including tab-to-sets/reps), fires `inferMusclesFromName` if no muscles are set — shows spinner → finished flourish → static AI label; library autocomplete selection clears any AI inference. Library is fetched once when edit mode opens; failure degrades silently to manual entry. Uses `onMouseDown + e.preventDefault()` on suggestions to prevent input blur from closing the dropdown before the click fires. Used in `History.jsx` edit mode only — `ExerciseRow` is unchanged for `MuscleMap` and `TemplateSessionEditor`.
- **API security:** `app/api/claude.js` requires a valid Supabase JWT on every request (`Authorization: Bearer <token>`). Verifies via `GET /auth/v1/user`. Also enforces a model allowlist (`claude-sonnet-4-6`) and caps `max_tokens` at 2000. The `callClaude(body)` helper in `utils.js` injects the token automatically — all Claude calls must go through it.
- **Template navigation:** `App.jsx` manages views `"sett-sammen"`, `"gruppetime-picker"`, `"gruppetime-editor"`, `"ovelse-picker"`, `"template-picker"`, `"template-editor"`, `"settings"`, `"planlegger"` alongside existing views. The nav callback is `onShowSetSammen` (was `onShowBibliotek`). Key state: `gruppetimerEditorTemplate` holds the template being edited in `GruppetimeEditor`; `pendingTemplateExercises` carries exercises from `TemplateSessionEditor` into `MuscleMap`. **`TemplateSessionEditor` is kept unchanged** — it handles the MuscleMap «Bruk mal» flow (mode="use") and is separate from `GruppetimeEditor` which handles the Sett-sammen edit flow. When "Bruk økt" is pressed in `TemplateSessionEditor`, exercises pass to `MuscleMap` via `templatePreload` prop, triggering a `useEffect` that pre-fills the list and jumps to the confirm step.
- Supabase Auth uses magic links (`emailRedirectTo: window.location.origin`)
- Anthropic API calls go through `app/api/claude.js` — Azure Function v4 model, browser hits `/api/claude`
- **Azure Functions entry point:** `app/api/index.js` imports all function files (`claude.js`, `sportySync.js`, `recsCacheCleanup.js`). `package.json#main` points to `index.js`. Azure Functions v4 only loads the single file referenced in `main` — add new function files here or they will never be registered. **The API `package.json` only has `@azure/functions` as a dependency — use raw `fetch` to the Supabase REST API (as `sportySync.js` does), never `import { createClient } from '@supabase/supabase-js'` in API files.**
- **Sporty.no sync:** `app/api/sportySync.js` — timer trigger at 04:00, 11:00, and 14:00 UTC upserts today's sessions from `https://sporty.no/api/v1/businessunits/8/groupactivities` into `gym_calendar` by `sporty_id`. Class names are passed through `normalizeName()` before storage, which strips any quoted annotation (e.g. `"SVART TRØYE"`) — handles both straight and curly double quotes generically. Business unit `8` is hardcoded — intentional for now (single-gym product); if extended to multiple gyms, this must become an env var or DB config. HTTP trigger `POST /api/sporty-sync` available for manual testing; accepts optional JSON body `{ "shiftDays": -7 }` to offset all timestamps by N days (useful for backfilling historical gym calendar data without re-running the live API). `GET /api/sporty-health` returns DB row counts (total rows, earliest/latest row timestamps, today's session count — no session list) — requires `x-api-key: <SPORTY_SYNC_API_KEY>` header (same key as the sync endpoint). Requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SPORTY_SYNC_API_KEY` as Azure app settings (service role needed because the timer has no auth user). **The timer registration is guarded by `process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Production'`** — it is skipped entirely in local dev because the SWA CLI emulator only supports HTTP triggers.
- **Rec cache cleanup:** `app/api/recsCacheCleanup.js` — timer trigger every Sunday at 03:00 UTC. Two DELETE passes: (1) entries older than 7 days (TTL — forces fresh recommendations; also catches version-orphaned entries that were never refreshed); (2) entries whose `cache_key` does not start with `v${RECS_PROMPT_VERSION}_` (sweeps orphans immediately after a prompt/model version bump). Uses raw `fetch` to Supabase REST API (no SDK). Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- **Claude API proxy:** `app/api/claude.js` verifies incoming Supabase JWTs via `GET /auth/v1/user`. Requires `ANTHROPIC_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` as Azure app settings. Use `SUPABASE_ANON_KEY` (no `VITE_` prefix) — the `VITE_` prefix is Vite build-time only and is invisible to the Azure Functions runtime.
- **CI/CD build split:** the frontend is pre-built in the GitHub Actions runner (`npm ci && npm run build` with `VITE_*` in `env:`), then the Azure SWA action uploads `app/dist/` directly (`app_location: "app/dist"`). This bypasses Oryx for the frontend — Oryx strips `VITE_*` env vars before spawning Vite and they never reach the bundle. Oryx still handles the API (`app/api`). `vite.config.js` has a build-time assertion that fails immediately if the required vars are missing.
- **Supabase client explicit apikey header:** `createClient` is called with `global: { headers: { apikey: supabaseKey } }` in `app/src/lib/supabase.js`. The Supabase JS v2 fetch interceptor should add this automatically, but it was not reaching browser requests — passing it in `global.headers` puts it directly on `PostgrestClient`'s base headers, bypassing the interceptor. Do not remove this option.
- **Multi-instruktør gym membership:** `user_gyms` table links each user to a Sporty business unit (`sporty_business_unit_id`). Primary users are instruktører; sharing default is opt-out scoped to the same gym. `ensureGymMembership(buId, user?)` in `db.js` does an idempotent upsert on sign-in (called in `App.jsx`). Accepts an optional `user` param — if provided, skips the `supabase.auth.getUser()` network call. `DEFAULT_SPORTY_BUSINESS_UNIT_ID = 8` mirrors the hardcoded BU in `sportySync.js`; both must move to a DB config when multi-gym support lands. Backfilled rows exist for both current users.
- **Roles (temporal):** `roles` table stores instruktør tenure — `user_id`, `sporty_business_unit_id`, `name` (default `'instruktor'`), `title`, `valid_from` (date), `valid_to` (nullable date). Active roles = `valid_from <= today AND (valid_to IS NULL OR valid_to >= today)`. `fetchActiveRoles(buId)` in `db.js` returns all active roles for the current user at the given gym. Existing placeholder rows were migrated from `user_gyms.role` (issue #140). RLS: users can only read/write their own rows.
- **Display name:** `profiles` has `display_name text CHECK (char_length(display_name) <= 50)`. RLS: existing "Brukere ser sin egen profil" / "Brukere oppdaterer sin egen profil" policies cover self-reads and writes; new "Same-gym users can read profiles" SELECT policy exposes `display_name` to co-instructors at the same gym. `fetchDisplayName()` / `updateDisplayName(name)` in `db.js`. Settings → Konto exposes a TextInput. `ensureDisplayName(user?)` runs on every login alongside `ensureGymMembership()` — if `display_name` is null it sets it to the email prefix (`user.email.split('@')[0]`); fire-and-forget, errors are silent. Accepts an optional `user` param to skip the `getUser()` network call. Both ensure functions are called in parallel via `Promise.all` in `App.jsx`, passing `session.user` so neither makes its own `getUser()` request.
- **Session visibility (removed):** The `sessions.visibility` column exists in the DB but is no longer used. The "Same-gym users can read sessions" RLS policy was updated to remove the `visibility = 'shared'` filter — all sessions are cross-readable by co-instructors at the same gym. `updateSessionVisibility` is removed from `db.js`; the History visibility Toggle is gone. Settings → Konto shows an informational GDPR paragraph.
- **Report instructor filter:** `fetchSessionsForReport` joins `trainer_id, profiles(display_name)` on every call. `Report.jsx` derives `availableInstructors` (unique `{ id, label }` pairs, sorted alphabetically, label falls back to `"Unnamed"`) from the fetched sessions and renders a fourth filter chip row only when `availableInstructors.length > 1`. `selectedInstructors` is a `Set<trainer_id>` — empty means all instructors shown (same pattern as `selectedDays`/`selectedTypes`). Reset button clears all three Sets. Recs cache key is unaffected — `sessionCount` already encodes the filtered result naturally.
- **Joint class history:** `fetchClassHistory(gymCalendarId)` in `db.js` returns co-instructor sessions for a given gym class instance (excludes own), with joined `profiles(display_name)` and `session_exercises`. History lazy-fetches on first expand of a gym-linked session; cached in `classHistory` Map state (key: `gym_calendar_id`). Panel always renders in the expanded session view, showing display name + exercise list per colleague.

## Known limitations
- SVG body is improved but still geometrically simplified — not anatomically precise; key muscles (traps, lats) use path shapes, rest are ellipses
- `shoulders_front` and `shoulders_side` shapes were previously nearly identical in position (3px apart), causing wrong hover hit targets and incorrect tooltip data in the heatmap. Fixed by moving `shoulders_front` inward (cx:42, cy:60) and `shoulders_side` outward to the arm edge (cx:23, cy:68) — see issue #18. Pending live verification.
- Sets and reps are not collected or stored (removed in issue #200) — the app tracks which exercises were in the program, not individual volume
- Recommendations are contextual per session, not based on accumulated history (will improve with data)
- No error handling for API rate limits
- History edit mode re-analyse uses a single image only (the new photo replaces the full exercise list); multi-image re-analysis is not supported in edit mode
- Carbon `DatePicker` uses US date format (`MM/DD/YYYY`) in the confirm step — no Norwegian locale override applied yet

## Email templates

Supabase auth email templates are version-controlled in `supabase/templates/`. Three templates are defined:

| File | Email type | Subject |
|---|---|---|
| `magic_link.html` | Magic link login | Sign in to Workout Lens |
| `invite.html` | User invite | You have been invited to Workout Lens |
| `confirmation.html` | Email confirmation | Confirm your Workout Lens account |

Templates are referenced in `supabase/config.toml`. To apply them to the remote Supabase project:

```powershell
supabase link --project-ref <your-project-ref>
supabase config push
```

All templates use inline CSS only (no external stylesheets — email clients strip them). Colours match the app: `#161616` background, `#ee2c80` accent, `#262626` header. The `{{ .ConfirmationURL }}` and `{{ .SiteURL }}` variables are Supabase Go template syntax — do not change them.

## Supabase migration hygiene

From **October 30, 2026**, Supabase enforces explicit GRANTs on all new `public` schema tables — PostgREST returns `42501` without them. All 14 existing tables already have grants and are unaffected. Any future migration that creates a new table **must** include the following grant block:

```sql
grant select on public.your_table to anon;
grant select, insert, update, delete on public.your_table to authenticated;
grant select, insert, update, delete on public.your_table to service_role;

alter table public.your_table enable row level security;
```

Adjust `anon` privileges to the minimum required (often no access at all — `anon` can typically be omitted for app tables that require login). Always enable RLS and add policies immediately after the grants.

## Local development

```powershell
.\dev.ps1
```

`dev.ps1` is gitignored. It:
1. Calls `fnm use 22` — pins to Node 22 LTS (Node 20 reached EOL April 2026)
2. Spawns `npm run dev` (Vite on port 5173) in a separate PowerShell window
3. Waits 3 s for Vite to start, then calls `swa start`

Open **http://localhost:4280** (not 5173). The SWA emulator proxies `/api/*` to the local Azure Functions process; `npm run dev` alone skips the API layer.

### One-time setup
```bash
npm install -g @azure/static-web-apps-cli
cp app/.env.local.example app/.env.local                             # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
cp app/api/local.settings.json.example app/api/local.settings.json  # fill in ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY, SUPABASE_ANON_KEY
cd app && npm install
```

`app/.env.test` is committed with placeholder values and requires no setup — it exists solely so the Vitest test runner can import `supabase.js` without crashing in CI (no real Supabase calls are made during unit tests).

## Test suite

`npm test` (in `app/`) runs Vitest. The suite is deliberately scoped to **pure logic** — no DOM, no live Supabase, no React rendering — so the whole run finishes in <2 s.

Files and what they cover:

| File | Subject | Notes |
|---|---|---|
| `app/api/__tests__/claudeUtils.test.js` | model allowlist, `MAX_TOKENS_LIMIT`, `checkRateLimit` (incl. window expiry via `vi.useFakeTimers()`), `verifySupabaseJwt` | Covers all branches of the API guards. |
| `app/src/lib/__tests__/bodymap.test.js` | `calcMuscles` | Explicit muscles, EX_DB fallback, dedup, miss path. |
| `app/src/lib/__tests__/muscleMapReducer.test.js` | `MuscleMap` reducer | One test per action type; reducer is the spine of the upload→confirm→muscles flow. |
| `app/src/lib/__tests__/prompts.test.js` | `ANALYZE_PROMPT`, `buildRecommendPrompt`, `buildPeriodRecommendPrompt`, `buildMuscleInferencePrompt` | Guards that every `MUSCLES` ID appears in every prompt — the prompt-vs-runtime mismatch is the easiest way to silently break Claude responses. |
| `app/src/lib/__tests__/utils.test.js` | `buildMuscleMapFromExercises`, `buildMuscleMapFromSession`, `buildRecMuscleMap`, `extractMuscles`, `isInvalidNum`, `toIsoDate`, `toWeekIso` / `weekIsoToMonday` / `isoWeekMonday`, `getIntlLocale`, `inferMusclesFromName` | Date helpers exercise ISO-week edges (year boundaries, Sunday); `inferMusclesFromName` mocks `fetch` and covers clean JSON, markdown-fenced JSON, malformed JSON, empty arrays, and rejected promises. |

Rules of thumb when adding tests:
1. Every export from `utils.js`, `bodymap.jsx`, `prompts.js`, `claudeUtils.js` should have at least one branch-covering test. Don't write a test that only re-asserts a constant — assert the **behaviour** that constant drives.
2. Avoid component-rendering tests until there's a concrete regression they would have caught. The reducer + helper layer is where logic bugs land in this codebase.
3. When testing `inferMusclesFromName` or anything touching `callClaude`, stub `globalThis.fetch` with `vi.stubGlobal` and `vi.unstubAllGlobals` in `afterEach` — `supabase.auth.getSession()` runs entirely in-memory with the placeholder env vars, so no other mocks are needed.

Coverage (`npm run test:ci`) is configured in `vite.config.js` to scope to `src/lib/**` and `api/claudeUtils.js`. Current line coverage: `utils.js` ~80%, `prompts.js` 100%, reducer & `calcMuscles` ~100% within tested files; `db.js` and `bodymap.jsx` SVG render code are intentionally untested.

## Azure deploy notes
- **Supabase Auth redirect URLs** — add the following in Supabase → Authentication → URL Configuration → Additional redirect URLs: `http://localhost:4280` (local dev), your production URL + `<prod-url>/**` (prod), and `<your-swa-subdomain>-*.westeurope.7.azurestaticapps.net` (PR preview wildcard). The app uses `emailRedirectTo: window.location.origin` so no per-PR config is needed (#135)
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

### Issue #57 — `/api/claude` returning 401 despite valid session (resolved 2026-05-03)
Symptoms: every upload failed with 401. The browser was sending a valid Supabase JWT in `Authorization: Bearer <token>`, but `claude.js` kept rejecting it with Supabase's `bad_jwt / signature is invalid`.

**Root cause — Azure SWA replaces the `Authorization` header:**
Azure Static Web Apps' proxy layer silently replaces any incoming `Authorization: Bearer` header with its own managed identity token (issued by `*.scm.azurewebsites.net`) before the request reaches the function handler. The Supabase JWT never arrived; Azure's Kudu identity token did instead. Supabase correctly rejected it. This happens even with `authLevel: 'anonymous'` on the function.

**How we diagnosed it:** the Supabase token uses ES256 (asymmetric) and has a `kid` in the JWT header, making it ~900 chars. The server only saw 365 chars — a completely different token with `iss: https://31315134-...scm.azurewebsites.net`.

**Fix:** send the Supabase JWT in a custom header `X-Supabase-Token` that Azure's proxy ignores. See `callClaude` in `app/src/lib/utils.js` and `verifySupabaseJwt` in `app/api/claude.js`.

**Never revert to `Authorization: Bearer` for the Supabase token** — Azure will always intercept it.

### Issue #164 — White flash on History calendar in dark mode (resolved 2026-05-12)
Symptom: a brief white flash appeared on the MonthGrid calendar area every time a user navigated to History in g100 (dark) mode.

**Root cause — Carbon skeleton dark tokens not applied via `data-theme` attribute:**
Carbon's compiled CSS from `@carbon/styles` emits dark skeleton token overrides under the `.cds--g100` CSS class selector (e.g. `.cds--g100 { --cds-skeleton-background: #393939 }`). The app's `ThemeProvider` only sets `data-theme="g100"` on `<html>` — it never adds the `.cds--g100` class. Therefore `SkeletonPlaceholder` and `AccordionSkeleton` always resolved `--cds-skeleton-background` to the `:root` default (`#e8e8e8` — light gray), producing a bright/white flash while loading.

**Fix:** Added `--cds-skeleton-background: #393939` and `--cds-skeleton-element: #525252` to the `.cds--g100, [data-theme="g100"]` block in `carbon-tokens.css`. These are Carbon's official g100 skeleton token values (gray-80 and gray-70 respectively). The existing block already overrides all other Carbon semantic tokens for the same reason.

**Pattern to watch:** Any new Carbon token that Carbon's SCSS emits only under `.cds--g100` (not `:root`) must be explicitly added to the `[data-theme="g100"]` block in `carbon-tokens.css`. Run a visual check in dark mode whenever a new Carbon component is introduced.

### Issue #173 — HEIF photo exceeds Anthropic 5 MB limit (resolved 2026-05-14)
Symptom: uploading an iPhone 17 Pro photo failed with `Serverfeil (400): image exceeds 5 MB maximum: 5246896 bytes > 5242880 bytes`.

**Root cause 1 — Wrong comparison unit in `compressImage`:** Anthropic enforces the 5 MB limit on the **base64 string character count**, not the decoded byte size. `compressImage` was checking `b64.length * 0.75 <= 5 MB` (decoded bytes ≤ 5 MB), which allows base64 strings up to ~6.67 M chars. A 3.75 MB decoded image produces ~5.25 M base64 chars — passes our check, fails Anthropic's. Fixed by changing all checks to `b64.length <= MAX_B64_CHARS` (5,242,880) and setting the canvas compression target to 90% of that limit.

**Root cause 2 — iOS silently ignores large data URLs as `img.src`:** The original canvas fallback path set `img.src = dataUrl` (the ~9 MB base64 string from FileReader). iOS Safari silently fails to decode a data URL this large: `img.naturalWidth` and `img.naturalHeight` both become 0. The canvas is created as 0×0, `toDataURL` returns a near-empty result that passes the size check, and the original un-compressed data stays in state. No error is thrown. Fixed by using `URL.createObjectURL(file)` as the image source instead.

**Root cause 3 — iOS Safari ignores `canvas.toDataURL` quality parameter:** iOS Safari on some versions silently ignores the `quality` argument and always outputs at default quality (~0.92). Dimension reduction (canvas pixel dimensions) is the only reliable lever on iOS — not quality stepping.

**Never revert to `img.src = dataUrl` for large images** — iOS will silently zero out naturalWidth/Height. Do not use `b64.length * 0.75` to compare against Anthropic's limit — compare `b64.length` directly.

### Issue #173 — fetchLastSession returning null (resolved 2026-05-14)
Symptom: Home → "Siste økt" showed "Ingen økter logget ennå" even though sessions existed in the DB and the weekly strip showed the correct session count.

**Root cause — `.maybeSingle()` with multiple rows in the sessions table:** `fetchLastSession` used `.limit(1).maybeSingle()`. `.maybeSingle()` sends PostgREST `Accept: application/vnd.pgrst.object+json`. PostgREST evaluates the "single row" constraint and returns 406 when the base query (before LIMIT) would produce multiple rows — the LIMIT is not applied before this check. `.maybeSingle()` in Supabase JS v2 silently converts a 406 (PGRST116) to `{ data: null, error: null }`, so `fetchLastSession` returned null without any error. Works fine with 1 session in the DB; silently breaks once there are 2+ sessions.

**Fix:** Removed `.maybeSingle()`. Changed to a plain array query (`.limit(1)` without `.maybeSingle()`) and returned `data?.[0] ?? null`. The simpler approach avoids the `Accept: application/vnd.pgrst.object+json` header entirely.

**Pattern to watch:** Do not combine `.limit(1)` with `.maybeSingle()` in Supabase JS v2 when the table can have multiple rows. Use `.limit(1)` with an array query and take `data?.[0]` instead. `.maybeSingle()` is only safe on queries where the base set is already guaranteed to be 0 or 1 rows (e.g. `.eq("id", id)` on a primary key).

