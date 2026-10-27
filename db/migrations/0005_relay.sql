-- relay: messages between owners, relayed by their agents (NEG-REL-01..04).
-- The raw text an owner typed is never stored here: only its hash (evidence) and the screened text.
create table relay_messages (
  id               uuid primary key default gen_random_uuid(),
  negotiation_id   uuid not null references negotiations (id) on delete cascade,
  from_family_id   uuid not null references families (id) on delete cascade,
  to_family_id     uuid not null references families (id) on delete cascade,
  original_hash    text not null check (original_hash ~ '^[0-9a-f]{64}$'),
  screened_text    text not null default '',
  relayed_text     text not null default '',
  lang_from        text not null,
  lang_to          text not null,
  status           text not null check (status in ('delivered', 'redacted', 'blocked')),
  screening_kinds  text[] not null default '{}',
  topics           text[] not null default '{}',
  translation_failed boolean not null default false,
  uncertain        boolean not null default false,
  created_at       timestamptz not null default now()
);
create index relay_messages_deal_idx on relay_messages (negotiation_id, created_at);
