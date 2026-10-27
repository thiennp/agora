-- learning: owner-approved relaxation of learned limits (LRN-09..11).
-- A stretch lesson is written only when the owner approved a stretch offer and both owners then confirmed the deal; it counts
-- against the matching decline lesson. It holds a reason code and a category only.
alter table lessons drop constraint lessons_kind_check;
alter table lessons add constraint lessons_kind_check check (kind in ('decline', 'accept', 'stretch'));

-- A match the agent skipped only because of a learned limit, put to the owner. Nothing starts without the owner's yes.
-- The owner sees why it was skipped, never who it is; pending offers are removed when answered or after 30 days.
create table stretch_offers (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references families (id) on delete cascade,
  want_item_id     uuid not null references items (id) on delete cascade,
  offer_item_id    uuid not null references items (id) on delete cascade,
  counterpart_id   uuid not null references families (id) on delete cascade,
  category         text not null,
  reasons          text[] not null check (cardinality(reasons) > 0 and reasons <@ array['too_far', 'condition', 'wrong_size']),
  status           text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at       timestamptz not null default now(),
  unique (family_id, want_item_id, offer_item_id)
);
create index stretch_offers_pending_idx on stretch_offers (family_id) where status = 'pending';
