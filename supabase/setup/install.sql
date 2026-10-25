-- BoyaCep: eksik veritabanı parçalarını kurar. Daha önce kurulanları atlar, tekrar çalıştırmak güvenlidir.
do $boyacep$
declare done text := '';
begin
  if to_regtype('public.app_role') is null then
    execute $m1$
-- BoyaCep core schema: profiles, roles, projects, rooms, openings, saved calculations.
-- Every user-owned table has RLS enabled. anon gets no table access at all.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles and roles
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('homeowner', 'pro', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  avatar_path text check (char_length(avatar_path) <= 300),
  locale text not null default 'tr' check (locale in ('tr', 'en')),
  country text not null default 'TR' check (country ~ '^[A-Z]{2}$'),
  -- Role the app opens with; must be one of the user's roles.
  active_role public.app_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Security definer so policies can call it without recursing into RLS.
create or replace function public.has_role(check_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = check_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin');
$$;

-- A user may only make a role active if they hold it.
create or replace function public.check_active_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.active_role is not null and not exists (
    select 1 from public.user_roles where user_id = new.id and role = new.active_role
  ) then
    raise exception 'active_role % is not granted to this user', new.active_role
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_check_active_role before insert or update of active_role on public.profiles
  for each row execute function public.check_active_role();

-- Create a profile for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "roles: read own" on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
-- Users can give themselves homeowner or pro; admin is granted only by the service role.
create policy "roles: add own non-admin" on public.user_roles
  for insert to authenticated with check (user_id = (select auth.uid()) and role in ('homeowner', 'pro'));
create policy "roles: remove own non-admin" on public.user_roles
  for delete to authenticated using (user_id = (select auth.uid()) and role in ('homeowner', 'pro'));

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create type public.project_status as enum (
  'draft', 'planning', 'awaiting_quote', 'in_progress', 'completed', 'cancelled'
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  status public.project_status not null default 'draft',
  notes text check (char_length(notes) <= 4000),
  budget numeric(12, 2) check (budget >= 0),
  currency char(3) not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_updated_idx on public.projects (owner_id, updated_at desc);

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- Free plan: a limited number of projects per user. Premium raises this later.
create or replace function public.project_limit()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 3;
$$;

create or replace function public.enforce_project_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.projects where owner_id = new.owner_id) >= public.project_limit() then
    raise exception 'project limit reached' using errcode = 'check_violation', hint = 'free_plan_limit';
  end if;
  return new;
end;
$$;

create trigger projects_enforce_limit before insert on public.projects
  for each row execute function public.enforce_project_limit();

create or replace function public.owns_project(project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects where id = project and owner_id = (select auth.uid())
  );
$$;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  length_m numeric(6, 2) not null check (length_m > 0 and length_m <= 50),
  width_m numeric(6, 2) not null check (width_m > 0 and width_m <= 50),
  height_m numeric(5, 2) not null check (height_m > 0 and height_m <= 10),
  paint_walls boolean not null default true,
  paint_ceiling boolean not null default true,
  coats smallint not null default 2 check (coats between 1 and 4),
  surface_type text not null default 'painted'
    check (surface_type in ('painted', 'new_plaster', 'plasterboard', 'concrete')),
  surface_condition text not null default 'good'
    check (surface_condition in ('good', 'minor_repair', 'poor')),
  -- Optional product spread rate (m²/L, one coat) and where it came from.
  coverage_m2_per_l numeric(5, 2) check (coverage_m2_per_l > 0 and coverage_m2_per_l <= 40),
  coverage_source text check (coverage_source in ('manufacturer', 'user')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (paint_walls or paint_ceiling),
  check ((coverage_m2_per_l is null) = (coverage_source is null))
);

create index rooms_project_idx on public.rooms (project_id, sort_order);

create trigger rooms_updated_at before update on public.rooms
  for each row execute function public.set_updated_at();

create table public.room_openings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  kind text not null check (kind in ('door', 'window')),
  width_m numeric(5, 2) not null check (width_m > 0 and width_m <= 20),
  height_m numeric(5, 2) not null check (height_m > 0 and height_m <= 10),
  count smallint not null default 1 check (count between 1 and 50),
  created_at timestamptz not null default now()
);

-- Editing a room counts as editing its project, so recent projects sort first.
create or replace function public.touch_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projects set updated_at = now()
  where id = coalesce(new.project_id, old.project_id);
  return null;
end;
$$;

create trigger rooms_touch_project after insert or update or delete on public.rooms
  for each row execute function public.touch_project();

create index room_openings_room_idx on public.room_openings (room_id);

create or replace function public.owns_room(room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.rooms r
    join public.projects p on p.id = r.project_id
    where r.id = room and p.owner_id = (select auth.uid())
  );
$$;

-- Snapshot of an engine run so saved numbers never change silently.
create table public.calculations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  engine_version text not null check (char_length(engine_version) <= 20),
  input jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index calculations_project_idx on public.calculations (project_id, created_at desc);

alter table public.projects enable row level security;
alter table public.rooms enable row level security;
alter table public.room_openings enable row level security;
alter table public.calculations enable row level security;

create policy "projects: owner reads" on public.projects
  for select to authenticated using (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "projects: owner inserts" on public.projects
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "projects: owner updates" on public.projects
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "projects: owner deletes" on public.projects
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy "rooms: project owner" on public.rooms
  for all to authenticated
  using ((select public.owns_project(project_id)))
  with check ((select public.owns_project(project_id)));

create policy "openings: room owner" on public.room_openings
  for all to authenticated
  using ((select public.owns_room(room_id)))
  with check ((select public.owns_room(room_id)));

create policy "calculations: project owner reads" on public.calculations
  for select to authenticated using ((select public.owns_project(project_id)));
create policy "calculations: project owner inserts" on public.calculations
  for insert to authenticated with check ((select public.owns_project(project_id)));
create policy "calculations: project owner deletes" on public.calculations
  for delete to authenticated using ((select public.owns_project(project_id)));

-- ---------------------------------------------------------------------------
-- Grants: authenticated users only, RLS does the rest.
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.user_roles, public.projects, public.rooms,
  public.room_openings, public.calculations from anon, authenticated;

grant select, update (display_name, avatar_path, locale, country, active_role) on public.profiles to authenticated;
grant select, insert, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.projects, public.rooms, public.room_openings to authenticated;
grant select, insert, delete on public.calculations to authenticated;

revoke execute on function public.handle_new_user(), public.check_active_role(), public.touch_project(),
  public.enforce_project_limit() from public, anon, authenticated;
$m1$;
    done := done || ' 1';
  end if;
  if to_regclass('public.project_materials') is null then
    execute $m2$
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
$m2$;
    done := done || ' 2';
  end if;
  if to_regclass('public.guide_articles') is null then
    execute $m3$
-- Phase 4: painting guide content managed from the admin panel, plus an audit log of admin writes.

create table public.guide_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  category text not null check (category in (
    'preparation', 'primer', 'filler_sanding', 'ceiling', 'walls', 'tools', 'mistakes', 'exterior', 'materials'
  )),
  title text not null check (char_length(btrim(title)) between 1 and 140),
  summary text not null default '' check (char_length(summary) <= 300),
  -- Simple markdown: paragraphs, "## " headings, "- " bullets, "1. " steps, **bold**.
  body text not null default '' check (char_length(body) <= 20000),
  reading_minutes smallint not null default 3 check (reading_minutes between 1 and 60),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'draft' or published_at is not null)
);

create index guide_articles_published_idx on public.guide_articles (category, sort_order) where status = 'published';

create trigger guide_articles_updated_at before update on public.guide_articles
  for each row execute function public.set_updated_at();

alter table public.guide_articles enable row level security;

-- Published guides are free for everyone, including visitors without an account.
create policy "guide: everyone reads published" on public.guide_articles
  for select to anon, authenticated using (status = 'published' or (select public.is_admin()));
