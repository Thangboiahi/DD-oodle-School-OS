-- P5-M01 Migration 19: Phase 5 ENABLE + FORCE ROW LEVEL SECURITY across all 11
-- newly created tables (56 total forced-RLS public tables), private app_auth
-- timetable, marks-moderation & result-snapshot helpers, and explicit
-- TO authenticated RLS policies.

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues FORCE ROW LEVEL SECURITY;

ALTER TABLE public.timetable_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_periods FORCE ROW LEVEL SECURITY;

ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables FORCE ROW LEVEL SECURITY;

ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots FORCE ROW LEVEL SECURITY;

ALTER TABLE public.timetable_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_substitutions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.academic_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_calendar_events FORCE ROW LEVEL SECURITY;

ALTER TABLE public.assessment_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_schemes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.exam_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_cycles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_schedules FORCE ROW LEVEL SECURITY;

ALTER TABLE public.exam_marks_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_marks_entries FORCE ROW LEVEL SECURITY;

ALTER TABLE public.result_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_snapshots FORCE ROW LEVEL SECURITY;

-- 1. app_auth.can_manage_timetable
CREATE OR REPLACE FUNCTION app_auth.can_manage_timetable(
  p_institution_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT app_auth.has_institution_permission(p_institution_id, 'academics.manage');
$$;

-- 2. app_auth.can_read_timetable (students/guardians/monitors read ONLY published; staff/leadership read drafts too)
CREATE OR REPLACE FUNCTION app_auth.can_read_timetable(
  p_institution_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_memberships im
    WHERE im.institution_id = p_institution_id
      AND im.person_id = app_auth.current_person_id()
      AND im.status = 'active'
  )
  AND (
    p_status = 'published'
    OR app_auth.is_active_staff_or_leadership(p_institution_id)
  );
$$;

-- Helper for substitution writes: academics.manage / institution.* OR HOD of slot's teaching group / section department
CREATE OR REPLACE FUNCTION app_auth.can_write_timetable_substitution(
  p_institution_id uuid,
  p_timetable_slot_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT app_auth.can_manage_timetable(p_institution_id)
  OR EXISTS (
    SELECT 1
    FROM public.timetable_slots ts
    LEFT JOIN public.teaching_groups tg
      ON tg.institution_id = ts.institution_id
     AND tg.id = ts.teaching_group_id
    LEFT JOIN public.subject_offerings so
      ON so.institution_id = tg.institution_id
     AND so.id = tg.subject_offering_id
    LEFT JOIN public.grade_levels tg_gl
      ON tg_gl.institution_id = so.institution_id
     AND tg_gl.id = so.grade_level_id
    LEFT JOIN public.sections sec
      ON sec.institution_id = ts.institution_id
     AND sec.id = ts.section_id
    LEFT JOIN public.grade_levels sec_gl
      ON sec_gl.institution_id = sec.institution_id
     AND sec_gl.id = sec.grade_level_id
    WHERE ts.institution_id = p_institution_id
      AND ts.id = p_timetable_slot_id
      AND (
        (tg_gl.department_id IS NOT NULL AND app_auth.is_department_hod(p_institution_id, tg_gl.department_id))
        OR (sec_gl.department_id IS NOT NULL AND app_auth.is_department_hod(p_institution_id, sec_gl.department_id))
      )
  );
$$;

-- 3. app_auth.can_manage_exams
CREATE OR REPLACE FUNCTION app_auth.can_manage_exams(
  p_institution_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT app_auth.has_institution_permission(p_institution_id, 'academics.manage');
$$;

-- 4. app_auth.can_enter_exam_marks (academics.manage/institution.* OR active subject_teacher on schedule's TG/offering)
CREATE OR REPLACE FUNCTION app_auth.can_enter_exam_marks(
  p_institution_id uuid,
  p_exam_schedule_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_memberships im
    WHERE im.institution_id = p_institution_id
      AND im.person_id = app_auth.current_person_id()
      AND im.status = 'active'
  )
  AND (
    app_auth.can_manage_exams(p_institution_id)
    OR EXISTS (
      SELECT 1
      FROM public.exam_schedules es
      WHERE es.institution_id = p_institution_id
        AND es.id = p_exam_schedule_id
        AND (
          (
            es.teaching_group_id IS NOT NULL
            AND app_auth.is_teaching_group_teacher(p_institution_id, es.teaching_group_id)
          )
          OR (
            es.teaching_group_id IS NULL
            AND EXISTS (
              SELECT 1
              FROM public.teaching_groups tg
              WHERE tg.institution_id = es.institution_id
                AND tg.subject_offering_id = es.subject_offering_id
                AND tg.is_active
                AND app_auth.is_teaching_group_teacher(p_institution_id, tg.id)
            )
          )
        )
    )
  );
$$;

-- 5. app_auth.can_moderate_exam_marks (academics.manage/institution.*, active HOD of offering dept, or active Class Teacher of student's section)
CREATE OR REPLACE FUNCTION app_auth.can_moderate_exam_marks(
  p_institution_id uuid,
  p_exam_schedule_id uuid,
  p_student_profile_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_memberships im
    WHERE im.institution_id = p_institution_id
      AND im.person_id = app_auth.current_person_id()
      AND im.status = 'active'
  )
  AND (
    app_auth.can_manage_exams(p_institution_id)
    OR EXISTS (
      SELECT 1
      FROM public.exam_schedules es
      JOIN public.exam_cycles ec
        ON ec.institution_id = es.institution_id
       AND ec.id = es.exam_cycle_id
      JOIN public.subject_offerings so
        ON so.institution_id = es.institution_id
       AND so.id = es.subject_offering_id
      JOIN public.grade_levels gl
        ON gl.institution_id = so.institution_id
       AND gl.id = so.grade_level_id
      WHERE es.institution_id = p_institution_id
        AND es.id = p_exam_schedule_id
        AND (
          app_auth.is_department_hod(p_institution_id, gl.department_id)
          OR EXISTS (
            SELECT 1
            FROM public.student_session_enrolments sse
            JOIN public.academic_assignments aa
              ON aa.institution_id = sse.institution_id
             AND aa.session_id = sse.session_id
             AND aa.section_id = sse.section_id
             AND aa.person_id = app_auth.current_person_id()
             AND aa.assignment_type = 'class_teacher'
             AND aa.status IN ('active', 'delegated')
             AND aa.starts_on <= CURRENT_DATE
             AND (aa.ends_on IS NULL OR aa.ends_on >= CURRENT_DATE)
            WHERE sse.institution_id = p_institution_id
              AND sse.session_id = ec.session_id
              AND sse.student_profile_id = p_student_profile_id
              AND sse.status = 'active'
          )
        )
    )
  );
$$;

-- 6. app_auth.can_read_result_snapshot (leadership, HOD/CT of student's section, student self, or active guardian; NEVER classmate monitors)
CREATE OR REPLACE FUNCTION app_auth.can_read_result_snapshot(
  p_institution_id uuid,
  p_student_profile_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_memberships im
    WHERE im.institution_id = p_institution_id
      AND im.person_id = app_auth.current_person_id()
      AND im.status = 'active'
  )
  AND (
    app_auth.can_manage_exams(p_institution_id)
    OR EXISTS (
      SELECT 1
      FROM public.student_profiles sp
      WHERE sp.institution_id = p_institution_id
        AND sp.id = p_student_profile_id
        AND sp.person_id = app_auth.current_person_id()
    )
    OR EXISTS (
      SELECT 1
      FROM public.student_guardians sg
      WHERE sg.institution_id = p_institution_id
        AND sg.student_profile_id = p_student_profile_id
        AND sg.guardian_person_id = app_auth.current_person_id()
        AND sg.status = 'active'
    )
    OR EXISTS (
      SELECT 1
      FROM public.student_session_enrolments sse
      WHERE sse.institution_id = p_institution_id
        AND sse.student_profile_id = p_student_profile_id
        AND sse.status = 'active'
        AND app_auth.is_section_class_teacher_or_hod(p_institution_id, sse.section_id)
    )
  );
$$;

REVOKE ALL ON FUNCTION app_auth.can_manage_timetable(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_read_timetable(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_write_timetable_substitution(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_manage_exams(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_enter_exam_marks(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_moderate_exam_marks(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_read_result_snapshot(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION app_auth.can_manage_timetable(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_read_timetable(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_write_timetable_substitution(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_manage_exams(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_enter_exam_marks(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_moderate_exam_marks(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_read_result_snapshot(uuid, uuid) TO authenticated;

-- =====================================================================
-- RLS Policies (Explicit TO authenticated)
-- =====================================================================

-- 1. venues
CREATE POLICY venues_select
  ON public.venues
  FOR SELECT
  TO authenticated
  USING (venues.institution_id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY venues_insert
  ON public.venues
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.can_manage_timetable(venues.institution_id)));

CREATE POLICY venues_update
  ON public.venues
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.can_manage_timetable(venues.institution_id)))
  WITH CHECK ((SELECT app_auth.can_manage_timetable(venues.institution_id)));

CREATE POLICY venues_delete
  ON public.venues
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.can_manage_timetable(venues.institution_id)));

-- 2. timetable_periods
CREATE POLICY timetable_periods_select
  ON public.timetable_periods
  FOR SELECT
  TO authenticated
  USING (timetable_periods.institution_id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY timetable_periods_insert
  ON public.timetable_periods
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.can_manage_timetable(timetable_periods.institution_id)));

CREATE POLICY timetable_periods_update
  ON public.timetable_periods
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.can_manage_timetable(timetable_periods.institution_id)))
  WITH CHECK ((SELECT app_auth.can_manage_timetable(timetable_periods.institution_id)));

CREATE POLICY timetable_periods_delete
  ON public.timetable_periods
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.can_manage_timetable(timetable_periods.institution_id)));

-- 3. timetables
CREATE POLICY timetables_select
  ON public.timetables
  FOR SELECT
  TO authenticated
  USING (app_auth.can_read_timetable(timetables.institution_id, timetables.status));

CREATE POLICY timetables_insert
  ON public.timetables
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT app_auth.can_manage_timetable(timetables.institution_id))
    AND timetables.authored_by_person_id = (SELECT app_auth.current_person_id())
  );

CREATE POLICY timetables_update
  ON public.timetables
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.can_manage_timetable(timetables.institution_id)))
  WITH CHECK ((SELECT app_auth.can_manage_timetable(timetables.institution_id)));

CREATE POLICY timetables_delete
  ON public.timetables
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.can_manage_timetable(timetables.institution_id)));

-- 4. timetable_slots
CREATE POLICY timetable_slots_select
  ON public.timetable_slots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.timetables tt
      WHERE tt.institution_id = timetable_slots.institution_id
        AND tt.id = timetable_slots.timetable_id
        AND app_auth.can_read_timetable(tt.institution_id, tt.status)
    )
  );

CREATE POLICY timetable_slots_insert
  ON public.timetable_slots
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.can_manage_timetable(timetable_slots.institution_id)));

