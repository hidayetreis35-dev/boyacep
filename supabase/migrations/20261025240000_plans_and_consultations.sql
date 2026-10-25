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
