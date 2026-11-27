import "server-only";

import {
  evaluatePermission,
  type VerifiedTenantContext,
} from "@/lib/auth/permissions";
import {
  filterAndMaskCustomFields,
  maskExternalIdentifier,
  type FilteredCustomFieldItem,
} from "@/lib/registry/masking";
import {
  canTransitionAdmissionStatus,
  createAdmissionSchema,
  createStaffSchema,
  createStudentSchema,
  customFieldDefinitionSchema,
  linkGuardianSchema,
  transitionAdmissionSchema,
  updateStudentLifecycleSchema,
  validateCustomFieldValue,
  type AdmissionStatus,
  type CustomFieldDataType,
  type CustomFieldEntityType,
  type CustomFieldSensitivityLevel,
  type ExternalIdVerificationStatus,
  type GuardianRelationship,
  type StaffEmploymentType,
  type StaffLifecycleStatus,
  type StudentLifecycleStatus,
} from "@/lib/registry/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/server/audit/log";
import { requireInstitutionPermission } from "@/server/auth/guards";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;

export interface PaginatedResult<T> {
  items: readonly T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface StudentListItemDto {
  id: string;
  personId: string;
  admissionNumber: string;
  fullName: string;
  primaryEmail: string | null;
  lifecycleStatus: StudentLifecycleStatus;
  admissionDate: string | null;
  maskedPenNumber: string | null;
  maskedApaarId: string | null;
  externalIdVerificationStatus: ExternalIdVerificationStatus;
}

export interface GuardianLinkDto {
  id: string;
  guardianPersonId: string;
  fullName: string;
  primaryEmail: string | null;
  relationship: GuardianRelationship;
  isPrimary: boolean;
  canViewAcademics: boolean;
  canReceiveNotices: boolean;
  canPickup: boolean;
  status: "active" | "revoked";
}

export interface ActiveEnrolmentSummaryDto {
  enrolmentId: string;
  sessionCode: string;
  sessionName: string;
  gradeCode: string;
  gradeName: string;
  sectionCode: string;
  sectionName: string;
  streamName: string | null;
  rollNumber: string | null;
  status: string;
}

export interface StudentDetailDto {
  id: string;
  personId: string;
  admissionNumber: string;
  fullName: string;
  primaryEmail: string | null;
  lifecycleStatus: StudentLifecycleStatus;
  admissionDate: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  addressLine: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  maskedPenNumber: string | null;
  maskedApaarId: string | null;
  externalIdVerificationStatus: ExternalIdVerificationStatus;
  guardians: readonly GuardianLinkDto[];
  activeEnrolment: ActiveEnrolmentSummaryDto | null;
  customFields: readonly FilteredCustomFieldItem[];
}

export interface StaffListItemDto {
  id: string;
  personId: string;
  employeeCode: string;
  fullName: string;
  primaryEmail: string | null;
  designation: string;
  employmentType: StaffEmploymentType;
  lifecycleStatus: StaffLifecycleStatus;
  joiningDate: string | null;
}

export interface AdmissionListItemDto {
  id: string;
  applicantFullName: string;
  applicantEmail: string | null;
  guardianFullName: string | null;
  guardianPhone: string | null;
  targetSessionLabel: string;
  targetGradeCode: string;
  status: AdmissionStatus;
  admittedStudentProfileId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CustomFieldDefinitionDto {
  id: string;
  entityType: CustomFieldEntityType;
  fieldKey: string;
  label: string;
  fieldGroup: string;
  dataType: CustomFieldDataType;
  options: readonly string[];
  isRequired: boolean;
  sensitivityLevel: CustomFieldSensitivityLevel;
  isActive: boolean;
}

type MutationResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type JoinedPerson = {
  id: string;
  full_name: string;
  primary_email: string | null;
};

type RawStudentRow = {
  id: string;
  person_id: string;
  admission_number: string;
  admission_date: string | null;
  lifecycle_status: StudentLifecycleStatus;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  address_line: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  pen_number: string | null;
  apaar_id: string | null;
  external_id_verification_status: ExternalIdVerificationStatus;
  person: JoinedPerson | JoinedPerson[] | null;
};

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function clampPage(rawPage?: number): number {
  if (!rawPage || !Number.isFinite(rawPage) || rawPage < 1) return 1;
  return Math.floor(rawPage);
}

function clampPageSize(rawSize?: number): number {
  if (!rawSize || !Number.isFinite(rawSize) || rawSize < 1) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(MAX_PAGE_SIZE, Math.floor(rawSize));
}

function canViewFullExternalIds(context: VerifiedTenantContext): boolean {
  return (
    evaluatePermission(context, { permission: "people.sensitive.read" })
      .allowed ||
    evaluatePermission(context, { permission: "people.restricted.read" })
      .allowed ||
    evaluatePermission(context, { permission: "people.manage" }).allowed
  );
}

/**
 * Privileged helper (Blueprint Part A §11.4): creates or looks up an unlinked
 * global `public.persons` row strictly AFTER `requireInstitutionPermission`
 * has verified caller authorization, because `public.persons` has no direct
 * authenticated INSERT policy under RLS. Never called directly for tenant reads.
 */
export async function resolveOrCreateGlobalPerson(input: {
  fullName: string;
  email?: string;
}): Promise<{ ok: true; personId: string } | { ok: false; error: string }> {
  const admin = createSupabaseAdminClient();
  const normalizedEmail = input.email?.trim().toLowerCase();

  if (normalizedEmail) {
    const { data: existing, error: lookupError } = await admin
      .from("persons")
      .select("id")
      .ilike("primary_email", normalizedEmail)
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (lookupError) {
      return { ok: false, error: lookupError.message };
    }
    if (existing) {
      return { ok: true, personId: existing.id };
    }
  }

  const { data: created, error: insertError } = await admin
    .from("persons")
    .insert({
      auth_user_id: null,
      full_name: input.fullName.trim(),
      display_name: input.fullName.trim(),
      primary_email: normalizedEmail ?? null,
      status: "active",
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError || !created) {
    return {
      ok: false,
      error: insertError?.message ?? "Unable to create global person identity.",
    };
  }

  return { ok: true, personId: created.id };
}

export async function listStudents(
  context: VerifiedTenantContext,
  filters: {
    query?: string;
    lifecycleStatus?: StudentLifecycleStatus;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<PaginatedResult<StudentListItemDto>> {
  const supabase = await createSupabaseServerClient();
  const page = clampPage(filters.page);
  const pageSize = clampPageSize(filters.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("student_profiles")
    .select(
      "id, person_id, admission_number, admission_date, lifecycle_status, pen_number, apaar_id, external_id_verification_status, person:persons(id, full_name, primary_email)",
      { count: "exact" },
    )
    .eq("institution_id", context.institutionId)
    .order("admission_number", { ascending: true })
    .range(from, to);

  if (filters.lifecycleStatus) {
    query = query.eq("lifecycle_status", filters.lifecycleStatus);
  }

  const trimmedQuery = filters.query?.trim();
  if (trimmedQuery) {
    query = query.ilike("admission_number", `%${trimmedQuery}%`);
  }

  const { data, count, error } = await query.returns<RawStudentRow[]>();
  if (error || !data) {
    return { items: [], totalCount: 0, page, pageSize };
  }

  const fullExternalIds = canViewFullExternalIds(context);
  const items: StudentListItemDto[] = data.map((row) => {
    const person = unwrapJoin(row.person);
    return {
      id: row.id,
      personId: row.person_id,
      admissionNumber: row.admission_number,
      fullName: person?.full_name ?? `Student (${row.admission_number})`,
      primaryEmail: person?.primary_email ?? null,
      lifecycleStatus: row.lifecycle_status,
      admissionDate: row.admission_date,
      maskedPenNumber: maskExternalIdentifier(row.pen_number, fullExternalIds),
      maskedApaarId: maskExternalIdentifier(row.apaar_id, fullExternalIds),
      externalIdVerificationStatus: row.external_id_verification_status,
    };
  });

  return {
    items,
    totalCount: count ?? items.length,
    page,
    pageSize,
  };
}

export async function getStudentDetail(
  context: VerifiedTenantContext,
  studentProfileId: string,
): Promise<StudentDetailDto | null> {
  const supabase = await createSupabaseServerClient();

  const { data: studentRow, error } = await supabase
    .from("student_profiles")
    .select(
      "id, person_id, admission_number, admission_date, lifecycle_status, date_of_birth, gender, blood_group, address_line, emergency_contact_name, emergency_contact_phone, pen_number, apaar_id, external_id_verification_status, person:persons(id, full_name, primary_email)",
    )
    .eq("institution_id", context.institutionId)
    .eq("id", studentProfileId)
    .maybeSingle<RawStudentRow>();

  if (error || !studentRow) {
    return null;
  }

  const [guardiansRes, enrolmentRes, definitionsRes, valuesRes] =
    await Promise.all([
      supabase
        .from("student_guardians")
        .select(
          "id, guardian_person_id, relationship, is_primary, can_view_academics, can_receive_notices, can_pickup, status, guardian:persons(id, full_name, primary_email)",
        )
        .eq("institution_id", context.institutionId)
        .eq("student_profile_id", studentRow.id)
        .returns<
          {
            id: string;
            guardian_person_id: string;
            relationship: GuardianRelationship;
            is_primary: boolean;
            can_view_academics: boolean;
            can_receive_notices: boolean;
            can_pickup: boolean;
            status: "active" | "revoked";
            guardian: JoinedPerson | JoinedPerson[] | null;
          }[]
        >(),
      supabase
        .from("student_session_enrolments")
        .select(
          "id, roll_number, status, session:academic_sessions(code, name), grade:grade_levels(code, name), section:sections(code, name), stream:streams(name)",
        )
        .eq("institution_id", context.institutionId)
        .eq("student_profile_id", studentRow.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle<{
          id: string;
          roll_number: string | null;
          status: string;
          session: { code: string; name: string } | { code: string; name: string }[] | null;
          grade: { code: string; name: string } | { code: string; name: string }[] | null;
          section: { code: string; name: string } | { code: string; name: string }[] | null;
          stream: { name: string } | { name: string }[] | null;
        }>(),
      listCustomFieldDefinitions(context, "student"),
      supabase
        .from("custom_field_values")
        .select("definition_id, value_text, value_json")
        .eq("institution_id", context.institutionId)
        .eq("entity_type", "student")
        .eq("entity_id", studentRow.id)
        .returns<
          { definition_id: string; value_text: string | null; value_json: unknown }[]
        >(),
    ]);

  const person = unwrapJoin(studentRow.person);
  const fullExternalIds = canViewFullExternalIds(context);

  const guardians: GuardianLinkDto[] = (guardiansRes.data ?? []).map((row) => {
    const guardian = unwrapJoin(row.guardian);
    return {
      id: row.id,
      guardianPersonId: row.guardian_person_id,
      fullName: guardian?.full_name ?? "Verified Guardian",
      primaryEmail: guardian?.primary_email ?? null,
      relationship: row.relationship,
      isPrimary: row.is_primary,
      canViewAcademics: row.can_view_academics,
      canReceiveNotices: row.can_receive_notices,
      canPickup: row.can_pickup,
      status: row.status,
    };
  });

  const enrolmentRow = enrolmentRes.data;
  const session = unwrapJoin(enrolmentRow?.session);
  const grade = unwrapJoin(enrolmentRow?.grade);
  const section = unwrapJoin(enrolmentRow?.section);
  const stream = unwrapJoin(enrolmentRow?.stream);

  const activeEnrolment: ActiveEnrolmentSummaryDto | null =
    enrolmentRow && session && grade && section
      ? {
          enrolmentId: enrolmentRow.id,
          sessionCode: session.code,
          sessionName: session.name,
          gradeCode: grade.code,
          gradeName: grade.name,
          sectionCode: section.code,
          sectionName: section.name,
          streamName: stream?.name ?? null,
          rollNumber: enrolmentRow.roll_number,
          status: enrolmentRow.status,
        }
      : null;

  const customFields = filterAndMaskCustomFields(
    definitionsRes,
    (valuesRes.data ?? []).map((val) => ({
      definitionId: val.definition_id,
      valueText: val.value_text,
      valueJson: val.value_json,
    })),
    context,
  );

  return {
    id: studentRow.id,
    personId: studentRow.person_id,
    admissionNumber: studentRow.admission_number,
    fullName: person?.full_name ?? `Student (${studentRow.admission_number})`,
    primaryEmail: person?.primary_email ?? null,
    lifecycleStatus: studentRow.lifecycle_status,
    admissionDate: studentRow.admission_date,
    dateOfBirth: studentRow.date_of_birth,
    gender: studentRow.gender,
    bloodGroup: studentRow.blood_group,
    addressLine: studentRow.address_line,
    emergencyContactName: studentRow.emergency_contact_name,
    emergencyContactPhone: studentRow.emergency_contact_phone,
    maskedPenNumber: maskExternalIdentifier(
      studentRow.pen_number,
      fullExternalIds,
    ),
    maskedApaarId: maskExternalIdentifier(
      studentRow.apaar_id,
      fullExternalIds,
    ),
    externalIdVerificationStatus: studentRow.external_id_verification_status,
    guardians,
    activeEnrolment,
    customFields,
  };
}

export async function listStaff(
  context: VerifiedTenantContext,
  filters: {
    query?: string;
    lifecycleStatus?: StaffLifecycleStatus;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<PaginatedResult<StaffListItemDto>> {
  const supabase = await createSupabaseServerClient();
  const page = clampPage(filters.page);
  const pageSize = clampPageSize(filters.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("staff_profiles")
    .select(
      "id, person_id, employee_code, designation, employment_type, lifecycle_status, joining_date, person:persons(id, full_name, primary_email)",
      { count: "exact" },
    )
    .eq("institution_id", context.institutionId)
    .order("employee_code", { ascending: true })
    .range(from, to);

  if (filters.lifecycleStatus) {
    query = query.eq("lifecycle_status", filters.lifecycleStatus);
  }

  const trimmedQuery = filters.query?.trim();
  if (trimmedQuery) {
    query = query.ilike("employee_code", `%${trimmedQuery}%`);
  }

  const { data, count, error } = await query.returns<
    {
      id: string;
      person_id: string;
      employee_code: string;
      designation: string;
      employment_type: StaffEmploymentType;
      lifecycle_status: StaffLifecycleStatus;
      joining_date: string | null;
      person: JoinedPerson | JoinedPerson[] | null;
    }[]
  >();

  if (error || !data) {
    return { items: [], totalCount: 0, page, pageSize };
  }

  const items: StaffListItemDto[] = data.map((row) => {
    const person = unwrapJoin(row.person);
    return {
      id: row.id,
      personId: row.person_id,
      employeeCode: row.employee_code,
      fullName: person?.full_name ?? row.designation,
      primaryEmail: person?.primary_email ?? null,
      designation: row.designation,
      employmentType: row.employment_type,
      lifecycleStatus: row.lifecycle_status,
      joiningDate: row.joining_date,
    };
  });

  return {
    items,
    totalCount: count ?? items.length,
    page,
    pageSize,
  };
}

export async function listAdmissions(
  context: VerifiedTenantContext,
  filters: {
    status?: AdmissionStatus;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<PaginatedResult<AdmissionListItemDto>> {
  const supabase = await createSupabaseServerClient();
  const page = clampPage(filters.page);
  const pageSize = clampPageSize(filters.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("admission_applications")
    .select(
      "id, applicant_full_name, applicant_email, guardian_full_name, guardian_phone, target_session_label, target_grade_code, status, admitted_student_profile_id, notes, created_at",
      { count: "exact" },
    )
    .eq("institution_id", context.institutionId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, count, error } = await query.returns<
    {
      id: string;
      applicant_full_name: string;
      applicant_email: string | null;
      guardian_full_name: string | null;
      guardian_phone: string | null;
      target_session_label: string;
      target_grade_code: string;
      status: AdmissionStatus;
      admitted_student_profile_id: string | null;
      notes: string | null;
      created_at: string;
    }[]
  >();

  if (error || !data) {
    return { items: [], totalCount: 0, page, pageSize };
  }

  const items: AdmissionListItemDto[] = data.map((row) => ({
    id: row.id,
    applicantFullName: row.applicant_full_name,
    applicantEmail: row.applicant_email,
    guardianFullName: row.guardian_full_name,
    guardianPhone: row.guardian_phone,
    targetSessionLabel: row.target_session_label,
    targetGradeCode: row.target_grade_code,
    status: row.status,
    admittedStudentProfileId: row.admitted_student_profile_id,
    notes: row.notes,
    createdAt: row.created_at,
  }));

  return {
    items,
    totalCount: count ?? items.length,
    page,
    pageSize,
  };
}

export async function listCustomFieldDefinitions(
  context: VerifiedTenantContext,
  entityType?: CustomFieldEntityType,
): Promise<CustomFieldDefinitionDto[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("custom_field_definitions")
    .select(
      "id, entity_type, field_key, label, field_group, data_type, options_json, is_required, sensitivity_level, is_active",
    )
    .eq("institution_id", context.institutionId)
    .order("field_group", { ascending: true })
    .order("label", { ascending: true });

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  const { data, error } = await query.returns<
    {
      id: string;
      entity_type: CustomFieldEntityType;
      field_key: string;
      label: string;
      field_group: string;
      data_type: CustomFieldDataType;
      options_json: unknown;
      is_required: boolean;
      sensitivity_level: CustomFieldSensitivityLevel;
      is_active: boolean;
    }[]
  >();

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    fieldKey: row.field_key,
    label: row.label,
    fieldGroup: row.field_group,
    dataType: row.data_type,
    options: Array.isArray(row.options_json)
      ? row.options_json.filter((opt): opt is string => typeof opt === "string")
      : [],
    isRequired: row.is_required,
    sensitivityLevel: row.sensitivity_level,
    isActive: row.is_active,
  }));
}

export async function createStudentRecord(
  slug: string,
  rawInput: unknown,
): Promise<MutationResult<{ studentProfileId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "people.manage",
  });
  if (!guard.ok) {
    return { ok: false, error: "Permission denied for student registry updates." };
  }

  const parsed = createStudentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid student input.",
    };
  }

  const personResult = await resolveOrCreateGlobalPerson({
    fullName: parsed.data.fullName,
    email: parsed.data.email,
  });
  if (!personResult.ok) {
    return { ok: false, error: personResult.error };
  }

  const supabase = await createSupabaseServerClient();
  const { data: student, error } = await supabase
    .from("student_profiles")
    .insert({
      institution_id: guard.context.institutionId,
      person_id: personResult.personId,
      admission_number: parsed.data.admissionNumber,
      admission_date: parsed.data.admissionDate ?? null,
      lifecycle_status: parsed.data.lifecycleStatus,
      date_of_birth: parsed.data.dateOfBirth ?? null,
      gender: parsed.data.gender ?? null,
      blood_group: parsed.data.bloodGroup ?? null,
      address_line: parsed.data.addressLine ?? null,
      emergency_contact_name: parsed.data.emergencyContactName ?? null,
      emergency_contact_phone: parsed.data.emergencyContactPhone ?? null,
      pen_number: parsed.data.penNumber ?? null,
      apaar_id: parsed.data.apaarId ?? null,
      external_id_verification_status: parsed.data.externalIdVerificationStatus,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !student) {
    return {
      ok: false,
      error: error?.message ?? "Unable to create student profile.",
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "student_profile.created",
    entityType: "student_profiles",
    entityId: student.id,
    afterState: {
      admission_number: parsed.data.admissionNumber,
      lifecycle_status: parsed.data.lifecycleStatus,
    },
  });

  return { ok: true, data: { studentProfileId: student.id } };
}

export async function updateStudentLifecycle(
  slug: string,
  rawInput: unknown,
): Promise<MutationResult<{ studentProfileId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "people.manage",
  });
  if (!guard.ok) {
    return { ok: false, error: "Permission denied for lifecycle changes." };
  }

  const parsed = updateStudentLifecycleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid lifecycle update.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: fetchError } = await supabase
    .from("student_profiles")
    .select("id, lifecycle_status")
    .eq("institution_id", guard.context.institutionId)
    .eq("id", parsed.data.studentProfileId)
    .maybeSingle<{ id: string; lifecycle_status: StudentLifecycleStatus }>();

  if (fetchError || !existing) {
    return { ok: false, error: "Student profile not found in this institution." };
  }

  const { error: updateError } = await supabase
    .from("student_profiles")
    .update({ lifecycle_status: parsed.data.lifecycleStatus })
    .eq("institution_id", guard.context.institutionId)
    .eq("id", existing.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "student_profile.lifecycle_updated",
    entityType: "student_profiles",
    entityId: existing.id,
    reason: parsed.data.reason ?? null,
    beforeState: { lifecycle_status: existing.lifecycle_status },
    afterState: { lifecycle_status: parsed.data.lifecycleStatus },
  });

  return { ok: true, data: { studentProfileId: existing.id } };
}

export async function linkStudentGuardian(
  slug: string,
  rawInput: unknown,
): Promise<MutationResult<{ guardianLinkId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "people.manage",
  });
  if (!guard.ok) {
    return { ok: false, error: "Permission denied to link guardians." };
  }

