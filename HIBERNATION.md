# BodyMapTraining — Hibernation Status

**Hibernation initiated:** 2026-09-04  
**Status:** Project paused — all CI/CD and scheduled tasks disabled

## What's been disabled ✓

### GitHub Actions (via `if: false`)
- ✓ `.github/workflows/ci.yml` — CI builds and Azure SWA deployments
- ✓ `.github/workflows/audit.yml` — Weekly npm audits
- ✓ `.github/workflows/cleanup-staging.yml` — PR staging cleanup

### Azure Functions timers (via `if (false)`)
- ✓ `app/api/sportySync.js` — `sportySyncTimer` (04:00, 11:00, 14:00, 22:00 UTC daily)
- ✓ `app/api/recsCacheCleanup.js` — `recsCacheCleanup` (03:00 UTC every Sunday)

## What's still running
- **Azure Static Web Apps** — App still accessible at current URL (no cost if no traffic)
- **Azure Functions** — API still callable via HTTP (manual, not automated)
- **Supabase** — Database intact, no changes made
- **GitHub** — Repo accessible, code intact

## What needs manual action in Azure Portal

1. **Optional: Stop the Azure Static Web Apps instance**
   - Azure Portal → Static Web Apps → select "White Island" → Settings → Stop
   - Or delete if unneeded (non-reversible without backup)

2. **Optional: Stop the Azure Functions instance**
   - Azure Portal → Function App → select the app → Stop
   - Or scale down to free tier if desired

3. **Monitor costs**
   - Static Web Apps has minimal idle cost (storage only)
   - Functions have no cost if not invoked (already stopped via code)
   - Check Azure Cost Management for current state

## To reactivate

### Step 1: Revert code changes
```powershell
# On master branch:
git log --oneline | grep hibernation  # Find the commit
git revert <commit-hash>
git push origin master
```

### Step 2: Re-enable Azure Portal resources
- If stopped: Azure Portal → Start the Static Web Apps and Functions instances
- GitHub Actions will automatically re-run on next push

### Step 3: Verify
```powershell
# Check that workflows are running:
gh run list --limit 5

# Test the app:
# Open the app URL in browser
# Check sporty sync health: GET https://<app>/api/sporty-health
```

## Cost impact
- **Storage:** ~$0.50/month (Supabase DB at rest, Azure storage)
- **No compute costs** while paused (all functions disabled)
- **Projected savings:** ~$50-100/month vs. running

## Recovery time
- Code changes: ~10 minutes (git revert + push)
- Azure Portal: ~5 minutes (stop/start resources)
- GitHub Actions: ~2 minutes (re-run CI)
- **Total:** ~20 minutes to full reactivation

---

**Last updated:** 2026-09-04  
**Updated by:** Claude Code (hibernation automation)
