import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { evaluatePermission } from "@/lib/auth/permissions";
import type { PersonWorkspaceDto } from "@/server/auth/types";
import { resolveTenantContextFromWorkspace } from "@/server/tenancy/resolve-context";

const SUNRISE_INSTITUTION = {
  id: "11111111-1111-4111-8111-111111111101",
  slug: "sunrise-cbse",
  name: "Sunrise Synthetic CBSE Academy",
  board: "CBSE",
  status: "active" as const,
  defaultThemeFamily: "clarity" as const,
  timezone: "Asia/Kolkata",
};

const VALLEY_INSTITUTION = {
  id: "11111111-1111-4111-8111-111111111102",
  slug: "valley-cbse",
  name: "Valley Synthetic CBSE Senior Secondary",
  board: "CBSE",
  status: "active" as const,
  defaultThemeFamily: "calm" as const,
  timezone: "Asia/Kolkata",
};

const DUAL_MEMBER_WORKSPACE: PersonWorkspaceDto = {
  person: {
    id: "33333333-3333-4333-8333-333333333302",
    authUserId: "22222222-2222-4222-8222-222222222202",
    fullName: "Synthetic Dual Member",
    displayName: "Teacher & Guardian",
    primaryEmail: "dual.member@example.test",
    status: "active",
  },
  platformOperator: null,
  memberships: [
    {
      membershipId: "44444444-4444-4444-8444-444444444402",
      membershipStatus: "active",
      joinedAt: "2026-11-27T00:00:00Z",
      institution: SUNRISE_INSTITUTION,
      assignments: [
        {
          assignmentId: "66666666-6666-4666-8666-666666666602",
          roleId: "55555555-5555-4555-8555-555555555105",
          roleCode: "subject_teacher",
          roleName: "Subject Teacher",
          roleIsActive: true,
          permissions: ["academics.teach"],
          scopeType: "teaching_group",
          scopeRefId: null,
          status: "active",
          startsAt: "2026-11-20T00:00:00Z",
          endsAt: null,
        },
      ],
    },
    {
      membershipId: "44444444-4444-4444-8444-444444444403",
      membershipStatus: "active",
      joinedAt: "2026-11-27T00:00:00Z",
      institution: VALLEY_INSTITUTION,
      assignments: [
        {
          assignmentId: "66666666-6666-4666-8666-666666666603",
          roleId: "55555555-5555-4555-8555-555555555206",
          roleCode: "parent_guardian",
          roleName: "Parent / Guardian",
          roleIsActive: true,
          permissions: ["ward.read"],
          scopeType: "self",
          scopeRefId: null,
          status: "active",
          startsAt: "2026-11-20T00:00:00Z",
          endsAt: null,
        },
      ],
    },
  ],
};

const PLATFORM_OPERATOR_WORKSPACE: PersonWorkspaceDto = {
  person: {
    id: "33333333-3333-4333-8333-333333333304",
    authUserId: "22222222-2222-4222-8222-222222222204",
    fullName: "Synthetic Platform Operator",
    displayName: "Platform Ops",
    primaryEmail: "platform.ops@example.test",
    status: "active",
  },
  platformOperator: {
    personId: "33333333-3333-4333-8333-333333333304",
    operatorRole: "super_admin",
    status: "active",
  },
  memberships: [],
};

describe("resolveTenantContextFromWorkspace", () => {
  const evalNow = new Date("2026-11-27T12:00:00Z");

  it("returns unconfigured and unauthenticated states cleanly", () => {
    expect(
      resolveTenantContextFromWorkspace(null, "sunrise-cbse", false),
    ).toEqual({ status: "unconfigured" });
    expect(
      resolveTenantContextFromWorkspace(null, "sunrise-cbse", true),
    ).toEqual({ status: "unauthenticated" });
  });

  it("returns identical denied result for unknown, reserved, and unauthorized tenant slugs", () => {
    expect(
      resolveTenantContextFromWorkspace(
        DUAL_MEMBER_WORKSPACE,
        "nonexistent-school",
        true,
      ),
    ).toEqual({ status: "denied" });
    expect(
      resolveTenantContextFromWorkspace(DUAL_MEMBER_WORKSPACE, "platform", true),
    ).toEqual({ status: "denied" });
    expect(
      resolveTenantContextFromWorkspace(
        DUAL_MEMBER_WORKSPACE,
        "../sunrise-cbse",
        true,
      ),
    ).toEqual({ status: "denied" });
  });

  it("resolves distinct verified permissions when a dual member switches between sunrise-cbse and valley-cbse", () => {
    const sunriseRes = resolveTenantContextFromWorkspace(
      DUAL_MEMBER_WORKSPACE,
      "sunrise-cbse",
      true,
    );
    const valleyRes = resolveTenantContextFromWorkspace(
      DUAL_MEMBER_WORKSPACE,
      "valley-cbse",
      true,
    );

    expect(sunriseRes.status).toBe("ok");
    expect(valleyRes.status).toBe("ok");

    if (sunriseRes.status !== "ok" || valleyRes.status !== "ok") {
      throw new Error("Expected dual-member resolutions to succeed");
    }

    expect(
      evaluatePermission(
        sunriseRes.context,
        { permission: "academics.teach" },
        evalNow,
      ).allowed,
    ).toBe(true);
    expect(
      evaluatePermission(
        sunriseRes.context,
        { permission: "ward.read" },
        evalNow,
      ).allowed,
    ).toBe(false);

    expect(
      evaluatePermission(
        valleyRes.context,
        { permission: "ward.read" },
        evalNow,
      ).allowed,
    ).toBe(true);
    expect(
      evaluatePermission(
        valleyRes.context,
        { permission: "academics.teach" },
        evalNow,
      ).allowed,
    ).toBe(false);
  });

  it("denies institutional access to platform.ops super_admin with zero memberships", () => {
    expect(
      resolveTenantContextFromWorkspace(
        PLATFORM_OPERATOR_WORKSPACE,
        "sunrise-cbse",
        true,
      ),
    ).toEqual({ status: "denied" });
  });

  it("enforces import 'server-only' on every module under server/", () => {
    const serverDir = path.resolve(process.cwd(), "server");
    const stack = [serverDir];
    const files: string[] = [];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
        } else if (entry.name.endsWith(".ts")) {
          files.push(full);
        }
      }
    }

    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      expect(content).toMatch(/^import\s+["']server-only["'];/);
    }
  });
});