  const parsed = linkGuardianSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid guardian link input.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: studentCheck } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("institution_id", guard.context.institutionId)
    .eq("id", parsed.data.studentProfileId)
    .maybeSingle<{ id: string }>();

  if (!studentCheck) {
    return { ok: false, error: "Student profile not found." };
  }

  const personResult = await resolveOrCreateGlobalPerson({
    fullName: parsed.data.guardianFullName,
    email: parsed.data.guardianEmail,
  });
  if (!personResult.ok) {
    return { ok: false, error: personResult.error };
  }

  const { data: linkRow, error } = await supabase
    .from("student_guardians")
    .insert({
      institution_id: guard.context.institutionId,
      student_profile_id: studentCheck.id,
      guardian_person_id: personResult.personId,
      relationship: parsed.data.relationship,
      is_primary: parsed.data.isPrimary,
      can_view_academics: parsed.data.canViewAcademics,
      can_receive_notices: parsed.data.canReceiveNotices,
      can_pickup: parsed.data.canPickup,
      status: "active",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !linkRow) {
    return { ok: false, error: error?.message ?? "Unable to link guardian." };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "student_guardian.linked",
    entityType: "student_guardians",
    entityId: linkRow.id,
    afterState: {
      student_profile_id: studentCheck.id,
      guardian_person_id: personResult.personId,
      relationship: parsed.data.relationship,
      is_primary: parsed.data.isPrimary,
    },
  });

