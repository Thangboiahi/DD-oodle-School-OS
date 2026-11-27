import "server-only";

import {
  evaluatePermission,
  type VerifiedTenantContext,
} from "@/lib/auth/permissions";
import { serializeCsvSafely } from "@/lib/imports/csv";
import {
  parseSpreadsheetBuffer,
  type SupportedImportFormat,
} from "@/lib/imports/spreadsheet";
import {
  IMPORT_DATA_TYPES,
  findForbiddenAadhaarColumns,
  suggestColumnMapping,
  validateImportRows,
  type ExistingImportLookup,
  type ImportDataType,
} from "@/lib/imports/validators";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/server/audit/log";
import { requireInstitutionPermission } from "@/server/auth/guards";
import { resolveOrCreateGlobalPerson } from "@/server/registry/service";

export type ImportBatchStatus =
  | "staged"
  | "validated"
  | "committed"
  | "cancelled"
  | "failed";

export type ImportRowValidationStatus =
  | "pending"
  | "valid"
  | "error"
  | "duplicate"
  | "committed"
  | "skipped";

export interface ImportBatchSummaryDto {
  id: string;
  institutionId: string;
  idempotencyKey: string;
  dataType: ImportDataType;
  sourceFilename: string;
  sourceFormat: SupportedImportFormat;
  columnMapping: Record<string, string>;
  status: ImportBatchStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  committedRows: number;
  createdAt: string;
  committedAt: string | null;
}

export interface ImportRowDto {
  id: string;
  rowNumber: number;
  rawPayload: Record<string, unknown>;
  normalizedPayload: Record<string, unknown> | null;
  validationStatus: ImportRowValidationStatus;
  errorMessages: string[];
  targetEntityId: string | null;
}

export interface ImportBatchDetailDto {
  batch: ImportBatchSummaryDto;
  headers: string[];
  rows: ImportRowDto[];
}

export type DalResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

interface RawBatchRow {
  id: string;
  institution_id: string;
  idempotency_key: string;
  data_type: ImportDataType;
  source_filename: string;
  source_format: SupportedImportFormat;
  column_mapping: Record<string, string> | null;
  status: ImportBatchStatus;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  duplicate_rows: number;
  committed_rows: number;
  created_at: string;
  committed_at: string | null;
}

interface RawImportRow {
  id: string;
  row_number: number;
  raw_payload: Record<string, unknown> | null;
  normalized_payload: Record<string, unknown> | null;
  validation_status: ImportRowValidationStatus;
  error_messages: unknown;
  target_entity_id: string | null;
}

function canManageImports(context: VerifiedTenantContext): boolean {
  return (
    evaluatePermission(context, { permission: "imports.manage" }).allowed ||
    evaluatePermission(context, { permission: "people.manage" }).allowed
  );
}

export async function authorizeImportOperator(
  slug: string,
): Promise<
  | { ok: true; context: VerifiedTenantContext }
  | { ok: false; status: 401 | 403 | 503; reason: string }
> {
  const first = await requireInstitutionPermission(slug, {
    permission: "imports.manage",
  });
  if (first.ok) {
    return { ok: true, context: first.context };
  }
  if (first.status !== 403) {
    return first;
  }
  const fallback = await requireInstitutionPermission(slug, {
    permission: "people.manage",
  });
  if (fallback.ok) {
    return { ok: true, context: fallback.context };
  }
  return fallback;
}

function mapBatchRow(row: RawBatchRow): ImportBatchSummaryDto {
  return {
    id: row.id,
    institutionId: row.institution_id,
    idempotencyKey: row.idempotency_key,
    dataType: row.data_type,
    sourceFilename: row.source_filename,
    sourceFormat: row.source_format,
    columnMapping: row.column_mapping ?? {},
    status: row.status,
    totalRows: row.total_rows,
    validRows: row.valid_rows,
    errorRows: row.error_rows,
    duplicateRows: row.duplicate_rows,
    committedRows: row.committed_rows,
    createdAt: row.created_at,
    committedAt: row.committed_at,
  };
}

