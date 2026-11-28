import "server-only";

import {
  buildAttendanceIdempotencyKey,
  canTransitionStaffVerification,
  canTransitionStudentVerification,
  mapStaffStatusToEventStatus,
  summarizeStudentDailyRecords,
  type AttendanceShortageSummary,
} from "@/lib/attendance/rules";
import {
  correctStaffAttendanceSchema,
  correctStudentAttendanceSchema,
  isoDateSchema,
  markPeriodAttendanceSchema,
  markStudentDailyRollSchema,
  offlineSyncBatchSchema,
  recordStaffAttendanceSchema,
  signOffSectionAttendanceSchema,
  updateAttendancePolicySchema,
  verifyOrSignOffStaffAttendanceSchema,
  verifySectionAttendanceSchema,
  type AttendanceEventType,
  type AttendanceSource,
  type AttendanceSubjectKind,
  type StaffAttendanceStatus,
  type StaffVerificationStatus,
  type StudentDailyAttendanceStatus,
  type StudentPeriodAttendanceStatus,
  type StudentVerificationStatus,
} from "@/lib/attendance/schemas";
import {
  evaluatePermission,
  type VerifiedTenantContext,
} from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/server/audit/log";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export type AttendanceActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export interface AttendancePolicyDto {
  id: string | null;
  minimumAttendancePercent: number;
  warningThresholdPercent: number;
  periodAttendanceEnabled: boolean;
  biometricEnabled: boolean;
  policyNotes: string | null;
}

export interface AttendanceCapabilitiesDto {
  canMarkDaily: boolean;
  canVerifySection: boolean;
  canSignOff: boolean;
  canCorrectSignedOff: boolean;
  canAccessPeriodRoll: boolean;
  canMarkPeriodRoll: boolean;
  canAccessStaffAttendance: boolean;
  canManageStaffAttendance: boolean;
  canViewLedger: boolean;
  canManagePolicy: boolean;
  isMonitorReadOnly: boolean;
}

export interface AttendanceSectionOptionDto {
  id: string;
  sessionId: string;
  departmentId: string;
  gradeCode: string;
  code: string;
  name: string;
}

export interface StudentDailyRollRowDto {
  enrolmentId: string;
  studentProfileId: string;
  admissionNumber: string;
  fullName: string;
  rollNumber: string | null;
  attendanceId: string | null;
  status: StudentDailyAttendanceStatus | null;
  verificationStatus: StudentVerificationStatus | null;
  markedByName: string | null;
  verifiedByName: string | null;
  signedOffByName: string | null;
  correctionCount: number;
  lastCorrectionReason: string | null;
  remarks: string | null;
  shortage: AttendanceShortageSummary;
}

export interface AttendanceEventDto {
  id: string;
  idempotencyKey: string;
  subjectKind: AttendanceSubjectKind;
  subjectLabel: string;
  sectionLabel: string | null;
  teachingGroupLabel: string | null;
  attendanceDate: string;
  eventType: AttendanceEventType;
  attendanceStatus: StudentDailyAttendanceStatus;
  source: AttendanceSource;
  occurredAt: string;
  recordedByName: string | null;
  reason: string | null;
}

export interface AttendanceOverviewDto {
  context: VerifiedTenantContext;
  policy: AttendancePolicyDto;
  activeSession: { id: string; code: string; name: string } | null;
  selectedDate: string;
  recentDates: readonly string[];
  sections: readonly AttendanceSectionOptionDto[];
  selectedSection: AttendanceSectionOptionDto | null;
  sectionVerificationStatus: StudentVerificationStatus | "unmarked" | "mixed";
  rows: readonly StudentDailyRollRowDto[];
  recentEvents: readonly AttendanceEventDto[];
  capabilities: AttendanceCapabilitiesDto;
}

export interface PeriodAttendanceMemberRowDto {
  enrolmentId: string;
  studentProfileId: string;
  admissionNumber: string;
  fullName: string;
  rollNumber: string | null;
  sectionCode: string;
  attendanceId: string | null;
  status: StudentPeriodAttendanceStatus | null;
  markedByName: string | null;
  remarks: string | null;
}

export interface PeriodAttendanceViewDto {
  context: VerifiedTenantContext;
  allowed: boolean;
  policy: AttendancePolicyDto;
  activeSession: { id: string; code: string; name: string } | null;
  selectedDate: string;
  selectedPeriodCode: string;
  teachingGroups: readonly {
    id: string;
    code: string;
    name: string;
    subjectName: string;
    isCrossSection: boolean;
  }[];
  selectedGroup: {
    id: string;
    code: string;
    name: string;
    subjectName: string;
    isCrossSection: boolean;
  } | null;
  members: readonly PeriodAttendanceMemberRowDto[];
  canMarkSelectedGroup: boolean;
  capabilities: AttendanceCapabilitiesDto;
}

export interface StaffAttendanceRowDto {
  staffProfileId: string;
  employeeCode: string;
  designation: string | null;
  fullName: string;
  attendanceId: string | null;
  status: StaffAttendanceStatus | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  verificationStatus: StaffVerificationStatus | null;
  markedByName: string | null;
  signedOffByName: string | null;
  correctionCount: number;
  lastCorrectionReason: string | null;
  remarks: string | null;
}

export interface StaffAttendanceViewDto {
  context: VerifiedTenantContext;
  allowed: boolean;
  selectedDate: string;
  rows: readonly StaffAttendanceRowDto[];
  capabilities: AttendanceCapabilitiesDto;
}

export interface AttendanceLedgerAndPolicyViewDto {
  context: VerifiedTenantContext;
  allowed: boolean;
  policy: AttendancePolicyDto;
  selectedDate: string;
  selectedSubjectKind: "all" | AttendanceSubjectKind;
  events: readonly AttendanceEventDto[];
  capabilities: AttendanceCapabilitiesDto;
}

export interface OfflineSyncBatchResultDto {
  accepted: number;
  deduplicated: number;
  rejected: { idempotencyKey: string; reason: string }[];
}