create policy "guide: admins write" on public.guide_articles
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.guide_articles from anon, authenticated;
grant select on public.guide_articles to anon;
grant select, insert, update, delete on public.guide_articles to authenticated;

-- ---------------------------------------------------------------------------
-- Audit log: who changed shared content, and when. Written by triggers only.
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name text not null,
  row_id uuid,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Tables key rows by id, except user_roles which is keyed by user_id.
  insert into public.audit_log (actor_id, action, table_name, row_id)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(to_jsonb(coalesce(new, old)) ->> 'id', to_jsonb(coalesce(new, old)) ->> 'user_id')::uuid
  );
  return null;
end;
$$;

create trigger guide_articles_audit after insert or update or delete on public.guide_articles
  for each row execute function public.write_audit_log();
create trigger material_catalog_audit after insert or update or delete on public.material_catalog
  for each row execute function public.write_audit_log();
create trigger user_roles_audit after insert or delete on public.user_roles
  for each row execute function public.write_audit_log();

alter table public.audit_log enable row level security;
create policy "audit: admins read" on public.audit_log
  for select to authenticated using ((select public.is_admin()));

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
revoke execute on function public.write_audit_log() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin dashboard numbers. Returns nothing unless the caller is an admin.
-- ---------------------------------------------------------------------------

create or replace function public.admin_stats()
returns table (users bigint, projects bigint, rooms bigint, published_guides bigint, pros bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.profiles),
    (select count(*) from public.projects),
    (select count(*) from public.rooms),
    (select count(*) from public.guide_articles where status = 'published'),
    (select count(*) from public.user_roles where role = 'pro')
  where public.is_admin();
$$;

revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
$m3$;
    done := done || ' 3';
  end if;
  if not exists (select 1 from public.guide_articles where slug = 'ustanin-altin-kurallari') then
    execute $m4$
-- First guide articles. General good practice; product data sheets always win.
-- Editable from the admin panel after this.

insert into public.guide_articles (slug, category, title, summary, body, reading_minutes, status, published_at, sort_order) values
('ustanin-altin-kurallari', 'preparation', 'Ustanın altın kuralları',
 'İyi bir boyanın yüzde sekseni hazırlıktır. Başlamadan önce bilmen gereken 12 kural.',
$md$Boyanın kalitesini fırça değil hazırlık belirler. Bu kurallar çoğu hatayı daha başlamadan önler.

## Hazırlık
- **Önce temizle, sonra boya.** Toz, yağ ve is üzerine sürülen boya tutmaz; duvarı nemli bezle sil, mutfakta yağ çözücüyle temizle.
- **Mobilyayı ortaya topla, örtüyle kapat.** Zemini koruyucu örtüyle, prizleri ve süpürgelikleri bantla kapat.
- **Çatlak ve delikleri önce kapat.** Macunu kuruduktan sonra zımparala, tozunu al.
- **Nem varsa önce nedeni bul.** Nemli duvara boya sürmek sorunu sadece birkaç ay saklar.

## Uygulama
- **Tavandan başla, duvarla devam et.** Tavandan damlayan boya duvarı kirletmesin.
- **Önce köşeler, sonra rulo.** Köşeleri fırçayla açıp hemen ardından ruloyla geç, böylece ek yeri kalmaz.
- **Islak kenarı kaybetme.** Bir duvarı ara vermeden bitir; yarım kalan duvarda iz kalır.
- **İnce ve çok kat, kalın ve tek kattan iyidir.** Kalın sürülen boya akar, geç kurur ve çatlar.
- **Katlar arası bekleme süresine uy.** Süre kutunun üstünde yazar; genelde birkaç saattir.

## Malzeme ve güvenlik
- **Boyayı karıştır.** Dibe çöken pigment karıştırılmazsa renk her yerde farklı çıkar.
- **Odayı havalandır.** Boyarken ve kururken pencereyi aç.
- **Kutuların parti numarasına bak.** Aynı renk farklı partilerde az da olsa farklı olabilir; büyük işlerde boyaları bir kovada birleştir.$md$,
 4, 'published', now(), 0),

('boya-oncesi-hazirlik', 'preparation', 'Boya öncesi hazırlık adım adım',
 'Odayı boşaltmaktan bantlamaya kadar boyaya başlamadan yapılacaklar.',
$md$Hazırlık işi genellikle boyamanın kendisinden daha uzun sürer. Ama sonucu en çok etkileyen kısım budur.

## Adımlar
1. Odayı mümkün olduğunca boşalt, kalanları ortada topla ve örtüyle kapat.
2. Priz ve anahtar kapaklarını sök ya da bantla kapat.
3. Duvarı kontrol et: çatlak, delik, kabarma, nem lekesi var mı?
4. Gevşek ve kabarmış boyayı spatulayla kazı.
5. Delik ve çatlakları macunla doldur, kuruyunca zımparala.
6. Tozu nemli bezle al.
7. Süpürgelik, kapı kasası ve pencere kenarlarını maskeleme bandıyla kapat.
8. Gerekirse astar uygula.

## Bilmen gerekenler
- Bandı boya tamamen kurumadan, hafif nemliyken çekersen kenar daha temiz çıkar.
- Yağlı boya ile boyanmış bir yüzeye su bazlı boya doğrudan tutmayabilir. Yüzeyi zımparala ve uygun astar kullan.$md$,
 3, 'published', now(), 10),

('astar-ne-zaman-gerekir', 'primer', 'Astar ne zaman gerekir?',
 'Her duvara astar gerekmez. Hangi durumda şart olduğunu ve nasıl uygulanacağını öğren.',
$md$Astar, boyanın yüzeye iyi tutunmasını ve her yerde aynı renkte görünmesini sağlar.

## Astar gereken durumlar
- Yeni sıva, alçı ya da alçıpan yüzeyler (bu yüzeyler boyayı çok emer)
- Çok miktarda macunla tamir edilmiş duvarlar
- Koyu bir rengin üstüne açık renk boyanacaksa
- Is, nikotin ya da su lekesi olan yüzeyler (bunlar için leke örtücü astar kullanılır)
- Yağlı boyadan su bazlı boyaya geçerken

## Genelde gerekmeyen durumlar
- Sağlam, temiz ve daha önce aynı tür boyayla boyanmış duvarlarda, benzer bir renk sürülecekse

## Uygulama
1. Astarı üreticinin önerdiği oranda incelt; oran kutunun üstünde yazar.
2. Tek kat, eşit ve ince sür.
3. Üstüne boya sürmeden önce kutuda yazan süre kadar beklet.

BoyaCep hesaplayıcısı yeni sıva, alçıpan, brüt beton ve kötü durumdaki duvarlarda astarı otomatik olarak önerir.$md$,
 3, 'published', now(), 0),

('macun-ve-zimpara', 'filler_sanding', 'Macun ve zımpara',
 'Çatlak ve delikleri iz bırakmadan kapatmanın yolu.',
$md$Tamir edilen yerin boyadan sonra belli olmaması için macun ve zımpara doğru yapılmalı.

## Adımlar
1. Çatlağın gevşek kısımlarını spatulanın ucuyla temizle.
2. Macunu spatulayla çatlağa bastırarak doldur, fazlasını sıyır.
3. Derin deliklerde tek seferde kalın doldurma; ince katlar halinde, her kat kuruduktan sonra devam et.
4. Kuruyunca ince zımparayla (180–240 numara) yüzey düzleşene kadar zımparala.
5. Tozu al. Geniş tamir yapılan yerlere astar sür.

## İpuçları
- Zımparalanan yere yandan fener tutarsan pürüzler hemen görünür.
- Zımpara yaparken toz maskesi tak.
- Saç çatlakları için elastik macun daha uzun ömürlüdür.$md$,
 3, 'published', now(), 0),

