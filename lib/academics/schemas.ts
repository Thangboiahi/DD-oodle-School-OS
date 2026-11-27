import { z } from "zod";

export const ACADEMIC_SESSION_STATUSES = [
  "planned",
  "active",
  "archived",
] as const;

export const DEPARTMENT_KINDS = [
  "class_band",
  "subject_group",
  "functional",
] as const;

export const SUBJECT_CATEGORIES = [
  "core",
  "elective",
  "language",
  "additional",
  "co_scholastic",
] as const;

export const STUDENT_ENROLMENT_STATUSES = [
  "active",
  "promoted",
  "retained",
  "graduated",
  "withdrawn",
  "transferred",
] as const;

export const SUBJECT_ENROLMENT_KINDS = [
  "core",
  "elective",
  "additional",
] as const;

export const ACADEMIC_ASSIGNMENT_TYPES = [
  "hod",
  "class_teacher",
  "subject_teacher",
  "monitor",
  "monitress",
] as const;

export const ACADEMIC_ASSIGNMENT_STATUSES = [
  "active",
  "delegated",
  "completed",
  "revoked",
] as const;

export type AcademicSessionStatus = (typeof ACADEMIC_SESSION_STATUSES)[number];
export type DepartmentKind = (typeof DEPARTMENT_KINDS)[number];
export type SubjectCategory = (typeof SUBJECT_CATEGORIES)[number];
export type StudentEnrolmentStatus =
  (typeof STUDENT_ENROLMENT_STATUSES)[number];
export type SubjectEnrolmentKind = (typeof SUBJECT_ENROLMENT_KINDS)[number];
export type AcademicAssignmentType =
  (typeof ACADEMIC_ASSIGNMENT_TYPES)[number];
export type AcademicAssignmentStatus =
  (typeof ACADEMIC_ASSIGNMENT_STATUSES)[number];

const dateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.");

const optionalDateStringSchema = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, dateStringSchema.optional());

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

export const createSessionSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, "Session code is required.")
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/),
    name: z.string().trim().min(2, "Session name is required.").max(100),
    startsOn: dateStringSchema,
    endsOn: dateStringSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.endsOn <= data.startsOn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Session end date must be after start date.",
        path: ["endsOn"],
      });
    }
  });

export const createTermSchema = z
  .object({
    sessionId: z.string().uuid(),
    code: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/),
    name: z.string().trim().min(2).max(100),
    sequenceNo: z.coerce.number().int().positive("Sequence must be > 0."),
    startsOn: dateStringSchema,
    endsOn: dateStringSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.endsOn <= data.startsOn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Term end date must be after start date.",
        path: ["endsOn"],
      });
    }
  });

export const createDepartmentSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/),
    name: z.string().trim().min(2).max(100),
    departmentKind: z.enum(DEPARTMENT_KINDS).default("class_band"),
    description: optionalTrimmedString(240),
  })
  .strict();

export const createGradeAndSectionSchema = z
  .object({
    sessionId: z.string().uuid(),
    departmentId: z.string().uuid(),
    gradeCode: z.string().trim().min(1).max(20),
    gradeName: z.string().trim().min(1).max(80),
    displayOrder: z.coerce.number().int().min(0).default(0),
    sectionCode: z.string().trim().min(1).max(20),
    sectionName: z.string().trim().min(1).max(80),
    roomLabel: optionalTrimmedString(60),
    capacity: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? undefined : val),
      z.coerce.number().int().positive("Capacity must be > 0.").optional(),
    ),
  })
  .strict();

export const createSubjectAndOfferingSchema = z
  .object({
    sessionId: z.string().uuid(),
    gradeLevelId: z.string().uuid(),
    subjectCode: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/),
    subjectName: z.string().trim().min(2).max(100),
    boardSubjectCode: optionalTrimmedString(20),
    category: z.enum(SUBJECT_CATEGORIES).default("elective"),
    streamId: optionalUuidSchema,
    isMandatory: z.boolean().default(false),
    maxStudents: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? undefined : val),
      z.coerce.number().int().positive("Max students must be > 0.").optional(),
    ),
  })
  .strict();

export const enrolStudentSessionSchema = z
  .object({
    sessionId: z.string().uuid(),
    studentProfileId: z.string().uuid(),
    gradeLevelId: z.string().uuid(),
    sectionId: z.string().uuid(),
    streamId: optionalUuidSchema,
    rollNumber: optionalTrimmedString(20),
  })
  .strict();

export const enrolStudentSubjectSchema = z
  .object({
    sessionId: z.string().uuid(),
    studentEnrolmentId: z.string().uuid(),
    subjectOfferingId: z.string().uuid(),
    enrolmentKind: z.enum(SUBJECT_ENROLMENT_KINDS).default("elective"),
  })
  .strict();

export const createTeachingGroupSchema = z
  .object({
    sessionId: z.string().uuid(),
    subjectOfferingId: z.string().uuid(),
    code: z
      .string()
      .trim()
      .min(2)
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/),
    name: z.string().trim().min(2).max(120),
    isCrossSection: z.boolean().default(false),
    venueLabel: optionalTrimmedString(80),
  })
  .strict();

export const addTeachingGroupMemberSchema = z
  .object({
    teachingGroupId: z.string().uuid(),
    studentEnrolmentId: z.string().uuid(),
  })
  .strict();

export const assignAcademicResponsibilitySchema = z
  .object({
    sessionId: z.string().uuid(),
    personId: z.string().uuid(),
    assignmentType: z.enum(ACADEMIC_ASSIGNMENT_TYPES),
    departmentId: optionalUuidSchema,
    sectionId: optionalUuidSchema,
    teachingGroupId: optionalUuidSchema,
    startsOn: dateStringSchema,
    endsOn: optionalDateStringSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.endsOn && data.endsOn < data.startsOn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assignment end date must be on or after start date.",
        path: ["endsOn"],
      });
    }

    const hasDept = Boolean(data.departmentId);
    const hasSection = Boolean(data.sectionId);
    const hasGroup = Boolean(data.teachingGroupId);

    if (data.assignmentType === "hod") {
      if (!hasDept || hasSection || hasGroup) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "HOD assignments must target a departmentId exclusively.",
          path: ["departmentId"],
        });
      }
    } else if (
      data.assignmentType === "class_teacher" ||
      data.assignmentType === "monitor" ||
      data.assignmentType === "monitress"
    ) {
      if (!hasSection || hasDept || hasGroup) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Class teacher / monitor / monitress assignments must target a sectionId exclusively.",
          path: ["sectionId"],
        });
      }
    } else if (data.assignmentType === "subject_teacher") {
      if (!hasGroup || hasDept || hasSection) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Subject teacher assignments must target a teachingGroupId exclusively.",
          path: ["teachingGroupId"],
        });
      }
    }
  });
