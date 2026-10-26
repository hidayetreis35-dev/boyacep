-- Faz 1: "Akıllı Bütçe". What the homeowner actually spent, next to the plan
-- (budget, material list and costs). Receipts are optional photos in a private bucket
-- at <owner id>/<project id>/<expense id>.<ext>, readable only by the owner.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-receipts', 'project-receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table public.project_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (category in ('paint', 'material', 'labor', 'other')),
  label text not null check (char_length(btrim(label)) between 1 and 120),
  amount numeric(12, 2) not null check (amount > 0 and amount <= 100000000),
  spent_on date not null default current_date check (spent_on >= date '2000-01-01'),
  store_name text check (char_length(store_name) <= 80),
  note text check (char_length(note) <= 500),
  receipt_path text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    receipt_path is null or (
      receipt_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
      and split_part(receipt_path, '/', 1) = owner_id::text
      and split_part(receipt_path, '/', 2) = project_id::text
    )
  )
);

create index project_expenses_project_idx on public.project_expenses (project_id, spent_on desc);

create trigger project_expenses_updated_at before update on public.project_expenses
  for each row execute function public.set_updated_at();
create trigger project_expenses_touch_project after insert or update or delete on public.project_expenses
  for each row execute function public.touch_project();

-- Keeps one project's list readable and storage use predictable.
create or replace function public.expense_limit()
returns integer
language sql
immutable
as $$ select 300 $$;

create or replace function public.enforce_expense_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.project_expenses where project_id = new.project_id) >= public.expense_limit() then
    raise exception 'expense limit reached' using errcode = 'check_violation', hint = 'expense_limit';
  end if;
  return new;
end;
$$;

create trigger project_expenses_enforce_limit before insert on public.project_expenses
  for each row execute function public.enforce_expense_limit();

alter table public.project_expenses enable row level security;

create policy "expenses: owner of the project" on public.project_expenses
  for all to authenticated
  using (owner_id = (select auth.uid()) and (select public.owns_project(project_id)))
  with check (owner_id = (select auth.uid()) and (select public.owns_project(project_id)));

revoke all on public.project_expenses from anon, authenticated;
grant select, insert, delete on public.project_expenses to authenticated;
grant update (category, label, amount, spent_on, store_name, note, receipt_path) on public.project_expenses to authenticated;

-- Storage: same path rule as project photos (owner folder, then an owned project).
create policy "project receipts: owner reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-receipts' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy "project receipts: owner uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-receipts' and (select public.can_write_photo_path(name)));
create policy "project receipts: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-receipts' and split_part(name, '/', 1) = (select auth.uid())::text);

revoke execute on function public.enforce_expense_limit() from public, anon, authenticated;

-- The data export includes expenses.
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
      ), '[]'::jsonb)
    )
  end;
$$;

revoke execute on function public.export_my_data_v3() from public, anon;
grant execute on function public.export_my_data_v3() to authenticated;
