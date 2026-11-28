-- P4-M01 pgTAP verification: 10 Phase 4 tables (academic_terms + 9 new tables),
-- mutually exclusive record_comments, delayed syllabus reason, notice scope CHECK,
-- composite tenant FKs, subject-teacher independence vs oversight, guardian scoping,
-- and monitor board-only / zero internal-note isolation.

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

BEGIN;

SET LOCAL search_path = public, extensions;

SELECT plan(47);

-- 1. All 10 Phase 4 domain tables (academic_terms + 9 new tables) enforce ENABLE & FORCE RLS
SELECT is(
  (
    SELECT count(*)::int
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'academic_terms',
        'syllabus_items',
        'lesson_plans',
        'learning_resources',
        'assignments',
        'assignment_submissions',
        'official_notices',
        'notice_acknowledgements',
        'parent_enquiries',
        'record_comments'
      )
      AND c.relrowsecurity = true
      AND c.relforcerowsecurity = true
  ),
  10,
  'All 10 Phase 4 domain tables enforce ENABLE and FORCE ROW LEVEL SECURITY'
);

-- 2. anon sees 0 rows across all 9 new Phase 4 tables (plus academic_terms)
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::int FROM public.syllabus_items), 0, 'anon sees 0 syllabus_items');
SELECT is((SELECT count(*)::int FROM public.lesson_plans), 0, 'anon sees 0 lesson_plans');
SELECT is((SELECT count(*)::int FROM public.learning_resources), 0, 'anon sees 0 learning_resources');
SELECT is((SELECT count(*)::int FROM public.assignments), 0, 'anon sees 0 assignments');
SELECT is((SELECT count(*)::int FROM public.assignment_submissions), 0, 'anon sees 0 assignment_submissions');
SELECT is((SELECT count(*)::int FROM public.official_notices), 0, 'anon sees 0 official_notices');
SELECT is((SELECT count(*)::int FROM public.notice_acknowledgements), 0, 'anon sees 0 notice_acknowledgements');
SELECT is((SELECT count(*)::int FROM public.parent_enquiries), 0, 'anon sees 0 parent_enquiries');
SELECT is((SELECT count(*)::int FROM public.record_comments), 0, 'anon sees 0 record_comments');
RESET ROLE;

-- 3. platform.ops (2222...2204) sees 0 rows across all Phase 4 tables
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222204","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is((SELECT count(*)::int FROM public.syllabus_items), 0, 'platform.ops sees 0 syllabus_items');
SELECT is((SELECT count(*)::int FROM public.lesson_plans), 0, 'platform.ops sees 0 lesson_plans');
SELECT is((SELECT count(*)::int FROM public.learning_resources), 0, 'platform.ops sees 0 learning_resources');
SELECT is((SELECT count(*)::int FROM public.assignments), 0, 'platform.ops sees 0 assignments');
SELECT is((SELECT count(*)::int FROM public.assignment_submissions), 0, 'platform.ops sees 0 assignment_submissions');
SELECT is((SELECT count(*)::int FROM public.official_notices), 0, 'platform.ops sees 0 official_notices');
SELECT is((SELECT count(*)::int FROM public.parent_enquiries), 0, 'platform.ops sees 0 parent_enquiries');
SELECT is((SELECT count(*)::int FROM public.record_comments), 0, 'platform.ops sees 0 record_comments');

