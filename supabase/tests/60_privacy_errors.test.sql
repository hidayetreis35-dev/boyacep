-- Data export, account deletion and crash reports.

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000701', 'gidecek@example.com'),
  ('00000000-0000-0000-0000-000000000702', 'kalacak@example.com'),
  ('00000000-0000-0000-0000-000000000703', 'admin7@example.com');
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-000000000701', 'pro'),
  ('00000000-0000-0000-0000-000000000702', 'homeowner'),
  ('00000000-0000-0000-0000-000000000703', 'admin');

select tests.as_user('00000000-0000-0000-0000-000000000701');
insert into public.projects (id, title, budget) values ('70000000-0000-0000-0000-000000000001', 'Benim evim', 1000);
insert into public.rooms (project_id, name, length_m, width_m, height_m) values ('70000000-0000-0000-0000-000000000001', 'Oda', 3, 3, 2.5);
insert into public.pro_profiles (user_id, full_name, city) values ('00000000-0000-0000-0000-000000000701', 'Gidecek Usta', 'Ankara');
insert into public.quotes (title) values ('Bir teklif');

select tests.as_user('00000000-0000-0000-0000-000000000702');
insert into public.projects (id, title) values ('70000000-0000-0000-0000-000000000002', 'Başkasının evi');

select tests.as_user('00000000-0000-0000-0000-000000000701');
select tests.check(
  (select (d -> 'account' ->> 'email') = 'gidecek@example.com'
      and jsonb_array_length(d -> 'projects') = 1
      and jsonb_array_length(d -> 'rooms') = 1
      and jsonb_array_length(d -> 'quotes') = 1
      and (d -> 'pro_profile' ->> 'full_name') = 'Gidecek Usta'
      and (d -> 'roles') = '["pro"]'::jsonb
   from public.export_my_data() as d),
  'export contains the user''s own data'
);
select tests.check(
  (select d::text not like '%Başkasının evi%' from public.export_my_data() as d),
  'export never contains other users'' data'
);

-- Crash reports
insert into public.client_errors (message, stack, screen, platform) values ('TypeError: x is undefined', 'at Foo', '/projects', 'android');
select tests.fails(
  $$insert into public.client_errors (message, user_id) values ('sahte', '00000000-0000-0000-0000-000000000702')$$,
  'reporters cannot pick another user id'
);
select tests.fails($$insert into public.client_errors (message, platform) values ('x', 'windows')$$, 'platform comes from a fixed list');
select tests.check((select count(*) from public.client_errors) = 0, 'users cannot read crash reports');
insert into public.client_errors (message) select 'döngü ' || i from generate_series(1, 30) as i;

select tests.as_user('00000000-0000-0000-0000-000000000703');
select tests.check(
  (select count(*) from public.client_errors where user_id = '00000000-0000-0000-0000-000000000701') = 20,
  'crash reports are capped at 20 per user per hour'
);
select tests.fails($$select public.delete_my_account()$$, 'admins cannot delete themselves by accident');

select tests.as_anon();
select tests.fails($$insert into public.client_errors (message) values ('anon')$$, 'visitors cannot write crash reports');
select tests.fails($$select public.delete_my_account()$$, 'visitors cannot call account deletion');
select tests.fails($$select public.export_my_data()$$, 'visitors cannot export data');

-- Deleting the account removes everything the user owned, and nothing else.
select tests.as_user('00000000-0000-0000-0000-000000000701');
select public.delete_my_account();

reset role;
select tests.check((select count(*) from auth.users where id = '00000000-0000-0000-0000-000000000701') = 0, 'the account is gone');
select tests.check(
  (select count(*) from public.projects where owner_id = '00000000-0000-0000-0000-000000000701') = 0
  and (select count(*) from public.pro_profiles where user_id = '00000000-0000-0000-0000-000000000701') = 0
  and (select count(*) from public.quotes where pro_id = '00000000-0000-0000-0000-000000000701') = 0
  and (select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000701') = 0,
  'the user''s projects, profile and quotes are gone'
);
select tests.check((select count(*) from public.projects where id = '70000000-0000-0000-0000-000000000002') = 1, 'other users keep their data');
select tests.check(
  (select count(*) from public.client_errors where user_id is null) >= 20,
  'crash reports stay, without the user id'
);

delete from public.client_errors;
delete from auth.users where id in ('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000703');
