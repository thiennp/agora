-- logistics: how a confirmed deal changes hands (LOG-01..05).
-- Exact places and delivery addresses exist only here, only encrypted (AES-256-GCM, app-level key), and only after both owners
-- confirmed. A plan row is created when the deal is confirmed, never before.
create table handoffs (
  negotiation_id    uuid primary key references negotiations (id) on delete cascade,
  mode              text not null check (mode in ('pickup', 'locker', 'parcel_shop', 'shipping')),
  plan_state        text not null default 'proposed' check (plan_state in ('proposed', 'approved', 'completed', 'not_completed')),
  approvals         uuid[] not null default '{}',
  mode_changes      int not null default 0 check (mode_changes between 0 and 3),
  pickup_window     jsonb,
  revealed_location text,                     -- encrypted ("v1.<iv>.<tag>.<ct>"), written by the host
  drop_point        jsonb,                    -- public locker or shop: not a home place
  checklist         jsonb not null default '[]'::jsonb,
  outcome           text check (outcome in ('completed', 'not_completed')),
  outcome_reason    text check (outcome_reason in ('no_show', 'item_mismatch', 'changed_mind', 'other', 'delivered')),
  outcome_by        text,                     -- a family id, or 'carrier'
  created_at        timestamptz not null default now(),
  check (revealed_location is null or revealed_location like 'v1.%')
);

create table shipments (
  id                uuid primary key default gen_random_uuid(),
  negotiation_id    uuid not null unique references negotiations (id) on delete cascade,
  sender_family_id  uuid not null references families (id),
  recipient_family_id uuid not null references families (id),
  recipient_place_enc text,                   -- encrypted delivery address; passed to the carrier adapter only
  carrier           text not null,
  mode              text not null check (mode in ('simulated', 'test')),
  label_ref         text,
  tracking_ref      text,
  appointment       jsonb,
  fee_split         jsonb,                    -- terms only: two whole percents adding to 100; no money moves here
  status            text check (status in ('label_created', 'appointment_booked', 'in_transit', 'delivered')),
  created_at        timestamptz not null default now(),
  check (recipient_place_enc is null or recipient_place_enc like 'v1.%'),
  check (fee_split is null or ((fee_split->>'senderPct')::int + (fee_split->>'recipientPct')::int = 100))
);
