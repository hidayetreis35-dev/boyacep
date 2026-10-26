-- Market prices: public reference data and statistics, admin-only research
-- records, completed jobs confirmed by both sides, admin data-quality tools.

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000c01', 'ev12@example.com'),     -- homeowner
  ('00000000-0000-0000-0000-000000000c02', 'usta15@example.com'),   -- painter on the project
  ('00000000-0000-0000-0000-000000000c03', 'usta16@example.com'),   -- another painter
  ('00000000-0000-0000-0000-000000000c04', 'veri@example.com');     -- admin
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-000000000c01', 'homeowner'),
  ('00000000-0000-0000-0000-000000000c02', 'pro'),
  ('00000000-0000-0000-0000-000000000c03', 'pro'),
  ('00000000-0000-0000-0000-000000000c04', 'admin');

-- ---- Reference data ------------------------------------------------------------
select tests.as_anon();
select tests.check((select count(*) from public.provinces) = 81, 'anon reads all 81 provinces');
select tests.check((select count(*) from public.districts where province_code = '45') = 17, 'Manisa has 17 districts');
select tests.check((select count(*) from public.districts where province_code = '35') = 30, 'İzmir has 30 districts');
select tests.check((select count(*) from public.service_categories) >= 9, 'service categories are seeded');
select tests.fails($$insert into public.provinces (code, name) values ('82', 'Yok')$$, 'anon cannot add provinces');

select tests.as_user('00000000-0000-0000-0000-000000000c01');
select tests.fails($$delete from public.provinces$$, 'users cannot delete provinces');
select tests.fails(
  $$insert into public.market_price_sources (id, name, url, kind) values ('benim', 'Benim', 'https://example.com', 'firm')$$,
  'users cannot add price sources'
);

-- ---- Research records: admins only ---------------------------------------------
select tests.as_user('00000000-0000-0000-0000-000000000c04');
insert into public.market_price_sources (id, name, url, kind, terms_note, reliability)
values ('armut', 'Armut', 'https://armut.com/fiyatlari/boyaci-boya-badana-ustasi_32', 'platform', 'İlanlar kopyalanmaz.', 'medium');
select tests.fails(
  $$insert into public.market_price_sources (id, name, url, kind) values ('http', 'Http', 'http://example.com', 'firm')$$,
  'sources need an https address'
);
insert into public.price_research_runs (id, notes) values ('c5000000-0000-0000-0000-000000000001', 'Pilot: Manisa');
insert into public.market_price_records
  (run_id, source_id, province_code, district, service_key, scope, kind, observed_on, area_m2, rooms, price, dedupe_key)
values
  ('c5000000-0000-0000-0000-000000000001', 'armut', '45', 'Yunusemre', 'interior_wall', 'labour', 'platform_request', '2026-10-17', 100, 3, 12000, 'armut-45-2026-10-17-a'),
  ('c5000000-0000-0000-0000-000000000001', 'armut', '45', null, 'interior_wall', 'labour', 'platform_request', '2023-01-10', 90, 2, 6000, 'armut-45-2023-01-10-b');
select tests.fails(
  $$insert into public.market_price_records (source_id, province_code, service_key, scope, kind, observed_on, price, dedupe_key)
    values ('armut', '45', 'interior_wall', 'labour', 'platform_request', '2026-10-17', 12000, 'armut-45-2026-10-17-a')$$,
  'the same job cannot be recorded twice'
);
select tests.fails(
  $$insert into public.market_price_records (source_id, province_code, district, service_key, scope, kind, observed_on, price, dedupe_key)
    values ('armut', '45', 'Bornova', 'interior_wall', 'labour', 'platform_request', '2026-10-17', 12000, 'armut-45-bornova-x')$$,
  'a district must belong to its province'
);
select tests.fails(
  $$insert into public.market_price_records (source_id, province_code, service_key, scope, kind, observed_on, price, price_low, price_high, dedupe_key)
    values ('armut', '45', 'interior_wall', 'labour', 'platform_request', '2026-10-17', 12000, 15000, 10000, 'armut-45-range-x')$$,
  'a range must run from low to high'
);
select tests.fails(
  $$insert into public.market_price_records (source_id, province_code, service_key, scope, kind, observed_on, price, dedupe_key)
    values ('armut', '45', 'interior_wall', 'labour', 'platform_request', '2030-01-01', 12000, 'armut-45-future-x')$$,
  'records cannot be dated in the future'
);
select tests.check(public.mark_stale_market_records(730) = 1, 'old records are marked stale');
select tests.check((select count(*) from public.market_price_records) = 2, 'stale records are kept, not deleted');
select tests.check(
  (select stale = 1 and active = 1 and newest = '2026-10-17' from public.market_data_quality() where province_code = '45'),
  'data quality report counts records by status'
);
select tests.check((select count(*) from public.market_data_quality()) = 81, 'data quality report lists all 81 provinces');
select tests.fails($$select public.mark_stale_market_records(5)$$, 'a very short age limit is refused');

