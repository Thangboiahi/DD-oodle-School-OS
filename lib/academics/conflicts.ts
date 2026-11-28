import type {
  AcademicAssignmentStatus,
  AcademicAssignmentType,
} from "@/lib/academics/schemas";

export interface ExistingAcademicAssignmentLike {
  id: string;
  sessionId: string;
  personId: string;
  assignmentType: AcademicAssignmentType;
  departmentId: string | null;
  sectionId: string | null;
  teachingGroupId: string | null;
  startsOn: string;
  endsOn: string | null;
  status: AcademicAssignmentStatus;
}

export interface CandidateAcademicAssignment {
  sessionId: string;
  personId: string;
  assignmentType: AcademicAssignmentType;
  departmentId?: string | null;
  sectionId?: string | null;
  teachingGroupId?: string | null;
  startsOn: string;
  endsOn?: string | null;
  status?: AcademicAssignmentStatus;
}

export type ConflictCheckResult =
  | { ok: true }
  | { ok: false; error: string };

const OPEN_END_SENTINEL = "9999-12-31";

function isActiveStatus(status: AcademicAssignmentStatus | undefined): boolean {
  return status === undefined || status === "active" || status === "delegated";
}

function rangesOverlap(
  aStart: string,
  aEnd: string | null | undefined,
  bStart: string,
  bEnd: string | null | undefined,
): boolean {
  const effectiveAEnd = aEnd && aEnd.length > 0 ? aEnd : OPEN_END_SENTINEL;
  const effectiveBEnd = bEnd && bEnd.length > 0 ? bEnd : OPEN_END_SENTINEL;
  return aStart <= effectiveBEnd && bStart <= effectiveAEnd;
}

/**
 * Pure conflict check for time-bound academic assignments:
 * - Rejects overlapping active `class_teacher` on the same section.
 * - Rejects overlapping active `monitor` or `monitress` for the same role & section.
 * - Verifies `monitor`/`monitress` belongs to an active student enrolled in that exact section.
 * - Permits a teacher to hold concurrent roles (HOD + Class Teacher + multiple Subject Teacher groups).
 */
export function detectAcademicAssignmentConflicts(
  existing: readonly ExistingAcademicAssignmentLike[],
  candidate: CandidateAcademicAssignment,
  activeSectionStudentPersonIds?: readonly string[],
): ConflictCheckResult {
  if (!isActiveStatus(candidate.status)) {
    return { ok: true };
  }

  if (
    candidate.assignmentType === "monitor" ||
    candidate.assignmentType === "monitress"
  ) {
    if (
      activeSectionStudentPersonIds &&
      !activeSectionStudentPersonIds.includes(candidate.personId)
    ) {
      return {
        ok: false,
        error:
          "Monitor / Monitress assignment must target an active student enrolled in that exact section.",
      };
    }
  }

  for (const row of existing) {
    if (!isActiveStatus(row.status)) {
      continue;
    }
    if (row.sessionId !== candidate.sessionId) {
      continue;
    }
    if (
      !rangesOverlap(
        row.startsOn,
        row.endsOn,
        candidate.startsOn,
        candidate.endsOn,
      )
    ) {
      continue;
    }

    if (
      candidate.assignmentType === "class_teacher" &&
      row.assignmentType === "class_teacher" &&
      row.sectionId &&
      row.sectionId === candidate.sectionId
    ) {
      return {
        ok: false,
        error:
          "This section already has an overlapping active Class Teacher assignment.",
      };
    }

    if (
      (candidate.assignmentType === "monitor" ||
        candidate.assignmentType === "monitress") &&
      row.assignmentType === candidate.assignmentType &&
      row.sectionId &&
      row.sectionId === candidate.sectionId
    ) {
      return {
        ok: false,
        error: `This section already has an overlapping active ${candidate.assignmentType} assignment.`,
      };
    }
  }

  return { ok: true };
}

export interface StudentSessionEnrolmentLike {
  id: string;
  sessionId: string;
  sectionId: string;
  status: string;
}

export interface TeachingGroupLike {
  id: string;
  sessionId: string;
  subjectOfferingId: string;
  isCrossSection: boolean;
}

export interface StudentSubjectEnrolmentLike {
  studentEnrolmentId: string;
  subjectOfferingId: string;
  status: string;
}

/**
 * Pure validation for allocating a student to a teaching group:
 * - Requires active session enrolment matching `teachingGroup.sessionId`.
 * - Requires an active `student_subject_enrolments` row matching `teachingGroup.subjectOfferingId`.
 * - Permits students from multiple sections (e.g. XI-A and XI-B) in one cross-section group.
 */
export function validateCrossSectionGroupMembership(
  studentEnrolment: StudentSessionEnrolmentLike,
  teachingGroup: TeachingGroupLike,
  studentSubjectEnrolments: readonly StudentSubjectEnrolmentLike[],
): ConflictCheckResult {
  if (studentEnrolment.status !== "active") {
    return {
      ok: false,
      error: "Only actively enrolled students can be added to teaching groups.",
    };
  }

  if (studentEnrolment.sessionId !== teachingGroup.sessionId) {
    return {
      ok: false,
      error:
        "Student session enrolment does not belong to this teaching group's academic session.",
    };
  }

  const hasSubjectEnrolment = studentSubjectEnrolments.some(
    (entry) =>
      entry.studentEnrolmentId === studentEnrolment.id &&
      entry.subjectOfferingId === teachingGroup.subjectOfferingId &&
      entry.status === "active",
  );

  if (!hasSubjectEnrolment) {
    return {
      ok: false,
      error:
        "Student does not hold an active subject enrolment matching this teaching group's offering.",
    };
  }

  return { ok: true };
}

/**
 * Pure resolution of active/delegated section leadership roles and read-only
 * monitor banner state for the current authenticated person.
 */
export function resolveSectionRoleAssignments<
  T extends {
    personId: string;
    assignmentType: AcademicAssignmentType;
    status: AcademicAssignmentStatus;
  },
>(
  assignments: readonly T[],
  currentPersonId: string,
): {
  classTeacher: T | null;
  monitors: T[];
  isCurrentUserMonitorReadOnly: boolean;
} {
  const active = assignments.filter(
    (a) => a.status === "active" || a.status === "delegated",
  );
  const classTeacher =
    active.find((a) => a.assignmentType === "class_teacher") ?? null;
  const monitors = active.filter(
    (a) => a.assignmentType === "monitor" || a.assignmentType === "monitress",
  );
  const isCurrentUserMonitorReadOnly = monitors.some(
    (m) => m.personId === currentPersonId,
  );
  return { classTeacher, monitors, isCurrentUserMonitorReadOnly };
}
