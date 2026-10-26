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