('tavan-nasil-boyanir', 'ceiling', 'Tavan nasıl boyanır?',
 'Boyunu ağrıtmadan, iz bırakmadan tavan boyamak.',
$md$Tavan her zaman ilk boyanan yüzeydir.

## Adımlar
1. Tavanla duvarın birleştiği köşeyi fırçayla 5–10 cm genişliğinde boya.
2. Uzatma sapı takılmış ruloyla, pencereden gelen ışığa paralel şeritler halinde çalış.
3. Bir şeridi bitirmeden ötekine geçme; ıslak kenarı koru.
4. İkinci katı ilk kata dik yönde sür; böylece iz kalmaz.

## İpuçları
- Tavan boyası duvar boyasından daha az damlar; tavanda tavan boyası kullan.
- Lambaları sök ya da poşetle kapat.
- Gözlük tak; tavandan sıçrayan boya göze kaçabilir.$md$,
 3, 'published', now(), 0),

('duvar-boyama-teknigi', 'walls', 'Duvar boyama tekniği',
 'Rulo izi bırakmadan düzgün bir duvar için doğru hareket.',
$md$Düzgün bir duvarın sırrı, ruloyu doğru yüklemek ve ıslak kenarı kaybetmemektir.

## Adımlar
1. Köşeleri, tavan çizgisini ve süpürgelik üstünü fırçayla aç.
2. Ruloyu teknede iyice yükle, fazlasını teknenin sırtında sıyır.
3. Duvarda yaklaşık 1 metrelik bir alana "W" ya da "M" şeklinde sür, sonra boşlukları dikey hareketlerle doldur.
4. Son geçişi yukarıdan aşağıya, hafif baskıyla yap.
5. Bir duvarı ara vermeden bitir.
6. Kutuda yazan süre kadar bekleyip ikinci katı sür.

## Sık yapılan hatalar
- Ruloya fazla bastırmak: kenarlarda boya birikir ve çizgi kalır.
- Kurumaya başlamış yere tekrar dönmek: o yer parlak ya da mat leke olarak kalır.$md$,
 3, 'published', now(), 0),

('rulo-ve-firca-secimi', 'tools', 'Rulo ve fırça seçimi',
 'Hangi işe hangi rulo ve fırça? Yanlış alet, iyi boyayı da kötü gösterir.',
$md$## Rulo
- **Kısa tüylü rulo (yaklaşık 5–10 mm):** pürüzsüz, düz duvar ve tavanlar
- **Orta tüylü rulo (yaklaşık 12–18 mm):** hafif pürüzlü sıva
- **Uzun tüylü rulo (20 mm ve üstü):** dış cephe ve brüt beton gibi pürüzlü yüzeyler
- Uzatma sapı tavanda ve yüksek duvarlarda hem işi hızlandırır hem de iz bırakmayı azaltır.

## Fırça
- **Köşe fırçası (eğik uçlu):** tavan çizgisi ve kenarlar
- **Su bazlı boyalar için sentetik kıllı fırça**, solvent bazlı boyalar için doğal kıllı fırça

## Bakım
- Su bazlı boyada kullandığın aletleri iş biter bitmez bol suyla yıka.
- Ertesi gün devam edeceksen ruloyu poşete sar; kurumaz.$md$,
 3, 'published', now(), 0),

('sik-yapilan-boya-hatalari', 'mistakes', 'Sık yapılan boya hataları ve çözümleri',
 'Kabarma, akma, alacalı görüntü ve rulo izi: neden olur, nasıl düzelir?',
$md$## Kabarma ve dökülme
**Olası nedenler:** nemli yüzey, kirli ya da tozlu duvar, uyumsuz boya katmanları.
**Çözüm:** kabaran kısmı kazı, nedeni gider, macunla düzelt, astarla ve yeniden boya. Nem sürüyorsa önce nemin kaynağını çözdür.

## Akma ve damlama
**Neden:** fazla kalın sürülmüş boya.
**Çözüm:** kuruduktan sonra akıntıyı zımparala, ince bir kat daha sür.

## Alacalı, lekeli görünüm
**Olası nedenler:** astarsız emici yüzey, tek kat boya, karıştırılmamış boya.
**Çözüm:** gerekiyorsa astar sür ve iyi karıştırılmış boyayla bir kat daha uygula.

## Rulo ve fırça izleri
**Neden:** kurumaya başlamış yere dönmek, ruloya fazla bastırmak.
**Çözüm:** hafif zımparala, bir duvarı ara vermeden tek seferde boya.

## Küf ve kararma
**Neden:** nem ve yetersiz havalandırma.
**Çözüm:** üstüne boya sürmek kalıcı çözüm değildir. Önce yüzeyi uygun bir küf temizleyiciyle temizle ve kurut. Gerekirse küfe dayanıklı ürün kullan. Sorun büyükse bir uzmana danış.$md$,
 4, 'published', now(), 0),

('dis-cephe-boyasi', 'exterior', 'Dış cephe boyasında dikkat edilecekler',
 'Hava durumu, yüzey hazırlığı ve güvenlik. Dış cephe, iç mekândan farklıdır.',
$md$## Hava durumu
- Yağmur beklenen günlerde boyama. Boya en az birkaç saat kuru kalmalıdır.
- Çok sıcak, çok soğuk ya da doğrudan güneş alan yüzeylerde boya hızlı ya da kötü kurur. Ürünün uygulama sıcaklığı kutunun üstünde yazar.

## Hazırlık
- Yüzeyi basınçlı suyla yıka ve tamamen kurumasını bekle.
- Dökülen sıvayı onar. Çatlaklar için dış cepheye uygun dolgu kullan.
- Dış cephe astarı kullan.

## Güvenlik
- Yüksekte çalışmak profesyonel iş gerektirir. İskele ve emniyet kemeri olmadan yüksek cephede çalışma.
- Yüksek binalarda işi mutlaka yetkili bir ustaya ya da firmaya yaptır.$md$,
 3, 'published', now(), 0),

('dogru-boya-secimi', 'materials', 'Doğru boya nasıl seçilir?',
 'Silinebilir mi, mat mı, ipek mat mı? Odaya göre boya seçimi.',
$md$## Parlaklık
- **Mat:** yüzey kusurlarını en iyi saklar. Yatak odası ve tavan için uygundur.
- **İpek mat:** hafif parlaktır ve silinebilir. Salon, koridor ve çocuk odası için uygundur.
- **Yarı parlak / parlak:** en dayanıklısıdır ama yüzey kusurlarını belli eder. Kapı ve doğrama için kullanılır.

## Odaya göre
- **Mutfak ve banyo:** silinebilir, neme ve küfe dayanıklı ürün seç.
- **Tavan:** tavan boyası seç. Daha az damlar ve genelde ekonomiktir.
- **Çocuk odası:** silinebilir ve düşük kokulu ürün seç.

## Teknik föy neden önemli?
Her boyanın teknik föyünde sarfiyat (m²/L), inceltme oranı ve katlar arası bekleme süresi yazar. BoyaCep'e bu sarfiyatı girersen hesap çok daha doğru olur.$md$,
 3, 'published', now(), 0);
$m4$;
    done := done || ' 4';
  end if;
  if to_regclass('public.project_photos') is null then
    execute $m5$
-- Phase 5: wall photos stored privately per project, plus the wall outline used by "Rengini Dene".
--
-- Files live in the private "project-photos" bucket at <owner id>/<project id>/<photo id>.<ext>.
-- Only the owner can read, add or remove them; the bucket itself rejects non-images and files over 10 MB.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-photos', 'project-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null unique,
  width integer not null check (width between 1 and 10000),
  height integer not null check (height between 1 and 10000),
  byte_size integer not null check (byte_size between 1 and 10485760),
  -- Wall outline as normalised points: [[x, y], ...] with 0 <= x, y <= 1.
  wall_outline jsonb check (wall_outline is null or jsonb_typeof(wall_outline) = 'array'),
  created_at timestamptz not null default now(),
  check (
    storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and split_part(storage_path, '/', 1) = owner_id::text
    and split_part(storage_path, '/', 2) = project_id::text
  )
);

create index project_photos_project_idx on public.project_photos (project_id, created_at);

