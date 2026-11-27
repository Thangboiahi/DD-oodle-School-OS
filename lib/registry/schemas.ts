import { z } from "zod";

export const STUDENT_LIFECYCLE_STATUSES = [
  "applicant",
  "admitted",
  "active",
  "promoted",
  "retained",
  "graduated",
  "withdrawn",
  "transferred",
] as const;

export const EXTERNAL_ID_VERIFICATION_STATUSES = [
  "unverified",
  "pending",
  "verified",
  "rejected",
] as const;

export const STAFF_EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "visiting",
  "support",
] as const;

export const STAFF_LIFECYCLE_STATUSES = [
  "applicant",
  "active",
  "on_leave",
  "transferred",
  "relieved",
  "retired",
] as const;

export const GUARDIAN_RELATIONSHIPS = [
  "mother",
  "father",
  "legal_guardian",
  "other",
] as const;

export const ADMISSION_STATUSES = [
  "enquiry",
  "submitted",
  "under_review",
  "approved",
  "waitlisted",
  "rejected",
  "withdrawn",
  "enrolled",
] as const;

export const CUSTOM_FIELD_ENTITY_TYPES = [
  "student",
  "staff",
  "guardian",
  "admission",
] as const;

export const CUSTOM_FIELD_DATA_TYPES = [
  "text",
  "number",
  "date",
  "boolean",
  "select",
] as const;

export const CUSTOM_FIELD_SENSITIVITY_LEVELS = [
  "standard",
  "restricted",
  "confidential",
] as const;

export type StudentLifecycleStatus =
  (typeof STUDENT_LIFECYCLE_STATUSES)[number];
export type ExternalIdVerificationStatus =
  (typeof EXTERNAL_ID_VERIFICATION_STATUSES)[number];
export type StaffEmploymentType = (typeof STAFF_EMPLOYMENT_TYPES)[number];
export type StaffLifecycleStatus = (typeof STAFF_LIFECYCLE_STATUSES)[number];
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];
export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];
export type CustomFieldEntityType = (typeof CUSTOM_FIELD_ENTITY_TYPES)[number];
export type CustomFieldDataType = (typeof CUSTOM_FIELD_DATA_TYPES)[number];
export type CustomFieldSensitivityLevel =
  (typeof CUSTOM_FIELD_SENSITIVITY_LEVELS)[number];

export const ALLOWED_ADMISSION_TRANSITIONS: Record<
  AdmissionStatus,
  readonly AdmissionStatus[]
> = {
  enquiry: ["submitted", "waitlisted", "rejected", "withdrawn"],
  submitted: ["under_review", "waitlisted", "rejected", "withdrawn"],
  under_review: ["approved", "waitlisted", "rejected", "withdrawn"],
  waitlisted: ["under_review", "approved", "rejected", "withdrawn"],
  approved: ["enrolled", "withdrawn", "rejected"],
  rejected: [],
  withdrawn: [],
  enrolled: [],
};

export function canTransitionAdmissionStatus(
  from: AdmissionStatus,
  to: AdmissionStatus,
): boolean {
  return ALLOWED_ADMISSION_TRANSITIONS[from].includes(to);
}

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z.string().max(maxLength).optional(),
  );

const optionalEmailSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed.toLowerCase();
  },
  z.string().email("Enter a valid email address.").optional(),
);

const optionalDateString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.")
    .optional(),
);

const optionalExternalIdSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z
    .string()
    .regex(
      /^[A-Za-z0-9_-]{6,32}$/,
      "Use 6-32 alphanumeric characters, hyphens, or underscores.",
    )
    .optional(),
);

export const FIELD_KEY_REGEX = /^[a-z][a-z0-9_]{1,49}$/;

// Strictly omits any Aadhaar column per Blueprint Part A §10.4 and ADR-0004.
export const createStudentSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required.").max(120),
    email: optionalEmailSchema,
    admissionNumber: z
      .string()
      .trim()
      .min(2, "Admission number is required.")
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores."),
    admissionDate: optionalDateString,
    lifecycleStatus: z.enum(STUDENT_LIFECYCLE_STATUSES).default("active"),
    dateOfBirth: optionalDateString,
    gender: optionalTrimmedString(32),
    bloodGroup: optionalTrimmedString(16),
    addressLine: optionalTrimmedString(240),
    emergencyContactName: optionalTrimmedString(120),
    emergencyContactPhone: optionalTrimmedString(32),
    penNumber: optionalExternalIdSchema,
    apaarId: optionalExternalIdSchema,
    externalIdVerificationStatus: z
      .enum(EXTERNAL_ID_VERIFICATION_STATUSES)
      .default("unverified"),
  })
  .strict();

export const updateStudentLifecycleSchema = z
  .object({
    studentProfileId: z.string().uuid(),
    lifecycleStatus: z.enum(STUDENT_LIFECYCLE_STATUSES),
    reason: optionalTrimmedString(300),
  })
  .strict();

export const createStaffSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required.").max(120),
    email: optionalEmailSchema,
    employeeCode: z
      .string()
      .trim()
      .min(2, "Employee code is required.")
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores."),
    designation: z.string().trim().min(2, "Designation is required.").max(80),
    employmentType: z.enum(STAFF_EMPLOYMENT_TYPES).default("full_time"),
    lifecycleStatus: z.enum(STAFF_LIFECYCLE_STATUSES).default("active"),
    joiningDate: optionalDateString,
    qualifications: optionalTrimmedString(200),
    emergencyContactName: optionalTrimmedString(120),
    emergencyContactPhone: optionalTrimmedString(32),
  })
  .strict();

