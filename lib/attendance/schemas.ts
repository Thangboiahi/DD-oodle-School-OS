import { z } from "zod";

export const STUDENT_DAILY_ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "late",
  "half_day",
  "excused_leave",
  "on_duty",
] as const;

export const STUDENT_PERIOD_ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "late",
  "excused_leave",
  "on_duty",
] as const;

export const STAFF_ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "late",
  "half_day",
  "on_leave",
  "on_duty",
] as const;

export const STUDENT_VERIFICATION_STATUSES = [
  "draft",
  "class_teacher_verified",
  "signed_off",
] as const;

export const STAFF_VERIFICATION_STATUSES = [
  "draft",
  "verified",
  "signed_off",
] as const;

export const ATTENDANCE_EVENT_TYPES = [
  "arrival",
  "day_roll",
  "period_roll",
  "early_departure",
  "dismissal",
  "staff_check_in",
  "staff_check_out",
  "correction",
] as const;

export const ATTENDANCE_SOURCES = [
  "manual",
  "offline_queue",
  "device_gateway",
] as const;

export const ATTENDANCE_SUBJECT_KINDS = ["student", "staff"] as const;

export type StudentDailyAttendanceStatus =
  (typeof STUDENT_DAILY_ATTENDANCE_STATUSES)[number];
export type StudentPeriodAttendanceStatus =
  (typeof STUDENT_PERIOD_ATTENDANCE_STATUSES)[number];
export type StaffAttendanceStatus = (typeof STAFF_ATTENDANCE_STATUSES)[number];
export type StudentVerificationStatus =
  (typeof STUDENT_VERIFICATION_STATUSES)[number];
export type StaffVerificationStatus =
  (typeof STAFF_VERIFICATION_STATUSES)[number];
export type AttendanceEventType = (typeof ATTENDANCE_EVENT_TYPES)[number];
export type AttendanceSource = (typeof ATTENDANCE_SOURCES)[number];
export type AttendanceSubjectKind = (typeof ATTENDANCE_SUBJECT_KINDS)[number];

export function isValidCalendarIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parts = value.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 0;
  const day = parts[2] ?? 0;
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.")
  .refine(isValidCalendarIsoDate, "Enter a valid calendar date.");

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().max(maxLength).optional());

const optionalUuidSchema = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().uuid().optional());

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, "Idempotency key must be at least 8 characters.")
  .max(160, "Idempotency key must be at most 160 characters.")
  .regex(
    /^[A-Za-z0-9:_.-]+$/,
    "Idempotency key may contain only letters, digits, colons, underscores, dots, and hyphens.",
  );

const optionalIdempotencyKeySchema = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, idempotencyKeySchema.optional());

export const correctionReasonSchema = z
  .string()
  .trim()
  .min(5, "Correction reason must be at least 5 characters.")
  .max(500, "Correction reason must be at most 500 characters.");

export const isoDatetimeWithOffsetSchema = z
  .string()
  .trim()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})$/,
    "Timestamp must include ISO date, time, and UTC offset.",
  )
  .refine(
    (value) => Number.isFinite(Date.parse(value)),
    "Timestamp must be a valid ISO datetime.",
  );

const optionalIsoDatetimeSchema = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, isoDatetimeWithOffsetSchema.optional());

export const studentDailyRollEntrySchema = z
  .object({
    studentEnrolmentId: z.string().uuid(),
    studentProfileId: z.string().uuid(),
    status: z.enum(STUDENT_DAILY_ATTENDANCE_STATUSES),
    remarks: optionalTrimmedString(240),
    idempotencyKey: optionalIdempotencyKeySchema,
  })
  .strict();

export const markStudentDailyRollSchema = z
  .object({
    sectionId: z.string().uuid(),
    attendanceDate: isoDateSchema,
    entries: z
      .array(studentDailyRollEntrySchema)
      .min(1, "Include at least one student roll entry.")
      .max(200, "Daily roll supports up to 200 students per submission."),
  })
  .strict();

export const verifySectionAttendanceSchema = z
  .object({
    sectionId: z.string().uuid(),
    attendanceDate: isoDateSchema,
  })
  .strict();

export const signOffSectionAttendanceSchema = z
  .object({
    sectionId: z.string().uuid(),
    attendanceDate: isoDateSchema,
  })
  .strict();

export const correctStudentAttendanceSchema = z
  .object({
    attendanceId: z.string().uuid(),
    newStatus: z.enum(STUDENT_DAILY_ATTENDANCE_STATUSES),
    correctionReason: correctionReasonSchema,
    remarks: optionalTrimmedString(240),
    idempotencyKey: optionalIdempotencyKeySchema,
  })
  .strict();

export const periodAttendanceEntrySchema = z
  .object({
    studentEnrolmentId: z.string().uuid(),
    studentProfileId: z.string().uuid(),
    status: z.enum(STUDENT_PERIOD_ATTENDANCE_STATUSES),
    remarks: optionalTrimmedString(240),
    idempotencyKey: optionalIdempotencyKeySchema,
  })
  .strict();

