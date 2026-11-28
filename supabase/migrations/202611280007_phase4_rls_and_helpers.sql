-- P4-M01 Migration 16: Phase 4 ENABLE + FORCE ROW LEVEL SECURITY across all 9
-- newly created tables (45 total forced-RLS public tables), private app_auth
-- academic-oversight & contextual-visibility helpers, and explicit TO authenticated
-- RLS policies.

ALTER TABLE public.syllabus_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plans FORCE ROW LEVEL SECURITY;

ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_resources FORCE ROW LEVEL SECURITY;

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.official_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_notices FORCE ROW LEVEL SECURITY;

ALTER TABLE public.notice_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notice_acknowledgements FORCE ROW LEVEL SECURITY;

ALTER TABLE public.parent_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_enquiries FORCE ROW LEVEL SECURITY;

ALTER TABLE public.record_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_comments FORCE ROW LEVEL SECURITY;

-- Private helper: active staff or institutional authority in tenant (excludes students/guardians/monitors)
CREATE OR REPLACE FUNCTION app_auth.is_active_staff_or_leadership(
  p_institution_id uuid
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
    app_auth.has_institution_permission(p_institution_id, 'academics.manage')
    OR app_auth.has_institution_permission(p_institution_id, 'people.read')
    OR app_auth.has_institution_permission(p_institution_id, 'attendance.manage')
    OR EXISTS (
      SELECT 1
      FROM public.staff_profiles st
      WHERE st.institution_id = p_institution_id
        AND st.person_id = app_auth.current_person_id()
        AND st.lifecycle_status = 'active'
    )
    OR EXISTS (
      SELECT 1
      FROM public.academic_assignments aa
      WHERE aa.institution_id = p_institution_id
        AND aa.person_id = app_auth.current_person_id()
        AND aa.assignment_type IN ('hod', 'class_teacher', 'subject_teacher')
        AND aa.status IN ('active', 'delegated')
        AND aa.starts_on <= CURRENT_DATE
        AND (aa.ends_on IS NULL OR aa.ends_on >= CURRENT_DATE)
    )
  );
$$;

-- 1. app_auth.is_department_hod
CREATE OR REPLACE FUNCTION app_auth.is_department_hod(
  p_institution_id uuid,
  p_department_id uuid
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
      AND aa.department_id = p_department_id
      AND aa.person_id = app_auth.current_person_id()
      AND aa.assignment_type = 'hod'
      AND aa.status IN ('active', 'delegated')
      AND aa.starts_on <= CURRENT_DATE
      AND (aa.ends_on IS NULL OR aa.ends_on >= CURRENT_DATE)
  );
$$;