-- Keeps storage use predictable on the free plan.
create or replace function public.photo_limit()
returns integer
language sql
immutable
as $$ select 20 $$;

create or replace function public.enforce_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.project_photos where project_id = new.project_id) >= public.photo_limit() then
    raise exception 'photo limit reached' using errcode = 'check_violation', hint = 'photo_limit';
  end if;
  return new;
end;
$$;

create trigger project_photos_enforce_limit before insert on public.project_photos
  for each row execute function public.enforce_photo_limit();

-- A room attached to a photo must belong to the same project.
create or replace function public.check_photo_room()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.room_id is not null
     and not exists (select 1 from public.rooms where id = new.room_id and project_id = new.project_id) then
    raise exception 'room belongs to another project' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger project_photos_check_room before insert or update on public.project_photos
  for each row execute function public.check_photo_room();

alter table public.project_photos enable row level security;

create policy "photos: owner reads" on public.project_photos
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "photos: owner adds to own project" on public.project_photos
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.owns_project(project_id)));
create policy "photos: owner updates" on public.project_photos
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and (select public.owns_project(project_id)));
create policy "photos: owner deletes" on public.project_photos
  for delete to authenticated using (owner_id = (select auth.uid()));

revoke all on public.project_photos from anon, authenticated;
grant select, insert, delete on public.project_photos to authenticated;
-- Only the outline and room can change after upload.
grant update (wall_outline, room_id) on public.project_photos to authenticated;

-- ---------------------------------------------------------------------------
-- Storage policies. The first folder is the owner, the second the project.
-- ---------------------------------------------------------------------------

create or replace function public.can_write_photo_path(path text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := string_to_array(path, '/');
begin
  if path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' then
    return false;
  end if;
  return parts[1] = (select auth.uid())::text and public.owns_project(parts[2]::uuid);
end;
$$;

create policy "project photos: owner reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-photos' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy "project photos: owner uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-photos' and (select public.can_write_photo_path(name)));
create policy "project photos: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-photos' and split_part(name, '/', 1) = (select auth.uid())::text);

revoke execute on function
  public.enforce_photo_limit(),
  public.check_photo_room()
from public, anon, authenticated;
revoke execute on function public.can_write_photo_path(text) from public, anon;
grant execute on function public.can_write_photo_path(text) to authenticated;
$m5$;
    done := done || ' 5';
  end if;
  if to_regclass('public.pro_profiles') is null then
    execute $m6$
-- Phase 6: painter (usta) profiles, sharing a project with a painter, and quotes.
--
-- Sharing works with a short invite code: the homeowner creates a code, the painter
-- redeems it and gets read access to the project's rooms, materials and photos
-- (never the budget or cost notes). The painter can then send a quote that the
-- homeowner accepts or rejects in the app.

-- ---------------------------------------------------------------------------
-- Painter profiles
-- ---------------------------------------------------------------------------

create table public.pro_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 80),
  business_name text check (char_length(business_name) <= 120),
  phone text check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  show_phone boolean not null default false,
  city text not null check (char_length(btrim(city)) between 2 and 60),
  districts text not null default '' check (char_length(districts) <= 300),
  specialties text[] not null default '{}' check (
    specialties <@ array['interior', 'exterior', 'ceiling', 'decorative', 'insulation', 'plaster', 'repair']
    and cardinality(specialties) <= 7
  ),
  years_experience smallint check (years_experience between 0 and 70),
  bio text not null default '' check (char_length(bio) <= 1000),
  -- Set by admins only (see the trigger below).
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pro_profiles_updated_at before update on public.pro_profiles
  for each row execute function public.set_updated_at();

-- Painters may ask for verification ("pending"); only admins decide.
create or replace function public.guard_pro_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.verification_status not in ('unverified', 'pending') then
      raise exception 'only admins can verify painters' using errcode = 'insufficient_privilege';
    end if;
  elsif new.verification_status is distinct from old.verification_status
     and not (old.verification_status in ('unverified', 'rejected') and new.verification_status = 'pending') then
    raise exception 'only admins can verify painters' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger pro_profiles_guard_verification before insert or update on public.pro_profiles
  for each row execute function public.guard_pro_verification();

create trigger pro_profiles_audit after insert or update or delete on public.pro_profiles
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------------
-- Project sharing
-- ---------------------------------------------------------------------------

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'pro' check (role in ('pro')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index project_members_user_idx on public.project_members (user_id);

-- Codes avoid look-alike characters (0/O, 1/I/L) so they can be read out on the phone.
create or replace function public.new_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  code text := '';
begin
  for i in 0..7 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
  end loop;
  return code;
end;
$$;

create table public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  code text not null unique default public.new_invite_code() check (code ~ '^[A-Z2-9]{8}$'),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index project_invites_project_idx on public.project_invites (project_id);

create or replace function public.is_project_member(project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members where project_id = project and user_id = (select auth.uid())
  );
$$;

create or replace function public.can_view_project(project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.owns_project(project) or public.is_project_member(project);
$$;

-- A painter joins a shared project with the homeowner's code.
create or replace function public.redeem_project_invite(invite_code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  invite public.project_invites;
begin
  if (select auth.uid()) is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;
  if not public.has_role('pro') then
    raise exception 'only painters can join shared projects' using errcode = 'insufficient_privilege';
  end if;

  select * into invite from public.project_invites
  where code = upper(btrim(invite_code)) and revoked_at is null and expires_at > now();
  if not found then
    raise exception 'invite not found or expired' using errcode = 'no_data_found';
  end if;
  if public.owns_project(invite.project_id) then
    raise exception 'this is your own project' using errcode = 'check_violation';
  end if;

  insert into public.project_members (project_id, user_id) values (invite.project_id, (select auth.uid()))
  on conflict do nothing;
  return invite.project_id;
end;
$$;

-- Shared projects as the painter sees them: no budget, no costs.
create or replace function public.shared_projects()
returns table (id uuid, title text, status public.project_status, owner_name text, shared_at timestamptz, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.title, p.status, coalesce(pr.display_name, 'Ev sahibi'), m.created_at, p.updated_at
  from public.project_members m
  join public.projects p on p.id = m.project_id
  left join public.profiles pr on pr.id = p.owner_id
  where m.user_id = (select auth.uid())
  order by p.updated_at desc;
$$;

-- Who can see a project, as the homeowner sees it.
create or replace function public.project_member_list(project uuid)
returns table (user_id uuid, full_name text, business_name text, verification_status text, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, coalesce(pp.full_name, pr.display_name, 'Usta'), pp.business_name,
         coalesce(pp.verification_status, 'unverified'), m.created_at
  from public.project_members m
  left join public.pro_profiles pp on pp.user_id = m.user_id
  left join public.profiles pr on pr.id = m.user_id
  where m.project_id = project and public.owns_project(project)
  order by m.created_at;
$$;

-- ---------------------------------------------------------------------------
-- Quotes
-- ---------------------------------------------------------------------------

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Optional: quotes can also be written for customers who do not use the app.
  project_id uuid references public.projects (id) on delete set null,
  number integer not null default 0,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  customer_name text not null default '' check (char_length(customer_name) <= 120),
  customer_contact text not null default '' check (char_length(customer_contact) <= 120),
  notes text not null default '' check (char_length(notes) <= 2000),
  vat_rate numeric(5, 2) not null default 20 check (vat_rate between 0 and 50),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  currency char(3) not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  valid_until date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'withdrawn')),
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quotes_pro_idx on public.quotes (pro_id, created_at desc);
create index quotes_project_idx on public.quotes (project_id) where project_id is not null;

create trigger quotes_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  kind text not null check (kind in ('labor', 'material', 'other')),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  quantity numeric(10, 2) not null check (quantity > 0 and quantity <= 100000),
  unit text not null check (char_length(btrim(unit)) between 1 and 20),
  unit_price numeric(12, 2) not null check (unit_price >= 0 and unit_price <= 10000000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index quote_items_quote_idx on public.quote_items (quote_id, sort_order);

create or replace function public.owns_quote(quote uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.quotes where id = quote and pro_id = (select auth.uid()));
$$;

-- A quote the signed-in homeowner received for one of their projects.
create or replace function public.received_quote(quote uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.quotes q
    where q.id = quote and q.status <> 'draft' and q.project_id is not null and public.owns_project(q.project_id)
  );
$$;

-- Numbers each painter's quotes 1, 2, 3… and keeps the life cycle honest:
-- only drafts can be edited; once sent, the painter can only withdraw it or
-- record the customer's answer, and the homeowner answers through respond_to_quote.
create or replace function public.prepare_quote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtext(new.pro_id::text));
    new.number := coalesce((select max(number) from public.quotes where pro_id = new.pro_id), 0) + 1;
    if new.status <> 'draft' then
      raise exception 'new quotes start as drafts' using errcode = 'check_violation';
    end if;
    return new;
  end if;

  new.number := old.number;
  new.pro_id := old.pro_id;
  if old.status <> 'draft' then
    -- project_id may only be cleared, which happens when the homeowner deletes the project.
    if (new.title, new.customer_name, new.customer_contact, new.notes, new.vat_rate, new.discount, new.currency, new.valid_until)
       is distinct from
       (old.title, old.customer_name, old.customer_contact, old.notes, old.vat_rate, old.discount, old.currency, old.valid_until)
       or (new.project_id is not null and new.project_id is distinct from old.project_id) then
      raise exception 'a sent quote cannot be edited; withdraw it first' using errcode = 'check_violation';
    end if;
  end if;
  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status = 'sent')
      or (old.status = 'sent' and new.status in ('accepted', 'rejected', 'withdrawn'))
      or (old.status in ('withdrawn', 'rejected') and new.status = 'draft')
    ) then
      raise exception 'quote cannot move from % to %', old.status, new.status using errcode = 'check_violation';
    end if;
    if new.status = 'sent' then
      new.sent_at := now();
      new.responded_at := null;
    elsif new.status in ('accepted', 'rejected') then
      new.responded_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger quotes_prepare before insert or update on public.quotes
  for each row execute function public.prepare_quote();

create or replace function public.guard_quote_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.quotes
    where id = coalesce(new.quote_id, old.quote_id) and status <> 'draft'
  ) then
    raise exception 'items of a sent quote cannot change' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger quote_items_guard before insert or update or delete on public.quote_items
  for each row execute function public.guard_quote_items();

