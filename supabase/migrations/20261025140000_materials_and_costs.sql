-- Phase 3: material catalog, per-project material lists and extra costs.
-- Prices carry their source so estimates are never shown as verified store prices.

create table public.material_catalog (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'interior_paint', 'ceiling_paint', 'exterior_paint', 'primer', 'filler', 'sandpaper',
    'roller', 'brush', 'masking_tape', 'drop_sheet', 'other'
  )),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  unit text not null check (unit in ('L', 'kg', 'adet', 'rulo', 'kutu', 'paket', 'm²')),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, name)
);

create trigger material_catalog_updated_at before update on public.material_catalog
  for each row execute function public.set_updated_at();

create table public.project_materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  catalog_id uuid references public.material_catalog (id) on delete set null,
  category text not null check (category in (
    'interior_paint', 'ceiling_paint', 'exterior_paint', 'primer', 'filler', 'sandpaper',
    'roller', 'brush', 'masking_tape', 'drop_sheet', 'other'
  )),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  quantity numeric(10, 2) not null check (quantity >= 0 and quantity <= 100000),
  unit text not null check (unit in ('L', 'kg', 'adet', 'rulo', 'kutu', 'paket', 'm²')),
  -- Price per unit; null means "not entered yet".
  unit_price numeric(12, 2) check (unit_price >= 0 and unit_price <= 10000000),
  price_source text not null default 'estimate' check (price_source in ('estimate', 'store')),
  store_name text check (char_length(store_name) <= 80),
  note text check (char_length(note) <= 500),
  -- Rows created from the paint calculation are replaced when it is re-run.
  from_calculation boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price_source = 'estimate' or unit_price is not null)
);

create index project_materials_project_idx on public.project_materials (project_id, sort_order);

create trigger project_materials_updated_at before update on public.project_materials
  for each row execute function public.set_updated_at();

create table public.project_costs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('labor', 'transport', 'other')),
  label text not null check (char_length(btrim(label)) between 1 and 120),
  amount numeric(12, 2) not null check (amount >= 0 and amount <= 100000000),
  price_source text not null default 'estimate' check (price_source in ('estimate', 'store')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_costs_project_idx on public.project_costs (project_id);

create trigger project_costs_updated_at before update on public.project_costs
  for each row execute function public.set_updated_at();

create trigger project_materials_touch_project after insert or update or delete on public.project_materials
  for each row execute function public.touch_project();
create trigger project_costs_touch_project after insert or update or delete on public.project_costs
  for each row execute function public.touch_project();

alter table public.material_catalog enable row level security;
alter table public.project_materials enable row level security;
alter table public.project_costs enable row level security;

create policy "catalog: signed-in users read active items" on public.material_catalog
  for select to authenticated using (active or (select public.is_admin()));
create policy "catalog: admins write" on public.material_catalog
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "materials: project owner" on public.project_materials
  for all to authenticated
  using ((select public.owns_project(project_id)))
  with check ((select public.owns_project(project_id)));

create policy "costs: project owner" on public.project_costs
  for all to authenticated
  using ((select public.owns_project(project_id)))
  with check ((select public.owns_project(project_id)));

revoke all on public.material_catalog, public.project_materials, public.project_costs from anon, authenticated;
grant select, insert, update, delete on public.material_catalog, public.project_materials, public.project_costs to authenticated;

-- Generic catalog entries. No prices: prices differ by store and city.
insert into public.material_catalog (category, name, unit, sort_order) values
  ('interior_paint', 'İç cephe boyası', 'kutu', 10),
  ('ceiling_paint', 'Tavan boyası', 'kutu', 20),
  ('exterior_paint', 'Dış cephe boyası', 'kutu', 30),
  ('primer', 'Astar', 'kutu', 40),
  ('filler', 'Saten alçı / macun', 'kg', 50),
  ('sandpaper', 'Zımpara kâğıdı', 'adet', 60),
  ('roller', 'Rulo ve boya teknesi', 'adet', 70),
  ('brush', 'Köşe fırçası', 'adet', 80),
  ('masking_tape', 'Maskeleme bandı', 'rulo', 90),
  ('drop_sheet', 'Koruyucu örtü', 'adet', 100),
  ('other', 'Diğer sarf malzemesi', 'adet', 110);
