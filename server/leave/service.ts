import "server-only";

import {
  isoDateSchema,
  type StudentDailyAttendanceStatus,
  type StudentVerificationStatus,
} from "@/lib/attendance/schemas";
import {
  evaluatePermission,
  type VerifiedTenantContext,
} from "@/lib/auth/permissions";
import {
  calculateInclusiveLeaveDays,
  canAcknowledgeParentNotice,
  canReviewLeaveRecord,
  canTransitionLeaveStatus,
  summarizeDailyClassAttendance,
} from "@/lib/leave/rules";
import {
  acknowledgeParentNoticeSchema,
  cancelLeaveApplicationSchema,
  LEAVE_APPLICANT_KINDS,
  LEAVE_STATUSES,
  PARENT_NOTICE_STATUSES,
  reviewLeaveApplicationSchema,
  submitParentNoticeSchema,
  submitStaffLeaveSchema,
  submitStudentLeaveSchema,
  type LeaveApplicantKind,
  type LeaveStatus,
  type LeaveType,
  type ParentNoticeKind,
  type ParentNoticeStatus,
} from "@/lib/leave/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getInstitutionTodayIsoDate,
  type AttendanceCapabilitiesDto,
  type AttendanceSectionOptionDto,
} from "@/server/attendance/service";
import { recordAuditEvent } from "@/server/audit/log";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export type LeaveActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export interface LeaveWardOptionDto {
  studentProfileId: string;
  admissionNumber: string;
  fullName: string;
  relationship: string;
}

export interface LeaveStaffOptionDto {
  staffProfileId: string;
  employeeCode: string;
  fullName: string;
  designation: string | null;
}

export interface LeaveApplicationDto {
  id: string;
  applicantKind: LeaveApplicantKind;
  studentProfileId: string | null;
  staffProfileId: string | null;
  applicantLabel: string;
  applicantSublabel: string;
  startsOn: string;
  endsOn: string;
  inclusiveDays: number;
  leaveType: LeaveType;
  reason: string;
  status: LeaveStatus;
  submittedByName: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  isSelfApplicant: boolean;
  canReview: boolean;
  canCancel: boolean;
}

export interface LeaveCapabilitiesDto {
  canSubmitStudentLeave: boolean;
  canSubmitStaffLeave: boolean;
  canReviewStudentLeave: boolean;
  canReviewStaffLeave: boolean;
  hasInstitutionalOverride: boolean;
  isMonitorRestricted: boolean;
}

export interface LeaveWorkspaceDto {
  context: VerifiedTenantContext;
  statusFilter: "all" | LeaveStatus;
  kindFilter: "all" | LeaveApplicantKind;
  guardianWards: readonly LeaveWardOptionDto[];
  ownStaffProfile: LeaveStaffOptionDto | null;
  selectableStudents: readonly LeaveWardOptionDto[];
  selectableStaff: readonly LeaveStaffOptionDto[];
  applications: readonly LeaveApplicationDto[];
  capabilities: LeaveCapabilitiesDto;
}

export interface ParentNoticeDto {
  id: string;
  studentProfileId: string;
  studentName: string;
  admissionNumber: string;
  guardianPersonId: string;
  guardianName: string;
  attendanceDate: string;
  noticeKind: ParentNoticeKind;
  message: string;
  status: ParentNoticeStatus;
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  canAcknowledge: boolean;
}

export interface ParentNoticesCapabilitiesDto {
  canSubmitParentNotice: boolean;
  canAcknowledgeParentNotice: boolean;
  isMonitorRestricted: boolean;
}

export interface ParentNoticesWorkspaceDto {
  context: VerifiedTenantContext;
  statusFilter: "all" | ParentNoticeStatus;
  dateFilter: string;
  guardianWards: readonly LeaveWardOptionDto[];
  selectableStudents: readonly LeaveWardOptionDto[];
  notices: readonly ParentNoticeDto[];
  capabilities: ParentNoticesCapabilitiesDto;
}

export interface DailySummaryRosterRowDto {
  enrolmentId: string;
  studentProfileId: string;
  admissionNumber: string;
  fullName: string;
  rollNumber: string | null;
  status: StudentDailyAttendanceStatus | null;
  verificationStatus: StudentVerificationStatus | null;
  remarks: string | null;
}

