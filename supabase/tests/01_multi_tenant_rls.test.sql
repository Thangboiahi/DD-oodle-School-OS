-- P1-M03 pgTAP verification: multi-tenant RLS isolation, composite tenant FKs,
-- append-only audit_events, platform-vs-institution separation, and Storage RLS.

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

BEGIN;

SET LOCAL search_path = public, extensions;

SELECT plan(26);

-- 1. Verify RLS is enabled and forced on all 7 public core tables
SELECT is(
  (
    SELECT count(*)::int
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'persons',
        'platform_operators',
        'institutions',
        'institution_memberships',
        'institution_roles',
        'role_assignments',
        'audit_events'
      )
      AND c.relrowsecurity = true
      AND c.relforcerowsecurity = true
  ),
  7,
  'All 7 core public tables have ENABLE and FORCE ROW LEVEL SECURITY'
);

-- 2. Verify anon sees 0 rows on all 7 tables
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::int FROM public.institutions), 0, 'anon sees 0 institutions');
SELECT is((SELECT count(*)::int FROM public.institution_memberships), 0, 'anon sees 0 memberships');
SELECT is((SELECT count(*)::int FROM public.institution_roles), 0, 'anon sees 0 roles');
SELECT is((SELECT count(*)::int FROM public.role_assignments), 0, 'anon sees 0 role_assignments');
SELECT is((SELECT count(*)::int FROM public.audit_events), 0, 'anon sees 0 audit_events');
SELECT is((SELECT count(*)::int FROM public.persons), 0, 'anon sees 0 persons');
SELECT is((SELECT count(*)::int FROM public.platform_operators), 0, 'anon sees 0 platform_operators');
RESET ROLE;

-- 3. Verify Sunrise Principal (2222...2201) isolation and Valley write denial
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222201","role":"authenticated","aud":"authenticated"}',
  true
);

SELECT is(
  (SELECT count(*)::int FROM public.institutions WHERE id = '11111111-1111-4111-8111-111111111101'),
  1,
  'Sunrise Principal reads Sunrise institution'
);
SELECT is(
  (SELECT count(*)::int FROM public.institutions WHERE id = '11111111-1111-4111-8111-111111111102'),
  0,
  'Sunrise Principal sees 0 Valley institutions'
);

SELECT throws_ok(
  $$INSERT INTO public.institution_roles (institution_id, code, name, permissions)
    VALUES ('11111111-1111-4111-8111-111111111102', 'rogue_role', 'Rogue', '[]'::jsonb)$$,
  '42501',
  NULL,
  'Sunrise Principal is denied inserting a Valley institution_roles row'
);

-- 4. Verify Private Storage RLS for Sunrise Principal
SELECT lives_ok(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('institution-private', '11111111-1111-4111-8111-111111111101/notices/welcome.pdf', '22222222-2222-4222-8222-222222222201')$$,
  'Sunrise Principal can write to Sunrise private storage folder'
);
SELECT is(
  (SELECT count(*)::int FROM storage.objects WHERE bucket_id = 'institution-private' AND name = '11111111-1111-4111-8111-111111111101/notices/welcome.pdf'),
  1,
  'Sunrise Principal can read Sunrise private storage file'
);
SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('institution-private', '11111111-1111-4111-8111-111111111102/notices/welcome.pdf', '22222222-2222-4222-8222-222222222201')$$,
  '42501',
  NULL,
  'Sunrise Principal is denied writing to Valley private storage folder'
);
SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('institution-private', 'not-a-uuid/notices/welcome.pdf', '22222222-2222-4222-8222-222222222201')$$,
  '42501',
  NULL,
  'Sunrise Principal is denied writing with malformed non-UUID folder prefix'
);

-- 5. Verify Dual Member (2222...2202) concurrent memberships & write denial
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222202","role":"authenticated","aud":"authenticated"}',
  true
);

SELECT is(
  (SELECT count(*)::int FROM public.institution_memberships),
  2,
  'Dual member sees both Sunrise and Valley memberships'
);
SELECT is(
  (SELECT count(DISTINCT institution_id)::int FROM public.institution_roles),
  2,
  'Dual member reads roles from both Sunrise and Valley'
);
SELECT throws_ok(
  $$INSERT INTO public.institution_roles (institution_id, code, name, permissions)
    VALUES ('11111111-1111-4111-8111-111111111101', 'teacher_hack', 'Hack', '[]'::jsonb)$$,
  '42501',
  NULL,
  'Dual member cannot create roles in Sunrise without roles.manage'
);

-- 6. Verify Platform Operator (2222...2204) has self-row only and 0 school rows
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222204","role":"authenticated","aud":"authenticated"}',
  true
);

SELECT is((SELECT count(*)::int FROM public.platform_operators), 1, 'Platform operator sees own platform_operators row');
SELECT is((SELECT count(*)::int FROM public.institutions), 0, 'Platform operator sees 0 institutions by default');
SELECT is((SELECT count(*)::int FROM public.institution_memberships), 0, 'Platform operator sees 0 memberships by default');
SELECT is((SELECT count(*)::int FROM public.role_assignments), 0, 'Platform operator sees 0 role_assignments by default');
SELECT is((SELECT count(*)::int FROM public.audit_events), 0, 'Platform operator sees 0 institutional audit_events by default');

RESET ROLE;

-- 7. Verify append-only audit_events trigger (UPDATE and DELETE) and composite cross-tenant FK
SELECT throws_ok(
  $$UPDATE public.audit_events SET reason = 'tampered' WHERE id = '77777777-7777-4777-8777-777777777701'$$,
  NULL,
  NULL,
  'audit_events rejects UPDATE via immutability trigger'
);
SELECT throws_ok(
  $$DELETE FROM public.audit_events WHERE id = '77777777-7777-4777-8777-777777777701'$$,
  NULL,
  NULL,
  'audit_events rejects DELETE via immutability trigger'
);
SELECT throws_ok(
  $$INSERT INTO public.role_assignments (institution_id, membership_id, role_id)
    VALUES ('11111111-1111-4111-8111-111111111101', '44444444-4444-4444-8444-444444444401', '55555555-5555-4555-8555-555555555201')$$,
  '23503',
  NULL,
  'Composite FK rejects Sunrise membership paired with Valley role'
);

SELECT * FROM finish();

ROLLBACK;
