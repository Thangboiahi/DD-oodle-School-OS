import { z } from "zod";

export const VENUE_KINDS = [
  "classroom",
  "lab",
  "hall",
  "library",
  "sports",
  "other",
] as const;

export type VenueKind = (typeof VENUE_KINDS)[number];

export const TIMETABLE_PERIOD_KINDS = [
  "instructional",
  "break",
  "assembly",
  "activity",
] as const;

export type TimetablePeriodKind = (typeof TIMETABLE_PERIOD_KINDS)[number];

export const TIMETABLE_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;

export type TimetableStatus = (typeof TIMETABLE_STATUSES)[number];

export const SUBSTITUTION_STATUSES = [
  "assigned",
  "completed",
  "cancelled",
] as const;

export type SubstitutionStatus = (typeof SUBSTITUTION_STATUSES)[number];

export const CALENDAR_SCOPE_TYPES = [
  "institution",
  "department",
  "section",
] as const;

export type CalendarScopeType = (typeof CALENDAR_SCOPE_TYPES)[number];

export const CALENDAR_EVENT_KINDS = [
  "holiday",
  "working_day",
  "exam",
  "parent_meeting",
  "event",
  "deadline",
  "activity",
] as const;

export type CalendarEventKind = (typeof CALENDAR_EVENT_KINDS)[number];

export const CALENDAR_EVENT_STATUSES = [
  "draft",
  "published",
  "cancelled",
] as const;

export type CalendarEventStatus = (typeof CALENDAR_EVENT_STATUSES)[number];

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export function normalizeTimeString(value: string): string {
  const trimmed = value.trim();
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}

const optionalUuidField = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().uuid("Select a valid identifier.").nullable(),
);

const optionalIsoDateField = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z
    .string()
    .regex(ISO_DATE_REGEX, "Use valid YYYY-MM-DD date format.")
    .nullable(),
);

const optionalTrimmedText = (maxLen: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(maxLen).optional(),
  );

const optionalPositiveIntField = z.preprocess(
  (value) =>
    value === "" || value === undefined || value === null ? null : value,
  z.coerce
    .number()
    .int("Capacity must be a whole number.")
    .positive("Capacity must be greater than 0.")
    .nullable(),
);

const booleanWithDefault = (defaultVal: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return defaultVal;
    }
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "on" || value === "1") return true;
    if (value === "false" || value === "off" || value === "0") return false;
    return value;
  }, z.boolean());

export const createVenueSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Venue code is required.")
    .max(30, "Venue code cannot exceed 30 characters."),
  name: z
    .string()
    .trim()
    .min(2, "Venue name must be at least 2 characters.")
    .max(120, "Venue name cannot exceed 120 characters."),
  venueKind: z.enum(VENUE_KINDS),
  capacity: optionalPositiveIntField.optional().default(null),
  building: optionalTrimmedText(80),
  floor: optionalTrimmedText(80),
  isActive: booleanWithDefault(true),
});

export type CreateVenueInput = z.infer<typeof createVenueSchema>;

export const createTimetablePeriodSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Period code is required.")
      .max(20, "Period code cannot exceed 20 characters."),
    label: z
      .string()
      .trim()
      .min(2, "Period label must be at least 2 characters.")
      .max(80, "Period label cannot exceed 80 characters."),
    periodKind: z.enum(TIMETABLE_PERIOD_KINDS),
    sequenceNo: z.coerce
      .number()
      .int("Sequence number must be a whole number.")
      .positive("Sequence number must be greater than 0."),
    startTime: z
      .string()
      .trim()
      .regex(TIME_24H_REGEX, "Start time must be HH:MM or HH:MM:SS."),
    endTime: z
      .string()
      .trim()
      .regex(TIME_24H_REGEX, "End time must be HH:MM or HH:MM:SS."),
  })
  .refine(
    (data) =>
      normalizeTimeString(data.endTime) > normalizeTimeString(data.startTime),
    {
      path: ["endTime"],
      message: "Period end time must be after start time.",
    },
  );

export type CreateTimetablePeriodInput = z.infer<
  typeof createTimetablePeriodSchema
>;

export const createTimetableSchema = z
  .object({
    termId: optionalUuidField.optional().default(null),
    code: z
      .string()
      .trim()
      .min(2, "Timetable code must be at least 2 characters.")
      .max(40, "Timetable code cannot exceed 40 characters."),
    name: z
      .string()
      .trim()
      .min(3, "Timetable name must be at least 3 characters.")
      .max(160, "Timetable name cannot exceed 160 characters."),
    versionNo: z.preprocess(
      (value) => (value === "" || value === undefined ? 1 : value),
      z.coerce
        .number()
        .int("Version number must be a whole number.")
        .min(1, "Version number must be at least 1."),
    ),
    effectiveFrom: z
      .string()
      .trim()
      .regex(ISO_DATE_REGEX, "Effective from date must use YYYY-MM-DD."),
    effectiveTo: optionalIsoDateField.optional().default(null),
    isOfflineCacheable: booleanWithDefault(true),
    initialStatus: z.enum(["draft", "published"]).default("draft"),
  })
  .refine(
    (data) => !data.effectiveTo || data.effectiveTo >= data.effectiveFrom,
    {
      path: ["effectiveTo"],
      message: "Effective end date must be on or after the start date.",
    },
  );