-- 2. app_auth.is_teaching_group_oversight (leadership / HOD of offering's department / class teacher of enrolled student's section)
CREATE OR REPLACE FUNCTION app_auth.is_teaching_group_oversight(
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
  AND (
    app_auth.has_institution_permission(p_institution_id, 'academics.manage')
    OR EXISTS (
      SELECT 1
      FROM public.teaching_groups tg
      JOIN public.subject_offerings so
        ON so.institution_id = tg.institution_id
       AND so.id = tg.subject_offering_id
      JOIN public.grade_levels gl
        ON gl.institution_id = so.institution_id
       AND gl.id = so.grade_level_id
      WHERE tg.institution_id = p_institution_id
        AND tg.id = p_teaching_group_id
        AND app_auth.is_department_hod(p_institution_id, gl.department_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.teaching_group_memberships tgm
      JOIN public.student_session_enrolments sse
        ON sse.institution_id = tgm.institution_id
       AND sse.id = tgm.student_enrolment_id
      JOIN public.academic_assignments aa
        ON aa.institution_id = sse.institution_id
       AND aa.session_id = sse.session_id
       AND aa.section_id = sse.section_id
       AND aa.person_id = app_auth.current_person_id()
       AND aa.assignment_type = 'class_teacher'
       AND aa.status IN ('active', 'delegated')
       AND aa.starts_on <= CURRENT_DATE
       AND (aa.ends_on IS NULL OR aa.ends_on >= CURRENT_DATE)
      WHERE tgm.institution_id = p_institution_id
        AND tgm.teaching_group_id = p_teaching_group_id
        AND tgm.status = 'active'
        AND sse.status = 'active'
    )
  );
$$;

-- 3. app_auth.is_student_or_guardian_in_teaching_group
CREATE OR REPLACE FUNCTION app_auth.is_student_or_guardian_in_teaching_group(
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
    FROM public.teaching_group_memberships tgm
    JOIN public.student_session_enrolments sse
      ON sse.institution_id = tgm.institution_id
     AND sse.id = tgm.student_enrolment_id
    JOIN public.student_profiles sp
      ON sp.institution_id = sse.institution_id
     AND sp.id = sse.student_profile_id
    WHERE tgm.institution_id = p_institution_id
      AND tgm.teaching_group_id = p_teaching_group_id
      AND tgm.status = 'active'
      AND sse.status = 'active'
      AND (
        sp.person_id = app_auth.current_person_id()
        OR EXISTS (
          SELECT 1
          FROM public.student_guardians sg
          WHERE sg.institution_id = p_institution_id
            AND sg.student_profile_id = sp.id
            AND sg.guardian_person_id = app_auth.current_person_id()
            AND sg.status = 'active'
        )
      )
  );
$$;

-- 4. app_auth.is_monitor_for_teaching_group (monitor of a section with active enrolled student in TG)
CREATE OR REPLACE FUNCTION app_auth.is_monitor_for_teaching_group(
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
    FROM public.teaching_group_memberships tgm
    JOIN public.student_session_enrolments sse
      ON sse.institution_id = tgm.institution_id
     AND sse.id = tgm.student_enrolment_id
    WHERE tgm.institution_id = p_institution_id
      AND tgm.teaching_group_id = p_teaching_group_id
      AND tgm.status = 'active'
      AND sse.status = 'active'
      AND app_auth.is_section_monitor(p_institution_id, sse.section_id)
  );
$$;

-- 5. app_auth.can_manage_subject_offering_planning
CREATE OR REPLACE FUNCTION app_auth.can_manage_subject_offering_planning(
  p_institution_id uuid,
  p_subject_offering_id uuid
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
    app_auth.has_institution_permission(p_institution_id, 'academics.manage')
    OR EXISTS (
      SELECT 1
      FROM public.subject_offerings so
      JOIN public.grade_levels gl
        ON gl.institution_id = so.institution_id
       AND gl.id = so.grade_level_id
      WHERE so.institution_id = p_institution_id
        AND so.id = p_subject_offering_id
        AND app_auth.is_department_hod(p_institution_id, gl.department_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.teaching_groups tg
      WHERE tg.institution_id = p_institution_id
        AND tg.subject_offering_id = p_subject_offering_id
        AND app_auth.is_teaching_group_teacher(p_institution_id, tg.id)
    )
  );
$$;

-- Private helper: oversight / read check for subject offerings (adds class teacher read access)
CREATE OR REPLACE FUNCTION app_auth.can_read_subject_offering_planning(
  p_institution_id uuid,
  p_subject_offering_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT app_auth.can_manage_subject_offering_planning(p_institution_id, p_subject_offering_id)
  OR EXISTS (
    SELECT 1
    FROM public.student_subject_enrolments sub_enr
    JOIN public.student_session_enrolments sse
      ON sse.institution_id = sub_enr.institution_id
     AND sse.id = sub_enr.student_enrolment_id
    JOIN public.academic_assignments aa
      ON aa.institution_id = sse.institution_id
     AND aa.session_id = sse.session_id
     AND aa.section_id = sse.section_id
     AND aa.person_id = app_auth.current_person_id()
     AND aa.assignment_type = 'class_teacher'
     AND aa.status IN ('active', 'delegated')
     AND aa.starts_on <= CURRENT_DATE
     AND (aa.ends_on IS NULL OR aa.ends_on >= CURRENT_DATE)
    WHERE sub_enr.institution_id = p_institution_id
      AND sub_enr.subject_offering_id = p_subject_offering_id
      AND sub_enr.status = 'active'
      AND sse.status = 'active'
  );
$$;

-- 6. app_auth.can_read_official_notice
CREATE OR REPLACE FUNCTION app_auth.can_read_official_notice(
  p_institution_id uuid,
  p_scope_type text,
  p_department_id uuid,
  p_section_id uuid,
  p_teaching_group_id uuid,
  p_status text,
  p_authored_by_person_id uuid
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
    -- Draft notices are strictly visible only to author, leadership, or targeted oversight (never monitors/students/guardians)
    (
      p_status = 'draft'
      AND (
        app_auth.has_institution_permission(p_institution_id, 'academics.manage')
        OR p_authored_by_person_id = app_auth.current_person_id()
        OR (
          p_scope_type = 'department'
          AND p_department_id IS NOT NULL
          AND app_auth.is_department_hod(p_institution_id, p_department_id)
        )
        OR (
          p_scope_type = 'section'
          AND p_section_id IS NOT NULL
          AND app_auth.is_section_class_teacher_or_hod(p_institution_id, p_section_id)
        )
        OR (
          p_scope_type = 'teaching_group'
          AND p_teaching_group_id IS NOT NULL
          AND (
            app_auth.is_teaching_group_teacher(p_institution_id, p_teaching_group_id)
            OR app_auth.is_teaching_group_oversight(p_institution_id, p_teaching_group_id)
          )
        )
      )
    )
    OR (
      p_status IN ('published', 'archived')
      AND (
        app_auth.has_institution_permission(p_institution_id, 'academics.manage')
        OR p_authored_by_person_id = app_auth.current_person_id()
        OR (
          p_scope_type = 'institution'
          AND (
            p_status = 'published'
            OR app_auth.is_active_staff_or_leadership(p_institution_id)
          )
        )
        OR (
          p_scope_type = 'department'
          AND p_department_id IS NOT NULL
          AND (
            app_auth.is_department_hod(p_institution_id, p_department_id)
            OR EXISTS (
              SELECT 1
              FROM public.sections sec
              JOIN public.grade_levels gl
                ON gl.institution_id = sec.institution_id
               AND gl.id = sec.grade_level_id
              WHERE sec.institution_id = p_institution_id
                AND gl.department_id = p_department_id
                AND (
                  app_auth.is_section_class_teacher_or_hod(p_institution_id, sec.id)
                  OR (
                    p_status = 'published'
                    AND (
                      app_auth.is_section_monitor(p_institution_id, sec.id)
                      OR EXISTS (
                        SELECT 1
                        FROM public.student_session_enrolments sse
                        JOIN public.student_profiles sp
                          ON sp.institution_id = sse.institution_id
                         AND sp.id = sse.student_profile_id
                        WHERE sse.institution_id = p_institution_id
                          AND sse.section_id = sec.id
                          AND sse.status = 'active'
                          AND (
                            sp.person_id = app_auth.current_person_id()
                            OR EXISTS (
                              SELECT 1
                              FROM public.student_guardians sg
                              WHERE sg.institution_id = p_institution_id
                                AND sg.student_profile_id = sp.id
                                AND sg.guardian_person_id = app_auth.current_person_id()
                                AND sg.status = 'active'
                            )
                          )
                      )
                    )
                  )
                )
            )
          )
        )
        OR (
          p_scope_type = 'section'
          AND p_section_id IS NOT NULL
          AND (
            app_auth.is_section_class_teacher_or_hod(p_institution_id, p_section_id)
            OR (
              p_status = 'published'
              AND (
                app_auth.is_section_monitor(p_institution_id, p_section_id)
                OR EXISTS (
                  SELECT 1
                  FROM public.student_session_enrolments sse
                  JOIN public.student_profiles sp
                    ON sp.institution_id = sse.institution_id
                   AND sp.id = sse.student_profile_id
                  WHERE sse.institution_id = p_institution_id
                    AND sse.section_id = p_section_id
                    AND sse.status = 'active'
                    AND (
                      sp.person_id = app_auth.current_person_id()
                      OR EXISTS (
                        SELECT 1
                        FROM public.student_guardians sg
                        WHERE sg.institution_id = p_institution_id
                          AND sg.student_profile_id = sp.id
                          AND sg.guardian_person_id = app_auth.current_person_id()
                          AND sg.status = 'active'
                      )
                    )
                )
              )
            )
          )
        )
        OR (
          p_scope_type = 'teaching_group'
          AND p_teaching_group_id IS NOT NULL
          AND (
            app_auth.is_teaching_group_teacher(p_institution_id, p_teaching_group_id)
            OR app_auth.is_teaching_group_oversight(p_institution_id, p_teaching_group_id)
            OR (
              p_status = 'published'
              AND app_auth.is_student_or_guardian_in_teaching_group(p_institution_id, p_teaching_group_id)
            )
          )
        )
      )
    )
  );
$$;

-- 7. app_auth.can_read_parent_enquiry (strictly never monitors, never classmates, never cross-tenant)
CREATE OR REPLACE FUNCTION app_auth.can_read_parent_enquiry(
  p_institution_id uuid,
  p_student_profile_id uuid,
  p_guardian_person_id uuid,
  p_section_id uuid,
  p_teaching_group_id uuid,
  p_assigned_to_person_id uuid
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
    app_auth.has_institution_permission(p_institution_id, 'people.read')
    OR app_auth.has_institution_permission(p_institution_id, 'academics.manage')
    OR p_assigned_to_person_id = app_auth.current_person_id()
    OR (
      p_guardian_person_id = app_auth.current_person_id()
      AND EXISTS (
        SELECT 1
        FROM public.student_guardians sg
        WHERE sg.institution_id = p_institution_id
          AND sg.student_profile_id = p_student_profile_id
          AND sg.guardian_person_id = app_auth.current_person_id()
          AND sg.status = 'active'
      )
    )
    OR app_auth.is_hod_or_class_teacher_of_student(p_institution_id, p_student_profile_id)
    OR (
      p_section_id IS NOT NULL
      AND app_auth.is_section_class_teacher_or_hod(p_institution_id, p_section_id)
    )
    OR (
      p_teaching_group_id IS NOT NULL
      AND app_auth.is_teaching_group_teacher(p_institution_id, p_teaching_group_id)
    )
  );
$$;

-- Helper for reading assignments cleanly (reused by assignments_select & record_comments)
CREATE OR REPLACE FUNCTION app_auth.can_read_assignment(
  p_institution_id uuid,
  p_teaching_group_id uuid,
  p_status text,
  p_authored_by_person_id uuid
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
    app_auth.is_teaching_group_teacher(p_institution_id, p_teaching_group_id)
    OR app_auth.is_teaching_group_oversight(p_institution_id, p_teaching_group_id)
    OR p_authored_by_person_id = app_auth.current_person_id()
    OR (
      p_status IN ('published', 'closed')
      AND (
        app_auth.is_student_or_guardian_in_teaching_group(p_institution_id, p_teaching_group_id)
        OR app_auth.is_monitor_for_teaching_group(p_institution_id, p_teaching_group_id)
      )
    )
  );
$$;

-- 8. app_auth.can_read_record_comment (inherits parent visibility & hides internal staff notes from students/guardians/monitors)
CREATE OR REPLACE FUNCTION app_auth.can_read_record_comment(
  p_institution_id uuid,
  p_parent_kind text,
  p_notice_id uuid,
  p_parent_enquiry_id uuid,
  p_assignment_id uuid,
  p_is_internal_staff_note boolean
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
    NOT p_is_internal_staff_note
    OR app_auth.is_active_staff_or_leadership(p_institution_id)
  )
  AND (
    (
      p_parent_kind = 'notice'
      AND p_notice_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.official_notices n
        WHERE n.institution_id = p_institution_id
          AND n.id = p_notice_id
          AND app_auth.can_read_official_notice(
            n.institution_id,
            n.scope_type,
            n.department_id,
            n.section_id,
            n.teaching_group_id,
            n.status,
            n.authored_by_person_id
          )
      )
    )
    OR (
      p_parent_kind = 'parent_enquiry'
      AND p_parent_enquiry_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.parent_enquiries pe
        WHERE pe.institution_id = p_institution_id
          AND pe.id = p_parent_enquiry_id
          AND app_auth.can_read_parent_enquiry(
            pe.institution_id,
            pe.student_profile_id,
            pe.guardian_person_id,
            pe.section_id,
            pe.teaching_group_id,
            pe.assigned_to_person_id
          )
      )
    )
    OR (
      p_parent_kind = 'assignment'
      AND p_assignment_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.assignments a
        WHERE a.institution_id = p_institution_id
          AND a.id = p_assignment_id
          AND app_auth.can_read_assignment(
            a.institution_id,
            a.teaching_group_id,
            a.status,
            a.authored_by_person_id
          )
      )
    )
  );
$$;

REVOKE ALL ON FUNCTION app_auth.is_active_staff_or_leadership(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.is_department_hod(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.is_teaching_group_oversight(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.is_student_or_guardian_in_teaching_group(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.is_monitor_for_teaching_group(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_manage_subject_offering_planning(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_read_subject_offering_planning(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_read_official_notice(uuid, text, uuid, uuid, uuid, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_read_parent_enquiry(uuid, uuid, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_read_assignment(uuid, uuid, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_read_record_comment(uuid, text, uuid, uuid, uuid, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION app_auth.is_active_staff_or_leadership(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.is_department_hod(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.is_teaching_group_oversight(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.is_student_or_guardian_in_teaching_group(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.is_monitor_for_teaching_group(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_manage_subject_offering_planning(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_read_subject_offering_planning(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_read_official_notice(uuid, text, uuid, uuid, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_read_parent_enquiry(uuid, uuid, uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_read_assignment(uuid, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_read_record_comment(uuid, text, uuid, uuid, uuid, boolean) TO authenticated;

-- ============================================================
-- Explicit TO authenticated RLS Policies Across All 9 Tables
-- ============================================================

-- 1. syllabus_items
CREATE POLICY syllabus_items_select
  ON public.syllabus_items
  FOR SELECT
  TO authenticated
  USING (
    syllabus_items.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      app_auth.can_read_subject_offering_planning(syllabus_items.institution_id, syllabus_items.subject_offering_id)
      OR EXISTS (
        SELECT 1
        FROM public.student_subject_enrolments sub_enr
        JOIN public.student_session_enrolments sse
          ON sse.institution_id = sub_enr.institution_id
         AND sse.id = sub_enr.student_enrolment_id
        JOIN public.student_profiles sp
          ON sp.institution_id = sse.institution_id
         AND sp.id = sse.student_profile_id
        WHERE sub_enr.institution_id = syllabus_items.institution_id
          AND sub_enr.subject_offering_id = syllabus_items.subject_offering_id
          AND sub_enr.status = 'active'
          AND sse.status = 'active'
          AND (
            sp.person_id = (SELECT app_auth.current_person_id())
            OR EXISTS (
              SELECT 1
              FROM public.student_guardians sg
              WHERE sg.institution_id = syllabus_items.institution_id
                AND sg.student_profile_id = sp.id
                AND sg.guardian_person_id = (SELECT app_auth.current_person_id())
                AND sg.status = 'active'
            )
          )
      )
    )
  );

CREATE POLICY syllabus_items_insert
  ON public.syllabus_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    syllabus_items.institution_id IN (SELECT app_auth.active_institution_ids())
    AND app_auth.can_manage_subject_offering_planning(syllabus_items.institution_id, syllabus_items.subject_offering_id)
  );

CREATE POLICY syllabus_items_update
  ON public.syllabus_items
  FOR UPDATE
  TO authenticated
  USING (
    syllabus_items.institution_id IN (SELECT app_auth.active_institution_ids())
    AND app_auth.can_manage_subject_offering_planning(syllabus_items.institution_id, syllabus_items.subject_offering_id)
  )
  WITH CHECK (
    syllabus_items.institution_id IN (SELECT app_auth.active_institution_ids())
    AND app_auth.can_manage_subject_offering_planning(syllabus_items.institution_id, syllabus_items.subject_offering_id)
  );

-- 2. lesson_plans (strictly staff/oversight planning; never students/guardians/monitors)
CREATE POLICY lesson_plans_select
  ON public.lesson_plans
  FOR SELECT
  TO authenticated
  USING (
    lesson_plans.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      app_auth.is_teaching_group_teacher(lesson_plans.institution_id, lesson_plans.teaching_group_id)
      OR app_auth.is_teaching_group_oversight(lesson_plans.institution_id, lesson_plans.teaching_group_id)
    )
  );

CREATE POLICY lesson_plans_insert
  ON public.lesson_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    lesson_plans.institution_id IN (SELECT app_auth.active_institution_ids())
    AND lesson_plans.authored_by_person_id = (SELECT app_auth.current_person_id())
    AND (
      (SELECT app_auth.has_institution_permission(lesson_plans.institution_id, 'academics.manage'))
      OR app_auth.is_teaching_group_teacher(lesson_plans.institution_id, lesson_plans.teaching_group_id)
      OR app_auth.is_teaching_group_oversight(lesson_plans.institution_id, lesson_plans.teaching_group_id)
    )
  );

CREATE POLICY lesson_plans_update
  ON public.lesson_plans
  FOR UPDATE
  TO authenticated
  USING (
    lesson_plans.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(lesson_plans.institution_id, 'academics.manage'))
      OR app_auth.is_teaching_group_teacher(lesson_plans.institution_id, lesson_plans.teaching_group_id)
      OR app_auth.is_teaching_group_oversight(lesson_plans.institution_id, lesson_plans.teaching_group_id)
    )
  )
  WITH CHECK (
    lesson_plans.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(lesson_plans.institution_id, 'academics.manage'))
      OR app_auth.is_teaching_group_teacher(lesson_plans.institution_id, lesson_plans.teaching_group_id)
      OR app_auth.is_teaching_group_oversight(lesson_plans.institution_id, lesson_plans.teaching_group_id)
    )
  );

-- 3. learning_resources
CREATE POLICY learning_resources_select
  ON public.learning_resources
  FOR SELECT
  TO authenticated
  USING (
    learning_resources.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      app_auth.can_read_subject_offering_planning(learning_resources.institution_id, learning_resources.subject_offering_id)
      OR (
        learning_resources.teaching_group_id IS NOT NULL
        AND app_auth.is_teaching_group_oversight(learning_resources.institution_id, learning_resources.teaching_group_id)
      )
      OR (
        learning_resources.status = 'published'
        AND (
          (
            learning_resources.visibility = 'teaching_group'
            AND learning_resources.teaching_group_id IS NOT NULL
            AND app_auth.is_student_or_guardian_in_teaching_group(learning_resources.institution_id, learning_resources.teaching_group_id)
          )
          OR (
            learning_resources.visibility = 'subject_offering'
            AND EXISTS (
              SELECT 1
              FROM public.student_subject_enrolments sub_enr
              JOIN public.student_session_enrolments sse
                ON sse.institution_id = sub_enr.institution_id
               AND sse.id = sub_enr.student_enrolment_id
              JOIN public.student_profiles sp
                ON sp.institution_id = sse.institution_id
               AND sp.id = sse.student_profile_id
              WHERE sub_enr.institution_id = learning_resources.institution_id
                AND sub_enr.subject_offering_id = learning_resources.subject_offering_id
                AND sub_enr.status = 'active'
                AND sse.status = 'active'
                AND (
                  sp.person_id = (SELECT app_auth.current_person_id())
                  OR EXISTS (
                    SELECT 1
                    FROM public.student_guardians sg
                    WHERE sg.institution_id = learning_resources.institution_id
                      AND sg.student_profile_id = sp.id
                      AND sg.guardian_person_id = (SELECT app_auth.current_person_id())
                      AND sg.status = 'active'
                  )
                )
            )
          )
        )
      )
    )
  );

CREATE POLICY learning_resources_insert
  ON public.learning_resources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    learning_resources.institution_id IN (SELECT app_auth.active_institution_ids())
    AND learning_resources.authored_by_person_id = (SELECT app_auth.current_person_id())
    AND (
      (SELECT app_auth.has_institution_permission(learning_resources.institution_id, 'academics.manage'))
      OR (
        learning_resources.teaching_group_id IS NOT NULL
        AND app_auth.is_teaching_group_teacher(learning_resources.institution_id, learning_resources.teaching_group_id)
      )
      OR (
        learning_resources.teaching_group_id IS NULL
        AND app_auth.can_manage_subject_offering_planning(learning_resources.institution_id, learning_resources.subject_offering_id)
      )
    )
  );

CREATE POLICY learning_resources_update
  ON public.learning_resources
  FOR UPDATE
  TO authenticated
  USING (
    learning_resources.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(learning_resources.institution_id, 'academics.manage'))
      OR (
        learning_resources.teaching_group_id IS NOT NULL
        AND app_auth.is_teaching_group_teacher(learning_resources.institution_id, learning_resources.teaching_group_id)
      )
      OR (
        learning_resources.teaching_group_id IS NULL
        AND app_auth.can_manage_subject_offering_planning(learning_resources.institution_id, learning_resources.subject_offering_id)
      )
    )
  )
  WITH CHECK (
    learning_resources.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(learning_resources.institution_id, 'academics.manage'))
      OR (
        learning_resources.teaching_group_id IS NOT NULL
        AND app_auth.is_teaching_group_teacher(learning_resources.institution_id, learning_resources.teaching_group_id)
      )
      OR (
        learning_resources.teaching_group_id IS NULL
        AND app_auth.can_manage_subject_offering_planning(learning_resources.institution_id, learning_resources.subject_offering_id)
      )
    )
  );

-- 4. assignments
CREATE POLICY assignments_select
  ON public.assignments
  FOR SELECT
  TO authenticated
  USING (
    app_auth.can_read_assignment(
      assignments.institution_id,
      assignments.teaching_group_id,
      assignments.status,
      assignments.authored_by_person_id
    )
  );

CREATE POLICY assignments_insert
  ON public.assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    assignments.institution_id IN (SELECT app_auth.active_institution_ids())
    AND assignments.authored_by_person_id = (SELECT app_auth.current_person_id())
    AND (
      (SELECT app_auth.has_institution_permission(assignments.institution_id, 'academics.manage'))
      OR app_auth.is_teaching_group_teacher(assignments.institution_id, assignments.teaching_group_id)
    )
  );

CREATE POLICY assignments_update
  ON public.assignments
  FOR UPDATE
  TO authenticated
  USING (
    assignments.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(assignments.institution_id, 'academics.manage'))
      OR app_auth.is_teaching_group_teacher(assignments.institution_id, assignments.teaching_group_id)
    )
  )
  WITH CHECK (
    assignments.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(assignments.institution_id, 'academics.manage'))
      OR app_auth.is_teaching_group_teacher(assignments.institution_id, assignments.teaching_group_id)
    )
  );

-- 5. assignment_submissions (strictly hides classmates' & monitors' submissions; locks student evaluation columns)
CREATE POLICY assignment_submissions_select
  ON public.assignment_submissions
  FOR SELECT
  TO authenticated
  USING (
    assignment_submissions.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      app_auth.has_institution_permission(assignment_submissions.institution_id, 'academics.manage')
      OR app_auth.is_hod_or_class_teacher_of_student(assignment_submissions.institution_id, assignment_submissions.student_profile_id)
      OR EXISTS (
        SELECT 1
        FROM public.assignments a
        WHERE a.institution_id = assignment_submissions.institution_id
          AND a.id = assignment_submissions.assignment_id
          AND (
            app_auth.is_teaching_group_teacher(a.institution_id, a.teaching_group_id)
            OR app_auth.is_teaching_group_oversight(a.institution_id, a.teaching_group_id)
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        WHERE sp.institution_id = assignment_submissions.institution_id
          AND sp.id = assignment_submissions.student_profile_id
          AND sp.person_id = (SELECT app_auth.current_person_id())
      )
      OR EXISTS (
        SELECT 1
        FROM public.student_guardians sg
        WHERE sg.institution_id = assignment_submissions.institution_id
          AND sg.student_profile_id = assignment_submissions.student_profile_id
          AND sg.guardian_person_id = (SELECT app_auth.current_person_id())
          AND sg.status = 'active'
      )
    )
  );

CREATE POLICY assignment_submissions_insert
  ON public.assignment_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    assignment_submissions.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      app_auth.has_institution_permission(assignment_submissions.institution_id, 'academics.manage')
      OR EXISTS (
        SELECT 1
        FROM public.assignments a
        WHERE a.institution_id = assignment_submissions.institution_id
          AND a.id = assignment_submissions.assignment_id
          AND app_auth.is_teaching_group_teacher(a.institution_id, a.teaching_group_id)
      )
      OR (
        assignment_submissions.submission_channel = 'online'
        AND assignment_submissions.status IN ('submitted', 'late_submitted')
        AND assignment_submissions.marks_awarded IS NULL
        AND assignment_submissions.teacher_remarks IS NULL
        AND assignment_submissions.evaluated_by_person_id IS NULL
        AND assignment_submissions.evaluated_at IS NULL
        AND assignment_submissions.submitted_by_person_id = (SELECT app_auth.current_person_id())
        AND EXISTS (
          SELECT 1
          FROM public.assignments a
          JOIN public.teaching_group_memberships tgm
            ON tgm.institution_id = a.institution_id
           AND tgm.teaching_group_id = a.teaching_group_id
          JOIN public.student_session_enrolments sse
            ON sse.institution_id = tgm.institution_id
           AND sse.id = tgm.student_enrolment_id
          JOIN public.student_profiles sp
            ON sp.institution_id = sse.institution_id
           AND sp.id = sse.student_profile_id
          WHERE a.institution_id = assignment_submissions.institution_id
            AND a.id = assignment_submissions.assignment_id
            AND a.status = 'published'
            AND a.submission_mode IN ('online', 'both')
            AND tgm.student_enrolment_id = assignment_submissions.student_enrolment_id
            AND tgm.status = 'active'
            AND sse.student_profile_id = assignment_submissions.student_profile_id
            AND sse.status = 'active'
            AND sp.person_id = (SELECT app_auth.current_person_id())
        )
      )
    )
  );

CREATE POLICY assignment_submissions_update
  ON public.assignment_submissions
  FOR UPDATE
  TO authenticated
  USING (
    assignment_submissions.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      app_auth.has_institution_permission(assignment_submissions.institution_id, 'academics.manage')
      OR EXISTS (
        SELECT 1
        FROM public.assignments a
        WHERE a.institution_id = assignment_submissions.institution_id
          AND a.id = assignment_submissions.assignment_id
          AND app_auth.is_teaching_group_teacher(a.institution_id, a.teaching_group_id)
      )
      OR (
        assignment_submissions.status IN ('assigned', 'submitted', 'late_submitted', 'resubmit_requested')
        AND EXISTS (
          SELECT 1
          FROM public.student_profiles sp
          WHERE sp.institution_id = assignment_submissions.institution_id
            AND sp.id = assignment_submissions.student_profile_id
            AND sp.person_id = (SELECT app_auth.current_person_id())
        )
      )
    )
  )
  WITH CHECK (
    assignment_submissions.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      app_auth.has_institution_permission(assignment_submissions.institution_id, 'academics.manage')
      OR EXISTS (
        SELECT 1
        FROM public.assignments a
        WHERE a.institution_id = assignment_submissions.institution_id
          AND a.id = assignment_submissions.assignment_id
          AND app_auth.is_teaching_group_teacher(a.institution_id, a.teaching_group_id)
      )
      OR (
        assignment_submissions.submission_channel = 'online'
        AND assignment_submissions.status IN ('submitted', 'late_submitted')
        AND assignment_submissions.marks_awarded IS NULL
        AND assignment_submissions.teacher_remarks IS NULL
        AND assignment_submissions.evaluated_by_person_id IS NULL
        AND assignment_submissions.evaluated_at IS NULL
        AND assignment_submissions.submitted_by_person_id = (SELECT app_auth.current_person_id())
        AND EXISTS (
          SELECT 1
          FROM public.student_profiles sp
          WHERE sp.institution_id = assignment_submissions.institution_id
            AND sp.id = assignment_submissions.student_profile_id
            AND sp.person_id = (SELECT app_auth.current_person_id())
        )
      )
    )
  );

