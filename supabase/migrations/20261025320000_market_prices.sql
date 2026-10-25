-- Market prices: research data kept private for admins, BoyaCep's own
-- aggregated statistics readable by everyone, and painting jobs completed in
-- BoyaCep (with both sides' consent) as the strongest future evidence.
-- Additive only: no existing table or row changes.
-- Methodology: docs/BOYACEP_PRICE_QUALITY_METHODOLOGY.md.

-- ---------------------------------------------------------------------------
-- Places and services (public reference data)
-- ---------------------------------------------------------------------------

create table public.provinces (
  code text primary key check (code ~ '^(0[1-9]|[1-7][0-9]|8[01])$'),
  name text not null unique check (char_length(btrim(name)) between 2 and 40)
);

create table public.districts (
  province_code text not null references public.provinces (code) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 40),
  primary key (province_code, name)
);

create table public.service_categories (
  key text primary key check (key ~ '^[a-z_]{2,30}$'),
  label text not null check (char_length(btrim(label)) between 2 and 60),
  -- The unit prices are recorded in.
  unit text not null check (unit in ('m2_floor', 'm2_surface', 'room', 'job', 'piece'))
);

insert into public.provinces (code, name) values
  ('01', 'Adana'), ('02', 'Adıyaman'), ('03', 'Afyonkarahisar'), ('04', 'Ağrı'), ('05', 'Amasya'),
  ('06', 'Ankara'), ('07', 'Antalya'), ('08', 'Artvin'), ('09', 'Aydın'), ('10', 'Balıkesir'),
  ('11', 'Bilecik'), ('12', 'Bingöl'), ('13', 'Bitlis'), ('14', 'Bolu'), ('15', 'Burdur'),
  ('16', 'Bursa'), ('17', 'Çanakkale'), ('18', 'Çankırı'), ('19', 'Çorum'), ('20', 'Denizli'),
  ('21', 'Diyarbakır'), ('22', 'Edirne'), ('23', 'Elazığ'), ('24', 'Erzincan'), ('25', 'Erzurum'),
  ('26', 'Eskişehir'), ('27', 'Gaziantep'), ('28', 'Giresun'), ('29', 'Gümüşhane'), ('30', 'Hakkari'),
  ('31', 'Hatay'), ('32', 'Isparta'), ('33', 'Mersin'), ('34', 'İstanbul'), ('35', 'İzmir'),
  ('36', 'Kars'), ('37', 'Kastamonu'), ('38', 'Kayseri'), ('39', 'Kırklareli'), ('40', 'Kırşehir'),
  ('41', 'Kocaeli'), ('42', 'Konya'), ('43', 'Kütahya'), ('44', 'Malatya'), ('45', 'Manisa'),
  ('46', 'Kahramanmaraş'), ('47', 'Mardin'), ('48', 'Muğla'), ('49', 'Muş'), ('50', 'Nevşehir'),
  ('51', 'Niğde'), ('52', 'Ordu'), ('53', 'Rize'), ('54', 'Sakarya'), ('55', 'Samsun'),
  ('56', 'Siirt'), ('57', 'Sinop'), ('58', 'Sivas'), ('59', 'Tekirdağ'), ('60', 'Tokat'),
  ('61', 'Trabzon'), ('62', 'Tunceli'), ('63', 'Şanlıurfa'), ('64', 'Uşak'), ('65', 'Van'),
  ('66', 'Yozgat'), ('67', 'Zonguldak'), ('68', 'Aksaray'), ('69', 'Bayburt'), ('70', 'Karaman'),
  ('71', 'Kırıkkale'), ('72', 'Batman'), ('73', 'Şırnak'), ('74', 'Bartın'), ('75', 'Ardahan'),
  ('76', 'Iğdır'), ('77', 'Yalova'), ('78', 'Karabük'), ('79', 'Kilis'), ('80', 'Osmaniye'),
  ('81', 'Düzce');

insert into public.districts (province_code, name)
select '35', unnest(array[
  'Aliağa', 'Balçova', 'Bayındır', 'Bayraklı', 'Bergama', 'Beydağ', 'Bornova', 'Buca', 'Çeşme', 'Çiğli',
  'Dikili', 'Foça', 'Gaziemir', 'Güzelbahçe', 'Karabağlar', 'Karaburun', 'Karşıyaka', 'Kemalpaşa', 'Kınık', 'Kiraz',
  'Konak', 'Menderes', 'Menemen', 'Narlıdere', 'Ödemiş', 'Seferihisar', 'Selçuk', 'Tire', 'Torbalı', 'Urla'
])
union all
select '45', unnest(array[
  'Ahmetli', 'Akhisar', 'Alaşehir', 'Demirci', 'Gölmarmara', 'Gördes', 'Kırkağaç', 'Köprübaşı', 'Kula', 'Salihli',
  'Sarıgöl', 'Saruhanlı', 'Selendi', 'Soma', 'Şehzadeler', 'Turgutlu', 'Yunusemre'
]);

