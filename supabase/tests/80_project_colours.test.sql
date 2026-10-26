-- Colours saved to a project.

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000901', 'sahip@example.com'),
  ('00000000-0000-0000-0000-000000000902', 'usta9@example.com'),
  ('00000000-0000-0000-0000-000000000903', 'yabanci@example.com');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-000000000902', 'pro');

select tests.as_user('00000000-0000-0000-0000-000000000901');
insert into public.projects (id, title) values ('90000000-0000-0000-0000-000000000001', 'Renkli ev');
insert into public.project_colours (project_id, hex, name, surface)
values ('90000000-0000-0000-0000-000000000001', '#A3B49A', 'Adaçayı', 'Salon duvarı');
select tests.check((select count(*) from public.project_colours) = 1, 'owner saves a colour');
select tests.fails(
  $$insert into public.project_colours (project_id, hex, name) values ('90000000-0000-0000-0000-000000000001', '#A3B49A', 'Tekrar')$$,
  'the same colour is saved once per project'
);
select tests.fails(
  $$insert into public.project_colours (project_id, hex, name) values ('90000000-0000-0000-0000-000000000001', 'red', 'Kırmızı')$$,
  'only #RRGGBB codes are accepted'
);
insert into public.project_colours (project_id, hex, name)
select '90000000-0000-0000-0000-000000000001', '#' || lpad(upper(to_hex(i)), 6, '0'), 'Renk ' || i from generate_series(1, 23) as i;
select tests.fails(
  $$insert into public.project_colours (project_id, hex, name) values ('90000000-0000-0000-0000-000000000001', '#FFFFFF', 'Fazla')$$,
  'a project keeps at most 24 colours'
);
select tests.check((public.export_my_data_v2() -> 'project_colours') is not null
  and jsonb_array_length(public.export_my_data_v2() -> 'project_colours') = 24, 'data export includes saved colours');
delete from public.project_colours where hex = '#A3B49A';
select tests.check((select count(*) from public.project_colours) = 23, 'owner removes a colour');

-- Share with a painter.
insert into public.project_invites (id, project_id) values ('93000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001');
reset role;
update public.project_invites set code = 'RENK2345' where id = '93000000-0000-0000-0000-000000000001';

select tests.as_user('00000000-0000-0000-0000-000000000902');
select public.redeem_project_invite('RENK2345');
select tests.check((select count(*) from public.project_colours) = 23, 'painter reads the shared palette');
delete from public.project_colours;
select tests.check((select count(*) from public.project_colours) = 23, 'painter cannot remove colours');
select tests.fails(
  $$insert into public.project_colours (project_id, hex, name) values ('90000000-0000-0000-0000-000000000001', '#000001', 'Usta')$$,
  'painter cannot add colours'
);

select tests.as_user('00000000-0000-0000-0000-000000000903');
select tests.check((select count(*) from public.project_colours) = 0, 'strangers see nothing');
select tests.fails(
  $$insert into public.project_colours (project_id, hex, name) values ('90000000-0000-0000-0000-000000000001', '#000002', 'Yabancı')$$,
  'strangers cannot add colours'
);

select tests.as_anon();
select tests.fails($$select count(*) from public.project_colours$$, 'anonymous users have no access');

select tests.as_user('00000000-0000-0000-0000-000000000901');
delete from public.projects where id = '90000000-0000-0000-0000-000000000001';
reset role;
select tests.check((select count(*) from public.project_colours) = 0, 'colours go with the project');
