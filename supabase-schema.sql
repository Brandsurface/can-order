-- ══════════════════════════════════════════════════════
-- KØR DETTE I SUPABASE → SQL EDITOR
-- ══════════════════════════════════════════════════════

create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  status        text not null default 'pending'
                check (status in ('pending', 'confirmed', 'cancelled')),

  -- Bestiller
  butiksnavn    text not null,
  navn          text not null,
  email         text not null,

  -- Produkter (JSON array)
  -- Eksempel: [{"type":"Plakat","format":"A4","antal":10},{"type":"Bordkort","antal":50}]
  produkter     jsonb not null default '[]',
  andet         text,

  -- Leveringsadresse (primær)
  addr_type     text default 'butik',
  gade          text,
  postnr        text,
  by            text,
  att           text,
  tlf           text,

  -- Alternativ leveringsadresse
  alt_active    boolean default false,
  alt_gade      text,
  alt_postnr    text,
  alt_by        text,
  alt_att       text,
  alt_tlf       text,

  -- Salgskonsulent
  konsulent_navn  text,
  konsulent_tlf   text,
  konsulent_email text,

  -- Revision counter (antal gange kunden har fortrudt og rettet)
  revision      integer default 0
);

-- Automatisk updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before update on orders
  for each row execute procedure set_updated_at();

-- Row Level Security: ingen offentlig adgang
-- Al adgang sker via Vercel Functions med service_role nøglen
alter table orders enable row level security;
