-- P5-M01 pgTAP verification: 11 Phase 5 tables (venues, timetable_periods,
-- timetables, timetable_slots, timetable_substitutions, academic_calendar_events,
-- assessment_schemes, exam_cycles, exam_schedules, exam_marks_entries, result_snapshots),
-- composite tenant FKs, double-booking unique constraints, statement-level 42501
-- immutability on result_snapshots, reissue reason checks, strict zero raw marks
-- access for students/guardians/monitors, and cross-role/cross-tenant isolation.

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

BEGIN;

SET LOCAL search_path = public, extensions;

SELECT plan(50);

-- 1. All 11 Phase 5 tables enforce ENABLE & FORCE ROW LEVEL SECURITY
SELECT is(
  (
    SELECT count(*)::int
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'venues',
        'timetable_periods',
        'timetables',
        'timetable_slots',
        'timetable_substitutions',
        'academic_calendar_events',
        'assessment_schemes',
        'exam_cycles',
        'exam_schedules',
        'exam_marks_entries',
        'result_snapshots'
      )
      AND c.relrowsecurity = true
      AND c.relforcerowsecurity = true
  ),
  11,
  'All 11 Phase 5 domain tables enforce ENABLE and FORCE ROW LEVEL SECURITY'
);

-- 2. anon sees 0 rows across all 11 Phase 5 tables
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::int FROM public.venues), 0, 'anon sees 0 venues');
SELECT is((SELECT count(*)::int FROM public.timetable_periods), 0, 'anon sees 0 timetable_periods');
SELECT is((SELECT count(*)::int FROM public.timetables), 0, 'anon sees 0 timetables');
SELECT is((SELECT count(*)::int FROM public.timetable_slots), 0, 'anon sees 0 timetable_slots');
SELECT is((SELECT count(*)::int FROM public.timetable_substitutions), 0, 'anon sees 0 timetable_substitutions');
SELECT is((SELECT count(*)::int FROM public.academic_calendar_events), 0, 'anon sees 0 academic_calendar_events');
SELECT is((SELECT count(*)::int FROM public.assessment_schemes), 0, 'anon sees 0 assessment_schemes');
SELECT is((SELECT count(*)::int FROM public.exam_cycles), 0, 'anon sees 0 exam_cycles');
SELECT is((SELECT count(*)::int FROM public.exam_schedules), 0, 'anon sees 0 exam_schedules');
SELECT is((SELECT count(*)::int FROM public.exam_marks_entries), 0, 'anon sees 0 exam_marks_entries');
SELECT is((SELECT count(*)::int FROM public.result_snapshots), 0, 'anon sees 0 result_snapshots');
RESET ROLE;

-- 3. platform.ops (2222...2204) sees 0 rows across Phase 5 tables
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222204","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is((SELECT count(*)::int FROM public.timetables), 0, 'platform.ops sees 0 timetables');
SELECT is((SELECT count(*)::int FROM public.timetable_substitutions), 0, 'platform.ops sees 0 timetable_substitutions');
SELECT is((SELECT count(*)::int FROM public.exam_marks_entries), 0, 'platform.ops sees 0 exam_marks_entries');
SELECT is((SELECT count(*)::int FROM public.result_snapshots), 0, 'platform.ops sees 0 result_snapshots');

-- 4. Statement-level 42501 immutability trigger on result_snapshots under RESET ROLE (privileged) and authenticated
RESET ROLE;
SELECT throws_ok(
  $$UPDATE public.result_snapshots SET overall_grade = 'A1' WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeea101'$$,
  '42501',
  NULL,
  'result_snapshots statement-level trigger blocks UPDATE under privileged role (42501)'
);
SELECT throws_ok(
  $$DELETE FROM public.result_snapshots WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeea101'$$,
  '42501',
  NULL,
  'result_snapshots statement-level trigger blocks DELETE under privileged role (42501)'
);