const DEFAULT_POLICY: AttendancePolicyDto = {
  id: null,
  minimumAttendancePercent: 75,
  warningThresholdPercent: 80,
  periodAttendanceEnabled: false,
  biometricEnabled: false,
  policyNotes: null,
};

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function getInstitutionTodayIsoDate(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function normalizeSelectedDate(rawDate: string | undefined, timezone: string): string {
  if (rawDate) {
    const parsed = isoDateSchema.safeParse(rawDate);
    if (parsed.success) {
      return parsed.data;
    }
  }
  return getInstitutionTodayIsoDate(timezone);
}

async function fetchPersonNameMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  personIds: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const uniqueIds = [
    ...new Set(personIds.filter((id): id is string => Boolean(id && id.length > 0))),
  ];
  const map = new Map<string, string>();
  if (uniqueIds.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("persons")
    .select("id, full_name, display_name")
    .in("id", uniqueIds)
    .returns<{ id: string; full_name: string; display_name: string | null }[]>();

  if (error) {
    throw new Error(`Failed to resolve person names: ${error.message}`);
  }

  for (const row of data ?? []) {
    map.set(row.id, row.full_name || row.display_name || row.id.slice(0, 8));
  }
  return map;
}

async function loadAttendancePolicy(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  institutionId: string,
): Promise<AttendancePolicyDto> {
  const { data, error } = await supabase
    .from("attendance_policies")
    .select(
      "id, minimum_attendance_percent, warning_threshold_percent, period_attendance_enabled, biometric_enabled, policy_notes",
    )
    .eq("institution_id", institutionId)
    .maybeSingle<{
      id: string;
      minimum_attendance_percent: number;
      warning_threshold_percent: number;
      period_attendance_enabled: boolean;
      biometric_enabled: boolean;
      policy_notes: string | null;
    }>();

  if (error) {
    throw new Error(`Failed to load attendance policy: ${error.message}`);
  }

  if (!data) {
    return DEFAULT_POLICY;
  }

  return {
    id: data.id,
    minimumAttendancePercent: Number(data.minimum_attendance_percent),
    warningThresholdPercent: Number(data.warning_threshold_percent),
    periodAttendanceEnabled: Boolean(data.period_attendance_enabled),
    biometricEnabled: Boolean(data.biometric_enabled),
    policyNotes: data.policy_notes,
  };
}

interface CallerAcademicScope {
  activeSession: { id: string; code: string; name: string } | null;
  hodDepartmentIds: Set<string>;
  classTeacherSectionIds: Set<string>;
  subjectTeacherGroupIds: Set<string>;
  monitorSectionIds: Set<string>;
  isOwnStaffMember: boolean;
}

async function loadCallerAcademicScope(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  context: VerifiedTenantContext,
  todayDate: string,
): Promise<CallerAcademicScope> {
  const [sessionRes, ownStaffRes] = await Promise.all([
    supabase
      .from("academic_sessions")
      .select("id, code, name")
      .eq("institution_id", context.institutionId)
      .eq("status", "active")
      .maybeSingle<{ id: string; code: string; name: string }>(),
    supabase
      .from("staff_profiles")
      .select("id")
      .eq("institution_id", context.institutionId)
      .eq("person_id", context.personId)
      .maybeSingle<{ id: string }>(),
  ]);

  if (sessionRes.error) {
    throw new Error(`Failed to load active academic session: ${sessionRes.error.message}`);
  }
  if (ownStaffRes.error) {
    throw new Error(`Failed to verify own staff profile: ${ownStaffRes.error.message}`);
  }

  const hodDepartmentIds = new Set<string>();
  const classTeacherSectionIds = new Set<string>();
  const subjectTeacherGroupIds = new Set<string>();
  const monitorSectionIds = new Set<string>();

  if (sessionRes.data) {
    const { data: myAssignments, error: assignErr } = await supabase
      .from("academic_assignments")
      .select("assignment_type, department_id, section_id, teaching_group_id")
      .eq("institution_id", context.institutionId)
      .eq("session_id", sessionRes.data.id)
      .eq("person_id", context.personId)
      .in("status", ["active", "delegated"])
      .lte("starts_on", todayDate)
      .or(`ends_on.is.null,ends_on.gte.${todayDate}`)
      .returns<
        {
          assignment_type: string;
          department_id: string | null;
          section_id: string | null;
          teaching_group_id: string | null;
        }[]
      >();

    if (assignErr) {
      throw new Error(`Failed to load caller assignments: ${assignErr.message}`);
    }

    for (const row of myAssignments ?? []) {
      if (row.assignment_type === "hod" && row.department_id) {
        hodDepartmentIds.add(row.department_id);
      } else if (row.assignment_type === "class_teacher" && row.section_id) {
        classTeacherSectionIds.add(row.section_id);
      } else if (row.assignment_type === "subject_teacher" && row.teaching_group_id) {
        subjectTeacherGroupIds.add(row.teaching_group_id);
      } else if (
        (row.assignment_type === "monitor" || row.assignment_type === "monitress") &&
        row.section_id
      ) {
        monitorSectionIds.add(row.section_id);
      }
    }
  }

  return {
    activeSession: sessionRes.data ?? null,
    hodDepartmentIds,
    classTeacherSectionIds,
    subjectTeacherGroupIds,
    monitorSectionIds,
    isOwnStaffMember: Boolean(ownStaffRes.data),
  };
}

function buildCapabilities(
  context: VerifiedTenantContext,
  scope: CallerAcademicScope,
  selectedSection: AttendanceSectionOptionDto | null,
): AttendanceCapabilitiesDto {
  const hasManage = evaluatePermission(context, {
    permission: "attendance.manage",
  }).allowed;
  const hasRead = evaluatePermission(context, {
    permission: "attendance.read",
  }).allowed;
  const hasPeopleRead = evaluatePermission(context, {
    permission: "people.read",
  }).allowed;
  const hasPeopleManage = evaluatePermission(context, {
    permission: "people.manage",
  }).allowed;

  const isSelectedSectionClassTeacherOrHod = selectedSection
    ? scope.classTeacherSectionIds.has(selectedSection.id) ||
      scope.hodDepartmentIds.has(selectedSection.departmentId)
    : scope.classTeacherSectionIds.size > 0 || scope.hodDepartmentIds.size > 0;

  const canMarkDaily = hasManage || isSelectedSectionClassTeacherOrHod;
  const canVerifySection = canMarkDaily;
  const canSignOff = hasManage;
  const canCorrectSignedOff = hasManage;
  const canAccessPeriodRoll =
    hasManage ||
    scope.hodDepartmentIds.size > 0 ||
    scope.classTeacherSectionIds.size > 0 ||
    scope.subjectTeacherGroupIds.size > 0;
  const canMarkPeriodRoll = canAccessPeriodRoll;
  const canAccessStaffAttendance =
    hasManage || hasPeopleRead || hasPeopleManage || scope.isOwnStaffMember;
  const canManageStaffAttendance = hasManage || hasPeopleManage;
  const canViewLedger =
    hasManage ||
    hasRead ||
    scope.hodDepartmentIds.size > 0 ||
    scope.classTeacherSectionIds.size > 0 ||
    scope.subjectTeacherGroupIds.size > 0 ||
    scope.isOwnStaffMember;
  const canManagePolicy = hasManage;
  const isMonitorReadOnly =
    !canMarkDaily &&
    !hasRead &&
    (scope.monitorSectionIds.size > 0 ||
      evaluatePermission(context, { permission: "classroom.summary.read" }).allowed);

  return {
    canMarkDaily,
    canVerifySection,
    canSignOff,
    canCorrectSignedOff,
    canAccessPeriodRoll,
    canMarkPeriodRoll,
    canAccessStaffAttendance,
    canManageStaffAttendance,
    canViewLedger,
    canManagePolicy,
    isMonitorReadOnly,
  };
}

function summarizeSectionVerification(
  rows: readonly StudentDailyRollRowDto[],
): StudentVerificationStatus | "unmarked" | "mixed" {
  const statuses = new Set<StudentVerificationStatus>();
  for (const row of rows) {
    if (row.verificationStatus) {
      statuses.add(row.verificationStatus);
    }
  }
  if (statuses.size === 0) return "unmarked";
  if (statuses.size === 1) {
    return [...statuses][0] ?? "unmarked";
  }
  return "mixed";
}

export async function getAttendanceOverview(
  context: VerifiedTenantContext,
  options: { date?: string; sectionId?: string } = {},
): Promise<AttendanceOverviewDto> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const selectedDate = normalizeSelectedDate(options.date, context.institutionTimezone);

  const [policy, scope] = await Promise.all([
    loadAttendancePolicy(supabase, context.institutionId),
    loadCallerAcademicScope(supabase, context, todayDate),
  ]);

  if (!scope.activeSession) {
    return {
      context,
      policy,
      activeSession: null,
      selectedDate,
      recentDates: [],
      sections: [],
      selectedSection: null,
      sectionVerificationStatus: "unmarked",
      rows: [],
      recentEvents: [],
      capabilities: buildCapabilities(context, scope, null),
    };
  }

  const [sectionsRes, recentDatesRes] = await Promise.all([
    supabase
      .from("sections")
      .select(
        "id, session_id, code, name, grade_level_id, grade:grade_levels(code, department_id)",
      )
      .eq("institution_id", context.institutionId)
      .eq("session_id", scope.activeSession.id)
      .order("code", { ascending: true })
      .returns<
        {
          id: string;
          session_id: string;
          code: string;
          name: string;
          grade_level_id: string;
          grade:
            | { code: string; department_id: string }
            | { code: string; department_id: string }[]
            | null;
        }[]
      >(),
    supabase
      .from("student_daily_attendance")
      .select("attendance_date")
      .eq("institution_id", context.institutionId)
      .eq("session_id", scope.activeSession.id)
      .order("attendance_date", { ascending: false })
      .limit(30)
      .returns<{ attendance_date: string }[]>(),
  ]);

  if (sectionsRes.error) {
    throw new Error(`Failed to load sections: ${sectionsRes.error.message}`);
  }
  if (recentDatesRes.error) {
    throw new Error(
      `Failed to load recent attendance dates: ${recentDatesRes.error.message}`,
    );
  }

  const allSections: AttendanceSectionOptionDto[] = (sectionsRes.data ?? []).map(
    (s) => {
      const grade = unwrapJoin(s.grade);
      return {
        id: s.id,
        sessionId: s.session_id,
        departmentId: grade?.department_id ?? "",
        gradeCode: grade?.code ?? "",
        code: s.code,
        name: s.name,
      };
    },
  );

  // Prioritize sections the caller is directly assigned to when no explicit section is chosen
  const defaultSection =
    allSections.find(
      (s) =>
        scope.classTeacherSectionIds.has(s.id) ||
        scope.monitorSectionIds.has(s.id) ||
        scope.hodDepartmentIds.has(s.departmentId),
    ) ??
    allSections[0] ??
    null;

  const selectedSection =
    (options.sectionId
      ? allSections.find((s) => s.id === options.sectionId)
      : undefined) ?? defaultSection;

  const recentDates = [
    ...new Set((recentDatesRes.data ?? []).map((r) => r.attendance_date)),
  ].slice(0, 5);

  const capabilities = buildCapabilities(context, scope, selectedSection);

  if (!selectedSection) {
    return {
      context,
      policy,
      activeSession: scope.activeSession,
      selectedDate,
      recentDates,
      sections: allSections,
      selectedSection: null,
      sectionVerificationStatus: "unmarked",
      rows: [],
      recentEvents: [],
      capabilities,
    };
  }

  const [enrolmentsRes, dailyRes, sessionHistoryRes, eventsRes] =
    await Promise.all([
      supabase
        .from("student_session_enrolments")
        .select("id, student_profile_id, roll_number")
        .eq("institution_id", context.institutionId)
        .eq("session_id", scope.activeSession.id)
        .eq("section_id", selectedSection.id)
        .eq("status", "active")
        .order("roll_number", { ascending: true })
        .returns<
          { id: string; student_profile_id: string; roll_number: string | null }[]
        >(),
      supabase
        .from("student_daily_attendance")
        .select(
          "id, student_enrolment_id, student_profile_id, status, verification_status, marked_by_person_id, verified_by_person_id, signed_off_by_person_id, correction_count, last_correction_reason, remarks",
        )
        .eq("institution_id", context.institutionId)
        .eq("session_id", scope.activeSession.id)
        .eq("section_id", selectedSection.id)
        .eq("attendance_date", selectedDate)
        .returns<
          {
            id: string;
            student_enrolment_id: string;
            student_profile_id: string;
            status: StudentDailyAttendanceStatus;
            verification_status: StudentVerificationStatus;
            marked_by_person_id: string | null;
            verified_by_person_id: string | null;
            signed_off_by_person_id: string | null;
            correction_count: number;
            last_correction_reason: string | null;
            remarks: string | null;
          }[]
        >(),
      supabase
        .from("student_daily_attendance")
        .select("student_enrolment_id, status, verification_status")
        .eq("institution_id", context.institutionId)
        .eq("session_id", scope.activeSession.id)
        .eq("section_id", selectedSection.id)
        .returns<
          {
            student_enrolment_id: string;
            status: StudentDailyAttendanceStatus;
            verification_status: StudentVerificationStatus;
          }[]
        >(),
      capabilities.isMonitorReadOnly
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from("attendance_events")
            .select(
              "id, idempotency_key, subject_kind, student_profile_id, attendance_date, event_type, attendance_status, source, occurred_at, recorded_by_person_id, reason",
            )
            .eq("institution_id", context.institutionId)
            .eq("section_id", selectedSection.id)
            .eq("attendance_date", selectedDate)
            .order("occurred_at", { ascending: false })
            .limit(20)
            .returns<
              {
                id: string;
                idempotency_key: string;
                subject_kind: AttendanceSubjectKind;
                student_profile_id: string | null;
                attendance_date: string;
                event_type: AttendanceEventType;
                attendance_status: StudentDailyAttendanceStatus;
                source: AttendanceSource;
                occurred_at: string;
                recorded_by_person_id: string | null;
                reason: string | null;
              }[]
            >(),
    ]);

  if (enrolmentsRes.error) {
    throw new Error(
      `Failed to load section enrolments: ${enrolmentsRes.error.message}`,
    );
  }
  if (dailyRes.error) {
    throw new Error(
      `Failed to load student daily attendance: ${dailyRes.error.message}`,
    );
  }
  if (sessionHistoryRes.error) {
    throw new Error(
      `Failed to load session attendance history: ${sessionHistoryRes.error.message}`,
    );
  }
  if (eventsRes.error) {
    throw new Error(
      `Failed to load attendance events: ${eventsRes.error.message}`,
    );
  }

  const dailyByEnrolmentId = new Map<
    string,
    NonNullable<typeof dailyRes.data>[number]
  >();
  for (const row of dailyRes.data ?? []) {
    if (
      capabilities.isMonitorReadOnly &&
      row.verification_status !== "class_teacher_verified" &&
      row.verification_status !== "signed_off"
    ) {
      continue;
    }
    dailyByEnrolmentId.set(row.student_enrolment_id, row);
  }

  const studentIds = [
    ...new Set([
      ...(enrolmentsRes.data ?? []).map((e) => e.student_profile_id),
      ...(dailyRes.data ?? []).map((d) => d.student_profile_id),
      ...(eventsRes.data ?? [])
        .map((ev) => ev.student_profile_id)
        .filter((id): id is string => Boolean(id)),
    ]),
  ];

  let studentProfiles: {
    id: string;
    person_id: string;
    admission_number: string;
  }[] = [];

  if (studentIds.length > 0) {
    const spRes = await supabase
      .from("student_profiles")
      .select("id, person_id, admission_number")
      .eq("institution_id", context.institutionId)
      .in("id", studentIds)
      .returns<{ id: string; person_id: string; admission_number: string }[]>();

    if (spRes.error) {
      throw new Error(
        `Failed to resolve student profiles: ${spRes.error.message}`,
      );
    }
    studentProfiles = spRes.data ?? [];
  }

  const studentById = new Map(studentProfiles.map((sp) => [sp.id, sp]));

  const actorAndStudentPersonIds = [
    ...studentProfiles.map((sp) => sp.person_id),
    ...(dailyRes.data ?? []).flatMap((d) => [
      d.marked_by_person_id,
      d.verified_by_person_id,
      d.signed_off_by_person_id,
    ]),
    ...(eventsRes.data ?? []).map((ev) => ev.recorded_by_person_id),
  ];
  const personNameMap = await fetchPersonNameMap(
    supabase,
    actorAndStudentPersonIds,
  );

  const historyByEnrolmentId = new Map<string, StudentDailyAttendanceStatus[]>();
  for (const item of sessionHistoryRes.data ?? []) {
    if (
      capabilities.isMonitorReadOnly &&
      item.verification_status !== "class_teacher_verified" &&
      item.verification_status !== "signed_off"
    ) {
      continue;
    }
    const list = historyByEnrolmentId.get(item.student_enrolment_id) ?? [];
    list.push(item.status);
    historyByEnrolmentId.set(item.student_enrolment_id, list);
  }

  const enrolmentRows = enrolmentsRes.data ?? [];
  const allRows: StudentDailyRollRowDto[] = enrolmentRows.map((enr) => {
    const profile = studentById.get(enr.student_profile_id);
    const daily = dailyByEnrolmentId.get(enr.id);
    const fullName = profile
      ? (personNameMap.get(profile.person_id) ??
        `Student (${profile.admission_number})`)
      : `Student (${enr.student_profile_id.slice(0, 8)})`;

    const shortage = summarizeStudentDailyRecords(
      historyByEnrolmentId.get(enr.id) ?? [],
      {
        minimumAttendancePercent: policy.minimumAttendancePercent,
        warningThresholdPercent: policy.warningThresholdPercent,
      },
    );

    return {
      enrolmentId: enr.id,
      studentProfileId: enr.student_profile_id,
      admissionNumber: profile?.admission_number ?? "ADM",
      fullName,
      rollNumber: enr.roll_number,
      attendanceId: daily?.id ?? null,
      status: daily?.status ?? null,
      verificationStatus: daily?.verification_status ?? null,
      markedByName: daily?.marked_by_person_id
        ? (personNameMap.get(daily.marked_by_person_id) ?? null)
        : null,
      verifiedByName: daily?.verified_by_person_id
        ? (personNameMap.get(daily.verified_by_person_id) ?? null)
        : null,
      signedOffByName: daily?.signed_off_by_person_id
        ? (personNameMap.get(daily.signed_off_by_person_id) ?? null)
        : null,
      correctionCount: daily?.correction_count ?? 0,
      lastCorrectionReason: daily?.last_correction_reason ?? null,
      remarks: daily?.remarks ?? null,
      shortage,
    };
  });

  // Strict Monitor/Monitress boundary: surface ONLY verified/signed-off attendance rows.
  const rows = capabilities.isMonitorReadOnly
    ? allRows.filter(
        (r) =>
          r.verificationStatus === "class_teacher_verified" ||
          r.verificationStatus === "signed_off",
      )
    : allRows;

  const recentEvents: AttendanceEventDto[] = (eventsRes.data ?? []).map((ev) => {
    const profile = ev.student_profile_id
      ? studentById.get(ev.student_profile_id)
      : undefined;
    const subjectLabel = profile
      ? (personNameMap.get(profile.person_id) ?? profile.admission_number)
      : "Student";

    return {
      id: ev.id,
      idempotencyKey: ev.idempotency_key,
      subjectKind: ev.subject_kind,
      subjectLabel,
      sectionLabel: selectedSection.code,
      teachingGroupLabel: null,
      attendanceDate: ev.attendance_date,
      eventType: ev.event_type,
      attendanceStatus: ev.attendance_status,
      source: ev.source,
      occurredAt: ev.occurred_at,
      recordedByName: ev.recorded_by_person_id
        ? (personNameMap.get(ev.recorded_by_person_id) ?? null)
        : null,
      reason: ev.reason,
    };
  });

  return {
    context,
    policy,
    activeSession: scope.activeSession,
    selectedDate,
    recentDates,
    sections: allSections,
    selectedSection,
    sectionVerificationStatus: summarizeSectionVerification(rows),
    rows,
    recentEvents,
    capabilities,
  };
}

