-- Baseline schema snapshot for Workout Lens.
--
-- This migration was added retroactively to allow Supabase preview branches and
-- local `supabase db reset` to work. All previous schema changes were applied
-- directly to production without migration files.
--
-- Every statement uses IF NOT EXISTS / CREATE OR REPLACE so the file is safe to
-- apply to the live database as a no-op.
--
-- Delta migrations that run AFTER this file:
--   20260514_add_template_type_to_session_templates.sql
--   20260515_security_quick_wins.sql
--   20260515_rec_cache_ownership.sql
-- This baseline therefore does NOT include: session_templates.template_type,
-- recommendation_cache.written_by, or the owner-scoped rec-cache policies.
-- Those are introduced by the delta migrations above.

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── profiles ──────────────────────────────────────────────────────────────────
-- Mirror of auth.users; created automatically by handle_new_user() trigger.
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     text,
  role          text NOT NULL DEFAULT 'trainer'
                  CHECK (role IN ('admin', 'trainer')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  display_name  text CHECK (char_length(display_name) <= 50)
);

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.profiles TO anon, authenticated, service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Brukere ser sin egen profil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Brukere oppdaterer sin egen profil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Same-gym users can read profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_gyms ug1
    JOIN user_gyms ug2 ON ug1.sporty_business_unit_id = ug2.sporty_business_unit_id
    WHERE ug1.user_id = auth.uid() AND ug2.user_id = profiles.id
  ));

-- ── training_groups ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.training_groups TO anon, authenticated, service_role;
ALTER TABLE public.training_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Trenere ser egne grupper"
  ON public.training_groups FOR ALL
  USING (trainer_id = auth.uid());

-- ── gym_calendar ──────────────────────────────────────────────────────────────
-- Gym class schedule synced from sporty.no by sportySync.js (3× daily).
CREATE TABLE IF NOT EXISTS public.gym_calendar (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sporty_id   integer NOT NULL UNIQUE,
  name        text NOT NULL,
  start_time  timestamptz NOT NULL,
  end_time    timestamptz NOT NULL,
  instructor  text,
  cancelled   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.gym_calendar TO anon, authenticated, service_role;
ALTER TABLE public.gym_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Authenticated users can read gym_calendar"
  ON public.gym_calendar FOR SELECT
  TO authenticated
  USING (true);

-- ── user_gyms ─────────────────────────────────────────────────────────────────
-- Links users to a Sporty business unit (gym). One row per user-gym pair.
CREATE TABLE IF NOT EXISTS public.user_gyms (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sporty_business_unit_id integer NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sporty_business_unit_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.user_gyms TO anon, authenticated, service_role;
ALTER TABLE public.user_gyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "user_gyms self select"
  ON public.user_gyms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "user_gyms self insert"
  ON public.user_gyms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "user_gyms self delete"
  ON public.user_gyms FOR DELETE
  USING (auth.uid() = user_id);

-- ── sessions ──────────────────────────────────────────────────────────────────
-- One logged workout per row.
CREATE TABLE IF NOT EXISTS public.sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  training_group_id uuid REFERENCES public.training_groups(id) ON DELETE SET NULL,
  session_date     date NOT NULL DEFAULT CURRENT_DATE,
  image_url        text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  gym_calendar_id  uuid UNIQUE REFERENCES public.gym_calendar(id),
  visibility       text NOT NULL DEFAULT 'shared'
                     CHECK (visibility IN ('shared', 'private'))
);

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.sessions TO anon, authenticated, service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Trenere ser egne økter"
  ON public.sessions FOR ALL
  USING (trainer_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can manage their own sessions"
  ON public.sessions FOR ALL
  TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY IF NOT EXISTS "Same-gym users can read sessions"
  ON public.sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_gyms ug1
    JOIN user_gyms ug2 ON ug1.sporty_business_unit_id = ug2.sporty_business_unit_id
    WHERE ug1.user_id = auth.uid() AND ug2.user_id = sessions.trainer_id
  ));

-- ── session_exercises ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_exercises (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  name         text NOT NULL,
  standard_name text,
  sets         integer,
  reps         integer,
  position     integer,
  created_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.session_exercises TO anon, authenticated, service_role;
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Tilgang via session"
  ON public.session_exercises FOR ALL
  USING (EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = session_exercises.session_id
      AND sessions.trainer_id = auth.uid()
  ));

CREATE POLICY IF NOT EXISTS "Users can manage exercises in their sessions"
  ON public.session_exercises FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = session_exercises.session_id
      AND sessions.trainer_id = auth.uid()
  ));

