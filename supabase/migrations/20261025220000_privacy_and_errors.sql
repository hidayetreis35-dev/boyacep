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
