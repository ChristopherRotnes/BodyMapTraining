-- Existing schema in Supabase project kyolnraqudwrjjbtxhwx
-- This file documents the live schema — do NOT re-run without dropping tables first.

-- User profiles (mirrors auth.users)
create table profiles (
  id         uuid primary key references auth.users,
  full_name  text,
  role       text check (role in ('admin', 'trainer')) default 'trainer',
  created_at timestamptz default now() not null
);

-- Trainer-managed groups of athletes
create table training_groups (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid references profiles(id) not null,
  name        text not null,
  description text,
  created_at  timestamptz default now() not null
);

-- One row per workout session
create table sessions (
  id                  uuid primary key default gen_random_uuid(),
  trainer_id          uuid references profiles(id) not null,
  training_group_id   uuid references training_groups(id),
  session_date        date not null,
  image_url           text,
  notes               text,
  created_at          timestamptz default now() not null
);

-- One row per exercise in a session
create table session_exercises (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid references sessions(id) on delete cascade not null,
  name          text not null,
  standard_name text,
  sets          integer,
  reps          integer,
  position      integer,
  created_at    timestamptz default now() not null
);

-- Normalised muscle activations (one row per muscle per exercise)
create table muscle_activations (
  id                  uuid primary key default gen_random_uuid(),
  session_exercise_id uuid references session_exercises(id) on delete cascade not null,
  muscle_id           text not null,
  activation_type     text check (activation_type in ('primary', 'secondary')) not null,
  created_at          timestamptz default now() not null
);

-- RLS is enabled on all tables (policies grant access to owning trainer only)
