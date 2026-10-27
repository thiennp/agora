-- family slice: who each participant is, with the minimum data needed (FAM-01, FAM-02, FAM-05).
-- A "family" is the platform's participant; the app config decides which profile fields exist.
create table families (
  id            uuid primary key default gen_random_uuid(),
  app_id        text not null,
  language      text not null,
  -- coarse (~5 km) code only; exact addresses live solely in handoffs.revealed_location
  district_code text not null check (district_code ~ '^(g|n):'),
  -- values for the app's participant fields; validated in code against the app config
  profile       jsonb not null default '{}'::jsonb,
  memory_ref    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index families_app_district_idx on families (app_id, district_code);

-- consent is opt-in and off by default (FAM-CON-02); one row per decision, latest wins.
create table family_consents (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families (id) on delete cascade,
  scope       text not null check (scope in ('share_items', 'learning_commons')),
  granted     boolean not null,
  decided_at  timestamptz not null default now()
);
create index family_consents_latest_idx on family_consents (family_id, scope, decided_at desc);