export async function recordStudentDailyRoll(
  slug: string,
  rawInput: unknown,
): Promise<AttendanceActionResult<{ savedCount: number }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status === "unconfigured") {
    return { ok: false, error: "Supabase is not configured.", status: 503 };
  }
  if (resolution.status === "unauthenticated") {
    return { ok: false, error: "Sign in required.", status: 401 };
  }
  if (resolution.status === "denied") {
    return { ok: false, error: "Institution access denied.", status: 403 };
  }

  const parsed = markStudentDailyRollSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid daily roll payload.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerAcademicScope(supabase, context, todayDate);

  if (!scope.activeSession) {
    return {
      ok: false,
      error: "No active academic session configured for this institution.",
      status: 400,
    };
  }

  const { data: sectionRow, error: sectionErr } = await supabase
    .from("sections")
    .select("id, session_id, grade:grade_levels(department_id)")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.sectionId)
    .maybeSingle<{
      id: string;
      session_id: string;
      grade: { department_id: string } | { department_id: string }[] | null;
    }>();

  if (sectionErr || !sectionRow) {
    return { ok: false, error: "Target section not found.", status: 404 };
  }

  const deptId = unwrapJoin(sectionRow.grade)?.department_id ?? "";
  const hasManage = evaluatePermission(context, {
    permission: "attendance.manage",
  }).allowed;
  const isSectionLead =
    scope.classTeacherSectionIds.has(sectionRow.id) ||
    scope.hodDepartmentIds.has(deptId);

  if (!hasManage && !isSectionLead) {
    return {
      ok: false,
      error: "You do not have permission to mark daily attendance for this section.",
      status: 403,
    };
  }

  const enrolmentIds = parsed.data.entries.map((e) => e.studentEnrolmentId);
  const { data: existingRows, error: existingErr } = await supabase
    .from("student_daily_attendance")
    .select("id, student_enrolment_id, status, remarks, verification_status")
    .eq("institution_id", context.institutionId)
    .eq("attendance_date", parsed.data.attendanceDate)
    .in("student_enrolment_id", enrolmentIds)
    .returns<
      {
        id: string;
        student_enrolment_id: string;
        status: StudentDailyAttendanceStatus;
        remarks: string | null;
        verification_status: StudentVerificationStatus;
      }[]
    >();

  if (existingErr) {
    return { ok: false, error: existingErr.message, status: 500 };
  }

  const existingByEnrolment = new Map(
    (existingRows ?? []).map((r) => [r.student_enrolment_id, r]),
  );

  for (const entry of parsed.data.entries) {
    const existing = existingByEnrolment.get(entry.studentEnrolmentId);
    if (existing && existing.verification_status === "signed_off") {
      const normalizedExistingRemarks = existing.remarks ?? undefined;
      if (
        existing.status !== entry.status ||
        normalizedExistingRemarks !== entry.remarks
      ) {
        return {
          ok: false,
          error:
            "Signed-off attendance rows cannot be modified directly. Submit a post-sign-off correction with a reason.",
          status: 409,
        };
      }
    }
  }

  const entriesToUpsert = parsed.data.entries.filter((entry) => {
    const existing = existingByEnrolment.get(entry.studentEnrolmentId);
    return !existing || existing.verification_status !== "signed_off";
  });

  if (entriesToUpsert.length === 0) {
    return { ok: true, data: { savedCount: 0 } };
  }

  const upsertRows = entriesToUpsert.map((entry) => {
    const existing = existingByEnrolment.get(entry.studentEnrolmentId);
    return {
      institution_id: context.institutionId,
      session_id: sectionRow.session_id,
      student_enrolment_id: entry.studentEnrolmentId,
      student_profile_id: entry.studentProfileId,
      section_id: sectionRow.id,
      attendance_date: parsed.data.attendanceDate,
      status: entry.status,
      verification_status: existing?.verification_status ?? "draft",
      marked_by_person_id: context.personId,
      remarks: entry.remarks ?? null,
    };
  });

  const { error: upsertErr } = await supabase
    .from("student_daily_attendance")
    .upsert(upsertRows, {
      onConflict: "institution_id,student_enrolment_id,attendance_date",
    });

  if (upsertErr) {
    return { ok: false, error: upsertErr.message, status: 400 };
  }

  const eventRows = entriesToUpsert.map((entry) => ({
    institution_id: context.institutionId,
    idempotency_key:
      entry.idempotencyKey ??
      buildAttendanceIdempotencyKey({
        institutionId: context.institutionId,
        scope: "day_roll",
        targetId: entry.studentProfileId,
        attendanceDate: parsed.data.attendanceDate,
        qualifier: entry.status,
      }),
    subject_kind: "student" as const,
    student_profile_id: entry.studentProfileId,
    staff_profile_id: null,
    session_id: sectionRow.session_id,
    section_id: sectionRow.id,
    teaching_group_id: null,
    attendance_date: parsed.data.attendanceDate,
    event_type: "day_roll" as const,
    attendance_status: entry.status,
    source: "manual" as const,
    recorded_by_person_id: context.personId,
    reason: entry.remarks ?? null,
  }));

  const { error: eventErr } = await supabase
    .from("attendance_events")
    .upsert(eventRows, {
      onConflict: "institution_id,idempotency_key",
      ignoreDuplicates: true,
    });

  if (eventErr) {
    return { ok: false, error: eventErr.message, status: 400 };
  }

  return { ok: true, data: { savedCount: entriesToUpsert.length } };
}