-- ── muscle_activations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.muscle_activations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id uuid NOT NULL REFERENCES public.session_exercises(id) ON DELETE CASCADE,
  muscle_id           text NOT NULL,
  activation_type     text NOT NULL CHECK (activation_type IN ('primary', 'secondary')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.muscle_activations TO anon, authenticated, service_role;
ALTER TABLE public.muscle_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Tilgang via session_exercise"
  ON public.muscle_activations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM session_exercises se
    JOIN sessions s ON s.id = se.session_id
    WHERE se.id = muscle_activations.session_exercise_id
      AND s.trainer_id = auth.uid()
  ));

CREATE POLICY IF NOT EXISTS "Users can manage activations in their sessions"
  ON public.muscle_activations FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM session_exercises
    JOIN sessions ON sessions.id = session_exercises.session_id
    WHERE session_exercises.id = muscle_activations.session_exercise_id
      AND sessions.trainer_id = auth.uid()
  ));

-- ── exercise_library ──────────────────────────────────────────────────────────
-- Gym-wide named exercises with default muscle maps. FK to profiles (not auth.users)
-- so PostgREST can traverse the profiles!user_id(display_name) join.
CREATE TABLE IF NOT EXISTS public.exercise_library (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name              text NOT NULL,
  primary_muscles   text[] NOT NULL DEFAULT '{}',
  secondary_muscles text[] NOT NULL DEFAULT '{}',
  default_sets      text,
  default_reps      text,
  created_at        timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.exercise_library TO anon, authenticated, service_role;
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Gym members select exercises"
  ON public.exercise_library FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_gyms ug1
    JOIN user_gyms ug2 ON ug2.sporty_business_unit_id = ug1.sporty_business_unit_id
    WHERE ug1.user_id = auth.uid() AND ug2.user_id = exercise_library.user_id
  ));

CREATE POLICY IF NOT EXISTS "Gym members insert exercises"
  ON public.exercise_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Gym members update exercises"
  ON public.exercise_library FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_gyms ug1
    JOIN user_gyms ug2 ON ug2.sporty_business_unit_id = ug1.sporty_business_unit_id
    WHERE ug1.user_id = auth.uid() AND ug2.user_id = exercise_library.user_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_gyms ug1
    JOIN user_gyms ug2 ON ug2.sporty_business_unit_id = ug1.sporty_business_unit_id
    WHERE ug1.user_id = auth.uid() AND ug2.user_id = exercise_library.user_id
  ));

CREATE POLICY IF NOT EXISTS "Gym members delete exercises"
  ON public.exercise_library FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM user_gyms ug1
    JOIN user_gyms ug2 ON ug2.sporty_business_unit_id = ug1.sporty_business_unit_id
    WHERE ug1.user_id = auth.uid() AND ug2.user_id = exercise_library.user_id
  ));

-- ── session_templates ─────────────────────────────────────────────────────────
-- Named, reusable workout skeletons. FK to profiles (not auth.users) — same
-- reason as exercise_library (PostgREST join traversal).
-- NOTE: template_type column is added by migration 20260514_add_template_type.
CREATE TABLE IF NOT EXISTS public.session_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order integer DEFAULT 0,
  used_at    timestamptz,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.session_templates TO anon, authenticated, service_role;
ALTER TABLE public.session_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Gym members select templates"
  ON public.session_templates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_gyms ug1
    JOIN user_gyms ug2 ON ug2.sporty_business_unit_id = ug1.sporty_business_unit_id
    WHERE ug1.user_id = auth.uid() AND ug2.user_id = session_templates.user_id
  ));

CREATE POLICY IF NOT EXISTS "Gym members insert templates"
  ON public.session_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Gym members update templates"
  ON public.session_templates FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_gyms ug1
    JOIN user_gyms ug2 ON ug2.sporty_business_unit_id = ug1.sporty_business_unit_id
    WHERE ug1.user_id = auth.uid() AND ug2.user_id = session_templates.user_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_gyms ug1
    JOIN user_gyms ug2 ON ug2.sporty_business_unit_id = ug1.sporty_business_unit_id
    WHERE ug1.user_id = auth.uid() AND ug2.user_id = session_templates.user_id
  ));

CREATE POLICY IF NOT EXISTS "Gym members delete templates"
  ON public.session_templates FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM user_gyms ug1
    JOIN user_gyms ug2 ON ug2.sporty_business_unit_id = ug1.sporty_business_unit_id
    WHERE ug1.user_id = auth.uid() AND ug2.user_id = session_templates.user_id
  ));