-- 6. official_notices
CREATE POLICY official_notices_select
  ON public.official_notices
  FOR SELECT
  TO authenticated
  USING (
    app_auth.can_read_official_notice(
      official_notices.institution_id,
      official_notices.scope_type,
      official_notices.department_id,
      official_notices.section_id,
      official_notices.teaching_group_id,
      official_notices.status,
      official_notices.authored_by_person_id
    )
  );

CREATE POLICY official_notices_insert
  ON public.official_notices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    official_notices.institution_id IN (SELECT app_auth.active_institution_ids())
    AND official_notices.authored_by_person_id = (SELECT app_auth.current_person_id())
    AND (
      (SELECT app_auth.has_institution_permission(official_notices.institution_id, 'academics.manage'))
      OR (
        official_notices.scope_type = 'department'
        AND official_notices.department_id IS NOT NULL
        AND app_auth.is_department_hod(official_notices.institution_id, official_notices.department_id)
      )
      OR (
        official_notices.scope_type = 'section'
        AND official_notices.section_id IS NOT NULL
        AND app_auth.is_section_class_teacher_or_hod(official_notices.institution_id, official_notices.section_id)
      )
      OR (
        official_notices.scope_type = 'teaching_group'
        AND official_notices.teaching_group_id IS NOT NULL
        AND app_auth.is_teaching_group_teacher(official_notices.institution_id, official_notices.teaching_group_id)
      )
    )
  );

