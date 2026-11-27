-- P2-M01 pgTAP verification: 19-table forced RLS, relationship-scoped access,
-- custom field sensitivity RLS, composite tenant FKs, and schema uniqueness checks.

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

BEGIN;

SET LOCAL search_path = public, extensions;

SELECT plan(40);

-- 1. All 19 Phase 2 public tables have ENABLE and FORCE ROW LEVEL SECURITY
SELECT is(
  (
    SELECT count(*)::int
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'student_profiles',
        'staff_profiles',
        'student_guardians',
        'admission_applications',
        'custom_field_definitions',
        'custom_field_values',
        'academic_sessions',
        'academic_terms',
        'academic_departments',
        'grade_levels',
        'sections',
        'streams',
        'subjects',
        'subject_offerings',
        'student_session_enrolments',
        'student_subject_enrolments',
        'teaching_groups',
        'teaching_group_memberships',
        'academic_assignments'
      )
      AND c.relrowsecurity = true
      AND c.relforcerowsecurity = true
  ),
  19,
  'All 19 Phase 2 public tables have ENABLE and FORCE ROW LEVEL SECURITY'
);

-- 2. anon sees 0 rows across key Phase 2 tables
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::int FROM public.student_profiles), 0, 'anon sees 0 student_profiles');
SELECT is((SELECT count(*)::int FROM public.staff_profiles), 0, 'anon sees 0 staff_profiles');
SELECT is((SELECT count(*)::int FROM public.student_guardians), 0, 'anon sees 0 student_guardians');
SELECT is((SELECT count(*)::int FROM public.academic_sessions), 0, 'anon sees 0 academic_sessions');
SELECT is((SELECT count(*)::int FROM public.student_session_enrolments), 0, 'anon sees 0 student_session_enrolments');
SELECT is((SELECT count(*)::int FROM public.teaching_groups), 0, 'anon sees 0 teaching_groups');
SELECT is((SELECT count(*)::int FROM public.custom_field_values), 0, 'anon sees 0 custom_field_values');
RESET ROLE;

-- 3. platform.ops sees 0 rows across Phase 2 tables
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222204","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is((SELECT count(*)::int FROM public.student_profiles), 0, 'Platform operator sees 0 student_profiles');
SELECT is((SELECT count(*)::int FROM public.academic_sessions), 0, 'Platform operator sees 0 academic_sessions');
SELECT is((SELECT count(*)::int FROM public.custom_field_values), 0, 'Platform operator sees 0 custom_field_values');
SELECT is((SELECT count(*)::int FROM public.persons), 1, 'Platform operator sees ONLY own persons row (count = 1)');

-- 4. Cross-tenant isolation & sensitivity RLS for Sunrise Principal (2222...2201)
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222201","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (
    SELECT string_agg(full_name, ',' ORDER BY full_name)
    FROM public.persons
    WHERE id IN ('33333333-3333-4333-8333-333333333309', '33333333-3333-4333-8333-333333333310')
  ),
  'Aarav Verma,Meera Das',
  'Sunrise Principal reads full_name on public.persons for students without membership_id'
);
SELECT is(
  (SELECT count(*)::int FROM public.persons WHERE id = '33333333-3333-4333-8333-333333333311'),
  0,
  'Sunrise Principal sees 0 Valley persons (Kabir Rao)'
);
SELECT is(
  (SELECT count(*)::int FROM public.student_profiles WHERE institution_id = '11111111-1111-4111-8111-111111111101'),
  4,
  'Sunrise Principal sees all 4 Sunrise student_profiles'
);
SELECT is(
  (SELECT count(*)::int FROM public.student_profiles WHERE institution_id = '11111111-1111-4111-8111-111111111102'),
  0,
  'Sunrise Principal sees 0 Valley student_profiles'
);
SELECT is(
  (SELECT count(*)::int FROM public.academic_sessions WHERE institution_id = '11111111-1111-4111-8111-111111111102'),
  0,
  'Sunrise Principal sees 0 Valley academic_sessions'
);
SELECT throws_ok(
  $$INSERT INTO public.academic_sessions (institution_id, code, name, starts_on, ends_on)
    VALUES ('11111111-1111-4111-8111-111111111102', 'AY-HACK', 'Hack', '2027-04-01', '2028-03-31')$$,
  '42501',
  NULL,
  'Sunrise Principal is denied inserting Valley academic_sessions'
);
SELECT is(
  (SELECT count(*)::int FROM public.custom_field_values WHERE entity_id = '88888888-8888-4888-8888-888888880101'),
  2,
  'Sunrise Principal reads both standard and confidential custom_field_values'
);

