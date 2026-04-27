Give me a "start of day" briefing for this project. Run all of these steps in parallel where possible:

1. Run `git log --oneline -10` to see recent commits
2. Run `git status` to see any pending or uncommitted changes
3. Read `CLAUDE.md` for project context
4. Read `supabase/schema.sql` if it exists
5. List files in `app/src/` to get a current picture of the codebase structure

Then synthesize everything into a concise briefing with these sections:

**Status** — one sentence on where the project stands overall

**Recent work** — bullet list of what was done recently (from git log), written as outcomes not commit messages

**Pending changes** — any uncommitted or staged work that needs attention

**What's not built yet** — key gaps from CLAUDE.md "What is NOT yet built" section, prioritised by what makes sense to tackle next

**Suggested focus for today** — 1-3 concrete next tasks, ordered by impact, with enough detail to start immediately

Keep it tight — this is a daily standup, not a full report. No fluff.
