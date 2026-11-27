-- P1-M03 Migration 2: Private app_auth security-definer helpers and strict RLS policies.

CREATE OR REPLACE FUNCTION app_auth.current_person_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id
  FROM public.persons p
  WHERE p.auth_user_id = (SELECT auth.uid())
    AND p.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_auth.active_institution_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT im.institution_id
  FROM public.institution_memberships im
  WHERE im.person_id = app_auth.current_person_id()
    AND im.status = 'active';
$$;

CREATE OR REPLACE FUNCTION app_auth.has_institution_permission(
  p_institution_id uuid,
  p_permission text
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
    JOIN public.role_assignments ra
      ON ra.institution_id = im.institution_id
     AND ra.membership_id = im.id
    JOIN public.institution_roles ir
      ON ir.institution_id = ra.institution_id
     AND ir.id = ra.role_id
    WHERE im.institution_id = p_institution_id
      AND im.person_id = app_auth.current_person_id()
      AND im.status = 'active'
      AND ra.status = 'active'
      AND ra.starts_at <= now()
      AND (ra.ends_at IS NULL OR ra.ends_at > now())
      AND ir.is_active = true
      AND (ir.permissions ? p_permission OR ir.permissions ? 'institution.*')
  );
$$;

CREATE OR REPLACE FUNCTION app_auth.can_read_person(p_person_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_memberships target_im
    WHERE target_im.person_id = p_person_id
      AND target_im.status IN ('invited', 'active', 'suspended')
      AND target_im.institution_id IN (SELECT app_auth.active_institution_ids())
      AND app_auth.has_institution_permission(target_im.institution_id, 'people.read')
  );
$$;

REVOKE ALL ON FUNCTION app_auth.current_person_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.active_institution_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.has_institution_permission(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_auth.can_read_person(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION app_auth.current_person_id() TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.active_institution_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.has_institution_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION app_auth.can_read_person(uuid) TO authenticated;

-- Enforce RLS even for table owners across all 7 core public tables
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons FORCE ROW LEVEL SECURITY;

ALTER TABLE public.platform_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_operators FORCE ROW LEVEL SECURITY;

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.institution_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_memberships FORCE ROW LEVEL SECURITY;

ALTER TABLE public.institution_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_roles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events FORCE ROW LEVEL SECURITY;

-- Restrict UPDATE on public.persons to non-privilege profile fields only
REVOKE UPDATE ON public.persons FROM authenticated;
GRANT UPDATE (full_name, display_name, primary_email, primary_phone) ON public.persons TO authenticated;

-- 1. public.persons policies
CREATE POLICY persons_select_self_or_institution_admin
  ON public.persons
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT app_auth.current_person_id())
    OR app_auth.can_read_person(id)
  );

CREATE POLICY persons_update_self_profile
  ON public.persons
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT app_auth.current_person_id()))
  WITH CHECK (id = (SELECT app_auth.current_person_id()));

-- 2. public.platform_operators policies (self-read only; zero automatic tenant access)
CREATE POLICY platform_operators_select_self
  ON public.platform_operators
  FOR SELECT
  TO authenticated
  USING (person_id = (SELECT app_auth.current_person_id()));

-- 3. public.institutions policies
CREATE POLICY institutions_select_active_members
  ON public.institutions
  FOR SELECT
  TO authenticated
  USING (id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY institutions_update_with_permission
  ON public.institutions
  FOR UPDATE
  TO authenticated
  USING (app_auth.has_institution_permission(id, 'institution.manage'))
  WITH CHECK (app_auth.has_institution_permission(id, 'institution.manage'));

-- 4. public.institution_memberships policies
CREATE POLICY institution_memberships_select_self_or_reader
  ON public.institution_memberships
  FOR SELECT
  TO authenticated
  USING (
    person_id = (SELECT app_auth.current_person_id())
    OR app_auth.has_institution_permission(institution_id, 'memberships.read')
  );

CREATE POLICY institution_memberships_insert_manager
  ON public.institution_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (app_auth.has_institution_permission(institution_id, 'memberships.manage'));

CREATE POLICY institution_memberships_update_manager
  ON public.institution_memberships
  FOR UPDATE
  TO authenticated
  USING (app_auth.has_institution_permission(institution_id, 'memberships.manage'))
  WITH CHECK (app_auth.has_institution_permission(institution_id, 'memberships.manage'));

CREATE POLICY institution_memberships_delete_manager
  ON public.institution_memberships
  FOR DELETE
  TO authenticated
  USING (app_auth.has_institution_permission(institution_id, 'memberships.manage'));

-- 5. public.institution_roles policies
CREATE POLICY institution_roles_select_active_members
  ON public.institution_roles
  FOR SELECT
  TO authenticated
  USING (institution_id IN (SELECT app_auth.active_institution_ids()));

CREATE POLICY institution_roles_insert_manager
  ON public.institution_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (app_auth.has_institution_permission(institution_id, 'roles.manage'));

CREATE POLICY institution_roles_update_manager
  ON public.institution_roles
  FOR UPDATE
  TO authenticated
  USING (app_auth.has_institution_permission(institution_id, 'roles.manage'))
  WITH CHECK (app_auth.has_institution_permission(institution_id, 'roles.manage'));

CREATE POLICY institution_roles_delete_manager
  ON public.institution_roles
  FOR DELETE
  TO authenticated
  USING (app_auth.has_institution_permission(institution_id, 'roles.manage'));

-- 6. public.role_assignments policies
CREATE POLICY role_assignments_select_self_or_reader
  ON public.role_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.institution_memberships im
      WHERE im.id = role_assignments.membership_id
        AND im.institution_id = role_assignments.institution_id
        AND im.person_id = (SELECT app_auth.current_person_id())
        AND im.status = 'active'
    )
    OR app_auth.has_institution_permission(institution_id, 'roles.read')
  );

CREATE POLICY role_assignments_insert_manager
  ON public.role_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (app_auth.has_institution_permission(institution_id, 'roles.manage'));

CREATE POLICY role_assignments_update_manager
  ON public.role_assignments
  FOR UPDATE
  TO authenticated
  USING (app_auth.has_institution_permission(institution_id, 'roles.manage'))
  WITH CHECK (app_auth.has_institution_permission(institution_id, 'roles.manage'));

CREATE POLICY role_assignments_delete_manager
  ON public.role_assignments
  FOR DELETE
  TO authenticated
  USING (app_auth.has_institution_permission(institution_id, 'roles.manage'));

-- 7. public.audit_events policies (append-only; NO UPDATE/DELETE policies)
CREATE POLICY audit_events_select_auditor
  ON public.audit_events
  FOR SELECT
  TO authenticated
  USING (
    institution_id IS NOT NULL
    AND app_auth.has_institution_permission(institution_id, 'audit.read')
  );

CREATE POLICY audit_events_insert_active_actor
  ON public.audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    institution_id IS NOT NULL
    AND institution_id IN (SELECT app_auth.active_institution_ids())
    AND actor_person_id = (SELECT app_auth.current_person_id())
  );
