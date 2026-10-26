-- Project photos: table rows and storage objects are private to the owner.

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000a51', 'foto@example.com'),
  ('00000000-0000-0000-0000-000000000b51', 'meraklı@example.com');

select tests.check(
  (select not public and file_size_limit = 10485760 and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
     from storage.buckets where id = 'project-photos'),
  'photo bucket is private, images only, 10 MB'
);

select tests.as_user('00000000-0000-0000-0000-000000000a51');
insert into public.projects (id, title) values ('50000000-0000-0000-0000-000000000001', 'Foto evi');
insert into public.rooms (id, project_id, name, length_m, width_m, height_m)
values ('51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Salon', 5, 4, 2.7);

-- Storage: own folder and own project only.
insert into storage.objects (bucket_id, name) values
  ('project-photos', '00000000-0000-0000-0000-000000000a51/50000000-0000-0000-0000-000000000001/52000000-0000-0000-0000-000000000001.jpg');
select tests.fails(
  $$insert into storage.objects (bucket_id, name) values
    ('project-photos', '00000000-0000-0000-0000-000000000b51/50000000-0000-0000-0000-000000000001/52000000-0000-0000-0000-000000000002.jpg')$$,
  'cannot upload into another user''s folder'
);
select tests.fails(
  $$insert into storage.objects (bucket_id, name) values
    ('project-photos', '00000000-0000-0000-0000-000000000a51/59999999-0000-0000-0000-000000000001/52000000-0000-0000-0000-000000000003.jpg')$$,
  'cannot upload into a project you do not own'
);
select tests.fails(
  $$insert into storage.objects (bucket_id, name) values ('project-photos', '00000000-0000-0000-0000-000000000a51/notes.txt')$$,
  'cannot upload outside the photo path pattern'
);

insert into public.project_photos (id, project_id, room_id, storage_path, width, height, byte_size)
values (
  '52000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000a51/50000000-0000-0000-0000-000000000001/52000000-0000-0000-0000-000000000001.jpg',
  1600, 1200, 350000
);
update public.project_photos set wall_outline = '[[0.1,0.1],[0.9,0.1],[0.9,0.8]]' where id = '52000000-0000-0000-0000-000000000001';
select tests.check(
  (select jsonb_array_length(wall_outline) from public.project_photos where id = '52000000-0000-0000-0000-000000000001') = 3,
  'owner saves a wall outline'
);
select tests.fails(
  $$update public.project_photos set storage_path = 'x' where id = '52000000-0000-0000-0000-000000000001'$$,
  'storage path cannot be changed after upload'
);
select tests.fails(
  $$insert into public.project_photos (project_id, storage_path, width, height, byte_size) values (
    '50000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000a51/50000000-0000-0000-0000-000000000001/52000000-0000-0000-0000-000000000009.gif',
    10, 10, 100)$$,
  'only jpg, png or webp paths are accepted'
);
select tests.fails(
  $$insert into public.project_photos (project_id, storage_path, width, height, byte_size) values (
    '50000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000a51/50000000-0000-0000-0000-000000000001/52000000-0000-0000-0000-000000000008.jpg',
    10, 10, 20000000)$$,
  'photos over 10 MB are rejected'
);

-- Someone else sees nothing and cannot touch anything.
select tests.as_user('00000000-0000-0000-0000-000000000b51');
select tests.check((select count(*) from public.project_photos) = 0, 'other user sees no photo rows');
select tests.check((select count(*) from storage.objects where bucket_id = 'project-photos') = 0, 'other user sees no photo files');
delete from storage.objects where bucket_id = 'project-photos';
delete from public.project_photos;
select tests.fails(
  $$insert into public.project_photos (project_id, storage_path, width, height, byte_size) values (
    '50000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000b51/50000000-0000-0000-0000-000000000001/52000000-0000-0000-0000-000000000007.jpg',
    10, 10, 100)$$,
  'other user cannot attach photos to the project'
);

select tests.as_anon();
select tests.fails($$select count(*) from public.project_photos$$, 'visitors cannot read photo rows');

-- Room must be in the same project; the free plan allows 20 photos per project.
select tests.as_user('00000000-0000-0000-0000-000000000a51');
select tests.check((select count(*) from storage.objects where bucket_id = 'project-photos') = 1, 'owner files survive other users');
insert into public.projects (id, title) values ('50000000-0000-0000-0000-000000000002', 'İkinci ev');
select tests.fails(
  $$insert into public.project_photos (project_id, room_id, storage_path, width, height, byte_size) values (
    '50000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000a51/50000000-0000-0000-0000-000000000002/52000000-0000-0000-0000-000000000006.jpg',
    10, 10, 100)$$,
  'photo room must belong to the same project'
);
insert into public.project_photos (project_id, storage_path, width, height, byte_size)
select '50000000-0000-0000-0000-000000000001',
       format('00000000-0000-0000-0000-000000000a51/50000000-0000-0000-0000-000000000001/53000000-0000-0000-0000-%s.jpg', lpad(i::text, 12, '0')),
       10, 10, 100
from generate_series(1, 19) as i;
select tests.fails(
  $$insert into public.project_photos (project_id, storage_path, width, height, byte_size) values (
    '50000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000a51/50000000-0000-0000-0000-000000000001/54000000-0000-0000-0000-000000000001.jpg',
    10, 10, 100)$$,
  'free plan stops at 20 photos per project'
);

reset role;
delete from auth.users where id in ('00000000-0000-0000-0000-000000000a51', '00000000-0000-0000-0000-000000000b51');
