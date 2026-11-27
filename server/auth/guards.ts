import "server-only";

import {
  evaluatePermission,
  type PermissionDecision,
  type PermissionRequirement,
  type VerifiedTenantContext,
} from "@/lib/auth/permissions";
import { getCurrentPersonWorkspace } from "@/server/auth/session";
import type {
  PersonWorkspaceDto,
  PlatformOperatorDto,
} from "@/server/auth/types";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export type InstitutionPermissionGuardResult =
  | {
      ok: true;
      context: VerifiedTenantContext;
      decision: Extract<PermissionDecision, { allowed: true }>;
    }
  | {
      ok: false;
      status: 401 | 403 | 503;
      reason: string;
    };

export type PlatformOperatorGuardResult =
  | {
      ok: true;
      workspace: PersonWorkspaceDto;
      operator: PlatformOperatorDto;
    }
  | {
      ok: false;
      status: 401 | 403 | 503;
      reason: string;
    };

export async function requireInstitutionPermission(
  slug: string,
  requirement: PermissionRequirement,
): Promise<InstitutionPermissionGuardResult> {
  const resolution = await resolveVerifiedTenantContext(slug);

  if (resolution.status === "unconfigured") {
    return { ok: false, status: 503, reason: "supabase-unconfigured" };
  }
  if (resolution.status === "unauthenticated") {
    return { ok: false, status: 401, reason: "unauthenticated" };
  }
  if (resolution.status === "denied") {
    return { ok: false, status: 403, reason: "tenant-access-denied" };
  }

  const decision = evaluatePermission(resolution.context, requirement);
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  return { ok: true, context: resolution.context, decision };
}

/**
 * Verifies an active `public.platform_operators` row completely independent of
 * any institutional role (Blueprint Part A §2.4 & §4.3).
 */
export async function requirePlatformOperator(): Promise<PlatformOperatorGuardResult> {
  const { configured, workspace } = await getCurrentPersonWorkspace();

  if (!configured) {
    return { ok: false, status: 503, reason: "supabase-unconfigured" };
  }
  if (!workspace) {
    return { ok: false, status: 401, reason: "unauthenticated" };
  }
  if (workspace.platformOperator?.status !== "active") {
    return { ok: false, status: 403, reason: "platform-operator-required" };
  }

  return {
    ok: true,
    workspace,
    operator: workspace.platformOperator,
  };
}
