import { describe, expect, it } from "vitest";
import {
  buildHandbookExtensionSeams,
  canGuardianAcknowledgeEntry,
  HANDBOOK_CATEGORY_META,
  resolveHandbookAuthoringPolicy,
  validateEntryAuthoringAgainstPolicy,
} from "@/lib/handbook/rules";
import {
  acknowledgeHandbookEntrySchema,
  archiveHandbookEntrySchema,
  createHandbookEntrySchema,
  updateHandbookEntrySchema,
} from "@/lib/handbook/schemas";

const STUDENT_ID = "88888888-8888-4888-8888-888888880101";
const ENTRY_ID = "cccccccc-cccc-4ccc-8ccc-cccccccc6101";
const TG_ID_1 = "99999999-9999-4999-8999-999999999101";
const TG_ID_OTHER = "99999999-9999-4999-8999-999999999102";

describe("handbook authoring policy & validation boundaries", () => {
  it("grants Leadership all 5 categories and all 4 visibility scopes including leadership_only", () => {
    const policy = resolveHandbookAuthoringPolicy({
      isLeadership: true,
      isClassTeacherOrHod: false,
      assignedTeachingGroupIds: [],
    });

    expect(policy.canCreateEntry).toBe(true);
    expect(policy.allowedCategories).toHaveLength(5);
    expect(policy.allowedVisibilityScopes).toContain("leadership_only");
    expect(policy.requiresTeachingGroupSelection).toBe(false);

    expect(
      validateEntryAuthoringAgainstPolicy(
        {
          category: "disciplinary",
          visibilityScope: "leadership_only",
          teachingGroupId: null,
        },
        policy,
      ),
    ).toEqual({ ok: true });
  });

  it("grants Class Teacher / HOD all 5 categories while strictly excluding leadership_only", () => {
    const policy = resolveHandbookAuthoringPolicy({
      isLeadership: false,
      isClassTeacherOrHod: true,
      assignedTeachingGroupIds: [],
    });

    expect(policy.canCreateEntry).toBe(true);
    expect(policy.allowedCategories).toHaveLength(5);
    expect(policy.allowedVisibilityScopes).toEqual([
      "student_and_guardian",
      "staff_academic",
      "class_teacher_and_leadership",
    ]);

    expect(
      validateEntryAuthoringAgainstPolicy(
        {
          category: "student_support",
          visibilityScope: "class_teacher_and_leadership",
        },
        policy,
      ),
    ).toEqual({ ok: true });

    const blocked = validateEntryAuthoringAgainstPolicy(
      {
        category: "disciplinary",
        visibilityScope: "leadership_only",
      },
      policy,
    );
    expect(blocked.ok).toBe(false);
  });

  it("restricts Subject Teacher strictly to academic_observation, academic/student scopes, and assigned TG", () => {
    const policy = resolveHandbookAuthoringPolicy({
      isLeadership: false,
      isClassTeacherOrHod: false,
      assignedTeachingGroupIds: [TG_ID_1],
    });

    expect(policy.canCreateEntry).toBe(true);
    expect(policy.allowedCategories).toEqual(["academic_observation"]);
    expect(policy.allowedVisibilityScopes).toEqual([
      "student_and_guardian",
      "staff_academic",
    ]);
    expect(policy.requiresTeachingGroupSelection).toBe(true);

    expect(
      validateEntryAuthoringAgainstPolicy(
        {
          category: "academic_observation",
          visibilityScope: "student_and_guardian",
          teachingGroupId: TG_ID_1,
        },
        policy,
      ),
    ).toEqual({ ok: true });

    expect(
      validateEntryAuthoringAgainstPolicy(
        {
          category: "disciplinary",
          visibilityScope: "staff_academic",
          teachingGroupId: TG_ID_1,
        },
        policy,
      ).ok,
    ).toBe(false);

    expect(
      validateEntryAuthoringAgainstPolicy(
        {
          category: "student_support",
          visibilityScope: "staff_academic",
          teachingGroupId: TG_ID_1,
        },
        policy,
      ).ok,
    ).toBe(false);

    expect(
      validateEntryAuthoringAgainstPolicy(
        {
          category: "academic_observation",
          visibilityScope: "leadership_only",
          teachingGroupId: TG_ID_1,
        },
        policy,
      ).ok,
    ).toBe(false);

    expect(
      validateEntryAuthoringAgainstPolicy(
        {
          category: "academic_observation",
          visibilityScope: "staff_academic",
          teachingGroupId: TG_ID_OTHER,
        },
        policy,
      ).ok,
    ).toBe(false);

    expect(
      validateEntryAuthoringAgainstPolicy(
        {
          category: "academic_observation",
          visibilityScope: "staff_academic",
          teachingGroupId: null,
        },
        policy,
      ).ok,
    ).toBe(false);
  });

  it("denies authoring completely for Monitor, Student, and Guardian roles", () => {
    const policy = resolveHandbookAuthoringPolicy({
      isLeadership: false,
      isClassTeacherOrHod: false,
      assignedTeachingGroupIds: [],
    });

    expect(policy.canCreateEntry).toBe(false);
    expect(policy.allowedCategories).toEqual([]);
    expect(policy.allowedVisibilityScopes).toEqual([]);
    expect(
      validateEntryAuthoringAgainstPolicy(
        {
          category: "academic_observation",
          visibilityScope: "student_and_guardian",
        },
        policy,
      ).ok,
    ).toBe(false);
  });

  it("marks disciplinary and student_support sensitive and builds Phase 4/6 extension seams", () => {
    expect(HANDBOOK_CATEGORY_META.disciplinary.isSensitive).toBe(true);
    expect(HANDBOOK_CATEGORY_META.student_support.isSensitive).toBe(true);
    expect(HANDBOOK_CATEGORY_META.academic_observation.isSensitive).toBe(false);

    const seams = buildHandbookExtensionSeams();
    expect(seams.map((s) => s.phase)).toEqual(["Phase 4", "Phase 6"]);
    expect(seams.every((s) => s.status === "planned")).toBe(true);
  });
});