CREATE POLICY official_notices_update
  ON public.official_notices
  FOR UPDATE
  TO authenticated
  USING (
    official_notices.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(official_notices.institution_id, 'academics.manage'))
      OR (
        official_notices.authored_by_person_id = (SELECT app_auth.current_person_id())
        AND (
          (
            official_notices.scope_type = 'department'
            AND official_notices.department_id IS NOT NULL
            AND app_auth.is_department_hod(official_notices.institution_id, official_notices.department_id)
          )
          OR (
            official_notices.scope_type = 'section'
            AND official_notices.section_id IS NOT NULL
            AND app_auth.is_section_class_teacher_or_hod(official_notices.institution_id, official_notices.section_id)
          )
          OR (
            official_notices.scope_type = 'teaching_group'
            AND official_notices.teaching_group_id IS NOT NULL
            AND app_auth.is_teaching_group_teacher(official_notices.institution_id, official_notices.teaching_group_id)
          )
        )
      )
    )
  )
  WITH CHECK (
    official_notices.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(official_notices.institution_id, 'academics.manage'))
      OR (
        official_notices.scope_type = 'department'
        AND official_notices.department_id IS NOT NULL
        AND app_auth.is_department_hod(official_notices.institution_id, official_notices.department_id)
      )
      OR (
        official_notices.scope_type = 'section'
        AND official_notices.section_id IS NOT NULL
        AND app_auth.is_section_class_teacher_or_hod(official_notices.institution_id, official_notices.section_id)
      )
      OR (
        official_notices.scope_type = 'teaching_group'
        AND official_notices.teaching_group_id IS NOT NULL
        AND app_auth.is_teaching_group_teacher(official_notices.institution_id, official_notices.teaching_group_id)
      )
    )
  );

