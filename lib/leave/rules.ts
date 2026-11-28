import {
  isValidCalendarIsoDate,
  type StudentDailyAttendanceStatus,
  type StudentVerificationStatus,
} from "@/lib/attendance/schemas";
import type { LeaveStatus, ParentNoticeStatus } from "@/lib/leave/schemas";

const MS_PER_DAY = 86_400_000;

/**
 * Computes inclusive calendar days across two valid YYYY-MM-DD dates.
 * Throws if either date is invalid or `endsOn < startsOn`.
 */
export function calculateInclusiveLeaveDays(
  startsOn: string,
  endsOn: string,
): number {
  if (!isValidCalendarIsoDate(startsOn) || !isValidCalendarIsoDate(endsOn)) {
    throw new Error("Invalid calendar date supplied for leave range.");
  }
  if (endsOn < startsOn) {
    throw new Error("Leave end date must be on or after start date.");
  }

  const startMs = Date.parse(`${startsOn}T00:00:00Z`);
  const endMs = Date.parse(`${endsOn}T00:00:00Z`);
  return Math.floor((endMs - startMs) / MS_PER_DAY) + 1;
}

/**
 * Enforces state machine & role boundaries on leave applications:
 * - Only `submitted` rows may transition (all other states are terminal).
 * - `"reviewer"` may transition `submitted -> approved | rejected`.
 * - `"applicant"` may transition `submitted -> cancelled`.
 */
export function canTransitionLeaveStatus(
  currentStatus: LeaveStatus,
  targetStatus: LeaveStatus,
  actorRole: "applicant" | "reviewer",
): boolean {
  if (currentStatus !== "submitted" || currentStatus === targetStatus) {
    return false;
  }

  if (actorRole === "reviewer") {
    return targetStatus === "approved" || targetStatus === "rejected";
  }

  return targetStatus === "cancelled";
}

export interface ReviewLeaveAuthorityInput {
  isSelfApplicant: boolean;
  hasInstitutionalOverride: boolean;
  hasReviewAuthority: boolean;
}

/**
 * Prevents non-override staff members from approving/rejecting their own leave
 * application while respecting hierarchical / institutional authority.
 */
export function canReviewLeaveRecord(
  input: ReviewLeaveAuthorityInput,
): boolean {
  if (!input.hasReviewAuthority) {
    return false;
  }
  if (input.isSelfApplicant && !input.hasInstitutionalOverride) {
    return false;
  }
  return true;
}

/**
 * Parent attendance notices move one-way from `submitted -> acknowledged`.
 */
export function canAcknowledgeParentNotice(
  currentStatus: ParentNoticeStatus,
): boolean {
  return currentStatus === "submitted";
}

export interface SummarizableDailyRow {
  status: StudentDailyAttendanceStatus | null;
  verificationStatus: StudentVerificationStatus | null;
}

export interface DailyClassAttendanceSummary<
  TRow extends SummarizableDailyRow = SummarizableDailyRow,
> {
  rows: TRow[];
  presentCount: number;
  lateCount: number;
  halfDayCount: number;
  excusedLeaveCount: number;
  onDutyCount: number;
  absentCount: number;
  totalMarked: number;
  verifiedCount: number;
  signedOffCount: number;
  draftCount: number;
}

/**
 * Aggregates section/date counts and rows cleanly.
 * When `verifiedOnly: true` (Monitor / Monitress mode), strictly strips all
 * `draft` and unmarked rows from both `rows` and aggregate counts (`draftCount = 0`).
 */
export function summarizeDailyClassAttendance<
  TRow extends SummarizableDailyRow,
>(
  rows: readonly TRow[],
  options: { verifiedOnly: boolean },
): DailyClassAttendanceSummary<TRow> {
  const filteredRows = options.verifiedOnly
    ? rows.filter(
        (row) =>
          row.verificationStatus === "class_teacher_verified" ||
          row.verificationStatus === "signed_off",
      )
    : [...rows];

  let presentCount = 0;
  let lateCount = 0;
  let halfDayCount = 0;
  let excusedLeaveCount = 0;
  let onDutyCount = 0;
  let absentCount = 0;
  let totalMarked = 0;
  let verifiedCount = 0;
  let signedOffCount = 0;
  let draftCount = 0;

  for (const row of filteredRows) {
    if (row.verificationStatus === "class_teacher_verified") {
      verifiedCount += 1;
    } else if (row.verificationStatus === "signed_off") {
      signedOffCount += 1;
    } else if (row.verificationStatus === "draft") {
      draftCount += 1;
    }

    if (!row.status) {
      continue;
    }

    totalMarked += 1;
    switch (row.status) {
      case "present":
        presentCount += 1;
        break;
      case "late":
        lateCount += 1;
        break;
      case "half_day":
        halfDayCount += 1;
        break;
      case "excused_leave":
        excusedLeaveCount += 1;
        break;
      case "on_duty":
        onDutyCount += 1;
        break;
      case "absent":
        absentCount += 1;
        break;
    }
  }

  return {
    rows: filteredRows,
    presentCount,
    lateCount,
    halfDayCount,
    excusedLeaveCount,
    onDutyCount,
    absentCount,
    totalMarked,
    verifiedCount,
    signedOffCount,
    draftCount,
  };
}