export type CreateTimetableInput = z.infer<typeof createTimetableSchema>;

export const transitionTimetableStatusSchema = z.object({
  timetableId: z.string().uuid("Select a valid timetable."),
  targetStatus: z.enum(["published", "archived"]),
});

export type TransitionTimetableStatusInput = z.infer<
  typeof transitionTimetableStatusSchema
>;

export const createTimetableSlotSchema = z
  .object({
    timetableId: z.string().uuid("Select a valid timetable."),
    dayOfWeek: z.coerce
      .number()
      .int("Day of week must be between 1 and 7.")
      .min(1, "Day of week must be between 1 (Monday) and 7 (Sunday).")
      .max(7, "Day of week must be between 1 (Monday) and 7 (Sunday)."),
    periodId: z.string().uuid("Select a valid timetable period."),
    teachingGroupId: optionalUuidField.optional().default(null),
    sectionId: optionalUuidField.optional().default(null),
    teacherPersonId: optionalUuidField.optional().default(null),
    venueId: optionalUuidField.optional().default(null),
    notes: optionalTrimmedText(500),
  })
  .refine((data) => Boolean(data.teachingGroupId || data.sectionId), {
    path: ["teachingGroupId"],
    message: "Select at least a teaching group or a section for the slot.",
  });

export type CreateTimetableSlotInput = z.infer<
  typeof createTimetableSlotSchema
>;

export const createSubstitutionSchema = z.object({
  timetableSlotId: z.string().uuid("Select a valid timetable slot."),
  substitutionDate: z
    .string()
    .trim()
    .regex(ISO_DATE_REGEX, "Substitution date must use YYYY-MM-DD."),
  substituteTeacherPersonId: z
    .string()
    .uuid("Select a valid substitute teacher."),
  reason: z
    .string()
    .trim()
    .min(4, "Substitution reason must be at least 4 characters.")
    .max(1000, "Substitution reason cannot exceed 1000 characters."),
});

export type CreateSubstitutionInput = z.infer<typeof createSubstitutionSchema>;

export const transitionSubstitutionStatusSchema = z.object({
  substitutionId: z.string().uuid("Select a valid substitution record."),
  targetStatus: z.enum(["completed", "cancelled"]),
});

export type TransitionSubstitutionStatusInput = z.infer<
  typeof transitionSubstitutionStatusSchema
>;

export const createCalendarEventSchema = z
  .object({
    termId: optionalUuidField.optional().default(null),
    scopeType: z.enum(CALENDAR_SCOPE_TYPES),
    departmentId: optionalUuidField.optional().default(null),
    sectionId: optionalUuidField.optional().default(null),
    eventKind: z.enum(CALENDAR_EVENT_KINDS),
    title: z
      .string()
      .trim()
      .min(3, "Event title must be at least 3 characters.")
      .max(160, "Event title cannot exceed 160 characters."),
    description: optionalTrimmedText(2000),
    startsOn: z
      .string()
      .trim()
      .regex(ISO_DATE_REGEX, "Start date must use YYYY-MM-DD."),
    endsOn: z
      .string()
      .trim()
      .regex(ISO_DATE_REGEX, "End date must use YYYY-MM-DD."),
    isNonInstructional: booleanWithDefault(false),
    status: z.enum(["draft", "published"]).default("published"),
  })
  .superRefine((data, ctx) => {
    if (data.endsOn < data.startsOn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsOn"],
        message: "Event end date must be on or after the start date.",
      });
    }

    if (data.scopeType === "institution") {
      if (data.departmentId !== null || data.sectionId !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scopeType"],
          message:
            "Institution-wide calendar events must not target a specific department or section.",
        });
      }
    } else if (data.scopeType === "department") {
      if (!data.departmentId || data.sectionId !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["departmentId"],
          message:
            "Department calendar events require a department and must not select a section.",
        });
      }
    } else if (data.scopeType === "section") {
      if (!data.sectionId || data.departmentId !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sectionId"],
          message:
            "Section calendar events require a section and must not select a department.",
        });
      }
    }
  });

export type CreateCalendarEventInput = z.infer<
  typeof createCalendarEventSchema
>;

export const updateCalendarEventStatusSchema = z.object({
  eventId: z.string().uuid("Select a valid calendar event."),
  targetStatus: z.enum(["published", "cancelled"]),
});

export type UpdateCalendarEventStatusInput = z.infer<
  typeof updateCalendarEventStatusSchema
>;
