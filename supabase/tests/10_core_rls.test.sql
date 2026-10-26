-- RLS tests for the core schema. Each block runs as a given user and raises on
-- failure, so psql with ON_ERROR_STOP exits non-zero when any check fails.

create schema if not exists tests;

create or replace function tests.as_user(uid uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end;
$$;

create or replace function tests.as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', false);
  execute 'set role anon';
end;
$$;

create or replace function tests.check(ok boolean, label text)
returns void
language plpgsql
as $$
begin
  if ok is distinct from true then
    raise exception 'FAILED: %', label;
  end if;
  raise notice 'ok - %', label;
end;
$$;

-- Runs `sql` and passes when it raises an error (permission, RLS or constraint).
create or replace function tests.fails(sql text, label text)
returns void
language plpgsql
as $$
begin
  begin
    execute sql;
  exception when others then
    raise notice 'ok - % (%)', label, sqlerrm;
    return;
  end;
  raise exception 'FAILED: % (statement succeeded)', label;
end;
$$;

grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

-- Fixtures: Ayşe and Burak, created by the auth system (superuser).
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ayse@example.com', '{"display_name":"Ayşe"}'),
  ('00000000-0000-0000-0000-00000000000b', 'burak@example.com', '{}');

select tests.check(
  (select count(*) from public.profiles) = 2 and
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Ayşe',
  'a profile is created for each new user'
);

-- ---- Ayşe sets up her account and a project -------------------------------
select tests.as_user('00000000-0000-0000-0000-00000000000a');

insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000a', 'homeowner');
select tests.check((select count(*) from public.user_roles) = 1, 'user can add the homeowner role to herself');

update public.profiles set active_role = 'homeowner' where id = '00000000-0000-0000-0000-00000000000a';
select tests.check(
  (select active_role from public.profiles) = 'homeowner',
  'user can activate a role she holds'
);
select tests.fails(
  $$update public.profiles set active_role = 'pro' where id = '00000000-0000-0000-0000-00000000000a'$$,
  'user cannot activate a role she does not hold'
);
select tests.fails(
  $$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000a', 'admin')$$,
  'user cannot make herself admin'
);
select tests.fails(
  $$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000b', 'pro')$$,
  'user cannot give roles to someone else'
);

insert into public.projects (id, title) values ('10000000-0000-0000-0000-000000000001', 'Salon boyası');
select tests.check(
  (select owner_id from public.projects where id = '10000000-0000-0000-0000-000000000001')
    = '00000000-0000-0000-0000-00000000000a',
  'owner_id defaults to the signed-in user'
);
select tests.fails(
  $$insert into public.projects (title, owner_id) values ('Sahte', '00000000-0000-0000-0000-00000000000b')$$,
  'user cannot create a project owned by someone else'
);
select tests.fails($$insert into public.projects (title) values ('   ')$$, 'blank project title is rejected');

insert into public.rooms (id, project_id, name, length_m, width_m, height_m)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Salon', 5, 4, 2.6);
insert into public.room_openings (room_id, kind, width_m, height_m)
values ('20000000-0000-0000-0000-000000000001', 'door', 0.9, 2.1);
insert into public.calculations (project_id, engine_version, input, result)
values ('10000000-0000-0000-0000-000000000001', '1', '{}', '{}');

select tests.fails(
  $$insert into public.rooms (project_id, name, length_m, width_m, height_m, paint_walls, paint_ceiling)
    values ('10000000-0000-0000-0000-000000000001', 'Boş', 3, 3, 2.5, false, false)$$,
  'room must paint walls or ceiling'
);
select tests.fails(
  $$insert into public.rooms (project_id, name, length_m, width_m, height_m)
    values ('10000000-0000-0000-0000-000000000001', 'Dev', 3, 3, 25)$$,
  'absurd ceiling height is rejected'
);

reset role;
update public.projects set updated_at = '2000-01-01' where id = '10000000-0000-0000-0000-000000000001';
select tests.as_user('00000000-0000-0000-0000-00000000000a');
update public.rooms set name = 'Büyük salon' where id = '20000000-0000-0000-0000-000000000001';
select tests.check(
  (select updated_at > '2001-01-01' from public.projects where id = '10000000-0000-0000-0000-000000000001'),
  'editing a room bumps the project updated_at'
);

update public.projects set status = 'planning' where id = '10000000-0000-0000-0000-000000000001';
select tests.check(
  (select status from public.projects) = 'planning',
  'owner can change project status'
);

-- ---- Burak must not see or touch Ayşe's data ------------------------------
select tests.as_user('00000000-0000-0000-0000-00000000000b');

select tests.check((select count(*) from public.projects) = 0, 'other user sees no projects');
select tests.check((select count(*) from public.rooms) = 0, 'other user sees no rooms');
select tests.check((select count(*) from public.room_openings) = 0, 'other user sees no openings');
select tests.check((select count(*) from public.calculations) = 0, 'other user sees no calculations');
select tests.check((select count(*) from public.profiles) = 1, 'other user sees only his own profile');
select tests.check((select count(*) from public.user_roles) = 0, 'other user sees no one else''s roles');

update public.projects set title = 'Hacked' where id = '10000000-0000-0000-0000-000000000001';
delete from public.rooms where id = '20000000-0000-0000-0000-000000000001';
update public.profiles set display_name = 'Hacked' where id = '00000000-0000-0000-0000-00000000000a';

select tests.fails(
  $$insert into public.rooms (project_id, name, length_m, width_m, height_m)
    values ('10000000-0000-0000-0000-000000000001', 'Sızma', 3, 3, 2.5)$$,
  'other user cannot add a room to the project'
);
select tests.fails(
  $$insert into public.room_openings (room_id, kind, width_m, height_m)
    values ('20000000-0000-0000-0000-000000000001', 'window', 1, 1)$$,
  'other user cannot add an opening to the room'
);
select tests.fails(
  $$insert into public.calculations (project_id, engine_version, input, result)
    values ('10000000-0000-0000-0000-000000000001', '1', '{}', '{}')$$,
  'other user cannot add a calculation to the project'
);

-- Burak moves his own room into Ayşe's project: must fail.
insert into public.projects (id, title) values ('10000000-0000-0000-0000-000000000002', 'Burak''ın odası');
insert into public.rooms (id, project_id, name, length_m, width_m, height_m)
values ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Oda', 3, 3, 2.5);
select tests.fails(
  $$update public.rooms set project_id = '10000000-0000-0000-0000-000000000001'
    where id = '20000000-0000-0000-0000-000000000002'$$,
  'other user cannot move a room into a foreign project'
);

reset role;
select tests.check(
  (select title from public.projects where id = '10000000-0000-0000-0000-000000000001') = 'Salon boyası',
  'foreign update had no effect on the project'
);
select tests.check(
  (select count(*) from public.rooms where id = '20000000-0000-0000-0000-000000000001') = 1,
  'foreign delete had no effect on the room'
);
select tests.check(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Ayşe',
  'foreign update had no effect on the profile'
);

-- ---- Free plan project limit ---------------------------------------------
select tests.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.projects (title) values ('İkinci'), ('Üçüncü');
select tests.fails($$insert into public.projects (title) values ('Dördüncü')$$, 'a fourth project is refused on the free plan');
delete from public.projects where title in ('İkinci', 'Üçüncü');

-- ---- Anonymous visitors get nothing ---------------------------------------
select tests.as_anon();
select tests.fails($$select * from public.projects$$, 'anon cannot read projects');
select tests.fails($$select * from public.profiles$$, 'anon cannot read profiles');
select tests.fails($$insert into public.projects (title) values ('x')$$, 'anon cannot create projects');

-- ---- Admin can read, but only via a granted role --------------------------
reset role;
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000b', 'admin');
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.check((select count(*) from public.projects) = 2, 'admin can read all projects');
update public.projects set title = 'Admin edit' where id = '10000000-0000-0000-0000-000000000001';
reset role;
select tests.check(
  (select title from public.projects where id = '10000000-0000-0000-0000-000000000001') = 'Salon boyası',
  'admin cannot edit other users'' projects'
);

-- ---- Deleting a user removes everything they own ---------------------------
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select tests.check(
  (select count(*) from public.projects where owner_id = '00000000-0000-0000-0000-00000000000a') = 0
  and (select count(*) from public.rooms where id = '20000000-0000-0000-0000-000000000001') = 0
  and (select count(*) from public.room_openings) = 0
  and (select count(*) from public.calculations) = 0
  and (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 0,
  'deleting a user cascades to profile, projects, rooms, openings and calculations'
);