export async function verifySectionDailyAttendance(
  slug: string,
  rawInput: unknown,
): Promise<AttendanceActionResult<{ verifiedCount: number }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = verifySectionAttendanceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid verification input.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerAcademicScope(supabase, context, todayDate);

  const { data: sectionRow, error: secErr } = await supabase
    .from("sections")
    .select("id, grade:grade_levels(department_id)")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.sectionId)
    .maybeSingle<{
      id: string;
      grade: { department_id: string } | { department_id: string }[] | null;
    }>();

  if (secErr || !sectionRow) {
    return { ok: false, error: "Section not found.", status: 404 };
  }

  const deptId = unwrapJoin(sectionRow.grade)?.department_id ?? "";
  const hasManage = evaluatePermission(context, {
    permission: "attendance.manage",
  }).allowed;
  const isSectionLead =
    scope.classTeacherSectionIds.has(sectionRow.id) ||
    scope.hodDepartmentIds.has(deptId);

  if (!hasManage && !isSectionLead) {
    return {
      ok: false,
      error: "Only the assigned Class Teacher, HOD, or Attendance Manager may verify section attendance.",
      status: 403,
    };
  }

  const { data: draftRows, error: fetchErr } = await supabase
    .from("student_daily_attendance")
    .select("id, verification_status")
    .eq("institution_id", context.institutionId)
    .eq("section_id", parsed.data.sectionId)
    .eq("attendance_date", parsed.data.attendanceDate)
    .returns<{ id: string; verification_status: StudentVerificationStatus }[]>();

  if (fetchErr) {
    return { ok: false, error: fetchErr.message, status: 500 };
  }

  const targetIds = (draftRows ?? [])
    .filter((row) =>
      canTransitionStudentVerification(
        row.verification_status,
        "class_teacher_verified",
      ),
    )
    .map((row) => row.id);

  if (targetIds.length === 0) {
    return {
      ok: false,
      error: "No draft daily attendance rows found to verify for this section and date.",
      status: 400,
    };
  }

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("student_daily_attendance")
    .update({
      verification_status: "class_teacher_verified",
      verified_by_person_id: context.personId,
      verified_at: nowIso,
    })
    .eq("institution_id", context.institutionId)
    .in("id", targetIds);

  if (updateErr) {
    return { ok: false, error: updateErr.message, status: 400 };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "attendance.section_verified",
    entityType: "sections",
    entityId: parsed.data.sectionId,
    afterState: {
      attendanceDate: parsed.data.attendanceDate,
      verifiedCount: targetIds.length,
    },
  });

  return { ok: true, data: { verifiedCount: targetIds.length } };
}

export async function signOffSectionDailyAttendance(
  slug: string,
  rawInput: unknown,
): Promise<AttendanceActionResult<{ signedOffCount: number }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const { context } = resolution;
  if (
    !evaluatePermission(context, { permission: "attendance.manage" }).allowed
  ) {
    return {
      ok: false,
      error: "Authorized institutional attendance management permission is required to sign off attendance.",
      status: 403,
    };
  }

  const parsed = signOffSectionAttendanceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid sign-off input.",
      status: 400,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: currentRows, error: fetchErr } = await supabase
    .from("student_daily_attendance")
    .select("id, verification_status, verified_by_person_id, verified_at")
    .eq("institution_id", context.institutionId)
    .eq("section_id", parsed.data.sectionId)
    .eq("attendance_date", parsed.data.attendanceDate)
    .returns<
      {
        id: string;
        verification_status: StudentVerificationStatus;
        verified_by_person_id: string | null;
        verified_at: string | null;
      }[]
    >();

  if (fetchErr) {
    return { ok: false, error: fetchErr.message, status: 500 };
  }

  const draftIds: string[] = [];
  const verifiedIds: string[] = [];

  for (const row of currentRows ?? []) {
    if (
      canTransitionStudentVerification(row.verification_status, "signed_off", {
        allowPrincipalOverride: true,
      })
    ) {
      if (row.verification_status === "draft") {
        draftIds.push(row.id);
      } else {
        verifiedIds.push(row.id);
      }
    }
  }

  const totalCount = draftIds.length + verifiedIds.length;
  if (totalCount === 0) {
    return {
      ok: false,
      error: "No draft or verified attendance rows found to sign off for this section and date.",
      status: 400,
    };
  }

  const nowIso = new Date().toISOString();

  if (verifiedIds.length > 0) {
    const { error: err1 } = await supabase
      .from("student_daily_attendance")
      .update({
        verification_status: "signed_off",
        signed_off_by_person_id: context.personId,
        signed_off_at: nowIso,
      })
      .eq("institution_id", context.institutionId)
      .in("id", verifiedIds);

    if (err1) {
      return { ok: false, error: err1.message, status: 400 };
    }
  }

  if (draftIds.length > 0) {
    const { error: err2 } = await supabase
      .from("student_daily_attendance")
      .update({
        verification_status: "signed_off",
        verified_by_person_id: context.personId,
        verified_at: nowIso,
        signed_off_by_person_id: context.personId,
        signed_off_at: nowIso,
      })
      .eq("institution_id", context.institutionId)
      .in("id", draftIds);

    if (err2) {
      return { ok: false, error: err2.message, status: 400 };
    }
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "attendance.section_signed_off",
    entityType: "sections",
    entityId: parsed.data.sectionId,
    afterState: {
      attendanceDate: parsed.data.attendanceDate,
      signedOffCount: totalCount,
      principalDraftOverrides: draftIds.length,
    },
  });

  return { ok: true, data: { signedOffCount: totalCount } };
}

export async function correctSignedOffStudentAttendance(
  slug: string,
  rawInput: unknown,
): Promise<AttendanceActionResult<{ attendanceId: string; correctionCount: number }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const { context } = resolution;
  if (
    !evaluatePermission(context, { permission: "attendance.manage" }).allowed
  ) {
    return {
      ok: false,
      error: "Authorized institutional attendance management permission is required for post-sign-off corrections.",
      status: 403,
    };
  }

  const parsed = correctStudentAttendanceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid correction payload.",
      status: 400,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("student_daily_attendance")
    .select(
      "id, institution_id, session_id, student_profile_id, section_id, attendance_date, status, verification_status, correction_count, remarks",
    )
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.attendanceId)
    .maybeSingle<{
      id: string;
      institution_id: string;
      session_id: string;
      student_profile_id: string;
      section_id: string;
      attendance_date: string;
      status: StudentDailyAttendanceStatus;
      verification_status: StudentVerificationStatus;
      correction_count: number;
      remarks: string | null;
    }>();

  if (fetchErr || !existing) {
    return { ok: false, error: "Attendance record not found.", status: 404 };
  }

  if (existing.verification_status !== "signed_off") {
    return {
      ok: false,
      error: "Post-sign-off correction workflow applies strictly to signed_off records.",
      status: 400,
    };
  }

  const nextCorrectionCount = existing.correction_count + 1;

  const { error: updateErr } = await supabase
    .from("student_daily_attendance")
    .update({
      status: parsed.data.newStatus,
      correction_count: nextCorrectionCount,
      last_correction_reason: parsed.data.correctionReason,
      remarks: parsed.data.remarks ?? existing.remarks,
    })
    .eq("institution_id", context.institutionId)
    .eq("id", existing.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message, status: 400 };
  }

  const { error: eventErr } = await supabase.from("attendance_events").upsert(
    {
      institution_id: context.institutionId,
      idempotency_key:
        parsed.data.idempotencyKey ??
        buildAttendanceIdempotencyKey({
          institutionId: context.institutionId,
          scope: "student_correction",
          targetId: existing.id,
          attendanceDate: existing.attendance_date,
          qualifier: `v${nextCorrectionCount}-${parsed.data.newStatus}`,
        }),
      subject_kind: "student",
      student_profile_id: existing.student_profile_id,
      staff_profile_id: null,
      session_id: existing.session_id,
      section_id: existing.section_id,
      teaching_group_id: null,
      attendance_date: existing.attendance_date,
      event_type: "correction",
      attendance_status: parsed.data.newStatus,
      source: "manual",
      recorded_by_person_id: context.personId,
      reason: parsed.data.correctionReason,
    },
    {
      onConflict: "institution_id,idempotency_key",
      ignoreDuplicates: true,
    },
  );

  if (eventErr) {
    return { ok: false, error: eventErr.message, status: 400 };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "attendance.student_corrected",
    entityType: "student_daily_attendance",
    entityId: existing.id,
    reason: parsed.data.correctionReason,
    beforeState: {
      status: existing.status,
      correctionCount: existing.correction_count,
    },
    afterState: {
      status: parsed.data.newStatus,
      correctionCount: nextCorrectionCount,
    },
  });

  return {
    ok: true,
    data: { attendanceId: existing.id, correctionCount: nextCorrectionCount },
  };
}