insert into public.service_categories (key, label, unit) values
  ('interior_wall', 'İç duvar boyası', 'm2_floor'),
  ('interior_room', 'Tek oda boyası', 'room'),
  ('ceiling', 'Tavan boyası', 'm2_surface'),
  ('primer', 'Astar', 'm2_surface'),
  ('filler_sanding', 'Alçı, macun, zımpara', 'm2_surface'),
  ('repair', 'Tamir', 'job'),
  ('exterior', 'Dış cephe', 'm2_surface'),
  ('door_wood', 'Kapı ve ahşap', 'piece'),
  ('decorative', 'Dekoratif boya', 'm2_surface');

-- ---------------------------------------------------------------------------
-- Research data (admins only: third-party listings are never public)
-- ---------------------------------------------------------------------------

create table public.market_price_sources (
  id text primary key check (id ~ '^[a-z0-9_-]{2,40}$'),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  url text not null check (url ~ '^https://'),
  kind text not null check (kind in ('platform', 'firm', 'aggregate', 'official', 'retail', 'boyacep')),
  -- How BoyaCep may use it, from the source's terms.
  terms_note text not null default '' check (char_length(terms_note) <= 500),
  reliability text not null default 'unknown' check (reliability in ('high', 'medium', 'low', 'excluded', 'unknown')),
  created_at timestamptz not null default now()
);