-- 7. notice_acknowledgements
CREATE POLICY notice_acknowledgements_select
  ON public.notice_acknowledgements
  FOR SELECT
  TO authenticated
  USING (
    notice_acknowledgements.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      notice_acknowledgements.person_id = (SELECT app_auth.current_person_id())
      OR (SELECT app_auth.has_institution_permission(notice_acknowledgements.institution_id, 'academics.manage'))
      OR EXISTS (
        SELECT 1
        FROM public.official_notices n
        WHERE n.institution_id = notice_acknowledgements.institution_id
          AND n.id = notice_acknowledgements.notice_id
          AND (
            n.authored_by_person_id = (SELECT app_auth.current_person_id())
            OR (
              n.scope_type = 'section'
              AND n.section_id IS NOT NULL
              AND app_auth.is_section_class_teacher_or_hod(n.institution_id, n.section_id)
            )
            OR (
              n.scope_type = 'department'
              AND n.department_id IS NOT NULL
              AND app_auth.is_department_hod(n.institution_id, n.department_id)
            )
            OR (
              n.scope_type = 'teaching_group'
              AND n.teaching_group_id IS NOT NULL
              AND app_auth.is_teaching_group_teacher(n.institution_id, n.teaching_group_id)
            )
          )
      )
    )
  );

