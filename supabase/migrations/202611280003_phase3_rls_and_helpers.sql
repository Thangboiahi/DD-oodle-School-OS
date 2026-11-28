-- P3-M01 Migration 12: Phase 3 ENABLE + FORCE ROW LEVEL SECURITY, private
-- app_auth helpers, attendance/leave/notice policies, and category-partitioned
-- handbook visibility RLS.

ALTER TABLE public.attendance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_policies FORCE ROW LEVEL SECURITY;

ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_events FORCE ROW LEVEL SECURITY;

ALTER TABLE public.student_daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_daily_attendance FORCE ROW LEVEL SECURITY;

ALTER TABLE public.student_period_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_period_attendance FORCE ROW LEVEL SECURITY;

ALTER TABLE public.staff_daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_daily_attendance FORCE ROW LEVEL SECURITY;

ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_applications FORCE ROW LEVEL SECURITY;

ALTER TABLE public.parent_attendance_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_attendance_notices FORCE ROW LEVEL SECURITY;

ALTER TABLE public.handbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handbook_entries FORCE ROW LEVEL SECURITY;

-- Private app_auth helpers (STABLE SECURITY DEFINER SET search_path = '')
CREATE OR REPLACE FUNCTION app_auth.is_section_class_teacher_or_hod(
  p_institution_id uuid,
  p_section_id uuid
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
  AND EXISTS (
    SELECT 1
    FROM public.sections s
    JOIN public.grade_levels gl
      ON gl.institution_id = s.institution_id
     AND gl.id = s.grade_level_id
    JOIN public.academic_assignments aa
      ON aa.institution_id = s.institution_id
     AND aa.session_id = s.session_id
     AND aa.person_id = app_auth.current_person_id()
     AND aa.status IN ('active', 'delegated')
     AND aa.starts_on <= CURRENT_DATE
     AND (aa.ends_on IS NULL OR aa.ends_on >= CURRENT_DATE)
    WHERE s.institution_id = p_institution_id
      AND s.id = p_section_id
      AND (
        (aa.assignment_type = 'class_teacher' AND aa.section_id = s.id)
        OR (aa.assignment_type = 'hod' AND aa.department_id = gl.department_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION app_auth.is_section_monitor(
  p_institution_id uuid,
  p_section_id uuid
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
  AND EXISTS (
    SELECT 1
    FROM public.academic_assignments aa
    WHERE aa.institution_id = p_institution_id
      AND aa.section_id = p_section_id
      AND aa.person_id = app_auth.current_person_id()
      AND aa.assignment_type IN ('monitor', 'monitress')
      AND aa.status IN ('active', 'delegated')
      AND aa.starts_on <= CURRENT_DATE
      AND (aa.ends_on IS NULL OR aa.ends_on >= CURRENT_DATE)
  );
$$;

CREATE OR REPLACE FUNCTION app_auth.is_teaching_group_teacher(
  p_institution_id uuid,
  p_teaching_group_id uuid
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
  AND EXISTS (
    SELECT 1
    FROM public.academic_assignments aa
    WHERE aa.institution_id = p_institution_id
      AND aa.teaching_group_id = p_teaching_group_id
      AND aa.person_id = app_auth.current_person_id()
      AND aa.assignment_type = 'subject_teacher'
      AND aa.status IN ('active', 'delegated')
      AND aa.starts_on <= CURRENT_DATE
      AND (aa.ends_on IS NULL OR aa.ends_on >= CURRENT_DATE)
  );
$$;

CREATE OR REPLACE FUNCTION app_auth.can_read_handbook_entry(
  p_institution_id uuid,
  p_student_profile_id uuid,
  p_category text,
  p_visibility_scope text,
  p_authored_by_person_id uuid,
  p_teaching_group_id uuid
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
    (
      p_visibility_scope = 'leadership_only'
      AND app_auth.has_institution_permission(p_institution_id, 'handbook.sensitive.read')
    )
    OR (
      p_visibility_scope = 'class_teacher_and_leadership'
      AND (
        app_auth.has_institution_permission(p_institution_id, 'handbook.sensitive.read')
        OR app_auth.is_hod_or_class_teacher_of_student(p_institution_id, p_student_profile_id)
      )
    )
    OR (
      p_visibility_scope = 'staff_academic'
      AND (
        app_auth.has_institution_permission(p_institution_id, 'handbook.sensitive.read')
        OR app_auth.is_hod_or_class_teacher_of_student(p_institution_id, p_student_profile_id)
        OR p_authored_by_person_id = app_auth.current_person_id()
        OR (
          p_teaching_group_id IS NOT NULL
          AND app_auth.is_teaching_group_teacher(p_institution_id, p_teaching_group_id)
        )
      )
    )
    OR (
      p_visibility_scope = 'student_and_guardian'
      AND (
        app_auth.has_institution_permission(p_institution_id, 'handbook.sensitive.read')
        OR app_auth.is_hod_or_class_teacher_of_student(p_institution_id, p_student_profile_id)
        OR (
          p_category = 'academic_observation'
          AND (
            p_authored_by_person_id = app_auth.current_person_id()
            OR (
              p_teaching_group_id IS NOT NULL
              AND app_auth.is_teaching_group_teacher(p_institution_id, p_teaching_group_id)
            )
          )
        )
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
      )
    )
  );
$$;

REVOKE ALL ON FUNCTION app_auth.is_section_class_teacher_or_hod(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.is_section_monitor(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.is_teaching_group_teacher(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_read_handbook_entry(uuid, uuid, text, text, uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION app_auth.is_section_class_teacher_or_hod(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.is_section_monitor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.is_teaching_group_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_read_handbook_entry(uuid, uuid, text, text, uuid, uuid) TO authenticated;

-- 1. attendance_policies
CREATE POLICY attendance_policies_select
  ON public.attendance_policies
  FOR SELECT
  TO authenticated
  USING (attendance_policies.institution_id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY attendance_policies_insert
  ON public.attendance_policies
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(attendance_policies.institution_id, 'attendance.manage')));

CREATE POLICY attendance_policies_update
  ON public.attendance_policies
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(attendance_policies.institution_id, 'attendance.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(attendance_policies.institution_id, 'attendance.manage')));

CREATE POLICY attendance_policies_delete
  ON public.attendance_policies
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(attendance_policies.institution_id, 'attendance.manage')));

-- 2. attendance_events (append-only: SELECT + INSERT only; trigger blocks UPDATE/DELETE)
CREATE POLICY attendance_events_select
  ON public.attendance_events
  FOR SELECT
  TO authenticated
  USING (
    attendance_events.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(attendance_events.institution_id, 'attendance.read'))
      OR (SELECT app_auth.has_institution_permission(attendance_events.institution_id, 'attendance.manage'))
      OR (
        attendance_events.section_id IS NOT NULL
        AND app_auth.is_section_class_teacher_or_hod(attendance_events.institution_id, attendance_events.section_id)
      )
      OR (
        attendance_events.teaching_group_id IS NOT NULL
        AND app_auth.is_teaching_group_teacher(attendance_events.institution_id, attendance_events.teaching_group_id)
      )
      OR (
        attendance_events.staff_profile_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.staff_profiles st
          WHERE st.institution_id = attendance_events.institution_id
            AND st.id = attendance_events.staff_profile_id
            AND st.person_id = (SELECT app_auth.current_person_id())
        )
      )
    )
  );

CREATE POLICY attendance_events_insert
  ON public.attendance_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    attendance_events.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(attendance_events.institution_id, 'attendance.manage'))
      OR (
        attendance_events.section_id IS NOT NULL
        AND app_auth.is_section_class_teacher_or_hod(attendance_events.institution_id, attendance_events.section_id)
      )
      OR (
        attendance_events.teaching_group_id IS NOT NULL
        AND app_auth.is_teaching_group_teacher(attendance_events.institution_id, attendance_events.teaching_group_id)
      )
    )
  );

-- 3. student_daily_attendance (monitor read strictly restricted to verified/signed_off)
CREATE POLICY student_daily_attendance_select
  ON public.student_daily_attendance
  FOR SELECT
  TO authenticated
  USING (
    student_daily_attendance.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(student_daily_attendance.institution_id, 'attendance.read'))
      OR (SELECT app_auth.has_institution_permission(student_daily_attendance.institution_id, 'attendance.manage'))
      OR app_auth.is_section_class_teacher_or_hod(student_daily_attendance.institution_id, student_daily_attendance.section_id)
      OR EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.institution_id = student_daily_attendance.institution_id
          AND sp.id = student_daily_attendance.student_profile_id
          AND sp.person_id = (SELECT app_auth.current_person_id())
      )
      OR EXISTS (
        SELECT 1
        FROM public.student_guardians sg
        WHERE sg.institution_id = student_daily_attendance.institution_id
          AND sg.student_profile_id = student_daily_attendance.student_profile_id
          AND sg.guardian_person_id = (SELECT app_auth.current_person_id())
          AND sg.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.teaching_group_memberships tgm
        WHERE tgm.institution_id = student_daily_attendance.institution_id
          AND tgm.student_enrolment_id = student_daily_attendance.student_enrolment_id
          AND tgm.status = 'active'
          AND app_auth.is_teaching_group_teacher(student_daily_attendance.institution_id, tgm.teaching_group_id)
      )
      OR (
        app_auth.is_section_monitor(student_daily_attendance.institution_id, student_daily_attendance.section_id)
        AND student_daily_attendance.verification_status IN ('class_teacher_verified', 'signed_off')
      )
    )
  );