  return { ok: true, data: { guardianLinkId: linkRow.id } };
}

export async function createStaffRecord(
  slug: string,
  rawInput: unknown,
): Promise<MutationResult<{ staffProfileId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "people.manage",
  });
  if (!guard.ok) {
    return { ok: false, error: "Permission denied for staff directory updates." };
  }

  const parsed = createStaffSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid staff input.",
    };
  }

  const personResult = await resolveOrCreateGlobalPerson({
    fullName: parsed.data.fullName,
    email: parsed.data.email,
  });
  if (!personResult.ok) {
    return { ok: false, error: personResult.error };
  }

  const supabase = await createSupabaseServerClient();
  const { data: staffRow, error } = await supabase
    .from("staff_profiles")
    .insert({
      institution_id: guard.context.institutionId,
      person_id: personResult.personId,
      employee_code: parsed.data.employeeCode,
      designation: parsed.data.designation,
      employment_type: parsed.data.employmentType,
      lifecycle_status: parsed.data.lifecycleStatus,
      joining_date: parsed.data.joiningDate ?? null,
      qualifications: parsed.data.qualifications ?? null,
      emergency_contact_name: parsed.data.emergencyContactName ?? null,
      emergency_contact_phone: parsed.data.emergencyContactPhone ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !staffRow) {
    return { ok: false, error: error?.message ?? "Unable to add staff record." };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "staff_profile.created",
    entityType: "staff_profiles",
    entityId: staffRow.id,
    afterState: {
      employee_code: parsed.data.employeeCode,
      designation: parsed.data.designation,
    },
  });

  return { ok: true, data: { staffProfileId: staffRow.id } };
}