CREATE POLICY notice_acknowledgements_insert
  ON public.notice_acknowledgements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    notice_acknowledgements.institution_id IN (SELECT app_auth.active_institution_ids())
    AND notice_acknowledgements.person_id = (SELECT app_auth.current_person_id())
    AND (
      notice_acknowledgements.student_profile_id IS NULL
      OR app_auth.can_access_student_profile(notice_acknowledgements.institution_id, notice_acknowledgements.student_profile_id)
    )
    AND EXISTS (
      SELECT 1
      FROM public.official_notices n
      WHERE n.institution_id = notice_acknowledgements.institution_id
        AND n.id = notice_acknowledgements.notice_id
        AND n.status = 'published'
        AND app_auth.can_read_official_notice(
          n.institution_id,
          n.scope_type,
          n.department_id,
          n.section_id,
          n.teaching_group_id,
          n.status,
          n.authored_by_person_id
        )
    )
  );

-- 8. parent_enquiries
CREATE POLICY parent_enquiries_select
  ON public.parent_enquiries
  FOR SELECT
  TO authenticated
  USING (
    app_auth.can_read_parent_enquiry(
      parent_enquiries.institution_id,
      parent_enquiries.student_profile_id,
      parent_enquiries.guardian_person_id,
      parent_enquiries.section_id,
      parent_enquiries.teaching_group_id,
      parent_enquiries.assigned_to_person_id
    )
  );