function mapImportRow(row: RawImportRow): ImportRowDto {
  const errors = Array.isArray(row.error_messages)
    ? row.error_messages.map((item) => String(item))
    : [];
  return {
    id: row.id,
    rowNumber: row.row_number,
    rawPayload: row.raw_payload ?? {},
    normalizedPayload: row.normalized_payload ?? null,
    validationStatus: row.validation_status,
    errorMessages: errors,
    targetEntityId: row.target_entity_id,
  };
}

function extractHeadersFromRows(rows: readonly ImportRowDto[]): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row.rawPayload)) {
      keys.add(key);
    }
  }
  return [...keys];
}

export async function listImportBatches(
  context: VerifiedTenantContext,
): Promise<ImportBatchSummaryDto[]> {
  if (!canManageImports(context)) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("import_batches")
    .select(
      "id, institution_id, idempotency_key, data_type, source_filename, source_format, column_mapping, status, total_rows, valid_rows, error_rows, duplicate_rows, committed_rows, created_at, committed_at",
    )
    .eq("institution_id", context.institutionId)
    .order("created_at", { ascending: false })
    .limit(40)
    .returns<RawBatchRow[]>();

  if (error || !data) {
    return [];
  }
  return data.map(mapBatchRow);
}

export async function getImportBatchDetail(
  context: VerifiedTenantContext,
  batchId: string,
): Promise<ImportBatchDetailDto | null> {
  if (!canManageImports(context)) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: batchRow, error: batchError } = await supabase
    .from("import_batches")
    .select(
      "id, institution_id, idempotency_key, data_type, source_filename, source_format, column_mapping, status, total_rows, valid_rows, error_rows, duplicate_rows, committed_rows, created_at, committed_at",
    )
    .eq("institution_id", context.institutionId)
    .eq("id", batchId)
    .maybeSingle<RawBatchRow>();

  if (batchError || !batchRow) {
    return null;
  }

  const { data: rowData, error: rowsError } = await supabase
    .from("import_rows")
    .select(
      "id, row_number, raw_payload, normalized_payload, validation_status, error_messages, target_entity_id",
    )
    .eq("institution_id", context.institutionId)
    .eq("batch_id", batchRow.id)
    .order("row_number", { ascending: true })
    .limit(5000)
    .returns<RawImportRow[]>();

  if (rowsError || !rowData) {
    return {
      batch: mapBatchRow(batchRow),
      headers: [],
      rows: [],
    };
  }

  const rows = rowData.map(mapImportRow);
  return {
    batch: mapBatchRow(batchRow),
    headers: extractHeadersFromRows(rows),
    rows,
  };
}

export async function stageImportBatch(
  context: VerifiedTenantContext,
  input: {
    dataType: ImportDataType;
    filename: string;
    buffer: Buffer;
    idempotencyKey: string;
  },
): Promise<
  DalResult<{
    batchId: string;
    idempotentReuse: boolean;
    headers: string[];
    suggestedMapping: Record<string, string>;
    totalRows: number;
  }>
