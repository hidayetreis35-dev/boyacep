-- Akıllı Keşif Dosyası: wall inspections saved to a project and calculation
-- snapshots, readable by painters who joined the project.

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000b01', 'ev11@example.com'),    -- homeowner
  ('00000000-0000-0000-0000-000000000b02', 'usta13@example.com'),  -- painter on the project
  ('00000000-0000-0000-0000-000000000b03', 'usta14@example.com');  -- painter not on it
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-000000000b01', 'homeowner'),
  ('00000000-0000-0000-0000-000000000b02', 'pro'),
  ('00000000-0000-0000-0000-000000000b03', 'pro');

select tests.as_user('00000000-0000-0000-0000-000000000b01');
insert into public.projects (id, title) values ('b0000000-0000-0000-0000-000000000001', 'Banyo ve salon');
insert into public.project_invites (id, project_id) values ('b3000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001');
reset role;
update public.project_invites set code = 'KESF2345' where id = 'b3000000-0000-0000-0000-000000000001';
select tests.as_user('00000000-0000-0000-0000-000000000b02');
select public.redeem_project_invite('KESF2345');

-- ---- Inspections -------------------------------------------------------------
select tests.as_user('00000000-0000-0000-0000-000000000b01');
insert into public.inspection_results (id, project_id, place, symptoms, location)
values ('b4000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'wet', array['mould', 'peeling'], 'Banyo tavanı');
select tests.check((select count(*) from public.inspection_results) = 1, 'homeowner saves an inspection to the project');
insert into public.inspection_results (project_id, place) values ('b0000000-0000-0000-0000-000000000001', 'room');
select tests.check(
  (select symptoms = '{}' from public.inspection_results where location is null),
  'an inspection with nothing wrong is kept as an empty list'
);
select tests.fails(
  $$insert into public.inspection_results (project_id, place, symptoms) values ('b0000000-0000-0000-0000-000000000001', 'room', array['rust'])$$,
  'only known symptoms are accepted'
);
select tests.fails(
  $$insert into public.inspection_results (project_id, place) values ('b0000000-0000-0000-0000-000000000001', 'garden')$$,
  'only known places are accepted'
);
select tests.fails(
  $$insert into public.inspection_results (project_id, place, location) values ('b0000000-0000-0000-0000-000000000001', 'room', '   ')$$,
  'a blank location is rejected'
);

select tests.as_user('00000000-0000-0000-0000-000000000b02');
select tests.check((select count(*) from public.inspection_results) = 2, 'painter on the project reads the inspections');
select tests.fails(
  $$insert into public.inspection_results (project_id, place) values ('b0000000-0000-0000-0000-000000000001', 'room')$$,
  'painter cannot add inspections'
);
delete from public.inspection_results;

select tests.as_user('00000000-0000-0000-0000-000000000b03');
select tests.check((select count(*) from public.inspection_results) = 0, 'other painters see no inspections');
select tests.fails(
  $$insert into public.inspection_results (project_id, place) values ('b0000000-0000-0000-0000-000000000001', 'room')$$,
  'other users cannot add inspections to the project'
);

select tests.as_user('00000000-0000-0000-0000-000000000b01');
select tests.check((select count(*) from public.inspection_results) = 2, 'painter could not delete inspections');
delete from public.inspection_results where location is null;
select tests.check((select count(*) from public.inspection_results) = 1, 'homeowner deletes an inspection');
insert into public.inspection_results (project_id, place)
select 'b0000000-0000-0000-0000-000000000001', 'room' from generate_series(1, 29);
select tests.fails(
  $$insert into public.inspection_results (project_id, place) values ('b0000000-0000-0000-0000-000000000001', 'room')$$,
  'a project keeps at most 30 inspections'
);
select tests.check(
  jsonb_array_length(public.export_my_data_v2() -> 'inspection_results') = 30,
  'data export includes inspections'
);

-- ---- Calculation snapshots -------------------------------------------------------
insert into public.calculations (project_id, engine_version, input, result)
values ('b0000000-0000-0000-0000-000000000001', '1.0.0', '{"rooms": []}', '{"totals": {}}');

select tests.as_user('00000000-0000-0000-0000-000000000b02');
select tests.check((select count(*) from public.calculations) = 1, 'painter on the project reads the shared calculation');
select tests.fails(
  $$insert into public.calculations (project_id, engine_version, input, result)
    values ('b0000000-0000-0000-0000-000000000001', '1.0.0', '{}', '{}')$$,
  'painter cannot write calculations'
);

select tests.as_user('00000000-0000-0000-0000-000000000b03');
select tests.check((select count(*) from public.calculations) = 0, 'other painters see no calculations');

select tests.as_user('00000000-0000-0000-0000-000000000b01');
insert into public.calculations (project_id, engine_version, input, result)
select 'b0000000-0000-0000-0000-000000000001', '1.0.0', '{}', '{}' from generate_series(1, 99);
select tests.fails(
  $$insert into public.calculations (project_id, engine_version, input, result)
    values ('b0000000-0000-0000-0000-000000000001', '1.0.0', '{}', '{}')$$,
  'a project keeps at most 100 calculation snapshots'
);

-- ---- Leaving and deleting ---------------------------------------------------------
delete from public.project_members where user_id = '00000000-0000-0000-0000-000000000b02';
select tests.as_user('00000000-0000-0000-0000-000000000b02');
select tests.check((select count(*) from public.inspection_results) = 0, 'removed painter loses the inspections');
select tests.check((select count(*) from public.calculations) = 0, 'removed painter loses the calculations');

select tests.as_anon();
select tests.fails($$select count(*) from public.inspection_results$$, 'visitors cannot read inspections');

select tests.as_user('00000000-0000-0000-0000-000000000b01');
delete from public.projects where id = 'b0000000-0000-0000-0000-000000000001';
reset role;
select tests.check(
  (select count(*) from public.inspection_results where project_id = 'b0000000-0000-0000-0000-000000000001') = 0,
  'deleting the project deletes its inspections'
);

delete from auth.users where id in (
  '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000b02', '00000000-0000-0000-0000-000000000b03'
);