export const markPeriodAttendanceSchema = z
  .object({
    teachingGroupId: z.string().uuid(),
    attendanceDate: isoDateSchema,
    periodCode: z
      .string()
      .trim()
      .min(1, "Period code is required.")
      .max(20, "Period code must be at most 20 characters.")
      .regex(
        /^[A-Za-z0-9_.-]+$/,
        "Period code may contain only letters, numbers, underscores, dots, and hyphens.",
      ),
    entries: z
      .array(periodAttendanceEntrySchema)
      .min(1, "Include at least one student entry.")
      .max(200, "Period roll supports up to 200 students per submission."),
  })
  .strict();

export const recordStaffAttendanceSchema = z
  .object({
    staffProfileId: z.string().uuid(),
    attendanceDate: isoDateSchema,
    status: z.enum(STAFF_ATTENDANCE_STATUSES),
    checkInAt: optionalIsoDatetimeSchema,
    checkOutAt: optionalIsoDatetimeSchema,
    remarks: optionalTrimmedString(240),
    idempotencyKey: optionalIdempotencyKeySchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.checkInAt &&
      data.checkOutAt &&
      Date.parse(data.checkOutAt) < Date.parse(data.checkInAt)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Check-out timestamp must not precede check-in timestamp.",
        path: ["checkOutAt"],
      });
    }
  });

export const verifyOrSignOffStaffAttendanceSchema = z
  .object({
    attendanceId: z.string().uuid(),
    targetStatus: z.enum(["verified", "signed_off"]),
  })
  .strict();

export const correctStaffAttendanceSchema = z
  .object({
    attendanceId: z.string().uuid(),
    newStatus: z.enum(STAFF_ATTENDANCE_STATUSES),
    correctionReason: correctionReasonSchema,
    remarks: optionalTrimmedString(240),
    idempotencyKey: optionalIdempotencyKeySchema,
  })
  .strict();

export const updateAttendancePolicySchema = z
  .object({
    minimumAttendancePercent: z.coerce
      .number()
      .min(1, "Minimum attendance % must be between 1 and 100.")
      .max(100, "Minimum attendance % must be between 1 and 100."),
    warningThresholdPercent: z.coerce
      .number()
      .min(1, "Warning threshold % must be between 1 and 100.")
      .max(100, "Warning threshold % must be between 1 and 100."),
    periodAttendanceEnabled: z.boolean(),
    policyNotes: optionalTrimmedString(500),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.warningThresholdPercent < data.minimumAttendancePercent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Warning threshold % must be greater than or equal to minimum attendance %.",
        path: ["warningThresholdPercent"],
      });
    }
  });

export const offlineSyncEventSchema = z
  .object({
    idempotencyKey: idempotencyKeySchema,
    subjectKind: z.enum(ATTENDANCE_SUBJECT_KINDS),
    studentProfileId: optionalUuidSchema,
    staffProfileId: optionalUuidSchema,
    studentEnrolmentId: optionalUuidSchema,
    sectionId: optionalUuidSchema,
    teachingGroupId: optionalUuidSchema,
    attendanceDate: isoDateSchema,
    eventType: z.enum(ATTENDANCE_EVENT_TYPES),
    attendanceStatus: z.enum(STUDENT_DAILY_ATTENDANCE_STATUSES),
    occurredAt: isoDatetimeWithOffsetSchema,
    periodCode: z.preprocess((value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }, z.string().min(1).max(20).optional()),
    remarks: optionalTrimmedString(240),
    reason: optionalTrimmedString(500),
    source: z.literal("offline_queue"),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.subjectKind === "student") {
      if (!data.studentProfileId || data.staffProfileId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Student offline events must specify studentProfileId and omit staffProfileId.",
          path: ["studentProfileId"],
        });
      }
    } else if (!data.staffProfileId || data.studentProfileId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Staff offline events must specify staffProfileId and omit studentProfileId.",
        path: ["staffProfileId"],
      });
    }

    if (data.eventType === "day_roll" && !data.sectionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Daily roll offline events require sectionId.",
        path: ["sectionId"],
      });
    }

    if (
      data.eventType === "period_roll" &&
      (!data.teachingGroupId || !data.periodCode)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Period roll offline events require both teachingGroupId and periodCode.",
        path: ["teachingGroupId"],
      });
    }

    if (
      data.eventType === "correction" &&
      (!data.reason || data.reason.trim().length < 5)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Correction offline events require a reason of at least 5 characters.",
        path: ["reason"],
      });
    }
  });

export const offlineSyncBatchSchema = z
  .object({
    events: z
      .array(offlineSyncEventSchema)
      .min(1, "Queued batch must contain at least 1 event.")
      .max(100, "Queued batch may contain at most 100 events."),
  })
  .strict();

export type OfflineSyncEventInput = z.infer<typeof offlineSyncEventSchema>;
export type OfflineSyncBatchInput = z.infer<typeof offlineSyncBatchSchema>;
export type MarkStudentDailyRollInput = z.infer<
  typeof markStudentDailyRollSchema
>;
export type CorrectStudentAttendanceInput = z.infer<
  typeof correctStudentAttendanceSchema
>;
export type MarkPeriodAttendanceInput = z.infer<
  typeof markPeriodAttendanceSchema
>;
export type RecordStaffAttendanceInput = z.infer<
  typeof recordStaffAttendanceSchema
>;
export type CorrectStaffAttendanceInput = z.infer<
  typeof correctStaffAttendanceSchema
>;
export type UpdateAttendancePolicyInput = z.infer<
  typeof updateAttendancePolicySchema
>;
