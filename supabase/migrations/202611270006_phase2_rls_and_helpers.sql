-- P2-M01 Migration 6: Phase 2 relationship & sensitivity RLS helpers
-- and forced RLS policies across all 19 Phase 2 tables.

-- Private helper: relationship-scoped read check for student profiles & enrolments
CREATE OR REPLACE FUNCTION app_auth.can_access_student_profile(
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
    app_auth.has_institution_permission(p_institution_id, 'people.read')
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
      JOIN public.grade_levels gl
        ON gl.institution_id = sse.institution_id
       AND gl.id = sse.grade_level_id
      JOIN public.academic_assignments aa
        ON aa.institution_id = sse.institution_id
       AND aa.session_id = sse.session_id
       AND aa.person_id = app_auth.current_person_id()
       AND aa.status = 'active'
       AND aa.starts_on <= CURRENT_DATE
       AND (aa.ends_on IS NULL OR aa.ends_on >= CURRENT_DATE)
      WHERE sse.institution_id = p_institution_id
        AND sse.student_profile_id = p_student_profile_id
        AND sse.status = 'active'
        AND (
          (aa.assignment_type = 'hod' AND aa.department_id = gl.department_id)
          OR (
            aa.assignment_type IN ('class_teacher', 'monitor', 'monitress')
            AND aa.section_id = sse.section_id
          )
          OR (
            aa.assignment_type = 'subject_teacher'
            AND EXISTS (
              SELECT 1
              FROM public.teaching_group_memberships tgm
              WHERE tgm.institution_id = sse.institution_id
                AND tgm.teaching_group_id = aa.teaching_group_id
                AND tgm.student_enrolment_id = sse.id
                AND tgm.status = 'active'
            )
          )
        )
    )
  );
$$;

CREATE OR REPLACE FUNCTION app_auth.can_access_student_enrolment(
  p_institution_id uuid,
  p_student_enrolment_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_session_enrolments sse
    WHERE sse.institution_id = p_institution_id
      AND sse.id = p_student_enrolment_id
      AND app_auth.can_access_student_profile(p_institution_id, sse.student_profile_id)
  );
$$;

