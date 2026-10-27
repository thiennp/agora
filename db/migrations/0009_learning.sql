-- learning and memory: lessons from decisions, deal outcomes, and standing-rule proposals (LRN-LES-01..03, MEM-LOC-01).
-- Lessons hold only structured facts (reason code and category): no names, places or contact details.
create table lessons (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families (id) on delete cascade,
  kind          text not null check (kind in ('decline', 'accept')),
  lesson_key    text not null,                 -- e.g. decline:price:clothing; repeats merge on this
  text          text not null,
  evidence_ids  uuid[] not null default '{}',  -- the deals behind it (LRN-01)
  seen_count    int not null default 1 check (seen_count >= 1),
  confidence    numeric(3, 2) not null check (confidence between 0 and 0.95),
  source        text not null check (source in ('local', 'agentwitch')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (family_id, lesson_key)
);

create table deal_outcomes (
  id             bigserial primary key,
  family_id      uuid not null references families (id) on delete cascade,
  negotiation_id uuid not null,
  result         text not null check (result in ('confirmed', 'declined', 'expired', 'completed', 'not_completed')),
  reason_code    text check (reason_code in ('too_far', 'wrong_size', 'condition', 'price', 'timing', 'other')),
  category       text,
  at             timestamptz not null default now(),
  unique (family_id, negotiation_id, result)   -- one outcome of each kind per deal
);

-- suggestions only: a standing rule exists only after the owner accepts (LRN-STR-02); never an always-ask topic
create table rule_proposals (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references families (id) on delete cascade,
  topic          text not null check (topic not in
                 ('commitment', 'price_terms', 'identity_reveal', 'location_reveal', 'shipping_choice', 'safety_exception',
                  'obey_other_agent', 'share_contact_details', 'take_payment')),
  evidence_count int not null check (evidence_count >= 3),
  status         text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  created_at     timestamptz not null default now(),
  decided_at     timestamptz
);
create unique index rule_proposals_one_pending on rule_proposals (family_id, topic) where status = 'pending';
