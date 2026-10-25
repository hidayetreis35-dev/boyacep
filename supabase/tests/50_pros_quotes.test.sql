-- Painter profiles, project sharing by invite code, and quotes.

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000601', 'ev@example.com'),     -- homeowner
  ('00000000-0000-0000-0000-000000000602', 'usta@example.com'),   -- painter
  ('00000000-0000-0000-0000-000000000603', 'usta2@example.com'),  -- another painter
  ('00000000-0000-0000-0000-000000000604', 'normal@example.com'), -- not a painter
  ('00000000-0000-0000-0000-000000000605', 'admin6@example.com');
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-000000000601', 'homeowner'),
  ('00000000-0000-0000-0000-000000000602', 'pro'),
  ('00000000-0000-0000-0000-000000000603', 'pro'),
  ('00000000-0000-0000-0000-000000000604', 'homeowner'),
  ('00000000-0000-0000-0000-000000000605', 'admin');

-- ---- Painter profile -------------------------------------------------------
select tests.as_user('00000000-0000-0000-0000-000000000604');
select tests.fails(
  $$insert into public.pro_profiles (user_id, full_name, city) values ('00000000-0000-0000-0000-000000000604', 'Sahte Usta', 'İzmir')$$,
  'only painters can create a painter profile'
);

select tests.as_user('00000000-0000-0000-0000-000000000602');
select tests.fails(
  $$insert into public.pro_profiles (user_id, full_name, city, verification_status)
    values ('00000000-0000-0000-0000-000000000602', 'Mehmet Usta', 'İstanbul', 'verified')$$,
  'painter cannot verify themselves'
);
insert into public.pro_profiles (user_id, full_name, city, specialties, phone)
values ('00000000-0000-0000-0000-000000000602', 'Mehmet Usta', 'İstanbul', array['interior', 'ceiling'], '+90 555 111 22 33');
select tests.fails(
  $$update public.pro_profiles set specialties = array['plumbing'] where user_id = '00000000-0000-0000-0000-000000000602'$$,
  'specialties come from the fixed list'
);
update public.pro_profiles set verification_status = 'pending' where user_id = '00000000-0000-0000-0000-000000000602';
select tests.fails(
  $$update public.pro_profiles set verification_status = 'verified' where user_id = '00000000-0000-0000-0000-000000000602'$$,
  'painter cannot move from pending to verified'
);

select tests.as_user('00000000-0000-0000-0000-000000000605');
select tests.check((select pending_pros from public.admin_stats()) = 1, 'admin sees painters waiting for verification');
update public.pro_profiles set verification_status = 'verified' where user_id = '00000000-0000-0000-0000-000000000602';
select tests.check(
  (select verification_status from public.pro_profiles where user_id = '00000000-0000-0000-0000-000000000602') = 'verified',
  'admin verifies a painter'
);