-- 4. Sunrise Principal (2222...2201): Sunrise isolation + CHECK / composite FK constraints
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222201","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::int FROM public.assignments WHERE institution_id = '11111111-1111-4111-8111-111111111101'),
  2,
  'Sunrise Principal reads all Sunrise assignments including draft'
);
SELECT is(
  (SELECT count(*)::int FROM public.official_notices WHERE institution_id = '11111111-1111-4111-8111-111111111102'),
  0,
  'Sunrise Principal sees 0 Valley official_notices'
);
SELECT throws_ok(
  $$INSERT INTO public.record_comments (
      institution_id, parent_kind, authored_by_person_id, body
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'notice',
      '33333333-3333-4333-8333-333333333301',
      'Unlinked chat message attempt'
    )$$,
  '42501',
  NULL,
  'record_comments RLS denies unlinked comment without parent FK (no chat rooms)'
);
SELECT throws_ok(
  $$INSERT INTO public.record_comments (
      institution_id, parent_kind, notice_id, assignment_id, authored_by_person_id, body
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'notice',
      'dddddddd-dddd-4ddd-8ddd-dddddddd6101',
      'dddddddd-dddd-4ddd-8ddd-dddddddd4101',
      '33333333-3333-4333-8333-333333333301',
      'Dual parent comment attempt'
    )$$,
  '23514',
  NULL,
  'record_comments rejects dual-parent linkage via mutually exclusive CHECK'
);
SELECT throws_ok(
  $$INSERT INTO public.syllabus_items (
      institution_id, session_id, subject_offering_id, item_kind, code, title, progress_status
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      '99999999-9999-4999-8999-999999990101',
      '99999999-9999-4999-8999-999999997104',
      'topic',
      'TOP-DELAY-BAD',
      'Delayed without reason',
      'delayed'
    )$$,
  '23514',
  NULL,
  'syllabus_items rejects delayed status without non-empty delay_reason'
);
SELECT throws_ok(
  $$INSERT INTO public.official_notices (
      institution_id, session_id, scope_type, department_id, category, title, body, authored_by_person_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      '99999999-9999-4999-8999-999999990101',
      'institution',
      '99999999-9999-4999-8999-999999992101',
      'general',
      'Bad scope target',
      'Institution scope must keep target FKs null',
      '33333333-3333-4333-8333-333333333301'
    )$$,
  '23514',
  NULL,
  'official_notices rejects mismatched scope_type target FK'
);
SELECT throws_ok(
  $$INSERT INTO public.parent_enquiries (
      institution_id, session_id, student_profile_id, guardian_person_id, category, subject, body
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      '99999999-9999-4999-8999-999999990101',
      '88888888-8888-4888-8888-888888880201',
      '33333333-3333-4333-8333-333333333301',
      'academic',
      'Cross-tenant student link',
      'Attempted Sunrise enquiry on Valley student'
    )$$,
  '42501',
  NULL,
  'Composite FK / RLS denies cross-tenant parent_enquiries link to Valley student'
);

-- 5. Dual Member (2222...2202): Sunrise Subject Teacher (TG-XI-APPMATH-1) & Valley Guardian (Kabir Rao)
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222202","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT lives_ok(
  $$INSERT INTO public.official_notices (
      institution_id, session_id, scope_type, teaching_group_id, category, title, body, status, authored_by_person_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      '99999999-9999-4999-8999-999999990101',
      'teaching_group',
      '99999999-9999-4999-8999-999999999101',
      'academic',
      'Extra Problem Solving Session',
      'Subject teacher independent notice for TG-XI-APPMATH-1',
      'published',
      '33333333-3333-4333-8333-333333333302'
    )$$,
  'Subject teacher independently publishes teaching_group notice for TG-XI-APPMATH-1'
);
SELECT lives_ok(
  $$UPDATE public.assignment_submissions
    SET status = 'evaluated',
        marks_awarded = 18.50,
        teacher_remarks = 'Well structured congruence proofs',
        evaluated_by_person_id = '33333333-3333-4333-8333-333333333302',
        evaluated_at = now()
    WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddd5101'$$,
  'Subject teacher evaluates Aarav submission inside TG-XI-APPMATH-1'
);
SELECT throws_ok(
  $$INSERT INTO public.assignments (
      institution_id, session_id, teaching_group_id, title, instructions, assignment_type, authored_by_person_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      '99999999-9999-4999-8999-999999990101',
      '99999999-9999-4999-8999-999999999102',
      'Unauthorized CS Homework',
      'Should fail on unassigned teaching group',
      'homework',
      '33333333-3333-4333-8333-333333333302'
    )$$,
  '42501',
  NULL,
  'Subject teacher is denied creating assignments for unassigned TG-XI-CS-1'
);
SELECT throws_ok(
  $$INSERT INTO public.official_notices (
      institution_id, session_id, scope_type, category, title, body, status, authored_by_person_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      '99999999-9999-4999-8999-999999990101',
      'institution',
      'general',
      'Unauthorized School Notice',
      'Subject teacher cannot broadcast school-wide',
      'published',
      '33333333-3333-4333-8333-333333333302'
    )$$,
  '42501',
  NULL,
  'Subject teacher is denied publishing institution-wide notice'
);
SELECT is(
  (SELECT count(*)::int FROM public.parent_enquiries WHERE institution_id = '11111111-1111-4111-8111-111111111102'),
  1,
  'Dual member reads own Kabir Rao parent_enquiry in Valley'
);
SELECT is(
  (SELECT count(*)::int FROM public.parent_enquiries WHERE institution_id = '11111111-1111-4111-8111-111111111101'),
  0,
  'Dual member sees 0 general Sunrise parent_enquiries (Aarav Verma section enquiry)'
);
SELECT is(
  (SELECT count(*)::int FROM public.record_comments WHERE is_internal_staff_note = true AND institution_id = '11111111-1111-4111-8111-111111111101'),
  0,
  'Dual member sees 0 is_internal_staff_note comments outside authorized enquiry'
);
SELECT lives_ok(
  $$INSERT INTO public.notice_acknowledgements (
      institution_id, notice_id, person_id, student_profile_id, note
    ) VALUES (
      '11111111-1111-4111-8111-111111111102',
      'dddddddd-dddd-4ddd-8ddd-dddddddd6201',
      '33333333-3333-4333-8333-333333333302',
      '88888888-8888-4888-8888-888888880201',
      'Acknowledged PTM schedule for Kabir Rao'
    )$$,
  'Dual member acknowledges Valley institution notice for Kabir Rao'
);