-- ── session_template_exercises ────────────────────────────────────────────────
-- Ordered exercise slots within a template. Name + muscles are a denormalised
-- snapshot — renaming the library source does not affect existing templates.
CREATE TABLE IF NOT EXISTS public.session_template_exercises (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id         uuid NOT NULL REFERENCES public.session_templates(id) ON DELETE CASCADE,
  library_exercise_id uuid REFERENCES public.exercise_library(id) ON DELETE SET NULL,
  name                text NOT NULL,
  primary_muscles     text[] NOT NULL DEFAULT '{}',
  secondary_muscles   text[] NOT NULL DEFAULT '{}',
  sets                text,
  reps                text,
  sort_order          integer DEFAULT 0
);

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.session_template_exercises TO anon, authenticated, service_role;
ALTER TABLE public.session_template_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Gym members access template exercises"
  ON public.session_template_exercises FOR ALL
  USING (EXISTS (
    SELECT 1 FROM session_templates st
    JOIN user_gyms ug1 ON ug1.user_id = auth.uid()
    JOIN user_gyms ug2 ON ug2.sporty_business_unit_id = ug1.sporty_business_unit_id
    WHERE st.id = session_template_exercises.template_id AND ug2.user_id = st.user_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM session_templates st
    JOIN user_gyms ug1 ON ug1.user_id = auth.uid()
    JOIN user_gyms ug2 ON ug2.sporty_business_unit_id = ug1.sporty_business_unit_id
    WHERE st.id = session_template_exercises.template_id AND ug2.user_id = st.user_id
  ));

