-- owner-cards slice: questions, confirmations, standing rules (OWN-01, OWN-QST-03, OWN-CNF-01, OWN-MND-02).
create table owner_questions (
  id                uuid primary key default gen_random_uuid(),
  negotiation_id    uuid not null references negotiations (id) on delete cascade,
  family_id         uuid not null references families (id) on delete cascade,
  topic             text not null,
  question          text not null,
  suggested_answers jsonb not null,
  can_remember      boolean not null default false,
  status            text not null default 'open' check (status in ('open', 'answered', 'expired')),
  answer            text,
  answered_at       timestamptz,
  expires_at        timestamptz not null,
  created_at        timestamptz not null default now()
);
create index owner_questions_open_idx on owner_questions (family_id) where status = 'open';

create table confirmations (
  negotiation_id uuid not null references negotiations (id) on delete cascade,
  family_id      uuid not null references families (id) on delete cascade,
  decision       text check (decision in ('confirm', 'decline')),
  reason_code    text check (reason_code in ('too_far', 'wrong_size', 'condition', 'price', 'timing', 'other')),
  reason_text    text,
  decided_at     timestamptz,
  primary key (negotiation_id, family_id)
);

-- standing rules: low-risk topics only, always with an expiry, never an always-ask topic (enforced in code and here)
create table mandates (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  topic      text not null check (topic not in
             ('commitment', 'price_terms', 'identity_reveal', 'location_reveal', 'shipping_choice', 'safety_exception',
              'obey_other_agent', 'share_contact_details', 'take_payment')),
  level      text not null default 'auto' check (level = 'auto'),
  scope      jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  source     text not null check (source in ('owner', 'learned_with_consent')),
  created_at timestamptz not null default now(),
  unique (family_id, topic)
);

-- hard limits the owner sets once; enforced in matching and negotiation (OWN-MND-01)
create table owner_limits (
  family_id          uuid primary key references families (id) on delete cascade,
  max_distance_km    numeric,
  blocked_categories text[] not null default '{}',
  availability       jsonb not null default '[]'::jsonb,
  min_condition      text,
  allowed_terms      text[] not null default '{free}',
  updated_at         timestamptz not null default now()
);