CREATE POLICY student_daily_attendance_insert
  ON public.student_daily_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_daily_attendance.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(student_daily_attendance.institution_id, 'attendance.manage'))
      OR app_auth.is_section_class_teacher_or_hod(student_daily_attendance.institution_id, student_daily_attendance.section_id)
    )
  );

CREATE POLICY student_daily_attendance_update
  ON public.student_daily_attendance
  FOR UPDATE
  TO authenticated
  USING (
    student_daily_attendance.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(student_daily_attendance.institution_id, 'attendance.manage'))
      OR app_auth.is_section_class_teacher_or_hod(student_daily_attendance.institution_id, student_daily_attendance.section_id)
    )
  )
  WITH CHECK (
    student_daily_attendance.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(student_daily_attendance.institution_id, 'attendance.manage'))
      OR app_auth.is_section_class_teacher_or_hod(student_daily_attendance.institution_id, student_daily_attendance.section_id)
    )
  );

-- 4. student_period_attendance
CREATE POLICY student_period_attendance_select
  ON public.student_period_attendance
  FOR SELECT
  TO authenticated
  USING (
    student_period_attendance.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(student_period_attendance.institution_id, 'attendance.manage'))
      OR app_auth.is_hod_or_class_teacher_of_student(student_period_attendance.institution_id, student_period_attendance.student_profile_id)
      OR app_auth.is_teaching_group_teacher(student_period_attendance.institution_id, student_period_attendance.teaching_group_id)
      OR EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.institution_id = student_period_attendance.institution_id
          AND sp.id = student_period_attendance.student_profile_id
          AND sp.person_id = (SELECT app_auth.current_person_id())
      )
      OR EXISTS (
        SELECT 1
        FROM public.student_guardians sg
        WHERE sg.institution_id = student_period_attendance.institution_id
          AND sg.student_profile_id = student_period_attendance.student_profile_id
          AND sg.guardian_person_id = (SELECT app_auth.current_person_id())
          AND sg.status = 'active'
      )
    )
  );

