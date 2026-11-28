-- P3-M01 pgTAP verification: 8 forced-RLS tables, append-only attendance_events,
-- composite tenant FKs, idempotency_key uniqueness, monitor verified-only boundary,
-- leave/notice guardian scoping, and category-partitioned handbook RLS.

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

BEGIN;

SET LOCAL search_path = public, extensions;

SELECT plan(43);

-- 1. All 8 Phase 3 tables have ENABLE and FORCE ROW LEVEL SECURITY
SELECT is(
  (
    SELECT count(*)::int
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'attendance_policies',
        'attendance_events',
        'student_daily_attendance',
        'student_period_attendance',
        'staff_daily_attendance',
        'leave_applications',
        'parent_attendance_notices',
        'handbook_entries'
      )
      AND c.relrowsecurity = true
      AND c.relforcerowsecurity = true
  ),
  8,
  'All 8 Phase 3 tables enforce ENABLE and FORCE ROW LEVEL SECURITY'
);

-- 2. anon sees 0 rows across all 8 Phase 3 tables
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::int FROM public.attendance_policies), 0, 'anon sees 0 attendance_policies');
SELECT is((SELECT count(*)::int FROM public.attendance_events), 0, 'anon sees 0 attendance_events');
SELECT is((SELECT count(*)::int FROM public.student_daily_attendance), 0, 'anon sees 0 student_daily_attendance');
SELECT is((SELECT count(*)::int FROM public.student_period_attendance), 0, 'anon sees 0 student_period_attendance');
SELECT is((SELECT count(*)::int FROM public.staff_daily_attendance), 0, 'anon sees 0 staff_daily_attendance');
SELECT is((SELECT count(*)::int FROM public.leave_applications), 0, 'anon sees 0 leave_applications');
SELECT is((SELECT count(*)::int FROM public.parent_attendance_notices), 0, 'anon sees 0 parent_attendance_notices');
SELECT is((SELECT count(*)::int FROM public.handbook_entries), 0, 'anon sees 0 handbook_entries');
RESET ROLE;

-- 3. platform.ops (2222...2204) sees 0 rows across all 8 Phase 3 tables
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222204","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is((SELECT count(*)::int FROM public.attendance_policies), 0, 'platform.ops sees 0 attendance_policies');
SELECT is((SELECT count(*)::int FROM public.attendance_events), 0, 'platform.ops sees 0 attendance_events');
SELECT is((SELECT count(*)::int FROM public.student_daily_attendance), 0, 'platform.ops sees 0 student_daily_attendance');
SELECT is((SELECT count(*)::int FROM public.student_period_attendance), 0, 'platform.ops sees 0 student_period_attendance');
SELECT is((SELECT count(*)::int FROM public.staff_daily_attendance), 0, 'platform.ops sees 0 staff_daily_attendance');
SELECT is((SELECT count(*)::int FROM public.leave_applications), 0, 'platform.ops sees 0 leave_applications');
SELECT is((SELECT count(*)::int FROM public.parent_attendance_notices), 0, 'platform.ops sees 0 parent_attendance_notices');
SELECT is((SELECT count(*)::int FROM public.handbook_entries), 0, 'platform.ops sees 0 handbook_entries');