export async function getPeriodAttendanceView(
  context: VerifiedTenantContext,
  options: { date?: string; teachingGroupId?: string; periodCode?: string } = {},
): Promise<PeriodAttendanceViewDto> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const selectedDate = normalizeSelectedDate(
    options.date,
    context.institutionTimezone,
  );
  const selectedPeriodCode =
    options.periodCode && /^[A-Za-z0-9_.-]{1,20}$/.test(options.periodCode.trim())
      ? options.periodCode.trim()
      : "P1";

  const [policy, scope] = await Promise.all([
    loadAttendancePolicy(supabase, context.institutionId),
    loadCallerAcademicScope(supabase, context, todayDate),
  ]);

  const capabilities = buildCapabilities(context, scope, null);
  if (!capabilities.canAccessPeriodRoll) {
    return {
      context,
      allowed: false,
      policy,
      activeSession: scope.activeSession,
      selectedDate,
      selectedPeriodCode,
      teachingGroups: [],
      selectedGroup: null,
      members: [],
      canMarkSelectedGroup: false,
      capabilities,
    };
  }

  if (!scope.activeSession) {
    return {
      context,
      allowed: true,
      policy,
      activeSession: null,
      selectedDate,
      selectedPeriodCode,
      teachingGroups: [],
      selectedGroup: null,
      members: [],
      canMarkSelectedGroup: false,
      capabilities,
    };
  }

  const { data: tgRows, error: tgErr } = await supabase
    .from("teaching_groups")
    .select(
      "id, code, name, is_cross_section, offering:subject_offerings(subject:subjects(name))",
    )
    .eq("institution_id", context.institutionId)
    .eq("session_id", scope.activeSession.id)
    .order("code", { ascending: true })
    .returns<
      {
        id: string;
        code: string;
        name: string;
        is_cross_section: boolean;
        offering:
          | { subject: { name: string } | { name: string }[] | null }
          | { subject: { name: string } | { name: string }[] | null }[]
          | null;
      }[]
    >();

  if (tgErr) {
    throw new Error(`Failed to load teaching groups: ${tgErr.message}`);
  }

  const hasManage = evaluatePermission(context, {
    permission: "attendance.manage",
  }).allowed;

  const teachingGroups = (tgRows ?? [])
    .filter(
      (tg) =>
        hasManage ||
        scope.hodDepartmentIds.size > 0 ||
        scope.classTeacherSectionIds.size > 0 ||
        scope.subjectTeacherGroupIds.has(tg.id),
    )
    .map((tg) => {
      const offering = unwrapJoin(tg.offering);
      const subject = unwrapJoin(offering?.subject);
      return {
        id: tg.id,
        code: tg.code,
        name: tg.name,
        subjectName: subject?.name ?? "Subject",
        isCrossSection: tg.is_cross_section,
      };
    });

  const selectedGroup =
    (options.teachingGroupId
      ? teachingGroups.find((g) => g.id === options.teachingGroupId)
      : undefined) ??
    teachingGroups.find((g) => scope.subjectTeacherGroupIds.has(g.id)) ??
    teachingGroups[0] ??
    null;

  if (!selectedGroup) {
    return {
      context,
      allowed: true,
      policy,
      activeSession: scope.activeSession,
      selectedDate,
      selectedPeriodCode,
      teachingGroups,
      selectedGroup: null,
      members: [],
      canMarkSelectedGroup: false,
      capabilities,
    };
  }

  const [membershipsRes, periodRowsRes] = await Promise.all([
    supabase
      .from("teaching_group_memberships")
      .select(
        "id, student_enrolment_id, enrolment:student_session_enrolments(id, student_profile_id, roll_number, section:sections(code))",
      )
      .eq("institution_id", context.institutionId)
      .eq("teaching_group_id", selectedGroup.id)
      .eq("status", "active")
      .returns<
        {
          id: string;
          student_enrolment_id: string;
          enrolment:
            | {
                id: string;
                student_profile_id: string;
                roll_number: string | null;
                section: { code: string } | { code: string }[] | null;
              }
            | {
                id: string;
                student_profile_id: string;
                roll_number: string | null;
                section: { code: string } | { code: string }[] | null;
              }[]
            | null;
        }[]
      >(),
    supabase
      .from("student_period_attendance")
      .select(
        "id, student_enrolment_id, status, marked_by_person_id, remarks",
      )
      .eq("institution_id", context.institutionId)
      .eq("teaching_group_id", selectedGroup.id)
      .eq("attendance_date", selectedDate)
      .eq("period_code", selectedPeriodCode)
      .returns<
        {
          id: string;
          student_enrolment_id: string;
          status: StudentPeriodAttendanceStatus;
          marked_by_person_id: string | null;
          remarks: string | null;
        }[]
      >(),
  ]);

  if (membershipsRes.error) {
    throw new Error(
      `Failed to load teaching group members: ${membershipsRes.error.message}`,
    );
  }
  if (periodRowsRes.error) {
    throw new Error(
      `Failed to load period attendance: ${periodRowsRes.error.message}`,
    );
  }

  const parsedMemberships = (membershipsRes.data ?? []).flatMap((m) => {
    const enr = unwrapJoin(m.enrolment);
    if (!enr) return [];
    const sec = unwrapJoin(enr.section);
    return [
      {
        enrolmentId: enr.id,
        studentProfileId: enr.student_profile_id,
        rollNumber: enr.roll_number,
        sectionCode: sec?.code ?? "SEC",
      },
    ];
  });

  const spIds = [...new Set(parsedMemberships.map((m) => m.studentProfileId))];
  let spRows: { id: string; person_id: string; admission_number: string }[] = [];
  if (spIds.length > 0) {
    const spRes = await supabase
      .from("student_profiles")
      .select("id, person_id, admission_number")
      .eq("institution_id", context.institutionId)
      .in("id", spIds)
      .returns<{ id: string; person_id: string; admission_number: string }[]>();
    if (spRes.error) {
      throw new Error(`Failed to load student profiles: ${spRes.error.message}`);
    }
    spRows = spRes.data ?? [];
  }

  const spById = new Map(spRows.map((sp) => [sp.id, sp]));
  const personNameMap = await fetchPersonNameMap(supabase, [
    ...spRows.map((sp) => sp.person_id),
    ...(periodRowsRes.data ?? []).map((p) => p.marked_by_person_id),
  ]);
  const periodByEnrolment = new Map(
    (periodRowsRes.data ?? []).map((p) => [p.student_enrolment_id, p]),
  );

  const members: PeriodAttendanceMemberRowDto[] = parsedMemberships
    .map((m) => {
      const sp = spById.get(m.studentProfileId);
      const existing = periodByEnrolment.get(m.enrolmentId);
      return {
        enrolmentId: m.enrolmentId,
        studentProfileId: m.studentProfileId,
        admissionNumber: sp?.admission_number ?? "ADM",
        fullName: sp
          ? (personNameMap.get(sp.person_id) ?? `Student (${sp.admission_number})`)
          : `Student (${m.studentProfileId.slice(0, 8)})`,
        rollNumber: m.rollNumber,
        sectionCode: m.sectionCode,
        attendanceId: existing?.id ?? null,
        status: existing?.status ?? null,
        markedByName: existing?.marked_by_person_id
          ? (personNameMap.get(existing.marked_by_person_id) ?? null)
          : null,
        remarks: existing?.remarks ?? null,
      };
    })
    .sort((a, b) =>
      `${a.sectionCode}-${a.rollNumber ?? ""}-${a.fullName}`.localeCompare(
        `${b.sectionCode}-${b.rollNumber ?? ""}-${b.fullName}`,
      ),
    );

  const canMarkSelectedGroup =
    hasManage ||
    scope.subjectTeacherGroupIds.has(selectedGroup.id) ||
    scope.hodDepartmentIds.size > 0 ||
    scope.classTeacherSectionIds.size > 0;

  return {
    context,
    allowed: true,
    policy,
    activeSession: scope.activeSession,
    selectedDate,
    selectedPeriodCode,
    teachingGroups,
    selectedGroup,
    members,
    canMarkSelectedGroup,
    capabilities,
  };
}

export async function recordPeriodAttendance(
  slug: string,
  rawInput: unknown,
): Promise<AttendanceActionResult<{ savedCount: number }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = markPeriodAttendanceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid period roll payload.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerAcademicScope(supabase, context, todayDate);

  const { data: tgRow, error: tgErr } = await supabase
    .from("teaching_groups")
    .select("id, session_id")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.teachingGroupId)
    .maybeSingle<{ id: string; session_id: string }>();

  if (tgErr || !tgRow) {
    return { ok: false, error: "Teaching group not found.", status: 404 };
  }

  const hasManage = evaluatePermission(context, {
    permission: "attendance.manage",
  }).allowed;
  const canTeach =
    scope.subjectTeacherGroupIds.has(tgRow.id) ||
    scope.hodDepartmentIds.size > 0 ||
    scope.classTeacherSectionIds.size > 0;

  if (!hasManage && !canTeach) {
    return {
      ok: false,
      error: "You are not authorized to record period attendance for this teaching group.",
      status: 403,
    };
  }

  const upsertRows = parsed.data.entries.map((entry) => ({
    institution_id: context.institutionId,
    session_id: tgRow.session_id,
    student_enrolment_id: entry.studentEnrolmentId,
    student_profile_id: entry.studentProfileId,
    teaching_group_id: tgRow.id,
    attendance_date: parsed.data.attendanceDate,
    period_code: parsed.data.periodCode,
    status: entry.status,
    marked_by_person_id: context.personId,
    remarks: entry.remarks ?? null,
  }));

  const { error: upsertErr } = await supabase
    .from("student_period_attendance")
    .upsert(upsertRows, {
      onConflict:
        "institution_id,student_enrolment_id,teaching_group_id,attendance_date,period_code",
    });

  if (upsertErr) {
    return { ok: false, error: upsertErr.message, status: 400 };
  }

  const eventRows = parsed.data.entries.map((entry) => ({
    institution_id: context.institutionId,
    idempotency_key:
      entry.idempotencyKey ??
      buildAttendanceIdempotencyKey({
        institutionId: context.institutionId,
        scope: "period_roll",
        targetId: `${tgRow.id}-${entry.studentProfileId}`,
        attendanceDate: parsed.data.attendanceDate,
        qualifier: `${parsed.data.periodCode}-${entry.status}`,
      }),
    subject_kind: "student" as const,
    student_profile_id: entry.studentProfileId,
    staff_profile_id: null,
    session_id: tgRow.session_id,
    section_id: null,
    teaching_group_id: tgRow.id,
    attendance_date: parsed.data.attendanceDate,
    event_type: "period_roll" as const,
    attendance_status: entry.status,
    source: "manual" as const,
    recorded_by_person_id: context.personId,
    reason: entry.remarks ?? `Period ${parsed.data.periodCode}`,
  }));

  const { error: eventErr } = await supabase
    .from("attendance_events")
    .upsert(eventRows, {
      onConflict: "institution_id,idempotency_key",
      ignoreDuplicates: true,
    });

  if (eventErr) {
    return { ok: false, error: eventErr.message, status: 400 };
  }

  return { ok: true, data: { savedCount: parsed.data.entries.length } };
}

export async function getStaffAttendanceView(
  context: VerifiedTenantContext,
  rawDate?: string,
): Promise<StaffAttendanceViewDto> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const selectedDate = normalizeSelectedDate(
    rawDate,
    context.institutionTimezone,
  );
  const scope = await loadCallerAcademicScope(supabase, context, todayDate);
  const capabilities = buildCapabilities(context, scope, null);

  if (!capabilities.canAccessStaffAttendance) {
    return {
      context,
      allowed: false,
      selectedDate,
      rows: [],
      capabilities,
    };
  }

  const [staffRes, dailyRes] = await Promise.all([
    supabase
      .from("staff_profiles")
      .select("id, person_id, employee_code, designation, lifecycle_status")
      .eq("institution_id", context.institutionId)
      .eq("lifecycle_status", "active")
      .order("employee_code", { ascending: true })
      .returns<
        {
          id: string;
          person_id: string;
          employee_code: string;
          designation: string | null;
          lifecycle_status: string;
        }[]
      >(),
    supabase
      .from("staff_daily_attendance")
      .select(
        "id, staff_profile_id, attendance_date, status, check_in_at, check_out_at, verification_status, marked_by_person_id, signed_off_by_person_id, correction_count, last_correction_reason, remarks",
      )
      .eq("institution_id", context.institutionId)
      .eq("attendance_date", selectedDate)
      .returns<
        {
          id: string;
          staff_profile_id: string;
          attendance_date: string;
          status: StaffAttendanceStatus;
          check_in_at: string | null;
          check_out_at: string | null;
          verification_status: StaffVerificationStatus;
          marked_by_person_id: string | null;
          signed_off_by_person_id: string | null;
          correction_count: number;
          last_correction_reason: string | null;
          remarks: string | null;
        }[]
      >(),
  ]);

  if (staffRes.error) {
    throw new Error(`Failed to load staff profiles: ${staffRes.error.message}`);
  }
  if (dailyRes.error) {
    throw new Error(
      `Failed to load staff daily attendance: ${dailyRes.error.message}`,
    );
  }

  const visibleStaff =
    capabilities.canManageStaffAttendance ||
    evaluatePermission(context, { permission: "people.read" }).allowed
      ? (staffRes.data ?? [])
      : (staffRes.data ?? []).filter((st) => st.person_id === context.personId);

  const personNameMap = await fetchPersonNameMap(supabase, [
    ...visibleStaff.map((st) => st.person_id),
    ...(dailyRes.data ?? []).flatMap((d) => [
      d.marked_by_person_id,
      d.signed_off_by_person_id,
    ]),
  ]);

  const dailyByStaffId = new Map(
    (dailyRes.data ?? []).map((d) => [d.staff_profile_id, d]),
  );

  const rows: StaffAttendanceRowDto[] = visibleStaff.map((st) => {
    const d = dailyByStaffId.get(st.id);
    return {
      staffProfileId: st.id,
      employeeCode: st.employee_code,
      designation: st.designation,
      fullName:
        personNameMap.get(st.person_id) ?? `Staff (${st.employee_code})`,
      attendanceId: d?.id ?? null,
      status: d?.status ?? null,
      checkInAt: d?.check_in_at ?? null,
      checkOutAt: d?.check_out_at ?? null,
      verificationStatus: d?.verification_status ?? null,
      markedByName: d?.marked_by_person_id
        ? (personNameMap.get(d.marked_by_person_id) ?? null)
        : null,
      signedOffByName: d?.signed_off_by_person_id
        ? (personNameMap.get(d.signed_off_by_person_id) ?? null)
        : null,
      correctionCount: d?.correction_count ?? 0,
      lastCorrectionReason: d?.last_correction_reason ?? null,
      remarks: d?.remarks ?? null,
    };
  });

  return {
    context,
    allowed: true,
    selectedDate,
    rows,
    capabilities,
  };
}