CREATE POLICY student_period_attendance_insert
  ON public.student_period_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_period_attendance.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(student_period_attendance.institution_id, 'attendance.manage'))
      OR app_auth.is_hod_or_class_teacher_of_student(student_period_attendance.institution_id, student_period_attendance.student_profile_id)
      OR app_auth.is_teaching_group_teacher(student_period_attendance.institution_id, student_period_attendance.teaching_group_id)
    )
  );

CREATE POLICY student_period_attendance_update
  ON public.student_period_attendance
  FOR UPDATE
  TO authenticated
  USING (
    student_period_attendance.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(student_period_attendance.institution_id, 'attendance.manage'))
      OR app_auth.is_hod_or_class_teacher_of_student(student_period_attendance.institution_id, student_period_attendance.student_profile_id)
      OR app_auth.is_teaching_group_teacher(student_period_attendance.institution_id, student_period_attendance.teaching_group_id)
    )
  )
  WITH CHECK (
    student_period_attendance.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(student_period_attendance.institution_id, 'attendance.manage'))
      OR app_auth.is_hod_or_class_teacher_of_student(student_period_attendance.institution_id, student_period_attendance.student_profile_id)
      OR app_auth.is_teaching_group_teacher(student_period_attendance.institution_id, student_period_attendance.teaching_group_id)
    )
  );

