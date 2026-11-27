import { z } from "zod";
import {
  STAFF_EMPLOYMENT_TYPES,
  type StaffEmploymentType,
} from "@/lib/registry/schemas";
import {
  SUBJECT_ENROLMENT_KINDS,
  type SubjectEnrolmentKind,
} from "@/lib/academics/schemas";

export const IMPORT_DATA_TYPES = [
  "students",
  "staff",
  "subject_enrolments",
] as const;

export type ImportDataType = (typeof IMPORT_DATA_TYPES)[number];

export interface ImportFieldSpec {
  key: string;
  label: string;
  required: boolean;
  aliases: readonly string[];
}

export const IMPORT_FIELD_SPECS: Record<
  ImportDataType,
  readonly ImportFieldSpec[]
> = {
  students: [
    {
      key: "admission_number",
      label: "Admission Number",
      required: true,
      aliases: ["admission_number", "admission_no", "adm_no", "adm_number"],
    },
    {
      key: "full_name",
      label: "Full Name",
      required: true,
      aliases: ["full_name", "student_name", "name"],
    },
    {
      key: "email",
      label: "Email",
      required: false,
      aliases: ["email", "primary_email", "student_email"],
    },
    {
      key: "date_of_birth",
      label: "Date of Birth (YYYY-MM-DD)",
      required: false,
      aliases: ["date_of_birth", "dob"],
    },
    {
      key: "gender",
      label: "Gender",
      required: false,
      aliases: ["gender", "sex"],
    },
    {
      key: "guardian_name",
      label: "Guardian Name",
      required: false,
      aliases: ["guardian_name", "parent_name"],
    },
    {
      key: "guardian_phone",
      label: "Guardian Phone",
      required: false,
      aliases: ["guardian_phone", "parent_phone", "phone"],
    },
    {
      key: "pen_number",
      label: "PEN Number",
      required: false,
      aliases: ["pen_number", "pen"],
    },
  ],
  staff: [
    {
      key: "employee_code",
      label: "Employee Code",
      required: true,
      aliases: ["employee_code", "emp_code", "staff_code"],
    },
    {
      key: "full_name",
      label: "Full Name",
      required: true,
      aliases: ["full_name", "staff_name", "name"],
    },
    {
      key: "email",
      label: "Email",
      required: false,
      aliases: ["email", "primary_email", "work_email"],
    },
    {
      key: "designation",
      label: "Designation",
      required: true,
      aliases: ["designation", "role", "title"],
    },
    {
      key: "employment_type",
      label: "Employment Type",
      required: false,
      aliases: ["employment_type", "type"],
    },
    {
      key: "joining_date",
      label: "Joining Date (YYYY-MM-DD)",
      required: false,
      aliases: ["joining_date", "join_date"],
    },
  ],
  subject_enrolments: [
    {
      key: "admission_number",
      label: "Student Admission Number",
      required: true,
      aliases: ["admission_number", "admission_no", "adm_no"],
    },
    {
      key: "session_code",
      label: "Academic Session Code",
      required: true,
      aliases: ["session_code", "session", "academic_session"],
    },
    {
      key: "subject_code",
      label: "Subject Code",
      required: true,
      aliases: ["subject_code", "subject"],
    },
    {
      key: "enrolment_kind",
      label: "Enrolment Kind (core/elective/additional)",
      required: false,
      aliases: ["enrolment_kind", "kind", "category"],
    },
  ],
};

const AADHAAR_PATTERN = /aadha{1,2}r/i;

export function findForbiddenAadhaarColumns(
  headers: readonly string[],
  columnMapping: Readonly<Record<string, string>>,
): string[] {
  const hits = new Set<string>();
  for (const header of headers) {
    if (AADHAAR_PATTERN.test(header)) {
      hits.add(header);
    }
  }
  for (const [target, source] of Object.entries(columnMapping)) {
    if (AADHAAR_PATTERN.test(target) || AADHAAR_PATTERN.test(source)) {
      hits.add(source || target);
    }
  }
  return [...hits];
}

function normalizeHeaderToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function suggestColumnMapping(
  headers: readonly string[],
  dataType: ImportDataType,
): Record<string, string> {
  const specs = IMPORT_FIELD_SPECS[dataType];
  const headerByToken = new Map<string, string>();
  for (const header of headers) {
    headerByToken.set(normalizeHeaderToken(header), header);
  }

  const mapping: Record<string, string> = {};
  for (const spec of specs) {
    for (const alias of spec.aliases) {
      const matched = headerByToken.get(alias);
      if (matched) {
        mapping[spec.key] = matched;
        break;
      }
    }
  }
  return mapping;
}

