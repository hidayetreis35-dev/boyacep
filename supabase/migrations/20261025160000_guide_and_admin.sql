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