-- 5. staff_daily_attendance
CREATE POLICY staff_daily_attendance_select
  ON public.staff_daily_attendance
  FOR SELECT
  TO authenticated
  USING (
    staff_daily_attendance.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(staff_daily_attendance.institution_id, 'attendance.manage'))
      OR (SELECT app_auth.has_institution_permission(staff_daily_attendance.institution_id, 'people.read'))
      OR EXISTS (
        SELECT 1
        FROM public.staff_profiles st
        WHERE st.institution_id = staff_daily_attendance.institution_id
          AND st.id = staff_daily_attendance.staff_profile_id
          AND st.person_id = (SELECT app_auth.current_person_id())
      )
    )
  );

CREATE POLICY staff_daily_attendance_insert
  ON public.staff_daily_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    staff_daily_attendance.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(staff_daily_attendance.institution_id, 'attendance.manage'))
      OR (SELECT app_auth.has_institution_permission(staff_daily_attendance.institution_id, 'people.manage'))
    )
  );

CREATE POLICY staff_daily_attendance_update
  ON public.staff_daily_attendance
  FOR UPDATE
  TO authenticated
  USING (
    staff_daily_attendance.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(staff_daily_attendance.institution_id, 'attendance.manage'))
      OR (SELECT app_auth.has_institution_permission(staff_daily_attendance.institution_id, 'people.manage'))
    )
  )
  WITH CHECK (
    staff_daily_attendance.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(staff_daily_attendance.institution_id, 'attendance.manage'))
      OR (SELECT app_auth.has_institution_permission(staff_daily_attendance.institution_id, 'people.manage'))
    )
  );

-- 6. leave_applications (monitors see 0 classmates' leave rows)
CREATE POLICY leave_applications_select
  ON public.leave_applications
  FOR SELECT
  TO authenticated
  USING (
    leave_applications.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(leave_applications.institution_id, 'attendance.manage'))
      OR (SELECT app_auth.has_institution_permission(leave_applications.institution_id, 'people.read'))
      OR (
        leave_applications.staff_profile_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.staff_profiles st
          WHERE st.institution_id = leave_applications.institution_id
            AND st.id = leave_applications.staff_profile_id
            AND st.person_id = (SELECT app_auth.current_person_id())
        )
      )
      OR (
        leave_applications.student_profile_id IS NOT NULL
        AND (
          app_auth.is_hod_or_class_teacher_of_student(leave_applications.institution_id, leave_applications.student_profile_id)
          OR EXISTS (
            SELECT 1
            FROM public.student_profiles sp
            WHERE sp.institution_id = leave_applications.institution_id
              AND sp.id = leave_applications.student_profile_id
              AND sp.person_id = (SELECT app_auth.current_person_id())
          )
          OR EXISTS (
            SELECT 1
            FROM public.student_guardians sg
            WHERE sg.institution_id = leave_applications.institution_id
              AND sg.student_profile_id = leave_applications.student_profile_id
              AND sg.guardian_person_id = (SELECT app_auth.current_person_id())
              AND sg.status = 'active'
          )
        )
      )
    )
  );

