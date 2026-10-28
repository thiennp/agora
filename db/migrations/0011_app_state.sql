-- app state: one document holding the demo platform's tracked state (src/lib/state.ts), written after every successful change.
-- This is demo persistence so a restart does not wipe the running demo. The relational tables in 0001-0010 remain the target
-- schema and are not read or written yet. The document holds what the stores hold: encrypted handoff fields stay encrypted.
create table if not exists app_state (
  id text primary key,
  doc jsonb not null,
  updated_at timestamptz not null default now()
);