const optionalDateSchema = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.").optional());

const optionalEmailSchema = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().email("Invalid email address.").optional());

const optionalShortString = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().max(max).optional());

export const studentImportRowSchema = z
  .object({
    admission_number: z
      .string()
      .trim()
      .min(2, "Admission number is required.")
      .max(40)
      .regex(/^[A-Za-z0-9/_-]+$/, "Invalid admission number format."),
    full_name: z.string().trim().min(2, "Full name is required.").max(120),
    email: optionalEmailSchema,
    date_of_birth: optionalDateSchema,
    gender: optionalShortString(30),
    guardian_name: optionalShortString(120),
    guardian_phone: optionalShortString(30),
    pen_number: z.preprocess((value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }, z.string().regex(/^[0-9]{11}$/, "PEN must be an 11-digit numeric code.").optional()),
  })
  .strict();

export const staffImportRowSchema = z
  .object({
    employee_code: z
      .string()
      .trim()
      .min(2, "Employee code is required.")
      .max(40)
      .regex(/^[A-Za-z0-9/_-]+$/, "Invalid employee code format."),
    full_name: z.string().trim().min(2, "Full name is required.").max(120),
    email: optionalEmailSchema,
    designation: z.string().trim().min(2, "Designation is required.").max(80),
    employment_type: z
      .enum(STAFF_EMPLOYMENT_TYPES)
      .default("full_time" satisfies StaffEmploymentType),
    joining_date: optionalDateSchema,
  })
  .strict();

export const subjectEnrolmentImportRowSchema = z
  .object({
    admission_number: z
      .string()
      .trim()
      .min(2, "Admission number is required.")
      .max(40),
    session_code: z
      .string()
      .trim()
      .min(2, "Session code is required.")
      .max(30),
    subject_code: z
      .string()
      .trim()
      .min(2, "Subject code is required.")
      .max(30),
    enrolment_kind: z
      .enum(SUBJECT_ENROLMENT_KINDS)
      .default("elective" satisfies SubjectEnrolmentKind),
  })
  .strict();

export interface ExistingImportLookup {
  existingAdmissionNumbers?: ReadonlySet<string>;
  existingEmployeeCodes?: ReadonlySet<string>;
  existingSubjectEnrolmentKeys?: ReadonlySet<string>;
  studentEnrolmentByAdmissionAndSession?: ReadonlyMap<
    string,
    { studentEnrolmentId: string; sessionId: string; gradeLevelId: string }
  >;
  offeringBySessionGradeAndSubject?: ReadonlyMap<string, string>;
}

export interface ValidatedImportRow {
  rowNumber: number;
  validationStatus: "valid" | "error" | "duplicate";
  normalizedPayload: Record<string, unknown> | null;
  errors: string[];
}

export interface BatchValidationResult {
  forbiddenAadhaarColumns: string[];
  rows: ValidatedImportRow[];
  validCount: number;
  errorCount: number;
  duplicateCount: number;
}

function readMappedField(
  rawRow: Readonly<Record<string, unknown>>,
  columnMapping: Readonly<Record<string, string>>,
  targetKey: string,
): string {
  const sourceHeader = columnMapping[targetKey];
  if (!sourceHeader) return "";
  const val = rawRow[sourceHeader];
  return val === null || val === undefined ? "" : String(val).trim();
}

