-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- Sessions: one row per workout
create table sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  created_at timestamptz default now() not null
);

-- Exercises: one row per exercise in a session
create table exercises (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid references sessions(id) on delete cascade not null,
  name              text not null,
  standard_name     text,
  sets              text,
  reps              text,
  primary_muscles   text[] default '{}',
  secondary_muscles text[] default '{}',
  created_at        timestamptz default now() not null
);

-- Row-level security: users can only see/edit their own data
alter table sessions enable row level security;
alter table exercises enable row level security;

create policy "Users manage own sessions"
  on sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own exercises"
  on exercises for all
  using (
    session_id in (select id from sessions where user_id = auth.uid())
  )
  with check (
    session_id in (select id from sessions where user_id = auth.uid())
  );

-- Useful index for history queries
create index on sessions (user_id, created_at desc);
create index on exercises (session_id);