CREATE POLICY parent_enquiries_insert
  ON public.parent_enquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    parent_enquiries.institution_id IN (SELECT app_auth.active_institution_ids())
    AND parent_enquiries.guardian_person_id = (SELECT app_auth.current_person_id())
    AND EXISTS (
      SELECT 1
      FROM public.student_guardians sg
      WHERE sg.institution_id = parent_enquiries.institution_id
        AND sg.student_profile_id = parent_enquiries.student_profile_id
        AND sg.guardian_person_id = (SELECT app_auth.current_person_id())
        AND sg.status = 'active'
    )
  );

CREATE POLICY parent_enquiries_update
  ON public.parent_enquiries
  FOR UPDATE
  TO authenticated
  USING (
    parent_enquiries.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(parent_enquiries.institution_id, 'academics.manage'))
      OR (SELECT app_auth.has_institution_permission(parent_enquiries.institution_id, 'people.manage'))
      OR parent_enquiries.assigned_to_person_id = (SELECT app_auth.current_person_id())
      OR app_auth.is_hod_or_class_teacher_of_student(parent_enquiries.institution_id, parent_enquiries.student_profile_id)
      OR (
        parent_enquiries.teaching_group_id IS NOT NULL
        AND app_auth.is_teaching_group_teacher(parent_enquiries.institution_id, parent_enquiries.teaching_group_id)
      )
      OR (
        parent_enquiries.guardian_person_id = (SELECT app_auth.current_person_id())
        AND parent_enquiries.status IN ('open', 'resolved')
      )
    )
  )
  WITH CHECK (
    parent_enquiries.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      (SELECT app_auth.has_institution_permission(parent_enquiries.institution_id, 'academics.manage'))
      OR (SELECT app_auth.has_institution_permission(parent_enquiries.institution_id, 'people.manage'))
      OR parent_enquiries.assigned_to_person_id = (SELECT app_auth.current_person_id())
      OR app_auth.is_hod_or_class_teacher_of_student(parent_enquiries.institution_id, parent_enquiries.student_profile_id)
      OR (
        parent_enquiries.teaching_group_id IS NOT NULL
        AND app_auth.is_teaching_group_teacher(parent_enquiries.institution_id, parent_enquiries.teaching_group_id)
      )
      OR (
        parent_enquiries.guardian_person_id = (SELECT app_auth.current_person_id())
        AND parent_enquiries.status IN ('open', 'closed')
      )
    )
  );

