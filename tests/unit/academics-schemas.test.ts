import { describe, expect, it } from "vitest";
import {
  assignAcademicResponsibilitySchema,
  createGradeAndSectionSchema,
  createSessionSchema,
  createTermSchema,
} from "@/lib/academics/schemas";

const UUID_1 = "11111111-1111-4111-8111-111111111111";
const UUID_2 = "22222222-2222-4222-8222-222222222222";
const UUID_3 = "33333333-3333-4333-8333-333333333333";

describe("academic schemas", () => {
  it("validates session and term date windows", () => {
    const validSession = createSessionSchema.safeParse({
      code: "2026-27",
      name: "Academic Session 2026-27",
      startsOn: "2026-04-01",
      endsOn: "2027-03-31",
    });
    expect(validSession.success).toBe(true);

    const invertedSession = createSessionSchema.safeParse({
      code: "2026-27",
      name: "Invalid",
      startsOn: "2026-04-01",
      endsOn: "2026-04-01",
    });
    expect(invertedSession.success).toBe(false);

    const badTerm = createTermSchema.safeParse({
      sessionId: UUID_1,
      code: "T1",
      name: "Term 1",
      sequenceNo: 0,
      startsOn: "2026-04-01",
      endsOn: "2026-09-30",
    });
    expect(badTerm.success).toBe(false);
  });

  it("enforces positive optional section capacity", () => {
    const blankCapacity = createGradeAndSectionSchema.safeParse({
      sessionId: UUID_1,
      departmentId: UUID_2,
      gradeCode: "XI",
      gradeName: "Class XI",
      displayOrder: 11,
      sectionCode: "XI-A",
      sectionName: "Class XI Section A",
      capacity: "",
    });
    expect(blankCapacity.success).toBe(true);

    const zeroCapacity = createGradeAndSectionSchema.safeParse({
      sessionId: UUID_1,
      departmentId: UUID_2,
      gradeCode: "XI",
      gradeName: "Class XI",
      displayOrder: 11,
      sectionCode: "XI-A",
      sectionName: "Class XI Section A",
      capacity: "0",
    });
    expect(zeroCapacity.success).toBe(false);
  });

  it("requires an exclusive scope target matching assignmentType and endsOn >= startsOn", () => {
    const validHod = assignAcademicResponsibilitySchema.safeParse({
      sessionId: UUID_1,
      personId: UUID_2,
      assignmentType: "hod",
      departmentId: UUID_3,
      startsOn: "2026-04-01",
      endsOn: "2027-03-31",
    });
    expect(validHod.success).toBe(true);

    const missingTarget = assignAcademicResponsibilitySchema.safeParse({
      sessionId: UUID_1,
      personId: UUID_2,
      assignmentType: "class_teacher",
      startsOn: "2026-04-01",
    });
    expect(missingTarget.success).toBe(false);

    const dualTargets = assignAcademicResponsibilitySchema.safeParse({
      sessionId: UUID_1,
      personId: UUID_2,
      assignmentType: "subject_teacher",
      sectionId: UUID_3,
      teachingGroupId: UUID_3,
      startsOn: "2026-04-01",
    });
    expect(dualTargets.success).toBe(false);

    const endsBeforeStart = assignAcademicResponsibilitySchema.safeParse({
      sessionId: UUID_1,
      personId: UUID_2,
      assignmentType: "monitor",
      sectionId: UUID_3,
      startsOn: "2026-05-01",
      endsOn: "2026-04-30",
    });
    expect(endsBeforeStart.success).toBe(false);
  });
});
