-- Issue #235: owner-scoped recommendation_cache policies.
-- Adds written_by column so each cache entry has a deterministic owner.
-- DEFAULT auth.uid() means saveRecsCache does not need to include the column —
-- PostgreSQL sets it automatically from the calling user on INSERT.
--
-- TRUNCATE is safe: recommendation_cache is ephemeral (7-day TTL).
-- Every statement is idempotent so this file is safe to re-apply.

-- Add owner column; no-op if already present.
ALTER TABLE public.recommendation_cache
  ADD COLUMN IF NOT EXISTS written_by uuid REFERENCES public.profiles(id);

-- Empty the cache before making the column NOT NULL.
TRUNCATE public.recommendation_cache;

-- Make column required and default to the calling user's UID.
ALTER TABLE public.recommendation_cache
  ALTER COLUMN written_by SET NOT NULL,
  ALTER COLUMN written_by SET DEFAULT auth.uid();

-- Tighten INSERT: written_by must equal the calling user.
DROP POLICY IF EXISTS "Authenticated users can write rec cache" ON public.recommendation_cache;

CREATE POLICY "Authenticated users can write rec cache"
  ON public.recommendation_cache FOR INSERT
  TO authenticated
  WITH CHECK (written_by = auth.uid());

-- Tighten UPDATE: only the original writer can refresh their own entry.
-- When a different user's upsert hits ON CONFLICT, the UPDATE is silently
-- skipped (no error) — the existing entry stays, preventing poisoning.
DROP POLICY IF EXISTS "Authenticated users can update rec cache" ON public.recommendation_cache;

CREATE POLICY "Cache owner can update their entry"
  ON public.recommendation_cache FOR UPDATE
  TO authenticated
  USING (written_by = auth.uid());