> {
  if (!canManageImports(context)) {
    return { ok: false, error: "Import permission required.", status: 403 };
  }

  if (!IMPORT_DATA_TYPES.includes(input.dataType)) {
    return { ok: false, error: "Unsupported import data type.", status: 400 };
  }

  const idempotencyKey = input.idempotencyKey.trim();
  if (
    idempotencyKey.length < 3 ||
    idempotencyKey.length > 80 ||
    !/^[A-Za-z0-9_.:-]+$/.test(idempotencyKey)
  ) {
    return {
      ok: false,
      error:
        "Idempotency key must be 3-80 characters using letters, numbers, dots, underscores, colons, or hyphens.",
      status: 400,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existingBatch } = await supabase
    .from("import_batches")
    .select(
      "id, institution_id, idempotency_key, data_type, source_filename, source_format, column_mapping, status, total_rows, valid_rows, error_rows, duplicate_rows, committed_rows, created_at, committed_at",
    )
    .eq("institution_id", context.institutionId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle<RawBatchRow>();

  if (existingBatch) {
    const detail = await getImportBatchDetail(context, existingBatch.id);
    return {
      ok: true,
      data: {
        batchId: existingBatch.id,
        idempotentReuse: true,
        headers: detail?.headers ?? [],
        suggestedMapping: existingBatch.column_mapping ?? {},
        totalRows: existingBatch.total_rows,
      },
    };
  }

  let parsed;
  try {
    parsed = await parseSpreadsheetBuffer({
      buffer: input.buffer,
      filename: input.filename,
    });
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Failed to parse spreadsheet.",
      status: 400,
    };
  }

  const forbiddenAadhaar = findForbiddenAadhaarColumns(parsed.headers, {});
  if (forbiddenAadhaar.length > 0) {
    return {
      ok: false,
      error: `Upload rejected: Aadhaar columns (${forbiddenAadhaar.join(", ")}) are strictly prohibited by DD-oodle privacy policy.`,
      status: 400,
    };
  }

  const suggestedMapping = suggestColumnMapping(parsed.headers, input.dataType);

  const { data: insertedBatch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      institution_id: context.institutionId,
      idempotency_key: idempotencyKey,
      data_type: input.dataType,
      source_filename: input.filename.trim().slice(0, 160),
      source_format: parsed.format,
      column_mapping: suggestedMapping,
      status: "staged",
      total_rows: parsed.rows.length,
      created_by_person_id: context.personId,
    })
    .select("id")
    .single<{ id: string }>();

  if (batchError || !insertedBatch) {
    return {
      ok: false,
      error: batchError?.message ?? "Unable to create import staging batch.",
      status: 500,
    };
  }

  const chunkSize = 500;
  for (let start = 0; start < parsed.rows.length; start += chunkSize) {
    const chunk = parsed.rows.slice(start, start + chunkSize).map((row, i) => ({
      institution_id: context.institutionId,
      batch_id: insertedBatch.id,
      row_number: start + i + 1,
      raw_payload: row,
      validation_status: "pending" as const,
      error_messages: [],
    }));

    const { error: rowInsertError } = await supabase
      .from("import_rows")
      .insert(chunk);

    if (rowInsertError) {
      await supabase
        .from("import_batches")
        .update({ status: "failed" })
        .eq("institution_id", context.institutionId)
        .eq("id", insertedBatch.id);

      return {
        ok: false,
        error: `Failed to stage import rows: ${rowInsertError.message}`,
        status: 500,
      };
    }
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "import.batch.staged",
    entityType: "import_batch",
    entityId: insertedBatch.id,
    afterState: {
      data_type: input.dataType,
      source_format: parsed.format,
      total_rows: parsed.rows.length,
    },
  });

  return {
    ok: true,
    data: {
      batchId: insertedBatch.id,
      idempotentReuse: false,
      headers: parsed.headers,
      suggestedMapping,
      totalRows: parsed.rows.length,
    },
  };
}