export interface DailyClassSummaryDto {
  context: VerifiedTenantContext;
  allowed: boolean;
  activeSession: { id: string; code: string; name: string } | null;
  selectedDate: string;
  recentDates: readonly string[];
  sections: readonly AttendanceSectionOptionDto[];
  selectedSection: AttendanceSectionOptionDto | null;
  isMonitorReadOnly: boolean;
  canSeeOperationalDetails: boolean;
  attendanceCapabilities: AttendanceCapabilitiesDto;
  counts: {
    presentCount: number;
    lateCount: number;
    halfDayCount: number;
    excusedLeaveCount: number;
    onDutyCount: number;
    absentCount: number;
    totalMarked: number;
    verifiedCount: number;
    signedOffCount: number;
    draftCount: number;
  };
  rows: readonly DailySummaryRosterRowDto[];
  sectionLeaves: readonly LeaveApplicationDto[];
  sectionNotices: readonly ParentNoticeDto[];
}

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function fetchPersonNameMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  personIds: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const uniqueIds = [
    ...new Set(
      personIds.filter((id): id is string => Boolean(id && id.length > 0)),
    ),
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

interface LeaveCallerScope {
  activeSession: { id: string; code: string; name: string } | null;
  hodDepartmentIds: Set<string>;
  classTeacherSectionIds: Set<string>;
  subjectTeacherGroupIds: Set<string>;
  monitorSectionIds: Set<string>;
  ownStaffProfile: LeaveStaffOptionDto | null;
  ownStudentProfileId: string | null;
  guardianWards: LeaveWardOptionDto[];
}

async function loadLeaveCallerScope(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  context: VerifiedTenantContext,
  todayDate: string,
): Promise<LeaveCallerScope> {
  const [sessionRes, ownStaffRes, ownStudentRes, guardianLinksRes] =
    await Promise.all([
      supabase
        .from("academic_sessions")
        .select("id, code, name")
        .eq("institution_id", context.institutionId)
        .eq("status", "active")
        .maybeSingle<{ id: string; code: string; name: string }>(),
      supabase
        .from("staff_profiles")
        .select("id, employee_code, designation")
        .eq("institution_id", context.institutionId)
        .eq("person_id", context.personId)
        .eq("lifecycle_status", "active")
        .maybeSingle<{
          id: string;
          employee_code: string;
          designation: string | null;
        }>(),
      supabase
        .from("student_profiles")
        .select("id")
        .eq("institution_id", context.institutionId)
        .eq("person_id", context.personId)
        .maybeSingle<{ id: string }>(),
      supabase
        .from("student_guardians")
        .select("student_profile_id, relationship")
        .eq("institution_id", context.institutionId)
        .eq("guardian_person_id", context.personId)
        .eq("status", "active")
        .returns<{ student_profile_id: string; relationship: string }[]>(),
    ]);

  if (sessionRes.error) {
    throw new Error(
      `Failed to load active academic session: ${sessionRes.error.message}`,
    );
  }
  if (ownStaffRes.error) {
    throw new Error(
      `Failed to resolve own staff profile: ${ownStaffRes.error.message}`,
    );
  }
  if (ownStudentRes.error) {
    throw new Error(
      `Failed to resolve own student profile: ${ownStudentRes.error.message}`,
    );
  }
  if (guardianLinksRes.error) {
    throw new Error(
      `Failed to resolve guardian ward links: ${guardianLinksRes.error.message}`,
    );
  }

  const hodDepartmentIds = new Set<string>();
  const classTeacherSectionIds = new Set<string>();
  const subjectTeacherGroupIds = new Set<string>();
  const monitorSectionIds = new Set<string>();

  if (sessionRes.data) {
    const { data: assignments, error: assignErr } = await supabase
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
      throw new Error(
        `Failed to load caller academic assignments: ${assignErr.message}`,
      );
    }

    for (const row of assignments ?? []) {
      if (row.assignment_type === "hod" && row.department_id) {
        hodDepartmentIds.add(row.department_id);
      } else if (row.assignment_type === "class_teacher" && row.section_id) {
        classTeacherSectionIds.add(row.section_id);
      } else if (
        row.assignment_type === "subject_teacher" &&
        row.teaching_group_id
      ) {
        subjectTeacherGroupIds.add(row.teaching_group_id);
      } else if (
        (row.assignment_type === "monitor" ||
          row.assignment_type === "monitress") &&
        row.section_id
      ) {
        monitorSectionIds.add(row.section_id);
      }
    }
  }

  const wardLinks = guardianLinksRes.data ?? [];
  const wardIds = wardLinks.map((w) => w.student_profile_id);
  let guardianWards: LeaveWardOptionDto[] = [];

  if (wardIds.length > 0) {
    const { data: wardProfiles, error: wardErr } = await supabase
      .from("student_profiles")
      .select("id, person_id, admission_number")
      .eq("institution_id", context.institutionId)
      .in("id", wardIds)
      .returns<{ id: string; person_id: string; admission_number: string }[]>();

    if (wardErr) {
      throw new Error(`Failed to resolve ward profiles: ${wardErr.message}`);
    }

    const relById = new Map(
      wardLinks.map((w) => [w.student_profile_id, w.relationship]),
    );
    const wardPersonNames = await fetchPersonNameMap(
      supabase,
      (wardProfiles ?? []).map((p) => p.person_id),
    );

    guardianWards = (wardProfiles ?? []).map((p) => ({
      studentProfileId: p.id,
      admissionNumber: p.admission_number,
      fullName:
        wardPersonNames.get(p.person_id) ?? `Student (${p.admission_number})`,
      relationship: relById.get(p.id) ?? "guardian",
    }));
  }

  let ownStaffProfile: LeaveStaffOptionDto | null = null;
  if (ownStaffRes.data) {
    const ownNameMap = await fetchPersonNameMap(supabase, [context.personId]);
    ownStaffProfile = {
      staffProfileId: ownStaffRes.data.id,
      employeeCode: ownStaffRes.data.employee_code,
      designation: ownStaffRes.data.designation,
      fullName:
        ownNameMap.get(context.personId) ??
        `Staff (${ownStaffRes.data.employee_code})`,
    };
  }

  return {
    activeSession: sessionRes.data ?? null,
    hodDepartmentIds,
    classTeacherSectionIds,
    subjectTeacherGroupIds,
    monitorSectionIds,
    ownStaffProfile,
    ownStudentProfileId: ownStudentRes.data?.id ?? null,
    guardianWards,
  };
}

async function resolveSupervisedStudentIds(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  institutionId: string,
  sessionId: string | null,
  studentIds: readonly string[],
  scope: LeaveCallerScope,
): Promise<Set<string>> {
  const result = new Set<string>();
  if (
    !sessionId ||
    studentIds.length === 0 ||
    (scope.classTeacherSectionIds.size === 0 &&
      scope.hodDepartmentIds.size === 0)
  ) {
    return result;
  }

  const { data: enrolments, error } = await supabase
    .from("student_session_enrolments")
    .select(
      "student_profile_id, section_id, grade:grade_levels(department_id)",
    )
    .eq("institution_id", institutionId)
    .eq("session_id", sessionId)
    .in("student_profile_id", [...new Set(studentIds)])
    .returns<
      {
        student_profile_id: string;
        section_id: string;
        grade: { department_id: string } | { department_id: string }[] | null;
      }[]
    >();

  if (error) {
    throw new Error(
      `Failed to verify student section supervision: ${error.message}`,
    );
  }

  for (const row of enrolments ?? []) {
    const deptId = unwrapJoin(row.grade)?.department_id ?? "";
    if (
      scope.classTeacherSectionIds.has(row.section_id) ||
      scope.hodDepartmentIds.has(deptId)
    ) {
      result.add(row.student_profile_id);
    }
  }

  return result;
}

