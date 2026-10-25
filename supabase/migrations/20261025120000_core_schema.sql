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
