-- Ev Hafızası: entries are private, survive project deletion and go with the account.

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000a99', 'hafiza@example.com'),
  ('00000000-0000-0000-0000-000000000b99', 'baska@example.com');

select tests.as_user('00000000-0000-0000-0000-000000000a99');
insert into public.projects (id, title) values ('99000000-0000-0000-0000-000000000001', 'Salon boyası');

insert into public.home_log (project_id, place, colour_name, colour_hex, colour_code, product, finish, painted_on, painter)
values ('99000000-0000-0000-0000-000000000001', 'Salon duvarları', 'Kırık beyaz', '#F4F1EA', '7035', 'İç cephe, silinebilir', 'matt', '2026-10-20', 'Ahmet usta');
insert into public.home_log (place, colour_hex) values ('Banyo tavanı', '#ffffff');

select tests.check((select count(*) from public.home_log) = 2, 'owner reads own entries');
select tests.check(
  (select owner_id from public.home_log where place = 'Banyo tavanı') = '00000000-0000-0000-0000-000000000a99',
  'owner is filled in from the session'
);
update public.home_log set note = 'Rötuş için kutuda 1 L kaldı' where place = 'Salon duvarları';
select tests.check((select note from public.home_log where place = 'Salon duvarları') is not null, 'owner adds a note');

select tests.fails($$insert into public.home_log (place, colour_hex) values ('Mutfak', 'kırmızı')$$, 'colour must be a hex code');
select tests.fails($$insert into public.home_log (place, finish) values ('Mutfak', 'shiny')$$, 'unknown finish is rejected');
select tests.fails($$insert into public.home_log (place) values ('  ')$$, 'place is required');
select tests.fails(
  $$update public.home_log set owner_id = '00000000-0000-0000-0000-000000000b99' where place = 'Banyo tavanı'$$,
  'owner cannot be changed'
);
select tests.check(jsonb_array_length(public.export_my_data_v3() -> 'home_log') = 2, 'data export includes the home log');

select tests.as_user('00000000-0000-0000-0000-000000000b99');
select tests.check((select count(*) from public.home_log) = 0, 'other user sees no entries');
update public.home_log set place = 'x';
delete from public.home_log;
select tests.fails(
  $$insert into public.home_log (project_id, place) values ('99000000-0000-0000-0000-000000000001', 'Sızma')$$,
  'cannot link an entry to someone else''s project'
);
insert into public.home_log (place) values ('Kendi evim');
select tests.check((select count(*) from public.home_log) = 1, 'other user keeps a separate log');

reset role;
select tests.check(
  (select count(*) from public.home_log where owner_id = '00000000-0000-0000-0000-000000000a99') = 2
  and not exists (select 1 from public.home_log where place = 'x'),
  'foreign writes had no effect'
);

select tests.as_user('00000000-0000-0000-0000-000000000a99');
delete from public.projects where id = '99000000-0000-0000-0000-000000000001';
select tests.check(
  (select project_id from public.home_log where place = 'Salon duvarları') is null,
  'entries survive deleting the project'
);

reset role;
delete from auth.users where id = '00000000-0000-0000-0000-000000000a99';
select tests.check(
  (select count(*) from public.home_log where place in ('Salon duvarları', 'Banyo tavanı')) = 0,
  'deleting the account removes the log'
);
