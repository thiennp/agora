-- matching slice: stored matches and permanent dismissals (MAT-02, MAT-03).
create table matches (
  id            text primary key,           -- "<offer_item_id>:<want_item_id>"
  app_id        text not null,
  offer_item_id uuid not null references items (id) on delete cascade,
  want_item_id  uuid not null references items (id) on delete cascade,
  score         numeric(5, 2) not null check (score between 0 and 100),
  distance_band text not null check (distance_band in ('same', 'near', 'mid', 'far', 'unknown')),
  reason        text not null,
  factors       jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  unique (offer_item_id, want_item_id)
);
create index matches_offer_idx on matches (offer_item_id, score desc);
create index matches_want_idx on matches (want_item_id, score desc);

create table match_dismissals (
  family_id    uuid not null references families (id) on delete cascade,
  match_id     text not null,
  dismissed_at timestamptz not null default now(),
  primary key (family_id, match_id)
);
