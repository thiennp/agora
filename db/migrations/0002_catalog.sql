-- catalog slice: offers and wants (CAT-01, CAT-03).
create table items (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references families (id) on delete cascade,
  app_id           text not null,
  kind             text not null check (kind in ('offer', 'want')),
  category         text not null,
  size             text,
  condition        text,
  description      text not null default '',
  attributes       jsonb not null default '{}'::jsonb,
  crop_url         text,
  status           text not null default 'draft'
                   check (status in ('draft', 'listed', 'in_deal', 'reserved', 'done', 'withdrawn')),
  safety_flags     jsonb not null default '[]'::jsonb,
  -- an item belongs to at most one confirmed deal; reserved/done items must name it
  reserved_deal_id uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (status not in ('reserved', 'done') or reserved_deal_id is not null)
);
create index items_match_idx on items (app_id, kind, category) where status = 'listed';
create unique index items_one_confirmed_deal_idx on items (id) where status in ('reserved', 'done');

-- suggestions the owner dismissed stay dismissed (CAT-FOR-03)
create table dismissed_suggestions (
  family_id     uuid not null references families (id) on delete cascade,
  suggestion_id text not null,
  dismissed_at  timestamptz not null default now(),
  primary key (family_id, suggestion_id)
);
