# Contributing

Thanks for your interest in Workout Lens. This document covers everything you need to run the project locally and submit changes.

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 22.x LTS | Use [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm) |
| Azure Static Web Apps CLI | latest | `npm install -g @azure/static-web-apps-cli` |

## One-time setup

```bash
# Install frontend dependencies
cd app && npm install

# Install API dependencies
cd api && npm install

# Copy and fill in the env files
cp app/.env.local.example app/.env.local                             # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
cp app/api/local.settings.json.example app/api/local.settings.json  # ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY, SUPABASE_ANON_KEY
```

You will need:
- A [Supabase](https://supabase.com) project with the schema from `supabase/migrations/`
- An [Anthropic](https://console.anthropic.com) API key

## Running locally

Start both the Vite dev server and the Azure SWA emulator:

```bash
# Terminal 1 — Vite
cd app && npm run dev

# Terminal 2 — SWA emulator (proxies /api/* to local Azure Functions)
swa start http://localhost:5173 --api-location app/api
```

Open **http://localhost:4280** — not port 5173. The API routes (`/api/claude`, `/api/sporty-sync`) only work through the SWA proxy.

> On Windows, a `dev.ps1` script can automate this. See the local development section in CLAUDE.md.

## Running tests

```bash
cd app
npm test           # one-shot
npm run test:ci    # one-shot with coverage
npm run test:watch # watch mode
```

The test suite is pure-logic (reducers, date helpers, validators, prompt builders, API guards) — no DOM, no live Supabase. It runs in under 2 seconds.

## Branch and commit conventions

| Branch type | Pattern | Example |
|---|---|---|
| Feature | `feat/<short-description>` | `feat/weekly-planner` |
| Bug fix | `fix/<short-description>` | `fix/history-date-parse` |
| Docs / chore | `docs/<topic>` or `chore/<topic>` | `docs/contributing` |

Commit messages follow the pattern: `type: description (#issue-number)`

Examples:
```
feat: add weekly training planner (#59)
fix: resolve muscle hover tooltip collision (#18)
docs: update CLAUDE.md for recommendation cache (#150)
```

## Submitting a pull request

1. Fork the repo and create a branch from `master`
2. Make your changes — keep scope tight and linked to one issue
3. Run `npm test` and confirm all tests pass
4. Open a PR against `master` with the issue number in the title
5. Fill in the PR template (Summary + test plan)

Issues use a structured format — see the issue templates in `.github/ISSUE_TEMPLATE/` or the issue format section in README.md.
