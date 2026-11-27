-- P1-M03 Migration 1: Private auth helper schema, core multi-tenant tables,
-- composite tenant FKs, audit immutability, updated_at triggers, and indexes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Private schema for RLS helper functions (not exposed via PostgREST schemas)
CREATE SCHEMA IF NOT EXISTS app_auth;
REVOKE ALL ON SCHEMA app_auth FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_auth TO authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'public.audit_events is append-only; UPDATE and DELETE are prohibited';
END;
$$;

-- Layer 1: One global human person identity across all institutions (ADR-0002)
CREATE TABLE public.persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  display_name text,
  primary_email text,
  primary_phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Platform-level operators separated from institutional authority (Blueprint §4.3)
CREATE TABLE public.platform_operators (
  person_id uuid PRIMARY KEY REFERENCES public.persons(id) ON DELETE RESTRICT,
  operator_role text NOT NULL CHECK (operator_role IN ('super_admin', 'support_agent', 'auditor')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tenant root entity (ADR-0001)
CREATE TABLE public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  name text NOT NULL,
  board text NOT NULL DEFAULT 'CBSE',
  status text NOT NULL DEFAULT 'onboarding' CHECK (status IN ('onboarding', 'active', 'suspended', 'archived')),
  default_theme_family text NOT NULL DEFAULT 'clarity' CHECK (default_theme_family IN ('clarity', 'calm', 'focus')),
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Concurrent institution memberships per global person (ADR-0002)
CREATE TABLE public.institution_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended', 'revoked')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, person_id),
  UNIQUE (institution_id, id)
);

-- Configurable institution role bundles (Blueprint §4.2)
CREATE TABLE public.institution_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(permissions) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, code),
  UNIQUE (institution_id, id)
);

-- Time-bound & scoped role assignments with composite tenant-safe FKs (Blueprint §3.4 & ADR-0002)
CREATE TABLE public.role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  membership_id uuid NOT NULL,
  role_id uuid NOT NULL,
  scope_type text NOT NULL DEFAULT 'institution' CHECK (scope_type IN ('institution', 'campus', 'department', 'class', 'section', 'teaching_group', 'self')),
  scope_ref_id uuid,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'delegated', 'expired', 'revoked')),
  assigned_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at),
  FOREIGN KEY (institution_id, membership_id) REFERENCES public.institution_memberships(institution_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, role_id) REFERENCES public.institution_roles(institution_id, id) ON DELETE RESTRICT
);

-- Append-only institutional and platform audit log (Blueprint §4.3)
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE RESTRICT,
  actor_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  actor_auth_user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  reason text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_audit_events_immutable
  BEFORE UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_event_mutation();

CREATE TRIGGER trg_persons_updated_at
  BEFORE UPDATE ON public.persons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_platform_operators_updated_at
  BEFORE UPDATE ON public.platform_operators
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_institutions_updated_at
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_institution_memberships_updated_at
  BEFORE UPDATE ON public.institution_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_institution_roles_updated_at
  BEFORE UPDATE ON public.institution_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_role_assignments_updated_at
  BEFORE UPDATE ON public.role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- B-tree indexes on RLS filter and foreign-key columns
CREATE INDEX idx_persons_auth_user_id
  ON public.persons (auth_user_id);

CREATE INDEX idx_institution_memberships_person_status
  ON public.institution_memberships (person_id, status);

CREATE INDEX idx_institution_memberships_institution_status
  ON public.institution_memberships (institution_id, status);

CREATE INDEX idx_institution_roles_institution_id
  ON public.institution_roles (institution_id);

CREATE INDEX idx_role_assignments_institution_membership_status
  ON public.role_assignments (institution_id, membership_id, status);

CREATE INDEX idx_role_assignments_institution_role
  ON public.role_assignments (institution_id, role_id);

CREATE INDEX idx_audit_events_institution_created_at
  ON public.audit_events (institution_id, created_at DESC);