-- 5. Dual Member (2222...2202): sees ONLY TG-XI-APPMATH-1 in Sunrise and ONLY Kabir in Valley + standard fields only
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222202","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (
    SELECT string_agg(admission_number, ',' ORDER BY admission_number)
    FROM public.student_profiles
    WHERE institution_id = '11111111-1111-4111-8111-111111111101'
  ),
  'ADM-SR-2026-001,ADM-SR-2026-003',
  'Dual member sees ONLY TG-XI-APPMATH-1 students (Aarav XI-A and Rohan XI-B) in Sunrise'
);
SELECT is(
  (
    SELECT string_agg(admission_number, ',' ORDER BY admission_number)
    FROM public.student_profiles
    WHERE institution_id = '11111111-1111-4111-8111-111111111102'
  ),
  'ADM-VL-2026-001',
  'Dual member sees ONLY ward Kabir Rao in Valley CBSE'
);
SELECT is(
  (
    SELECT count(*)::int
    FROM public.custom_field_values cfv
    JOIN public.custom_field_definitions cfd
      ON cfd.institution_id = cfv.institution_id
     AND cfd.id = cfv.definition_id
    WHERE cfv.entity_id = '88888888-8888-4888-8888-888888880101'
      AND cfd.sensitivity_level = 'confidential'
  ),
  0,
  'Subject teacher sees 0 confidential custom fields'
);
SELECT is(
  (SELECT count(*)::int FROM public.custom_field_values WHERE entity_id = '88888888-8888-4888-8888-888888880101'),
  1,
  'Subject teacher sees only standard custom field for TG student'
);
SELECT is(
  (
    SELECT string_agg(full_name, ',' ORDER BY full_name)
    FROM public.persons
    WHERE id IN (
      '33333333-3333-4333-8333-333333333307',
      '33333333-3333-4333-8333-333333333308',
      '33333333-3333-4333-8333-333333333309',
      '33333333-3333-4333-8333-333333333310'
    )
  ),
  'Aarav Verma,Rohan Sen',
  'Dual member reads persons.full_name ONLY for TG-XI-APPMATH-1 Sunrise students'
);
SELECT is(
  (SELECT full_name FROM public.persons WHERE id = '33333333-3333-4333-8333-333333333311'),
  'Kabir Rao',
  'Dual member reads persons.full_name for Valley ward Kabir Rao'
);

-- 6. Class Teacher XI-A (2222...2206): sees XI-A only, not XI-B, and standard fields only
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222206","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (
    SELECT string_agg(admission_number, ',' ORDER BY admission_number)
    FROM public.student_profiles
    WHERE institution_id = '11111111-1111-4111-8111-111111111101'
  ),
  'ADM-SR-2026-001,ADM-SR-2026-002',
  'Class Teacher XI-A sees ONLY XI-A students (Aarav and Diya), not XI-B'
);
SELECT is(
  (SELECT count(*)::int FROM public.custom_field_values WHERE entity_id = '88888888-8888-4888-8888-888888880101'),
  1,
  'Class Teacher XI-A sees standard custom field only (0 confidential)'
);

