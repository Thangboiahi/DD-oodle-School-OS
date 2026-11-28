import { describe, expect, it } from "vitest";
import {
  buildSyllabusTree,
  canTransitionResourceStatus,
  computeSyllabusProgressRollup,
  isSafeHttpUrl,
  resolvePlanningRoleAccess,
  validateSyllabusParentKind,
} from "@/lib/planning/rules";
import {
  createLearningResourceSchema,
  createSyllabusItemSchema,
  updateSyllabusProgressSchema,
} from "@/lib/planning/schemas";

const OFFERING_ID = "99999999-9999-4999-8999-999999997104";
const TG_ID = "99999999-9999-4999-8999-999999999101";

describe("isSafeHttpUrl and resource Zod refinements", () => {
  it("accepts http/https URLs and rejects unsafe schemes or malformed strings", () => {
    expect(isSafeHttpUrl("https://cbseacademic.nic.in/curriculum.html")).toBe(
      true,
    );
    expect(isSafeHttpUrl("http://localhost:3000/docs")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,<h1>x</h1>")).toBe(false);
    expect(isSafeHttpUrl("ftp://example.com/file.pdf")).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
  });

  it("enforces link URL safety and teaching_group requirement on learning resources", () => {
    expect(
      createLearningResourceSchema.safeParse({
        subjectOfferingId: OFFERING_ID,
        title: "Unsafe JS Link",
        resourceKind: "link",
        externalUrl: "javascript:alert(1)",
        visibility: "subject_offering",
        status: "published",
      }).success,
    ).toBe(false);

    expect(
      createLearningResourceSchema.safeParse({
        subjectOfferingId: OFFERING_ID,
        title: "TG Resource Missing TG ID",
        resourceKind: "notes",
        externalUrl: null,
        visibility: "teaching_group",
        status: "published",
      }).success,
    ).toBe(false);

    expect(
      createLearningResourceSchema.safeParse({
        subjectOfferingId: OFFERING_ID,
        teachingGroupId: TG_ID,
        title: "Modular Arithmetic Notes",
        resourceKind: "link",
        externalUrl: "https://cbseacademic.nic.in/",
        visibility: "teaching_group",
        status: "published",
      }).success,
    ).toBe(true);
  });
});

describe("syllabus hierarchy, progress rollups, and delay reason rules", () => {
  it("validates parent-child syllabus kinds cleanly", () => {
    expect(validateSyllabusParentKind(null, "unit")).toEqual({ ok: true });
    expect(validateSyllabusParentKind("unit", "chapter")).toEqual({ ok: true });
    expect(validateSyllabusParentKind("chapter", "topic")).toEqual({ ok: true });
    expect(validateSyllabusParentKind("unit", "topic")).toEqual({ ok: true });

    expect(validateSyllabusParentKind("chapter", "unit").ok).toBe(false);
    expect(validateSyllabusParentKind("topic", "chapter").ok).toBe(false);
    expect(validateSyllabusParentKind("topic", "topic").ok).toBe(false);
  });

  it("deterministically orders syllabus tree and surfaces orphan items safely", () => {
    const tree = buildSyllabusTree([
      {
        id: "ch2",
        parentItemId: "u1",
        itemKind: "chapter",
        code: "CH-1.2",
        title: "Modular Arithmetic",
        sequenceNo: 2,
      },
      {
        id: "t1",
        parentItemId: "ch2",
        itemKind: "topic",
        code: "TOP-1.2.1",
        title: "Congruence Modulo",
        sequenceNo: 1,
      },
      {
        id: "u1",
        parentItemId: null,
        itemKind: "unit",
        code: "UNIT-1",
        title: "Numbers and Quantification",
        sequenceNo: 1,
      },
      {
        id: "orphan",
        parentItemId: "missing-parent",
        itemKind: "chapter",
        code: "CH-9",
        title: "Orphan Chapter",
        sequenceNo: 9,
      },
    ]);

    expect(tree.map((n) => n.id)).toEqual(["u1", "orphan"]);
    expect(tree[0]?.children.map((c) => c.id)).toEqual(["ch2"]);
    expect(tree[0]?.children[0]?.children.map((t) => t.id)).toEqual(["t1"]);
  });

  it("computes syllabus completion rollup percentages and rejects delayed status without reason", () => {
    expect(computeSyllabusProgressRollup([])).toEqual({
      total: 0,
      notStarted: 0,
      inProgress: 0,
      completed: 0,
      revised: 0,
      delayed: 0,
      completionPercent: 0,
    });

    expect(
      computeSyllabusProgressRollup([
        { progressStatus: "completed" },
        { progressStatus: "revised" },
        { progressStatus: "in_progress" },
        { progressStatus: "delayed" },
        { progressStatus: "not_started" },
      ]),
    ).toEqual({
      total: 5,
      notStarted: 1,
      inProgress: 1,
      completed: 1,
      revised: 1,
      delayed: 1,
      completionPercent: 40,
    });

    expect(
      createSyllabusItemSchema.safeParse({
        subjectOfferingId: OFFERING_ID,
        itemKind: "chapter",
        code: "CH-2",
        title: "Delayed Chapter",
        sequenceNo: 2,
        progressStatus: "delayed",
        delayReason: "No",
      }).success,
    ).toBe(false);

    expect(
      updateSyllabusProgressSchema.safeParse({
        itemId: "dddddddd-dddd-4ddd-8ddd-dddddddd1102",
        progressStatus: "delayed",
        delayReason: "Lab schedule shifted for Unit Tests",
      }).success,
    ).toBe(true);
  });
});

describe("planning role matrix and resource status transitions", () => {
  it("separates Subject Teacher, Class Teacher, HOD, Leadership, Monitor, and Student/Guardian access", () => {
    const subjectTeacher = resolvePlanningRoleAccess({
      isLeadership: false,
      isHod: false,
      isClassTeacher: false,
      subjectTeacherOfferingIds: [OFFERING_ID],
      subjectTeacherGroupIds: [TG_ID],
      isStudentOrGuardian: false,
      isMonitor: false,
    });
    expect(subjectTeacher.canManageSyllabus).toBe(true);
    expect(subjectTeacher.canAccessLessonPlans).toBe(true);
    expect(subjectTeacher.canManageResources).toBe(true);
    expect(subjectTeacher.canAccessOversight).toBe(false);
    expect(subjectTeacher.canManageTerms).toBe(false);

    const classTeacher = resolvePlanningRoleAccess({
      isLeadership: false,
      isHod: false,
      isClassTeacher: true,
      subjectTeacherOfferingIds: [],
      subjectTeacherGroupIds: [],
      isStudentOrGuardian: false,
      isMonitor: false,
    });
    expect(classTeacher.canAccessOversight).toBe(true);
    expect(classTeacher.canAccessLessonPlans).toBe(true);
    expect(classTeacher.canManageSyllabus).toBe(false);
    expect(classTeacher.writableTeachingGroupIds).toEqual([]);

    const monitor = resolvePlanningRoleAccess({
      isLeadership: false,
      isHod: false,
      isClassTeacher: false,
      subjectTeacherOfferingIds: [],
      subjectTeacherGroupIds: [],
      isStudentOrGuardian: true,
      isMonitor: true,
    });
    expect(monitor.canManageSyllabus).toBe(false);
    expect(monitor.canAccessLessonPlans).toBe(false);
    expect(monitor.canAccessOversight).toBe(false);
    expect(monitor.canManageResources).toBe(false);
    expect(monitor.isReadOnlyLearner).toBe(true);
  });

  it("enforces one-way learning resource status transitions", () => {
    expect(canTransitionResourceStatus("draft", "published")).toBe(true);
    expect(canTransitionResourceStatus("draft", "archived")).toBe(true);
    expect(canTransitionResourceStatus("published", "archived")).toBe(true);
    expect(canTransitionResourceStatus("archived", "published")).toBe(false);
  });
});
