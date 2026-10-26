-- Faz 1: "Ev Hafızası". Which wall got which colour and product, and when, so the
-- homeowner can find the same colour years later. Entries outlive the project they
-- came from (project_id is set to null when it is deleted) and belong to the user.

create table public.home_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  place text not null check (char_length(btrim(place)) between 1 and 80),
  colour_name text check (char_length(colour_name) <= 80),
  colour_hex text check (colour_hex ~ '^#[0-9A-Fa-f]{6}$'),
  -- The colour or product code printed on the tin, as the user typed it.
  colour_code text check (char_length(colour_code) <= 40),
  product text check (char_length(product) <= 120),
  finish text check (finish in ('matt', 'eggshell', 'satin', 'gloss')),
  painted_on date not null default current_date check (painted_on >= date '1950-01-01'),
  painter text check (char_length(painter) <= 80),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index home_log_owner_idx on public.home_log (owner_id, painted_on desc);

create trigger home_log_updated_at before update on public.home_log
  for each row execute function public.set_updated_at();

create or replace function public.home_log_limit()
returns integer
language sql
immutable
as $$ select 500 $$;

create or replace function public.enforce_home_log_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.home_log where owner_id = new.owner_id) >= public.home_log_limit() then
    raise exception 'home log limit reached' using errcode = 'check_violation', hint = 'home_log_limit';
  end if;
  return new;
end;
$$;

create trigger home_log_enforce_limit before insert on public.home_log
  for each row execute function public.enforce_home_log_limit();

alter table public.home_log enable row level security;

-- A linked project must be the user's own.
create policy "home log: owner reads" on public.home_log
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "home log: owner adds" on public.home_log
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and (project_id is null or (select public.owns_project(project_id))));
create policy "home log: owner edits" on public.home_log
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and (project_id is null or (select public.owns_project(project_id))));
create policy "home log: owner deletes" on public.home_log
  for delete to authenticated using (owner_id = (select auth.uid()));

revoke all on public.home_log from anon, authenticated;
grant select, insert, delete on public.home_log to authenticated;
grant update (place, colour_name, colour_hex, colour_code, product, finish, painted_on, painter, note) on public.home_log to authenticated;

revoke execute on function public.enforce_home_log_limit() from public, anon, authenticated;

-- The data export includes the home log (v3 is replaced, same signature).
create or replace function public.export_my_data_v3()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when (select auth.uid()) is null then null else
    public.export_my_data_v2() || jsonb_build_object(
      'project_expenses', coalesce((
        select jsonb_agg(to_jsonb(e) order by e.spent_on, e.created_at)
        from public.project_expenses e
        where e.owner_id = (select auth.uid())
      ), '[]'::jsonb),
      'home_log', coalesce((
        select jsonb_agg(to_jsonb(h) order by h.painted_on, h.created_at)
        from public.home_log h
        where h.owner_id = (select auth.uid())
      ), '[]'::jsonb)
    )
  end;
$$;