export async function recordStaffDailyAttendance(
  slug: string,
  rawInput: unknown,
): Promise<AttendanceActionResult<{ attendanceDate: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const { context } = resolution;
  const canManage =
    evaluatePermission(context, { permission: "attendance.manage" }).allowed ||
    evaluatePermission(context, { permission: "people.manage" }).allowed;

  if (!canManage) {
    return {
      ok: false,
      error: "Only authorized attendance or HR administrators can record staff attendance.",
      status: 403,
    };
  }

  const parsed = recordStaffAttendanceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid staff attendance payload.",
      status: 400,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("staff_daily_attendance")
    .select("id, verification_status")
    .eq("institution_id", context.institutionId)
    .eq("staff_profile_id", parsed.data.staffProfileId)
    .eq("attendance_date", parsed.data.attendanceDate)
    .maybeSingle<{ id: string; verification_status: StaffVerificationStatus }>();

  if (fetchErr) {
    return { ok: false, error: fetchErr.message, status: 500 };
  }

  if (existing && existing.verification_status === "signed_off") {
    return {
      ok: false,
      error:
        "Signed-off staff attendance records cannot be overwritten directly. Submit an audited correction with a reason.",
      status: 409,
    };
  }

  const { error: upsertErr } = await supabase
    .from("staff_daily_attendance")
    .upsert(
      {
        institution_id: context.institutionId,
        staff_profile_id: parsed.data.staffProfileId,
        attendance_date: parsed.data.attendanceDate,
        status: parsed.data.status,
        check_in_at: parsed.data.checkInAt ?? null,
        check_out_at: parsed.data.checkOutAt ?? null,
        verification_status: existing?.verification_status ?? "draft",
        marked_by_person_id: context.personId,
        remarks: parsed.data.remarks ?? null,
      },
      {
        onConflict: "institution_id,staff_profile_id,attendance_date",
      },
    );

  if (upsertErr) {
    return { ok: false, error: upsertErr.message, status: 400 };
  }

  const mappedStatus = mapStaffStatusToEventStatus(parsed.data.status);
  const eventsToInsert: Record<string, unknown>[] = [
    {
      institution_id: context.institutionId,
      idempotency_key:
        parsed.data.idempotencyKey ??
        buildAttendanceIdempotencyKey({
          institutionId: context.institutionId,
          scope: "staff_check_in",
          targetId: parsed.data.staffProfileId,
          attendanceDate: parsed.data.attendanceDate,
          qualifier: parsed.data.status,
        }),
      subject_kind: "staff",
      student_profile_id: null,
      staff_profile_id: parsed.data.staffProfileId,
      session_id: null,
      section_id: null,
      teaching_group_id: null,
      attendance_date: parsed.data.attendanceDate,
      event_type: "staff_check_in",
      attendance_status: mappedStatus,
      source: "manual",
      occurred_at: parsed.data.checkInAt ?? new Date().toISOString(),
      recorded_by_person_id: context.personId,
      reason: parsed.data.remarks ?? null,
    },
  ];

  if (parsed.data.checkOutAt) {
    eventsToInsert.push({
      institution_id: context.institutionId,
      idempotency_key: buildAttendanceIdempotencyKey({
        institutionId: context.institutionId,
        scope: "staff_check_out",
        targetId: parsed.data.staffProfileId,
        attendanceDate: parsed.data.attendanceDate,
        qualifier: parsed.data.checkOutAt,
      }),
      subject_kind: "staff",
      student_profile_id: null,
      staff_profile_id: parsed.data.staffProfileId,
      session_id: null,
      section_id: null,
      teaching_group_id: null,
      attendance_date: parsed.data.attendanceDate,
      event_type: "staff_check_out",
      attendance_status: mappedStatus,
      source: "manual",
      occurred_at: parsed.data.checkOutAt,
      recorded_by_person_id: context.personId,
      reason: parsed.data.remarks ?? null,
    });
  }

  const { error: eventErr } = await supabase
    .from("attendance_events")
    .upsert(eventsToInsert, {
      onConflict: "institution_id,idempotency_key",
      ignoreDuplicates: true,
    });

  if (eventErr) {
    return { ok: false, error: eventErr.message, status: 400 };
  }

  return { ok: true, data: { attendanceDate: parsed.data.attendanceDate } };
}

export async function verifyOrSignOffStaffAttendance(
  slug: string,
  rawInput: unknown,
): Promise<AttendanceActionResult<{ status: StaffVerificationStatus }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = verifyOrSignOffStaffAttendanceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid staff verification input.",
      status: 400,
    };
  }

  const { context } = resolution;
  const hasAttendanceManage = evaluatePermission(context, {
    permission: "attendance.manage",
  }).allowed;
  const hasPeopleManage = evaluatePermission(context, {
    permission: "people.manage",
  }).allowed;

  if (
    parsed.data.targetStatus === "signed_off"
      ? !hasAttendanceManage
      : !hasAttendanceManage && !hasPeopleManage
  ) {
    return {
      ok: false,
      error: "You do not hold permission to perform this staff attendance state transition.",
      status: 403,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("staff_daily_attendance")
    .select("id, verification_status")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.attendanceId)
    .maybeSingle<{ id: string; verification_status: StaffVerificationStatus }>();

  if (fetchErr || !existing) {
    return { ok: false, error: "Staff attendance row not found.", status: 404 };
  }

  if (
    !canTransitionStaffVerification(
      existing.verification_status,
      parsed.data.targetStatus,
      { allowPrincipalOverride: hasAttendanceManage },
    )
  ) {
    return {
      ok: false,
      error: `Cannot transition staff attendance from ${existing.verification_status} to ${parsed.data.targetStatus}.`,
      status: 400,
    };
  }

  const updatePayload =
    parsed.data.targetStatus === "signed_off"
      ? {
          verification_status: "signed_off",
          signed_off_by_person_id: context.personId,
          signed_off_at: new Date().toISOString(),
        }
      : { verification_status: "verified" };

  const { error: updateErr } = await supabase
    .from("staff_daily_attendance")
    .update(updatePayload)
    .eq("institution_id", context.institutionId)
    .eq("id", existing.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message, status: 400 };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: `attendance.staff_${parsed.data.targetStatus}`,
    entityType: "staff_daily_attendance",
    entityId: existing.id,
    beforeState: { verificationStatus: existing.verification_status },
    afterState: { verificationStatus: parsed.data.targetStatus },
  });

  return { ok: true, data: { status: parsed.data.targetStatus } };
}

export async function correctSignedOffStaffAttendance(
  slug: string,
  rawInput: unknown,
): Promise<AttendanceActionResult<{ attendanceId: string; correctionCount: number }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const { context } = resolution;
  if (
    !evaluatePermission(context, { permission: "attendance.manage" }).allowed
  ) {
    return {
      ok: false,
      error: "Authorized institutional attendance management permission is required to correct signed-off staff attendance.",
      status: 403,
    };
  }

  const parsed = correctStaffAttendanceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid staff correction input.",
      status: 400,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("staff_daily_attendance")
    .select(
      "id, staff_profile_id, attendance_date, status, verification_status, correction_count, remarks",
    )
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.attendanceId)
    .maybeSingle<{
      id: string;
      staff_profile_id: string;
      attendance_date: string;
      status: StaffAttendanceStatus;
      verification_status: StaffVerificationStatus;
      correction_count: number;
      remarks: string | null;
    }>();

  if (fetchErr || !existing) {
    return { ok: false, error: "Staff attendance row not found.", status: 404 };
  }

  if (existing.verification_status !== "signed_off") {
    return {
      ok: false,
      error: "Post-sign-off corrections require a signed_off staff attendance record.",
      status: 400,
    };
  }

  const nextCorrectionCount = existing.correction_count + 1;

  const { error: updateErr } = await supabase
    .from("staff_daily_attendance")
    .update({
      status: parsed.data.newStatus,
      correction_count: nextCorrectionCount,
      last_correction_reason: parsed.data.correctionReason,
      remarks: parsed.data.remarks ?? existing.remarks,
    })
    .eq("institution_id", context.institutionId)
    .eq("id", existing.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message, status: 400 };
  }

  const { error: eventErr } = await supabase.from("attendance_events").upsert(
    {
      institution_id: context.institutionId,
      idempotency_key:
        parsed.data.idempotencyKey ??
        buildAttendanceIdempotencyKey({
          institutionId: context.institutionId,
          scope: "staff_correction",
          targetId: existing.id,
          attendanceDate: existing.attendance_date,
          qualifier: `v${nextCorrectionCount}-${parsed.data.newStatus}`,
        }),
      subject_kind: "staff",
      student_profile_id: null,
      staff_profile_id: existing.staff_profile_id,
      session_id: null,
      section_id: null,
      teaching_group_id: null,
      attendance_date: existing.attendance_date,
      event_type: "correction",
      attendance_status: mapStaffStatusToEventStatus(parsed.data.newStatus),
      source: "manual",
      recorded_by_person_id: context.personId,
      reason: parsed.data.correctionReason,
    },
    {
      onConflict: "institution_id,idempotency_key",
      ignoreDuplicates: true,
    },
  );

  if (eventErr) {
    return { ok: false, error: eventErr.message, status: 400 };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "attendance.staff_corrected",
    entityType: "staff_daily_attendance",
    entityId: existing.id,
    reason: parsed.data.correctionReason,
    beforeState: {
      status: existing.status,
      correctionCount: existing.correction_count,
    },
    afterState: {
      status: parsed.data.newStatus,
      correctionCount: nextCorrectionCount,
    },
  });

  return {
    ok: true,
    data: { attendanceId: existing.id, correctionCount: nextCorrectionCount },
  };
}

