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

-- Recipient for the "new approved order" email to Brand Surface.
-- Empty value falls back to the BRANDSURFACE_EMAIL env var.
insert into app_settings (key, value)
  values ('brandsurface_email', '')
  on conflict (key) do nothing;

-- Minutes to wait after submission before the order is forwarded to
-- Brand Surface (grace period for the customer to edit). Editable in admin.
insert into app_settings (key, value)
  values ('confirm_delay_minutes', '10')
  on conflict (key) do nothing;

-- Delayed-send flow: scheduled Brand Surface email per order
alter table orders add column if not exists send_after          timestamptz;
alter table orders add column if not exists scheduled_email_id   text;

-- Editable product catalogue (rendered on the order form)
create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  grp           text not null default 'print' check (grp in ('print','some')),
  label         text not null,
  description   text,                          -- spec text shown when the product is expanded
  formats       jsonb not null default '[]',   -- legacy single option list (fallback only)
  option_groups jsonb not null default '[]',   -- [{"name":"Format","options":["A4",...]}, ...]
  sort          int not null default 0,
  active        boolean not null default true,
  created_at    timestamptz default now()
);

-- For installs created before these columns existed
alter table products add column if not exists description   text;
alter table products add column if not exists option_groups jsonb not null default '[]';

-- Seed the full catalogue (only when the table is still empty)
insert into products (grp, label, description, option_groups, sort)
select v.grp, v.label, v.description, v.option_groups::jsonb, v.sort
from (values
  ('print','Poster', null, '[{"name":"Format","options":["A4","50×70 cm","A3","70×100 cm"]},{"name":"Print","options":["4+0","4+4"]},{"name":"Paper","options":["170g","250g"]}]', 10),
  ('print','Flag line', '10m, A3 flag, paper, 20 flags on each line, 4+4 — or as per brief', '[]', 20),
  ('print','Wobbler', 'Square or figure cut (110×110 mm) — or as per brief', '[]', 30),
  ('print','Stickers', 'Stickers for fridge, figure-cut removable foil (110×110 mm) — or as per brief', '[]', 40),
  ('print','Pallet hanging sign', 'A3, printed on both sides (3 holes in top, or cut-out and holes)', '[]', 50),
  ('print','Ellipse', 'Standard, or with special cut as per brief', '[]', 60),
  ('print','Floor sticker', 'ø60 / 60×60 cm — or as per brief', '[]', 70),
  ('print','Pallet wrap', 'Non-woven, 25 m — fits the height of 2 EUR pallets', '[]', 80),
  ('print','Table tent', 'Size: Standard', '[]', 90),
  ('print','Table card', 'Size: Standard', '[]', 100),
  ('some','Stills', null, '[{"name":"Aspect ratio","options":["1:1","9:16","4:5"]}]', 110),
  ('some','Video',  null, '[{"name":"Aspect ratio","options":["1:1","9:16","4:5"]}]', 120)
) as v(grp, label, description, option_groups, sort)
where not exists (select 1 from products);

-- Migrate existing rows to the new structure (idempotent; never clobbers admin edits)
update products set option_groups = '[{"name":"Format","options":["A4","50×70 cm","A3","70×100 cm"]},{"name":"Print","options":["4+0","4+4"]},{"name":"Paper","options":["170g","250g"]}]'::jsonb
  where label = 'Poster' and option_groups = '[]'::jsonb;
update products set description = '10m, A3 flag, paper, 20 flags on each line, 4+4 — or as per brief' where label = 'Flag line' and description is null;
update products set description = 'Square or figure cut (110×110 mm) — or as per brief' where label = 'Wobbler' and description is null;
update products set description = 'Stickers for fridge, figure-cut removable foil (110×110 mm) — or as per brief' where label = 'Stickers' and description is null;
update products set description = 'A3, printed on both sides (3 holes in top, or cut-out and holes)' where label = 'Pallet hanging sign' and description is null;
update products set description = 'Standard, or with special cut as per brief' where label = 'Ellipse' and description is null;
update products set description = 'ø60 / 60×60 cm — or as per brief' where label = 'Floor sticker' and description is null;
update products set description = 'Non-woven, 25 m — fits the height of 2 EUR pallets' where label = 'Pallet wrap' and description is null;
update products set description = 'Size: Standard' where label = 'Table tent' and description is null;
update products set description = 'Size: Standard' where label = 'Table card' and description is null;

-- Split the old combined "Stills / Video" into two products
update products set label = 'Stills', option_groups = '[{"name":"Aspect ratio","options":["1:1","9:16","4:5"]}]'::jsonb
  where label = 'Stills / Video';
insert into products (grp, label, option_groups, sort)
select 'some', 'Video', '[{"name":"Aspect ratio","options":["1:1","9:16","4:5"]}]'::jsonb, 120
where not exists (select 1 from products where label = 'Video');

-- File uploads attached to an order (paths in the order-uploads bucket)
alter table orders add column if not exists uploads jsonb not null default '[]';

-- Private storage bucket for order file uploads, 50 MB per file
insert into storage.buckets (id, name, public, file_size_limit)
values ('order-uploads', 'order-uploads', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- No public access — all access goes through Vercel functions
-- using the service_role key (which bypasses RLS).
alter table admin_users  enable row level security;
alter table app_settings enable row level security;
alter table products     enable row level security;
