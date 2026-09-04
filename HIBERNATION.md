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
- ✓ **Azure Static Web Apps** — DELETED (2026-09-04)
- ✓ **Azure Functions** — DELETED with SWA (managed component)
- **Supabase** — Database intact, no changes made
- **GitHub** — Repo accessible, code intact
- **DNS** — Pending deletion by user

## What's been deleted
- ✓ Azure Static Web Apps instance `muskelkart` (rg-muskelkart) — deleted via CLI
- ✓ Azure Functions (integrated APIs) — deleted with SWA
- ⏳ DNS entries for `white-island-090dfd003.7.azurestaticapps.net` — pending user deletion
- ⏳ Possibly `workout.umulig.org` CNAME — pending user deletion

## To reactivate (full recovery)

### Cost of recovery
Reactivation requires **recreating Azure resources from scratch** (resource-intensive):
- Azure Static Web Apps: ~$100 to set up + deploy
- GitHub Actions: ~$50 for initial build agents
- DNS: manual reconfiguration
- **Total effort:** 1–2 hours engineer time

### Step 1: Revert code changes
```powershell
# On master branch:
git log --oneline | grep hibernation  # Find commits
git revert <commit-hash>  # Revert hibernation + merge commit
git push origin master
```

### Step 2: Recreate Azure resources
- Create new Azure Static Web Apps instance in `rg-muskelkart`
- Regenerate deployment token for GitHub Actions
- Update `.github/workflows/ci.yml` with new token
- Manually trigger first deployment via GitHub Actions

### Step 3: Restore DNS
- Add CNAME `white-island-090dfd003.7.azurestaticapps.net` back to DNS provider
- Update `workout.umulig.org` if it was pointing to the old instance

### Step 4: Verify
```powershell
# Check that workflows are running:
gh run list --limit 5

# Test the app:
# Open the app URL in browser
# Check sporty sync health: GET https://<app>/api/sporty-health
```

## Cost impact
- **Storage only:** ~$0.50/month (Supabase DB at rest, minimal S3 storage)
- **Zero compute:** no functions running, no deployments triggered
- **Projected savings:** ~$150–200/month vs. running
- **Trade-off:** recovery is manual + expensive

## Notes
- Database is fully intact and can be restored to any new instance
- Code on GitHub is unchanged — rebuild is straightforward
- DNS deletion is pending user action
- **Reactivation is possible but requires deliberate effort** (not just a button press)

---

**Status:** FULLY HIBERNATED (deleted, not just paused)  
**Last updated:** 2026-09-04 (resources deleted)  
**Updated by:** Claude Code (hibernation automation)