export async function createAdmissionApplication(
  slug: string,
  rawInput: unknown,
): Promise<MutationResult<{ applicationId: string }>> {
  const managePeople = await requireInstitutionPermission(slug, {
    permission: "people.manage",
  });
  const manageAdmissions = managePeople.ok
    ? managePeople
    : await requireInstitutionPermission(slug, {
        permission: "admissions.manage",
      });

  if (!manageAdmissions.ok) {
    return { ok: false, error: "Permission denied for admissions creation." };
  }

  const parsed = createAdmissionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid admission application.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: application, error } = await supabase
    .from("admission_applications")
    .insert({
      institution_id: manageAdmissions.context.institutionId,
      applicant_full_name: parsed.data.applicantFullName,
      applicant_email: parsed.data.applicantEmail ?? null,
      guardian_full_name: parsed.data.guardianFullName ?? null,
      guardian_phone: parsed.data.guardianPhone ?? null,
      target_session_label: parsed.data.targetSessionLabel,
      target_grade_code: parsed.data.targetGradeCode,
      status: "enquiry",
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !application) {
    return {
      ok: false,
      error: error?.message ?? "Unable to create admission application.",
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: manageAdmissions.context.institutionId,
    actorPersonId: manageAdmissions.context.personId,
    actorAuthUserId: manageAdmissions.context.authUserId,
    action: "admission_application.created",
    entityType: "admission_applications",
    entityId: application.id,
    afterState: {
      status: "enquiry",
      target_grade_code: parsed.data.targetGradeCode,
    },
  });

  return { ok: true, data: { applicationId: application.id } };
}