CREATE OR REPLACE FUNCTION app_auth.is_hod_or_class_teacher_of_student(
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
  AND EXISTS (
    SELECT 1
    FROM public.student_session_enrolments sse
    JOIN public.grade_levels gl
      ON gl.institution_id = sse.institution_id
     AND gl.id = sse.grade_level_id
    JOIN public.academic_assignments aa
      ON aa.institution_id = sse.institution_id
     AND aa.session_id = sse.session_id
     AND aa.person_id = app_auth.current_person_id()
     AND aa.status = 'active'
     AND aa.starts_on <= CURRENT_DATE
     AND (aa.ends_on IS NULL OR aa.ends_on >= CURRENT_DATE)
    WHERE sse.institution_id = p_institution_id
      AND sse.student_profile_id = p_student_profile_id
      AND sse.status = 'active'
      AND (
        (aa.assignment_type = 'hod' AND aa.department_id = gl.department_id)
        OR (aa.assignment_type = 'class_teacher' AND aa.section_id = sse.section_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION app_auth.custom_field_sensitivity(
  p_institution_id uuid,
  p_definition_id uuid
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT cfd.sensitivity_level
  FROM public.custom_field_definitions cfd
  WHERE cfd.institution_id = p_institution_id
    AND cfd.id = p_definition_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_auth.can_read_custom_field(
  p_institution_id uuid,
  p_sensitivity text,
  p_entity_type text,
  p_entity_id uuid
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
      p_sensitivity = 'confidential'
      AND app_auth.has_institution_permission(p_institution_id, 'people.sensitive.read')
    )
    OR (
      p_sensitivity = 'restricted'
      AND (
        app_auth.has_institution_permission(p_institution_id, 'people.restricted.read')
        OR app_auth.has_institution_permission(p_institution_id, 'people.sensitive.read')
      )
    )
    OR (
      p_sensitivity = 'standard'
      AND (
        app_auth.has_institution_permission(p_institution_id, 'people.read')
        OR (
          p_entity_type = 'student'
          AND app_auth.can_access_student_profile(p_institution_id, p_entity_id)
        )
        OR (
          p_entity_type = 'staff'
          AND EXISTS (
            SELECT 1
            FROM public.staff_profiles st
            WHERE st.institution_id = p_institution_id
              AND st.id = p_entity_id
              AND st.person_id = app_auth.current_person_id()
          )
        )
      )
    )
  );
$$;

REVOKE ALL ON FUNCTION app_auth.can_access_student_profile(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_access_student_enrolment(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.is_hod_or_class_teacher_of_student(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.custom_field_sensitivity(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_read_custom_field(uuid, text, text, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION app_auth.can_access_student_profile(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_access_student_enrolment(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.is_hod_or_class_teacher_of_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.custom_field_sensitivity(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_read_custom_field(uuid, text, text, uuid) TO authenticated;

-- Enable and force RLS on all 19 Phase 2 tables
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_applications FORCE ROW LEVEL SECURITY;

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values FORCE ROW LEVEL SECURITY;

ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms FORCE ROW LEVEL SECURITY;

ALTER TABLE public.academic_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_departments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_levels FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections FORCE ROW LEVEL SECURITY;

ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams FORCE ROW LEVEL SECURITY;

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects FORCE ROW LEVEL SECURITY;

ALTER TABLE public.subject_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_offerings FORCE ROW LEVEL SECURITY;

ALTER TABLE public.student_session_enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_session_enrolments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.student_subject_enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subject_enrolments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.teaching_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_groups FORCE ROW LEVEL SECURITY;

ALTER TABLE public.teaching_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_group_memberships FORCE ROW LEVEL SECURITY;

ALTER TABLE public.academic_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_assignments FORCE ROW LEVEL SECURITY;

-- =====================================================================
-- 1. People Registry & Custom Field Policies
-- =====================================================================

-- student_profiles
CREATE POLICY student_profiles_select_scoped
  ON public.student_profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT app_auth.can_access_student_profile(institution_id, id)));

CREATE POLICY student_profiles_insert_manager
  ON public.student_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')));

CREATE POLICY student_profiles_update_manager
  ON public.student_profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')));

CREATE POLICY student_profiles_delete_manager
  ON public.student_profiles
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')));

-- staff_profiles
CREATE POLICY staff_profiles_select_self_or_reader
  ON public.staff_profiles
  FOR SELECT
  TO authenticated
  USING (
    (
      institution_id IN (SELECT app_auth.active_institution_ids())
      AND person_id = (SELECT app_auth.current_person_id())
    )
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.read'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'academics.manage'))
  );

CREATE POLICY staff_profiles_insert_manager
  ON public.staff_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')));

CREATE POLICY staff_profiles_update_manager
  ON public.staff_profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')));

CREATE POLICY staff_profiles_delete_manager
  ON public.staff_profiles
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')));

-- student_guardians
CREATE POLICY student_guardians_select_scoped
  ON public.student_guardians
  FOR SELECT
  TO authenticated
  USING (
    (
      institution_id IN (SELECT app_auth.active_institution_ids())
      AND (
        guardian_person_id = (SELECT app_auth.current_person_id())
        OR EXISTS (
          SELECT 1
          FROM public.student_profiles sp
          WHERE sp.institution_id = student_guardians.institution_id
            AND sp.id = student_guardians.student_profile_id
            AND sp.person_id = (SELECT app_auth.current_person_id())
        )
      )
    )
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.read'))
    OR (SELECT app_auth.is_hod_or_class_teacher_of_student(institution_id, student_profile_id))
  );

CREATE POLICY student_guardians_insert_manager
  ON public.student_guardians
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')));

CREATE POLICY student_guardians_update_manager
  ON public.student_guardians
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')));

CREATE POLICY student_guardians_delete_manager
  ON public.student_guardians
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')));

-- admission_applications
CREATE POLICY admission_applications_select_reader
  ON public.admission_applications
  FOR SELECT
  TO authenticated
  USING (
    (SELECT app_auth.has_institution_permission(institution_id, 'admissions.read'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.read'))
  );

CREATE POLICY admission_applications_insert_manager
  ON public.admission_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT app_auth.has_institution_permission(institution_id, 'admissions.manage'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
  );

CREATE POLICY admission_applications_update_manager
  ON public.admission_applications
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT app_auth.has_institution_permission(institution_id, 'admissions.manage'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
  )
  WITH CHECK (
    (SELECT app_auth.has_institution_permission(institution_id, 'admissions.manage'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
  );

CREATE POLICY admission_applications_delete_manager
  ON public.admission_applications
  FOR DELETE
  TO authenticated
  USING (
    (SELECT app_auth.has_institution_permission(institution_id, 'admissions.manage'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
  );

-- custom_field_definitions
CREATE POLICY custom_field_definitions_select_by_sensitivity
  ON public.custom_field_definitions
  FOR SELECT
  TO authenticated
  USING (
    institution_id IN (SELECT app_auth.active_institution_ids())
    AND (
      sensitivity_level = 'standard'
      OR (
        sensitivity_level = 'restricted'
        AND (
          (SELECT app_auth.has_institution_permission(institution_id, 'people.restricted.read'))
          OR (SELECT app_auth.has_institution_permission(institution_id, 'people.sensitive.read'))
          OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
        )
      )
      OR (
        sensitivity_level = 'confidential'
        AND (
          (SELECT app_auth.has_institution_permission(institution_id, 'people.sensitive.read'))
          OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
        )
      )
    )
  );

CREATE POLICY custom_field_definitions_insert_manager
  ON public.custom_field_definitions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')));

CREATE POLICY custom_field_definitions_update_manager
  ON public.custom_field_definitions
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')));

CREATE POLICY custom_field_definitions_delete_manager
  ON public.custom_field_definitions
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'people.manage')));

-- custom_field_values
CREATE POLICY custom_field_values_select_by_sensitivity
  ON public.custom_field_values
  FOR SELECT
  TO authenticated
  USING (
    (SELECT app_auth.can_read_custom_field(
      institution_id,
      app_auth.custom_field_sensitivity(institution_id, definition_id),
      entity_type,
      entity_id
    ))
  );

CREATE POLICY custom_field_values_insert_manager
  ON public.custom_field_values
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
    AND (
      (SELECT app_auth.custom_field_sensitivity(institution_id, definition_id)) <> 'confidential'
      OR (SELECT app_auth.has_institution_permission(institution_id, 'people.sensitive.write'))
    )
  );

CREATE POLICY custom_field_values_update_manager
  ON public.custom_field_values
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
    AND (
      (SELECT app_auth.custom_field_sensitivity(institution_id, definition_id)) <> 'confidential'
      OR (SELECT app_auth.has_institution_permission(institution_id, 'people.sensitive.write'))
    )
  )
  WITH CHECK (
    (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
    AND (
      (SELECT app_auth.custom_field_sensitivity(institution_id, definition_id)) <> 'confidential'
      OR (SELECT app_auth.has_institution_permission(institution_id, 'people.sensitive.write'))
    )
  );

CREATE POLICY custom_field_values_delete_manager
  ON public.custom_field_values
  FOR DELETE
  TO authenticated
  USING (
    (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
    AND (
      (SELECT app_auth.custom_field_sensitivity(institution_id, definition_id)) <> 'confidential'
      OR (SELECT app_auth.has_institution_permission(institution_id, 'people.sensitive.write'))
    )
  );

-- =====================================================================
-- 2. Academic Structure Catalogue Policies (active read, academics.manage write)
-- =====================================================================

-- academic_sessions
CREATE POLICY academic_sessions_select_active_members
  ON public.academic_sessions
  FOR SELECT
  TO authenticated
  USING (institution_id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY academic_sessions_insert_manager
  ON public.academic_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY academic_sessions_update_manager
  ON public.academic_sessions
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY academic_sessions_delete_manager
  ON public.academic_sessions
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

-- academic_terms
CREATE POLICY academic_terms_select_active_members
  ON public.academic_terms
  FOR SELECT
  TO authenticated
  USING (institution_id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY academic_terms_insert_manager
  ON public.academic_terms
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY academic_terms_update_manager
  ON public.academic_terms
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY academic_terms_delete_manager
  ON public.academic_terms
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

-- academic_departments
CREATE POLICY academic_departments_select_active_members
  ON public.academic_departments
  FOR SELECT
  TO authenticated
  USING (institution_id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY academic_departments_insert_manager
  ON public.academic_departments
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY academic_departments_update_manager
  ON public.academic_departments
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY academic_departments_delete_manager
  ON public.academic_departments
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

-- grade_levels
CREATE POLICY grade_levels_select_active_members
  ON public.grade_levels
  FOR SELECT
  TO authenticated
  USING (institution_id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY grade_levels_insert_manager
  ON public.grade_levels
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY grade_levels_update_manager
  ON public.grade_levels
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY grade_levels_delete_manager
  ON public.grade_levels
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

-- sections
CREATE POLICY sections_select_active_members
  ON public.sections
  FOR SELECT
  TO authenticated
  USING (institution_id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY sections_insert_manager
  ON public.sections
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY sections_update_manager
  ON public.sections
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY sections_delete_manager
  ON public.sections
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

-- streams
CREATE POLICY streams_select_active_members
  ON public.streams
  FOR SELECT
  TO authenticated
  USING (institution_id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY streams_insert_manager
  ON public.streams
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY streams_update_manager
  ON public.streams
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY streams_delete_manager
  ON public.streams
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

-- subjects
CREATE POLICY subjects_select_active_members
  ON public.subjects
  FOR SELECT
  TO authenticated
  USING (institution_id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY subjects_insert_manager
  ON public.subjects
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY subjects_update_manager
  ON public.subjects
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY subjects_delete_manager
  ON public.subjects
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

-- subject_offerings
CREATE POLICY subject_offerings_select_active_members
  ON public.subject_offerings
  FOR SELECT
  TO authenticated
  USING (institution_id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY subject_offerings_insert_manager
  ON public.subject_offerings
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY subject_offerings_update_manager
  ON public.subject_offerings
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY subject_offerings_delete_manager
  ON public.subject_offerings
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

-- teaching_groups
CREATE POLICY teaching_groups_select_active_members
  ON public.teaching_groups
  FOR SELECT
  TO authenticated
  USING (institution_id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY teaching_groups_insert_manager
  ON public.teaching_groups
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY teaching_groups_update_manager
  ON public.teaching_groups
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY teaching_groups_delete_manager
  ON public.teaching_groups
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

-- academic_assignments
CREATE POLICY academic_assignments_select_active_members
  ON public.academic_assignments
  FOR SELECT
  TO authenticated
  USING (institution_id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY academic_assignments_insert_manager
  ON public.academic_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY academic_assignments_update_manager
  ON public.academic_assignments
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY academic_assignments_delete_manager
  ON public.academic_assignments
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

-- =====================================================================
-- 3. Relationship-Scoped Student Enrolment & Group Membership Policies
-- =====================================================================

-- student_session_enrolments
CREATE POLICY student_session_enrolments_select_scoped
  ON public.student_session_enrolments
  FOR SELECT
  TO authenticated
  USING ((SELECT app_auth.can_access_student_profile(institution_id, student_profile_id)));

CREATE POLICY student_session_enrolments_insert_manager
  ON public.student_session_enrolments
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY student_session_enrolments_update_manager
  ON public.student_session_enrolments
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY student_session_enrolments_delete_manager
  ON public.student_session_enrolments
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

-- student_subject_enrolments
CREATE POLICY student_subject_enrolments_select_scoped
  ON public.student_subject_enrolments
  FOR SELECT
  TO authenticated
  USING ((SELECT app_auth.can_access_student_enrolment(institution_id, student_enrolment_id)));

CREATE POLICY student_subject_enrolments_insert_manager
  ON public.student_subject_enrolments
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY student_subject_enrolments_update_manager
  ON public.student_subject_enrolments
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY student_subject_enrolments_delete_manager
  ON public.student_subject_enrolments
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

-- teaching_group_memberships
CREATE POLICY teaching_group_memberships_select_scoped
  ON public.teaching_group_memberships
  FOR SELECT
  TO authenticated
  USING ((SELECT app_auth.can_access_student_enrolment(institution_id, student_enrolment_id)));

CREATE POLICY teaching_group_memberships_insert_manager
  ON public.teaching_group_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY teaching_group_memberships_update_manager
  ON public.teaching_group_memberships
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')))
  WITH CHECK ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));

CREATE POLICY teaching_group_memberships_delete_manager
  ON public.teaching_group_memberships
  FOR DELETE
  TO authenticated
  USING ((SELECT app_auth.has_institution_permission(institution_id, 'academics.manage')));