CREATE POLICY timetable_slots_update
  ON public.timetable_slots
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.can_manage_timetable(timetable_slots.institution_id)))
  WITH CHECK ((SELECT app_auth.can_manage_timetable(timetable_slots.institution_id)));

CREATE POLICY timetable_slots_delete
  ON public.timetable_slots
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.can_manage_timetable(timetable_slots.institution_id)));

-- 5. timetable_substitutions (strictly staff & leadership only; 0 rows for students, guardians, monitors)
CREATE POLICY timetable_substitutions_select
  ON public.timetable_substitutions
  FOR SELECT
  TO authenticated
  USING ((SELECT app_auth.is_active_staff_or_leadership(timetable_substitutions.institution_id)));

CREATE POLICY timetable_substitutions_insert
  ON public.timetable_substitutions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    app_auth.can_write_timetable_substitution(
      timetable_substitutions.institution_id,
      timetable_substitutions.timetable_slot_id
    )
    AND timetable_substitutions.assigned_by_person_id = (SELECT app_auth.current_person_id())
  );

CREATE POLICY timetable_substitutions_update
  ON public.timetable_substitutions
  FOR UPDATE
  TO authenticated
  USING (
    app_auth.can_write_timetable_substitution(
      timetable_substitutions.institution_id,
      timetable_substitutions.timetable_slot_id
    )
  )
  WITH CHECK (
    app_auth.can_write_timetable_substitution(
      timetable_substitutions.institution_id,
      timetable_substitutions.timetable_slot_id
    )
  );

