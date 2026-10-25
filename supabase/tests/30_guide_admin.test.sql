-- Guide visibility, admin-only writes, audit log and admin stats.

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'editor@example.com'),
  ('00000000-0000-0000-0000-0000000000f1', 'user@example.com');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000e1', 'admin');

select tests.check((select count(*) from public.guide_articles where status = 'published') = 10, 'seed has 10 published guides');

-- Visitors without an account read published guides only.
insert into public.guide_articles (slug, category, title) values ('taslak-yazi', 'walls', 'Taslak');
select tests.as_anon();
select tests.check((select count(*) from public.guide_articles) = 10, 'anon reads published guides');
select tests.check((select count(*) from public.guide_articles where slug = 'taslak-yazi') = 0, 'anon does not see drafts');
select tests.fails($$insert into public.guide_articles (slug, category, title) values ('x', 'walls', 'x')$$, 'anon cannot write guides');

select tests.as_user('00000000-0000-0000-0000-0000000000f1');
select tests.check((select count(*) from public.guide_articles where slug = 'taslak-yazi') = 0, 'normal user does not see drafts');
select tests.fails(
  $$insert into public.guide_articles (slug, category, title) values ('benim', 'walls', 'Benim')$$,
  'normal user cannot add guides'
);
update public.guide_articles set title = 'Hacked';
select tests.check((select count(*) from public.guide_articles where title = 'Hacked') = 0, 'normal user cannot edit guides');
select tests.check((select count(*) from public.audit_log) = 0, 'normal user cannot read the audit log');
select tests.check((select count(*) from public.admin_stats()) = 0, 'admin stats are empty for non-admins');

-- The editor (admin) manages guides; every write is logged.
select tests.as_user('00000000-0000-0000-0000-0000000000e1');
select tests.check((select count(*) from public.guide_articles where slug = 'taslak-yazi') = 1, 'admin sees drafts');
update public.guide_articles set status = 'published', published_at = now() where slug = 'taslak-yazi';
select tests.fails(
  $$update public.guide_articles set status = 'published', published_at = null where slug = 'taslak-yazi'$$,
  'published guide needs a publish date'
);
select tests.fails(
  $$insert into public.guide_articles (slug, category, title) values ('Bad Slug!', 'walls', 'x')$$,
  'slug must be url-safe'
);
select tests.check(
  (select count(*) from public.audit_log
    where table_name = 'guide_articles' and actor_id = '00000000-0000-0000-0000-0000000000e1' and action = 'UPDATE') = 1,
  'admin edit is written to the audit log'
);
select tests.check((select published_guides from public.admin_stats()) = 11, 'admin stats count published guides');
select tests.fails($$delete from public.audit_log$$, 'nobody can delete audit entries through the API');

reset role;
delete from public.guide_articles where slug = 'taslak-yazi';
