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
