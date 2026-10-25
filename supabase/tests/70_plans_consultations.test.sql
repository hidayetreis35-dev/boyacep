-- Plan entitlements, limits and Ustaya Sor.

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000801', 'uye@example.com'),
  ('00000000-0000-0000-0000-000000000802', 'diger@example.com'),
  ('00000000-0000-0000-0000-000000000803', 'ekip@example.com');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-000000000803', 'admin');

-- ---- Plans -------------------------------------------------------------------
select tests.as_user('00000000-0000-0000-0000-000000000801');
select tests.check((select not pro and project_limit = 3 and projects_used = 0 from public.my_plan()), 'new users are on the free plan');
select tests.fails(
  $$insert into public.entitlements (user_id, product, source) values ('00000000-0000-0000-0000-000000000801', 'pro', 'admin')$$,
  'users cannot grant themselves Pro'
);
insert into public.projects (title) select 'Proje ' || i from generate_series(1, 3) as i;
select tests.fails($$insert into public.projects (title) values ('Dördüncü')$$, 'free plan stops at 3 projects');

select tests.as_user('00000000-0000-0000-0000-000000000803');
select tests.fails(
  $$insert into public.entitlements (user_id, product, source) values ('00000000-0000-0000-0000-000000000801', 'pro', 'app_store')$$,
  'admins cannot fake store purchases'
);
insert into public.entitlements (user_id, product, source, note) values ('00000000-0000-0000-0000-000000000801', 'pro', 'admin', 'Beta testçisi');
insert into public.entitlements (user_id, product, source, starts_at, expires_at)
values ('00000000-0000-0000-0000-000000000802', 'pro', 'promo', now() - interval '2 days', now() - interval '1 day');

select tests.as_user('00000000-0000-0000-0000-000000000801');
select tests.check((select pro and project_limit = 50 from public.my_plan()), 'Pro raises the project limit');
insert into public.projects (title) values ('Dördüncü');
select tests.check((select count(*) from public.entitlements) = 1, 'users see their own entitlements');

select tests.as_user('00000000-0000-0000-0000-000000000802');
select tests.check((select not pro from public.my_plan()), 'expired entitlements do not count');
select tests.check((select count(*) from public.entitlements) = 1, 'users see only their own entitlements');
delete from public.entitlements;
select tests.check((select count(*) from public.entitlements) = 1, 'users cannot remove entitlements');

-- ---- Ustaya Sor --------------------------------------------------------------
select tests.as_user('00000000-0000-0000-0000-000000000801');
insert into public.consultations (id, topic, subject, status) values ('80000000-0000-0000-0000-000000000001', 'problem', 'Banyo tavanında kabarma', 'answered');
select tests.check(
  (select status from public.consultations where id = '80000000-0000-0000-0000-000000000001') = 'open',
  'new questions always start open'
);
insert into public.consultation_messages (consultation_id, body, from_team)
values ('80000000-0000-0000-0000-000000000001', 'Tavan boyası kabardı, ne yapmalıyım?', true);
select tests.check(
  (select not from_team and author_id = '00000000-0000-0000-0000-000000000801' from public.consultation_messages),
  'users cannot pose as the team'
);
select tests.fails(
  $$insert into public.consultations (topic, subject, project_id) values ('cost', 'Başkasının projesi', '70000000-0000-0000-0000-000000000002')$$,
  'questions can only link to your own projects'
);

select tests.as_user('00000000-0000-0000-0000-000000000802');
select tests.check((select count(*) from public.consultations) = 0, 'others cannot read questions');
select tests.fails(
  $$insert into public.consultation_messages (consultation_id, body) values ('80000000-0000-0000-0000-000000000001', 'Ben de yazayım')$$,
  'others cannot write into a question'
);
insert into public.consultations (topic, subject) select 'other', 'Soru ' || i from generate_series(1, 5) as i;
select tests.fails($$insert into public.consultations (topic, subject) values ('other', 'Altıncı soru')$$, 'five questions per day');

select tests.as_user('00000000-0000-0000-0000-000000000803');
select tests.check((select open_questions from public.admin_stats()) = 6, 'team sees open questions');
insert into public.consultation_messages (consultation_id, body)
values ('80000000-0000-0000-0000-000000000001', 'Önce nemin kaynağına bakalım. Banyoda aspiratör var mı?');
select tests.check(
  (select status from public.consultations where id = '80000000-0000-0000-0000-000000000001') = 'answered',
  'a team reply marks the question answered'
);
select tests.check(
  (select from_team from public.consultation_messages where author_id = '00000000-0000-0000-0000-000000000803'),
  'team replies are marked'
);

select tests.as_user('00000000-0000-0000-0000-000000000801');
insert into public.consultation_messages (consultation_id, body) values ('80000000-0000-0000-0000-000000000001', 'Aspiratör yok.');
select tests.check(
  (select status from public.consultations where id = '80000000-0000-0000-0000-000000000001') = 'open',
  'a user follow-up reopens the question'
);
update public.consultations set status = 'closed' where id = '80000000-0000-0000-0000-000000000001';
select tests.fails(
  $$insert into public.consultation_messages (consultation_id, body) values ('80000000-0000-0000-0000-000000000001', 'Bir şey daha')$$,
  'closed questions take no new messages'
);
select tests.check(
  (select jsonb_array_length(d -> 'consultations') = 1 and jsonb_array_length(d -> 'entitlements') = 1 from public.export_my_data_v2() as d),
  'export includes questions and plans'
);

select tests.as_anon();
select tests.fails($$select count(*) from public.consultations$$, 'visitors cannot read questions');
select tests.fails($$select * from public.my_plan()$$, 'visitors have no plan');

reset role;
delete from auth.users where id in (
  '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000802', '00000000-0000-0000-0000-000000000803'
);
