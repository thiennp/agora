-- trust: agent status and reports with hash-chained evidence (TRU-REP-01, TRU-RPT-02..04).
create table agent_status (
  family_id   uuid primary key references families (id) on delete cascade,
  trust_score int not null default 80 check (trust_score between 0 and 100),
  banned      boolean not null default false,
  history     jsonb not null default '[]'::jsonb,   -- [{delta, reason, at}] so every change is explainable
  updated_at  timestamptz not null default now()
);

create table trust_reports (
  id                 uuid primary key default gen_random_uuid(),
  negotiation_id     uuid not null references negotiations (id),
  app_id             text not null,
  reporter_family_id uuid not null references families (id) on delete cascade,
  reported_family_id uuid not null references families (id) on delete cascade,
  reason_code        text not null check (reason_code in
                     ('scam', 'contact_harvesting', 'off_platform_payment', 'abusive', 'no_show', 'other')),
  note               text,
  evidence_bundle    jsonb not null,                -- hash-chained message hashes, times, flags; no message text
  signals            jsonb not null default '[]'::jsonb,
  status             text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  exported_at        timestamptz,
  created_at         timestamptz not null default now(),
  unique (negotiation_id, reporter_family_id)       -- one report per reporter per deal
);
-- the reported party's family id is never joined to reporter data in any view they can read (TRU-RPT-04)
