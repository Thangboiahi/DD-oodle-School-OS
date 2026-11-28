import { z } from "zod";
import { isoDateSchema } from "@/lib/attendance/schemas";

export const LEAVE_APPLICANT_KINDS = ["student", "staff"] as const;

export const LEAVE_TYPES = [
  "sick",
  "casual",
  "family",
  "medical",
  "duty",
  "other",
] as const;

export const LEAVE_STATUSES = [
  "submitted",
  "approved",
  "rejected",
  "cancelled",
] as const;

export const PARENT_NOTICE_KINDS = [
  "absence",
  "late_arrival",
  "early_pickup",
] as const;

export const PARENT_NOTICE_STATUSES = ["submitted", "acknowledged"] as const;

export type LeaveApplicantKind = (typeof LEAVE_APPLICANT_KINDS)[number];
export type LeaveType = (typeof LEAVE_TYPES)[number];
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];
export type ParentNoticeKind = (typeof PARENT_NOTICE_KINDS)[number];
export type ParentNoticeStatus = (typeof PARENT_NOTICE_STATUSES)[number];

const optionalUuidSchema = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().uuid().optional());

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().max(maxLength).optional());

export const submitStudentLeaveSchema = z
  .object({
    studentProfileId: z.string().uuid("Select a valid student."),
    startsOn: isoDateSchema,
    endsOn: isoDateSchema,
    leaveType: z.enum(LEAVE_TYPES),
    reason: z
      .string()
      .trim()
      .min(5, "Leave reason must be at least 5 characters.")
      .max(1000, "Leave reason must be at most 1000 characters."),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.endsOn < data.startsOn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Leave end date must be on or after start date.",
        path: ["endsOn"],
      });
    }
  });

export const submitStaffLeaveSchema = z
  .object({
    startsOn: isoDateSchema,
    endsOn: isoDateSchema,
    leaveType: z.enum(LEAVE_TYPES),
    reason: z
      .string()
      .trim()
      .min(5, "Leave reason must be at least 5 characters.")
      .max(1000, "Leave reason must be at most 1000 characters."),
    staffProfileId: optionalUuidSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.endsOn < data.startsOn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Leave end date must be on or after start date.",
        path: ["endsOn"],
      });
    }
  });

export const reviewLeaveApplicationSchema = z
  .object({
    leaveId: z.string().uuid("Invalid leave application ID."),
    decision: z.enum(["approved", "rejected"]),
    decisionNote: optionalTrimmedString(500),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.decision === "rejected" &&
      (!data.decisionNote || data.decisionNote.trim().length < 3)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "A decision note of at least 3 characters is required when rejecting leave.",
        path: ["decisionNote"],
      });
    }
  });

export const cancelLeaveApplicationSchema = z
  .object({
    leaveId: z.string().uuid("Invalid leave application ID."),
  })
  .strict();

export const submitParentNoticeSchema = z
  .object({
    studentProfileId: z.string().uuid("Select a valid student."),
    attendanceDate: isoDateSchema,
    noticeKind: z.enum(PARENT_NOTICE_KINDS),
    message: z
      .string()
      .trim()
      .min(5, "Notice message must be at least 5 characters.")
      .max(1000, "Notice message must be at most 1000 characters."),
  })
  .strict();

export const acknowledgeParentNoticeSchema = z
  .object({
    noticeId: z.string().uuid("Invalid parent notice ID."),
  })
  .strict();

export type SubmitStudentLeaveInput = z.infer<typeof submitStudentLeaveSchema>;
export type SubmitStaffLeaveInput = z.infer<typeof submitStaffLeaveSchema>;
export type ReviewLeaveApplicationInput = z.infer<
  typeof reviewLeaveApplicationSchema
>;
export type CancelLeaveApplicationInput = z.infer<
  typeof cancelLeaveApplicationSchema
>;
export type SubmitParentNoticeInput = z.infer<typeof submitParentNoticeSchema>;
export type AcknowledgeParentNoticeInput = z.infer<
  typeof acknowledgeParentNoticeSchema
>;