export async function getLeaveWorkspace(
  context: VerifiedTenantContext,
  options: { statusFilter?: string; kindFilter?: string } = {},
): Promise<LeaveWorkspaceDto> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadLeaveCallerScope(supabase, context, todayDate);

  const statusFilter: "all" | LeaveStatus = LEAVE_STATUSES.includes(
    options.statusFilter as LeaveStatus,
  )
    ? (options.statusFilter as LeaveStatus)
    : "all";
  const kindFilter: "all" | LeaveApplicantKind = LEAVE_APPLICANT_KINDS.includes(
    options.kindFilter as LeaveApplicantKind,
  )
    ? (options.kindFilter as LeaveApplicantKind)
    : "all";

  const hasInstitutionalOverride = evaluatePermission(context, {
    permission: "institution.*",
  }).allowed;
  const hasAttendanceManage = evaluatePermission(context, {
    permission: "attendance.manage",
  }).allowed;
  const hasPeopleManage = evaluatePermission(context, {
    permission: "people.manage",
  }).allowed;
  const hasPeopleRead = evaluatePermission(context, {
    permission: "people.read",
  }).allowed;

  const canSubmitStudentLeave =
    hasAttendanceManage || hasPeopleManage || scope.guardianWards.length > 0;
  const canSubmitStaffLeave =
    hasAttendanceManage || hasPeopleManage || Boolean(scope.ownStaffProfile);
  const canReviewStudentLeave =
    hasAttendanceManage ||
    hasPeopleManage ||
    scope.classTeacherSectionIds.size > 0 ||
    scope.hodDepartmentIds.size > 0;
  const canReviewStaffLeave = hasAttendanceManage || hasPeopleManage;
  const isMonitorRestricted =
    !canSubmitStudentLeave &&
    !canSubmitStaffLeave &&
    !canReviewStudentLeave &&
    !canReviewStaffLeave &&
    !hasPeopleRead &&
    !scope.ownStudentProfileId &&
    (scope.monitorSectionIds.size > 0 ||
      evaluatePermission(context, { permission: "classroom.summary.read" })
        .allowed);

  const capabilities: LeaveCapabilitiesDto = {
    canSubmitStudentLeave,
    canSubmitStaffLeave,
    canReviewStudentLeave,
    canReviewStaffLeave,
    hasInstitutionalOverride,
    isMonitorRestricted,
  };

  if (isMonitorRestricted) {
    return {
      context,
      statusFilter,
      kindFilter,
      guardianWards: [],
      ownStaffProfile: null,
      selectableStudents: [],
      selectableStaff: [],
      applications: [],
      capabilities,
    };
  }

  let leaveQuery = supabase
    .from("leave_applications")
    .select(
      "id, applicant_kind, session_id, student_profile_id, staff_profile_id, starts_on, ends_on, leave_type, reason, status, submitted_by_person_id, reviewed_by_person_id, reviewed_at, decision_note, created_at",
    )
    .eq("institution_id", context.institutionId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (statusFilter !== "all") {
    leaveQuery = leaveQuery.eq("status", statusFilter);
  }
  if (kindFilter !== "all") {
    leaveQuery = leaveQuery.eq("applicant_kind", kindFilter);
  }

  const [leaveRes, adminStudentsRes, adminStaffRes] = await Promise.all([
    leaveQuery.returns<
      {
        id: string;
        applicant_kind: LeaveApplicantKind;
        session_id: string | null;
        student_profile_id: string | null;
        staff_profile_id: string | null;
        starts_on: string;
        ends_on: string;
        leave_type: LeaveType;
        reason: string;
        status: LeaveStatus;
        submitted_by_person_id: string;
        reviewed_by_person_id: string | null;
        reviewed_at: string | null;
        decision_note: string | null;
        created_at: string;
      }[]
    >(),
    hasAttendanceManage || hasPeopleManage
      ? supabase
          .from("student_profiles")
          .select("id, person_id, admission_number")
          .eq("institution_id", context.institutionId)
          .eq("lifecycle_status", "active")
          .order("admission_number", { ascending: true })
          .limit(100)
          .returns<
            { id: string; person_id: string; admission_number: string }[]
          >()
      : Promise.resolve({ data: [], error: null }),
    hasAttendanceManage || hasPeopleManage
      ? supabase
          .from("staff_profiles")
          .select("id, person_id, employee_code, designation")
          .eq("institution_id", context.institutionId)
          .eq("lifecycle_status", "active")
          .order("employee_code", { ascending: true })
          .limit(100)
          .returns<
            {
              id: string;
              person_id: string;
              employee_code: string;
              designation: string | null;
            }[]
          >()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (leaveRes.error) {
    throw new Error(
      `Failed to load leave applications: ${leaveRes.error.message}`,
    );
  }
  if (adminStudentsRes.error) {
    throw new Error(
      `Failed to load student selector list: ${adminStudentsRes.error.message}`,
    );
  }
  if (adminStaffRes.error) {
    throw new Error(
      `Failed to load staff selector list: ${adminStaffRes.error.message}`,
    );
  }

  const leaveRows = leaveRes.data ?? [];
  const rowStudentIds = [
    ...new Set(
      leaveRows
        .map((r) => r.student_profile_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const rowStaffIds = [
    ...new Set(
      leaveRows
        .map((r) => r.staff_profile_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [rowStudentsRes, rowStaffRes, supervisedStudentIds] = await Promise.all(
    [
      rowStudentIds.length > 0
        ? supabase
            .from("student_profiles")
            .select("id, person_id, admission_number")
            .eq("institution_id", context.institutionId)
            .in("id", rowStudentIds)
            .returns<
              { id: string; person_id: string; admission_number: string }[]
            >()
        : Promise.resolve({ data: [], error: null }),
      rowStaffIds.length > 0
        ? supabase
            .from("staff_profiles")
            .select("id, person_id, employee_code, designation")
            .eq("institution_id", context.institutionId)
            .in("id", rowStaffIds)
            .returns<
              {
                id: string;
                person_id: string;
                employee_code: string;
                designation: string | null;
              }[]
            >()
        : Promise.resolve({ data: [], error: null }),
      hasAttendanceManage || hasPeopleManage
        ? Promise.resolve(new Set(rowStudentIds))
        : resolveSupervisedStudentIds(
            supabase,
            context.institutionId,
            scope.activeSession?.id ?? null,
            rowStudentIds,
            scope,
          ),
    ],
  );

  if (rowStudentsRes.error || rowStaffRes.error) {
    throw new Error("Failed to resolve leave applicant profiles.");
  }

  const allStudents = [
    ...(adminStudentsRes.data ?? []),
    ...(rowStudentsRes.data ?? []),
  ];
  const allStaff = [...(adminStaffRes.data ?? []), ...(rowStaffRes.data ?? [])];

  const studentById = new Map(allStudents.map((s) => [s.id, s]));
  const staffById = new Map(allStaff.map((s) => [s.id, s]));

  const personNameMap = await fetchPersonNameMap(supabase, [
    ...allStudents.map((s) => s.person_id),
    ...allStaff.map((s) => s.person_id),
    ...leaveRows.flatMap((r) => [
      r.submitted_by_person_id,
      r.reviewed_by_person_id,
    ]),
  ]);

  const selectableStudents: LeaveWardOptionDto[] = (
    adminStudentsRes.data ?? []
  ).map((s) => ({
    studentProfileId: s.id,
    admissionNumber: s.admission_number,
    fullName:
      personNameMap.get(s.person_id) ?? `Student (${s.admission_number})`,
    relationship: "admin_entry",
  }));

  const selectableStaff: LeaveStaffOptionDto[] = (
    adminStaffRes.data ?? []
  ).map((s) => ({
    staffProfileId: s.id,
    employeeCode: s.employee_code,
    designation: s.designation,
    fullName: personNameMap.get(s.person_id) ?? `Staff (${s.employee_code})`,
  }));

  const applications: LeaveApplicationDto[] = leaveRows.map((row) => {
    let applicantLabel = "Member";
    let applicantSublabel: string = row.applicant_kind;

    if (row.applicant_kind === "student" && row.student_profile_id) {
      const st = studentById.get(row.student_profile_id);
      applicantLabel = st
        ? (personNameMap.get(st.person_id) ?? `Student (${st.admission_number})`)
        : `Student (${row.student_profile_id.slice(0, 8)})`;
      applicantSublabel = st?.admission_number ?? "Student";
    } else if (row.applicant_kind === "staff" && row.staff_profile_id) {
      const sf = staffById.get(row.staff_profile_id);
      applicantLabel = sf
        ? (personNameMap.get(sf.person_id) ?? `Staff (${sf.employee_code})`)
        : `Staff (${row.staff_profile_id.slice(0, 8)})`;
      applicantSublabel = sf?.employee_code ?? "Staff";
    }

    const isSelfApplicant =
      row.submitted_by_person_id === context.personId ||
      Boolean(
        row.applicant_kind === "staff" &&
          scope.ownStaffProfile &&
          row.staff_profile_id === scope.ownStaffProfile.staffProfileId,
      );

    const hasReviewAuthority =
      row.applicant_kind === "staff"
        ? canReviewStaffLeave
        : hasAttendanceManage ||
          hasPeopleManage ||
          Boolean(
            row.student_profile_id &&
              supervisedStudentIds.has(row.student_profile_id),
          );

    const canReview =
      canTransitionLeaveStatus(row.status, "approved", "reviewer") &&
      canReviewLeaveRecord({
        isSelfApplicant,
        hasInstitutionalOverride,
        hasReviewAuthority,
      });

    const canCancel =
      canTransitionLeaveStatus(row.status, "cancelled", "applicant") &&
      row.submitted_by_person_id === context.personId;

    return {
      id: row.id,
      applicantKind: row.applicant_kind,
      studentProfileId: row.student_profile_id,
      staffProfileId: row.staff_profile_id,
      applicantLabel,
      applicantSublabel,
      startsOn: row.starts_on,
      endsOn: row.ends_on,
      inclusiveDays: calculateInclusiveLeaveDays(row.starts_on, row.ends_on),
      leaveType: row.leave_type,
      reason: row.reason,
      status: row.status,
      submittedByName:
        personNameMap.get(row.submitted_by_person_id) ?? "Member",
      reviewedByName: row.reviewed_by_person_id
        ? (personNameMap.get(row.reviewed_by_person_id) ?? null)
        : null,
      reviewedAt: row.reviewed_at,
      decisionNote: row.decision_note,
      createdAt: row.created_at,
      isSelfApplicant,
      canReview,
      canCancel,
    };
  });

  return {
    context,
    statusFilter,
    kindFilter,
    guardianWards: scope.guardianWards,
    ownStaffProfile: scope.ownStaffProfile,
    selectableStudents,
    selectableStaff,
    applications,
    capabilities,
  };
}

export async function submitStudentLeaveApplication(
  slug: string,
  rawInput: unknown,
): Promise<LeaveActionResult<{ leaveId: string }>> {
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

  const parsed = submitStudentLeaveSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Invalid student leave application.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadLeaveCallerScope(supabase, context, todayDate);

  const hasManage =
    evaluatePermission(context, { permission: "attendance.manage" }).allowed ||
    evaluatePermission(context, { permission: "people.manage" }).allowed;
  const isLinkedGuardian = scope.guardianWards.some(
    (w) => w.studentProfileId === parsed.data.studentProfileId,
  );

  if (!hasManage && !isLinkedGuardian) {
    return {
      ok: false,
      error:
        "Only linked guardians or authorized attendance/registry staff may submit student leave.",
      status: 403,
    };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("leave_applications")
    .insert({
      institution_id: context.institutionId,
      applicant_kind: "student",
      session_id: scope.activeSession?.id ?? null,
      student_profile_id: parsed.data.studentProfileId,
      staff_profile_id: null,
      starts_on: parsed.data.startsOn,
      ends_on: parsed.data.endsOn,
      leave_type: parsed.data.leaveType,
      reason: parsed.data.reason,
      status: "submitted",
      submitted_by_person_id: context.personId,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: insertErr?.message ?? "Failed to submit student leave application.",
      status: 400,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "leave.student_submitted",
    entityType: "leave_applications",
    entityId: inserted.id,
    afterState: {
      studentProfileId: parsed.data.studentProfileId,
      startsOn: parsed.data.startsOn,
      endsOn: parsed.data.endsOn,
      leaveType: parsed.data.leaveType,
    },
  });

  return { ok: true, data: { leaveId: inserted.id } };
}

export async function submitStaffLeaveApplication(
  slug: string,
  rawInput: unknown,
): Promise<LeaveActionResult<{ leaveId: string }>> {
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

  const parsed = submitStaffLeaveSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Invalid staff leave application.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadLeaveCallerScope(supabase, context, todayDate);

  const hasManage =
    evaluatePermission(context, { permission: "attendance.manage" }).allowed ||
    evaluatePermission(context, { permission: "people.manage" }).allowed;

  const targetStaffProfileId =
    parsed.data.staffProfileId && hasManage
      ? parsed.data.staffProfileId
      : scope.ownStaffProfile?.staffProfileId;

  if (!targetStaffProfileId) {
    return {
      ok: false,
      error:
        "No active staff profile found for your account in this institution.",
      status: 403,
    };
  }

  if (
    parsed.data.staffProfileId &&
    parsed.data.staffProfileId !== scope.ownStaffProfile?.staffProfileId &&
    !hasManage
  ) {
    return {
      ok: false,
      error:
        "You may only submit staff leave for your own active staff profile.",
      status: 403,
    };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("leave_applications")
    .insert({
      institution_id: context.institutionId,
      applicant_kind: "staff",
      session_id: scope.activeSession?.id ?? null,
      student_profile_id: null,
      staff_profile_id: targetStaffProfileId,
      starts_on: parsed.data.startsOn,
      ends_on: parsed.data.endsOn,
      leave_type: parsed.data.leaveType,
      reason: parsed.data.reason,
      status: "submitted",
      submitted_by_person_id: context.personId,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: insertErr?.message ?? "Failed to submit staff leave application.",
      status: 400,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "leave.staff_submitted",
    entityType: "leave_applications",
    entityId: inserted.id,
    afterState: {
      staffProfileId: targetStaffProfileId,
      startsOn: parsed.data.startsOn,
      endsOn: parsed.data.endsOn,
      leaveType: parsed.data.leaveType,
    },
  });

  return { ok: true, data: { leaveId: inserted.id } };
}

export async function reviewLeaveApplication(
  slug: string,
  rawInput: unknown,
): Promise<LeaveActionResult<{ leaveId: string; status: LeaveStatus }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = reviewLeaveApplicationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid leave review payload.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadLeaveCallerScope(supabase, context, todayDate);

  const { data: existing, error: fetchErr } = await supabase
    .from("leave_applications")
    .select(
      "id, applicant_kind, student_profile_id, staff_profile_id, status, submitted_by_person_id, decision_note",
    )
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.leaveId)
    .maybeSingle<{
      id: string;
      applicant_kind: LeaveApplicantKind;
      student_profile_id: string | null;
      staff_profile_id: string | null;
      status: LeaveStatus;
      submitted_by_person_id: string;
      decision_note: string | null;
    }>();

  if (fetchErr || !existing) {
    return {
      ok: false,
      error: "Leave application not found or inaccessible.",
      status: 404,
    };
  }

  if (
    !canTransitionLeaveStatus(
      existing.status,
      parsed.data.decision,
      "reviewer",
    )
  ) {
    return {
      ok: false,
      error: `Cannot ${parsed.data.decision} a leave application currently marked ${existing.status}.`,
      status: 400,
    };
  }

  const hasInstitutionalOverride = evaluatePermission(context, {
    permission: "institution.*",
  }).allowed;
  const hasManage =
    evaluatePermission(context, { permission: "attendance.manage" }).allowed ||
    evaluatePermission(context, { permission: "people.manage" }).allowed;

  let hasReviewAuthority = hasManage;
  if (
    !hasReviewAuthority &&
    existing.applicant_kind === "student" &&
    existing.student_profile_id
  ) {
    const supervised = await resolveSupervisedStudentIds(
      supabase,
      context.institutionId,
      scope.activeSession?.id ?? null,
      [existing.student_profile_id],
      scope,
    );
    hasReviewAuthority = supervised.has(existing.student_profile_id);
  }

  const isSelfApplicant =
    existing.submitted_by_person_id === context.personId ||
    Boolean(
      existing.applicant_kind === "staff" &&
        scope.ownStaffProfile &&
        existing.staff_profile_id === scope.ownStaffProfile.staffProfileId,
    );

  if (
    !canReviewLeaveRecord({
      isSelfApplicant,
      hasInstitutionalOverride,
      hasReviewAuthority,
    })
  ) {
    return {
      ok: false,
      error: isSelfApplicant
        ? "Staff members cannot approve or reject their own leave request without institutional leadership authority."
        : "You do not hold authority to review this leave application.",
      status: 403,
    };
  }

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("leave_applications")
    .update({
      status: parsed.data.decision,
      reviewed_by_person_id: context.personId,
      reviewed_at: nowIso,
      decision_note: parsed.data.decisionNote ?? null,
    })
    .eq("institution_id", context.institutionId)
    .eq("id", existing.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message, status: 400 };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "leave.reviewed",
    entityType: "leave_applications",
    entityId: existing.id,
    reason: parsed.data.decisionNote ?? null,
    beforeState: { status: existing.status },
    afterState: {
      status: parsed.data.decision,
      decisionNote: parsed.data.decisionNote ?? null,
    },
  });

  return {
    ok: true,
    data: { leaveId: existing.id, status: parsed.data.decision },
  };
}

export async function cancelLeaveApplication(
  slug: string,
  rawInput: unknown,
): Promise<LeaveActionResult<{ leaveId: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = cancelLeaveApplicationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid leave ID.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("leave_applications")
    .select("id, status, submitted_by_person_id")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.leaveId)
    .maybeSingle<{
      id: string;
      status: LeaveStatus;
      submitted_by_person_id: string;
    }>();

  if (fetchErr || !existing) {
    return {
      ok: false,
      error: "Leave application not found or inaccessible.",
      status: 404,
    };
  }

  if (existing.submitted_by_person_id !== context.personId) {
    return {
      ok: false,
      error: "Only the original submitter may cancel a leave application.",
      status: 403,
    };
  }

  if (!canTransitionLeaveStatus(existing.status, "cancelled", "applicant")) {
    return {
      ok: false,
      error: `Leave applications marked ${existing.status} cannot be cancelled.`,
      status: 400,
    };
  }

  const { error: updateErr } = await supabase
    .from("leave_applications")
    .update({ status: "cancelled" })
    .eq("institution_id", context.institutionId)
    .eq("id", existing.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message, status: 400 };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "leave.cancelled",
    entityType: "leave_applications",
    entityId: existing.id,
    beforeState: { status: existing.status },
    afterState: { status: "cancelled" },
  });

  return { ok: true, data: { leaveId: existing.id } };
}

export async function getParentNoticesWorkspace(
  context: VerifiedTenantContext,
  options: { statusFilter?: string; date?: string } = {},
): Promise<ParentNoticesWorkspaceDto> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadLeaveCallerScope(supabase, context, todayDate);

  const statusFilter: "all" | ParentNoticeStatus =
    PARENT_NOTICE_STATUSES.includes(options.statusFilter as ParentNoticeStatus)
      ? (options.statusFilter as ParentNoticeStatus)
      : "all";
  const dateFilter =
    options.date && isoDateSchema.safeParse(options.date).success
      ? options.date.trim()
      : "";

  const hasAttendanceManage = evaluatePermission(context, {
    permission: "attendance.manage",
  }).allowed;
  const hasPeopleRead = evaluatePermission(context, {
    permission: "people.read",
  }).allowed;

  const canSubmitParentNotice =
    hasAttendanceManage || scope.guardianWards.length > 0;
  const canAcknowledgeAnyNotice =
    hasAttendanceManage ||
    scope.classTeacherSectionIds.size > 0 ||
    scope.hodDepartmentIds.size > 0;
  const isMonitorRestricted =
    !canSubmitParentNotice &&
    !canAcknowledgeAnyNotice &&
    !hasPeopleRead &&
    !scope.ownStudentProfileId &&
    (scope.monitorSectionIds.size > 0 ||
      evaluatePermission(context, { permission: "classroom.summary.read" })
        .allowed);

  const capabilities: ParentNoticesCapabilitiesDto = {
    canSubmitParentNotice,
    canAcknowledgeParentNotice: canAcknowledgeAnyNotice,
    isMonitorRestricted,
  };

  if (isMonitorRestricted) {
    return {
      context,
      statusFilter,
      dateFilter,
      guardianWards: [],
      selectableStudents: [],
      notices: [],
      capabilities,
    };
  }

  let noticesQuery = supabase
    .from("parent_attendance_notices")
    .select(
      "id, student_profile_id, guardian_person_id, attendance_date, notice_kind, message, status, acknowledged_by_person_id, acknowledged_at, created_at",
    )
    .eq("institution_id", context.institutionId)
    .order("attendance_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  if (statusFilter !== "all") {
    noticesQuery = noticesQuery.eq("status", statusFilter);
  }
  if (dateFilter) {
    noticesQuery = noticesQuery.eq("attendance_date", dateFilter);
  }

  const [noticesRes, adminStudentsRes] = await Promise.all([
    noticesQuery.returns<
      {
        id: string;
        student_profile_id: string;
        guardian_person_id: string;
        attendance_date: string;
        notice_kind: ParentNoticeKind;
        message: string;
        status: ParentNoticeStatus;
        acknowledged_by_person_id: string | null;
        acknowledged_at: string | null;
        created_at: string;
      }[]
    >(),
    hasAttendanceManage
      ? supabase
          .from("student_profiles")
          .select("id, person_id, admission_number")
          .eq("institution_id", context.institutionId)
          .eq("lifecycle_status", "active")
          .order("admission_number", { ascending: true })
          .limit(100)
          .returns<
            { id: string; person_id: string; admission_number: string }[]
          >()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (noticesRes.error) {
    throw new Error(
      `Failed to load parent attendance notices: ${noticesRes.error.message}`,
    );
  }
  if (adminStudentsRes.error) {
    throw new Error(
      `Failed to load student options: ${adminStudentsRes.error.message}`,
    );
  }

  const noticeRows = noticesRes.data ?? [];
  const rowStudentIds = [
    ...new Set(noticeRows.map((n) => n.student_profile_id)),
  ];

  const [rowStudentsRes, supervisedStudentIds] = await Promise.all([
    rowStudentIds.length > 0
      ? supabase
          .from("student_profiles")
          .select("id, person_id, admission_number")
          .eq("institution_id", context.institutionId)
          .in("id", rowStudentIds)
          .returns<
            { id: string; person_id: string; admission_number: string }[]
          >()
      : Promise.resolve({ data: [], error: null }),
    hasAttendanceManage
      ? Promise.resolve(new Set(rowStudentIds))
      : resolveSupervisedStudentIds(
          supabase,
          context.institutionId,
          scope.activeSession?.id ?? null,
          rowStudentIds,
          scope,
        ),
  ]);

  if (rowStudentsRes.error) {
    throw new Error(
      `Failed to resolve notice students: ${rowStudentsRes.error.message}`,
    );
  }

  const allStudents = [
    ...(adminStudentsRes.data ?? []),
    ...(rowStudentsRes.data ?? []),
  ];
  const studentById = new Map(allStudents.map((s) => [s.id, s]));

  const personNameMap = await fetchPersonNameMap(supabase, [
    ...allStudents.map((s) => s.person_id),
    ...noticeRows.flatMap((n) => [
      n.guardian_person_id,
      n.acknowledged_by_person_id,
    ]),
  ]);

  const selectableStudents: LeaveWardOptionDto[] = (
    adminStudentsRes.data ?? []
  ).map((s) => ({
    studentProfileId: s.id,
    admissionNumber: s.admission_number,
    fullName:
      personNameMap.get(s.person_id) ?? `Student (${s.admission_number})`,
    relationship: "admin_entry",
  }));

  const notices: ParentNoticeDto[] = noticeRows.map((n) => {
    const sp = studentById.get(n.student_profile_id);
    const canAck =
      canAcknowledgeParentNotice(n.status) &&
      (hasAttendanceManage || supervisedStudentIds.has(n.student_profile_id));

    return {
      id: n.id,
      studentProfileId: n.student_profile_id,
      studentName: sp
        ? (personNameMap.get(sp.person_id) ?? `Student (${sp.admission_number})`)
        : `Student (${n.student_profile_id.slice(0, 8)})`,
      admissionNumber: sp?.admission_number ?? "ADM",
      guardianPersonId: n.guardian_person_id,
      guardianName: personNameMap.get(n.guardian_person_id) ?? "Guardian",
      attendanceDate: n.attendance_date,
      noticeKind: n.notice_kind,
      message: n.message,
      status: n.status,
      acknowledgedByName: n.acknowledged_by_person_id
        ? (personNameMap.get(n.acknowledged_by_person_id) ?? null)
        : null,
      acknowledgedAt: n.acknowledged_at,
      createdAt: n.created_at,
      canAcknowledge: canAck,
    };
  });

  return {
    context,
    statusFilter,
    dateFilter,
    guardianWards: scope.guardianWards,
    selectableStudents,
    notices,
    capabilities,
  };
}

export async function submitParentAttendanceNotice(
  slug: string,
  rawInput: unknown,
): Promise<LeaveActionResult<{ noticeId: string }>> {
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

  const parsed = submitParentNoticeSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid parent notice payload.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadLeaveCallerScope(supabase, context, todayDate);

  const hasManage = evaluatePermission(context, {
    permission: "attendance.manage",
  }).allowed;
  const isLinkedGuardian = scope.guardianWards.some(
    (w) => w.studentProfileId === parsed.data.studentProfileId,
  );

  if (!hasManage && !isLinkedGuardian) {
    return {
      ok: false,
      error:
        "Only active linked guardians or attendance managers may submit parent attendance notices.",
      status: 403,
    };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("parent_attendance_notices")
    .insert({
      institution_id: context.institutionId,
      student_profile_id: parsed.data.studentProfileId,
      guardian_person_id: context.personId,
      attendance_date: parsed.data.attendanceDate,
      notice_kind: parsed.data.noticeKind,
      message: parsed.data.message,
      status: "submitted",
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: insertErr?.message ?? "Failed to submit parent attendance notice.",
      status: 400,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "attendance_notice.submitted",
    entityType: "parent_attendance_notices",
    entityId: inserted.id,
    afterState: {
      studentProfileId: parsed.data.studentProfileId,
      attendanceDate: parsed.data.attendanceDate,
      noticeKind: parsed.data.noticeKind,
    },
  });

  return { ok: true, data: { noticeId: inserted.id } };
}

export async function acknowledgeParentAttendanceNotice(
  slug: string,
  rawInput: unknown,
): Promise<LeaveActionResult<{ noticeId: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = acknowledgeParentNoticeSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid notice ID.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadLeaveCallerScope(supabase, context, todayDate);

  const { data: existing, error: fetchErr } = await supabase
    .from("parent_attendance_notices")
    .select("id, student_profile_id, status")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.noticeId)
    .maybeSingle<{ id: string; student_profile_id: string; status: ParentNoticeStatus }>();

  if (fetchErr || !existing) {
    return {
      ok: false,
      error: "Parent notice not found or inaccessible.",
      status: 404,
    };
  }

  if (!canAcknowledgeParentNotice(existing.status)) {
    return {
      ok: false,
      error: "This parent notice has already been acknowledged.",
      status: 400,
    };
  }

  const hasManage = evaluatePermission(context, {
    permission: "attendance.manage",
  }).allowed;
  const supervised = hasManage
    ? new Set([existing.student_profile_id])
    : await resolveSupervisedStudentIds(
        supabase,
        context.institutionId,
        scope.activeSession?.id ?? null,
        [existing.student_profile_id],
        scope,
      );

  if (!hasManage && !supervised.has(existing.student_profile_id)) {
    return {
      ok: false,
      error:
        "Only the student's Class Teacher, HOD, or an Attendance Manager may acknowledge this notice.",
      status: 403,
    };
  }

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("parent_attendance_notices")
    .update({
      status: "acknowledged",
      acknowledged_by_person_id: context.personId,
      acknowledged_at: nowIso,
    })
    .eq("institution_id", context.institutionId)
    .eq("id", existing.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message, status: 400 };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "attendance_notice.acknowledged",
    entityType: "parent_attendance_notices",
    entityId: existing.id,
    beforeState: { status: existing.status },
    afterState: { status: "acknowledged" },
  });

  return { ok: true, data: { noticeId: existing.id } };
}

export async function getDailyClassSummary(
  context: VerifiedTenantContext,
  options: { date?: string; sectionId?: string } = {},
): Promise<DailyClassSummaryDto> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const selectedDate =
    options.date && isoDateSchema.safeParse(options.date).success
      ? options.date.trim()
      : todayDate;

  const scope = await loadLeaveCallerScope(supabase, context, todayDate);

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

  const baseIsMonitorOnly =
    !hasManage &&
    !hasRead &&
    scope.classTeacherSectionIds.size === 0 &&
    scope.hodDepartmentIds.size === 0 &&
    (scope.monitorSectionIds.size > 0 ||
      evaluatePermission(context, { permission: "classroom.summary.read" })
        .allowed);

  const canAccessSummary =
    hasManage ||
    hasRead ||
    scope.classTeacherSectionIds.size > 0 ||
    scope.hodDepartmentIds.size > 0 ||
    baseIsMonitorOnly;

  const baseCapabilities: AttendanceCapabilitiesDto = {
    canMarkDaily:
      hasManage ||
      scope.classTeacherSectionIds.size > 0 ||
      scope.hodDepartmentIds.size > 0,
    canVerifySection:
      hasManage ||
      scope.classTeacherSectionIds.size > 0 ||
      scope.hodDepartmentIds.size > 0,
    canSignOff: hasManage,
    canCorrectSignedOff: hasManage,
    canAccessPeriodRoll:
      hasManage ||
      scope.hodDepartmentIds.size > 0 ||
      scope.classTeacherSectionIds.size > 0 ||
      scope.subjectTeacherGroupIds.size > 0,
    canMarkPeriodRoll:
      hasManage ||
      scope.hodDepartmentIds.size > 0 ||
      scope.classTeacherSectionIds.size > 0 ||
      scope.subjectTeacherGroupIds.size > 0,
    canAccessStaffAttendance:
      hasManage ||
      hasPeopleRead ||
      hasPeopleManage ||
      Boolean(scope.ownStaffProfile),
    canManageStaffAttendance: hasManage || hasPeopleManage,
    canViewLedger:
      hasManage ||
      hasRead ||
      scope.hodDepartmentIds.size > 0 ||
      scope.classTeacherSectionIds.size > 0 ||
      scope.subjectTeacherGroupIds.size > 0 ||
      Boolean(scope.ownStaffProfile),
    canManagePolicy: hasManage,
    canAccessDailySummary: canAccessSummary,
    isMonitorReadOnly: baseIsMonitorOnly,
  };

  if (!canAccessSummary || !scope.activeSession) {
    return {
      context,
      allowed: canAccessSummary,
      activeSession: scope.activeSession,
      selectedDate,
      recentDates: [],
      sections: [],
      selectedSection: null,
      isMonitorReadOnly: baseIsMonitorOnly,
      canSeeOperationalDetails: false,
      attendanceCapabilities: baseCapabilities,
      counts: {
        presentCount: 0,
        lateCount: 0,
        halfDayCount: 0,
        excusedLeaveCount: 0,
        onDutyCount: 0,
        absentCount: 0,
        totalMarked: 0,
        verifiedCount: 0,
        signedOffCount: 0,
        draftCount: 0,
      },
      rows: [],
      sectionLeaves: [],
      sectionNotices: [],
    };
  }

  const [sectionsRes, recentDatesRes] = await Promise.all([
    supabase
      .from("sections")
      .select(
        "id, session_id, code, name, grade:grade_levels(code, department_id)",
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

  const scopedSections =
    baseIsMonitorOnly && scope.monitorSectionIds.size > 0
      ? allSections.filter((s) => scope.monitorSectionIds.has(s.id))
      : allSections;

  const defaultSection =
    scopedSections.find(
      (s) =>
        scope.classTeacherSectionIds.has(s.id) ||
        scope.monitorSectionIds.has(s.id) ||
        scope.hodDepartmentIds.has(s.departmentId),
    ) ??
    scopedSections[0] ??
    null;

  const selectedSection =
    (options.sectionId
      ? scopedSections.find((s) => s.id === options.sectionId)
      : undefined) ?? defaultSection;

  const recentDates = [
    ...new Set((recentDatesRes.data ?? []).map((r) => r.attendance_date)),
  ].slice(0, 5);

  if (!selectedSection) {
    return {
      context,
      allowed: true,
      activeSession: scope.activeSession,
      selectedDate,
      recentDates,
      sections: scopedSections,
      selectedSection: null,
      isMonitorReadOnly: baseIsMonitorOnly,
      canSeeOperationalDetails: false,
      attendanceCapabilities: baseCapabilities,
      counts: {
        presentCount: 0,
        lateCount: 0,
        halfDayCount: 0,
        excusedLeaveCount: 0,
        onDutyCount: 0,
        absentCount: 0,
        totalMarked: 0,
        verifiedCount: 0,
        signedOffCount: 0,
        draftCount: 0,
      },
      rows: [],
      sectionLeaves: [],
      sectionNotices: [],
    };
  }

  const isSelectedSectionLead =
    scope.classTeacherSectionIds.has(selectedSection.id) ||
    scope.hodDepartmentIds.has(selectedSection.departmentId);
  const canSeeOperationalDetails =
    !baseIsMonitorOnly && (hasManage || isSelectedSectionLead || hasRead);

  const [enrolmentsRes, dailyRes] = await Promise.all([
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
        "student_enrolment_id, student_profile_id, status, verification_status, remarks",
      )
      .eq("institution_id", context.institutionId)
      .eq("session_id", scope.activeSession.id)
      .eq("section_id", selectedSection.id)
      .eq("attendance_date", selectedDate)
      .returns<
        {
          student_enrolment_id: string;
          student_profile_id: string;
          status: StudentDailyAttendanceStatus;
          verification_status: StudentVerificationStatus;
          remarks: string | null;
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
      `Failed to load daily attendance summary: ${dailyRes.error.message}`,
    );
  }

  const enrolmentRows = enrolmentsRes.data ?? [];
  const dailyByEnrolment = new Map(
    (dailyRes.data ?? []).map((d) => [d.student_enrolment_id, d]),
  );

  const studentIds = [
    ...new Set(enrolmentRows.map((e) => e.student_profile_id)),
  ];

  let sectionLeavesRaw: {
    id: string;
    student_profile_id: string | null;
    starts_on: string;
    ends_on: string;
    leave_type: LeaveType;
    reason: string;
    status: LeaveStatus;
    submitted_by_person_id: string;
    reviewed_by_person_id: string | null;
    reviewed_at: string | null;
    decision_note: string | null;
    created_at: string;
  }[] = [];

  let sectionNoticesRaw: {
    id: string;
    student_profile_id: string;
    guardian_person_id: string;
    attendance_date: string;
    notice_kind: ParentNoticeKind;
    message: string;
    status: ParentNoticeStatus;
    acknowledged_by_person_id: string | null;
    acknowledged_at: string | null;
    created_at: string;
  }[] = [];

  const [studentsRes, leavesRes, noticesRes] = await Promise.all([
    studentIds.length > 0
      ? supabase
          .from("student_profiles")
          .select("id, person_id, admission_number")
          .eq("institution_id", context.institutionId)
          .in("id", studentIds)
          .returns<
            { id: string; person_id: string; admission_number: string }[]
          >()
      : Promise.resolve({ data: [], error: null }),
    canSeeOperationalDetails && studentIds.length > 0
      ? supabase
          .from("leave_applications")
          .select(
            "id, student_profile_id, starts_on, ends_on, leave_type, reason, status, submitted_by_person_id, reviewed_by_person_id, reviewed_at, decision_note, created_at",
          )
          .eq("institution_id", context.institutionId)
          .eq("applicant_kind", "student")
          .in("student_profile_id", studentIds)
          .in("status", ["submitted", "approved"])
          .lte("starts_on", selectedDate)
          .gte("ends_on", selectedDate)
          .order("created_at", { ascending: false })
          .returns<typeof sectionLeavesRaw>()
      : Promise.resolve({ data: [], error: null }),
    canSeeOperationalDetails && studentIds.length > 0
      ? supabase
          .from("parent_attendance_notices")
          .select(
            "id, student_profile_id, guardian_person_id, attendance_date, notice_kind, message, status, acknowledged_by_person_id, acknowledged_at, created_at",
          )
          .eq("institution_id", context.institutionId)
          .in("student_profile_id", studentIds)
          .eq("attendance_date", selectedDate)
          .order("created_at", { ascending: false })
          .returns<typeof sectionNoticesRaw>()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (studentsRes.error || leavesRes.error || noticesRes.error) {
    throw new Error("Failed to resolve section summary operational data.");
  }

  sectionLeavesRaw = leavesRes.data ?? [];
  sectionNoticesRaw = noticesRes.data ?? [];

  const studentById = new Map((studentsRes.data ?? []).map((s) => [s.id, s]));

  const personNameMap = await fetchPersonNameMap(supabase, [
    ...(studentsRes.data ?? []).map((s) => s.person_id),
    ...sectionLeavesRaw.flatMap((l) => [
      l.submitted_by_person_id,
      l.reviewed_by_person_id,
    ]),
    ...sectionNoticesRaw.flatMap((n) => [
      n.guardian_person_id,
      n.acknowledged_by_person_id,
    ]),
  ]);

  const rawRows: DailySummaryRosterRowDto[] = enrolmentRows.map((enr) => {
    const sp = studentById.get(enr.student_profile_id);
    const daily = dailyByEnrolment.get(enr.id);
    return {
      enrolmentId: enr.id,
      studentProfileId: enr.student_profile_id,
      admissionNumber: sp?.admission_number ?? "ADM",
      fullName: sp
        ? (personNameMap.get(sp.person_id) ?? `Student (${sp.admission_number})`)
        : `Student (${enr.student_profile_id.slice(0, 8)})`,
      rollNumber: enr.roll_number,
      status: daily?.status ?? null,
      verificationStatus: daily?.verification_status ?? null,
      remarks: baseIsMonitorOnly ? null : (daily?.remarks ?? null),
    };
  });

  const summary = summarizeDailyClassAttendance(rawRows, {
    verifiedOnly: baseIsMonitorOnly,
  });

  const sectionLeaves: LeaveApplicationDto[] = canSeeOperationalDetails
    ? sectionLeavesRaw.map((row) => {
        const sp = row.student_profile_id
          ? studentById.get(row.student_profile_id)
          : undefined;
        const canReview =
          (hasManage || isSelectedSectionLead) &&
          canTransitionLeaveStatus(row.status, "approved", "reviewer");
        return {
          id: row.id,
          applicantKind: "student",
          studentProfileId: row.student_profile_id,
          staffProfileId: null,
          applicantLabel: sp
            ? (personNameMap.get(sp.person_id) ??
              `Student (${sp.admission_number})`)
            : "Student",
          applicantSublabel: sp?.admission_number ?? "Student",
          startsOn: row.starts_on,
          endsOn: row.ends_on,
          inclusiveDays: calculateInclusiveLeaveDays(
            row.starts_on,
            row.ends_on,
          ),
          leaveType: row.leave_type,
          reason: row.reason,
          status: row.status,
          submittedByName:
            personNameMap.get(row.submitted_by_person_id) ?? "Member",
          reviewedByName: row.reviewed_by_person_id
            ? (personNameMap.get(row.reviewed_by_person_id) ?? null)
            : null,
          reviewedAt: row.reviewed_at,
          decisionNote: row.decision_note,
          createdAt: row.created_at,
          isSelfApplicant: row.submitted_by_person_id === context.personId,
          canReview,
          canCancel: false,
        };
      })
    : [];

  const sectionNotices: ParentNoticeDto[] = canSeeOperationalDetails
    ? sectionNoticesRaw.map((n) => {
        const sp = studentById.get(n.student_profile_id);
        return {
          id: n.id,
          studentProfileId: n.student_profile_id,
          studentName: sp
            ? (personNameMap.get(sp.person_id) ??
              `Student (${sp.admission_number})`)
            : "Student",
          admissionNumber: sp?.admission_number ?? "ADM",
          guardianPersonId: n.guardian_person_id,
          guardianName: personNameMap.get(n.guardian_person_id) ?? "Guardian",
          attendanceDate: n.attendance_date,
          noticeKind: n.notice_kind,
          message: n.message,
          status: n.status,
          acknowledgedByName: n.acknowledged_by_person_id
            ? (personNameMap.get(n.acknowledged_by_person_id) ?? null)
            : null,
          acknowledgedAt: n.acknowledged_at,
          createdAt: n.created_at,
          canAcknowledge:
            (hasManage || isSelectedSectionLead) &&
            canAcknowledgeParentNotice(n.status),
        };
      })
    : [];

  return {
    context,
    allowed: true,
    activeSession: scope.activeSession,
    selectedDate,
    recentDates,
    sections: scopedSections,
    selectedSection,
    isMonitorReadOnly: baseIsMonitorOnly,
    canSeeOperationalDetails,
    attendanceCapabilities: baseCapabilities,
    counts: {
      presentCount: summary.presentCount,
      lateCount: summary.lateCount,
      halfDayCount: summary.halfDayCount,
      excusedLeaveCount: summary.excusedLeaveCount,
      onDutyCount: summary.onDutyCount,
      absentCount: summary.absentCount,
      totalMarked: summary.totalMarked,
      verifiedCount: summary.verifiedCount,
      signedOffCount: summary.signedOffCount,
      draftCount: summary.draftCount,
    },
    rows: summary.rows,
    sectionLeaves,
    sectionNotices,
  };
}
