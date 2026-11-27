export type PermissionScopeType =
  | "institution"
  | "campus"
  | "department"
  | "class"
  | "section"
  | "teaching_group"
  | "self";

export type MembershipStatus = "invited" | "active" | "suspended" | "revoked";

export type RoleAssignmentStatus =
  | "active"
  | "delegated"
  | "expired"
  | "revoked";

export interface ActiveRoleAssignment {
  assignmentId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  roleIsActive: boolean;
  permissions: readonly string[];
  scopeType: PermissionScopeType;
  scopeRefId: string | null;
  status: RoleAssignmentStatus;
  startsAt: string;
  endsAt: string | null;
}

export interface VerifiedTenantContext {
  personId: string;
  authUserId: string;
  institutionId: string;
  institutionSlug: string;
  institutionName: string;
  institutionBoard: string;
  institutionTimezone: string;
  defaultThemeFamily: "clarity" | "calm" | "focus";
  membershipId: string;
  membershipStatus: MembershipStatus;
  assignments: readonly ActiveRoleAssignment[];
  /**
   * Informational flag only. Platform operator status NEVER grants
   * any institutional authority or permission.
   */
  isPlatformOperator?: boolean;
}

export interface PermissionRequirement {
  permission: string;
  scopeType?: PermissionScopeType;
  scopeRefId?: string | null;
}

export type PermissionDenialReason =
  | "inactive-membership"
  | "missing-permission"
  | "scope-mismatch";

export type PermissionDecision =
  | {
      allowed: true;
      matchedAssignmentId: string;
      matchedRoleCode: string;
      matchedScopeType: PermissionScopeType;
    }
  | {
      allowed: false;
      reason: PermissionDenialReason;
    };

export function isAssignmentActiveAt(
  assignment: ActiveRoleAssignment,
  now: Date = new Date(),
): boolean {
  if (assignment.status !== "active" || !assignment.roleIsActive) {
    return false;
  }

  const startsAtMs = Date.parse(assignment.startsAt);
  if (Number.isNaN(startsAtMs) || startsAtMs > now.getTime()) {
    return false;
  }

  if (assignment.endsAt !== null) {
    const endsAtMs = Date.parse(assignment.endsAt);
    if (Number.isNaN(endsAtMs) || endsAtMs <= now.getTime()) {
      return false;
    }
  }

  return true;
}

function assignmentSatisfiesScope(
  assignment: ActiveRoleAssignment,
  requirement: PermissionRequirement,
): boolean {
  if (assignment.scopeType === "institution") {
    return true;
  }

  if (!requirement.scopeType) {
    return true;
  }

  if (assignment.scopeType !== requirement.scopeType) {
    return false;
  }

  if (requirement.scopeRefId !== undefined && requirement.scopeRefId !== null) {
    return assignment.scopeRefId === requirement.scopeRefId;
  }

  return true;
}

/**
 * Pure, deterministic RBAC + scope + time evaluation for a server-verified tenant context.
 * Platform operator status is explicitly ignored and NEVER grants institutional access.
 */
export function evaluatePermission(
  context: VerifiedTenantContext,
  requirement: PermissionRequirement,
  now: Date = new Date(),
): PermissionDecision {
  if (context.membershipStatus !== "active") {
    return { allowed: false, reason: "inactive-membership" };
  }

  const activeAssignments = context.assignments.filter((assignment) =>
    isAssignmentActiveAt(assignment, now),
  );

  let hadPermissionMatchWithScopeMismatch = false;

  for (const assignment of activeAssignments) {
    const grantsPermission =
      assignment.permissions.includes("institution.*") ||
      assignment.permissions.includes(requirement.permission);

    if (!grantsPermission) {
      continue;
    }

    if (assignmentSatisfiesScope(assignment, requirement)) {
      return {
        allowed: true,
        matchedAssignmentId: assignment.assignmentId,
        matchedRoleCode: assignment.roleCode,
        matchedScopeType: assignment.scopeType,
      };
    }

    hadPermissionMatchWithScopeMismatch = true;
  }

  return {
    allowed: false,
    reason: hadPermissionMatchWithScopeMismatch
      ? "scope-mismatch"
      : "missing-permission",
  };
}