async function loadExistingLookupForBatch(
  context: VerifiedTenantContext,
  dataType: ImportDataType,
): Promise<ExistingImportLookup> {
  const supabase = await createSupabaseServerClient();

  if (dataType === "students") {
    const { data } = await supabase
      .from("student_profiles")
      .select("admission_number")
      .eq("institution_id", context.institutionId)
      .returns<{ admission_number: string }[]>();

    return {
      existingAdmissionNumbers: new Set(
        (data ?? []).map((item) => item.admission_number.trim().toLowerCase()),
      ),
    };
  }

  if (dataType === "staff") {
    const { data } = await supabase
      .from("staff_profiles")
      .select("employee_code")
      .eq("institution_id", context.institutionId)
      .returns<{ employee_code: string }[]>();

    return {
      existingEmployeeCodes: new Set(
        (data ?? []).map((item) => item.employee_code.trim().toLowerCase()),
      ),
    };
  }

  // subject_enrolments
  const [sessionsRes, enrolmentsRes, offeringsRes, subjectEnrolmentsRes] =
    await Promise.all([
      supabase
        .from("academic_sessions")
        .select("id, code")
        .eq("institution_id", context.institutionId)
        .returns<{ id: string; code: string }[]>(),
      supabase
        .from("student_session_enrolments")
        .select(
          "id, session_id, grade_level_id, status, student:student_profiles(admission_number)",
        )
        .eq("institution_id", context.institutionId)
        .eq("status", "active")
        .returns<
          {
            id: string;
            session_id: string;
            grade_level_id: string;
            status: string;
            student:
              | { admission_number: string }
              | { admission_number: string }[]
              | null;
          }[]
        >(),
      supabase
        .from("subject_offerings")
        .select("id, session_id, grade_level_id, subject:subjects(code)")
        .eq("institution_id", context.institutionId)
        .returns<
          {
            id: string;
            session_id: string;
            grade_level_id: string;
            subject: { code: string } | { code: string }[] | null;
          }[]
        >(),
      supabase
        .from("student_subject_enrolments")
        .select("student_enrolment_id, subject_offering_id")
        .eq("institution_id", context.institutionId)
        .returns<{ student_enrolment_id: string; subject_offering_id: string }[]>(),
    ]);

  const sessionCodeById = new Map<string, string>();
  for (const s of sessionsRes.data ?? []) {
    sessionCodeById.set(s.id, s.code.trim().toLowerCase());
  }

  const studentEnrolmentByAdmissionAndSession = new Map<
    string,
    { studentEnrolmentId: string; sessionId: string; gradeLevelId: string }
  >();
  for (const e of enrolmentsRes.data ?? []) {
    const studentObj = Array.isArray(e.student) ? e.student[0] : e.student;
    const sessionCode = sessionCodeById.get(e.session_id);
    if (!studentObj?.admission_number || !sessionCode) continue;
    const key = `${studentObj.admission_number.trim().toLowerCase()}::${sessionCode}`;
    studentEnrolmentByAdmissionAndSession.set(key, {
      studentEnrolmentId: e.id,
      sessionId: e.session_id,
      gradeLevelId: e.grade_level_id,
    });
  }

  const offeringBySessionGradeAndSubject = new Map<string, string>();
  for (const o of offeringsRes.data ?? []) {
    const subjObj = Array.isArray(o.subject) ? o.subject[0] : o.subject;
    if (!subjObj?.code) continue;
    const key = `${o.session_id}::${o.grade_level_id}::${subjObj.code.trim().toLowerCase()}`;
    offeringBySessionGradeAndSubject.set(key, o.id);
  }

  const existingSubjectEnrolmentKeys = new Set(
    (subjectEnrolmentsRes.data ?? []).map(
      (se) => `${se.student_enrolment_id}::${se.subject_offering_id}`,
    ),
  );

  return {
    studentEnrolmentByAdmissionAndSession,
    offeringBySessionGradeAndSubject,
    existingSubjectEnrolmentKeys,
  };
}

export async function validateImportBatch(
  context: VerifiedTenantContext,
  batchId: string,
  columnMapping: Record<string, string>,
): Promise<
  DalResult<{
    batchId: string;
    totalRows: number;
    validRows: number;
    errorRows: number;
    duplicateRows: number;
  }>