describe("guardian acknowledgement & handbook Zod schemas", () => {
  it("permits guardian acknowledgement strictly on active student_and_guardian unacknowledged rows", () => {
    expect(
      canGuardianAcknowledgeEntry({
        isLinkedGuardian: true,
        status: "active",
        visibilityScope: "student_and_guardian",
        alreadyAcknowledged: false,
      }),
    ).toBe(true);

    expect(
      canGuardianAcknowledgeEntry({
        isLinkedGuardian: false,
        status: "active",
        visibilityScope: "student_and_guardian",
        alreadyAcknowledged: false,
      }),
    ).toBe(false);

    expect(
      canGuardianAcknowledgeEntry({
        isLinkedGuardian: true,
        status: "archived",
        visibilityScope: "student_and_guardian",
        alreadyAcknowledged: false,
      }),
    ).toBe(false);

    expect(
      canGuardianAcknowledgeEntry({
        isLinkedGuardian: true,
        status: "active",
        visibilityScope: "staff_academic",
        alreadyAcknowledged: false,
      }),
    ).toBe(false);

    expect(
      canGuardianAcknowledgeEntry({
        isLinkedGuardian: true,
        status: "active",
        visibilityScope: "student_and_guardian",
        alreadyAcknowledged: true,
      }),
    ).toBe(false);
  });

  it("validates create/update/archive/acknowledge Zod payloads strictly", () => {
    expect(
      createHandbookEntrySchema.safeParse({
        studentProfileId: STUDENT_ID,
        category: "invalid_category",
        visibilityScope: "student_and_guardian",
        title: "Valid Title",
        body: "Valid observation body",
      }).success,
    ).toBe(false);

    expect(
      createHandbookEntrySchema.safeParse({
        studentProfileId: STUDENT_ID,
        category: "academic_observation",
        visibilityScope: "student_and_guardian",
        teachingGroupId: "",
        title: "Ok",
        body: "Too",
      }).success,
    ).toBe(false);

    expect(
      createHandbookEntrySchema.safeParse({
        studentProfileId: STUDENT_ID,
        category: "academic_observation",
        visibilityScope: "student_and_guardian",
        teachingGroupId: TG_ID_1,
        title: "Strong Applied Math Problem Solving",
        body: "Demonstrated clear analytical reasoning during seminar.",
      }).success,
    ).toBe(true);

    expect(
      updateHandbookEntrySchema.safeParse({
        entryId: ENTRY_ID,
        studentProfileId: STUDENT_ID,
        title: "Updated Feedback Title",
        body: "Updated observation body text.",
      }).success,
    ).toBe(true);

    expect(
      archiveHandbookEntrySchema.safeParse({
        entryId: ENTRY_ID,
        studentProfileId: STUDENT_ID,
      }).success,
    ).toBe(true);

    expect(
      acknowledgeHandbookEntrySchema.safeParse({
        entryId: ENTRY_ID,
        studentProfileId: STUDENT_ID,
      }).success,
    ).toBe(true);
  });
});