insert into public.market_price_statistics
  (area_code, service_key, scope, unit, as_of, quality, observations, sources, low, high, middle_half, source_ids)
values ('45', 'interior_wall', 'labour', 'per_m2', '2026-10-25', 'limited', 7, 1, 75, 180, false, array['armut']);
select tests.fails(
  $$insert into public.market_price_statistics (area_code, service_key, scope, unit, as_of, quality, observations, sources, median, low, high)
    values ('35', 'interior_wall', 'labour', 'per_m2', '2026-10-25', 'limited', 7, 1, 120, 75, 180)$$,
  'limited data cannot carry a median'
);
select tests.fails(
  $$insert into public.market_price_statistics (area_code, service_key, scope, unit, as_of, quality, observations, sources, mean, median, low, high)
    values ('35', 'interior_wall', 'labour', 'per_m2', '2026-10-25', 'medium', 12, 2, 120, 120, 75, 180)$$,
  'only strong data carries a mean'
);
select tests.fails(
  $$insert into public.market_price_statistics (area_code, service_key, scope, unit, as_of, quality, observations, sources, low, high)
    values ('35', 'interior_wall', 'labour', 'per_m2', '2026-10-25', 'insufficient', 2, 1, 75, 180)$$,
  'insufficient data shows no range'
);
select tests.fails(
  $$insert into public.market_price_statistics (area_code, service_key, scope, unit, as_of, quality, observations, sources, low, high)
    values ('45', 'interior_wall', 'labour', 'per_m2', '2026-10-25', 'limited', 7, 1, 75, 180)$$,
  'one statistic per place, service, scope, unit and date'
);

select tests.as_anon();
select tests.fails($$select * from public.market_price_records$$, 'anon cannot read research records');
select tests.check((select count(*) from public.market_price_statistics) = 1, 'anon reads BoyaCep statistics');
select tests.check((select count(*) from public.market_price_sources) = 1, 'anon reads source names');
select tests.fails($$select * from public.market_data_quality()$$, 'anon cannot run the data quality report');

select tests.as_user('00000000-0000-0000-0000-000000000c03');
select tests.check((select count(*) from public.market_price_records) = 0, 'users cannot read research records');
select tests.check((select count(*) from public.price_research_runs) = 0, 'users cannot read research runs');
select tests.fails(
  $$insert into public.market_price_records (source_id, province_code, service_key, scope, kind, observed_on, price, dedupe_key)
    values ('armut', '45', 'interior_wall', 'labour', 'platform_request', '2026-10-17', 1, 'sahte-kayit-123')$$,
  'users cannot add research records'
);
update public.market_price_statistics set low = 1;
select tests.check((select low from public.market_price_statistics) = 75, 'users cannot change statistics');
select tests.fails($$select * from public.market_data_quality()$$, 'users cannot run the data quality report');
select tests.fails($$select public.mark_stale_market_records(730)$$, 'users cannot run maintenance');
select tests.fails($$select * from public.verified_job_summary()$$, 'users cannot read verified job summaries');

-- ---- Completed jobs ---------------------------------------------------------------
select tests.as_user('00000000-0000-0000-0000-000000000c01');
insert into public.projects (id, title) values ('c0000000-0000-0000-0000-000000000001', 'Manisa 3+1');
insert into public.project_invites (id, project_id) values ('c3000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001');
reset role;
update public.project_invites set code = 'FYAT2345' where id = 'c3000000-0000-0000-0000-000000000001';
select tests.as_user('00000000-0000-0000-0000-000000000c02');
select public.redeem_project_invite('FYAT2345');
insert into public.quotes (id, project_id, title) values ('c4000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Boya işi');
insert into public.quote_items (quote_id, kind, description, quantity, unit, unit_price)
values ('c4000000-0000-0000-0000-000000000001', 'labor', 'Duvar boyası', 100, 'm²', 120);