> {
  if (!canManageImports(context)) {
    return { ok: false, error: "Import permission required.", status: 403 };
  }

  const detail = await getImportBatchDetail(context, batchId);
  if (!detail) {
    return { ok: false, error: "Import batch not found.", status: 404 };
  }

  if (
    detail.batch.status === "committed" ||
    detail.batch.status === "cancelled"
  ) {
    return {
      ok: false,
      error: `Batch is already ${detail.batch.status} and cannot be re-validated.`,
      status: 400,
    };
  }

  const sanitizedMapping: Record<string, string> = {};
  for (const [target, source] of Object.entries(columnMapping)) {
    const cleaned = source.trim();
    if (cleaned.length > 0) {
      sanitizedMapping[target] = cleaned;
    }
  }

  const forbiddenAadhaar = findForbiddenAadhaarColumns(
    detail.headers,
    sanitizedMapping,
  );
  if (forbiddenAadhaar.length > 0) {
    return {
      ok: false,
      error: `Mapping rejected: Aadhaar columns (${forbiddenAadhaar.join(", ")}) are prohibited by policy.`,
      status: 400,
    };
  }

  const existingLookup = await loadExistingLookupForBatch(
    context,
    detail.batch.dataType,
  );

  const validation = validateImportRows({
    dataType: detail.batch.dataType,
    rows: detail.rows.map((r) => ({
      rowNumber: r.rowNumber,
      rawPayload: r.rawPayload,
    })),
    columnMapping: sanitizedMapping,
    existingLookup,
  });

  const supabase = await createSupabaseServerClient();
  const rowByNumber = new Map<number, ImportRowDto>();
  for (const r of detail.rows) {
    rowByNumber.set(r.rowNumber, r);
  }

  const updateChunkSize = 25;
  for (let i = 0; i < validation.rows.length; i += updateChunkSize) {
    const chunk = validation.rows.slice(i, i + updateChunkSize);
    await Promise.all(
      chunk.map((item) => {
        const targetRow = rowByNumber.get(item.rowNumber);
        if (!targetRow) return Promise.resolve();
        return supabase
          .from("import_rows")
          .update({
            normalized_payload: item.normalizedPayload,
            validation_status: item.validationStatus,
            error_messages: item.errors,
          })
          .eq("institution_id", context.institutionId)
          .eq("id", targetRow.id);
      }),
    );
  }

  const { error: batchUpdateError } = await supabase
    .from("import_batches")
    .update({
      column_mapping: sanitizedMapping,
      status: "validated",
      valid_rows: validation.validCount,
      error_rows: validation.errorCount,
      duplicate_rows: validation.duplicateCount,
    })
    .eq("institution_id", context.institutionId)
    .eq("id", detail.batch.id);

  if (batchUpdateError) {
    return {
      ok: false,
      error: `Failed to save validation summary: ${batchUpdateError.message}`,
      status: 500,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "import.batch.validated",
    entityType: "import_batch",
    entityId: detail.batch.id,
    afterState: {
      valid_rows: validation.validCount,
      error_rows: validation.errorCount,
      duplicate_rows: validation.duplicateCount,
    },
  });

  return {
    ok: true,
    data: {
      batchId: detail.batch.id,
      totalRows: detail.rows.length,
      validRows: validation.validCount,
      errorRows: validation.errorCount,
      duplicateRows: validation.duplicateCount,
    },
  };
}

export async function commitImportBatch(
  context: VerifiedTenantContext,
  batchId: string,
): Promise<
  DalResult<{
    batchId: string;
    alreadyCommitted: boolean;
    committedRows: number;
    skippedRows: number;
  }>