-- 5. Sunrise Principal (2222...2201): Sunrise isolation, constraints, conflict indexes, reissue snapshots
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222201","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::int FROM public.result_snapshots WHERE institution_id = '11111111-1111-4111-8111-111111111102'),
  0,
  'Sunrise Principal sees 0 Valley result_snapshots'
);
SELECT throws_ok(
  $$UPDATE public.result_snapshots SET overall_grade = 'A1' WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeea101'$$,
  '42501',
  NULL,
  'result_snapshots statement-level trigger blocks UPDATE under authenticated role (42501)'
);
SELECT throws_ok(
  $$INSERT INTO public.timetable_slots (
      institution_id, timetable_id, day_of_week, period_id, teaching_group_id, teacher_person_id, venue_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee2101',
      1,
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee1101',
      '99999999-9999-4999-8999-999999999102',
      '33333333-3333-4333-8333-333333333302',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0102'
    )$$,
  '23505',
  NULL,
  'timetable_slots partial unique index rejects teacher double-booking in same timetable period (23505)'
);
SELECT throws_ok(
  $$INSERT INTO public.timetable_slots (
      institution_id, timetable_id, day_of_week, period_id, section_id, teacher_person_id, venue_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee2101',
      1,
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee1101',
      '99999999-9999-4999-8999-999999994102',
      '33333333-3333-4333-8333-333333333306',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'
    )$$,
  '23505',
  NULL,
  'timetable_slots partial unique index rejects venue double-booking in same timetable period (23505)'
);
SELECT throws_ok(
  $$INSERT INTO public.exam_schedules (
      institution_id, exam_cycle_id, subject_offering_id, exam_date, start_time, end_time, venue_id, max_marks, pass_marks
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee7101',
      '99999999-9999-4999-8999-999999997104',
      '2026-09-18',
      '09:00:00',
      '12:00:00',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0201',
      100.00,
      33.00
    )$$,
  '23503',
  NULL,
  'Composite tenant FK rejects linking Sunrise exam schedule to Valley venue (23503)'
);
SELECT throws_ok(
  $$INSERT INTO public.result_snapshots (
      institution_id, exam_cycle_id, student_enrolment_id, student_profile_id, revision_no, supersedes_snapshot_id, reissue_reason, snapshot_payload, overall_percentage, overall_grade, result_status, published_by_person_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee7101',
      '99999999-9999-4999-8999-999999998101',
      '88888888-8888-4888-8888-888888880101',
      2,
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeea101',
      '   ',
      '{"cycleCode":"TERM1-2026"}'::jsonb,
      91.00,
      'A1',
      'pass',
      '33333333-3333-4333-8333-333333333301'
    )$$,
  '23514',
  NULL,
  'result_snapshots CHECK rejects revision_no > 1 without non-empty reissue_reason (23514)'
);
SELECT lives_ok(
  $$INSERT INTO public.result_snapshots (
      institution_id, exam_cycle_id, student_enrolment_id, student_profile_id, revision_no, supersedes_snapshot_id, reissue_reason, snapshot_payload, overall_percentage, overall_grade, result_status, published_by_person_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee7101',
      '99999999-9999-4999-8999-999999998101',
      '88888888-8888-4888-8888-888888880101',
      2,
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeea101',
      'Re-totalling correction approved by Principal',
      '{"cycleCode":"TERM1-2026","subjects":[{"subjectCode":"APP-MATH","maxMarks":100,"marksObtained":92,"grade":"A1"}]}'::jsonb,
      92.00,
      'A1',
      'pass',
      '33333333-3333-4333-8333-333333333301'
    )$$,
  'Sunrise Principal inserts valid revision_no = 2 reissue snapshot with reason and supersedes link'
);

-- 6. Dual Member (2222...2202): Sunrise Subject Teacher (TG-XI-APPMATH-1) & Valley Guardian (Kabir Rao)
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222202","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::int FROM public.timetables WHERE institution_id = '11111111-1111-4111-8111-111111111101'),
  2,
  'Sunrise Subject Teacher reads both published and draft Sunrise timetables'
);
SELECT is(
  (SELECT count(*)::int FROM public.timetable_substitutions WHERE institution_id = '11111111-1111-4111-8111-111111111101'),
  1,
  'Sunrise Subject Teacher reads Sunrise timetable_substitutions'
);
SELECT lives_ok(
  $$UPDATE public.exam_marks_entries
       SET total_marks = 82.00,
           status = 'submitted'
     WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee9102'$$,
  'Sunrise Subject Teacher updates and submits TG-XI-APPMATH-1 draft mark for Rohan Sen'
);
SELECT throws_ok(
  $$UPDATE public.exam_marks_entries
       SET status = 'approved'
     WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee9102'$$,
  '42501',
  NULL,
  'Subject Teacher cannot approve own marks entry (42501)'
);
SELECT throws_ok(
  $$INSERT INTO public.exam_marks_entries (
      institution_id, exam_cycle_id, exam_schedule_id, student_enrolment_id, student_profile_id, total_marks, status, entered_by_person_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee7101',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee8102',
      '99999999-9999-4999-8999-999999998104',
      '88888888-8888-4888-8888-888888880104',
      95.00,
      'draft',
      '33333333-3333-4333-8333-333333333302'
    )$$,
  '42501',
  NULL,
  'Subject Teacher cannot write unassigned TG-XI-CS-1 exam_marks_entries (42501)'
);
SELECT throws_ok(
  $$INSERT INTO public.result_snapshots (
      institution_id, exam_cycle_id, student_enrolment_id, student_profile_id, revision_no, snapshot_payload, overall_percentage, overall_grade, result_status, published_by_person_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee7101',
      '99999999-9999-4999-8999-999999998103',
      '88888888-8888-4888-8888-888888880103',
      1,
      '{"cycleCode":"TERM1-2026"}'::jsonb,
      82.00,
      'A2',
      'pass',
      '33333333-3333-4333-8333-333333333302'
    )$$,
  '42501',
  NULL,
  'Subject Teacher cannot insert into result_snapshots (42501)'
);
SELECT is(
  (SELECT count(*)::int FROM public.result_snapshots WHERE institution_id = '11111111-1111-4111-8111-111111111102'),
  1,
  'Valley Guardian reads linked ward Kabir Rao published Valley result_snapshot'
);
SELECT is(
  (SELECT count(*)::int FROM public.exam_marks_entries WHERE institution_id = '11111111-1111-4111-8111-111111111102'),
  0,
  'Valley Guardian sees 0 raw Valley exam_marks_entries'
);
SELECT is(
  (SELECT count(*)::int FROM public.result_snapshots WHERE institution_id = '11111111-1111-4111-8111-111111111101'),
  0,
  'Dual Member has 0 access to Sunrise Aarav result_snapshots'
);