select tests.fails(
  $$insert into public.completed_jobs (quote_id, province_code, materials_included, final_price, completed_on)
    values ('c4000000-0000-0000-0000-000000000001', '45', false, 12000, '2026-10-20')$$,
  'a draft quote cannot become a completed job'
);
update public.quotes set status = 'sent' where id = 'c4000000-0000-0000-0000-000000000001';
select tests.as_user('00000000-0000-0000-0000-000000000c01');
select public.respond_to_quote('c4000000-0000-0000-0000-000000000001', true);

select tests.as_user('00000000-0000-0000-0000-000000000c03');
select tests.fails(
  $$insert into public.completed_jobs (quote_id, province_code, materials_included, final_price, completed_on)
    values ('c4000000-0000-0000-0000-000000000001', '45', false, 12000, '2026-10-20')$$,
  'another painter cannot record the job'
);

select tests.as_user('00000000-0000-0000-0000-000000000c02');
insert into public.completed_jobs (id, quote_id, province_code, district, floor_area_m2, materials_included, final_price, completed_on, pro_shares, owner_shares)
values ('c6000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', '45', 'Yunusemre', 100, false, 12500, '2026-10-20', true, true);
select tests.check(
  (select owner_shares = false and owner_confirmed_at is null from public.completed_jobs),
  'the painter cannot consent for the homeowner'
);
update public.completed_jobs set final_price = 12000;
select tests.check((select final_price from public.completed_jobs) = 12000, 'the painter corrects the price before confirmation');
select tests.fails(
  $$update public.completed_jobs set owner_confirmed_at = now()$$,
  'the painter cannot confirm for the homeowner'
);
select tests.fails(
  $$select public.confirm_completed_job('c6000000-0000-0000-0000-000000000001', true)$$,
  'the painter cannot call the homeowner''s confirmation'
);

select tests.as_user('00000000-0000-0000-0000-000000000c03');
select tests.check((select count(*) from public.completed_jobs) = 0, 'other painters cannot see the job');

select tests.as_user('00000000-0000-0000-0000-000000000c01');
select tests.check((select count(*) from public.completed_jobs) = 1, 'the homeowner sees the job');
update public.completed_jobs set final_price = 1;
select tests.check((select final_price from public.completed_jobs) = 12000, 'the homeowner cannot change the price');
select public.confirm_completed_job('c6000000-0000-0000-0000-000000000001', true);
select tests.check(
  (select owner_confirmed_at is not null and owner_shares from public.completed_jobs),
  'the homeowner confirms and agrees to share'
);

select tests.as_user('00000000-0000-0000-0000-000000000c02');
select tests.fails($$update public.completed_jobs set final_price = 20000$$, 'a confirmed job cannot be changed');
update public.completed_jobs set pro_shares = false;
select tests.check((select not pro_shares from public.completed_jobs), 'the painter can still withdraw consent to share');
update public.completed_jobs set pro_shares = true;

select tests.as_user('00000000-0000-0000-0000-000000000c04');
select tests.check(
  (select count(*) from public.verified_job_summary()) = 0,
  'fewer than 5 shared jobs never appear in summaries'
);
select tests.check((select count(*) from public.completed_jobs) = 0, 'admins do not read individual jobs');

-- Five confirmed, shared jobs in one province do appear, as one median.
select tests.as_user('00000000-0000-0000-0000-000000000c02');
insert into public.quotes (id, project_id, title)
select ('c4000000-0000-0000-0000-00000000001' || n)::uuid, 'c0000000-0000-0000-0000-000000000001', 'İş ' || n
from generate_series(1, 4) n;
update public.quotes set status = 'sent' where title like 'İş %';
select tests.as_user('00000000-0000-0000-0000-000000000c01');
select public.respond_to_quote(id, true) from public.quotes where title like 'İş %';
select tests.as_user('00000000-0000-0000-0000-000000000c02');
insert into public.completed_jobs (quote_id, province_code, floor_area_m2, materials_included, final_price, completed_on, pro_shares)
select ('c4000000-0000-0000-0000-00000000001' || n)::uuid, '45', 100, false, 10000 + n * 1000, '2026-10-21', true
from generate_series(1, 4) n;
select tests.as_user('00000000-0000-0000-0000-000000000c01');
select public.confirm_completed_job(id, true) from public.completed_jobs where owner_confirmed_at is null;

select tests.as_user('00000000-0000-0000-0000-000000000c04');
select tests.check(
  (select jobs = 5 and median_per_m2 = 120 from public.verified_job_summary() where province_code = '45' and not materials_included),
  'five shared jobs give a median price per m²'
);

reset role;