-- ── roles ─────────────────────────────────────────────────────────────────────
-- Instructor tenure. Active = valid_from <= today AND (valid_to IS NULL OR valid_to >= today).
CREATE TABLE IF NOT EXISTS public.roles (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sporty_business_unit_id integer NOT NULL,
  name                    text NOT NULL DEFAULT 'instruktor',
  title                   text,
  valid_from              date NOT NULL DEFAULT CURRENT_DATE,
  valid_to                date,
  created_at              timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.roles TO anon, authenticated, service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "users see own roles"
  ON public.roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "users manage own roles"
  ON public.roles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── recommendation_cache ──────────────────────────────────────────────────────
-- Shared cache of Claude-generated exercise recommendations.
-- written_by column and owner-scoped policies are added by 20260515_rec_cache_ownership.
CREATE TABLE IF NOT EXISTS public.recommendation_cache (
  cache_key  text PRIMARY KEY,
  recs       jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.recommendation_cache TO anon, authenticated, service_role;
ALTER TABLE public.recommendation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Authenticated users can read rec cache"
  ON public.recommendation_cache FOR SELECT
  USING (auth.role() = 'authenticated');

-- Pre-ownership INSERT and UPDATE policies; replaced by 20260515_rec_cache_ownership.
CREATE POLICY IF NOT EXISTS "Authenticated users can write rec cache"
  ON public.recommendation_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Authenticated users can update rec cache"
  ON public.recommendation_cache FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated');

-- ── week_plans ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.week_plans (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  week_iso   text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, week_iso)
);

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.week_plans TO anon, authenticated, service_role;
ALTER TABLE public.week_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users manage own week_plans"
  ON public.week_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── week_plan_days ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.week_plan_days (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES public.week_plans(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  template_id uuid REFERENCES public.session_templates(id) ON DELETE SET NULL,
  sort_order  integer DEFAULT 0
);

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.week_plan_days TO anon, authenticated, service_role;
ALTER TABLE public.week_plan_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users manage own week_plan_days"
  ON public.week_plan_days FOR ALL
  USING (EXISTS (
    SELECT 1 FROM week_plans wp
    WHERE wp.id = week_plan_days.plan_id AND wp.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM week_plans wp
    WHERE wp.id = week_plan_days.plan_id AND wp.user_id = auth.uid()
  ));

-- ── paperbot_model_snapshots ──────────────────────────────────────────────────
-- Stray table not owned by this application; service_role access only.
CREATE TABLE IF NOT EXISTS public.paperbot_model_snapshots (
  model_id        text PRIMARY KEY,
  state           text NOT NULL,
  retirement_date text NOT NULL,
  first_seen_at   timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.paperbot_model_snapshots TO service_role;
ALTER TABLE public.paperbot_model_snapshots ENABLE ROW LEVEL SECURITY;

-- ── Stored functions ──────────────────────────────────────────────────────────

-- Auto-creates a profiles row on new auth.users sign-up.
-- SECURITY DEFINER so it can write to profiles without the new user existing yet.
-- search_path fixed to prevent schema injection.
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

-- Full delete-and-reinsert for template exercises. Canonical update path.
CREATE OR REPLACE FUNCTION public.replace_template_exercises(
  p_template_id uuid,
  p_exercises   jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path = public
AS $$
BEGIN
  DELETE FROM session_template_exercises WHERE template_id = p_template_id;

  INSERT INTO session_template_exercises
    (template_id, library_exercise_id, name, primary_muscles, secondary_muscles, sets, reps, sort_order)
  SELECT
    p_template_id,
    NULLIF(e.value->>'library_exercise_id', '')::uuid,
    e.value->>'name',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(e.value->'primary_muscles',  '[]'::jsonb))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(e.value->'secondary_muscles', '[]'::jsonb))),
    NULLIF(e.value->>'sets', ''),
    NULLIF(e.value->>'reps', ''),
    (e.value->>'sort_order')::int
  FROM jsonb_array_elements(p_exercises) AS e;
END;
$$;

-- Inserts a session and its exercises + muscle activations in a single RPC call.
CREATE OR REPLACE FUNCTION public.save_session(
  p_gym_calendar_id  uuid,
  p_session_date     date,
  p_image_url        text,
  p_notes            text,
  p_training_group_id uuid,
  p_exercises        jsonb,
  p_replace          boolean DEFAULT false
)
  RETURNS sessions
  LANGUAGE plpgsql
  SET search_path = public
AS $$
DECLARE
  v_session sessions;
  v_ex_rec  record;
  v_ex      jsonb;
  v_ex_id   uuid;
BEGIN
  IF p_replace AND p_gym_calendar_id IS NOT NULL THEN
    DELETE FROM sessions
    WHERE gym_calendar_id = p_gym_calendar_id
      AND trainer_id = auth.uid();
  END IF;

  INSERT INTO sessions (trainer_id, training_group_id, gym_calendar_id, session_date, image_url, notes)
  VALUES (auth.uid(), p_training_group_id, p_gym_calendar_id, p_session_date, p_image_url, p_notes)
  RETURNING * INTO v_session;

  FOR v_ex_rec IN SELECT value FROM jsonb_array_elements(p_exercises)
  LOOP
    v_ex := v_ex_rec.value;

    INSERT INTO session_exercises (session_id, name, standard_name, sets, reps, position)
    VALUES (
      v_session.id,
      v_ex->>'name',
      NULLIF(v_ex->>'standard_name', ''),
      (v_ex->>'sets')::int,
      (v_ex->>'reps')::int,
      (v_ex->>'position')::int
    )
    RETURNING id INTO v_ex_id;

    INSERT INTO muscle_activations (session_exercise_id, muscle_id, activation_type)
    SELECT v_ex_id, m.value->>'muscle_id', m.value->>'activation_type'
    FROM jsonb_array_elements(COALESCE(v_ex->'activations', '[]'::jsonb)) AS m;
  END LOOP;

  RETURN v_session;
END;
$$;

-- Replaces all exercises on an existing session.
CREATE OR REPLACE FUNCTION public.update_session(
  p_session_id      uuid,
  p_gym_calendar_id uuid,
  p_exercises       jsonb,
  p_replace         boolean DEFAULT false
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path = public
AS $$
DECLARE
  v_ex_rec record;
  v_ex     jsonb;
  v_ex_id  uuid;
BEGIN
  IF p_replace AND p_gym_calendar_id IS NOT NULL THEN
    DELETE FROM sessions
    WHERE gym_calendar_id = p_gym_calendar_id
      AND trainer_id = auth.uid()
      AND id <> p_session_id;
  END IF;

  DELETE FROM session_exercises WHERE session_id = p_session_id;

  FOR v_ex_rec IN SELECT value FROM jsonb_array_elements(p_exercises)
  LOOP
    v_ex := v_ex_rec.value;

    INSERT INTO session_exercises (session_id, name, standard_name, sets, reps, position)
    VALUES (
      p_session_id,
      v_ex->>'name',
      NULLIF(v_ex->>'standard_name', ''),
      (v_ex->>'sets')::int,
      (v_ex->>'reps')::int,
      (v_ex->>'position')::int
    )
    RETURNING id INTO v_ex_id;

    INSERT INTO muscle_activations (session_exercise_id, muscle_id, activation_type)
    SELECT v_ex_id, m.value->>'muscle_id', m.value->>'activation_type'
    FROM jsonb_array_elements(COALESCE(v_ex->'activations', '[]'::jsonb)) AS m;
  END LOOP;

  UPDATE sessions
  SET gym_calendar_id = p_gym_calendar_id
  WHERE id = p_session_id
    AND trainer_id = auth.uid();
END;
$$;

-- ── Auth trigger ──────────────────────────────────────────────────────────────
-- Fires after every new auth.users row to create the matching profiles row.
CREATE TRIGGER IF NOT EXISTS on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
