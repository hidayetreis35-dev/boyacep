-- RLS tests for materials and costs. Helpers come from 10_core_rls.test.sql,
-- which also deletes Ayşe at the end; this file creates its own users.

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'cem@example.com'),
  ('00000000-0000-0000-0000-0000000000d1', 'deniz@example.com');

select tests.as_user('00000000-0000-0000-0000-0000000000c1');

select tests.check((select count(*) from public.material_catalog) = 11, 'signed-in user reads the catalog');
select tests.fails(
  $$insert into public.material_catalog (category, name, unit) values ('other', 'Sahte', 'adet')$$,
  'normal user cannot add catalog items'
);
update public.material_catalog set name = 'Hacked' where category = 'primer';

insert into public.projects (id, title) values ('30000000-0000-0000-0000-000000000001', 'Cem evi');
insert into public.project_materials (project_id, category, name, quantity, unit, unit_price, price_source, store_name)
values ('30000000-0000-0000-0000-000000000001', 'interior_paint', 'İç cephe boyası (15 L)', 2, 'kutu', 1850, 'store', 'Yapı market');
insert into public.project_materials (project_id, category, name, quantity, unit)
values ('30000000-0000-0000-0000-000000000001', 'roller', 'Rulo', 1, 'adet');
insert into public.project_costs (project_id, kind, label, amount)
values ('30000000-0000-0000-0000-000000000001', 'labor', 'Usta işçiliği', 12000);

select tests.check((select count(*) from public.project_materials) = 2, 'owner reads own materials');
select tests.fails(
  $$insert into public.project_materials (project_id, category, name, quantity, unit, price_source)
    values ('30000000-0000-0000-0000-000000000001', 'other', 'Fiyatsız mağaza', 1, 'adet', 'store')$$,
  'a store price must have an amount'
);
select tests.fails(
  $$insert into public.project_materials (project_id, category, name, quantity, unit)
    values ('30000000-0000-0000-0000-000000000001', 'other', 'Eksi', -1, 'adet')$$,
  'negative quantity is rejected'
);
select tests.fails(
  $$insert into public.project_costs (project_id, kind, label, amount)
    values ('30000000-0000-0000-0000-000000000001', 'bribe', 'x', 1)$$,
  'unknown cost kind is rejected'
);

select tests.as_user('00000000-0000-0000-0000-0000000000d1');
select tests.check((select count(*) from public.project_materials) = 0, 'other user sees no materials');
select tests.check((select count(*) from public.project_costs) = 0, 'other user sees no costs');
update public.project_materials set unit_price = 1;
delete from public.project_costs;
select tests.fails(
  $$insert into public.project_costs (project_id, kind, label, amount)
    values ('30000000-0000-0000-0000-000000000001', 'other', 'Sızma', 1)$$,
  'other user cannot add costs to a foreign project'
);

reset role;
select tests.check(
  (select unit_price from public.project_materials where name = 'İç cephe boyası (15 L)') = 1850
  and (select count(*) from public.project_costs) = 1
  and (select count(*) from public.material_catalog where name = 'Hacked') = 0,
  'foreign and non-admin writes had no effect'
);

select tests.as_anon();
select tests.fails($$select * from public.material_catalog$$, 'anon cannot read the catalog');
select tests.fails($$select * from public.project_materials$$, 'anon cannot read materials');

reset role;
delete from public.projects where id = '30000000-0000-0000-0000-000000000001';
select tests.check(
  (select count(*) from public.project_materials) = 0 and (select count(*) from public.project_costs) = 0,
  'deleting a project removes its materials and costs'
);