export async function transitionAdmissionStatus(
  slug: string,
  rawInput: unknown,
): Promise<
  MutationResult<{ applicationId: string; studentProfileId?: string }>
> {
  const parsed = transitionAdmissionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid admission transition.",
    };
  }

  const peopleGuard = await requireInstitutionPermission(slug, {
    permission: "people.manage",
  });
  const guard =
    parsed.data.nextStatus === "enrolled"
      ? peopleGuard
      : peopleGuard.ok
        ? peopleGuard
        : await requireInstitutionPermission(slug, {
            permission: "admissions.manage",
          });

  if (!guard.ok) {
    return {
      ok: false,
      error:
        parsed.data.nextStatus === "enrolled"
          ? "Enrolling an applicant into Student Profiles requires people.manage permission."
          : "Permission denied to update admission status.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: fetchError } = await supabase
    .from("admission_applications")
    .select(
      "id, applicant_full_name, applicant_email, status, admitted_student_profile_id, notes",
    )
    .eq("institution_id", guard.context.institutionId)
    .eq("id", parsed.data.applicationId)
    .maybeSingle<{
      id: string;
      applicant_full_name: string;
      applicant_email: string | null;
      status: AdmissionStatus;
      admitted_student_profile_id: string | null;
      notes: string | null;
    }>();

  if (fetchError || !existing) {
    return { ok: false, error: "Admission application not found." };
  }

  if (!canTransitionAdmissionStatus(existing.status, parsed.data.nextStatus)) {
    return {
      ok: false,
      error: `Cannot transition admission from ${existing.status} to ${parsed.data.nextStatus}.`,
    };
  }

  let admittedStudentProfileId = existing.admitted_student_profile_id;

  if (parsed.data.nextStatus === "enrolled" && !admittedStudentProfileId) {
    const personResult = await resolveOrCreateGlobalPerson({
      fullName: existing.applicant_full_name,
      email: existing.applicant_email ?? undefined,
    });
    if (!personResult.ok) {
      return { ok: false, error: personResult.error };
    }

    const { data: existingStudent } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("institution_id", guard.context.institutionId)
      .eq("person_id", personResult.personId)
      .maybeSingle<{ id: string }>();

    if (existingStudent) {
      admittedStudentProfileId = existingStudent.id;
    } else {
      const { data: createdStudent, error: studentError } = await supabase
        .from("student_profiles")
        .insert({
          institution_id: guard.context.institutionId,
          person_id: personResult.personId,
          admission_number: parsed.data.admissionNumber!,
          admission_date: new Date().toISOString().slice(0, 10),
          lifecycle_status: "admitted",
        })
        .select("id")
        .single<{ id: string }>();

      if (studentError || !createdStudent) {
        return {
          ok: false,
          error:
            studentError?.message ??
            "Unable to create student profile on admission enrolment.",
        };
      }
      admittedStudentProfileId = createdStudent.id;
    }
  }

  const { error: updateError } = await supabase
    .from("admission_applications")
    .update({
      status: parsed.data.nextStatus,
      reviewed_by_person_id: guard.context.personId,
      admitted_student_profile_id: admittedStudentProfileId,
      notes: parsed.data.notes ?? existing.notes,
    })
    .eq("institution_id", guard.context.institutionId)
    .eq("id", existing.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "admission_application.status_transitioned",
    entityType: "admission_applications",
    entityId: existing.id,
    beforeState: { status: existing.status },
    afterState: {
      status: parsed.data.nextStatus,
      admitted_student_profile_id: admittedStudentProfileId,
    },
  });

  return {
    ok: true,
    data: {
      applicationId: existing.id,
      studentProfileId: admittedStudentProfileId ?? undefined,
    },
  };
}

