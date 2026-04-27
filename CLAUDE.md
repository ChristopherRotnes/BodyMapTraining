# BodyMapTraining — CLAUDE.md

## Project overview
**Muskelkart** — a Norwegian workout-logging app. User photographs a handwritten training program from a gym whiteboard (sporty.no format), the app analyses the image via Claude Vision, displays which muscles were trained on a body figure, and gives next-session recommendations.

## Tech stack
- **Frontend:** React 19 + Vite (in `app/`)
- **Auth + DB:** Supabase (magic-link login, Supabase Auth)
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`) — currently called direct from client
- **Hosting:** Netlify (not yet deployed)
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
  .env.local                 # Supabase URL + anon key (NOT committed)
```

## Environment variables needed
| Variable | Where used |
|---|---|
| `VITE_SUPABASE_URL` | Supabase client |
| `VITE_SUPABASE_ANON_KEY` | Supabase client |
| `VITE_ANTHROPIC_API_KEY` | Claude API calls (currently client-side — to be moved to Netlify Functions) |

## Muscle ID system (17 total)
```
chest, shoulders_front, shoulders_side, biceps, forearms, abs, obliques, quads, calves
traps, rear_delts, lats, triceps, lower_back, glutes, hamstrings, calves_back
```
Each has a `view` (front/back) and Norwegian `label` in the `MUSCLES` object in MuscleMap.jsx.

## Current state (implemented)
- Image upload (drag & drop, file picker, camera)
- Claude Vision analysis → structured JSON with exercise + muscle IDs
- Confirm step (toggle, edit, adjust sets/reps, add manually)
- Muscle map display (SVG front+back, glow highlights, hover tooltips)
- Next-session recommendation via Claude API

## What is NOT yet built
- **Supabase tables** — no schema exists yet (`sessions`, `exercises`, `muscle_activations`)
- **Session persistence** — no saving of completed workouts
- **History view** — past sessions with muscle maps
- **Period/volume report** — aggregate muscle coverage + undertrained muscles
- **Netlify Functions** — API key must be moved server-side before deploy

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
- No backend currently — all API calls are from the browser (acceptable for local dev, must change before deploy)

## Known limitations
- SVG body is geometrically simplified, not anatomically precise
- Volume (sets × reps) is logged but not used in muscle analysis
- Recommendations are contextual per session, not based on accumulated history (will improve with data)
- No error handling for API rate limits

## Netlify deploy notes
- Set environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ANTHROPIC_API_KEY`
- Build command: `npm run build` (from `app/` dir)
- Publish directory: `app/dist`
- Add Supabase URL to allowed redirect URLs in Supabase Auth settings
