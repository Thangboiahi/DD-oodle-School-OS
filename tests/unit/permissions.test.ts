import { describe, expect, it } from "vitest";
import {
  evaluatePermission,
  type ActiveRoleAssignment,
  type VerifiedTenantContext,
} from "@/lib/auth/permissions";

const NOW = new Date("2026-11-27T12:00:00Z");

function makeAssignment(
  overrides: Partial<ActiveRoleAssignment> = {},
): ActiveRoleAssignment {
  return {
    assignmentId: "66666666-6666-4666-8666-666666666601",
    roleId: "55555555-5555-4555-8555-555555555105",
    roleCode: "subject_teacher",
    roleName: "Subject Teacher",
    roleIsActive: true,
    permissions: ["academics.teach"],
    scopeType: "teaching_group",
    scopeRefId: "99999999-9999-4999-8999-999999999901",
    status: "active",
    startsAt: "2026-11-20T00:00:00Z",
    endsAt: null,
    ...overrides,
  };
}

function makeContext(
  overrides: Partial<VerifiedTenantContext> = {},
): VerifiedTenantContext {
  return {
    personId: "33333333-3333-4333-8333-333333333302",
    authUserId: "22222222-2222-4222-8222-222222222202",
    institutionId: "11111111-1111-4111-8111-111111111101",
    institutionSlug: "sunrise-cbse",
    institutionName: "Sunrise Synthetic CBSE Academy",
    institutionBoard: "CBSE",
    institutionTimezone: "Asia/Kolkata",
    defaultThemeFamily: "clarity",
    membershipId: "44444444-4444-4444-8444-444444444402",
    membershipStatus: "active",
    assignments: [makeAssignment()],
    isPlatformOperator: false,
    ...overrides,
  };
}

describe("evaluatePermission", () => {
  it("allows matching active permission and matching teaching_group scope", () => {
    const decision = evaluatePermission(
      makeContext(),
      {
        permission: "academics.teach",
        scopeType: "teaching_group",
        scopeRefId: "99999999-9999-4999-8999-999999999901",
      },
      NOW,
    );

    expect(decision).toEqual({
      allowed: true,
      matchedAssignmentId: "66666666-6666-4666-8666-666666666601",
      matchedRoleCode: "subject_teacher",
      matchedScopeType: "teaching_group",
    });
  });

  it("grants narrower scopes when role carries institution.* and institution scope", () => {
    const decision = evaluatePermission(
      makeContext({
        assignments: [
          makeAssignment({
            roleCode: "principal",
            permissions: ["institution.*"],
            scopeType: "institution",
            scopeRefId: null,
          }),
        ],
      }),
      {
        permission: "audit.read",
        scopeType: "section",
        scopeRefId: "88888888-8888-4888-8888-888888888801",
      },
      NOW,
    );

    expect(decision.allowed).toBe(true);
  });

  it("denies expired, future, revoked, and inactive-role assignments", () => {
    const cases: ActiveRoleAssignment[] = [
      makeAssignment({ endsAt: "2026-11-27T12:00:00Z" }), // exact boundary ends_at <= now
      makeAssignment({ startsAt: "2026-11-28T00:00:00Z" }), // future
      makeAssignment({ status: "revoked" }),
      makeAssignment({ roleIsActive: false }),
    ];

    for (const assignment of cases) {
      const decision = evaluatePermission(
        makeContext({ assignments: [assignment] }),
        { permission: "academics.teach" },
        NOW,
      );
      expect(decision).toEqual({
        allowed: false,
        reason: "missing-permission",
      });
    }
  });

  it("denies narrower scope mismatch or different scopeRefId", () => {
    const wrongRef = evaluatePermission(
      makeContext(),
      {
        permission: "academics.teach",
        scopeType: "teaching_group",
        scopeRefId: "99999999-9999-4999-8999-999999999999",
      },
      NOW,
    );
    expect(wrongRef).toEqual({ allowed: false, reason: "scope-mismatch" });

    const wrongScopeType = evaluatePermission(
      makeContext(),
      {
        permission: "academics.teach",
        scopeType: "section",
      },
      NOW,
    );
    expect(wrongScopeType).toEqual({
      allowed: false,
      reason: "scope-mismatch",
    });
  });

  it("denies all permissions when membership is not active", () => {
    const decision = evaluatePermission(
      makeContext({
        membershipStatus: "suspended",
        assignments: [
          makeAssignment({
            permissions: ["institution.*"],
            scopeType: "institution",
          }),
        ],
      }),
      { permission: "institution.manage" },
      NOW,
    );

    expect(decision).toEqual({
      allowed: false,
      reason: "inactive-membership",
    });
  });

  it("never grants institutional permissions from isPlatformOperator status", () => {
    const decision = evaluatePermission(
      makeContext({
        assignments: [],
        isPlatformOperator: true,
      }),
      { permission: "institution.manage" },
      NOW,
    );

    expect(decision).toEqual({
      allowed: false,
      reason: "missing-permission",
    });
  });
});
