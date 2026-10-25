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
