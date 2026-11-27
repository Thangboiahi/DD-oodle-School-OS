import "server-only";

import type {
  ActiveRoleAssignment,
  MembershipStatus,
  PermissionScopeType,
  RoleAssignmentStatus,
} from "@/lib/auth/permissions";
import { getOptionalPublicSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  InstitutionMembershipSummaryDto,
  InstitutionSummaryDto,
  PersonProfileDto,
  PersonWorkspaceDto,
  PlatformOperatorDto,
  VerifiedAuthResult,
} from "@/server/auth/types";

type RawPersonRow = {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  display_name: string | null;
  primary_email: string | null;
  status: "active" | "inactive" | "archived";
};

type RawPlatformOperatorRow = {
  person_id: string;
  operator_role: "super_admin" | "support_agent" | "auditor";
  status: "active" | "suspended" | "revoked";
};

type RawInstitutionRow = {
  id: string;
  slug: string;
  name: string;
  board: string;
  status: "onboarding" | "active" | "suspended" | "archived";
  default_theme_family: "clarity" | "calm" | "focus";
  timezone: string;
};

type RawMembershipRow = {
  id: string;
  institution_id: string;
  status: MembershipStatus;
  joined_at: string;
  institution: RawInstitutionRow | RawInstitutionRow[] | null;
};

type RawRoleRow = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  permissions: unknown;
};

type RawRoleAssignmentRow = {
  id: string;
  institution_id: string;
  membership_id: string;
  scope_type: PermissionScopeType;
  scope_ref_id: string | null;
  starts_at: string;
  ends_at: string | null;
  status: RoleAssignmentStatus;
  role: RawRoleRow | RawRoleRow[] | null;
};

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizePermissions(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === "string");
}

/**
 * Verifies the authenticated caller on the server via `supabase.auth.getClaims()`.
 * Never trusts `getSession()` on the server, and returns `{ configured: false, identity: null }`
 * when public Supabase env vars are absent so public/build routes never fail.
 */
export async function getVerifiedAuthIdentity(): Promise<VerifiedAuthResult> {
  const env = getOptionalPublicSupabaseEnv();
  if (!env) {
    return { configured: false, identity: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    return { configured: true, identity: null };
  }

  const email =
    typeof data.claims.email === "string" ? data.claims.email : null;

  return {
    configured: true,
    identity: {
      authUserId: data.claims.sub,
      email,
    },
  };
}

/**
 * Loads the current authenticated person's profile, active institution memberships,
 * scoped/time-bound role assignments, and platform operator record strictly through
 * the RLS-enforced user client (never the admin/secret client).
 */
export async function getCurrentPersonWorkspace(): Promise<{
  configured: boolean;
  workspace: PersonWorkspaceDto | null;
}> {
  const auth = await getVerifiedAuthIdentity();
  if (!auth.configured) {
    return { configured: false, workspace: null };
  }
  if (!auth.identity) {
    return { configured: true, workspace: null };
  }

  const supabase = await createSupabaseServerClient();

  const { data: personRow, error: personError } = await supabase
    .from("persons")
    .select("id, auth_user_id, full_name, display_name, primary_email, status")
    .eq("auth_user_id", auth.identity.authUserId)
    .eq("status", "active")
    .maybeSingle<RawPersonRow>();

  if (personError || !personRow || !personRow.auth_user_id) {
    return { configured: true, workspace: null };
  }

  const person: PersonProfileDto = {
    id: personRow.id,
    authUserId: personRow.auth_user_id,
    fullName: personRow.full_name,
    displayName: personRow.display_name,
    primaryEmail: personRow.primary_email,
    status: personRow.status,
  };

  const [membershipsRes, assignmentsRes, operatorRes] = await Promise.all([
    supabase
      .from("institution_memberships")
      .select(
        "id, institution_id, status, joined_at, institution:institutions(id, slug, name, board, status, default_theme_family, timezone)",
      )
      .eq("person_id", person.id)
      .eq("status", "active")
      .returns<RawMembershipRow[]>(),
    supabase
      .from("role_assignments")
      .select(
        "id, institution_id, membership_id, scope_type, scope_ref_id, starts_at, ends_at, status, role:institution_roles(id, code, name, is_active, permissions)",
      )
      .eq("status", "active")
      .returns<RawRoleAssignmentRow[]>(),
    supabase
      .from("platform_operators")
      .select("person_id, operator_role, status")
      .eq("person_id", person.id)
      .maybeSingle<RawPlatformOperatorRow>(),
  ]);

  const assignmentsByMembership = new Map<string, ActiveRoleAssignment[]>();
  for (const row of assignmentsRes.data ?? []) {
    const role = unwrapJoin(row.role);
    if (!role) {
      continue;
    }

    const list = assignmentsByMembership.get(row.membership_id) ?? [];
    list.push({
      assignmentId: row.id,
      roleId: role.id,
      roleCode: role.code,
      roleName: role.name,
      roleIsActive: role.is_active,
      permissions: normalizePermissions(role.permissions),
      scopeType: row.scope_type,
      scopeRefId: row.scope_ref_id,
      status: row.status,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
    });
    assignmentsByMembership.set(row.membership_id, list);
  }

  const memberships: InstitutionMembershipSummaryDto[] = [];
  for (const row of membershipsRes.data ?? []) {
    const inst = unwrapJoin(row.institution);
    if (!inst) {
      continue;
    }

    const institution: InstitutionSummaryDto = {
      id: inst.id,
      slug: inst.slug,
      name: inst.name,
      board: inst.board,
      status: inst.status,
      defaultThemeFamily: inst.default_theme_family,
      timezone: inst.timezone,
    };

    memberships.push({
      membershipId: row.id,
      membershipStatus: row.status,
      joinedAt: row.joined_at,
      institution,
      assignments: assignmentsByMembership.get(row.id) ?? [],
    });
  }

  const platformOperator: PlatformOperatorDto | null = operatorRes.data
    ? {
        personId: operatorRes.data.person_id,
        operatorRole: operatorRes.data.operator_role,
        status: operatorRes.data.status,
      }
    : null;

  return {
    configured: true,
    workspace: {
      person,
      memberships,
      platformOperator,
    },
  };
}