-- The homeowner accepts or rejects a quote sent for their project.
create or replace function public.respond_to_quote(quote uuid, accept boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.received_quote(quote) then
    raise exception 'quote not found' using errcode = 'no_data_found';
  end if;
  update public.quotes
  set status = case when accept then 'accepted' else 'rejected' end
  where id = quote and status = 'sent';
  if not found then
    raise exception 'quote is not waiting for an answer' using errcode = 'check_violation';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.pro_profiles enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

create policy "pro profile: owner reads" on public.pro_profiles
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
-- Homeowners see the painters who joined their projects or sent them a quote.
create policy "pro profile: customers read" on public.pro_profiles
  for select to authenticated using (
    exists (
      select 1 from public.project_members m
      where m.user_id = pro_profiles.user_id and (select public.owns_project(m.project_id))
    )
    or exists (
      select 1 from public.quotes q
      where q.pro_id = pro_profiles.user_id and (select public.received_quote(q.id))
    )
  );
create policy "pro profile: painter creates own" on public.pro_profiles
  for insert to authenticated with check (user_id = (select auth.uid()) and (select public.has_role('pro')));
create policy "pro profile: owner or admin updates" on public.pro_profiles
  for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "pro profile: owner deletes" on public.pro_profiles
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "members: owner or member reads" on public.project_members
  for select to authenticated using (user_id = (select auth.uid()) or (select public.owns_project(project_id)));
create policy "members: owner removes, member leaves" on public.project_members
  for delete to authenticated using (user_id = (select auth.uid()) or (select public.owns_project(project_id)));

create policy "invites: owner manages" on public.project_invites
  for all to authenticated
  using ((select public.owns_project(project_id)))
  with check ((select public.owns_project(project_id)) and created_by = (select auth.uid()));

create policy "quotes: painter reads own" on public.quotes
  for select to authenticated using (pro_id = (select auth.uid()));
create policy "quotes: painter writes own" on public.quotes
  for insert to authenticated
  with check (
    pro_id = (select auth.uid())
    and (select public.has_role('pro'))
    and (project_id is null or (select public.is_project_member(project_id)))
  );
create policy "quotes: painter updates own" on public.quotes
  for update to authenticated
  using (pro_id = (select auth.uid()))
  with check (
    pro_id = (select auth.uid())
    and (project_id is null or (select public.is_project_member(project_id)))
  );
-- Sent and answered quotes stay on record; withdraw first, then delete.
create policy "quotes: painter deletes drafts" on public.quotes
  for delete to authenticated using (pro_id = (select auth.uid()) and status in ('draft', 'withdrawn'));
create policy "quotes: homeowner reads received" on public.quotes
  for select to authenticated using ((select public.received_quote(id)));

create policy "quote items: painter manages" on public.quote_items
  for all to authenticated
  using ((select public.owns_quote(quote_id)))
  with check ((select public.owns_quote(quote_id)));
create policy "quote items: homeowner reads received" on public.quote_items
  for select to authenticated using ((select public.received_quote(quote_id)));

-- Painters who joined a project can read what they need to quote it.
create policy "rooms: members read" on public.rooms
  for select to authenticated using ((select public.is_project_member(project_id)));
create policy "openings: members read" on public.room_openings
  for select to authenticated using (
    exists (select 1 from public.rooms r where r.id = room_openings.room_id and (select public.is_project_member(r.project_id)))
  );
create policy "materials: members read" on public.project_materials
  for select to authenticated using ((select public.is_project_member(project_id)));
create policy "photos: members read" on public.project_photos
  for select to authenticated using ((select public.is_project_member(project_id)));

create or replace function public.can_read_photo_path(path text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' then
    return false;
  end if;
  return public.is_project_member(split_part(path, '/', 2)::uuid);
end;
$$;

create policy "project photos: members read" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-photos' and (select public.can_read_photo_path(name)));

revoke all on public.pro_profiles, public.project_members, public.project_invites, public.quotes, public.quote_items
  from anon, authenticated;
grant select, insert, update, delete on public.pro_profiles to authenticated;
grant select, delete on public.project_members to authenticated;
grant select, insert, delete on public.project_invites to authenticated;
grant update (revoked_at) on public.project_invites to authenticated;
grant select, insert, update, delete on public.quotes to authenticated;
grant select, insert, update, delete on public.quote_items to authenticated;

revoke execute on function
  public.guard_pro_verification(),
  public.prepare_quote(),
  public.guard_quote_items()
from public, anon, authenticated;
-- Used as the column default when a homeowner creates an invite.
revoke execute on function public.new_invite_code() from public, anon;
grant execute on function public.new_invite_code() to authenticated;
revoke execute on function
  public.is_project_member(uuid),
  public.can_view_project(uuid),
  public.redeem_project_invite(text),
  public.shared_projects(),
  public.project_member_list(uuid),
  public.owns_quote(uuid),
  public.received_quote(uuid),
  public.respond_to_quote(uuid, boolean),
  public.can_read_photo_path(text)
from public, anon;
grant execute on function
  public.is_project_member(uuid),
  public.can_view_project(uuid),
  public.redeem_project_invite(text),
  public.shared_projects(),
  public.project_member_list(uuid),
  public.owns_quote(uuid),
  public.received_quote(uuid),
  public.respond_to_quote(uuid, boolean),
  public.can_read_photo_path(text)
to authenticated;

-- Admin dashboard: adds painters waiting for verification and sent quotes.
-- The return type changes, so the function is recreated.
drop function public.admin_stats();
create function public.admin_stats()
returns table (users bigint, projects bigint, rooms bigint, published_guides bigint, pros bigint, pending_pros bigint, quotes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.profiles),
    (select count(*) from public.projects),
    (select count(*) from public.rooms),
    (select count(*) from public.guide_articles where status = 'published'),
    (select count(*) from public.user_roles where role = 'pro'),
    (select count(*) from public.pro_profiles where verification_status = 'pending'),
    (select count(*) from public.quotes where status <> 'draft')
  where public.is_admin();
$$;

revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
$m6$;
    done := done || ' 6';
  end if;
  if to_regclass('public.client_errors') is null then
    execute $m7$
-- Phase 7: users can download and delete their data, and the app reports crashes.

-- ---------------------------------------------------------------------------
-- Audit log: keep working while an account is being deleted. The actor row
-- may already be gone (cascades run after the user is removed), so only
-- reference users that still exist.
-- ---------------------------------------------------------------------------

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is not null and not exists (select 1 from auth.users where id = actor) then
    actor := null;
  end if;
  -- Tables key rows by id, except user_roles and pro_profiles which are keyed by user_id.
  insert into public.audit_log (actor_id, action, table_name, row_id)
  values (
    actor,
    tg_op,
    tg_table_name,
    coalesce(to_jsonb(coalesce(new, old)) ->> 'id', to_jsonb(coalesce(new, old)) ->> 'user_id')::uuid
  );
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Data export (KVKK / GDPR right of access): everything the user owns, as JSON.
-- ---------------------------------------------------------------------------

create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id),
  my_projects as (select p.* from public.projects p, me where p.owner_id = me.id),
  my_rooms as (select r.* from public.rooms r where r.project_id in (select id from my_projects)),
  my_quotes as (select q.* from public.quotes q, me where q.pro_id = me.id)
  select case when (select id from me) is null then null else jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('id', u.id, 'email', u.email) from auth.users u, me where u.id = me.id),
    'profile', (select to_jsonb(p) from public.profiles p, me where p.id = me.id),
    'roles', coalesce((select jsonb_agg(r.role) from public.user_roles r, me where r.user_id = me.id), '[]'::jsonb),
    'projects', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from my_projects p), '[]'::jsonb),
    'rooms', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from my_rooms r), '[]'::jsonb),
    'room_openings', coalesce((
      select jsonb_agg(to_jsonb(o)) from public.room_openings o where o.room_id in (select id from my_rooms)
    ), '[]'::jsonb),
    'calculations', coalesce((
      select jsonb_agg(to_jsonb(c)) from public.calculations c where c.project_id in (select id from my_projects)
    ), '[]'::jsonb),
    'project_materials', coalesce((
      select jsonb_agg(to_jsonb(m)) from public.project_materials m where m.project_id in (select id from my_projects)
    ), '[]'::jsonb),
    'project_costs', coalesce((
      select jsonb_agg(to_jsonb(c)) from public.project_costs c where c.project_id in (select id from my_projects)
    ), '[]'::jsonb),
    'project_photos', coalesce((
      select jsonb_agg(to_jsonb(ph)) from public.project_photos ph, me where ph.owner_id = me.id
    ), '[]'::jsonb),
    'project_invites', coalesce((
      select jsonb_agg(to_jsonb(i)) from public.project_invites i where i.project_id in (select id from my_projects)
    ), '[]'::jsonb),
    'shared_with_me', coalesce((
      select jsonb_agg(jsonb_build_object('project_id', m.project_id, 'joined_at', m.created_at))
      from public.project_members m, me where m.user_id = me.id
    ), '[]'::jsonb),
    'pro_profile', (select to_jsonb(pp) from public.pro_profiles pp, me where pp.user_id = me.id),
    'quotes', coalesce((select jsonb_agg(to_jsonb(q) order by q.number) from my_quotes q), '[]'::jsonb),
    'quote_items', coalesce((
      select jsonb_agg(to_jsonb(i)) from public.quote_items i where i.quote_id in (select id from my_quotes)
    ), '[]'::jsonb)
  ) end;