export async function upsertCustomFieldDefinition(
  slug: string,
  rawInput: unknown,
): Promise<MutationResult<{ definitionId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "people.manage",
  });
  if (!guard.ok) {
    return {
      ok: false,
      error: "Permission denied to configure custom field definitions.",
    };
  }

  const parsed = customFieldDefinitionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Invalid custom field definition.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: defRow, error } = await supabase
    .from("custom_field_definitions")
    .upsert(
      {
        institution_id: guard.context.institutionId,
        entity_type: parsed.data.entityType,
        field_key: parsed.data.fieldKey,
        label: parsed.data.label,
        field_group: parsed.data.fieldGroup,
        data_type: parsed.data.dataType,
        options_json: parsed.data.options,
        is_required: parsed.data.isRequired,
        sensitivity_level: parsed.data.sensitivityLevel,
        is_active: parsed.data.isActive,
      },
      { onConflict: "institution_id,entity_type,field_key" },
    )
    .select("id")
    .single<{ id: string }>();

  if (error || !defRow) {
    return {
      ok: false,
      error: error?.message ?? "Unable to save custom field definition.",
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "custom_field_definition.upserted",
    entityType: "custom_field_definitions",
    entityId: defRow.id,
    afterState: {
      entity_type: parsed.data.entityType,
      field_key: parsed.data.fieldKey,
      sensitivity_level: parsed.data.sensitivityLevel,
    },
  });

  return { ok: true, data: { definitionId: defRow.id } };
}

