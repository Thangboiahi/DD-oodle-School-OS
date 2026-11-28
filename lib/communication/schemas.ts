import { z } from "zod";

export const NOTICE_SCOPE_TYPES = [
  "institution",
  "department",
  "section",
  "teaching_group",
] as const;

export type NoticeScopeType = (typeof NOTICE_SCOPE_TYPES)[number];

export const NOTICE_CATEGORIES = [
  "general",
  "academic",
  "exam",
  "attendance",
  "event",
  "urgent",
] as const;

export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

export const NOTICE_STATUSES = ["draft", "published", "archived"] as const;

export type NoticeStatus = (typeof NOTICE_STATUSES)[number];

export const ENQUIRY_CATEGORIES = [
  "academic",
  "attendance",
  "administration",
  "transport",
  "welfare",
  "other",
] as const;

export type EnquiryCategory = (typeof ENQUIRY_CATEGORIES)[number];

export const ENQUIRY_STATUSES = [
  "open",
  "in_review",
  "resolved",
  "closed",
] as const;

export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const RECORD_COMMENT_PARENT_KINDS = [
  "notice",
  "parent_enquiry",
  "assignment",
] as const;

export type RecordCommentParentKind =
  (typeof RECORD_COMMENT_PARENT_KINDS)[number];

const optionalUuidField = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().uuid().nullable(),
);

export const createOfficialNoticeSchema = z
  .object({
    scopeType: z.enum(NOTICE_SCOPE_TYPES),
    departmentId: optionalUuidField,
    sectionId: optionalUuidField,
    teachingGroupId: optionalUuidField,
    category: z.enum(NOTICE_CATEGORIES),
    title: z
      .string()
      .trim()
      .min(3, "Notice title must be at least 3 characters.")
      .max(160, "Notice title must be 160 characters or fewer."),
    body: z
      .string()
      .trim()
      .min(5, "Notice body must be at least 5 characters.")
      .max(5000, "Notice body must be 5,000 characters or fewer."),
    requiresAcknowledgement: z.boolean().default(false),
    isOfflineCacheable: z.boolean().default(false),
    initialStatus: z.enum(["draft", "published"]).default("published"),
  })
  .superRefine((data, ctx) => {
    const hasDept = data.departmentId !== null;
    const hasSection = data.sectionId !== null;
    const hasTg = data.teachingGroupId !== null;

    if (data.scopeType === "institution" && (hasDept || hasSection || hasTg)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Institution-wide notices must leave department, section, and teaching group empty.",
      });
    } else if (
      data.scopeType === "department" &&
      (!hasDept || hasSection || hasTg)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Department notices must select a department and leave section and teaching group empty.",
      });
    } else if (
      data.scopeType === "section" &&
      (!hasSection || hasDept || hasTg)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Section notices must select a section and leave department and teaching group empty.",
      });
    } else if (
      data.scopeType === "teaching_group" &&
      (!hasTg || hasDept || hasSection)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Teaching-group notices must select a teaching group and leave department and section empty.",
      });
    }
  });

export type CreateOfficialNoticeInput = z.infer<
  typeof createOfficialNoticeSchema
>;

export const transitionNoticeStatusSchema = z.object({
  noticeId: z.string().uuid("Valid notice ID is required."),
  targetStatus: z.enum(["published", "archived"]),
});

export type TransitionNoticeStatusInput = z.infer<
  typeof transitionNoticeStatusSchema
>;

export const acknowledgeNoticeSchema = z.object({
  noticeId: z.string().uuid("Valid notice ID is required."),
  studentProfileId: optionalUuidField,
  note: z
    .string()
    .trim()
    .max(500, "Acknowledgement note must be 500 characters or fewer.")
    .optional(),
});

export type AcknowledgeNoticeInput = z.infer<typeof acknowledgeNoticeSchema>;

export const createParentEnquirySchema = z.object({
  studentProfileId: z.string().uuid("Select a valid linked student."),
  category: z.enum(ENQUIRY_CATEGORIES),
  subject: z
    .string()
    .trim()
    .min(3, "Enquiry subject must be at least 3 characters.")
    .max(160, "Enquiry subject must be 160 characters or fewer."),
  body: z
    .string()
    .trim()
    .min(5, "Enquiry details must be at least 5 characters.")
    .max(4000, "Enquiry details must be 4,000 characters or fewer."),
  teachingGroupId: optionalUuidField,
});

export type CreateParentEnquiryInput = z.infer<
  typeof createParentEnquirySchema
>;

export const updateParentEnquirySchema = z
  .object({
    enquiryId: z.string().uuid("Valid enquiry ID is required."),
    targetStatus: z.enum(["in_review", "resolved", "closed"]),
    assignedToPersonId: optionalUuidField,
    resolutionSummary: z
      .string()
      .trim()
      .max(2000, "Resolution summary must be 2,000 characters or fewer.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.targetStatus === "resolved" &&
      (!data.resolutionSummary || data.resolutionSummary.trim().length < 5)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resolutionSummary"],
        message:
          "Resolution summary (at least 5 characters) is required when resolving an enquiry.",
      });
    }
  });

export type UpdateParentEnquiryInput = z.infer<
  typeof updateParentEnquirySchema
>;

export const createRecordCommentSchema = z.object({
  parentKind: z.enum(RECORD_COMMENT_PARENT_KINDS),
  parentId: z.string().uuid("Valid parent record ID is required."),
  body: z
    .string()
    .trim()
    .min(2, "Comment must be at least 2 characters.")
    .max(2000, "Comment must be 2,000 characters or fewer."),
  isInternalStaffNote: z.boolean().default(false),
});

export type CreateRecordCommentInput = z.infer<
  typeof createRecordCommentSchema
>;
