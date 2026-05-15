# Changelog

All notable changes to Workout Lens are documented here.

## [1.5.4] — 2026-05-15

### Changed
- **`MuscleMap.jsx` split (issue #213)** — the 852-line component has been reduced to 352 lines. Upload step extracted to `MuscleMapUpload.jsx` (181 lines); confirm step extracted to `MuscleMapConfirm.jsx` (201 lines, includes `getConfidenceColor`); result step extracted to `MuscleMapResult.jsx` (182 lines). Parent retains `useReducer`, all 4 `useEffect` hooks, `addImage`/`handleFiles`/`analyze`/`confirm`/`recommend` callbacks, and the step-indicator strip. No behaviour change.
- **`History.jsx` split (issue #213)** — the 813-line component has been reduced to 525 lines. `MonthGrid` (calendar heatmap) extracted to `MonthGrid.jsx` (103 lines, includes `calHeatColor`). The expanded session panel extracted to `SessionEditPanel.jsx` (218 lines); it imports `checkGymCalendarConflict` directly rather than threading it through props. Parent retains all state, callbacks, and the session-row header rendering. No behaviour change.

## [1.5.3] — 2026-05-15

### Fixed
- **Silent delete errors in `db.js` (issue #213)** — `deleteLibraryExercise` did not check the error from the junction-table delete (`session_template_exercises`); a failure would silently leave orphaned rows while the library exercise itself was deleted. `saveWeekPlan` did not check the error from the `week_plan_days` delete; a failure would leave stale day rows and then attempt to insert new rows on top of them. Both now throw on any Supabase error before proceeding.
- **Claude proxy could hang indefinitely (issue #213)** — `claude.js` had no timeout on the upstream fetch to Anthropic. A slow or stalled Anthropic server could hold the Azure Function open until the platform killed it. Now returns 504 after 25 s via `AbortController`.

### Changed
- **`useDebouncedSearch` custom hook (issue #213)** — the "debounce search input via local timer" pattern was copy-pasted across `OvelsePicker`, `Bibliotek`, and `Planlegger` (TemplatePickerSheet). Extracted into `app/src/lib/hooks.js` (`useDebouncedSearch`). Each site now imports the hook, removing 6 `useState` + 4 `useEffect` calls from those components.
- **`useFetch` custom hook skeleton (issue #213)** — `hooks.js` also exports `useFetch(fn, deps)` as a foundation for future adoption of the loading/error/data pattern used in 10+ components.
- **`Report.jsx` muscleCounts derivations batched (issue #213)** — `musclesCovered`, `untrainedMuscles`, `secondaryOnlyMuscles`, `frequencyTable`, and `trainedIds` were each computed with a separate `Object.entries(muscleCounts)` pass on every render (including unrelated state changes such as `hoveredMuscle` or `loadingRecs`). Consolidated into a single `useMemo` that re-runs only when `muscleCounts` changes. `getAdvice` and the recommendation-cache `useEffect` both now read `trainedIds` from this shared memo instead of recomputing it independently.
- **`db.js` select fragment constants (issue #213)** — five functions repeated the same Supabase JOIN string (`session_exercises(id, name, muscle_activations(muscle_id, activation_type))`). Extracted into two module-level constants (`SESSION_EXERCISES_SELECT`, `SESSION_EXERCISES_FULL_SELECT`) used by `fetchLastSession`, `fetchSessionsForWeek`, `fetchSessionsForReport`, `fetchSessionsByDate`, and `fetchClassHistory`.

## [1.5.2] — 2026-05-14

### Changed
- **Intro guide rewrite (issue #212)** — all 5 slides updated to reflect the current app. Slide 1 now frames the group-class whiteboard context. Slide 2 mentions editing muscles. Slide 4 covers the untrained-this-week indicator and template suggestions. Slide 5 icon fixed (`Book` → `Notebook`) and text rewritten to describe «Sett sammen» (templates + exercise library) including the use case of logging without a photo. All three locales (nb, en, fa) updated.

## [1.5.1] — 2026-05-14

### Changed
- **Parallel fetches on History mount (issue #208)** — `fetchSessions` and `fetchLibraryExercises` are now fired in parallel via `Promise.all`, cutting the History load from two serial round-trips to one.
- **Parallel app-init ensures (issue #209)** — `ensureGymMembership` and `ensureDisplayName` now accept an optional `user` param. `App.jsx` passes `session.user` and fires both in a single `Promise.all`, eliminating two redundant `supabase.auth.getUser()` network calls on every login.
- **TemplatePicker UX** — tighter row spacing and search field shown when there are more than 10 templates.
- **OvelsePicker subtitle** — «BRUKT I N GT» count is now rendered in `--accent-soft` (magenta) to visually distinguish it from the muscle name list.

## [1.5.0] — 2026-05-14

### Changed
- **Remove sets and reps (issue #200)** — sets and reps are no longer collected, stored, or displayed anywhere in the app. Group class instructors log *what exercises were in the program*, not how many reps each participant did. Affected surfaces: `ExerciseRow` (inputs removed), `ExerciseForm` (default sets/reps fields removed), `LibraryPicker` and `ExerciseRowWithAutocomplete` (sets/reps hints in autocomplete removed), MuscleMap and History confirm-step summaries (volume display removed), Report frequency table («Sett»-column removed), HeatmapBodySVG tooltip (volume line removed). The analyze prompt no longer asks Claude to extract sets/reps. All three Supabase RPC payloads (`save_session`, `update_session`, `replace_template_exercises`) omit sets/reps and also strip other null/zero fields (`standard_name`, `library_exercise_id`) to reduce request payload size. DB columns (`sets`, `reps`, `default_sets`, `default_reps`) are kept nullable for historical data — no destructive migration.

## [1.4.0] — 2026-05-14

### Added
- **«Sett sammen»-landing (issue #174, sprint 2)** — `SetSammen.jsx` replaces `Bibliotek.jsx` as the entry point for the library tab. Two-color action system: magenta (`--accent`) for gruppetimer, green (`--exercise`) for øvelser. Featured cards with colored circle icons and chevrons.
- **GruppetimePicker (issue #174, sprint 2)** — dedicated picker listing all templates with mini body-map thumbnails, live search, and a featured magenta «Ny gruppetime» card. Replaces the «Maler» tab.
- **OvelsePicker (issue #174, sprint 2)** — dedicated picker listing all library exercises with region filter chips (Alle / Overkropp / Kjerne / Underkropp / Kondisjon, hidden when count = 0), search, template-usage counts, and a featured green «Ny øvelse» card. Clicking a row opens ExerciseForm directly. Replaces the «Øvelser» tab.
- **GruppetimeEditor (issue #174, sprint 4)** — dedicated editor for creating and editing group-class templates. Features: live muscle-coverage BodyPanel, gap-hint chips for untrained muscles, reorder handles (up/down), add via ExFlyt search or manual entry, inline template name rename, creator + last-used metadata footer. Separate from `TemplateSessionEditor` which is kept unchanged for the MuscleMap «Bruk mal» flow.
- **ExFlyt (issue #174, sprint 4)** — slide-up modal for adding exercises to a GruppetimeEditor template. Search existing library exercises or quick-create a new one with AI muscle inference.
- **DB migration: `template_type`** — nullable `text` column added to `session_templates`. No consumer in UI yet; reserved for a future type-picker (Crossfit / Styrke / Kondisjon / etc.).
- **`fetchExerciseTemplateCounts()` in `db.js`** — batch query returning `{ [exercise_id]: distinctTemplateCount }` using Set deduplication on `template_id`. Used by OvelsePicker to show «BRUKT I N GT» in exercise rows.

### Changed
- **ExerciseForm AI banner** — after muscle inference completes, the banner shows a colored «AI» pill + «NULLSTILL» button to clear the inferred muscles and start over.
- **MusclePicker mobile** — on viewports ≤500px the front/back views are now shown as a toggle (one at a time) rather than cramped side-by-side.
- **GruppetimeEditor add-exercise buttons** — replaced Carbon primary/ghost `Button` pair with green bar-buttons matching the exercise color system. «Fra biblioteket» renamed to «Velg øvelse».

## [1.3.0] — 2026-05-14

### Added
- **Nav redesign (#A)** — all 6 nav icons now show 2-line IBM Plex Condensed labels (8px, lowercase) below the icon. Labels: «Logg økt», «Bla i historikken», «Analyser perioden», «Planlegg uka», «Sett sammen gruppetimer», «Tilpass appen». Nav bar height increased to 56px to accommodate labels. Tooltip-based nav hints replaced by always-visible inline labels.
- **Exercise color token** — `--exercise: #7af2a4` (green), `--exercise-soft`, `--exercise-mid` added to `carbon-tokens.css`. Light mode override: `--exercise: #1a8c4e`. Available for all new Sett-sammen components.
- **«Sett sammen»-tab** — internal view name `"bibliotek"` → `"sett-sammen"` throughout `App.jsx` + `PageShell.jsx`. `onShowBibliotek` callback renamed to `onShowSetSammen`. Nav icon changed from `Book` to `Notebook`.

### Fixed
- **Template search debounce** — the Maler tab in Bibliotek was filtering on every keystroke (no debounce). Now uses the same 200ms debounce pattern as the Øvelser tab.

## [1.2.9] — 2026-05-14

### Fixed
- **HEIF/iPhone photo exceeds 5 MB limit** — root cause: Anthropic enforces the 5 MB limit on the **base64 string character count**, not the decoded byte size. A 3.75 MB decoded image produces ~5.25 M base64 chars and is rejected. `compressImage` was checking `b64.length * 0.75 <= 5 MB` (decoded bytes), which passes an image up to ~6.67 M base64 chars — well over the limit. Fixed by changing all checks to compare the base64 string length directly: `b64.length <= MAX_B64_CHARS`. Additionally fixed iOS-specific canvas source issue: `img.src = dataUrl` (large base64 data URL) causes iOS Safari to silently zero `naturalWidth`/`naturalHeight`, producing a blank canvas — fixed by using `URL.createObjectURL(file)` instead.
- **ALL CAPS exercise names** — when canvas quality reduction degrades the image enough for Claude to return exercise names in ALL CAPS, `normalizeExName` in `MuscleMap.jsx` converts fully-uppercase strings to title case before they reach the exercise list. Acts as a permanent safety net.
- **Anthropic error detail not shown** — the error message surfaced to the user read `data?.error?.message`, but the Anthropic API returns the detail in `data.detail` (string). Fixed to read `data.detail || data?.error?.message`.
- **"Siste økt" showing empty despite a session existing** — `fetchLastSession` in `db.js` used `.maybeSingle()` which sends PostgREST `Accept: application/vnd.pgrst.object+json`. PostgREST returns 406 when multiple rows exist even with `limit=1` (the 406 check precedes limit application). `.maybeSingle()` silently converts 406 to `{ data: null, error: null }`. Fixed by removing `.maybeSingle()` and using `data?.[0] ?? null` on a plain array query.
- **Slow app load after gym-wide templates deploy** — `onAuthStateChange` in `App.jsx` called `ensureGymMembership()` and `ensureDisplayName()` on every Supabase auth event (INITIAL_SESSION, TOKEN_REFRESHED, etc.), causing 3–4 redundant DB upserts per page load. These calls now only fire on `SIGNED_IN` events.

## [1.2.8] — 2026-05-14

### Added
- **Gym-wide shared templates and exercise library** — `session_templates` and `exercise_library` are now fully shared across co-instructors at the same gym. Any instructor can create, edit, rename, and delete any template or exercise. `user_id` is retained as "created by" for attribution only. Creator name ("Av [name]") is shown on template cards and exercise rows in Bibliotek when the item was created by a colleague. Bibliotek "Mine maler" tab renamed to "Maler".
- **RLS migration (`gym_wide_templates_and_exercises`)** — replaced `auth.uid() = user_id` all-ops policies on `session_templates`, `session_template_exercises`, and `exercise_library` with gym-aware policies using the same-gym `user_gyms` EXISTS subquery pattern already used for sessions. INSERT still requires `auth.uid() = user_id`; SELECT/UPDATE/DELETE allow any co-instructor at the same gym.

### Note
Editing an exercise's muscle mapping does **not** retroactively update historical session data. `muscle_activations` rows are permanent snapshots written at log time with no FK to `exercise_library`.

## [1.2.7] — 2026-05-13

### Developer

- **Reliable SWA staging environment cleanup (#169)** — the close-PR workflow now retries the `action: "close"` step once on failure. A single transient Azure API error had left a stale staging environment alive (2026-05-12), filling one of the three available slots and blocking deploys. The retry catches transient failures automatically; a double failure still requires manual portal cleanup.

## [1.2.6] — 2026-05-13

### Fixed
- **Exercise list missing in History on mobile** — when a day with a single session was loaded, `loadSession` auto-expanded it by setting `expandedIds` but never called `initSessionEdit`. The body map rendered correctly (reads directly from raw session data) but the exercise list stayed hidden because `edit.exercises` was `undefined`. Fixed by calling `initSessionEdit` alongside `setExpandedIds` in the single-session auto-expand branch.

### Developer

- **Supabase Data API grant audit (#167)** — audited all 14 public schema tables against Supabase's upcoming change (explicit GRANTs required from Oct 30 2026). All existing tables confirmed to have full grants for `anon`, `authenticated`, and `service_role` — no action needed on existing schema. Added migration hygiene section to `CLAUDE.md` documenting the required `GRANT` + `ALTER TABLE … ENABLE ROW LEVEL SECURITY` boilerplate for any future table.

## [1.2.5] — 2026-05-13

### Fixed
- **Image analysis broken (400 error)** — `CLAUDE_MODEL_VISION` was set to `claude-opus-4-5`, which has been retired by Anthropic. Switched vision to `claude-sonnet-4-6` (same model as text recommendations) — sufficient for OCR + JSON extraction and significantly cheaper than Opus. API allowlist simplified to a single entry.

### Added
- **Instructor filter on Report** — the report page now includes a fourth filter row (instructor display names) when sessions from more than one co-instructor are present in the selected period. Default is all instructors (empty selection = no filter), consistent with the existing weekday and session-type filter pattern. `fetchSessionsForReport` now joins `trainer_id` and `profiles(display_name)` so instructor identity is available client-side without an extra query.
- **Auto-set display name on login** — `ensureDisplayName()` in `db.js` runs alongside `ensureGymMembership()` on every auth state change. If the user's `profiles.display_name` is null, it is automatically set to the prefix before `@` in their email address. This ensures the instructor filter always has a meaningful label for every user without requiring manual action in Settings.

## [1.2.4] — 2026-05-12

### Fixed
- **Dark mode skeleton flash on History navigation (#164)** — `SkeletonPlaceholder` and `AccordionSkeleton` were rendering with light-mode colours (`--cds-skeleton-background: #e8e8e8`) even in dark mode (g100). Root cause: Carbon's compiled CSS sets dark skeleton token overrides under the `.cds--g100` class selector, but the app only applies `data-theme="g100"` on `<html>` — never the class. Added explicit `--cds-skeleton-background: #393939` and `--cds-skeleton-element: #525252` overrides to the `[data-theme="g100"]` block in `carbon-tokens.css`, matching Carbon's official g100 token values.

## [1.2.3] — 2026-05-11

### Added
- **First-login intro guide (#162)** — a 5-slide Carbon `Modal` (`passiveModal`) appears automatically for new users when `wl-intro-seen` is not set in localStorage. Each slide shows a 64px Carbon icon (`Camera`, `RecentlyViewed`, `Analytics`, `EventSchedule`, `Book`), a `PageHeading` title, and a body paragraph. Navigation: ghost "Hopp over" (any step) closes and sets the key; secondary "Forrige" + primary "Neste" step through slides 1–5; "Kom i gang" on the final slide closes and sets the key; the close (×) button also sets the key. A step indicator ("Steg N av 5") updates on every step; a replay hint appears on step 5 only. Settings → Om appen gains a ghost "Vis introduksjonsguide" button (`Information` icon) that clears `wl-intro-seen` and re-opens the modal from step 1. All strings translated in `nb`, `en`, and `fa`.
- **Theme FOUC fixes** — eliminated flash-of-unstyled-content on initial page load: (1) a blocking inline script in `index.html` sets `data-theme` on `<html>` before the JS bundle executes; (2) `ThemeProvider` also sets `data-theme` synchronously inside its `useState` lazy initialiser so the attribute is present before React's first commit.

## [1.2.2] — 2026-05-10

### Developer

- **React hook lint fixes (#159 #160)** — Resolved all `react-hooks/exhaustive-deps` and `react-compiler` warnings. Real refactors: `History` auto-expand logic moved into `loadSession` (eliminates a cascading setState); `MuscleMap` date-reset moved to the two dispatch sites that enter the confirm step; `Report` cache-lookup `useEffect` relocated below the `useMemo` values it reads (fixes forward-references to `muscleCounts`, `sessionCount`, `untrainedMuscles`); `Home` tooltip clamping now stores `maxLeft` in state at event-handler time instead of reading `weekStripRef.current` during render. Remaining five patterns (`Bibliotek` pagination reset, `Planlegger` async plan fetch, `Report` loading-state initialisation, `MuscleMap` template-preload callback) suppressed with targeted `eslint-disable` comments explaining why each omission is intentional.

## [1.2.1] — 2026-05-10

### Added
- **Nav tooltips (#155)** — hovering or focusing any navigation icon on desktop now shows a tooltip with the full translated label (works in all three locales). Implemented via CSS `::after` on `NavBtn` so only one tooltip is ever visible at a time. Mobile layout is unchanged. Settings → Utseende has a new "Vis navigasjonsforklaringer" toggle (default: on) that disables tooltips immediately and persists to `localStorage` key `wl-nav-hints` for users who already know the app. `useNavHints()` hook exported from `PageShell.jsx` for shared state across Settings and the nav bar.

### CI
- **GitHub Actions upgraded to v5 (#158)** — `actions/checkout`, `actions/setup-node`, and `actions/cache` bumped from `@v4` to `@v5` (native Node.js 24 support). Removed `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` workaround.

## [1.2.0] — 2026-05-07

### Open source
- **Repository is now public** — MIT licensed, with `CONTRIBUTING.md`, GitHub issue templates (feature + bug), and all instance-specific infrastructure identifiers removed from the codebase.

### Fixed
- **Gym class name deduplication** — `sportySync.js` now strips quoted annotations (e.g. `"SVART TRØYE"`) from class names before storing them, preventing duplicate filter chips in Report when sporty.no temporarily appends labels to existing class names. A one-time SQL migration cleaned all existing rows. Handles both straight (`"`) and curly (`"`) double quotes generically.

### Changed
- **UI polish — post-#147 review (#147)** — ten UX fixes across History, Bibliotek, Planlegger, MuscleMap, TemplatePicker, and Login:
  - **History** — removed username display from exercise edit box; "Legg til øvelse manuelt" and "Last opp nytt bilde" unified as sibling ghost buttons below the exercise list; session header chips capped at 2 visible + `+N` overflow to prevent title overflow; library pre-fetched on mount so autocomplete is always ready; gym-class conflict warning wording clarified
  - **Bibliotek** — "Maler" tab renamed to "Mine maler"; Snarveier carousel removed (caused horizontal overflow); `used_at` date removed from template cards
  - **TemplatePicker** — "Sist brukt" date removed from template cards
  - **Planlegger** — "Lagre plan" and "Fjern uke" buttons removed; plan now auto-saves on every add/remove and auto-deletes when all slots are cleared
  - **MuscleMap** — "NESTE STEG / Analyser perioden" CTA card removed from result step; "TIPS" callout removed from upload step
  - **Login** — daily quotes hardcoded to English (language is unknown before sign-in)
  - **Carbon Select** — global CSS fix strengthened to also force `background-color: var(--cds-field-01)` in default state, preventing white-on-white in all layer contexts

### Added
- **Email templates (#148)** — Supabase auth emails (magic link, invite, email confirmation) are now version-controlled in `supabase/templates/`. Branded with Workout Lens name, `workout.umulig.org` domain, magenta CTA button, and Carbon-matching dark colour scheme. Apply to the remote project with `supabase link` + `supabase config push`.
- **Joint class history (#138)** — expanding a gym-linked session in History now shows a "Kolleger i denne klassen" panel listing co-instructor sessions for the same class slot. Display name (or "Instruktør" fallback) is shown as a header per colleague, with their exercise list below. Fetched lazily on first expand and cached per `gym_calendar_id`. New RLS policy on `sessions` allows same-gym users to read each other's sessions. `fetchClassHistory(gymCalendarId)` added to `db.js`.
- **Display name (#141)** — `display_name text` column (max 50 chars) added to `profiles`. Settings → Konto section now has a `TextInput` to set/update a display name, with success/error feedback. Same-gym RLS policy on `profiles` allows co-instructors to read each other's `display_name`. `fetchDisplayName()` and `updateDisplayName()` added to `db.js`. Display name is shown next to colleague sessions in the joint class history view.
- **GDPR transparency note** — Settings → Konto now shows an informational paragraph explaining that all logged sessions are visible to co-instructors at the same gym, in line with the app's purpose.

### Changed
- **Session visibility removed** — the `visibility` / "Del med andre instruktører" toggle has been removed entirely. All sessions logged under a gym are now always visible to co-instructors at the same gym (the intended behaviour). The Supabase RLS policy on `sessions` was updated to remove the `visibility = 'shared'` filter; all existing private sessions were backfilled to shared. `updateSessionVisibility` removed from `db.js`.
- **History — always-on inline editing** — sessions are always editable when expanded; the "Rediger økt" button and locked read state are gone. A sticky Save / Discard / Reupload bar appears automatically when any change is detected (dirty state). Fixes the filter+edit bug where an active muscle filter prevented entering edit mode. The muscle groups section (redundant with the body map) is removed from the expanded view. "Re-analyser" renamed to "Last opp nytt bilde".
- **Edit panel visual consistency (#147)** — all edit/entry containers now share the same surface treatment: `var(--cds-layer-02)` background + 2px `var(--accent)` top border + `SectionLabel` with icon header. Applies to `ExerciseForm`, `TemplateSessionEditor`, and the MuscleMap confirm step. Cancel buttons changed to `kind="ghost"`, errors shown as `InlineNotification kind="error"` above the button bar. `SectionLabel` now accepts a `renderIcon` prop.
- **Template use flow** — "Lagre mal" is no longer shown in the template use flow (Planlegger → Bruk økt). A step indicator ("Steg 2 av 3 — Tilpass øvelser") is shown instead. Template name input replaced with Carbon `TextInput`.
- **Report — restructured layout** — the "Ikke trent" gap card is now positioned after the muscle frequency table, directly above the recommendation button, acting as a visual header for the recommendation section. The post-recommendation body map (`BodySVG`) is removed. Fallback messages added: if all primary muscles are trained the gap section shows a success message; if some are secondary-only only those are listed.
- **Library — scaling** — the Snarveier carousel is capped at 6 items with a "Se alle →" link to the templates tab. Load-more buttons (20 exercises / 12 templates per batch) appear when lists exceed their threshold. A search input is added to the templates tab.
- **Test suite — better coverage, less noise** — replaced low-value assertions (one-line constant checks, per-model `it`s, a duplicated prompt assertion) with behavioural tests, and filled the largest gaps in `utils.js` (date helpers `toIsoDate`/`toWeekIso`/`weekIsoToMonday`/`isoWeekMonday`, `isInvalidNum`, `extractMuscles`, `getIntlLocale`, `inferMusclesFromName`) and `prompts.js` (`buildMuscleInferencePrompt`). Added a fake-timer test for `checkRateLimit` window expiry. Net: 60 → 82 tests; `utils.js` line coverage ~30% → ~80%, `prompts.js` to 100% statements.

### Infrastructure
- **Temporal roles table (#140)** — replaced the `user_gyms.role` text placeholder with a proper `roles` table (`user_id`, `sporty_business_unit_id`, `name`, `title`, `valid_from`, `valid_to`). Active roles derived via date range (`valid_from <= today AND (valid_to IS NULL OR valid_to >= today)`). Existing placeholder data migrated. `fetchActiveRoles(buId)` added to `db.js`. RLS restricts all operations to the owning user.

---

## [1.2.0-rc.8] — 2026-05-06

### Changed
- **Planlegger — simpler "Ikke trent denne uken" chip list** — replaces the dual body-map / counters UI introduced in rc.7. The planner now shows a single `flexWrap: wrap` row of mono pill chips (History-style: `var(--r-pill)`, `var(--border-subtle-wl)`, `var(--text-muted-wl)`, `var(--cds-font-mono)` 11px) listing the muscle groups not yet trained in logged sessions for the visible ISO week. When all 17 are trained, a single mono message replaces the chip row. The "Projisert dekning" heatmap and Forslag card are unchanged; the second body map, mono counters, and `AccentChip` row are removed. Translation keys `trainedThisWeek` / `trainedCount` / `weekSessionCount` removed; `notTrainedThisWeek` and `allMusclesTrained` added in nb/en/fa. `weekSessions` state and `fetchSessionsForWeek(weekIso)` helper retained — the chip list is derived via `extractMuscles` across the week's sessions. (#143)

---

## [1.2.0-rc.7] — 2026-05-06

### Added
- **Planlegger — actual vs projected weekly coverage** — the planner page now renders a "Trent denne uken" body map above the existing "Projisert dekning" map. The new map highlights muscles trained in real logged sessions for the visible ISO week (primary as solid green, secondary as blue diagonal stripes), with mono counters (`N av 17 muskler trent · M økter denne uken`) and a wrap row of `AccentChip`s listing untrained muscles. Week navigation chevrons update both maps. Future weeks naturally show 0 trained. Translated to nb/en/fa (RTL safe). New `fetchSessionsForWeek(weekIso)` helper in `db.js` (replaces the previous one-purpose `fetchThisWeekSessions`, which now delegates to it). Also added `activation_type` to the muscle_activations select so `extractMuscles` works correctly. (#143)

---

## [1.2.0-rc.6] — 2026-05-06

### Changed
- **Nav reorder** — Bibliotek and Planlegger swapped; new order: Camera → Historikk → Rapport → Planlegger → Bibliotek → Innstillinger (library now sits next to settings)

---

## [1.2.0-rc.5] — 2026-05-06

### Changed
- **Removed `date-fns` dependency** — replaced all usages (`format`, `parseISO`, `startOfISOWeek`, `endOfISOWeek`, `addDays`) with two small native helpers (`toIsoDate`, `isoWeekMonday`) added to `utils.js`; bundle and lockfile updated

---

## [1.2.0-rc.4] — 2026-05-06

### Infrastructure
- **Supabase redirect URL allowlist for PR previews** — added wildcard `https://<your-swa-subdomain>-*.westeurope.7.azurestaticapps.net` to Supabase Authentication → URL Configuration; magic-link emails now redirect back to the correct PR preview environment automatically (#135)

---

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
