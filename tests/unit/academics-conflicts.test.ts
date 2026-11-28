import { describe, expect, it } from "vitest";
import {
  detectAcademicAssignmentConflicts,
  resolveSectionRoleAssignments,
  validateCrossSectionGroupMembership,
  type ExistingAcademicAssignmentLike,
} from "@/lib/academics/conflicts";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_SESSION_ID = "22222222-2222-4222-8222-222222222222";
const SECTION_XI_A = "33333333-3333-4333-8333-333333333333";
const SECTION_XI_B = "44444444-4444-4444-8444-444444444444";
const DEPT_SENIOR = "55555555-5555-4555-8555-555555555555";
const GROUP_APPMATH = "66666666-6666-4666-8666-666666666666";
const TEACHER_1 = "77777777-7777-4777-8777-777777777771";
const TEACHER_2 = "77777777-7777-4777-8777-777777777772";
const STUDENT_1 = "88888888-8888-4888-8888-888888888881";
const STUDENT_2 = "88888888-8888-4888-8888-888888888882";

const existingAssignments: ExistingAcademicAssignmentLike[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    sessionId: SESSION_ID,
    personId: TEACHER_1,
    assignmentType: "class_teacher",
    departmentId: null,
    sectionId: SECTION_XI_A,
    teachingGroupId: null,
    startsOn: "2026-04-01",
    endsOn: "2026-09-30",
    status: "active",
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    sessionId: SESSION_ID,
    personId: TEACHER_2,
    assignmentType: "class_teacher",
    departmentId: null,
    sectionId: SECTION_XI_B,
    teachingGroupId: null,
    startsOn: "2026-04-01",
    endsOn: null,
    status: "revoked",
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
    sessionId: SESSION_ID,
    personId: STUDENT_1,
    assignmentType: "monitor",
    departmentId: null,
    sectionId: SECTION_XI_A,
    teachingGroupId: null,
    startsOn: "2026-04-01",
    endsOn: null,
    status: "active",
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
    sessionId: SESSION_ID,
    personId: TEACHER_1,
    assignmentType: "hod",
    departmentId: DEPT_SENIOR,
    sectionId: null,
    teachingGroupId: null,
    startsOn: "2026-04-01",
    endsOn: null,
    status: "active",
  },
];