-- 4. Sunrise Principal (2222...2201): reads all 3 handbook categories, sees 0 Valley rows, idempotency + append-only + composite FK
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222201","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::int FROM public.handbook_entries WHERE institution_id = '11111111-1111-4111-8111-111111111101'),
  3,
  'Sunrise Principal reads all 3 Sunrise handbook categories including leadership_only'
);
SELECT is(
  (SELECT count(*)::int FROM public.attendance_policies WHERE institution_id = '11111111-1111-4111-8111-111111111102'),
  0,
  'Sunrise Principal sees 0 Valley attendance_policies'
);
SELECT is(
  (SELECT count(*)::int FROM public.parent_attendance_notices WHERE institution_id = '11111111-1111-4111-8111-111111111102'),
  0,
  'Sunrise Principal sees 0 Valley parent_attendance_notices'
);
SELECT throws_ok(
  $$INSERT INTO public.student_daily_attendance (
      institution_id, session_id, student_enrolment_id, student_profile_id, section_id, attendance_date, status
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      '99999999-9999-4999-8999-999999990101',
      '99999999-9999-4999-8999-999999998201',
      '88888888-8888-4888-8888-888888880201',
      '99999999-9999-4999-8999-999999994101',
      '2026-11-28',
      'present'
    )$$,
  '23503',
  NULL,
  'Composite FK rejects Sunrise daily attendance pairing Valley student_enrolment_id'
);
SELECT throws_ok(
  $$UPDATE public.attendance_events SET reason = 'tampered' WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccc1101'$$,
  '42501',
  NULL,
  'attendance_events rejects UPDATE via append-only trigger'
);
SELECT throws_ok(
  $$DELETE FROM public.attendance_events WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccc1101'$$,
  '42501',
  NULL,
  'attendance_events rejects DELETE via append-only trigger'
);
SELECT throws_ok(
  $$INSERT INTO public.attendance_events (
      institution_id, idempotency_key, subject_kind, student_profile_id, session_id, section_id, attendance_date, event_type, attendance_status
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'seed-sr-2026-11-27-aarav',
      'student',
      '88888888-8888-4888-8888-888888880101',
      '99999999-9999-4999-8999-999999990101',
      '99999999-9999-4999-8999-999999994101',
      '2026-11-27',
      'day_roll',
      'present'
    )$$,
  '23505',
  NULL,
  'Duplicate (institution_id, idempotency_key) rejected on attendance_events'
);
SELECT throws_ok(
  $$INSERT INTO public.parent_attendance_notices (
      institution_id, student_profile_id, guardian_person_id, attendance_date, notice_kind, message
    ) VALUES (
      '11111111-1111-4111-8111-111111111102',
      '88888888-8888-4888-8888-888888880201',
      '33333333-3333-4333-8333-333333333301',
      '2026-11-28',
      'absence',
      'Cross-tenant notice hack'
    )$$,
  '42501',
  NULL,
  'Sunrise Principal is denied inserting parent_attendance_notices in Valley'
);

-- 5. Class Teacher XI-A (2222...2206): reads student_support, sees 0 leadership_only, can mark/update XI-A draft
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222206","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::int FROM public.handbook_entries WHERE category = 'student_support'),
  1,
  'Class Teacher XI-A reads student_support (class_teacher_and_leadership) entry'
);
SELECT is(
  (SELECT count(*)::int FROM public.handbook_entries WHERE visibility_scope = 'leadership_only'),
  0,
  'Class Teacher XI-A sees 0 leadership_only disciplinary entries'
);
SELECT lives_ok(
  $$UPDATE public.student_daily_attendance
    SET remarks = 'Verified morning roll'
    WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccc2101'$$,
  'Class Teacher XI-A can update XI-A student_daily_attendance'
);
SELECT lives_ok(
  $$INSERT INTO public.student_daily_attendance (
      institution_id, session_id, student_enrolment_id, student_profile_id, section_id, attendance_date, status, verification_status, marked_by_person_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      '99999999-9999-4999-8999-999999990101',
      '99999999-9999-4999-8999-999999998101',
      '88888888-8888-4888-8888-888888880101',
      '99999999-9999-4999-8999-999999994101',
      '2026-11-28',
      'present',
      'draft',
      '33333333-3333-4333-8333-333333333306'
    )$$,
  'Class Teacher XI-A can insert a draft daily attendance row for XI-A'
);

