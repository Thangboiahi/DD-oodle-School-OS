import { z } from "zod";
import { isSafeHttpUrl } from "@/lib/planning/rules";

export const ACADEMIC_TERM_STATUSES = [
  "planned",
  "active",
  "completed",
] as const;

export type AcademicTermStatus = (typeof ACADEMIC_TERM_STATUSES)[number];

export const SYLLABUS_ITEM_KINDS = ["unit", "chapter", "topic"] as const;

export type SyllabusItemKind = (typeof SYLLABUS_ITEM_KINDS)[number];

export const SYLLABUS_PROGRESS_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
  "revised",
  "delayed",
] as const;

export type SyllabusProgressStatus =
  (typeof SYLLABUS_PROGRESS_STATUSES)[number];

export const LESSON_PLAN_STATUSES = [
  "planned",
  "delivered",
  "revised",
  "carried_forward",
] as const;

export type LessonPlanStatus = (typeof LESSON_PLAN_STATUSES)[number];

export const LEARNING_RESOURCE_KINDS = [
  "link",
  "document_ref",
  "notes",
  "worksheet",
] as const;

export type LearningResourceKind = (typeof LEARNING_RESOURCE_KINDS)[number];

export const LEARNING_RESOURCE_VISIBILITIES = [
  "teaching_group",
  "subject_offering",
  "staff_only",
] as const;

export type LearningResourceVisibility =
  (typeof LEARNING_RESOURCE_VISIBILITIES)[number];

export const LEARNING_RESOURCE_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;

export type LearningResourceStatus =
  (typeof LEARNING_RESOURCE_STATUSES)[number];

const optionalUuidField = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().uuid().nullable(),
);

const optionalIsoDateField = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use valid YYYY-MM-DD date format.")
    .nullable(),
);

const optionalTrimmedText = (maxLen: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(maxLen).optional(),
  );

export const upsertAcademicTermStatusSchema = z.object({
  termId: z.string().uuid("Valid academic term ID is required."),
  status: z.enum(ACADEMIC_TERM_STATUSES),
});

export type UpsertAcademicTermStatusInput = z.infer<
  typeof upsertAcademicTermStatusSchema
>;

export const createSyllabusItemSchema = z
  .object({
    subjectOfferingId: z.string().uuid("Select a valid subject offering."),
    termId: optionalUuidField,
    parentItemId: optionalUuidField,
    itemKind: z.enum(SYLLABUS_ITEM_KINDS),
    code: z
      .string()
      .trim()
      .min(1, "Item code is required.")
      .max(40, "Item code must be 40 characters or fewer."),
    title: z
      .string()
      .trim()
      .min(2, "Syllabus title must be at least 2 characters.")
      .max(160, "Syllabus title must be 160 characters or fewer."),
    description: optionalTrimmedText(2000),
    sequenceNo: z.coerce
      .number()
      .int("Sequence must be a whole number.")
      .min(1, "Sequence must be at least 1."),
    targetDate: optionalIsoDateField,
    progressStatus: z.enum(SYLLABUS_PROGRESS_STATUSES).default("not_started"),
    delayReason: optionalTrimmedText(1000),
    carryForwardNotes: optionalTrimmedText(2000),
  })
  .superRefine((data, ctx) => {
    if (
      data.progressStatus === "delayed" &&
      (!data.delayReason || data.delayReason.trim().length < 5)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["delayReason"],
        message:
          "Delay reason (at least 5 characters) is mandatory when progress status is delayed.",
      });
    }
  });

export type CreateSyllabusItemInput = z.infer<typeof createSyllabusItemSchema>;

export const updateSyllabusProgressSchema = z
  .object({
    itemId: z.string().uuid("Valid syllabus item ID is required."),
    progressStatus: z.enum(SYLLABUS_PROGRESS_STATUSES),
    targetDate: optionalIsoDateField,
    delayReason: optionalTrimmedText(1000),
    carryForwardNotes: optionalTrimmedText(2000),
  })
  .superRefine((data, ctx) => {
    if (
      data.progressStatus === "delayed" &&
      (!data.delayReason || data.delayReason.trim().length < 5)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["delayReason"],
        message:
          "Delay reason (at least 5 characters) is mandatory when marking an item delayed.",
      });
    }
  });

export type UpdateSyllabusProgressInput = z.infer<
  typeof updateSyllabusProgressSchema
>;

export const createLessonPlanSchema = z.object({
  teachingGroupId: z.string().uuid("Select a valid teaching group."),
  syllabusItemId: optionalUuidField,
  plannedForDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use valid YYYY-MM-DD planned date."),
  weekLabel: optionalTrimmedText(40),
  title: z
    .string()
    .trim()
    .min(3, "Lesson title must be at least 3 characters.")
    .max(160, "Lesson title must be 160 characters or fewer."),
  learningObjectives: z
    .string()
    .trim()
    .min(5, "Learning objectives must be at least 5 characters.")
    .max(2000, "Learning objectives must be 2,000 characters or fewer."),
  teachingNotes: optionalTrimmedText(4000),
  status: z.enum(LESSON_PLAN_STATUSES).default("planned"),
  carryForwardNotes: optionalTrimmedText(2000),
});

export type CreateLessonPlanInput = z.infer<typeof createLessonPlanSchema>;

export const updateLessonPlanStatusSchema = z.object({
  lessonPlanId: z.string().uuid("Valid lesson plan ID is required."),
  status: z.enum(LESSON_PLAN_STATUSES),
  carryForwardNotes: optionalTrimmedText(2000),
  teachingNotes: optionalTrimmedText(4000),
});

export type UpdateLessonPlanStatusInput = z.infer<
  typeof updateLessonPlanStatusSchema
>;

export const createLearningResourceSchema = z
  .object({
    subjectOfferingId: z.string().uuid("Select a valid subject offering."),
    teachingGroupId: optionalUuidField,
    syllabusItemId: optionalUuidField,
    title: z
      .string()
      .trim()
      .min(3, "Resource title must be at least 3 characters.")
      .max(160, "Resource title must be 160 characters or fewer."),
    description: optionalTrimmedText(2000),
    resourceKind: z.enum(LEARNING_RESOURCE_KINDS),
    externalUrl: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? null : value,
      z.string().trim().max(1000).nullable(),
    ),
    storageBucket: optionalTrimmedText(120),
    storagePath: optionalTrimmedText(500),
    visibility: z.enum(LEARNING_RESOURCE_VISIBILITIES).default("teaching_group"),
    status: z.enum(LEARNING_RESOURCE_STATUSES).default("published"),
  })
  .superRefine((data, ctx) => {
    if (data.externalUrl !== null && !isSafeHttpUrl(data.externalUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["externalUrl"],
        message: "External URL must start with https:// or http://.",
      });
    }
    if (data.resourceKind === "link" && !data.externalUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["externalUrl"],
        message: "External URL is required when resource kind is link.",
      });
    }
    if (data.visibility === "teaching_group" && !data.teachingGroupId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["teachingGroupId"],
        message:
          "Teaching group selection is required when visibility is teaching_group.",
      });
    }
  });

export type CreateLearningResourceInput = z.infer<
  typeof createLearningResourceSchema
>;

export const transitionResourceStatusSchema = z.object({
  resourceId: z.string().uuid("Valid learning resource ID is required."),
  targetStatus: z.enum(["published", "archived"]),
});

export type TransitionResourceStatusInput = z.infer<
  typeof transitionResourceStatusSchema
>;
