-- P2-M05 Migration 8: Relationship-scoped read access on public.persons
-- so institution principals, HODs, class/subject teachers, guardians, and
-- section monitors can resolve joined display names for authorized profiles
-- without exposing cross-tenant persons, unauthorized students, or platform rows.

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
      AND aa.status = 'active'
      AND aa.starts_on <= CURRENT_DATE
      AND (aa.ends_on IS NULL OR aa.ends_on >= CURRENT_DATE)
  );
$$;

REVOKE ALL ON FUNCTION app_auth.can_read_person_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_auth.can_read_person_profile(uuid) TO authenticated;

CREATE POLICY persons_select_relationship_scoped
  ON public.persons
  FOR SELECT
  TO authenticated
  USING (app_auth.can_read_person_profile(id));
