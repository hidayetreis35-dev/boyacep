-- Akıllı Bütçe: expenses and receipt files are private to the project owner.

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000a98', 'butce@example.com'),
  ('00000000-0000-0000-0000-000000000b98', 'komsu@example.com');

select tests.check(
  (select not public and file_size_limit = 10485760 and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
     from storage.buckets where id = 'project-receipts'),
  'receipt bucket is private, images only, 10 MB'
);

select tests.as_user('00000000-0000-0000-0000-000000000a98');
insert into public.projects (id, title) values ('98000000-0000-0000-0000-000000000001', 'Bütçe evi');

insert into storage.objects (bucket_id, name) values
  ('project-receipts', '00000000-0000-0000-0000-000000000a98/98000000-0000-0000-0000-000000000001/98100000-0000-0000-0000-000000000001.jpg');
select tests.fails(
  $$insert into storage.objects (bucket_id, name) values
    ('project-receipts', '00000000-0000-0000-0000-000000000b98/98000000-0000-0000-0000-000000000001/98100000-0000-0000-0000-000000000002.jpg')$$,
  'cannot upload a receipt into another user''s folder'
);
select tests.fails(
  $$insert into storage.objects (bucket_id, name) values
    ('project-receipts', '00000000-0000-0000-0000-000000000a98/98999999-0000-0000-0000-000000000001/98100000-0000-0000-0000-000000000003.jpg')$$,
  'cannot upload a receipt into a project you do not own'
);

insert into public.project_expenses (id, project_id, category, label, amount, spent_on, store_name, receipt_path) values (
  '98100000-0000-0000-0000-000000000001', '98000000-0000-0000-0000-000000000001', 'paint', 'İç cephe boyası 15 L', 1850.50, '2026-10-20', 'Yapı market',
  '00000000-0000-0000-0000-000000000a98/98000000-0000-0000-0000-000000000001/98100000-0000-0000-0000-000000000001.jpg'
);
insert into public.project_expenses (project_id, category, label, amount)
values ('98000000-0000-0000-0000-000000000001', 'labor', 'Usta kaparo', 3000);

select tests.check((select count(*) from public.project_expenses) = 2, 'owner reads own expenses');
select tests.check(
  (select owner_id from public.project_expenses where label = 'Usta kaparo') = '00000000-0000-0000-0000-000000000a98',
  'owner is filled in from the session'
);
update public.project_expenses set amount = 2000 where label = 'Usta kaparo';
select tests.check((select amount from public.project_expenses where label = 'Usta kaparo') = 2000, 'owner edits an expense');

select tests.fails(
  $$insert into public.project_expenses (project_id, category, label, amount)
    values ('98000000-0000-0000-0000-000000000001', 'paint', 'Sıfır', 0)$$,
  'zero amount is rejected'
);
select tests.fails(
  $$insert into public.project_expenses (project_id, category, label, amount)
    values ('98000000-0000-0000-0000-000000000001', 'bribe', 'x', 1)$$,
  'unknown category is rejected'
);
select tests.fails(
  $$insert into public.project_expenses (project_id, category, label, amount, receipt_path) values (
    '98000000-0000-0000-0000-000000000001', 'other', 'Yanlış yol', 1,
    '00000000-0000-0000-0000-000000000b98/98000000-0000-0000-0000-000000000001/98100000-0000-0000-0000-000000000009.jpg')$$,
  'receipt path must be in the owner''s folder'
);
select tests.fails(
  $$update public.project_expenses set owner_id = '00000000-0000-0000-0000-000000000b98' where label = 'Usta kaparo'$$,
  'owner cannot be changed'
);
select tests.fails(
  $$update public.project_expenses set project_id = '98999999-0000-0000-0000-000000000001' where label = 'Usta kaparo'$$,
  'project cannot be changed'
);
select tests.check(
  jsonb_array_length(public.export_my_data_v3() -> 'project_expenses') = 2,
  'data export includes expenses'
);

select tests.as_user('00000000-0000-0000-0000-000000000b98');
select tests.check((select count(*) from public.project_expenses) = 0, 'other user sees no expenses');
select tests.check((select count(*) from storage.objects where bucket_id = 'project-receipts') = 0, 'other user sees no receipt files');
update public.project_expenses set amount = 1;
delete from public.project_expenses;
select tests.fails(
  $$insert into public.project_expenses (project_id, category, label, amount)
    values ('98000000-0000-0000-0000-000000000001', 'other', 'Sızma', 1)$$,
  'other user cannot add expenses to a foreign project'
);
select tests.check(jsonb_array_length(public.export_my_data_v3() -> 'project_expenses') = 0, 'export shows only own expenses');

reset role;
select tests.check(
  (select count(*) from public.project_expenses where project_id = '98000000-0000-0000-0000-000000000001') = 2
  and (select amount from public.project_expenses where label = 'Usta kaparo') = 2000,
  'foreign writes had no effect'
);

select tests.as_user('00000000-0000-0000-0000-000000000a98');
delete from public.projects where id = '98000000-0000-0000-0000-000000000001';
reset role;
select tests.check((select count(*) from public.project_expenses) = 0, 'deleting the project removes its expenses');