$$;

-- ---------------------------------------------------------------------------
-- Account deletion (right to erasure). Photo files are removed by the app
-- through the storage API first; database rows go with the user by cascade.
-- ---------------------------------------------------------------------------

create or replace function public.delete_my_account()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.user_roles where user_id = me and role = 'admin') then
    raise exception 'admins must be removed by another admin first' using errcode = 'check_violation';
  end if;
  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.export_my_data(), public.delete_my_account() from public, anon;
grant execute on function public.export_my_data(), public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Crash reports from the app. Signed-in users can write a limited number;
-- only admins read them. No personal data beyond the user id is stored.
-- ---------------------------------------------------------------------------

create table public.client_errors (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  message text not null check (char_length(message) between 1 and 500),
  stack text not null default '' check (char_length(stack) <= 4000),
  screen text not null default '' check (char_length(screen) <= 200),
  platform text not null default '' check (platform in ('', 'ios', 'android', 'web')),
  app_version text not null default '' check (char_length(app_version) <= 40),
  created_at timestamptz not null default now()
);

create index client_errors_created_idx on public.client_errors (created_at desc);

create or replace function public.limit_client_errors()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  if (select count(*) from public.client_errors
      where user_id = new.user_id and created_at > now() - interval '1 hour') >= 20 then
    -- Drop silently: a crash loop should not turn into an error for the user.
    return null;
  end if;
  return new;
end;
$$;

create trigger client_errors_limit before insert on public.client_errors
  for each row execute function public.limit_client_errors();

alter table public.client_errors enable row level security;
create policy "errors: signed-in users report" on public.client_errors
  for insert to authenticated with check (true);
create policy "errors: admins read" on public.client_errors
  for select to authenticated using ((select public.is_admin()));
create policy "errors: admins clear" on public.client_errors
  for delete to authenticated using ((select public.is_admin()));

revoke all on public.client_errors from anon, authenticated;
grant insert (message, stack, screen, platform, app_version) on public.client_errors to authenticated;
grant select, delete on public.client_errors to authenticated;
revoke execute on function public.limit_client_errors() from public, anon, authenticated;
$m7$;
    done := done || ' 7';
  end if;
  if to_regclass('public.consultations') is null then
    execute $m8$
-- Phase 8 (no payments yet): plan entitlements that raise free limits, and
-- "Ustaya Sor" questions answered by the BoyaCep team.
--
-- Entitlements are written only by admins (beta testers, promotions) or, later,
-- by a server-side payment webhook using the service role. The app never grants them.

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product text not null check (product in ('pro', 'usta_pro')),
  source text not null check (source in ('admin', 'promo', 'app_store', 'play_store')),
  starts_at timestamptz not null default now(),
  -- null: does not expire (one-time Pro purchase).
  expires_at timestamptz,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at)
);

create index entitlements_user_idx on public.entitlements (user_id, product);

create or replace function public.has_entitlement(check_product text, who uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.entitlements
    where user_id = coalesce(who, (select auth.uid()))
      and product = check_product
      and starts_at <= now()
      and (expires_at is null or expires_at > now())
  );
$$;

alter table public.entitlements enable row level security;
create policy "entitlements: owner or admin reads" on public.entitlements
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "entitlements: admins grant" on public.entitlements
  for insert to authenticated with check ((select public.is_admin()) and source in ('admin', 'promo'));
create policy "entitlements: admins revoke" on public.entitlements
  for delete to authenticated using ((select public.is_admin()));

revoke all on public.entitlements from anon, authenticated;
grant select, insert, delete on public.entitlements to authenticated;

create trigger entitlements_audit after insert or update or delete on public.entitlements
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------------
-- Limits per plan. Free: 3 projects, 20 photos per project. Pro: 50 and 100.
-- ---------------------------------------------------------------------------