-- 6. Monitor XI-A (2222...2207): verified-only XI-A daily attendance, 0 draft, 0 handbook, 0 leave, 0 staff, writes denied
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222207","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::int FROM public.student_daily_attendance WHERE verification_status IN ('class_teacher_verified', 'signed_off')),
  2,
  'Monitor XI-A reads 2 verified XI-A daily attendance rows'
);
SELECT is(
  (SELECT count(*)::int FROM public.student_daily_attendance WHERE verification_status = 'draft'),
  0,
  'Monitor XI-A sees 0 draft daily attendance rows (even inside XI-A)'
);
SELECT is((SELECT count(*)::int FROM public.handbook_entries), 0, 'Monitor XI-A sees 0 handbook_entries');
SELECT is((SELECT count(*)::int FROM public.leave_applications), 0, 'Monitor XI-A sees 0 classmates leave_applications');
SELECT is((SELECT count(*)::int FROM public.staff_daily_attendance), 0, 'Monitor XI-A sees 0 staff_daily_attendance');
SELECT throws_ok(
  $$INSERT INTO public.student_daily_attendance (
      institution_id, session_id, student_enrolment_id, student_profile_id, section_id, attendance_date, status
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      '99999999-9999-4999-8999-999999990101',
      '99999999-9999-4999-8999-999999998102',
      '88888888-8888-4888-8888-888888880102',
      '99999999-9999-4999-8999-999999994101',
      '2026-11-29',
      'present'
    )$$,
  '42501',
  NULL,
  'Monitor XI-A is denied inserting student_daily_attendance'
);
SELECT throws_ok(
  $$INSERT INTO public.handbook_entries (
      institution_id, session_id, student_profile_id, category, visibility_scope, title, body, authored_by_person_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      '99999999-9999-4999-8999-999999990101',
      '88888888-8888-4888-8888-888888880101',
      'academic_observation',
      'student_and_guardian',
      'Peer Note',
      'Forbidden monitor write',
      '33333333-3333-4333-8333-333333333307'
    )$$,
  '42501',
  NULL,
  'Monitor XI-A is denied inserting handbook_entries'
);

-- 7. Dual Member (2222...2202): Subject Teacher TG-XI-APPMATH-1 in Sunrise + Guardian in Valley
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222202","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::int FROM public.handbook_entries WHERE category = 'academic_observation'),
  1,
  'Dual member reads own academic_observation entry on TG-XI-APPMATH-1 student'
);
SELECT is(
  (SELECT count(*)::int FROM public.handbook_entries WHERE category IN ('student_support', 'disciplinary')),
  0,
  'Dual member sees 0 student_support or disciplinary handbook entries'
);
SELECT throws_ok(
  $$INSERT INTO public.handbook_entries (
      institution_id, session_id, student_profile_id, category, visibility_scope, teaching_group_id, title, body, authored_by_person_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      '99999999-9999-4999-8999-999999990101',
      '88888888-8888-4888-8888-888888880101',
      'disciplinary',
      'leadership_only',
      '99999999-9999-4999-8999-999999999101',
      'Forbidden Subject Teacher Note',
      'Subject teachers cannot write disciplinary notes',
      '33333333-3333-4333-8333-333333333302'
    )$$,
  '42501',
  NULL,
  'Subject teacher is denied inserting disciplinary handbook entry'
);
SELECT lives_ok(
  $$INSERT INTO public.parent_attendance_notices (
      institution_id, student_profile_id, guardian_person_id, attendance_date, notice_kind, message
    ) VALUES (
      '11111111-1111-4111-8111-111111111102',
      '88888888-8888-4888-8888-888888880201',
      '33333333-3333-4333-8333-333333333302',
      '2026-12-01',
      'absence',
      'Linked guardian notice for Kabir Rao'
    )$$,
  'Dual member can submit parent_attendance_notices for linked Valley ward Kabir Rao'
);
SELECT throws_ok(
  $$INSERT INTO public.parent_attendance_notices (
      institution_id, student_profile_id, guardian_person_id, attendance_date, notice_kind, message
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      '88888888-8888-4888-8888-888888880101',
      '33333333-3333-4333-8333-333333333302',
      '2026-12-01',
      'absence',
      'Unauthorized Sunrise notice'
    )$$,
  '42501',
  NULL,
  'Dual member is denied submitting parent_attendance_notices for Sunrise student'
);

-- 8. Verify append-only attendance_events statement trigger under privileged role (RESET ROLE)
RESET ROLE;
SELECT throws_ok(
  $$UPDATE public.attendance_events SET reason = 'privileged tamper' WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccc1101'$$,
  '42501',
  NULL,
  'attendance_events rejects privileged UPDATE via statement-level append-only trigger'
);
SELECT throws_ok(
  $$DELETE FROM public.attendance_events WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccc1101'$$,
  '42501',
  NULL,
  'attendance_events rejects privileged DELETE via statement-level append-only trigger'
);

SELECT * FROM finish();

ROLLBACK;
