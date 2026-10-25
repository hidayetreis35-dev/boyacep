-- Fixes from the October 2026 audit: hidden phone numbers, quote answers,
-- invite limits, visitor access to helper functions and plan lookups.

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000a01', 'ev10@example.com'),    -- homeowner
  ('00000000-0000-0000-0000-000000000a02', 'usta10@example.com'),  -- painter, phone hidden
  ('00000000-0000-0000-0000-000000000a03', 'usta11@example.com'),  -- painter, phone shown
  ('00000000-0000-0000-0000-000000000a04', 'usta12@example.com'),  -- painter, not on the project
  ('00000000-0000-0000-0000-000000000a05', 'normal10@example.com');
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-000000000a01', 'homeowner'),
  ('00000000-0000-0000-0000-000000000a02', 'pro'),
  ('00000000-0000-0000-0000-000000000a03', 'pro'),
  ('00000000-0000-0000-0000-000000000a04', 'pro'),
  ('00000000-0000-0000-0000-000000000a05', 'homeowner');

select tests.as_user('00000000-0000-0000-0000-000000000a02');
insert into public.pro_profiles (user_id, full_name, city, phone, show_phone)
values ('00000000-0000-0000-0000-000000000a02', 'Gizli Usta', 'Ankara', '+90 555 000 00 01', false);
select tests.as_user('00000000-0000-0000-0000-000000000a03');
insert into public.pro_profiles (user_id, full_name, city, phone, show_phone)
values ('00000000-0000-0000-0000-000000000a03', 'Açık Usta', 'Ankara', '+90 555 000 00 02', true);
select tests.as_user('00000000-0000-0000-0000-000000000a04');
insert into public.pro_profiles (user_id, full_name, city, phone, show_phone)
values ('00000000-0000-0000-0000-000000000a04', 'Yabancı Usta', 'Ankara', '+90 555 000 00 03', true);

select tests.as_user('00000000-0000-0000-0000-000000000a01');
insert into public.projects (id, title) values ('a0000000-0000-0000-0000-000000000001', 'Yatak odası');
insert into public.project_invites (id, project_id) values ('a3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001');
reset role;
update public.project_invites set code = 'KAPI2345' where id = 'a3000000-0000-0000-0000-000000000001';

-- ---- Invite limits ---------------------------------------------------------
select tests.check(
  (select max_uses = 3 and uses = 0 from public.project_invites where id = 'a3000000-0000-0000-0000-000000000001'),
  'a new code lets up to 3 painters join'
);

select tests.as_user('00000000-0000-0000-0000-000000000a02');
select tests.check(public.redeem_project_invite('KAPI2345') = 'a0000000-0000-0000-0000-000000000001', 'first painter joins');
select tests.check(public.redeem_project_invite('KAPI2345') = 'a0000000-0000-0000-0000-000000000001', 'joining again still works');
select tests.as_user('00000000-0000-0000-0000-000000000a03');
select tests.check(public.redeem_project_invite('KAPI2345') = 'a0000000-0000-0000-0000-000000000001', 'second painter joins');