create or replace function public.project_limit_for(owner uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.has_entitlement('pro', owner) then 50 else 3 end;
$$;

create or replace function public.enforce_project_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.projects where owner_id = new.owner_id) >= public.project_limit_for(new.owner_id) then
    raise exception 'project limit reached' using errcode = 'check_violation', hint = 'free_plan_limit';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := (select owner_id from public.projects where id = new.project_id);
  max_photos integer := case when public.has_entitlement('pro', owner) then 100 else 20 end;
begin
  if (select count(*) from public.project_photos where project_id = new.project_id) >= max_photos then
    raise exception 'photo limit reached' using errcode = 'check_violation', hint = 'photo_limit';
  end if;
  return new;
end;
$$;

-- What the app shows on the plan screen.
create or replace function public.my_plan()
returns table (pro boolean, usta_pro boolean, project_limit integer, projects_used bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.has_entitlement('pro'),
    public.has_entitlement('usta_pro'),
    public.project_limit_for((select auth.uid())),
    (select count(*) from public.projects where owner_id = (select auth.uid()))
  where (select auth.uid()) is not null;
$$;

-- ---------------------------------------------------------------------------
-- Ustaya Sor: a question thread between a user and the BoyaCep team.
-- ---------------------------------------------------------------------------

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  topic text not null check (topic in ('preparation', 'paint_choice', 'problem', 'cost', 'other')),
  subject text not null check (char_length(btrim(subject)) between 3 and 120),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index consultations_user_idx on public.consultations (user_id, updated_at desc);
create index consultations_open_idx on public.consultations (status, created_at) where status <> 'closed';

create trigger consultations_updated_at before update on public.consultations
  for each row execute function public.set_updated_at();

create table public.consultation_messages (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations (id) on delete cascade,
  author_id uuid default auth.uid() references auth.users (id) on delete set null,
  from_team boolean not null default false,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index consultation_messages_idx on public.consultation_messages (consultation_id, created_at);

create or replace function public.owns_consultation(c uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.consultations where id = c and user_id = (select auth.uid()));
$$;

-- Fills author and team flag, keeps question status in step, and limits new questions.
create or replace function public.prepare_consultation_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.author_id := auth.uid();
  new.from_team := public.is_admin() and not public.owns_consultation(new.consultation_id);
  if (select status from public.consultations where id = new.consultation_id) = 'closed' then
    raise exception 'consultation is closed' using errcode = 'check_violation';
  end if;
  update public.consultations
  set status = case when new.from_team then 'answered' else 'open' end
  where id = new.consultation_id;
  return new;
end;
$$;

create trigger consultation_messages_prepare before insert on public.consultation_messages
  for each row execute function public.prepare_consultation_message();

create or replace function public.limit_consultations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.consultations
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'daily question limit reached' using errcode = 'check_violation';
  end if;
  if new.project_id is not null and not public.owns_project(new.project_id) then
    raise exception 'project not found' using errcode = 'check_violation';
  end if;
  new.status := 'open';
  return new;
end;
$$;

create trigger consultations_limit before insert on public.consultations
  for each row execute function public.limit_consultations();

alter table public.consultations enable row level security;
alter table public.consultation_messages enable row level security;

create policy "consultations: owner or team reads" on public.consultations
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "consultations: owner asks" on public.consultations
  for insert to authenticated with check (user_id = (select auth.uid()));
-- The owner can close their question; the team can close or reopen.
create policy "consultations: owner or team updates status" on public.consultations
  for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "messages: participants read" on public.consultation_messages
  for select to authenticated using ((select public.owns_consultation(consultation_id)) or (select public.is_admin()));
create policy "messages: participants write" on public.consultation_messages
  for insert to authenticated with check ((select public.owns_consultation(consultation_id)) or (select public.is_admin()));

revoke all on public.consultations, public.consultation_messages from anon, authenticated;
grant select, insert on public.consultations to authenticated;
grant update (status) on public.consultations to authenticated;
grant select, insert on public.consultation_messages to authenticated;

revoke execute on function
  public.prepare_consultation_message(),
  public.limit_consultations()
from public, anon, authenticated;
revoke execute on function
  public.has_entitlement(text, uuid),
  public.project_limit_for(uuid),
  public.my_plan(),
  public.owns_consultation(uuid)
from public, anon;
grant execute on function
  public.has_entitlement(text, uuid),
  public.project_limit_for(uuid),
  public.my_plan(),
  public.owns_consultation(uuid)
to authenticated;

-- The old fixed limit is no longer used.
drop function public.project_limit();

-- Data export includes the new tables.
create or replace function public.export_my_data_v2()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when (select auth.uid()) is null then null else
    public.export_my_data() || jsonb_build_object(
      'entitlements', coalesce((
        select jsonb_agg(to_jsonb(e)) from public.entitlements e where e.user_id = (select auth.uid())
      ), '[]'::jsonb),
      'consultations', coalesce((
        select jsonb_agg(to_jsonb(c) || jsonb_build_object('messages', (
          select coalesce(jsonb_agg(jsonb_build_object('from_team', m.from_team, 'body', m.body, 'created_at', m.created_at) order by m.created_at), '[]'::jsonb)
          from public.consultation_messages m where m.consultation_id = c.id
        )))
        from public.consultations c where c.user_id = (select auth.uid())
      ), '[]'::jsonb)
    )
  end;
$$;

revoke execute on function public.export_my_data_v2() from public, anon;
grant execute on function public.export_my_data_v2() to authenticated;

-- Admin dashboard: open questions.
drop function public.admin_stats();
create function public.admin_stats()
returns table (
  users bigint, projects bigint, rooms bigint, published_guides bigint, pros bigint,
  pending_pros bigint, quotes bigint, open_questions bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.profiles),
    (select count(*) from public.projects),
    (select count(*) from public.rooms),
    (select count(*) from public.guide_articles where status = 'published'),
    (select count(*) from public.user_roles where role = 'pro'),
    (select count(*) from public.pro_profiles where verification_status = 'pending'),
    (select count(*) from public.quotes where status <> 'draft'),
    (select count(*) from public.consultations where status = 'open')
  where public.is_admin();
$$;

revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
$m8$;
    done := done || ' 8';
  end if;
  if to_regclass('public.project_colours') is null then
    execute $m9$
-- Colours saved to a project from the colour studio.

create table public.project_colours (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  hex text not null check (hex ~ '^#[0-9A-F]{6}$'),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  -- Where the colour goes: "Salon duvarı", "Tavan"… Optional.
  surface text check (surface is null or char_length(btrim(surface)) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (project_id, hex)
);

create index project_colours_project_idx on public.project_colours (project_id);

alter table public.project_colours enable row level security;

create policy "colours: owner and members read" on public.project_colours
  for select to authenticated using ((select public.can_view_project(project_id)));
create policy "colours: owner adds" on public.project_colours
  for insert to authenticated with check ((select public.owns_project(project_id)));
create policy "colours: owner removes" on public.project_colours
  for delete to authenticated using ((select public.owns_project(project_id)));

revoke all on public.project_colours from anon, authenticated;
grant select, insert, delete on public.project_colours to authenticated;

-- Keep a project's palette small enough to stay useful.
create or replace function public.limit_project_colours()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.project_colours where project_id = new.project_id) >= 24 then
    raise exception 'project colour limit reached' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger project_colours_limit before insert on public.project_colours
  for each row execute function public.limit_project_colours();

-- Data export includes saved colours.
create or replace function public.export_my_data_v2()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when (select auth.uid()) is null then null else
    public.export_my_data() || jsonb_build_object(
      'entitlements', coalesce((
        select jsonb_agg(to_jsonb(e)) from public.entitlements e where e.user_id = (select auth.uid())
      ), '[]'::jsonb),
      'consultations', coalesce((
        select jsonb_agg(to_jsonb(c) || jsonb_build_object('messages', (
          select coalesce(jsonb_agg(jsonb_build_object('from_team', m.from_team, 'body', m.body, 'created_at', m.created_at) order by m.created_at), '[]'::jsonb)
          from public.consultation_messages m where m.consultation_id = c.id
        )))
        from public.consultations c where c.user_id = (select auth.uid())
      ), '[]'::jsonb),
      'project_colours', coalesce((
        select jsonb_agg(to_jsonb(pc))
        from public.project_colours pc join public.projects p on p.id = pc.project_id
        where p.owner_id = (select auth.uid())
      ), '[]'::jsonb)
    )
  end;
$$;

revoke execute on function public.export_my_data_v2() from public, anon;
grant execute on function public.export_my_data_v2() to authenticated;
$m9$;
    done := done || ' 9';
  end if;
  if to_regclass('public.invite_redeem_failures') is null then
    execute $m10$
-- Security fixes from the October 2026 audit. No rows are deleted; the only
-- thing removed is an unused helper function.
--
-- 1. A painter's phone number reaches customers only when the painter allows it.
-- 2. Quotes sent through the app are answered by the homeowner, never the painter.
-- 3. Invite codes have a use limit, and wrong guesses are rate limited.
-- 4. Visitors without an account cannot call any security definer function.
-- 5. Plan lookups only answer for the signed-in user.

-- ---------------------------------------------------------------------------
-- 1. Painter cards
-- ---------------------------------------------------------------------------

-- Customers no longer read pro_profiles rows (which include the phone number).
drop policy "pro profile: customers read" on public.pro_profiles;

-- What a customer sees of a painter who joined their project or sent them a
-- quote. The phone is left out unless the painter chose to show it.
create or replace function public.pro_card(pro uuid)
returns table (
  user_id uuid,
  full_name text,
  business_name text,
  phone text,
  show_phone boolean,
  city text,
  districts text,
  specialties text[],
  years_experience smallint,
  bio text,
  verification_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.full_name, p.business_name,
         case when p.show_phone or p.user_id = (select auth.uid()) then p.phone end,
         p.show_phone, p.city, p.districts, p.specialties, p.years_experience, p.bio, p.verification_status
  from public.pro_profiles p
  where p.user_id = pro
    and (
      p.user_id = (select auth.uid())
      or public.is_admin()
      or exists (
        select 1 from public.project_members m
        where m.user_id = pro and public.owns_project(m.project_id)
      )
      or exists (
        select 1 from public.quotes q
        where q.pro_id = pro and public.received_quote(q.id)
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- 2. Quote answers
-- ---------------------------------------------------------------------------

-- Same as before, plus: a quote linked to a project is accepted or rejected only
-- by that project's owner (through respond_to_quote).
create or replace function public.prepare_quote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtext(new.pro_id::text));
    new.number := coalesce((select max(number) from public.quotes where pro_id = new.pro_id), 0) + 1;
    if new.status <> 'draft' then
      raise exception 'new quotes start as drafts' using errcode = 'check_violation';
    end if;
    return new;
  end if;

  new.number := old.number;
  new.pro_id := old.pro_id;
  if old.status <> 'draft' then
    -- project_id may only be cleared, which happens when the homeowner deletes the project.
    if (new.title, new.customer_name, new.customer_contact, new.notes, new.vat_rate, new.discount, new.currency, new.valid_until)
       is distinct from
       (old.title, old.customer_name, old.customer_contact, old.notes, old.vat_rate, old.discount, old.currency, old.valid_until)
       or (new.project_id is not null and new.project_id is distinct from old.project_id) then
      raise exception 'a sent quote cannot be edited; withdraw it first' using errcode = 'check_violation';
    end if;
  end if;
  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status = 'sent')
      or (old.status = 'sent' and new.status in ('accepted', 'rejected', 'withdrawn'))
      or (old.status in ('withdrawn', 'rejected') and new.status = 'draft')
    ) then
      raise exception 'quote cannot move from % to %', old.status, new.status using errcode = 'check_violation';
    end if;
    if new.status in ('accepted', 'rejected') and old.project_id is not null and not public.owns_project(old.project_id) then
      raise exception 'only the homeowner answers this quote' using errcode = 'insufficient_privilege';
    end if;
    if new.status = 'sent' then
      new.sent_at := now();
      new.responded_at := null;
    elsif new.status in ('accepted', 'rejected') then
      new.responded_at := now();
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Invite limits
-- ---------------------------------------------------------------------------

alter table public.project_invites
  add column max_uses smallint not null default 3 check (max_uses between 1 and 10),
  add column uses smallint not null default 0 check (uses >= 0);

-- Wrong codes per painter, so codes cannot be guessed. Only the redeem function
-- reads and writes it.
create table public.invite_redeem_failures (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index invite_redeem_failures_user_idx on public.invite_redeem_failures (user_id, created_at);

alter table public.invite_redeem_failures enable row level security;
revoke all on public.invite_redeem_failures from anon, authenticated;

-- A painter joins a shared project with the homeowner's code. An unknown,
-- expired or revoked code returns null (so the wrong guess is kept); after 10
-- wrong guesses in an hour the painter has to wait.
create or replace function public.redeem_project_invite(invite_code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  invite public.project_invites;
begin
  if me is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;
  if not public.has_role('pro') then
    raise exception 'only painters can join shared projects' using errcode = 'insufficient_privilege';
  end if;
  if (
    select count(*) from public.invite_redeem_failures
    where user_id = me and created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'too many attempts' using errcode = 'program_limit_exceeded';
  end if;

  select * into invite from public.project_invites
  where code = upper(btrim(invite_code)) and revoked_at is null and expires_at > now()
  for update;
  if not found then
    delete from public.invite_redeem_failures where user_id = me and created_at < now() - interval '1 day';
    insert into public.invite_redeem_failures (user_id) values (me);
    return null;
  end if;
  if public.owns_project(invite.project_id) then
    raise exception 'this is your own project' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.project_members where project_id = invite.project_id and user_id = me) then
    return invite.project_id;
  end if;
  if invite.uses >= invite.max_uses then
    raise exception 'invite used up' using errcode = 'check_violation';
  end if;

  insert into public.project_members (project_id, user_id) values (invite.project_id, me);
  update public.project_invites set uses = uses + 1 where id = invite.id;
  return invite.project_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Visitors
-- ---------------------------------------------------------------------------

-- Visitors read published guides without calling is_admin(); admins still see
-- drafts through "guide: admins write", which covers reads too.
drop policy "guide: everyone reads published" on public.guide_articles;
create policy "guide: everyone reads published" on public.guide_articles
  for select to anon, authenticated using (status = 'published');

revoke execute on function
  public.has_role(public.app_role),
  public.is_admin(),
  public.owns_project(uuid),
  public.owns_room(uuid),
  public.pro_card(uuid),
  public.redeem_project_invite(text)
from public, anon;
grant execute on function
  public.has_role(public.app_role),
  public.is_admin(),
  public.owns_project(uuid),
  public.owns_room(uuid),
  public.pro_card(uuid),
  public.redeem_project_invite(text)
to authenticated;
-- Trigger functions are never called directly.
revoke execute on function public.prepare_quote(), public.limit_project_colours() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Plan lookups
-- ---------------------------------------------------------------------------

-- The app reads its own plan through my_plan(); limits are checked by triggers.
-- Both run as the database owner, so they can still call these.
revoke execute on function
  public.has_entitlement(text, uuid),
  public.project_limit_for(uuid)
from public, anon, authenticated;

-- Replaced by the plan-aware photo limit in plans_and_consultations.
drop function public.photo_limit();
$m10$;
    done := done || ' 10';
  end if;
  raise notice 'BoyaCep kuruldu. Bu sefer eklenen parçalar:%', coalesce(nullif(done, ''), ' yok (hepsi zaten vardı)');
end
$boyacep$;

select case when to_regclass('public.project_colours') is not null
              and to_regclass('public.invite_redeem_failures') is not null
              and exists (select 1 from public.guide_articles where slug = 'ustanin-altin-kurallari')
            then 'TAMAM: BoyaCep veritabanı eksiksiz kuruldu'
            else 'EKSİK: bu ekranın görüntüsünü gönder' end as sonuc;