-- 7. HOD Senior Secondary (2222...2205): sees all 4 Sunrise Sr Sec students and 0 Valley
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222205","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::int FROM public.student_profiles WHERE institution_id = '11111111-1111-4111-8111-111111111101'),
  4,
  'HOD Senior Secondary sees all 4 Sunrise Senior Secondary students'
);
SELECT is(
  (SELECT count(*)::int FROM public.student_profiles WHERE institution_id = '11111111-1111-4111-8111-111111111102'),
  0,
  'HOD Senior Secondary sees 0 Valley students'
);

-- 8. Monitor XI-A (2222...2207): reads XI-A, 0 confidential fields, and denied all writes
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222207","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::int FROM public.student_profiles WHERE institution_id = '11111111-1111-4111-8111-111111111101'),
  2,
  'Monitor XI-A reads XI-A student profiles only'
);
SELECT is(
  (SELECT count(*)::int FROM public.custom_field_values WHERE entity_id = '88888888-8888-4888-8888-888888880101'),
  1,
  'Monitor XI-A sees standard custom fields only (0 confidential)'
);
SELECT is(
  (SELECT full_name FROM public.persons WHERE id = '33333333-3333-4333-8333-333333333309'),
  'Aarav Verma',
  'Monitor XI-A reads XI-A classmate Aarav Verma full_name'
);
SELECT is(
  (SELECT full_name FROM public.persons WHERE id = '33333333-3333-4333-8333-333333333306'),
  'Synthetic Class Teacher 11A',
  'Monitor XI-A reads assigned Class Teacher full_name via active academic_assignments'
);
SELECT is(
  (
    SELECT count(*)::int
    FROM public.persons
    WHERE id IN ('33333333-3333-4333-8333-333333333310', '33333333-3333-4333-8333-333333333311')
  ),
  0,
  'Monitor XI-A sees 0 persons for XI-B student Meera Das or Valley student Kabir Rao'
);
WITH updated AS (
  UPDATE public.student_session_enrolments
  SET roll_number = '99'
  WHERE id = '99999999-9999-4999-8999-999999998101'
  RETURNING id
)
SELECT is(
  (SELECT count(*)::int FROM updated),
  0,
  'Monitor XI-A updates 0 rows on student_session_enrolments'
);
SELECT throws_ok(
  $$INSERT INTO public.student_profiles (institution_id, person_id, admission_number)
    VALUES ('11111111-1111-4111-8111-111111111101', '33333333-3333-4333-8333-333333333301', 'ADM-HACK-001')$$,
  '42501',
  NULL,
  'Monitor XI-A is denied inserting student_profiles'
);
SELECT throws_ok(
  $$INSERT INTO public.custom_field_values (institution_id, definition_id, entity_type, entity_id, value_text)
    VALUES ('11111111-1111-4111-8111-111111111101', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0101', 'student', '88888888-8888-4888-8888-888888880102', 'Hack')$$,
  '42501',
  NULL,
  'Monitor XI-A is denied writing custom_field_values'
);

RESET ROLE;

-- 9. Structural integrity checks: composite tenant FK & partial unique indexes
SELECT throws_ok(
  $$INSERT INTO public.teaching_group_memberships (institution_id, teaching_group_id, student_enrolment_id)
    VALUES ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999999101', '99999999-9999-4999-8999-999999998201')$$,
  '23503',
  NULL,
  'Composite FK rejects pairing Sunrise teaching group with Valley student enrolment'
);
SELECT throws_ok(
  $$INSERT INTO public.academic_sessions (institution_id, code, name, starts_on, ends_on, status)
    VALUES ('11111111-1111-4111-8111-111111111101', 'AY-DUP-ACTIVE', 'Duplicate Active', '2027-04-01', '2028-03-31', 'active')$$,
  '23505',
  NULL,
  'Partial unique index rejects second active academic_sessions row for Sunrise'
);
SELECT throws_ok(
  $$UPDATE public.student_session_enrolments
    SET roll_number = '01'
    WHERE id = '99999999-9999-4999-8999-999999998102'$$,
  '23505',
  NULL,
  'Partial unique index rejects duplicate roll_number in same institution/session/section'
);

SELECT * FROM finish();

ROLLBACK;
