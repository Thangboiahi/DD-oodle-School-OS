import { describe, expect, it } from "vitest";
import { buildInstitutionNav } from "@/lib/auth/navigation";
import type { VerifiedTenantContext } from "@/lib/auth/permissions";
import { sanitizeNextPath } from "@/lib/auth/safe-redirect";

function buildContextWithRole(
  roleCode: string,
  roleName: string,
  permissions: string[],
): VerifiedTenantContext {
  return {
    personId: "33333333-3333-4333-8333-333333333301",
    authUserId: "22222222-2222-4222-8222-222222222201",
    institutionId: "11111111-1111-4111-8111-111111111101",
    institutionSlug: "sunrise-cbse",
    institutionName: "Sunrise Synthetic CBSE Academy",
    institutionBoard: "CBSE",
    institutionTimezone: "Asia/Kolkata",
    defaultThemeFamily: "clarity",
    membershipId: "44444444-4444-4444-8444-444444444401",
    membershipStatus: "active",
    assignments: [
      {
        assignmentId: "66666666-6666-4666-8666-666666666601",
        roleId: "55555555-5555-4555-8555-555555555101",
        roleCode,
        roleName,
        roleIsActive: true,
        permissions,
        scopeType: "institution",
        scopeRefId: null,
        status: "active",
        startsAt: "2026-11-20T00:00:00Z",
        endsAt: null,
      },
    ],
  };
}

describe("sanitizeNextPath", () => {
  it("allows valid internal relative paths with query/hash", () => {
    expect(sanitizeNextPath("/workspace")).toBe("/workspace");
    expect(sanitizeNextPath("/t/sunrise-cbse?tab=overview#governance")).toBe(
      "/t/sunrise-cbse?tab=overview#governance",
    );
    expect(sanitizeNextPath("/platform")).toBe("/platform");
  });

  it("rejects open redirects, dangerous schemes, backslashes, control chars, and sign-out loops", () => {
    const dangerousInputs = [
      undefined,
      null,
      "",
      "   ",
      "//evil.example.com",
      "///evil.example.com",
      "https://evil.example.com/steal",
      "http://evil.example.com",
      "/\\evil.example.com",
      "javascript:alert(1)",
      "/javascript:alert(1)",
      "/auth/sign-out",
      "/auth/sign-out?confirm=1",
      "/workspace\r\nLocation: https://evil.example.com",
      "workspace",
    ];

    for (const candidate of dangerousInputs) {
      expect(sanitizeNextPath(candidate)).toBe("/workspace");
    }
  });
});

describe("buildInstitutionNav", () => {
  const now = new Date("2026-11-27T12:00:00Z");

  it("renders full governance, audit, registry, and files nav for Principal", () => {
    const nav = buildInstitutionNav(
      buildContextWithRole("principal", "Principal", ["institution.*"]),
      now,
    );
    expect(nav.map((item) => item.id)).toEqual([
      "overview",
      "people",
      "academics",
      "attendance",
      "imports",
      "governance",
      "audit",
      "files",
    ]);
    expect(nav.find((item) => item.id === "people")?.href).toBe(
      "/t/sunrise-cbse/people",
    );
    expect(nav.find((item) => item.id === "academics")?.href).toBe(
      "/t/sunrise-cbse/academics",
    );
    expect(nav.find((item) => item.id === "attendance")?.href).toBe(
      "/t/sunrise-cbse/attendance",
    );
    expect(nav.find((item) => item.id === "imports")?.href).toBe(
      "/t/sunrise-cbse/imports",
    );
    expect(nav.find((item) => item.id === "people")?.badge).toBeUndefined();
  });

  it("renders scoped teaching nav without governance/audit/files for Subject Teacher", () => {
    const nav = buildInstitutionNav(
      buildContextWithRole("subject_teacher", "Subject Teacher", [
        "academics.teach",
      ]),
      now,
    );
    expect(nav.map((item) => item.id)).toEqual([
      "overview",
      "people",
      "academics",
      "attendance",
    ]);
  });

  it("renders overview and scoped people/academics/attendance links for Parent/Guardian and Monitor", () => {
    const parentNav = buildInstitutionNav(
      buildContextWithRole("parent_guardian", "Parent / Guardian", [
        "ward.read",
      ]),
      now,
    );
    const monitorNav = buildInstitutionNav(
      buildContextWithRole("monitor", "Class Monitor", [
        "classroom.summary.read",
      ]),
      now,
    );

    expect(parentNav.map((item) => item.id)).toEqual([
      "overview",
      "people",
      "academics",
      "attendance",
    ]);
    expect(monitorNav.map((item) => item.id)).toEqual([
      "overview",
      "people",
      "academics",
      "attendance",
    ]);
  });
});