export function validateImportRows(input: {
  dataType: ImportDataType;
  rows: readonly { rowNumber: number; rawPayload: Record<string, unknown> }[];
  columnMapping: Readonly<Record<string, string>>;
  existingLookup: ExistingImportLookup;
}): BatchValidationResult {
  const headerSet = new Set<string>();
  for (const row of input.rows) {
    for (const key of Object.keys(row.rawPayload)) {
      headerSet.add(key);
    }
  }
  const forbiddenAadhaarColumns = findForbiddenAadhaarColumns(
    [...headerSet],
    input.columnMapping,
  );

  if (forbiddenAadhaarColumns.length > 0) {
    const errorMsg = `Aadhaar columns are strictly prohibited by policy (${forbiddenAadhaarColumns.join(", ")}). Remove Aadhaar data before importing.`;
    const rows: ValidatedImportRow[] = input.rows.map((row) => ({
      rowNumber: row.rowNumber,
      validationStatus: "error",
      normalizedPayload: null,
      errors: [errorMsg],
    }));
    return {
      forbiddenAadhaarColumns,
      rows,
      validCount: 0,
      errorCount: rows.length,
      duplicateCount: 0,
    };
  }

  const seenInBatch = new Set<string>();
  const results: ValidatedImportRow[] = [];
  let validCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  for (const row of input.rows) {
    if (input.dataType === "students") {
      const candidate = {
        admission_number: readMappedField(
          row.rawPayload,
          input.columnMapping,
          "admission_number",
        ),
        full_name: readMappedField(
          row.rawPayload,
          input.columnMapping,
          "full_name",
        ),
        email: readMappedField(row.rawPayload, input.columnMapping, "email"),
        date_of_birth: readMappedField(
          row.rawPayload,
          input.columnMapping,
          "date_of_birth",
        ),
        gender: readMappedField(row.rawPayload, input.columnMapping, "gender"),
        guardian_name: readMappedField(
          row.rawPayload,
          input.columnMapping,
          "guardian_name",
        ),
        guardian_phone: readMappedField(
          row.rawPayload,
          input.columnMapping,
          "guardian_phone",
        ),
        pen_number: readMappedField(
          row.rawPayload,
          input.columnMapping,
          "pen_number",
        ),
      };

      const parsed = studentImportRowSchema.safeParse(candidate);
      if (!parsed.success) {
        errorCount += 1;
        results.push({
          rowNumber: row.rowNumber,
          validationStatus: "error",
          normalizedPayload: null,
          errors: parsed.error.issues.map((issue) => issue.message),
        });
        continue;
      }

      const key = parsed.data.admission_number.toLowerCase();
      if (seenInBatch.has(key)) {
        duplicateCount += 1;
        results.push({
          rowNumber: row.rowNumber,
          validationStatus: "duplicate",
          normalizedPayload: parsed.data,
          errors: [
            `Duplicate admission_number "${parsed.data.admission_number}" inside the same file.`,
          ],
        });
        continue;
      }
      seenInBatch.add(key);

      if (
        input.existingLookup.existingAdmissionNumbers?.has(key) ||
        input.existingLookup.existingAdmissionNumbers?.has(
          parsed.data.admission_number,
        )
      ) {
        duplicateCount += 1;
        results.push({
          rowNumber: row.rowNumber,
          validationStatus: "duplicate",
          normalizedPayload: parsed.data,
          errors: [
            `Student with admission_number "${parsed.data.admission_number}" already exists (non-overwriting policy).`,
          ],
        });
        continue;
      }

      validCount += 1;
      results.push({
        rowNumber: row.rowNumber,
        validationStatus: "valid",
        normalizedPayload: parsed.data,
        errors: [],
      });
      continue;
    }

    if (input.dataType === "staff") {
      const rawType = readMappedField(
        row.rawPayload,
        input.columnMapping,
        "employment_type",
      );
      const candidate = {
        employee_code: readMappedField(
          row.rawPayload,
          input.columnMapping,
          "employee_code",
        ),
        full_name: readMappedField(
          row.rawPayload,
          input.columnMapping,
          "full_name",
        ),
        email: readMappedField(row.rawPayload, input.columnMapping, "email"),
        designation: readMappedField(
          row.rawPayload,
          input.columnMapping,
          "designation",
        ),
        employment_type: rawType.length === 0 ? "full_time" : rawType,
        joining_date: readMappedField(
          row.rawPayload,
          input.columnMapping,
          "joining_date",
        ),
      };

      const parsed = staffImportRowSchema.safeParse(candidate);
      if (!parsed.success) {
        errorCount += 1;
        results.push({
          rowNumber: row.rowNumber,
          validationStatus: "error",
          normalizedPayload: null,
          errors: parsed.error.issues.map((issue) => issue.message),
        });
        continue;
      }

      const key = parsed.data.employee_code.toLowerCase();
      if (seenInBatch.has(key)) {
        duplicateCount += 1;
        results.push({
          rowNumber: row.rowNumber,
          validationStatus: "duplicate",
          normalizedPayload: parsed.data,
          errors: [
            `Duplicate employee_code "${parsed.data.employee_code}" inside the same file.`,
          ],
        });
        continue;
      }
      seenInBatch.add(key);

      if (
        input.existingLookup.existingEmployeeCodes?.has(key) ||
        input.existingLookup.existingEmployeeCodes?.has(
          parsed.data.employee_code,
        )
      ) {
        duplicateCount += 1;
        results.push({
          rowNumber: row.rowNumber,
          validationStatus: "duplicate",
          normalizedPayload: parsed.data,
          errors: [
            `Staff member with employee_code "${parsed.data.employee_code}" already exists (non-overwriting policy).`,
          ],
        });
        continue;
      }

      validCount += 1;
      results.push({
        rowNumber: row.rowNumber,
        validationStatus: "valid",
        normalizedPayload: parsed.data,
        errors: [],
      });
      continue;
    }

    // subject_enrolments
    const rawKind = readMappedField(
      row.rawPayload,
      input.columnMapping,
      "enrolment_kind",
    );
    const candidate = {
      admission_number: readMappedField(
        row.rawPayload,
        input.columnMapping,
        "admission_number",
      ),
      session_code: readMappedField(
        row.rawPayload,
        input.columnMapping,
        "session_code",
      ),
      subject_code: readMappedField(
        row.rawPayload,
        input.columnMapping,
        "subject_code",
      ),
      enrolment_kind: rawKind.length === 0 ? "elective" : rawKind,
    };

    const parsed = subjectEnrolmentImportRowSchema.safeParse(candidate);
    if (!parsed.success) {
      errorCount += 1;
      results.push({
        rowNumber: row.rowNumber,
        validationStatus: "error",
        normalizedPayload: null,
        errors: parsed.error.issues.map((issue) => issue.message),
      });
      continue;
    }

    const batchKey = `${parsed.data.admission_number.toLowerCase()}::${parsed.data.session_code.toLowerCase()}::${parsed.data.subject_code.toLowerCase()}`;
    if (seenInBatch.has(batchKey)) {
      duplicateCount += 1;
      results.push({
        rowNumber: row.rowNumber,
        validationStatus: "duplicate",
        normalizedPayload: parsed.data,
        errors: [
          `Duplicate subject enrolment "${parsed.data.admission_number} / ${parsed.data.subject_code}" in file.`,
        ],
      });
      continue;
    }
    seenInBatch.add(batchKey);

    const enrolmentLookupKey = `${parsed.data.admission_number.toLowerCase()}::${parsed.data.session_code.toLowerCase()}`;
    const enrolmentRef =
      input.existingLookup.studentEnrolmentByAdmissionAndSession?.get(
        enrolmentLookupKey,
      );

    if (
      input.existingLookup.studentEnrolmentByAdmissionAndSession &&
      !enrolmentRef
    ) {
      errorCount += 1;
      results.push({
        rowNumber: row.rowNumber,
        validationStatus: "error",
        normalizedPayload: null,
        errors: [
          `No active session enrolment found for "${parsed.data.admission_number}" in session "${parsed.data.session_code}".`,
        ],
      });
      continue;
    }

    let offeringId: string | undefined;
    if (enrolmentRef && input.existingLookup.offeringBySessionGradeAndSubject) {
      const offeringKey = `${enrolmentRef.sessionId}::${enrolmentRef.gradeLevelId}::${parsed.data.subject_code.toLowerCase()}`;
      offeringId =
        input.existingLookup.offeringBySessionGradeAndSubject.get(offeringKey);
      if (!offeringId) {
        errorCount += 1;
        results.push({
          rowNumber: row.rowNumber,
          validationStatus: "error",
          normalizedPayload: null,
          errors: [
            `Subject offering "${parsed.data.subject_code}" is not configured for this student's grade in "${parsed.data.session_code}".`,
          ],
        });
        continue;
      }

      const dbDupKey = `${enrolmentRef.studentEnrolmentId}::${offeringId}`;
      if (input.existingLookup.existingSubjectEnrolmentKeys?.has(dbDupKey)) {
        duplicateCount += 1;
        results.push({
          rowNumber: row.rowNumber,
          validationStatus: "duplicate",
          normalizedPayload: {
            ...parsed.data,
            session_id: enrolmentRef.sessionId,
            student_enrolment_id: enrolmentRef.studentEnrolmentId,
            subject_offering_id: offeringId,
          },
          errors: [
            `Student "${parsed.data.admission_number}" is already enrolled in "${parsed.data.subject_code}".`,
          ],
        });
        continue;
      }
    }

    validCount += 1;
    results.push({
      rowNumber: row.rowNumber,
      validationStatus: "valid",
      normalizedPayload: {
        ...parsed.data,
        ...(enrolmentRef
          ? {
              session_id: enrolmentRef.sessionId,
              student_enrolment_id: enrolmentRef.studentEnrolmentId,
              subject_offering_id: offeringId ?? null,
            }
          : {}),
      },
      errors: [],
    });
  }

  return {
    forbiddenAadhaarColumns: [],
    rows: results,
    validCount,
    errorCount,
    duplicateCount,
  };
}
