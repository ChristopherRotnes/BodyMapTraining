-- Issue #237: least-privilege anon grants + duplicate RLS policy removal.
--
-- Part 1: Revoke TRUNCATE, TRIGGER, and REFERENCES from anon on all public tables.
--   TRUNCATE bypasses RLS at the PostgreSQL level; TRIGGER and REFERENCES are never
--   used by PostgREST. Standard SELECT/INSERT/UPDATE/DELETE grants are untouched.
--
-- Part 2: Drop legacy {public} ALL policies on sessions, session_exercises, and
--   muscle_activations. Each is an exact duplicate of a {authenticated} replacement
--   added later. PostgreSQL ORs multiple permissive policies — the {public} copies
--   never actually granted anon access (every USING checks auth.uid(), which is null
--   for unauthenticated requests) but add noise and evaluation overhead.

-- Part 1 — revoke excess anon privileges
REVOKE TRUNCATE, TRIGGER, REFERENCES
  ON public.exercise_library,
     public.gym_calendar,
     public.muscle_activations,
     public.profiles,
     public.recommendation_cache,
     public.roles,
     public.session_exercises,
     public.session_template_exercises,
     public.session_templates,
     public.sessions,
     public.training_groups,
     public.user_gyms,
     public.week_plan_days,
     public.week_plans
  FROM anon;

-- Part 2 — drop legacy duplicate {public} policies
-- sessions: superseded by "Users can manage their own sessions" ({authenticated} ALL)
DROP POLICY IF EXISTS "Trenere ser egne økter" ON public.sessions;

-- session_exercises: superseded by "Users can manage exercises in their sessions" ({authenticated} ALL)
DROP POLICY IF EXISTS "Tilgang via session" ON public.session_exercises;

-- muscle_activations: superseded by "Users can manage activations in their sessions" ({authenticated} ALL)
DROP POLICY IF EXISTS "Tilgang via session_exercise" ON public.muscle_activations;