export async function getAttendanceLedgerAndPolicy(
  context: VerifiedTenantContext,
  options: { date?: string; subjectKind?: string } = {},
): Promise<AttendanceLedgerAndPolicyViewDto> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const selectedDate =
    options.date && isoDateSchema.safeParse(options.date).success
      ? options.date.trim()
      : "";
  const selectedSubjectKind: "all" | AttendanceSubjectKind =
    options.subjectKind === "student" || options.subjectKind === "staff"
      ? options.subjectKind
      : "all";

  const [policy, scope] = await Promise.all([
    loadAttendancePolicy(supabase, context.institutionId),
    loadCallerAcademicScope(supabase, context, todayDate),
  ]);

  const capabilities = buildCapabilities(context, scope, null);
  if (!capabilities.canViewLedger) {
    return {
      context,
      allowed: false,
      policy,
      selectedDate,
      selectedSubjectKind,
      events: [],
      capabilities,
    };
  }

  let query = supabase
    .from("attendance_events")
    .select(
      "id, idempotency_key, subject_kind, student_profile_id, staff_profile_id, section_id, teaching_group_id, attendance_date, event_type, attendance_status, source, occurred_at, recorded_by_person_id, reason",
    )
    .eq("institution_id", context.institutionId)
    .order("occurred_at", { ascending: false })
    .limit(60);

  if (selectedDate) {
    query = query.eq("attendance_date", selectedDate);
  }
  if (selectedSubjectKind !== "all") {
    query = query.eq("subject_kind", selectedSubjectKind);
  }

  const { data: eventRows, error: eventErr } = await query.returns<
    {
      id: string;
      idempotency_key: string;
      subject_kind: AttendanceSubjectKind;
      student_profile_id: string | null;
      staff_profile_id: string | null;
      section_id: string | null;
      teaching_group_id: string | null;
      attendance_date: string;
      event_type: AttendanceEventType;
      attendance_status: StudentDailyAttendanceStatus;
      source: AttendanceSource;
      occurred_at: string;
      recorded_by_person_id: string | null;
      reason: string | null;
    }[]
  >();

  if (eventErr) {
    throw new Error(`Failed to load attendance ledger: ${eventErr.message}`);
  }

  const rows = eventRows ?? [];
  const studentIds = [
    ...new Set(
      rows
        .map((r) => r.student_profile_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const staffIds = [
    ...new Set(
      rows
        .map((r) => r.staff_profile_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const sectionIds = [
    ...new Set(
      rows.map((r) => r.section_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  const tgIds = [
    ...new Set(
      rows
        .map((r) => r.teaching_group_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [spRes, stRes, secRes, tgRes] = await Promise.all([
    studentIds.length > 0
      ? supabase
          .from("student_profiles")
          .select("id, person_id, admission_number")
          .eq("institution_id", context.institutionId)
          .in("id", studentIds)
          .returns<{ id: string; person_id: string; admission_number: string }[]>()
      : Promise.resolve({ data: [], error: null }),
    staffIds.length > 0
      ? supabase
          .from("staff_profiles")
          .select("id, person_id, employee_code")
          .eq("institution_id", context.institutionId)
          .in("id", staffIds)
          .returns<{ id: string; person_id: string; employee_code: string }[]>()
      : Promise.resolve({ data: [], error: null }),
    sectionIds.length > 0
      ? supabase
          .from("sections")
          .select("id, code")
          .eq("institution_id", context.institutionId)
          .in("id", sectionIds)
          .returns<{ id: string; code: string }[]>()
      : Promise.resolve({ data: [], error: null }),
    tgIds.length > 0
      ? supabase
          .from("teaching_groups")
          .select("id, code")
          .eq("institution_id", context.institutionId)
          .in("id", tgIds)
          .returns<{ id: string; code: string }[]>()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (spRes.error || stRes.error || secRes.error || tgRes.error) {
    throw new Error("Failed to resolve attendance ledger metadata.");
  }

  const spById = new Map((spRes.data ?? []).map((s) => [s.id, s]));
  const stById = new Map((stRes.data ?? []).map((s) => [s.id, s]));
  const secCodeById = new Map((secRes.data ?? []).map((s) => [s.id, s.code]));
  const tgCodeById = new Map((tgRes.data ?? []).map((g) => [g.id, g.code]));

  const personNameMap = await fetchPersonNameMap(supabase, [
    ...(spRes.data ?? []).map((s) => s.person_id),
    ...(stRes.data ?? []).map((s) => s.person_id),
    ...rows.map((r) => r.recorded_by_person_id),
  ]);

  const events: AttendanceEventDto[] = rows.map((ev) => {
    let subjectLabel = "Subject";
    if (ev.subject_kind === "student" && ev.student_profile_id) {
      const sp = spById.get(ev.student_profile_id);
      subjectLabel = sp
        ? (personNameMap.get(sp.person_id) ?? sp.admission_number)
        : `Student (${ev.student_profile_id.slice(0, 8)})`;
    } else if (ev.subject_kind === "staff" && ev.staff_profile_id) {
      const st = stById.get(ev.staff_profile_id);
      subjectLabel = st
        ? (personNameMap.get(st.person_id) ?? st.employee_code)
        : `Staff (${ev.staff_profile_id.slice(0, 8)})`;
    }

    return {
      id: ev.id,
      idempotencyKey: ev.idempotency_key,
      subjectKind: ev.subject_kind,
      subjectLabel,
      sectionLabel: ev.section_id
        ? (secCodeById.get(ev.section_id) ?? null)
        : null,
      teachingGroupLabel: ev.teaching_group_id
        ? (tgCodeById.get(ev.teaching_group_id) ?? null)
        : null,
      attendanceDate: ev.attendance_date,
      eventType: ev.event_type,
      attendanceStatus: ev.attendance_status,
      source: ev.source,
      occurredAt: ev.occurred_at,
      recordedByName: ev.recorded_by_person_id
        ? (personNameMap.get(ev.recorded_by_person_id) ?? null)
        : null,
      reason: ev.reason,
    };
  });

  return {
    context,
    allowed: true,
    policy,
    selectedDate,
    selectedSubjectKind,
    events,
    capabilities,
  };
}

export async function updateAttendancePolicy(
  slug: string,
  rawInput: unknown,
): Promise<AttendanceActionResult<AttendancePolicyDto>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const { context } = resolution;
  if (
    !evaluatePermission(context, { permission: "attendance.manage" }).allowed
  ) {
    return {
      ok: false,
      error: "Only authorized attendance policy managers may update institutional attendance thresholds.",
      status: 403,
    };
  }

  const parsed = updateAttendancePolicySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid attendance policy values.",
      status: 400,
    };
  }

  const supabase = await createSupabaseServerClient();
  const previousPolicy = await loadAttendancePolicy(
    supabase,
    context.institutionId,
  );

  const { data: updated, error: upsertErr } = await supabase
    .from("attendance_policies")
    .upsert(
      {
        institution_id: context.institutionId,
        minimum_attendance_percent: parsed.data.minimumAttendancePercent,
        warning_threshold_percent: parsed.data.warningThresholdPercent,
        period_attendance_enabled: parsed.data.periodAttendanceEnabled,
        // ADR-0005 / OD-05: Biometric templates/capture remain disabled by default.
        biometric_enabled: false,
        policy_notes: parsed.data.policyNotes ?? null,
      },
      { onConflict: "institution_id" },
    )
    .select(
      "id, minimum_attendance_percent, warning_threshold_percent, period_attendance_enabled, biometric_enabled, policy_notes",
    )
    .single<{
      id: string;
      minimum_attendance_percent: number;
      warning_threshold_percent: number;
      period_attendance_enabled: boolean;
      biometric_enabled: boolean;
      policy_notes: string | null;
    }>();

  if (upsertErr || !updated) {
    return {
      ok: false,
      error: upsertErr?.message ?? "Failed to update attendance policy.",
      status: 400,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "attendance.policy_updated",
    entityType: "attendance_policies",
    entityId: updated.id,
    beforeState: {
      minimumAttendancePercent: previousPolicy.minimumAttendancePercent,
      warningThresholdPercent: previousPolicy.warningThresholdPercent,
      periodAttendanceEnabled: previousPolicy.periodAttendanceEnabled,
      biometricEnabled: previousPolicy.biometricEnabled,
    },
    afterState: {
      minimumAttendancePercent: Number(updated.minimum_attendance_percent),
      warningThresholdPercent: Number(updated.warning_threshold_percent),
      periodAttendanceEnabled: Boolean(updated.period_attendance_enabled),
      biometricEnabled: Boolean(updated.biometric_enabled),
    },
  });

  return {
    ok: true,
    data: {
      id: updated.id,
      minimumAttendancePercent: Number(updated.minimum_attendance_percent),
      warningThresholdPercent: Number(updated.warning_threshold_percent),
      periodAttendanceEnabled: Boolean(updated.period_attendance_enabled),
      biometricEnabled: Boolean(updated.biometric_enabled),
      policyNotes: updated.policy_notes,
    },
  };
}

export async function syncOfflineAttendanceQueue(
  slug: string,
  rawPayload: unknown,
): Promise<AttendanceActionResult<OfflineSyncBatchResultDto>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status === "unconfigured") {
    return { ok: false, error: "Supabase is not configured.", status: 503 };
  }
  if (resolution.status === "unauthenticated") {
    return { ok: false, error: "Sign in required.", status: 401 };
  }
  if (resolution.status === "denied") {
    return { ok: false, error: "Institution access denied.", status: 403 };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerAcademicScope(supabase, context, todayDate);

  const hasManage = evaluatePermission(context, {
    permission: "attendance.manage",
  }).allowed;
  const hasPeopleManage = evaluatePermission(context, {
    permission: "people.manage",
  }).allowed;

  const canAnyWrite =
    hasManage ||
    hasPeopleManage ||
    scope.hodDepartmentIds.size > 0 ||
    scope.classTeacherSectionIds.size > 0 ||
    scope.subjectTeacherGroupIds.size > 0;

  if (!canAnyWrite) {
    return {
      ok: false,
      error: "You do not have permission to sync offline attendance records.",
      status: 403,
    };
  }

  const parsed = offlineSyncBatchSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid offline sync batch.",
      status: 400,
    };
  }

  const events = parsed.data.events;
  const keys = [...new Set(events.map((ev) => ev.idempotencyKey))];

  const [existingEventsRes, sectionsRes] = await Promise.all([
    supabase
      .from("attendance_events")
      .select("idempotency_key")
      .eq("institution_id", context.institutionId)
      .in("idempotency_key", keys)
      .returns<{ idempotency_key: string }[]>(),
    supabase
      .from("sections")
      .select("id, session_id, grade:grade_levels(department_id)")
      .eq("institution_id", context.institutionId)
      .returns<
        {
          id: string;
          session_id: string;
          grade: { department_id: string } | { department_id: string }[] | null;
        }[]
      >(),
  ]);

  if (existingEventsRes.error) {
    return { ok: false, error: existingEventsRes.error.message, status: 500 };
  }
  if (sectionsRes.error) {
    return { ok: false, error: sectionsRes.error.message, status: 500 };
  }

  const seenKeys = new Set(
    (existingEventsRes.data ?? []).map((row) => row.idempotency_key),
  );
  const sectionDeptById = new Map(
    (sectionsRes.data ?? []).map((s) => [
      s.id,
      {
        sessionId: s.session_id,
        departmentId: unwrapJoin(s.grade)?.department_id ?? "",
      },
    ]),
  );

  let accepted = 0;
  let deduplicated = 0;
  const rejected: { idempotencyKey: string; reason: string }[] = [];

  for (const event of events) {
    if (seenKeys.has(event.idempotencyKey)) {
      deduplicated += 1;
      continue;
    }

    if (event.subjectKind === "staff") {
      const authorized =
        event.eventType === "correction"
          ? hasManage
          : hasManage || hasPeopleManage;
      if (!authorized) {
        rejected.push({
          idempotencyKey: event.idempotencyKey,
          reason: "Unauthorized to sync staff attendance events.",
        });
        continue;
      }

      if (event.staffProfileId) {
        const { data: existingStaff } = await supabase
          .from("staff_daily_attendance")
          .select("id, verification_status, correction_count")
          .eq("institution_id", context.institutionId)
          .eq("staff_profile_id", event.staffProfileId)
          .eq("attendance_date", event.attendanceDate)
          .maybeSingle<{
            id: string;
            verification_status: StaffVerificationStatus;
            correction_count: number;
          }>();

        if (
          existingStaff?.verification_status === "signed_off" &&
          event.eventType !== "correction"
        ) {
          rejected.push({
            idempotencyKey: event.idempotencyKey,
            reason:
              "Staff attendance row is signed off; sync a correction event with reason instead.",
          });
          continue;
        }
      }
    } else if (event.eventType === "period_roll") {
      const authorized =
        hasManage ||
        scope.hodDepartmentIds.size > 0 ||
        scope.classTeacherSectionIds.size > 0 ||
        (event.teachingGroupId
          ? scope.subjectTeacherGroupIds.has(event.teachingGroupId)
          : false);
      if (!authorized) {
        rejected.push({
          idempotencyKey: event.idempotencyKey,
          reason: "Unauthorized for target teaching group period roll.",
        });
        continue;
      }
    } else {
      const secMeta = event.sectionId
        ? sectionDeptById.get(event.sectionId)
        : undefined;
      const authorized =
        event.eventType === "correction"
          ? hasManage
          : hasManage ||
            (event.sectionId
              ? scope.classTeacherSectionIds.has(event.sectionId) ||
                (secMeta
                  ? scope.hodDepartmentIds.has(secMeta.departmentId)
                  : false)
              : false);
      if (!authorized) {
        rejected.push({
          idempotencyKey: event.idempotencyKey,
          reason: "Unauthorized for target section daily attendance.",
        });
        continue;
      }
    }

    const sessionId =
      (event.sectionId ? sectionDeptById.get(event.sectionId)?.sessionId : null) ??
      scope.activeSession?.id ??
      null;

    // Check daily signed-off immutability prior to inserting the event row
    let resolvedEnrolmentId = event.studentEnrolmentId ?? null;
    let existingDailyRow: {
      id: string;
      verification_status: StudentVerificationStatus;
      correction_count: number;
      status: StudentDailyAttendanceStatus;
    } | null = null;

    if (
      event.subjectKind === "student" &&
      (event.eventType === "day_roll" || event.eventType === "correction")
    ) {
      if (!resolvedEnrolmentId && sessionId && event.studentProfileId) {
        const { data: enrRow } = await supabase
          .from("student_session_enrolments")
          .select("id")
          .eq("institution_id", context.institutionId)
          .eq("session_id", sessionId)
          .eq("student_profile_id", event.studentProfileId)
          .maybeSingle<{ id: string }>();
        resolvedEnrolmentId = enrRow?.id ?? null;
      }

      if (resolvedEnrolmentId) {
        const { data: daily } = await supabase
          .from("student_daily_attendance")
          .select("id, verification_status, correction_count, status")
          .eq("institution_id", context.institutionId)
          .eq("student_enrolment_id", resolvedEnrolmentId)
          .eq("attendance_date", event.attendanceDate)
          .maybeSingle<{
            id: string;
            verification_status: StudentVerificationStatus;
            correction_count: number;
            status: StudentDailyAttendanceStatus;
          }>();
        existingDailyRow = daily ?? null;

        if (
          event.eventType === "day_roll" &&
          existingDailyRow?.verification_status === "signed_off"
        ) {
          rejected.push({
            idempotencyKey: event.idempotencyKey,
            reason:
              "Daily attendance record is already signed off; submit an audited correction event with reason.",
          });
          continue;
        }

        if (
          event.eventType === "correction" &&
          existingDailyRow?.verification_status !== "signed_off"
        ) {
          rejected.push({
            idempotencyKey: event.idempotencyKey,
            reason: "Correction events apply strictly to signed_off records.",
          });
          continue;
        }
      }
    }

    const { error: insertEventErr } = await supabase
      .from("attendance_events")
      .upsert(
        {
          institution_id: context.institutionId,
          idempotency_key: event.idempotencyKey,
          subject_kind: event.subjectKind,
          student_profile_id: event.studentProfileId ?? null,
          staff_profile_id: event.staffProfileId ?? null,
          session_id: sessionId,
          section_id: event.sectionId ?? null,
          teaching_group_id: event.teachingGroupId ?? null,
          attendance_date: event.attendanceDate,
          event_type: event.eventType,
          attendance_status: event.attendanceStatus,
          source: "offline_queue",
          occurred_at: event.occurredAt,
          recorded_by_person_id: context.personId,
          reason: event.reason ?? event.remarks ?? null,
        },
        {
          onConflict: "institution_id,idempotency_key",
          ignoreDuplicates: true,
        },
      );

    if (insertEventErr) {
      rejected.push({
        idempotencyKey: event.idempotencyKey,
        reason: insertEventErr.message,
      });
      continue;
    }

    if (
      event.subjectKind === "student" &&
      event.eventType === "day_roll" &&
      resolvedEnrolmentId &&
      sessionId &&
      event.sectionId &&
      event.studentProfileId
    ) {
      const { error: dailyErr } = await supabase
        .from("student_daily_attendance")
        .upsert(
          {
            institution_id: context.institutionId,
            session_id: sessionId,
            student_enrolment_id: resolvedEnrolmentId,
            student_profile_id: event.studentProfileId,
            section_id: event.sectionId,
            attendance_date: event.attendanceDate,
            status: event.attendanceStatus,
            verification_status:
              existingDailyRow?.verification_status ?? "draft",
            marked_by_person_id: context.personId,
            remarks: event.remarks ?? null,
          },
          {
            onConflict: "institution_id,student_enrolment_id,attendance_date",
          },
        );
      if (dailyErr) {
        rejected.push({
          idempotencyKey: event.idempotencyKey,
          reason: dailyErr.message,
        });
        continue;
      }
    } else if (
      event.subjectKind === "student" &&
      event.eventType === "correction" &&
      existingDailyRow
    ) {
      const nextCount = existingDailyRow.correction_count + 1;
      const { error: corrErr } = await supabase
        .from("student_daily_attendance")
        .update({
          status: event.attendanceStatus,
          correction_count: nextCount,
          last_correction_reason: event.reason ?? null,
          remarks: event.remarks ?? null,
        })
        .eq("institution_id", context.institutionId)
        .eq("id", existingDailyRow.id);
      if (corrErr) {
        rejected.push({
          idempotencyKey: event.idempotencyKey,
          reason: corrErr.message,
        });
        continue;
      }

      await recordAuditEvent(supabase, {
        institutionId: context.institutionId,
        actorPersonId: context.personId,
        actorAuthUserId: context.authUserId,
        action: "attendance.student_corrected_offline_sync",
        entityType: "student_daily_attendance",
        entityId: existingDailyRow.id,
        reason: event.reason ?? null,
        beforeState: {
          status: existingDailyRow.status,
          correctionCount: existingDailyRow.correction_count,
        },
        afterState: {
          status: event.attendanceStatus,
          correctionCount: nextCount,
        },
      });
    } else if (
      event.subjectKind === "student" &&
      event.eventType === "period_roll" &&
      event.teachingGroupId &&
      event.periodCode &&
      sessionId &&
      event.studentProfileId &&
      event.attendanceStatus !== "half_day"
    ) {
      let periodEnrolId = event.studentEnrolmentId ?? null;
      if (!periodEnrolId) {
        const { data: enrRow } = await supabase
          .from("student_session_enrolments")
          .select("id")
          .eq("institution_id", context.institutionId)
          .eq("session_id", sessionId)
          .eq("student_profile_id", event.studentProfileId)
          .maybeSingle<{ id: string }>();
        periodEnrolId = enrRow?.id ?? null;
      }

      if (periodEnrolId) {
        await supabase.from("student_period_attendance").upsert(
          {
            institution_id: context.institutionId,
            session_id: sessionId,
            student_enrolment_id: periodEnrolId,
            student_profile_id: event.studentProfileId,
            teaching_group_id: event.teachingGroupId,
            attendance_date: event.attendanceDate,
            period_code: event.periodCode,
            status: event.attendanceStatus,
            marked_by_person_id: context.personId,
            remarks: event.remarks ?? null,
          },
          {
            onConflict:
              "institution_id,student_enrolment_id,teaching_group_id,attendance_date,period_code",
          },
        );
      }
    }

    seenKeys.add(event.idempotencyKey);
    accepted += 1;
  }

  return {
    ok: true,
    data: {
      accepted,
      deduplicated,
      rejected,
    },
  };
}