CREATE POLICY leave_applications_insert
  ON public.leave_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    leave_applications.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(leave_applications.institution_id, 'attendance.manage'))
      OR (SELECT app_auth.has_institution_permission(leave_applications.institution_id, 'people.manage'))
      OR (
        leave_applications.applicant_kind = 'staff'
        AND leave_applications.submitted_by_person_id = (SELECT app_auth.current_person_id())
        AND EXISTS (
          SELECT 1
          FROM public.staff_profiles st
          WHERE st.institution_id = leave_applications.institution_id
            AND st.id = leave_applications.staff_profile_id
            AND st.person_id = (SELECT app_auth.current_person_id())
        )
      )
      OR (
        leave_applications.applicant_kind = 'student'
        AND leave_applications.submitted_by_person_id = (SELECT app_auth.current_person_id())
        AND EXISTS (
          SELECT 1
          FROM public.student_guardians sg
          WHERE sg.institution_id = leave_applications.institution_id
            AND sg.student_profile_id = leave_applications.student_profile_id
            AND sg.guardian_person_id = (SELECT app_auth.current_person_id())
            AND sg.status = 'active'
        )
      )
    )
  );

CREATE POLICY leave_applications_update
  ON public.leave_applications
  FOR UPDATE
  TO authenticated
  USING (
    leave_applications.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(leave_applications.institution_id, 'attendance.manage'))
      OR (SELECT app_auth.has_institution_permission(leave_applications.institution_id, 'people.manage'))
      OR (
        leave_applications.student_profile_id IS NOT NULL
        AND app_auth.is_hod_or_class_teacher_of_student(leave_applications.institution_id, leave_applications.student_profile_id)
      )
      OR (
        leave_applications.submitted_by_person_id = (SELECT app_auth.current_person_id())
        AND leave_applications.status = 'submitted'
      )
    )
  )
  WITH CHECK (
    leave_applications.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(leave_applications.institution_id, 'attendance.manage'))
      OR (SELECT app_auth.has_institution_permission(leave_applications.institution_id, 'people.manage'))
      OR (
        leave_applications.student_profile_id IS NOT NULL
        AND app_auth.is_hod_or_class_teacher_of_student(leave_applications.institution_id, leave_applications.student_profile_id)
      )
      OR (
        leave_applications.submitted_by_person_id = (SELECT app_auth.current_person_id())
        AND leave_applications.status IN ('submitted', 'cancelled')
      )
    )
  );

-- 7. parent_attendance_notices
CREATE POLICY parent_attendance_notices_select
  ON public.parent_attendance_notices
  FOR SELECT
  TO authenticated
  USING (
    parent_attendance_notices.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(parent_attendance_notices.institution_id, 'attendance.manage'))
      OR (SELECT app_auth.has_institution_permission(parent_attendance_notices.institution_id, 'people.read'))
      OR parent_attendance_notices.guardian_person_id = (SELECT app_auth.current_person_id())
      OR app_auth.is_hod_or_class_teacher_of_student(parent_attendance_notices.institution_id, parent_attendance_notices.student_profile_id)
      OR EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.institution_id = parent_attendance_notices.institution_id
          AND sp.id = parent_attendance_notices.student_profile_id
          AND sp.person_id = (SELECT app_auth.current_person_id())
      )
    )
  );

CREATE POLICY parent_attendance_notices_insert
  ON public.parent_attendance_notices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    parent_attendance_notices.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(parent_attendance_notices.institution_id, 'attendance.manage'))
      OR (
        parent_attendance_notices.guardian_person_id = (SELECT app_auth.current_person_id())
        AND EXISTS (
          SELECT 1
          FROM public.student_guardians sg
          WHERE sg.institution_id = parent_attendance_notices.institution_id
            AND sg.student_profile_id = parent_attendance_notices.student_profile_id
            AND sg.guardian_person_id = (SELECT app_auth.current_person_id())
            AND sg.status = 'active'
        )
      )
    )
  );

CREATE POLICY parent_attendance_notices_update
  ON public.parent_attendance_notices
  FOR UPDATE
  TO authenticated
  USING (
    parent_attendance_notices.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(parent_attendance_notices.institution_id, 'attendance.manage'))
      OR app_auth.is_hod_or_class_teacher_of_student(parent_attendance_notices.institution_id, parent_attendance_notices.student_profile_id)
    )
  )
  WITH CHECK (
    parent_attendance_notices.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(parent_attendance_notices.institution_id, 'attendance.manage'))
      OR app_auth.is_hod_or_class_teacher_of_student(parent_attendance_notices.institution_id, parent_attendance_notices.student_profile_id)
    )
  );