CREATE POLICY timetable_substitutions_delete
  ON public.timetable_substitutions
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.can_manage_timetable(timetable_substitutions.institution_id)));

-- 6. academic_calendar_events
CREATE POLICY academic_calendar_events_select
  ON public.academic_calendar_events
  FOR SELECT
  TO authenticated
  USING (
    academic_calendar_events.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      academic_calendar_events.status = 'published'
      OR (SELECT app_auth.is_active_staff_or_leadership(academic_calendar_events.institution_id))
    )
  );

CREATE POLICY academic_calendar_events_insert
  ON public.academic_calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    academic_calendar_events.authored_by_person_id = (SELECT app_auth.current_person_id())
    AND (
      (SELECT app_auth.can_manage_timetable(academic_calendar_events.institution_id))
      OR (
        academic_calendar_events.scope_type = 'department'
        AND academic_calendar_events.department_id IS NOT NULL
        AND app_auth.is_department_hod(academic_calendar_events.institution_id, academic_calendar_events.department_id)
      )
      OR (
        academic_calendar_events.scope_type = 'section'
        AND academic_calendar_events.section_id IS NOT NULL
        AND app_auth.is_section_class_teacher_or_hod(academic_calendar_events.institution_id, academic_calendar_events.section_id)
      )
    )
  );

