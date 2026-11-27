import { describe, expect, it } from "vitest";
import {
  RESERVED_TENANT_SLUGS,
  resolveTenantHint,
} from "@/lib/tenancy/resolve-tenant-hint";

describe("resolveTenantHint (OD-03 routing hint parser)", () => {
  it("extracts valid production subdomain hint and marks membership untrusted", () => {
    const result = resolveTenantHint({
      host: "dps-rkpuram.dd-oodle.com",
      pathname: "/dashboard",
    });

    expect(result).toEqual({
      kind: "tenant",
      slug: "dps-rkpuram",
      source: "subdomain",
      isTrustedMembership: false,
    });
  });

  it("extracts valid local dev subdomain hint with port", () => {
    const result = resolveTenantHint({
      host: "Sunrise-Public.localhost:3000",
      pathname: "/",
    });

    expect(result).toEqual({
      kind: "tenant",
      slug: "sunrise-public",
      source: "local-subdomain",
      isTrustedMembership: false,
    });
  });

  it("extracts preview fallback path hint on localhost or preview hosts", () => {
    expect(
      resolveTenantHint({
        host: "localhost:3000",
        pathname: "/t/cbse-demo",
      }),
    ).toEqual({
      kind: "tenant",
      slug: "cbse-demo",
      source: "preview-path",
      isTrustedMembership: false,
    });

    expect(
      resolveTenantHint({
        host: "dd-oodle-git-preview.vercel.app",
        pathname: "/t/cbse-demo/attendance",
      }),
    ).toEqual({
      kind: "tenant",
      slug: "cbse-demo",
      source: "preview-path",
      isTrustedMembership: false,
    });
  });

  it("returns none for apex domain and bare localhost without preview path", () => {
    expect(
      resolveTenantHint({
        host: "dd-oodle.com",
        pathname: "/",
      }),
    ).toEqual({
      kind: "none",
      reason: "apex-domain",
    });

    expect(
      resolveTenantHint({
        host: "localhost:3000",
        pathname: "/about",
      }),
    ).toEqual({
      kind: "none",
      reason: "no-hint",
    });
  });

  it("rejects reserved slugs across subdomain, local-subdomain, and preview paths", () => {
    for (const reserved of ["www", "admin", "api", "platform", "auth"]) {
      expect(RESERVED_TENANT_SLUGS.has(reserved)).toBe(true);
      expect(
        resolveTenantHint({ host: `${reserved}.dd-oodle.com`, pathname: "/" }),
      ).toEqual({ kind: "invalid", reason: "reserved-slug" });

      expect(
        resolveTenantHint({
          host: `${reserved}.localhost:3000`,
          pathname: "/",
        }),
      ).toEqual({ kind: "invalid", reason: "reserved-slug" });

      expect(
        resolveTenantHint({
          host: "localhost:3000",
          pathname: `/t/${reserved}`,
        }),
      ).toEqual({ kind: "invalid", reason: "reserved-slug" });
    }
  });

  it("rejects malformed slugs, multi-level subdomains, and invalid hosts", () => {
    expect(
      resolveTenantHint({ host: "a.b.dd-oodle.com", pathname: "/" }),
    ).toEqual({ kind: "invalid", reason: "multi-level-subdomain" });

    expect(
      resolveTenantHint({ host: "a.b.localhost:3000", pathname: "/" }),
    ).toEqual({ kind: "invalid", reason: "multi-level-subdomain" });

    expect(
      resolveTenantHint({ host: "ab.dd-oodle.com", pathname: "/" }),
    ).toEqual({ kind: "invalid", reason: "invalid-slug" });

    expect(
      resolveTenantHint({ host: "-bad.dd-oodle.com", pathname: "/" }),
    ).toEqual({ kind: "invalid", reason: "invalid-slug" });

    expect(
      resolveTenantHint({ host: "bad_slug.dd-oodle.com", pathname: "/" }),
    ).toEqual({ kind: "invalid", reason: "invalid-host" });

    expect(
      resolveTenantHint({ host: "localhost:3000", pathname: "/t/bad_slug" }),
    ).toEqual({ kind: "invalid", reason: "invalid-slug" });

    expect(
      resolveTenantHint({ host: "localhost:3000", pathname: "/t/SchoolName" }),
    ).toEqual({ kind: "invalid", reason: "invalid-slug" });

    expect(
      resolveTenantHint({ host: "localhost:3000", pathname: "/t/" }),
    ).toEqual({ kind: "invalid", reason: "invalid-slug" });

    expect(
      resolveTenantHint({ host: "bad host/slash", pathname: "/" }),
    ).toEqual({ kind: "invalid", reason: "invalid-host" });
  });
});
