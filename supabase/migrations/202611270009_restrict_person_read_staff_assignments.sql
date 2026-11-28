-- P2-M05 Migration 9: Tighten rule (c) of app_auth.can_read_person_profile so
-- institution-wide directory visibility applies ONLY to staff leadership and
-- teaching assignments ('hod', 'class_teacher', 'subject_teacher'), never to
-- student 'monitor' / 'monitress' rows (which remain relationship-scoped via
-- can_access_student_profile).

CREATE OR REPLACE FUNCTION app_auth.can_read_person_profile(p_person_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_profiles sp
    WHERE sp.person_id = p_person_id
      AND sp.institution_id IN (SELECT app_auth.active_institution_ids())
      AND app_auth.can_access_student_profile(sp.institution_id, sp.id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.staff_profiles st
    WHERE st.person_id = p_person_id
      AND st.institution_id IN (SELECT app_auth.active_institution_ids())
      AND (
        app_auth.has_institution_permission(st.institution_id, 'people.read')
        OR app_auth.has_institution_permission(st.institution_id, 'academics.manage')
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.student_guardians sg
    WHERE sg.guardian_person_id = p_person_id
      AND sg.status = 'active'
      AND sg.institution_id IN (SELECT app_auth.active_institution_ids())
      AND (
        app_auth.has_institution_permission(sg.institution_id, 'people.read')
        OR app_auth.has_institution_permission(sg.institution_id, 'academics.manage')
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.academic_assignments aa
    WHERE aa.person_id = p_person_id
      AND aa.institution_id IN (SELECT app_auth.active_institution_ids())
      AND aa.assignment_type IN ('hod', 'class_teacher', 'subject_teacher')
      AND aa.status = 'active'
      AND aa.starts_on <= CURRENT_DATE
      AND (aa.ends_on IS NULL OR aa.ends_on >= CURRENT_DATE)
  );
$$;

REVOKE ALL ON FUNCTION app_auth.can_read_person_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_auth.can_read_person_profile(uuid) TO authenticated;
