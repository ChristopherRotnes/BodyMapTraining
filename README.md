# Muskelkart

A Norwegian workout-logging app. Photograph a handwritten training program from a gym whiteboard, and the app identifies which muscles you trained, visualises them on a body map, and recommends what to train next.

## How it works

1. **Upload** a photo of the whiteboard workout program
2. **Claude Vision** reads the handwriting and returns a structured list of exercises with muscle IDs
3. **Confirm** — toggle, rename, or adjust sets/reps before saving
4. **Muscle map** — front and back body SVG with glow highlights (yellow = primary, blue = secondary)
5. **Recommendations** — ask Claude what to train next based on untrained muscle groups

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite |
| Auth | Supabase Auth (magic link) |
| Database | Supabase (Postgres) |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Hosting | Netlify |

## Local development

```bash
cd app
npm install
npm run dev
```

### Environment variables

Create `app/.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Status

| Feature | Status |
|---|---|
| Image upload (drag & drop, camera) | ✅ Done |
| Claude Vision analysis | ✅ Done |
| Exercise confirm + edit step | ✅ Done |
| Muscle map SVG with tooltips | ✅ Done |
| Magic link login | ✅ Done |
| Next-session recommendations | ✅ Done |
| Session persistence (Supabase) | 🔧 In progress |
| Workout history view | 🔧 In progress |
| Period / volume report | 🔧 In progress |
| Netlify Functions (server-side API key) | 🔧 In progress |

## Deploying to Netlify

- Build command: `npm run build` (run from `app/`)
- Publish directory: `app/dist`
- Set all three environment variables above in Netlify site settings
- Add your Netlify domain to Supabase Auth → URL Configuration → Redirect URLs