create table public.price_research_runs (
  id uuid primary key default gen_random_uuid(),
  researched_on date not null default current_date,
  notes text not null default '' check (char_length(notes) <= 2000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.market_price_records (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.price_research_runs (id) on delete set null,
  source_id text not null references public.market_price_sources (id),
  province_code text not null references public.provinces (code),
  district text,
  service_key text not null references public.service_categories (key),
  scope text not null check (scope in ('labour', 'materials')),
  kind text not null check (kind in ('firm_price_list', 'platform_request', 'official_unit_price', 'quote', 'accepted_quote', 'completed_job')),
  observed_on date not null check (observed_on <= current_date + 1),
  area_m2 numeric(8, 2) check (area_m2 is null or area_m2 > 0 and area_m2 <= 5000),
  rooms smallint check (rooms is null or rooms between 0 and 20),
  furnished boolean,
  ceiling_included boolean,
  price_low numeric(12, 2) check (price_low is null or price_low > 0),
  price_high numeric(12, 2) check (price_high is null or price_high > 0),
  price numeric(12, 2) not null check (price > 0),
  currency char(3) not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  -- Same job seen twice (another page, another read) gets the same key and is refused.
  dedupe_key text not null unique check (char_length(dedupe_key) between 8 and 200),
  -- Outliers and stale rows are kept for review, never deleted.
  status text not null default 'active' check (status in ('active', 'outlier', 'duplicate', 'stale', 'rejected', 'pending_review')),
  review_note text not null default '' check (char_length(review_note) <= 500),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (price_low is null or price_high is null or price_low <= price_high),
  foreign key (province_code, district) references public.districts (province_code, name)
);

create index market_price_records_place_idx on public.market_price_records (province_code, service_key, scope, observed_on desc);
create index market_price_records_status_idx on public.market_price_records (status) where status <> 'active';

-- BoyaCep's own statistics: what the app may show. One row per place,
-- service, scope and unit per as-of date, so old rows are the history.
create table public.market_price_statistics (
  id uuid primary key default gen_random_uuid(),
  -- A plate code, or 'TR' for all of Türkiye.
  area_code text not null check (area_code = 'TR' or area_code ~ '^(0[1-9]|[1-7][0-9]|8[01])$'),
  district text,
  service_key text not null references public.service_categories (key),
  scope text not null check (scope in ('labour', 'materials')),
  unit text not null check (unit in ('per_m2', 'room')),
  as_of date not null,
  quality text not null check (quality in ('strong', 'medium', 'limited', 'insufficient')),
  observations integer not null check (observations >= 0),
  sources integer not null check (sources >= 0),
  outliers integer not null default 0 check (outliers >= 0),
  stale integer not null default 0 check (stale >= 0),
  newest date,
  oldest date,
  median numeric(12, 2),
  mean numeric(12, 2),
  low numeric(12, 2),
  high numeric(12, 2),
  middle_half boolean not null default false,
  source_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  -- The quality rules travel with the numbers.
  check (quality = 'strong' or mean is null),
  check (quality in ('strong', 'medium') or median is null),
  check ((quality = 'insufficient') = (low is null and high is null)),
  check (low is null or high is null or low <= high),
  check (district is null or area_code <> 'TR')
);

create unique index market_price_statistics_key on public.market_price_statistics
  (area_code, coalesce(district, ''), service_key, scope, unit, as_of);

-- ---------------------------------------------------------------------------
-- Completed jobs: BoyaCep's own verified evidence
-- ---------------------------------------------------------------------------

-- A painter records the final price of a job from an accepted quote; the
-- homeowner confirms it. Only jobs both sides confirmed, and both agreed to
-- share anonymously, may ever feed statistics, and only in groups of 5 or more.
create table public.completed_jobs (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null unique references public.quotes (id) on delete cascade,
  pro_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  province_code text not null references public.provinces (code),
  district text,
  service_key text not null default 'interior_wall' references public.service_categories (key),
  floor_area_m2 numeric(8, 2) check (floor_area_m2 is null or floor_area_m2 > 0 and floor_area_m2 <= 5000),
  materials_included boolean not null,
  final_price numeric(12, 2) not null check (final_price > 0 and final_price <= 10000000),
  completed_on date not null check (completed_on <= current_date + 1),
  pro_shares boolean not null default false,
  owner_confirmed_at timestamptz,
  owner_shares boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (province_code, district) references public.districts (province_code, name)
);

create index completed_jobs_pro_idx on public.completed_jobs (pro_id, completed_on desc);

-- Only the painter of an accepted quote may record its job, and only the
-- homeowner of the quote's project may confirm it (through confirm_completed_job).
create or replace function public.guard_completed_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.quotes q
      where q.id = new.quote_id and q.pro_id = new.pro_id and q.status = 'accepted' and q.project_id is not null
    ) then
      raise exception 'only an accepted quote for a project can become a completed job' using errcode = 'check_violation';
    end if;
    new.owner_confirmed_at := null;
    new.owner_shares := false;
    return new;
  end if;

  -- Updates: the painter may fix details until the homeowner confirms; after
  -- that only the homeowner's own fields change, through the function.
  new.quote_id := old.quote_id;
  new.pro_id := old.pro_id;
  if old.owner_confirmed_at is not null
     and (new.province_code, new.district, new.service_key, new.floor_area_m2, new.materials_included, new.final_price, new.completed_on)
         is distinct from
         (old.province_code, old.district, old.service_key, old.floor_area_m2, old.materials_included, old.final_price, old.completed_on) then
    raise exception 'a confirmed job cannot be changed' using errcode = 'check_violation';
  end if;
  if current_setting('boyacep.confirming_job', true) is distinct from old.id::text
     and (new.owner_confirmed_at, new.owner_shares) is distinct from (old.owner_confirmed_at, old.owner_shares) then
    raise exception 'only the homeowner confirms a job' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger completed_jobs_guard before insert or update on public.completed_jobs
  for each row execute function public.guard_completed_job();

create or replace function public.owns_completed_job(job uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.completed_jobs j
    join public.quotes q on q.id = j.quote_id
    where j.id = job and q.project_id is not null and public.owns_project(q.project_id)
  );
$$;

-- The homeowner confirms the final price and says whether it may be shared anonymously.
create or replace function public.confirm_completed_job(job uuid, share boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.owns_completed_job(job) then
    raise exception 'job not found' using errcode = 'no_data_found';
  end if;
  perform set_config('boyacep.confirming_job', job::text, true);
  update public.completed_jobs set owner_confirmed_at = now(), owner_shares = share where id = job;
  perform set_config('boyacep.confirming_job', '', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin tools: data quality, maintenance, verified-job summaries
-- ---------------------------------------------------------------------------

create or replace function public.market_data_quality()
returns table (
  province_code text,
  province text,
  records bigint,
  active bigint,
  outliers bigint,
  duplicates bigint,
  stale bigint,
  pending_review bigint,
  sources bigint,
  newest date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admins only' using errcode = 'insufficient_privilege';
  end if;
  return query
  select p.code, p.name,
         count(r.id),
         count(r.id) filter (where r.status = 'active'),
         count(r.id) filter (where r.status = 'outlier'),
         count(r.id) filter (where r.status = 'duplicate'),
         count(r.id) filter (where r.status = 'stale'),
         count(r.id) filter (where r.status = 'pending_review'),
         count(distinct r.source_id),
         max(r.observed_on)
  from public.provinces p
  left join public.market_price_records r on r.province_code = p.code
  group by p.code, p.name
  order by p.code;
end;
$$;

-- Marks records older than the age limit as stale. They stay for history.
create or replace function public.mark_stale_market_records(max_age_days integer default 730)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  if not public.is_admin() then
    raise exception 'admins only' using errcode = 'insufficient_privilege';
  end if;
  if max_age_days < 30 then
    raise exception 'age limit too short' using errcode = 'check_violation';
  end if;
  update public.market_price_records
  set status = 'stale', reviewed_by = (select auth.uid()), reviewed_at = now()
  where status = 'active' and observed_on < current_date - max_age_days;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

-- Verified completed jobs by province, only where at least 5 shared jobs
-- exist, so no single job or person can be picked out.
create or replace function public.verified_job_summary()
returns table (province_code text, materials_included boolean, jobs bigint, median_per_m2 numeric, newest date)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admins only' using errcode = 'insufficient_privilege';
  end if;
  return query
  select j.province_code, j.materials_included, count(*),
         round((percentile_cont(0.5) within group (order by (j.final_price / j.floor_area_m2)::float8))::numeric, 2),
         max(j.completed_on)
  from public.completed_jobs j
  where j.owner_confirmed_at is not null and j.owner_shares and j.pro_shares
    and j.floor_area_m2 > 30 and j.floor_area_m2 <= 300
  group by j.province_code, j.materials_included
  having count(*) >= 5;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security and grants
-- ---------------------------------------------------------------------------

alter table public.provinces enable row level security;
alter table public.districts enable row level security;
alter table public.service_categories enable row level security;
alter table public.market_price_sources enable row level security;
alter table public.price_research_runs enable row level security;
alter table public.market_price_records enable row level security;
alter table public.market_price_statistics enable row level security;
alter table public.completed_jobs enable row level security;

create policy "provinces: everyone reads" on public.provinces for select to anon, authenticated using (true);
create policy "districts: everyone reads" on public.districts for select to anon, authenticated using (true);
create policy "services: everyone reads" on public.service_categories for select to anon, authenticated using (true);
create policy "price sources: everyone reads" on public.market_price_sources for select to anon, authenticated using (true);
create policy "price statistics: everyone reads" on public.market_price_statistics for select to anon, authenticated using (true);

create policy "price sources: admins manage" on public.market_price_sources
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "price statistics: admins manage" on public.market_price_statistics
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "research runs: admins only" on public.price_research_runs
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "price records: admins only" on public.market_price_records
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "completed jobs: painter and homeowner read" on public.completed_jobs
  for select to authenticated using (pro_id = (select auth.uid()) or (select public.owns_completed_job(id)));
create policy "completed jobs: painter records" on public.completed_jobs
  for insert to authenticated with check (pro_id = (select auth.uid()));
create policy "completed jobs: painter corrects" on public.completed_jobs
  for update to authenticated using (pro_id = (select auth.uid())) with check (pro_id = (select auth.uid()));

revoke all on public.provinces, public.districts, public.service_categories, public.market_price_sources,
  public.price_research_runs, public.market_price_records, public.market_price_statistics, public.completed_jobs
  from anon, authenticated;
grant select on public.provinces, public.districts, public.service_categories, public.market_price_sources,
  public.market_price_statistics to anon, authenticated;
grant insert, update, delete on public.market_price_sources, public.market_price_statistics to authenticated;
grant select, insert, update, delete on public.price_research_runs, public.market_price_records to authenticated;
grant select, insert, update (province_code, district, service_key, floor_area_m2, materials_included, final_price, completed_on, pro_shares)
  on public.completed_jobs to authenticated;

revoke execute on function public.guard_completed_job() from public, anon, authenticated;
revoke execute on function public.owns_completed_job(uuid), public.confirm_completed_job(uuid, boolean),
  public.market_data_quality(), public.mark_stale_market_records(integer), public.verified_job_summary()
  from public, anon;
grant execute on function public.owns_completed_job(uuid), public.confirm_completed_job(uuid, boolean),
  public.market_data_quality(), public.mark_stale_market_records(integer), public.verified_job_summary()
  to authenticated;
