import { z } from "zod";

export const HANDBOOK_CATEGORIES = [
  "academic_observation",
  "notice_ack",
  "parent_comm_ref",
  "disciplinary",
  "student_support",
] as const;

export const HANDBOOK_VISIBILITY_SCOPES = [
  "student_and_guardian",
  "staff_academic",
  "class_teacher_and_leadership",
  "leadership_only",
] as const;

export const HANDBOOK_ENTRY_STATUSES = ["active", "archived"] as const;

export type HandbookCategory = (typeof HANDBOOK_CATEGORIES)[number];
export type HandbookVisibilityScope =
  (typeof HANDBOOK_VISIBILITY_SCOPES)[number];
export type HandbookEntryStatus = (typeof HANDBOOK_ENTRY_STATUSES)[number];

export const handbookCategorySchema = z.enum(HANDBOOK_CATEGORIES);
export const handbookVisibilitySchema = z.enum(HANDBOOK_VISIBILITY_SCOPES);

const optionalNullableUuidSchema = z.preprocess((value) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}, z.string().uuid().nullable().optional());

export const createHandbookEntrySchema = z
  .object({
    studentProfileId: z.string().uuid("Select a valid student."),
    category: handbookCategorySchema,
    visibilityScope: handbookVisibilitySchema,
    teachingGroupId: optionalNullableUuidSchema,
    title: z
      .string()
      .trim()
      .min(3, "Entry title must be at least 3 characters.")
      .max(160, "Entry title must be at most 160 characters."),
    body: z
      .string()
      .trim()
      .min(5, "Entry body must be at least 5 characters.")
      .max(4000, "Entry body must be at most 4000 characters."),
  })
  .strict();

export const updateHandbookEntrySchema = z
  .object({
    entryId: z.string().uuid("Invalid handbook entry ID."),
    studentProfileId: z.string().uuid("Invalid student profile ID."),
    title: z
      .string()
      .trim()
      .min(3, "Entry title must be at least 3 characters.")
      .max(160, "Entry title must be at most 160 characters."),
    body: z
      .string()
      .trim()
      .min(5, "Entry body must be at least 5 characters.")
      .max(4000, "Entry body must be at most 4000 characters."),
    visibilityScope: z.preprocess((value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }, handbookVisibilitySchema.optional()),
  })
  .strict();

export const archiveHandbookEntrySchema = z
  .object({
    entryId: z.string().uuid("Invalid handbook entry ID."),
    studentProfileId: z.string().uuid("Invalid student profile ID."),
  })
  .strict();

export const acknowledgeHandbookEntrySchema = z
  .object({
    entryId: z.string().uuid("Invalid handbook entry ID."),
    studentProfileId: z.string().uuid("Invalid student profile ID."),
  })
  .strict();

export type CreateHandbookEntryInput = z.infer<
  typeof createHandbookEntrySchema
>;
export type UpdateHandbookEntryInput = z.infer<
  typeof updateHandbookEntrySchema
>;
export type ArchiveHandbookEntryInput = z.infer<
  typeof archiveHandbookEntrySchema
>;
export type AcknowledgeHandbookEntryInput = z.infer<
  typeof acknowledgeHandbookEntrySchema
>;