-- 7. Student (2222...2208 Rohan Sen): published schedules only, 0 draft timetables, 0 substitutions, 0 raw marks, 0 Aarav snapshots
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222208","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::int FROM public.timetables WHERE institution_id = '11111111-1111-4111-8111-111111111101' AND status = 'published'),
  1,
  'Enrolled Student reads published Sunrise timetable'
);
SELECT is(
  (SELECT count(*)::int FROM public.timetables WHERE institution_id = '11111111-1111-4111-8111-111111111101' AND status = 'draft'),
  0,
  'Student sees 0 draft timetables'
);
SELECT is(
  (SELECT count(*)::int FROM public.timetable_substitutions WHERE institution_id = '11111111-1111-4111-8111-111111111101'),
  0,
  'Student sees 0 staff timetable_substitutions'
);
SELECT is(
  (SELECT count(*)::int FROM public.exam_marks_entries WHERE institution_id = '11111111-1111-4111-8111-111111111101'),
  0,
  'Student sees 0 raw exam_marks_entries (even for own profile)'
);
SELECT is(
  (SELECT count(*)::int FROM public.result_snapshots WHERE student_profile_id = '88888888-8888-4888-8888-888888880101'),
  0,
  'Student Rohan Sen cannot read classmate Aarav result_snapshots'
);

-- 8. Class Monitor XI-A (2222...2207 Diya Nair): reads published schedules, 0 draft timetables, 0 substitutions, 0 raw marks, 0 classmate snapshots, writes denied
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222207","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::int FROM public.exam_schedules WHERE institution_id = '11111111-1111-4111-8111-111111111101'),
  2,
  'Monitor XI-A reads published Sunrise exam_schedules'
);
SELECT is(
  (SELECT count(*)::int FROM public.timetables WHERE status = 'draft'),
  0,
  'Monitor XI-A sees 0 draft timetables'
);
SELECT is(
  (SELECT count(*)::int FROM public.timetable_substitutions),
  0,
  'Monitor XI-A sees 0 timetable_substitutions'
);
SELECT is(
  (SELECT count(*)::int FROM public.exam_marks_entries),
  0,
  'Monitor XI-A sees 0 raw exam_marks_entries'
);
SELECT is(
  (SELECT count(*)::int FROM public.result_snapshots WHERE student_profile_id = '88888888-8888-4888-8888-888888880101'),
  0,
  'Monitor XI-A sees 0 classmate Aarav result_snapshots'
);
SELECT throws_ok(
  $$INSERT INTO public.academic_calendar_events (
      institution_id, session_id, scope_type, event_kind, title, starts_on, ends_on, authored_by_person_id
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      '99999999-9999-4999-8999-999999990101',
      'institution',
      'holiday',
      'Unauthorized Holiday',
      '2026-12-20',
      '2026-12-20',
      '33333333-3333-4333-8333-333333333307'
    )$$,
  '42501',
  NULL,
  'Monitor XI-A cannot insert academic_calendar_events (42501)'
);

-- 9. Class Teacher XI-A (2222...2206) & HOD Sr Sec (2222...2205): moderate marks in scope, read snapshots, denied Valley rows
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222206","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT lives_ok(
  $$UPDATE public.exam_marks_entries
       SET status = 'moderated',
           moderated_by_person_id = '33333333-3333-4333-8333-333333333306',
           moderated_at = now()
     WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee9103'$$,
  'Class Teacher XI-A moderates Diya Nair submitted mark in XI-A'
);
SELECT is(
  (SELECT count(*)::int FROM public.result_snapshots WHERE student_profile_id = '88888888-8888-4888-8888-888888880101'),
  2,
  'Class Teacher XI-A reads Aarav result_snapshots (including revision 2 reissue)'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222205","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::int FROM public.exam_marks_entries WHERE institution_id = '11111111-1111-4111-8111-111111111101'),
  3,
  'HOD Sr Sec reads all 3 Sunrise Senior Secondary exam_marks_entries'
);
SELECT is(
  (SELECT count(*)::int FROM public.exam_marks_entries WHERE institution_id = '11111111-1111-4111-8111-111111111102'),
  0,
  'HOD Sr Sec sees 0 Valley exam_marks_entries'
);
SELECT lives_ok(
  $$UPDATE public.exam_marks_entries
       SET status = 'moderated',
           moderated_by_person_id = '33333333-3333-4333-8333-333333333305',
           moderated_at = now()
     WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee9102'$$,
  'HOD Sr Sec moderates Rohan Sen submitted Applied Math mark'
);

SELECT * FROM finish();

ROLLBACK;
