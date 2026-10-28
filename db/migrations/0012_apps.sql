-- apps as data (BR-41): one row per app created through the platform instead of an apps/<id>/ folder. The config is validated by
-- src/lib/app-config/schema.ts before it is written and again when it is read. The primary key makes the app id unique, so two
-- requests that pick the same id cannot both succeed. Repository apps (kids-gear, garden-tools) are not rows.
create table if not exists apps (
  id text primary key,
  config jsonb not null,
  created_at timestamptz not null default now()
);