-- 6. Class Teacher XI-A (2222...2206) & HOD Sr Sec (2222...2205): oversight read + internal staff note
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222206","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::int FROM public.lesson_plans WHERE teaching_group_id = '99999999-9999-4999-8999-999999999101'),
  1,
  'Class Teacher XI-A receives read oversight across TG-XI-APPMATH-1 lesson_plans'
);
SELECT is(
  (SELECT count(*)::int FROM public.record_comments WHERE is_internal_staff_note = true),
  1,
  'Class Teacher XI-A reads is_internal_staff_note comment on Sunrise Aarav enquiry'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222205","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::int FROM public.assignment_submissions WHERE assignment_id = 'dddddddd-dddd-4ddd-8ddd-dddddddd4101'),
  2,
  'HOD Sr Sec receives oversight across all TG-XI-APPMATH-1 student submissions'
);
SELECT is(
  (SELECT count(*)::int FROM public.parent_enquiries WHERE institution_id = '11111111-1111-4111-8111-111111111102'),
  0,
  'Sunrise HOD sees 0 Valley parent_enquiries'
);

-- 7. Monitor XI-A (2222...2207): board assignments + published institution notice ONLY; 0 submissions/enquiries/internal notes/drafts
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222207","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::int FROM public.assignments WHERE status = 'published'),
  1,
  'Monitor XI-A reads published TG-XI-APPMATH-1 assignment for physical classroom board'
);
SELECT is(
  (SELECT count(*)::int FROM public.assignments WHERE status = 'draft'),
  0,
  'Monitor XI-A sees 0 draft assignments'
);
SELECT is(
  (SELECT count(*)::int FROM public.official_notices WHERE scope_type = 'institution' AND status = 'published'),
  1,
  'Monitor XI-A reads published institution notice'
);
SELECT is(
  (SELECT count(*)::int FROM public.assignment_submissions),
  0,
  'Monitor XI-A sees 0 classmates assignment_submissions'
);
SELECT is(
  (SELECT count(*)::int FROM public.parent_enquiries),
  0,
  'Monitor XI-A sees 0 parent_enquiries'
);
SELECT is(
  (SELECT count(*)::int FROM public.record_comments WHERE is_internal_staff_note = true),
  0,
  'Monitor XI-A sees 0 is_internal_staff_note comments'
);
SELECT throws_ok(
  $$INSERT INTO public.assignments (
      institution_id, session_id, teaching_group_id, title, instructions, assignment_type, authored_by_person_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      '99999999-9999-4999-8999-999999990101',
      '99999999-9999-4999-8999-999999999101',
      'Monitor Unauthorized Homework',
      'Monitors are read-only',
      'homework',
      '33333333-3333-4333-8333-333333333307'
    )$$,
  '42501',
  NULL,
  'Monitor XI-A is denied creating assignments'
);
SELECT throws_ok(
  $$INSERT INTO public.official_notices (
      institution_id, session_id, scope_type, section_id, category, title, body, status, authored_by_person_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      '99999999-9999-4999-8999-999999990101',
      'section',
      '99999999-9999-4999-8999-999999994101',
      'general',
      'Monitor Unauthorized Notice',
      'Monitors cannot issue notices',
      'published',
      '33333333-3333-4333-8333-333333333307'
    )$$,
  '42501',
  NULL,
  'Monitor XI-A is denied creating official_notices'
);
SELECT is(
  (SELECT count(*)::int FROM public.lesson_plans),
  0,
  'Monitor XI-A sees 0 teacher lesson_plans'
);

-- 8. Verify table CHECK constraint directly under privileged role (RESET ROLE)
RESET ROLE;
SELECT throws_ok(
  $$INSERT INTO public.record_comments (
      institution_id, parent_kind, authored_by_person_id, body
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'notice',
      '33333333-3333-4333-8333-333333333301',
      'Privileged unlinked chat message attempt'
    )$$,
  '23514',
  NULL,
  'record_comments CHECK constraint rejects unlinked comment even when bypassing RLS'
);

SELECT * FROM finish();

ROLLBACK;