> {
  if (!canManageImports(context)) {
    return { ok: false, error: "Import permission required.", status: 403 };
  }

  const detail = await getImportBatchDetail(context, batchId);
  if (!detail) {
    return { ok: false, error: "Import batch not found.", status: 404 };
  }

  if (detail.batch.status === "committed") {
    return {
      ok: true,
      data: {
        batchId: detail.batch.id,
        alreadyCommitted: true,
        committedRows: detail.batch.committedRows,
        skippedRows: detail.batch.errorRows + detail.batch.duplicateRows,
      },
    };
  }

  if (detail.batch.status !== "validated") {
    return {
      ok: false,
      error: "Run dry-run validation before authorizing and committing rows.",
      status: 400,
    };
  }

  if (detail.batch.validRows === 0) {
    return {
      ok: false,
      error:
        "No valid rows are available to commit. Fix errors or upload a corrected sheet.",
      status: 400,
    };
  }

  const supabase = await createSupabaseServerClient();
  const validRows = detail.rows.filter(
    (row) => row.validationStatus === "valid" && row.normalizedPayload !== null,
  );

  let committedCount = 0;
  let duplicateDuringCommit = 0;
  let errorDuringCommit = 0;

  for (const row of validRows) {
    const payload = row.normalizedPayload!;

    if (detail.batch.dataType === "students") {
      const admissionNumber = String(payload.admission_number ?? "");
      const fullName = String(payload.full_name ?? "");
      const email =
        typeof payload.email === "string" ? payload.email : undefined;

      const { data: existingStudent } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("institution_id", context.institutionId)
        .eq("admission_number", admissionNumber)
        .maybeSingle<{ id: string }>();

      if (existingStudent) {
        duplicateDuringCommit += 1;
        await supabase
          .from("import_rows")
          .update({
            validation_status: "duplicate",
            error_messages: [
              `Admission number "${admissionNumber}" already exists (skipped overwrite).`,
            ],
          })
          .eq("institution_id", context.institutionId)
          .eq("id", row.id);
        continue;
      }

      const personRes = await resolveOrCreateGlobalPerson({ fullName, email });
      if (!personRes.ok) {
        errorDuringCommit += 1;
        await supabase
          .from("import_rows")
          .update({
            validation_status: "error",
            error_messages: [personRes.error],
          })
          .eq("institution_id", context.institutionId)
          .eq("id", row.id);
        continue;
      }

      const { data: createdStudent, error: insertError } = await supabase
        .from("student_profiles")
        .insert({
          institution_id: context.institutionId,
          person_id: personRes.personId,
          admission_number: admissionNumber,
          lifecycle_status: "active",
          date_of_birth:
            typeof payload.date_of_birth === "string"
              ? payload.date_of_birth
              : null,
          gender: typeof payload.gender === "string" ? payload.gender : null,
          emergency_contact_name:
            typeof payload.guardian_name === "string"
              ? payload.guardian_name
              : null,
          emergency_contact_phone:
            typeof payload.guardian_phone === "string"
              ? payload.guardian_phone
              : null,
          pen_number:
            typeof payload.pen_number === "string" ? payload.pen_number : null,
        })
        .select("id")
        .single<{ id: string }>();

      if (insertError || !createdStudent) {
        if (insertError?.code === "23505") {
          duplicateDuringCommit += 1;
          await supabase
            .from("import_rows")
            .update({
              validation_status: "duplicate",
              error_messages: [
                "Duplicate student record skipped (non-overwriting policy).",
              ],
            })
            .eq("institution_id", context.institutionId)
            .eq("id", row.id);
        } else {
          errorDuringCommit += 1;
          await supabase
            .from("import_rows")
            .update({
              validation_status: "error",
              error_messages: [
                insertError?.message ?? "Student insert failed.",
              ],
            })
            .eq("institution_id", context.institutionId)
            .eq("id", row.id);
        }
        continue;
      }

      committedCount += 1;
      await supabase
        .from("import_rows")
        .update({
          validation_status: "committed",
          target_entity_id: createdStudent.id,
        })
        .eq("institution_id", context.institutionId)
        .eq("id", row.id);
      continue;
    }

    if (detail.batch.dataType === "staff") {
      const employeeCode = String(payload.employee_code ?? "");
      const fullName = String(payload.full_name ?? "");
      const email =
        typeof payload.email === "string" ? payload.email : undefined;

      const { data: existingStaff } = await supabase
        .from("staff_profiles")
        .select("id")
        .eq("institution_id", context.institutionId)
        .eq("employee_code", employeeCode)
        .maybeSingle<{ id: string }>();

      if (existingStaff) {
        duplicateDuringCommit += 1;
        await supabase
          .from("import_rows")
          .update({
            validation_status: "duplicate",
            error_messages: [
              `Employee code "${employeeCode}" already exists (skipped overwrite).`,
            ],
          })
          .eq("institution_id", context.institutionId)
          .eq("id", row.id);
        continue;
      }

      const personRes = await resolveOrCreateGlobalPerson({ fullName, email });
      if (!personRes.ok) {
        errorDuringCommit += 1;
        await supabase
          .from("import_rows")
          .update({
            validation_status: "error",
            error_messages: [personRes.error],
          })
          .eq("institution_id", context.institutionId)
          .eq("id", row.id);
        continue;
      }

      const { data: createdStaff, error: insertError } = await supabase
        .from("staff_profiles")
        .insert({
          institution_id: context.institutionId,
          person_id: personRes.personId,
          employee_code: employeeCode,
          designation: String(payload.designation ?? "Staff"),
          employment_type: String(payload.employment_type ?? "full_time"),
          joining_date:
            typeof payload.joining_date === "string"
              ? payload.joining_date
              : null,
          lifecycle_status: "active",
        })
        .select("id")
        .single<{ id: string }>();

      if (insertError || !createdStaff) {
        if (insertError?.code === "23505") {
          duplicateDuringCommit += 1;
          await supabase
            .from("import_rows")
            .update({
              validation_status: "duplicate",
              error_messages: [
                "Duplicate staff record skipped (non-overwriting policy).",
              ],
            })
            .eq("institution_id", context.institutionId)
            .eq("id", row.id);
        } else {
          errorDuringCommit += 1;
          await supabase
            .from("import_rows")
            .update({
              validation_status: "error",
              error_messages: [insertError?.message ?? "Staff insert failed."],
            })
            .eq("institution_id", context.institutionId)
            .eq("id", row.id);
        }
        continue;
      }

      committedCount += 1;
      await supabase
        .from("import_rows")
        .update({
          validation_status: "committed",
          target_entity_id: createdStaff.id,
        })
        .eq("institution_id", context.institutionId)
        .eq("id", row.id);
      continue;
    }

    // subject_enrolments
    const sessionId =
      typeof payload.session_id === "string" ? payload.session_id : null;
    const studentEnrolmentId =
      typeof payload.student_enrolment_id === "string"
        ? payload.student_enrolment_id
        : null;
    const subjectOfferingId =
      typeof payload.subject_offering_id === "string"
        ? payload.subject_offering_id
        : null;

    if (!sessionId || !studentEnrolmentId || !subjectOfferingId) {
      errorDuringCommit += 1;
      await supabase
        .from("import_rows")
        .update({
          validation_status: "error",
          error_messages: [
            "Missing resolved session, enrolment, or subject offering reference.",
          ],
        })
        .eq("institution_id", context.institutionId)
        .eq("id", row.id);
      continue;
    }

    const { data: createdSubjEnrolment, error: subjError } = await supabase
      .from("student_subject_enrolments")
      .insert({
        institution_id: context.institutionId,
        session_id: sessionId,
        student_enrolment_id: studentEnrolmentId,
        subject_offering_id: subjectOfferingId,
        enrolment_kind: String(payload.enrolment_kind ?? "elective"),
        status: "active",
      })
      .select("id")
      .single<{ id: string }>();

    if (subjError || !createdSubjEnrolment) {
      if (subjError?.code === "23505") {
        duplicateDuringCommit += 1;
        await supabase
          .from("import_rows")
          .update({
            validation_status: "duplicate",
            error_messages: [
              "Student subject enrolment already exists (skipped).",
            ],
          })
          .eq("institution_id", context.institutionId)
          .eq("id", row.id);
      } else {
        errorDuringCommit += 1;
        await supabase
          .from("import_rows")
          .update({
            validation_status: "error",
            error_messages: [
              subjError?.message ?? "Subject enrolment insert failed.",
            ],
          })
          .eq("institution_id", context.institutionId)
          .eq("id", row.id);
      }
      continue;
    }

    committedCount += 1;
    await supabase
      .from("import_rows")
      .update({
        validation_status: "committed",
        target_entity_id: createdSubjEnrolment.id,
      })
      .eq("institution_id", context.institutionId)
      .eq("id", row.id);
  }

  const finalErrorRows = detail.batch.errorRows + errorDuringCommit;
  const finalDuplicateRows = detail.batch.duplicateRows + duplicateDuringCommit;
  const committedAt = new Date().toISOString();

  await supabase
    .from("import_batches")
    .update({
      status: "committed",
      committed_rows: committedCount,
      error_rows: finalErrorRows,
      duplicate_rows: finalDuplicateRows,
      authorized_by_person_id: context.personId,
      committed_at: committedAt,
    })
    .eq("institution_id", context.institutionId)
    .eq("id", detail.batch.id);

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "import.batch.committed",
    entityType: "import_batch",
    entityId: detail.batch.id,
    afterState: {
      committed_rows: committedCount,
      error_rows: finalErrorRows,
      duplicate_rows: finalDuplicateRows,
    },
  });

  return {
    ok: true,
    data: {
      batchId: detail.batch.id,
      alreadyCommitted: false,
      committedRows: committedCount,
      skippedRows: finalErrorRows + finalDuplicateRows,
    },
  };
}

