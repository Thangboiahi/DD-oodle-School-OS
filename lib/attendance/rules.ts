import type {
  AttendanceSource,
  StaffAttendanceStatus,
  StaffVerificationStatus,
  StudentDailyAttendanceStatus,
  StudentVerificationStatus,
} from "@/lib/attendance/schemas";

export interface VerificationTransitionOptions {
  allowPrincipalOverride?: boolean;
}

/**
 * Enforces one-way progression for student daily attendance sign-off:
 * `draft -> class_teacher_verified -> signed_off` (or `draft -> signed_off`
 * strictly when `allowPrincipalOverride` is enabled). Never permits silent
 * downgrades or same-state no-ops.
 */
export function canTransitionStudentVerification(
  from: StudentVerificationStatus,
  to: StudentVerificationStatus,
  options: VerificationTransitionOptions = {},
): boolean {
  if (from === to) {
    return false;
  }
  if (from === "draft" && to === "class_teacher_verified") {
    return true;
  }
  if (from === "class_teacher_verified" && to === "signed_off") {
    return true;
  }
  if (
    from === "draft" &&
    to === "signed_off" &&
    options.allowPrincipalOverride === true
  ) {
    return true;
  }
  return false;
}

/**
 * Enforces one-way progression for staff daily attendance sign-off:
 * `draft -> verified -> signed_off` (or `draft -> signed_off` with override).
 */
export function canTransitionStaffVerification(
  from: StaffVerificationStatus,
  to: StaffVerificationStatus,
  options: VerificationTransitionOptions = {},
): boolean {
  if (from === to) {
    return false;
  }
  if (from === "draft" && to === "verified") {
    return true;
  }
  if (from === "verified" && to === "signed_off") {
    return true;
  }
  if (
    from === "draft" &&
    to === "signed_off" &&
    options.allowPrincipalOverride === true
  ) {
    return true;
  }
  return false;
}

/**
 * Mandatory post-sign-off correction reason gate (ADR-0005).
 */
export function requiresCorrectionReason(
  verificationStatus: StudentVerificationStatus | StaffVerificationStatus,
): boolean {
  return verificationStatus === "signed_off";
}

/**
 * `staff_daily_attendance` distinguishes `on_leave`, whereas `attendance_events`
 * normalizes leave statuses to `excused_leave`.
 */
export function mapStaffStatusToEventStatus(
  status: StaffAttendanceStatus,
): StudentDailyAttendanceStatus {
  return status === "on_leave" ? "excused_leave" : status;
}

export interface AttendanceStatusCounts {
  presentCount?: number;
  lateCount?: number;
  halfDayCount?: number;
  excusedLeaveCount?: number;
  onDutyCount?: number;
  absentCount?: number;
}

export interface AttendancePolicyThresholdConfig {
  minimumAttendancePercent: number;
  warningThresholdPercent: number;
  /**
   * Approved `excused_leave` counts toward marked days by default (`false`, so
   * only `present`, `late`, `on_duty` = 1.0 and `half_day` = 0.5 credit as
   * attended unless an institution enables excused-leave credit).
   */
  countExcusedLeaveAsPresent?: boolean;
}

export type AttendanceShortageStatus =
  | "healthy"
  | "warning"
  | "shortage"
  | "no_data";

export interface AttendanceShortageSummary {
  percentage: number | null;
  weightedPresent: number;
  totalMarked: number;
  status: AttendanceShortageStatus;
}

export function computeAttendanceShortage(
  counts: AttendanceStatusCounts,
  policy: AttendancePolicyThresholdConfig,
): AttendanceShortageSummary {
  const presentCount = Math.max(0, counts.presentCount ?? 0);
  const lateCount = Math.max(0, counts.lateCount ?? 0);
  const halfDayCount = Math.max(0, counts.halfDayCount ?? 0);
  const excusedLeaveCount = Math.max(0, counts.excusedLeaveCount ?? 0);
  const onDutyCount = Math.max(0, counts.onDutyCount ?? 0);
  const absentCount = Math.max(0, counts.absentCount ?? 0);

  const totalMarked =
    presentCount +
    lateCount +
    halfDayCount +
    excusedLeaveCount +
    onDutyCount +
    absentCount;

  if (totalMarked === 0) {
    return {
      percentage: null,
      weightedPresent: 0,
      totalMarked: 0,
      status: "no_data",
    };
  }

  const weightedPresent =
    presentCount +
    lateCount +
    onDutyCount +
    halfDayCount * 0.5 +
    (policy.countExcusedLeaveAsPresent ? excusedLeaveCount : 0);

  const rawPercentage = (weightedPresent / totalMarked) * 100;
  const percentage = Math.round(rawPercentage * 100) / 100;

  let status: AttendanceShortageStatus = "healthy";
  if (percentage < policy.minimumAttendancePercent) {
    status = "shortage";
  } else if (percentage < policy.warningThresholdPercent) {
    status = "warning";
  }

  return {
    percentage,
    weightedPresent,
    totalMarked,
    status,
  };
}

export function summarizeStudentDailyRecords(
  statuses: readonly StudentDailyAttendanceStatus[],
  policy: AttendancePolicyThresholdConfig,
): AttendanceShortageSummary & {
  presentCount: number;
  lateCount: number;
  halfDayCount: number;
  excusedLeaveCount: number;
  onDutyCount: number;
  absentCount: number;
} {
  let presentCount = 0;
  let lateCount = 0;
  let halfDayCount = 0;
  let excusedLeaveCount = 0;
  let onDutyCount = 0;
  let absentCount = 0;

  for (const status of statuses) {
    switch (status) {
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

  const summary = computeAttendanceShortage(
    {
      presentCount,
      lateCount,
      halfDayCount,
      excusedLeaveCount,
      onDutyCount,
      absentCount,
    },
    policy,
  );

  return {
    ...summary,
    presentCount,
    lateCount,
    halfDayCount,
    excusedLeaveCount,
    onDutyCount,
    absentCount,
  };
}

export interface AttendanceIdempotencyKeyInput {
  institutionId: string;
  scope:
    | "day_roll"
    | "period_roll"
    | "staff_check_in"
    | "staff_check_out"
    | "student_correction"
    | "staff_correction";
  targetId: string;
  attendanceDate: string;
  qualifier?: string;
  source?: AttendanceSource;
}

function sanitizeKeySegment(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.length > 0 ? cleaned : "default";
}

export function buildAttendanceIdempotencyKey(
  input: AttendanceIdempotencyKeyInput,
): string {
  const parts = [
    sanitizeKeySegment(input.source ?? "manual"),
    sanitizeKeySegment(input.scope),
    sanitizeKeySegment(input.institutionId.slice(0, 8)),
    sanitizeKeySegment(input.targetId),
    sanitizeKeySegment(input.attendanceDate),
  ];

  if (input.qualifier) {
    parts.push(sanitizeKeySegment(input.qualifier));
  }

  return parts.join(":").slice(0, 160);
}

/**
 * Normalizes `HH:MM`, `HH:MM:SS`, or a full ISO datetime with offset into an
 * ISO timestamp string for Postgres `timestamptz` columns.
 */
export function normalizeAttendanceTimestamp(
  attendanceDate: string,
  rawValue: string | null | undefined,
  timezoneOffset = "+05:30",
): string | undefined {
  if (!rawValue) return undefined;
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) return undefined;
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${attendanceDate}T${trimmed}:00${timezoneOffset}`;
  }
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${attendanceDate}T${trimmed}${timezoneOffset}`;
  }
  return trimmed;
}