-- 8. handbook_entries
CREATE POLICY handbook_entries_select
  ON public.handbook_entries
  FOR SELECT
  TO authenticated
  USING (
    app_auth.can_read_handbook_entry(
      handbook_entries.institution_id,
      handbook_entries.student_profile_id,
      handbook_entries.category,
      handbook_entries.visibility_scope,
      handbook_entries.authored_by_person_id,
      handbook_entries.teaching_group_id
    )
  );

CREATE POLICY handbook_entries_insert
  ON public.handbook_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    handbook_entries.institution_id IN (SELECT app_auth.active_institution_ids())
    AND handbook_entries.authored_by_person_id = (SELECT app_auth.current_person_id())
    AND (
      (SELECT app_auth.has_institution_permission(handbook_entries.institution_id, 'handbook.manage'))
      OR (
        handbook_entries.visibility_scope <> 'leadership_only'
        AND app_auth.is_hod_or_class_teacher_of_student(handbook_entries.institution_id, handbook_entries.student_profile_id)
      )
      OR (
        handbook_entries.category = 'academic_observation'
        AND handbook_entries.visibility_scope IN ('student_and_guardian', 'staff_academic')
        AND handbook_entries.teaching_group_id IS NOT NULL
        AND app_auth.is_teaching_group_teacher(handbook_entries.institution_id, handbook_entries.teaching_group_id)
        AND EXISTS (
          SELECT 1
          FROM public.student_session_enrolments sse
          JOIN public.teaching_group_memberships tgm
            ON tgm.institution_id = sse.institution_id
           AND tgm.student_enrolment_id = sse.id
          WHERE sse.institution_id = handbook_entries.institution_id
            AND sse.student_profile_id = handbook_entries.student_profile_id
            AND sse.status = 'active'
            AND tgm.teaching_group_id = handbook_entries.teaching_group_id
            AND tgm.status = 'active'
        )
      )
    )
  );

CREATE POLICY handbook_entries_update
  ON public.handbook_entries
  FOR UPDATE
  TO authenticated
  USING (
    handbook_entries.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(handbook_entries.institution_id, 'handbook.manage'))
      OR (
        handbook_entries.visibility_scope <> 'leadership_only'
        AND app_auth.is_hod_or_class_teacher_of_student(handbook_entries.institution_id, handbook_entries.student_profile_id)
      )
      OR (
        handbook_entries.authored_by_person_id = (SELECT app_auth.current_person_id())
        AND handbook_entries.visibility_scope <> 'leadership_only'
      )
      OR (
        handbook_entries.visibility_scope = 'student_and_guardian'
        AND EXISTS (
          SELECT 1
          FROM public.student_guardians sg
          WHERE sg.institution_id = handbook_entries.institution_id
            AND sg.student_profile_id = handbook_entries.student_profile_id
            AND sg.guardian_person_id = (SELECT app_auth.current_person_id())
            AND sg.status = 'active'
        )
      )
    )
  )
  WITH CHECK (
    handbook_entries.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(handbook_entries.institution_id, 'handbook.manage'))
      OR (
        handbook_entries.visibility_scope <> 'leadership_only'
        AND app_auth.is_hod_or_class_teacher_of_student(handbook_entries.institution_id, handbook_entries.student_profile_id)
      )
      OR (
        handbook_entries.authored_by_person_id = (SELECT app_auth.current_person_id())
        AND handbook_entries.visibility_scope <> 'leadership_only'
      )
      OR (
        handbook_entries.visibility_scope = 'student_and_guardian'
        AND EXISTS (
          SELECT 1
          FROM public.student_guardians sg
          WHERE sg.institution_id = handbook_entries.institution_id
            AND sg.student_profile_id = handbook_entries.student_profile_id
            AND sg.guardian_person_id = (SELECT app_auth.current_person_id())
            AND sg.status = 'active'
        )
      )
    )
  );