-- 9. record_comments (mutually exclusive parent + parent visibility inheritance + staff-only internal notes)
CREATE POLICY record_comments_select
  ON public.record_comments
  FOR SELECT
  TO authenticated
  USING (
    app_auth.can_read_record_comment(
      record_comments.institution_id,
      record_comments.parent_kind,
      record_comments.notice_id,
      record_comments.parent_enquiry_id,
      record_comments.assignment_id,
      record_comments.is_internal_staff_note
    )
  );

CREATE POLICY record_comments_insert
  ON public.record_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    record_comments.institution_id IN (SELECT app_auth.active_institution_ids())
    AND record_comments.authored_by_person_id = (SELECT app_auth.current_person_id())
    AND (
      NOT record_comments.is_internal_staff_note
      OR app_auth.is_active_staff_or_leadership(record_comments.institution_id)
    )
    AND app_auth.can_read_record_comment(
      record_comments.institution_id,
      record_comments.parent_kind,
      record_comments.notice_id,
      record_comments.parent_enquiry_id,
      record_comments.assignment_id,
      record_comments.is_internal_staff_note
    )
    -- Exclude monitors & students from posting comments on school notices; restrict assignment comments to staff or TG participants
    AND (
      app_auth.is_active_staff_or_leadership(record_comments.institution_id)
      OR record_comments.parent_kind = 'parent_enquiry'
      OR (
        record_comments.parent_kind = 'assignment'
        AND EXISTS (
          SELECT 1
          FROM public.assignments a
          WHERE a.institution_id = record_comments.institution_id
            AND a.id = record_comments.assignment_id
            AND app_auth.is_student_or_guardian_in_teaching_group(a.institution_id, a.teaching_group_id)
        )
      )
    )
  );

CREATE POLICY record_comments_update
  ON public.record_comments
  FOR UPDATE
  TO authenticated
  USING (
    record_comments.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      record_comments.authored_by_person_id = (SELECT app_auth.current_person_id())
      OR (SELECT app_auth.has_institution_permission(record_comments.institution_id, 'academics.manage'))
    )
  )
  WITH CHECK (
    record_comments.institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      record_comments.authored_by_person_id = (SELECT app_auth.current_person_id())
      OR (SELECT app_auth.has_institution_permission(record_comments.institution_id, 'academics.manage'))
    )
  );
