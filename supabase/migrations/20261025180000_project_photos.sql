-- Phase 5: wall photos stored privately per project, plus the wall outline used by "Rengini Dene".
--
-- Files live in the private "project-photos" bucket at <owner id>/<project id>/<photo id>.<ext>.
-- Only the owner can read, add or remove them; the bucket itself rejects non-images and files over 10 MB.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-photos', 'project-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null unique,
  width integer not null check (width between 1 and 10000),
  height integer not null check (height between 1 and 10000),
  byte_size integer not null check (byte_size between 1 and 10485760),
  -- Wall outline as normalised points: [[x, y], ...] with 0 <= x, y <= 1.
  wall_outline jsonb check (wall_outline is null or jsonb_typeof(wall_outline) = 'array'),
  created_at timestamptz not null default now(),
  check (
    storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and split_part(storage_path, '/', 1) = owner_id::text
    and split_part(storage_path, '/', 2) = project_id::text
  )
);

create index project_photos_project_idx on public.project_photos (project_id, created_at);

-- Keeps storage use predictable on the free plan.
create or replace function public.photo_limit()
returns integer
language sql
immutable
as $$ select 20 $$;

create or replace function public.enforce_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.project_photos where project_id = new.project_id) >= public.photo_limit() then
    raise exception 'photo limit reached' using errcode = 'check_violation', hint = 'photo_limit';
  end if;
  return new;
end;
$$;

create trigger project_photos_enforce_limit before insert on public.project_photos
  for each row execute function public.enforce_photo_limit();

-- A room attached to a photo must belong to the same project.
create or replace function public.check_photo_room()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.room_id is not null
     and not exists (select 1 from public.rooms where id = new.room_id and project_id = new.project_id) then
    raise exception 'room belongs to another project' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger project_photos_check_room before insert or update on public.project_photos
  for each row execute function public.check_photo_room();

alter table public.project_photos enable row level security;

create policy "photos: owner reads" on public.project_photos
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "photos: owner adds to own project" on public.project_photos
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.owns_project(project_id)));
create policy "photos: owner updates" on public.project_photos
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and (select public.owns_project(project_id)));
create policy "photos: owner deletes" on public.project_photos
  for delete to authenticated using (owner_id = (select auth.uid()));

revoke all on public.project_photos from anon, authenticated;
grant select, insert, delete on public.project_photos to authenticated;
-- Only the outline and room can change after upload.
grant update (wall_outline, room_id) on public.project_photos to authenticated;

-- ---------------------------------------------------------------------------
-- Storage policies. The first folder is the owner, the second the project.
-- ---------------------------------------------------------------------------

create or replace function public.can_write_photo_path(path text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := string_to_array(path, '/');
begin
  if path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' then
    return false;
  end if;
  return parts[1] = (select auth.uid())::text and public.owns_project(parts[2]::uuid);
end;
$$;

create policy "project photos: owner reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-photos' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy "project photos: owner uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-photos' and (select public.can_write_photo_path(name)));
create policy "project photos: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-photos' and split_part(name, '/', 1) = (select auth.uid())::text);

revoke execute on function
  public.enforce_photo_limit(),
  public.check_photo_room()
from public, anon, authenticated;
revoke execute on function public.can_write_photo_path(text) from public, anon;
grant execute on function public.can_write_photo_path(text) to authenticated;
