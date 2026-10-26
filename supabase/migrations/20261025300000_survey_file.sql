-- Akıllı Keşif Dosyası v1: wall inspections saved to a project, and painters
-- who joined a project read the calculation snapshots the homeowner shared.

create table public.inspection_results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  place text not null check (place in ('room', 'wet', 'exterior')),
  -- Symptom ids from the app's rule list; empty means nothing wrong was seen.
  symptoms text[] not null default '{}' check (
    symptoms <@ array[
      'wide_crack', 'damp_stain', 'mould', 'blistering', 'efflorescence',
      'peeling', 'hairline_crack', 'surface_damage', 'patchy', 'chalking'
    ]
    and cardinality(symptoms) <= 10
  ),
  -- Where in the home: "Banyo tavanı", "Salon, pencere altı"… Optional.
  location text check (location is null or char_length(btrim(location)) between 1 and 60),
  created_at timestamptz not null default now()
);

create index inspection_results_project_idx on public.inspection_results (project_id, created_at);

create or replace function public.limit_inspection_results()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.inspection_results where project_id = new.project_id) >= 30 then
    raise exception 'inspection limit reached' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger inspection_results_limit before insert on public.inspection_results
  for each row execute function public.limit_inspection_results();

alter table public.inspection_results enable row level security;

create policy "inspections: owner and members read" on public.inspection_results
  for select to authenticated using ((select public.can_view_project(project_id)));
create policy "inspections: owner adds" on public.inspection_results
  for insert to authenticated with check ((select public.owns_project(project_id)));
create policy "inspections: owner removes" on public.inspection_results
  for delete to authenticated using ((select public.owns_project(project_id)));

revoke all on public.inspection_results from anon, authenticated;
grant select, insert, delete on public.inspection_results to authenticated;

-- ---------------------------------------------------------------------------
-- Calculation snapshots: written when the homeowner shares the survey file.
-- ---------------------------------------------------------------------------

create policy "calculations: members read" on public.calculations
  for select to authenticated using ((select public.is_project_member(project_id)));

create or replace function public.limit_calculations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.calculations where project_id = new.project_id) >= 100 then
    raise exception 'calculation limit reached' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger calculations_limit before insert on public.calculations
  for each row execute function public.limit_calculations();

revoke execute on function public.limit_inspection_results(), public.limit_calculations()
  from public, anon, authenticated;

-- Data export includes saved inspections.
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
      ), '[]'::jsonb),
      'inspection_results', coalesce((
        select jsonb_agg(to_jsonb(i) order by i.created_at)
        from public.inspection_results i join public.projects p on p.id = i.project_id
        where p.owner_id = (select auth.uid())
      ), '[]'::jsonb)
    )
  end;
$$;

revoke execute on function public.export_my_data_v2() from public, anon;
grant execute on function public.export_my_data_v2() to authenticated;
