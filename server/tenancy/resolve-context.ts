import "server-only";

import {
  resolveTenantHint,
  tenantSlugSchema,
} from "@/lib/tenancy/resolve-tenant-hint";
import { getCurrentPersonWorkspace } from "@/server/auth/session";
import type {
  PersonWorkspaceDto,
  TenantResolutionResult,
} from "@/server/auth/types";

/**
 * Pure server-domain tenant resolver: validates the slug hint strictly and
 * confirms active PostgreSQL membership in `workspace.memberships`.
 * Nonexistent slugs and unauthorized tenants return an identical `{ status: "denied" }`
 * response to prevent tenant enumeration.
 */
export function resolveTenantContextFromWorkspace(
  workspace: PersonWorkspaceDto | null,
  rawSlug: string,
  isConfigured: boolean,
): TenantResolutionResult {
  if (!isConfigured) {
    return { status: "unconfigured" };
  }

  if (!workspace) {
    return { status: "unauthenticated" };
  }

  const normalizedSlug = rawSlug.trim().toLowerCase();
  if (!tenantSlugSchema.safeParse(normalizedSlug).success) {
    return { status: "denied" };
  }

  const hint = resolveTenantHint({ pathname: `/t/${normalizedSlug}` });
  if (hint.kind !== "tenant") {
    return { status: "denied" };
  }

  const membership = workspace.memberships.find(
    (entry) =>
      entry.institution.slug === hint.slug &&
      entry.membershipStatus === "active",
  );

  if (!membership) {
    return { status: "denied" };
  }

  return {
    status: "ok",
    workspace,
    context: {
      personId: workspace.person.id,
      authUserId: workspace.person.authUserId,
      institutionId: membership.institution.id,
      institutionSlug: membership.institution.slug,
      institutionName: membership.institution.name,
      institutionBoard: membership.institution.board,
      institutionTimezone: membership.institution.timezone,
      defaultThemeFamily: membership.institution.defaultThemeFamily,
      membershipId: membership.membershipId,
      membershipStatus: membership.membershipStatus,
      assignments: membership.assignments,
      isPlatformOperator: workspace.platformOperator?.status === "active",
    },
  };
}

/**
 * Authoritative server-side tenant resolution for `/t/[slug]` layouts, pages, and Server Actions.
 */
export async function resolveVerifiedTenantContext(
  rawSlug: string,
): Promise<TenantResolutionResult> {
  const { configured, workspace } = await getCurrentPersonWorkspace();
  return resolveTenantContextFromWorkspace(workspace, rawSlug, configured);
}