export async function cancelImportBatch(
  context: VerifiedTenantContext,
  batchId: string,
): Promise<DalResult<{ batchId: string }>> {
  if (!canManageImports(context)) {
    return { ok: false, error: "Import permission required.", status: 403 };
  }

  const detail = await getImportBatchDetail(context, batchId);
  if (!detail) {
    return { ok: false, error: "Import batch not found.", status: 404 };
  }

  if (detail.batch.status === "committed") {
    return {
      ok: false,
      error: "Committed batches cannot be cancelled.",
      status: 400,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("import_batches")
    .update({ status: "cancelled" })
    .eq("institution_id", context.institutionId)
    .eq("id", detail.batch.id);

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "import.batch.cancelled",
    entityType: "import_batch",
    entityId: detail.batch.id,
  });

  return { ok: true, data: { batchId: detail.batch.id } };
}

export async function buildBatchReportCsv(
  context: VerifiedTenantContext,
  batchId: string,
): Promise<DalResult<{ filename: string; csv: string }>> {
  if (!canManageImports(context)) {
    return { ok: false, error: "Import permission required.", status: 403 };
  }

  const detail = await getImportBatchDetail(context, batchId);
  if (!detail) {
    return { ok: false, error: "Import batch not found.", status: 404 };
  }

  const headers = [
    "row_number",
    "validation_status",
    "target_entity_id",
    "errors",
    "normalized_payload",
    "raw_payload",
  ];

  const rows = detail.rows.map((row) => [
    row.rowNumber,
    row.validationStatus,
    row.targetEntityId ?? "",
    row.errorMessages.join(" | "),
    row.normalizedPayload ? JSON.stringify(row.normalizedPayload) : "",
    JSON.stringify(row.rawPayload),
  ]);

  const safeSlug = context.institutionSlug.replace(/[^a-z0-9_-]/gi, "_");
  const filename = `${safeSlug}-${detail.batch.dataType}-${detail.batch.id.slice(0, 8)}-report.csv`;

  return {
    ok: true,
    data: {
      filename,
      csv: serializeCsvSafely(headers, rows),
    },
  };
}