CREATE POLICY academic_calendar_events_update
  ON public.academic_calendar_events
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT app_auth.can_manage_timetable(academic_calendar_events.institution_id))
    OR (
      academic_calendar_events.scope_type = 'department'
      AND academic_calendar_events.department_id IS NOT NULL
      AND app_auth.is_department_hod(academic_calendar_events.institution_id, academic_calendar_events.department_id)
    )
    OR (
      academic_calendar_events.scope_type = 'section'
      AND academic_calendar_events.section_id IS NOT NULL
      AND app_auth.is_section_class_teacher_or_hod(academic_calendar_events.institution_id, academic_calendar_events.section_id)
    )
  )
  WITH CHECK (
    (SELECT app_auth.can_manage_timetable(academic_calendar_events.institution_id))
    OR (
      academic_calendar_events.scope_type = 'department'
      AND academic_calendar_events.department_id IS NOT NULL
      AND app_auth.is_department_hod(academic_calendar_events.institution_id, academic_calendar_events.department_id)
    )
    OR (
      academic_calendar_events.scope_type = 'section'
      AND academic_calendar_events.section_id IS NOT NULL
      AND app_auth.is_section_class_teacher_or_hod(academic_calendar_events.institution_id, academic_calendar_events.section_id)
    )
  );

CREATE POLICY academic_calendar_events_delete
  ON public.academic_calendar_events
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.can_manage_timetable(academic_calendar_events.institution_id)));

-- 7. assessment_schemes
CREATE POLICY assessment_schemes_select
  ON public.assessment_schemes
  FOR SELECT
  TO authenticated
  USING (assessment_schemes.institution_id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY assessment_schemes_insert
  ON public.assessment_schemes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT app_auth.can_manage_exams(assessment_schemes.institution_id))
    AND assessment_schemes.created_by_person_id = (SELECT app_auth.current_person_id())
  );

CREATE POLICY assessment_schemes_update
  ON public.assessment_schemes
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.can_manage_exams(assessment_schemes.institution_id)))
  WITH CHECK ((SELECT app_auth.can_manage_exams(assessment_schemes.institution_id)));

CREATE POLICY assessment_schemes_delete
  ON public.assessment_schemes
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.can_manage_exams(assessment_schemes.institution_id)));

-- 8. exam_cycles
CREATE POLICY exam_cycles_select
  ON public.exam_cycles
  FOR SELECT
  TO authenticated
  USING (
    exam_cycles.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      exam_cycles.status IN ('scheduled', 'marks_open', 'moderation', 'approved', 'published')
      OR (SELECT app_auth.is_active_staff_or_leadership(exam_cycles.institution_id))
    )
  );

CREATE POLICY exam_cycles_insert
  ON public.exam_cycles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT app_auth.can_manage_exams(exam_cycles.institution_id))
    AND exam_cycles.authored_by_person_id = (SELECT app_auth.current_person_id())
  );

CREATE POLICY exam_cycles_update
  ON public.exam_cycles
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.can_manage_exams(exam_cycles.institution_id)))
  WITH CHECK ((SELECT app_auth.can_manage_exams(exam_cycles.institution_id)));

CREATE POLICY exam_cycles_delete
  ON public.exam_cycles
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.can_manage_exams(exam_cycles.institution_id)));

-- 9. exam_schedules
CREATE POLICY exam_schedules_select
  ON public.exam_schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.exam_cycles ec
      WHERE ec.institution_id = exam_schedules.institution_id
        AND ec.id = exam_schedules.exam_cycle_id
        AND ec.institution_id IN (SELECT app_auth.active_institution_ids())
        AND (
          ec.status IN ('scheduled', 'marks_open', 'moderation', 'approved', 'published')
          OR (SELECT app_auth.is_active_staff_or_leadership(ec.institution_id))
        )
    )
  );

CREATE POLICY exam_schedules_insert
  ON public.exam_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.can_manage_exams(exam_schedules.institution_id)));

