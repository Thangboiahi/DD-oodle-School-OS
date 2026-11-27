import { z } from "zod";

/**
 * Reserved host/path slugs that must never resolve as an institution tenant.
 */
export const RESERVED_TENANT_SLUGS = new Set<string>([
  "account",
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "billing",
  "cdn",
  "credentials",
  "dd-oodle",
  "docs",
  "help",
  "localhost",
  "login",
  "logout",
  "mail",
  "platform",
  "public",
  "register",
  "signup",
  "static",
  "status",
  "study-buddy",
  "support",
  "t",
  "verify",
  "www",
]);

/**
 * Strict institution slug format: 3-63 chars, lowercase ASCII alphanumeric,
 * single/internal hyphens allowed, no leading/trailing hyphen.
 */
export const tenantSlugSchema = z
  .string()
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/,
    "Tenant slug must be 3-63 lowercase alphanumeric characters or internal hyphens",
  );

export type TenantHintSource = "subdomain" | "local-subdomain" | "preview-path";

export type TenantHintFailureReason =
  | "invalid-host"
  | "multi-level-subdomain"
  | "invalid-slug"
  | "reserved-slug";

export type TenantHintResult =
  | {
      kind: "tenant";
      slug: string;
      source: TenantHintSource;
      /**
       * Always false. Routing hints parsed from host or URL path are UNTRUSTED
       * and must ALWAYS be validated server-side against verified membership and RLS.
       */
      isTrustedMembership: false;
    }
  | {
      kind: "none";
      reason: "no-hint" | "apex-domain";
    }
  | {
      kind: "invalid";
      reason: TenantHintFailureReason;
    };

export interface ResolveTenantHintInput {
  host?: string | null;
  pathname?: string | null;
  baseDomain?: string;
}

const HOST_HEADER_PATTERN = /^[a-z0-9.-]+(?::\d{1,5})?$/;

function stripPort(host: string): string {
  const colonIndex = host.indexOf(":");
  return colonIndex === -1 ? host : host.slice(0, colonIndex);
}

function validateTenantSlug(
  candidate: string,
  source: TenantHintSource,
): TenantHintResult {
  if (!tenantSlugSchema.safeParse(candidate).success) {
    return { kind: "invalid", reason: "invalid-slug" };
  }

  if (RESERVED_TENANT_SLUGS.has(candidate)) {
    return { kind: "invalid", reason: "reserved-slug" };
  }

  return {
    kind: "tenant",
    slug: candidate,
    source,
    isTrustedMembership: false,
  };
}

function extractPreviewPathHint(pathname: string): TenantHintResult {
  const normalized = pathname.trim();
  if (normalized === "/t" || normalized === "/t/") {
    return { kind: "invalid", reason: "invalid-slug" };
  }

  if (!normalized.startsWith("/t/")) {
    return { kind: "none", reason: "no-hint" };
  }

  const remainder = normalized.slice(3);
  const slashIndex = remainder.indexOf("/");
  const segment = slashIndex === -1 ? remainder : remainder.slice(0, slashIndex);

  if (segment.length === 0) {
    return { kind: "invalid", reason: "invalid-slug" };
  }

  return validateTenantSlug(segment, "preview-path");
}

/**
 * Extracts an institution routing hint per OD-03:
 * - Production subdomain: `<slug>.dd-oodle.com`
 * - Local dev subdomain: `<slug>.localhost:3000`
 * - Preview fallback path: `/t/<slug>`
 *
 * SECURITY BOUNDARY (ADR-0001):
 * This parser returns an UNTRUSTED routing hint only (`isTrustedMembership: false`).
 * Callers must never treat the returned slug as proof of access or institution membership.
 */
export function resolveTenantHint(
  input: ResolveTenantHintInput,
): TenantHintResult {
  const baseDomain = (input.baseDomain ?? "dd-oodle.com").trim().toLowerCase();
  const rawHost = (input.host ?? "").trim().toLowerCase();
  const pathname = input.pathname ?? "/";

  if (rawHost.length > 0) {
    if (!HOST_HEADER_PATTERN.test(rawHost)) {
      return { kind: "invalid", reason: "invalid-host" };
    }

    const hostname = stripPort(rawHost);

    if (hostname === baseDomain) {
      const pathHint = extractPreviewPathHint(pathname);
      return pathHint.kind === "none"
        ? { kind: "none", reason: "apex-domain" }
        : pathHint;
    }

    const prodSuffix = `.${baseDomain}`;
    if (hostname.endsWith(prodSuffix)) {
      const prefix = hostname.slice(0, -prodSuffix.length);
      if (prefix.includes(".")) {
        return { kind: "invalid", reason: "multi-level-subdomain" };
      }
      return validateTenantSlug(prefix, "subdomain");
    }

    if (hostname === "localhost") {
      return extractPreviewPathHint(pathname);
    }

    const localSuffix = ".localhost";
    if (hostname.endsWith(localSuffix)) {
      const prefix = hostname.slice(0, -localSuffix.length);
      if (prefix.includes(".")) {
        return { kind: "invalid", reason: "multi-level-subdomain" };
      }
      return validateTenantSlug(prefix, "local-subdomain");
    }
  }

  return extractPreviewPathHint(pathname);
}