describe("detectAcademicAssignmentConflicts", () => {
  it("rejects overlapping active class_teacher on the same section", () => {
    const result = detectAcademicAssignmentConflicts(existingAssignments, {
      sessionId: SESSION_ID,
      personId: TEACHER_2,
      assignmentType: "class_teacher",
      sectionId: SECTION_XI_A,
      startsOn: "2026-07-01",
      endsOn: "2027-03-31",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Class Teacher");
    }
  });

  it("allows non-overlapping successor class_teacher and ignores revoked prior assignments", () => {
    const successor = detectAcademicAssignmentConflicts(existingAssignments, {
      sessionId: SESSION_ID,
      personId: TEACHER_2,
      assignmentType: "class_teacher",
      sectionId: SECTION_XI_A,
      startsOn: "2026-10-01",
      endsOn: "2027-03-31",
    });
    expect(successor.ok).toBe(true);

    const afterRevoked = detectAcademicAssignmentConflicts(existingAssignments, {
      sessionId: SESSION_ID,
      personId: TEACHER_1,
      assignmentType: "class_teacher",
      sectionId: SECTION_XI_B,
      startsOn: "2026-05-01",
    });
    expect(afterRevoked.ok).toBe(true);
  });

  it("permits concurrent HOD + Class Teacher + Subject Teacher roles for the same staff person", () => {
    const concurrentSubjectTeacher = detectAcademicAssignmentConflicts(
      existingAssignments,
      {
        sessionId: SESSION_ID,
        personId: TEACHER_1,
        assignmentType: "subject_teacher",
        teachingGroupId: GROUP_APPMATH,
        startsOn: "2026-04-01",
      },
    );
    expect(concurrentSubjectTeacher.ok).toBe(true);
  });

  it("allows monitor + monitress concurrently on the same section while rejecting duplicate monitor", () => {
    const duplicateMonitor = detectAcademicAssignmentConflicts(
      existingAssignments,
      {
        sessionId: SESSION_ID,
        personId: STUDENT_2,
        assignmentType: "monitor",
        sectionId: SECTION_XI_A,
        startsOn: "2026-05-01",
      },
      [STUDENT_1, STUDENT_2],
    );
    expect(duplicateMonitor.ok).toBe(false);

    const pairedMonitress = detectAcademicAssignmentConflicts(
      existingAssignments,
      {
        sessionId: SESSION_ID,
        personId: STUDENT_2,
        assignmentType: "monitress",
        sectionId: SECTION_XI_A,
        startsOn: "2026-05-01",
      },
      [STUDENT_1, STUDENT_2],
    );
    expect(pairedMonitress.ok).toBe(true);
  });

  it("rejects monitor/monitress if student is not actively enrolled in that exact section", () => {
    const crossSectionMonitor = detectAcademicAssignmentConflicts(
      existingAssignments,
      {
        sessionId: SESSION_ID,
        personId: STUDENT_2,
        assignmentType: "monitress",
        sectionId: SECTION_XI_A,
        startsOn: "2026-05-01",
      },
      [STUDENT_1],
    );
    expect(crossSectionMonitor.ok).toBe(false);
    if (!crossSectionMonitor.ok) {
      expect(crossSectionMonitor.error).toContain("exact section");
    }
  });
});

describe("validateCrossSectionGroupMembership", () => {
  const offeringId = "99999999-9999-4999-8999-999999999999";
  const otherOfferingId = "99999999-9999-4999-8999-999999999998";
  const group = {
    id: GROUP_APPMATH,
    sessionId: SESSION_ID,
    subjectOfferingId: offeringId,
    isCrossSection: true,
  };

  it("permits students from XI-A and XI-B into one cross-section group when enrolled in the offering", () => {
    const xiAStudent = {
      id: "e1111111-1111-4111-8111-111111111111",
      sessionId: SESSION_ID,
      sectionId: SECTION_XI_A,
      status: "active",
    };
    const xiBStudent = {
      id: "e2222222-2222-4222-8222-222222222222",
      sessionId: SESSION_ID,
      sectionId: SECTION_XI_B,
      status: "active",
    };

    const subjectEnrolments = [
      {
        studentEnrolmentId: xiAStudent.id,
        subjectOfferingId: offeringId,
        status: "active",
      },
      {
        studentEnrolmentId: xiBStudent.id,
        subjectOfferingId: offeringId,
        status: "active",
      },
    ];

    expect(
      validateCrossSectionGroupMembership(xiAStudent, group, subjectEnrolments)
        .ok,
    ).toBe(true);
    expect(
      validateCrossSectionGroupMembership(xiBStudent, group, subjectEnrolments)
        .ok,
    ).toBe(true);
  });

  it("rejects mismatched session, inactive enrolment, or missing subject offering enrolment", () => {
    expect(
      validateCrossSectionGroupMembership(
        {
          id: "e3",
          sessionId: OTHER_SESSION_ID,
          sectionId: SECTION_XI_A,
          status: "active",
        },
        group,
        [],
      ).ok,
    ).toBe(false);

    expect(
      validateCrossSectionGroupMembership(
        {
          id: "e4",
          sessionId: SESSION_ID,
          sectionId: SECTION_XI_A,
          status: "withdrawn",
        },
        group,
        [],
      ).ok,
    ).toBe(false);

    expect(
      validateCrossSectionGroupMembership(
        {
          id: "e5",
          sessionId: SESSION_ID,
          sectionId: SECTION_XI_A,
          status: "active",
        },
        group,
        [
          {
            studentEnrolmentId: "e5",
            subjectOfferingId: otherOfferingId,
            status: "active",
          },
        ],
      ).ok,
    ).toBe(false);
  });
});

describe("resolveSectionRoleAssignments", () => {
  it("resolves active classTeacher, monitors, and monitor read-only flag for currentPersonId", () => {
    const assignments = [
      {
        id: "1",
        personId: TEACHER_1,
        personName: "Synthetic Class Teacher 11A",
        assignmentType: "class_teacher" as const,
        status: "active" as const,
      },
      {
        id: "2",
        personId: STUDENT_1,
        personName: "Diya Nair",
        assignmentType: "monitor" as const,
        status: "active" as const,
      },
      {
        id: "3",
        personId: STUDENT_2,
        personName: "Former Monitress",
        assignmentType: "monitress" as const,
        status: "revoked" as const,
      },
    ];

    const forMonitor = resolveSectionRoleAssignments(assignments, STUDENT_1);
    expect(forMonitor.classTeacher?.personName).toBe(
      "Synthetic Class Teacher 11A",
    );
    expect(forMonitor.monitors.map((m) => m.personName)).toEqual(["Diya Nair"]);
    expect(forMonitor.isCurrentUserMonitorReadOnly).toBe(true);

    const forTeacher = resolveSectionRoleAssignments(assignments, TEACHER_1);
    expect(forTeacher.isCurrentUserMonitorReadOnly).toBe(false);
  });
});
