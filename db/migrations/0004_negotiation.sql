-- negotiation slice: deals between two agents, their offers and transition history (NEG-STA-01, NEG-STA-03).
create table negotiations (
  id               uuid primary key default gen_random_uuid(),
  app_id           text not null,
  offer_item_id    uuid not null references items (id),
  want_item_id     uuid not null references items (id),
  offer_family_id  uuid not null references families (id),
  want_family_id   uuid not null references families (id),
  state            text not null check (state in (
    'proposed', 'countered', 'agreed_by_agents', 'awaiting_owner_input', 'awaiting_owners', 'confirmed',
    'declined', 'expired', 'handoff', 'completed', 'not_completed', 'reported')),
  round            int not null default 1 check (round >= 1),
  max_rounds       int not null check (max_rounds between 1 and 10),
  turn_family_id   uuid,
  previous_state   text,
  pending          jsonb,
  flags            jsonb not null default '[]'::jsonb,
  confirmations    jsonb not null default '{}'::jsonb,
  approved_terms   jsonb not null default '{}'::jsonb,
  expires_at       timestamptz not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (round <= max_rounds)
);
-- an item can be in at most one open deal at a time (NEG-06)
create unique index negotiations_one_open_deal_per_offer_item
  on negotiations (offer_item_id) where state in ('proposed', 'countered', 'agreed_by_agents', 'awaiting_owner_input', 'awaiting_owners', 'confirmed', 'handoff');
create unique index negotiations_one_open_deal_per_want_item
  on negotiations (want_item_id) where state in ('proposed', 'countered', 'agreed_by_agents', 'awaiting_owner_input', 'awaiting_owners', 'confirmed', 'handoff');

create table negotiation_history (
  id              bigserial primary key,
  negotiation_id  uuid not null references negotiations (id) on delete cascade,
  from_state      text,
  to_state        text not null,
  event           text not null,
  at              timestamptz not null default now()
);

create table negotiation_messages (
  id              uuid primary key default gen_random_uuid(),
  negotiation_id  uuid not null references negotiations (id) on delete cascade,
  from_family_id  uuid not null,
  round           int not null,
  offer           jsonb not null,
  note            text not null default '',
  note_lang       text,
  created_at      timestamptz not null default now()
);