select tests.as_user('00000000-0000-0000-0000-000000000a01');
select tests.check(
  (select uses from public.project_invites where id = 'a3000000-0000-0000-0000-000000000001') = 2,
  'each painter uses the code once, joining again does not count'
);
select tests.fails(
  $$update public.project_invites set uses = 0 where id = 'a3000000-0000-0000-0000-000000000001'$$,
  'homeowner cannot reset the use count'
);
insert into public.project_invites (id, project_id, max_uses)
values ('a3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 1);
select tests.fails(
  $$insert into public.project_invites (project_id, max_uses) values ('a0000000-0000-0000-0000-000000000001', 50)$$,
  'a code allows at most 10 painters'
);
reset role;
update public.project_invites set code = 'TEKK2345' where id = 'a3000000-0000-0000-0000-000000000002';
select tests.as_user('00000000-0000-0000-0000-000000000a02');
select tests.check(public.redeem_project_invite('TEKK2345') = 'a0000000-0000-0000-0000-000000000001', 'a member reusing another code is harmless');
select tests.as_user('00000000-0000-0000-0000-000000000a04');
select tests.check(public.redeem_project_invite('TEKK2345') = 'a0000000-0000-0000-0000-000000000001', 'a single-use code works once');
select tests.as_user('00000000-0000-0000-0000-000000000a01');
delete from public.project_members where user_id = '00000000-0000-0000-0000-000000000a04';
select tests.as_user('00000000-0000-0000-0000-000000000a04');
select tests.fails($$select public.redeem_project_invite('TEKK2345')$$, 'a used-up code does not work');
select tests.check((select count(*) from public.shared_projects()) = 0, 'a used-up code gives no access');

-- Wrong guesses are counted; after 10 in an hour the painter has to wait.
select tests.check(public.redeem_project_invite('NOPE2345') is null, 'an unknown code returns nothing');
select public.redeem_project_invite('NOPE' || n || '345') from generate_series(2, 9) as n;
select tests.check(public.redeem_project_invite('ZZZZ2345') is null, 'tenth wrong guess still answers');
select tests.fails($$select public.redeem_project_invite('NOPE2345')$$, 'eleventh guess within an hour is refused');
select tests.fails($$select public.redeem_project_invite('KAPI2345')$$, 'even a right code waits after too many guesses');
select tests.fails($$select count(*) from public.invite_redeem_failures$$, 'users cannot read the guess log');
reset role;
select tests.check(
  (select count(*) from public.invite_redeem_failures where user_id = '00000000-0000-0000-0000-000000000a04') = 10,
  'wrong guesses are recorded'
);
update public.invite_redeem_failures set created_at = now() - interval '2 hours'
where user_id = '00000000-0000-0000-0000-000000000a04';
select tests.as_user('00000000-0000-0000-0000-000000000a04');
select tests.check(public.redeem_project_invite('NOPE2345') is null, 'guessing works again an hour later');

-- ---- Painter cards: phone only when the painter allows it ---------------------
select tests.as_user('00000000-0000-0000-0000-000000000a01');
select tests.check((select count(*) from public.pro_profiles) = 0, 'homeowner cannot read painter profiles directly');
select tests.check(
  (select full_name = 'Gizli Usta' and phone is null and city = 'Ankara'
   from public.pro_card('00000000-0000-0000-0000-000000000a02')),
  'hidden phone stays hidden on the card'
);
select tests.check(
  (select phone from public.pro_card('00000000-0000-0000-0000-000000000a03')) = '+90 555 000 00 02',
  'shown phone appears on the card'
);
select tests.check(
  (select count(*) from public.pro_card('00000000-0000-0000-0000-000000000a04')) = 0,
  'homeowner gets no card for a painter who is not on the project'
);

select tests.as_user('00000000-0000-0000-0000-000000000a04');
select tests.check(
  (select count(*) from public.pro_card('00000000-0000-0000-0000-000000000a03')) = 0,
  'painters cannot read each other''s cards'
);

select tests.as_user('00000000-0000-0000-0000-000000000a02');
select tests.check(
  (select phone from public.pro_card('00000000-0000-0000-0000-000000000a02')) = '+90 555 000 00 01',
  'painter sees their own phone'
);

-- ---- Quote answers come from the homeowner -----------------------------------
insert into public.quotes (id, project_id, title) values ('a4000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Oda boyası');
update public.quotes set status = 'sent' where id = 'a4000000-0000-0000-0000-000000000001';
select tests.fails(
  $$update public.quotes set status = 'accepted' where id = 'a4000000-0000-0000-0000-000000000001'$$,
  'painter cannot accept an in-app quote for the homeowner'
);
select tests.fails(
  $$update public.quotes set status = 'rejected' where id = 'a4000000-0000-0000-0000-000000000001'$$,
  'painter cannot reject an in-app quote for the homeowner'
);
update public.quotes set status = 'withdrawn' where id = 'a4000000-0000-0000-0000-000000000001';
select tests.check(
  (select status from public.quotes where id = 'a4000000-0000-0000-0000-000000000001') = 'withdrawn',
  'painter can still withdraw it'
);
update public.quotes set status = 'draft' where id = 'a4000000-0000-0000-0000-000000000001';
update public.quotes set status = 'sent' where id = 'a4000000-0000-0000-0000-000000000001';

insert into public.quotes (id, title, customer_name) values ('a4000000-0000-0000-0000-000000000002', 'Dükkan', 'Veli Bey');
update public.quotes set status = 'sent' where id = 'a4000000-0000-0000-0000-000000000002';
update public.quotes set status = 'accepted' where id = 'a4000000-0000-0000-0000-000000000002';
select tests.check(
  (select status from public.quotes where id = 'a4000000-0000-0000-0000-000000000002') = 'accepted',
  'painter records the answer of a customer outside the app'
);

select tests.as_user('00000000-0000-0000-0000-000000000a01');
select public.respond_to_quote('a4000000-0000-0000-0000-000000000001', true);
select tests.check(
  (select status from public.quotes where id = 'a4000000-0000-0000-0000-000000000001') = 'accepted',
  'homeowner accepts the in-app quote'
);

-- ---- Plans: users ask only about their own ------------------------------------
select tests.as_user('00000000-0000-0000-0000-000000000a05');
select tests.fails(
  $$select public.has_entitlement('pro', '00000000-0000-0000-0000-000000000a01')$$,
  'users cannot check another user''s plan'
);
select tests.fails(
  $$select public.project_limit_for('00000000-0000-0000-0000-000000000a01')$$,
  'users cannot check another user''s project limit'
);
select tests.check((select project_limit from public.my_plan()) = 3, 'users still read their own plan');
insert into public.projects (title) values ('Limit hâlâ çalışıyor');
select tests.check((select count(*) from public.projects) = 1, 'the project limit check still runs');

-- ---- Visitors ---------------------------------------------------------------
select tests.as_anon();
select tests.fails($$select public.has_role('admin')$$, 'visitors cannot call has_role');
select tests.fails($$select public.is_admin()$$, 'visitors cannot call is_admin');
select tests.fails($$select public.owns_project('a0000000-0000-0000-0000-000000000001')$$, 'visitors cannot call owns_project');
select tests.fails($$select public.owns_room('a0000000-0000-0000-0000-000000000001')$$, 'visitors cannot call owns_room');
select tests.fails($$select * from public.pro_card('00000000-0000-0000-0000-000000000a03')$$, 'visitors get no painter cards');
select tests.check((select count(*) from public.guide_articles) > 0, 'visitors still read published guides');

reset role;
select tests.check(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')) = 0,
  'visitors cannot run any security definer function'
);
select tests.check(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and (has_table_privilege('anon', c.oid, 'insert') or has_table_privilege('anon', c.oid, 'update')
          or has_table_privilege('anon', c.oid, 'delete'))) = 0,
  'visitors cannot write to any table'
);
select tests.check(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity) = 0,
  'every table has row level security'
);
select tests.check(to_regprocedure('public.photo_limit()') is null, 'the unused photo_limit function is gone');

delete from auth.users where id in (
  '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000a02', '00000000-0000-0000-0000-000000000a03',
  '00000000-0000-0000-0000-000000000a04', '00000000-0000-0000-0000-000000000a05'
);