export const linkGuardianSchema = z
  .object({
    studentProfileId: z.string().uuid(),
    guardianFullName: z
      .string()
      .trim()
      .min(2, "Guardian full name is required.")
      .max(120),
    guardianEmail: z.string().trim().toLowerCase().email("Valid email required."),
    relationship: z.enum(GUARDIAN_RELATIONSHIPS),
    isPrimary: z.boolean().default(false),
    canViewAcademics: z.boolean().default(true),
    canReceiveNotices: z.boolean().default(true),
    canPickup: z.boolean().default(true),
  })
  .strict();

export const createAdmissionSchema = z
  .object({
    applicantFullName: z
      .string()
      .trim()
      .min(2, "Applicant full name is required.")
      .max(120),
    applicantEmail: optionalEmailSchema,
    guardianFullName: optionalTrimmedString(120),
    guardianPhone: optionalTrimmedString(32),
    targetSessionLabel: z
      .string()
      .trim()
      .min(2, "Target session is required.")
      .max(40),
    targetGradeCode: z
      .string()
      .trim()
      .min(1, "Target class/grade is required.")
      .max(20),
    notes: optionalTrimmedString(500),
  })
  .strict();

export const transitionAdmissionSchema = z
  .object({
    applicationId: z.string().uuid(),
    nextStatus: z.enum(ADMISSION_STATUSES),
    admissionNumber: z.preprocess(
      (value) => {
        if (typeof value !== "string") return undefined;
        const trimmed = value.trim();
        return trimmed.length === 0 ? undefined : trimmed;
      },
      z
        .string()
        .min(2)
        .max(40)
        .regex(/^[A-Za-z0-9_-]+$/)
        .optional(),
    ),
    notes: optionalTrimmedString(500),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.nextStatus === "enrolled" && !data.admissionNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Admission number is required to enrol an approved applicant.",
        path: ["admissionNumber"],
      });
    }
  });

export const customFieldDefinitionSchema = z
  .object({
    entityType: z.enum(CUSTOM_FIELD_ENTITY_TYPES),
    fieldKey: z
      .string()
      .trim()
      .regex(
        FIELD_KEY_REGEX,
        "field_key must start with a lowercase letter and use 2-50 lowercase letters, digits, or underscores.",
      ),
    label: z.string().trim().min(2, "Label is required.").max(80),
    fieldGroup: z.string().trim().min(1).max(40).default("general"),
    dataType: z.enum(CUSTOM_FIELD_DATA_TYPES),
    options: z
      .array(z.string().trim().min(1).max(80))
      .max(50)
      .default([]),
    isRequired: z.boolean().default(false),
    sensitivityLevel: z.enum(CUSTOM_FIELD_SENSITIVITY_LEVELS).default("standard"),
    isActive: z.boolean().default(true),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.dataType === "select" && data.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select custom fields require at least one option.",
        path: ["options"],
      });
    }
  });

export interface CustomFieldValidationDefinition {
  label: string;
  dataType: CustomFieldDataType;
  options: readonly string[];
  isRequired: boolean;
}

export type CustomFieldValueValidationResult =
  | {
      ok: true;
      valueText: string | null;
      valueJson: unknown;
    }
  | {
      ok: false;
      error: string;
    };

export function validateCustomFieldValue(
  definition: CustomFieldValidationDefinition,
  rawInput: string | boolean | number | null | undefined,
): CustomFieldValueValidationResult {
  const stringValue =
    rawInput === null || rawInput === undefined ? "" : String(rawInput).trim();

  if (stringValue.length === 0) {
    if (definition.isRequired) {
      return { ok: false, error: `${definition.label} is required.` };
    }
    return { ok: true, valueText: null, valueJson: null };
  }

  switch (definition.dataType) {
    case "text":
      if (stringValue.length > 500) {
        return {
          ok: false,
          error: `${definition.label} cannot exceed 500 characters.`,
        };
      }
      return { ok: true, valueText: stringValue, valueJson: stringValue };

    case "number": {
      const parsed = Number(stringValue);
      if (!Number.isFinite(parsed)) {
        return {
          ok: false,
          error: `${definition.label} must be a valid number.`,
        };
      }
      return { ok: true, valueText: String(parsed), valueJson: parsed };
    }

    case "date": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
        return {
          ok: false,
          error: `${definition.label} must use YYYY-MM-DD format.`,
        };
      }
      const timestamp = Date.parse(`${stringValue}T00:00:00Z`);
      if (Number.isNaN(timestamp)) {
        return {
          ok: false,
          error: `${definition.label} is not a valid calendar date.`,
        };
      }
      return { ok: true, valueText: stringValue, valueJson: stringValue };
    }

    case "boolean": {
      const normalized = stringValue.toLowerCase();
      if (normalized === "true" || normalized === "1" || normalized === "yes") {
        return { ok: true, valueText: "true", valueJson: true };
      }
      if (normalized === "false" || normalized === "0" || normalized === "no") {
        return { ok: true, valueText: "false", valueJson: false };
      }
      return {
        ok: false,
        error: `${definition.label} must be true or false.`,
      };
    }

    case "select": {
      if (!definition.options.includes(stringValue)) {
        return {
          ok: false,
          error: `${definition.label} must match one of the configured options.`,
        };
      }
      return { ok: true, valueText: stringValue, valueJson: stringValue };
    }
  }
}
