-- ══════════════════════════════════════════════════════
-- ADMIN MODULE — run this in Supabase → SQL Editor
-- (in addition to supabase-schema.sql)
-- ══════════════════════════════════════════════════════

-- Admin users (cookie-session auth, managed from the admin UI)
create table if not exists admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text,                       -- null until set on first login
  is_master     boolean not null default false,
  created_at    timestamptz default now()
);

-- Master user — password is set on first login
insert into admin_users (email, is_master)
  values ('itpc@brandsurface.dk', true)
  on conflict (email) do nothing;

-- Editable application settings (key/value)
create table if not exists app_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz default now()
);

-- Recipient for the "new approved order" email to Brandsurface.
-- Empty value falls back to the BRANDSURFACE_EMAIL env var.
insert into app_settings (key, value)
  values ('brandsurface_email', '')
  on conflict (key) do nothing;

-- Minutes to wait after submission before the order is forwarded to
-- Brandsurface (grace period for the customer to edit). Editable in admin.
insert into app_settings (key, value)
  values ('confirm_delay_minutes', '10')
  on conflict (key) do nothing;

-- Delayed-send flow: scheduled Brandsurface email per order
alter table orders add column if not exists send_after          timestamptz;
alter table orders add column if not exists scheduled_email_id   text;

-- Editable product catalogue (rendered on the order form)
create table if not exists products (
  id         uuid primary key default gen_random_uuid(),
  grp        text not null default 'print' check (grp in ('print','some')),
  label      text not null,
  formats    jsonb not null default '[]',   -- e.g. ["A4","50×70 cm"]; empty = no options
  sort       int not null default 0,
  active     boolean not null default true,
  created_at timestamptz default now()
);

-- Seed the current catalogue (only when the table is still empty)
insert into products (grp, label, formats, sort)
select v.grp, v.label, v.formats::jsonb, v.sort
from (values
  ('print','Poster','["A4","50×70 cm","A3","70×100 cm"]',10),
  ('print','Flag line','[]',20),
  ('print','Wobbler','[]',30),
  ('print','Stickers','[]',40),
  ('print','Pallet hanging sign','[]',50),
  ('print','Ellipse','[]',60),
  ('print','Floor sticker','[]',70),
  ('print','Pallet wrap','[]',80),
  ('print','Table tent','[]',90),
  ('print','Table card','[]',100),
  ('some','Stills / Video','["1:1","9:16","4:5"]',110)
) as v(grp, label, formats, sort)
where not exists (select 1 from products);

-- No public access — all access goes through Vercel functions
-- using the service_role key (which bypasses RLS).
alter table admin_users  enable row level security;
alter table app_settings enable row level security;
alter table products     enable row level security;