-- ---- Homeowner shares a project --------------------------------------------
select tests.as_user('00000000-0000-0000-0000-000000000601');
insert into public.projects (id, title, budget) values ('60000000-0000-0000-0000-000000000001', 'Salon boyası', 25000);
insert into public.rooms (id, project_id, name, length_m, width_m, height_m)
values ('61000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Salon', 5, 4, 2.7);
insert into public.room_openings (room_id, kind, width_m, height_m) values ('61000000-0000-0000-0000-000000000001', 'door', 0.9, 2.1);
insert into public.project_materials (project_id, category, name, quantity, unit)
values ('60000000-0000-0000-0000-000000000001', 'interior_paint', 'İç cephe boyası', 2, 'kutu');
insert into public.project_costs (project_id, kind, label, amount)
values ('60000000-0000-0000-0000-000000000001', 'labor', 'Tahmini işçilik', 9000);
insert into public.project_photos (project_id, storage_path, width, height, byte_size) values (
  '60000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000601/60000000-0000-0000-0000-000000000001/62000000-0000-0000-0000-000000000001.jpg',
  1600, 1200, 300000
);
insert into storage.objects (bucket_id, name) values (
  'project-photos', '00000000-0000-0000-0000-000000000601/60000000-0000-0000-0000-000000000001/62000000-0000-0000-0000-000000000001.jpg'
);
insert into public.project_invites (id, project_id) values ('63000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001');
select tests.check(
  (select code ~ '^[A-HJKMNP-Z2-9]{8}$' from public.project_invites where id = '63000000-0000-0000-0000-000000000001'),
  'invite code has 8 readable characters'
);
insert into public.project_invites (id, project_id, code, expires_at)
values ('63000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'EXPRD234', now() - interval '1 day');

-- Make the code predictable for the rest of the test.
update public.project_invites set revoked_at = null where id = '63000000-0000-0000-0000-000000000001';
reset role;
update public.project_invites set code = 'BOYA2345' where id = '63000000-0000-0000-0000-000000000001';

select tests.as_user('00000000-0000-0000-0000-000000000604');
select tests.fails($$select public.redeem_project_invite('BOYA2345')$$, 'non-painters cannot join with a code');
select tests.check((select count(*) from public.project_invites) = 0, 'others cannot list invite codes');

select tests.as_user('00000000-0000-0000-0000-000000000602');
select tests.fails($$select public.redeem_project_invite('EXPRD234')$$, 'expired codes do not work');
select tests.fails($$select public.redeem_project_invite('NOPE2345')$$, 'unknown codes do not work');
select tests.check(public.redeem_project_invite(' boya2345 ') = '60000000-0000-0000-0000-000000000001', 'painter joins with the code');
select tests.check(public.redeem_project_invite('BOYA2345') = '60000000-0000-0000-0000-000000000001', 'joining twice is harmless');
select tests.check((select count(*) from public.shared_projects()) = 1, 'painter lists the shared project');
select tests.check((select count(*) from public.projects) = 0, 'painter cannot read the project row (budget stays private)');
select tests.check((select count(*) from public.rooms) = 1, 'painter reads rooms');
select tests.check((select count(*) from public.room_openings) = 1, 'painter reads openings');
select tests.check((select count(*) from public.project_materials) = 1, 'painter reads the material list');
select tests.check((select count(*) from public.project_costs) = 0, 'painter cannot read cost notes');
select tests.check((select count(*) from public.project_photos) = 1, 'painter reads photo records');
select tests.check((select count(*) from storage.objects where bucket_id = 'project-photos') = 1, 'painter reads photo files');
update public.rooms set name = 'Hacked';
select tests.fails(
  $$insert into public.rooms (project_id, name, length_m, width_m, height_m) values ('60000000-0000-0000-0000-000000000001', 'x', 1, 1, 1)$$,
  'painter cannot add rooms'
);

select tests.as_user('00000000-0000-0000-0000-000000000601');
select tests.check((select name from public.rooms where id = '61000000-0000-0000-0000-000000000001') = 'Salon', 'painter could not edit rooms');
select tests.check(
  (select full_name from public.project_member_list('60000000-0000-0000-0000-000000000001')) = 'Mehmet Usta',
  'homeowner sees who joined'
);
select tests.check((select count(*) from public.pro_profiles) = 1, 'homeowner reads the profile of a painter on the project');

select tests.as_user('00000000-0000-0000-0000-000000000603');
select tests.check((select count(*) from public.rooms) = 0, 'other painters see nothing');
select tests.check((select count(*) from public.project_member_list('60000000-0000-0000-0000-000000000001')) = 0, 'other painters cannot list members');
select tests.check((select count(*) from public.pro_profiles) = 0, 'painters cannot browse each other''s profiles');
select tests.fails(
  $$insert into public.quotes (project_id, title) values ('60000000-0000-0000-0000-000000000001', 'Benim teklifim')$$,
  'painter cannot quote a project they did not join'
);

-- ---- Quotes ----------------------------------------------------------------
select tests.as_user('00000000-0000-0000-0000-000000000604');
select tests.fails($$insert into public.quotes (title) values ('Teklif')$$, 'non-painters cannot write quotes');

select tests.as_user('00000000-0000-0000-0000-000000000602');
insert into public.quotes (id, title, customer_name) values ('64000000-0000-0000-0000-000000000001', 'Dükkan boyası', 'Ali Bey');
insert into public.quotes (id, project_id, title, number) values ('64000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'Salon boyası teklifi', 99);
select tests.check(
  (select array_agg(number order by number) from public.quotes) = array[1, 2],
  'quotes are numbered per painter, ignoring client values'
);
select tests.fails(
  $$insert into public.quotes (title, status) values ('Atlama', 'accepted')$$,
  'new quotes start as drafts'
);
insert into public.quote_items (quote_id, kind, description, quantity, unit, unit_price) values
  ('64000000-0000-0000-0000-000000000002', 'labor', 'Duvar ve tavan boyası işçiliği', 62, 'm²', 120),
  ('64000000-0000-0000-0000-000000000002', 'material', 'İç cephe boyası 15 L', 2, 'kutu', 1850);

select tests.as_user('00000000-0000-0000-0000-000000000601');
select tests.check((select count(*) from public.quotes) = 0, 'homeowner does not see draft quotes');

select tests.as_user('00000000-0000-0000-0000-000000000602');
update public.quotes set status = 'sent' where id = '64000000-0000-0000-0000-000000000002';
select tests.check(
  (select sent_at is not null from public.quotes where id = '64000000-0000-0000-0000-000000000002'),
  'sending stamps the time'
);
select tests.fails(
  $$insert into public.quote_items (quote_id, kind, description, quantity, unit, unit_price)
    values ('64000000-0000-0000-0000-000000000002', 'other', 'Gizli kalem', 1, 'adet', 500)$$,
  'items of a sent quote are locked'
);
select tests.fails(
  $$update public.quotes set discount = 1000 where id = '64000000-0000-0000-0000-000000000002'$$,
  'a sent quote cannot be edited'
);
select tests.fails(
  $$update public.quotes set status = 'accepted', responded_at = null where id = '64000000-0000-0000-0000-000000000001'$$,
  'a draft cannot jump to accepted'
);

select tests.as_user('00000000-0000-0000-0000-000000000603');
select tests.check((select count(*) from public.quotes) = 0, 'painters cannot see each other''s quotes');
select tests.fails($$select public.respond_to_quote('64000000-0000-0000-0000-000000000002', true)$$, 'strangers cannot answer a quote');

select tests.as_user('00000000-0000-0000-0000-000000000601');
select tests.check((select count(*) from public.quotes) = 1, 'homeowner sees the sent quote');
select tests.check((select count(*) from public.quote_items) = 2, 'homeowner sees its items');
select tests.check((select count(*) from public.pro_profiles) = 1, 'homeowner reads the quoting painter');
update public.quotes set status = 'accepted';
select tests.check(
  (select status from public.quotes where id = '64000000-0000-0000-0000-000000000002') = 'sent',
  'homeowner cannot change the quote directly'
);
select public.respond_to_quote('64000000-0000-0000-0000-000000000002', true);
select tests.check(
  (select status = 'accepted' and responded_at is not null from public.quotes where id = '64000000-0000-0000-0000-000000000002'),
  'homeowner accepts the quote'
);
select tests.fails($$select public.respond_to_quote('64000000-0000-0000-0000-000000000002', false)$$, 'an answered quote cannot be answered again');

select tests.as_user('00000000-0000-0000-0000-000000000602');
select tests.fails(
  $$update public.quotes set status = 'draft' where id = '64000000-0000-0000-0000-000000000002'$$,
  'an accepted quote cannot be reopened'
);

delete from public.quotes where id = '64000000-0000-0000-0000-000000000002';
select tests.check((select count(*) from public.quotes where id = '64000000-0000-0000-0000-000000000002') = 1, 'answered quotes cannot be deleted');

-- ---- Ending access ---------------------------------------------------------
select tests.as_user('00000000-0000-0000-0000-000000000601');
update public.project_invites set revoked_at = now() where id = '63000000-0000-0000-0000-000000000001';
delete from public.project_members where user_id = '00000000-0000-0000-0000-000000000602';

select tests.as_user('00000000-0000-0000-0000-000000000602');
select tests.check((select count(*) from public.rooms) = 0, 'removed painter loses access to rooms');
select tests.check((select count(*) from storage.objects where bucket_id = 'project-photos') = 0, 'removed painter loses access to photos');
select tests.fails($$select public.redeem_project_invite('BOYA2345')$$, 'revoked codes do not work');
select tests.check((select count(*) from public.quotes) = 2, 'painter keeps their own quotes');

-- Deleting the project keeps the painter's quote on record, without the project link.
select tests.as_user('00000000-0000-0000-0000-000000000601');
delete from public.projects where id = '60000000-0000-0000-0000-000000000001';
select tests.check((select count(*) from public.projects where id = '60000000-0000-0000-0000-000000000001') = 0, 'homeowner deletes a project that has a quote');
select tests.as_user('00000000-0000-0000-0000-000000000602');
select tests.check(
  (select project_id is null and status = 'accepted' from public.quotes where id = '64000000-0000-0000-0000-000000000002'),
  'the accepted quote stays with the painter'
);

select tests.as_anon();
select tests.fails($$select count(*) from public.quotes$$, 'visitors cannot read quotes');
select tests.fails($$select public.shared_projects()$$, 'visitors cannot list shared projects');

reset role;
delete from storage.objects where name like '00000000-0000-0000-0000-000000000601/%';
delete from auth.users where id in (
  '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000603',
  '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000605'
);
