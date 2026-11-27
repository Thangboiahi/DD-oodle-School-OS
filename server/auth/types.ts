import "server-only";

import type {
  ActiveRoleAssignment,
  MembershipStatus,
  VerifiedTenantContext,
} from "@/lib/auth/permissions";

export interface VerifiedAuthIdentity {
  authUserId: string;
  email: string | null;
}

export interface VerifiedAuthResult {
  configured: boolean;
  identity: VerifiedAuthIdentity | null;
}

export interface PersonProfileDto {
  id: string;
  authUserId: string;
  fullName: string;
  displayName: string | null;
  primaryEmail: string | null;
  status: "active" | "inactive" | "archived";
}

export interface PlatformOperatorDto {
  personId: string;
  operatorRole: "super_admin" | "support_agent" | "auditor";
  status: "active" | "suspended" | "revoked";
}

export interface InstitutionSummaryDto {
  id: string;
  slug: string;
  name: string;
  board: string;
  status: "onboarding" | "active" | "suspended" | "archived";
  defaultThemeFamily: "clarity" | "calm" | "focus";
  timezone: string;
}

export interface InstitutionMembershipSummaryDto {
  membershipId: string;
  membershipStatus: MembershipStatus;
  joinedAt: string;
  institution: InstitutionSummaryDto;
  assignments: readonly ActiveRoleAssignment[];
}

export interface PersonWorkspaceDto {
  person: PersonProfileDto;
  memberships: readonly InstitutionMembershipSummaryDto[];
  platformOperator: PlatformOperatorDto | null;
}

export type TenantResolutionResult =
  | {
      status: "ok";
      context: VerifiedTenantContext;
      workspace: PersonWorkspaceDto;
    }
  | { status: "unconfigured" }
  | { status: "unauthenticated" }
  | { status: "denied" };