export async function upsertCustomFieldValue(
  slug: string,
  input: {
    definitionId: string;
    entityType: CustomFieldEntityType;
    entityId: string;
    rawValue: string | null | undefined;
  },
): Promise<MutationResult<{ valueId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "people.manage",
  });
  if (!guard.ok) {
    return {
      ok: false,
      error: "Permission denied to update custom field values.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: definition, error: defError } = await supabase
    .from("custom_field_definitions")
    .select(
      "id, label, entity_type, data_type, options_json, is_required, sensitivity_level",
    )
    .eq("institution_id", guard.context.institutionId)
    .eq("id", input.definitionId)
    .maybeSingle<{
      id: string;
      label: string;
      entity_type: CustomFieldEntityType;
      data_type: CustomFieldDataType;
      options_json: unknown;
      is_required: boolean;
      sensitivity_level: CustomFieldSensitivityLevel;
    }>();

  if (defError || !definition) {
    return { ok: false, error: "Custom field definition not found." };
  }

  if (
    definition.sensitivity_level === "confidential" &&
    !evaluatePermission(guard.context, { permission: "people.sensitive.write" })
      .allowed
  ) {
    return {
      ok: false,
      error:
        "Confidential custom fields require people.sensitive.write permission.",
    };
  }

  const options = Array.isArray(definition.options_json)
    ? definition.options_json.filter((opt): opt is string => typeof opt === "string")
    : [];

  const validated = validateCustomFieldValue(
    {
      label: definition.label,
      dataType: definition.data_type,
      options,
      isRequired: definition.is_required,
    },
    input.rawValue,
  );

  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const { data: valueRow, error: saveError } = await supabase
    .from("custom_field_values")
    .upsert(
      {
        institution_id: guard.context.institutionId,
        definition_id: definition.id,
        entity_type: definition.entity_type,
        entity_id: input.entityId,
        value_text: validated.valueText,
        value_json: validated.valueJson,
        updated_by_person_id: guard.context.personId,
      },
      { onConflict: "institution_id,definition_id,entity_id" },
    )
    .select("id")
    .single<{ id: string }>();

  if (saveError || !valueRow) {
    return {
      ok: false,
      error: saveError?.message ?? "Unable to save custom field value.",
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "custom_field_value.upserted",
    entityType: "custom_field_values",
    entityId: valueRow.id,
    afterState: {
      definition_id: definition.id,
      entity_type: definition.entity_type,
      entity_id: input.entityId,
    },
  });

  return { ok: true, data: { valueId: valueRow.id } };
}