CREATE POLICY exam_schedules_update
  ON public.exam_schedules
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.can_manage_exams(exam_schedules.institution_id)))
  WITH CHECK ((SELECT app_auth.can_manage_exams(exam_schedules.institution_id)));

CREATE POLICY exam_schedules_delete
  ON public.exam_schedules
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.can_manage_exams(exam_schedules.institution_id)));

-- 10. exam_marks_entries (ZERO access for students, guardians, monitors; strict staged authority)
CREATE POLICY exam_marks_entries_select
  ON public.exam_marks_entries
  FOR SELECT
  TO authenticated
  USING (
    (SELECT app_auth.can_manage_exams(exam_marks_entries.institution_id))
    OR app_auth.can_enter_exam_marks(exam_marks_entries.institution_id, exam_marks_entries.exam_schedule_id)
    OR app_auth.can_moderate_exam_marks(
      exam_marks_entries.institution_id,
      exam_marks_entries.exam_schedule_id,
      exam_marks_entries.student_profile_id
    )
  );

CREATE POLICY exam_marks_entries_insert
  ON public.exam_marks_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT app_auth.can_manage_exams(exam_marks_entries.institution_id))
    OR (
      app_auth.can_enter_exam_marks(exam_marks_entries.institution_id, exam_marks_entries.exam_schedule_id)
      AND exam_marks_entries.status IN ('draft', 'submitted')
      AND exam_marks_entries.moderated_by_person_id IS NULL
      AND exam_marks_entries.moderated_at IS NULL
      AND exam_marks_entries.approved_by_person_id IS NULL
      AND exam_marks_entries.approved_at IS NULL
    )
  );

CREATE POLICY exam_marks_entries_update_teacher
  ON public.exam_marks_entries
  FOR UPDATE
  TO authenticated
  USING (
    app_auth.can_enter_exam_marks(exam_marks_entries.institution_id, exam_marks_entries.exam_schedule_id)
    AND exam_marks_entries.status IN ('draft', 'submitted')
    AND exam_marks_entries.approved_by_person_id IS NULL
    AND exam_marks_entries.approved_at IS NULL
  )
  WITH CHECK (
    app_auth.can_enter_exam_marks(exam_marks_entries.institution_id, exam_marks_entries.exam_schedule_id)
    AND exam_marks_entries.status IN ('draft', 'submitted')
    AND exam_marks_entries.approved_by_person_id IS NULL
    AND exam_marks_entries.approved_at IS NULL
  );

CREATE POLICY exam_marks_entries_update_moderator
  ON public.exam_marks_entries
  FOR UPDATE
  TO authenticated
  USING (
    app_auth.can_moderate_exam_marks(
      exam_marks_entries.institution_id,
      exam_marks_entries.exam_schedule_id,
      exam_marks_entries.student_profile_id
    )
    AND exam_marks_entries.status IN ('submitted', 'moderated')
    AND exam_marks_entries.approved_by_person_id IS NULL
    AND exam_marks_entries.approved_at IS NULL
  )
  WITH CHECK (
    app_auth.can_moderate_exam_marks(
      exam_marks_entries.institution_id,
      exam_marks_entries.exam_schedule_id,
      exam_marks_entries.student_profile_id
    )
    AND exam_marks_entries.status IN ('submitted', 'moderated')
    AND exam_marks_entries.approved_by_person_id IS NULL
    AND exam_marks_entries.approved_at IS NULL
  );

CREATE POLICY exam_marks_entries_update_admin
  ON public.exam_marks_entries
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.can_manage_exams(exam_marks_entries.institution_id)))
  WITH CHECK ((SELECT app_auth.can_manage_exams(exam_marks_entries.institution_id)));

CREATE POLICY exam_marks_entries_delete
  ON public.exam_marks_entries
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.can_manage_exams(exam_marks_entries.institution_id)));

-- 11. result_snapshots (IMMUTABLE APPEND-ONLY: SELECT scoped by relationship, INSERT admin-only, ZERO UPDATE/DELETE policies)
CREATE POLICY result_snapshots_select
  ON public.result_snapshots
  FOR SELECT
  TO authenticated
  USING (
    app_auth.can_read_result_snapshot(result_snapshots.institution_id, result_snapshots.student_profile_id)
  );

CREATE POLICY result_snapshots_insert
  ON public.result_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT app_auth.can_manage_exams(result_snapshots.institution_id))
    AND result_snapshots.published_by_person_id = (SELECT app_auth.current_person_id())
  );
