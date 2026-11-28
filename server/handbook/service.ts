import "server-only";

import {
  summarizeStudentDailyRecords,
  type AttendanceShortageSummary,
} from "@/lib/attendance/rules";
import type {
  AssignmentStatus,
  AssignmentType,
  SubmissionChannel,
  SubmissionMode,
  SubmissionStatus,
} from "@/lib/assignments/schemas";
import type {
  StudentDailyAttendanceStatus,
  StudentVerificationStatus,
} from "@/lib/attendance/schemas";
import {
  evaluatePermission,
  type VerifiedTenantContext,
} from "@/lib/auth/permissions";
import {
  buildHandbookExtensionSeams,
  canGuardianAcknowledgeEntry,
  resolveHandbookAuthoringPolicy,
  validateEntryAuthoringAgainstPolicy,
  type HandbookAuthoringPolicy,
  type HandbookExtensionSeamDto,
} from "@/lib/handbook/rules";
import {
  acknowledgeHandbookEntrySchema,
  archiveHandbookEntrySchema,
  createHandbookEntrySchema,
  HANDBOOK_CATEGORIES,
  updateHandbookEntrySchema,
  type HandbookCategory,
  type HandbookEntryStatus,
  type HandbookVisibilityScope,
} from "@/lib/handbook/schemas";
import { calculateInclusiveLeaveDays } from "@/lib/leave/rules";
import type {
  LeaveStatus,
  LeaveType,
  ParentNoticeKind,
  ParentNoticeStatus,
} from "@/lib/leave/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInstitutionTodayIsoDate } from "@/server/attendance/service";
import { recordAuditEvent } from "@/server/audit/log";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export type HandbookActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export interface HandbookSectionOptionDto {
  id: string;
  gradeCode: string;
  code: string;
  name: string;
}

export interface HandbookDirectoryStudentDto {
  studentProfileId: string;
  admissionNumber: string;
  fullName: string;
  sectionId: string | null;
  sectionCode: string | null;
  gradeCode: string | null;
  rollNumber: string | null;
  visibleEntryCount: number;
}

export interface HandbookDirectoryDto {
  context: VerifiedTenantContext;
  activeSession: { id: string; code: string; name: string } | null;
  query: string;
  selectedSectionId: string;
  sections: readonly HandbookSectionOptionDto[];
  students: readonly HandbookDirectoryStudentDto[];
  isMonitorClassmateRestricted: boolean;
  canViewSectionFilter: boolean;
}

export interface HandbookEntryDto {
  id: string;
  category: HandbookCategory;
  visibilityScope: HandbookVisibilityScope;
  teachingGroupId: string | null;
  teachingGroupLabel: string | null;
  title: string;
  body: string;
  authoredByPersonId: string;
  authoredByName: string;
  acknowledgedByGuardianAt: string | null;
  acknowledgedByGuardianName: string | null;
  status: HandbookEntryStatus;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canArchive: boolean;
  canAcknowledge: boolean;
}

export interface HandbookTeachingGroupOptionDto {
  id: string;
  code: string;
  name: string;
}

export interface HandbookAttendanceRecordDto {
  id: string;
  attendanceDate: string;
  status: StudentDailyAttendanceStatus;
  verificationStatus: StudentVerificationStatus;
  remarks: string | null;
}

export interface HandbookLeaveRecordDto {
  id: string;
  startsOn: string;
  endsOn: string;
  inclusiveDays: number;
  leaveType: LeaveType;
  reason: string;
  status: LeaveStatus;
}

export interface HandbookParentNoticeRecordDto {
  id: string;
  attendanceDate: string;
  noticeKind: ParentNoticeKind;
  message: string;
  status: ParentNoticeStatus;
  guardianName: string;
}

export interface HandbookAssignmentRecordDto {
  assignmentId: string;
  title: string;
  teachingGroupLabel: string;
  assignmentType: AssignmentType;
  submissionMode: SubmissionMode;
  assignmentStatus: AssignmentStatus;
  dueAt: string | null;
  maxMarks: number | null;
  submissionChannel: SubmissionChannel | null;
  submissionStatus: SubmissionStatus;
  marksAwarded: number | null;
  teacherRemarks: string | null;
}

export interface HandbookLiveAssignmentsSummaryDto {
  totalAssigned: number;
  completedCount: number;
  pendingCount: number;
  evaluatedCount: number;
  recentRecords: readonly HandbookAssignmentRecordDto[];
}

export type StudentHandbookDetailResult =
  | { status: "not-found" }
  | { status: "denied"; reason: string }
  | {
      status: "ok";
      context: VerifiedTenantContext;
      categoryFilter: "all" | HandbookCategory;
      includeArchived: boolean;
      student: {
        id: string;
        admissionNumber: string;
        fullName: string;
        sessionName: string | null;
        sectionCode: string | null;
        sectionName: string | null;
        gradeCode: string | null;
        streamName: string | null;
        rollNumber: string | null;
      };
      attendance: {
        policyMinimumPercent: number;
        policyWarningPercent: number;
        summary: AttendanceShortageSummary & {
          presentCount: number;
          lateCount: number;
          halfDayCount: number;
          excusedLeaveCount: number;
          onDutyCount: number;
          absentCount: number;
        };
        recentRecords: readonly HandbookAttendanceRecordDto[];
      };
      leaves: readonly HandbookLeaveRecordDto[];
      parentNotices: readonly HandbookParentNoticeRecordDto[];
      liveAssignmentsSummary: HandbookLiveAssignmentsSummaryDto;
      entries: readonly HandbookEntryDto[];
      authoringPolicy: HandbookAuthoringPolicy;
      assignedTeachingGroups: readonly HandbookTeachingGroupOptionDto[];
      isLinkedGuardian: boolean;
      isMonitorSelfView: boolean;
      extensionSeams: readonly HandbookExtensionSeamDto[];
    };

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

interface HandbookCallerScope {
  activeSession: { id: string; code: string; name: string } | null;
  isLeadership: boolean;
  hasPeopleRead: boolean;
  hodDepartmentIds: Set<string>;
  classTeacherSectionIds: Set<string>;
  subjectTeacherGroupIds: Set<string>;
  monitorSectionIds: Set<string>;
  guardianWardIds: Set<string>;
  isMonitorClassmateRestricted: boolean;
}

async function loadHandbookCallerScope(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  context: VerifiedTenantContext,
  todayDate: string,
): Promise<HandbookCallerScope> {
  const [sessionRes, guardianRes] = await Promise.all([
    supabase
      .from("academic_sessions")
      .select("id, code, name")
      .eq("institution_id", context.institutionId)
      .eq("status", "active")
      .maybeSingle<{ id: string; code: string; name: string }>(),
    supabase
      .from("student_guardians")
      .select("student_profile_id")
      .eq("institution_id", context.institutionId)
      .eq("guardian_person_id", context.personId)
      .eq("status", "active")
      .returns<{ student_profile_id: string }[]>(),
  ]);

  if (sessionRes.error) {
    throw new Error(
      `Failed to load active academic session: ${sessionRes.error.message}`,
    );
  }
  if (guardianRes.error) {
    throw new Error(
      `Failed to resolve guardian ward links: ${guardianRes.error.message}`,
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
        `Failed to load caller assignments: ${assignErr.message}`,
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

  const isLeadership =
    evaluatePermission(context, { permission: "handbook.manage" }).allowed ||
    evaluatePermission(context, { permission: "handbook.sensitive.read" })
      .allowed ||
    evaluatePermission(context, { permission: "institution.*" }).allowed;
  const hasPeopleRead = evaluatePermission(context, {
    permission: "people.read",
  }).allowed;
  const hasClassroomSummary = evaluatePermission(context, {
    permission: "classroom.summary.read",
  }).allowed;

  const guardianWardIds = new Set(
    (guardianRes.data ?? []).map((g) => g.student_profile_id),
  );

  const isMonitorClassmateRestricted =
    !isLeadership &&
    !hasPeopleRead &&
    hodDepartmentIds.size === 0 &&
    classTeacherSectionIds.size === 0 &&
    subjectTeacherGroupIds.size === 0 &&
    guardianWardIds.size === 0 &&
    (monitorSectionIds.size > 0 || hasClassroomSummary);

  return {
    activeSession: sessionRes.data ?? null,
    isLeadership,
    hasPeopleRead,
    hodDepartmentIds,
    classTeacherSectionIds,
    subjectTeacherGroupIds,
    monitorSectionIds,
    guardianWardIds,
    isMonitorClassmateRestricted,
  };
}

async function resolveStudentAuthoringState(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  institutionId: string,
  sessionId: string | null,
  studentProfileId: string,
  scope: HandbookCallerScope,
): Promise<{
  isClassTeacherOrHodForStudent: boolean;
  assignedTeachingGroups: HandbookTeachingGroupOptionDto[];
  authoringPolicy: HandbookAuthoringPolicy;
}> {
  let isClassTeacherOrHodForStudent = false;
  let assignedTeachingGroups: HandbookTeachingGroupOptionDto[] = [];

  if (sessionId) {
    const { data: enrolment, error: enrErr } = await supabase
      .from("student_session_enrolments")
      .select("id, section_id, grade:grade_levels(department_id)")
      .eq("institution_id", institutionId)
      .eq("session_id", sessionId)
      .eq("student_profile_id", studentProfileId)
      .eq("status", "active")
      .maybeSingle<{
        id: string;
        section_id: string;
        grade: { department_id: string } | { department_id: string }[] | null;
      }>();

    if (enrErr) {
      throw new Error(`Failed to resolve student enrolment: ${enrErr.message}`);
    }

    if (enrolment) {
      const deptId = unwrapJoin(enrolment.grade)?.department_id ?? "";
      isClassTeacherOrHodForStudent =
        scope.classTeacherSectionIds.has(enrolment.section_id) ||
        scope.hodDepartmentIds.has(deptId);

      const candidateGroupIds = [...scope.subjectTeacherGroupIds];
      if (candidateGroupIds.length > 0) {
        const { data: memberships, error: memErr } = await supabase
          .from("teaching_group_memberships")
          .select("teaching_group_id")
          .eq("institution_id", institutionId)
          .eq("student_enrolment_id", enrolment.id)
          .eq("status", "active")
          .in("teaching_group_id", candidateGroupIds)
          .returns<{ teaching_group_id: string }[]>();

        if (memErr) {
          throw new Error(
            `Failed to verify teaching group membership: ${memErr.message}`,
          );
        }

        const matchedGroupIds = [
          ...new Set((memberships ?? []).map((m) => m.teaching_group_id)),
        ];

        if (matchedGroupIds.length > 0) {
          const { data: groupRows, error: tgErr } = await supabase
            .from("teaching_groups")
            .select("id, code, name")
            .eq("institution_id", institutionId)
            .in("id", matchedGroupIds)
            .order("code", { ascending: true })
            .returns<HandbookTeachingGroupOptionDto[]>();

          if (tgErr) {
            throw new Error(
              `Failed to load teaching group labels: ${tgErr.message}`,
            );
          }
          assignedTeachingGroups = groupRows ?? [];
        }
      }
    }
  }

  const authoringPolicy = resolveHandbookAuthoringPolicy({
    isLeadership: scope.isLeadership,
    isClassTeacherOrHod: isClassTeacherOrHodForStudent,
    assignedTeachingGroupIds: assignedTeachingGroups.map((g) => g.id),
  });

  return {
    isClassTeacherOrHodForStudent,
    assignedTeachingGroups,
    authoringPolicy,
  };
}

export async function getHandbookDirectory(
  context: VerifiedTenantContext,
  options: { query?: string; sectionId?: string } = {},
): Promise<HandbookDirectoryDto> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadHandbookCallerScope(supabase, context, todayDate);

  const normalizedQuery = options.query?.trim() ?? "";
  const selectedSectionId =
    !scope.isMonitorClassmateRestricted && options.sectionId
      ? options.sectionId.trim()
      : "";

  let profilesQuery = supabase
    .from("student_profiles")
    .select("id, person_id, admission_number")
    .eq("institution_id", context.institutionId)
    .eq("lifecycle_status", "active")
    .order("admission_number", { ascending: true })
    .limit(120);

  if (scope.isMonitorClassmateRestricted) {
    profilesQuery = profilesQuery.eq("person_id", context.personId);
  }

  const [profilesRes, sectionsRes, entriesRes] = await Promise.all([
    profilesQuery.returns<
      { id: string; person_id: string; admission_number: string }[]
    >(),
    scope.activeSession && !scope.isMonitorClassmateRestricted
      ? supabase
          .from("sections")
          .select("id, code, name, grade:grade_levels(code)")
          .eq("institution_id", context.institutionId)
          .eq("session_id", scope.activeSession.id)
          .order("code", { ascending: true })
          .returns<
            {
              id: string;
              code: string;
              name: string;
              grade: { code: string } | { code: string }[] | null;
            }[]
          >()
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("handbook_entries")
      .select("student_profile_id")
      .eq("institution_id", context.institutionId)
      .eq("status", "active")
      .returns<{ student_profile_id: string }[]>(),
  ]);

  if (profilesRes.error) {
    throw new Error(
      `Failed to load handbook student profiles: ${profilesRes.error.message}`,
    );
  }
  if (sectionsRes.error) {
    throw new Error(`Failed to load sections: ${sectionsRes.error.message}`);
  }
  if (entriesRes.error) {
    throw new Error(
      `Failed to count visible handbook entries: ${entriesRes.error.message}`,
    );
  }

  const profileRows = profilesRes.data ?? [];
  const studentIds = profileRows.map((p) => p.id);

  let enrolments: {
    student_profile_id: string;
    section_id: string;
    roll_number: string | null;
  }[] = [];

  if (scope.activeSession && studentIds.length > 0) {
    const enrRes = await supabase
      .from("student_session_enrolments")
      .select("student_profile_id, section_id, roll_number")
      .eq("institution_id", context.institutionId)
      .eq("session_id", scope.activeSession.id)
      .eq("status", "active")
      .in("student_profile_id", studentIds)
      .returns<
        {
          student_profile_id: string;
          section_id: string;
          roll_number: string | null;
        }[]
      >();

    if (enrRes.error) {
      throw new Error(
        `Failed to load active section enrolments: ${enrRes.error.message}`,
      );
    }
    enrolments = enrRes.data ?? [];
  }

  const sections: HandbookSectionOptionDto[] = (sectionsRes.data ?? []).map(
    (sec) => ({
      id: sec.id,
      gradeCode: unwrapJoin(sec.grade)?.code ?? "",
      code: sec.code,
      name: sec.name,
    }),
  );
  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const enrolmentByStudentId = new Map(
    enrolments.map((e) => [e.student_profile_id, e]),
  );

  const visibleCountByStudent = new Map<string, number>();
  for (const row of entriesRes.data ?? []) {
    visibleCountByStudent.set(
      row.student_profile_id,
      (visibleCountByStudent.get(row.student_profile_id) ?? 0) + 1,
    );
  }

  const personNameMap = await fetchPersonNameMap(
    supabase,
    profileRows.map((p) => p.person_id),
  );

  const students: HandbookDirectoryStudentDto[] = profileRows
    .map((p) => {
      const enr = enrolmentByStudentId.get(p.id);
      const sec = enr ? sectionById.get(enr.section_id) : undefined;
      return {
        studentProfileId: p.id,
        admissionNumber: p.admission_number,
        fullName:
          personNameMap.get(p.person_id) ?? `Student (${p.admission_number})`,
        sectionId: enr?.section_id ?? null,
        sectionCode: sec?.code ?? null,
        gradeCode: sec?.gradeCode ?? null,
        rollNumber: enr?.roll_number ?? null,
        visibleEntryCount: visibleCountByStudent.get(p.id) ?? 0,
      };
    })
    .filter((s) => {
      if (selectedSectionId && s.sectionId !== selectedSectionId) {
        return false;
      }
      if (normalizedQuery) {
        const needle = normalizedQuery.toLowerCase();
        return (
          s.fullName.toLowerCase().includes(needle) ||
          s.admissionNumber.toLowerCase().includes(needle)
        );
      }
      return true;
    });

  return {
    context,
    activeSession: scope.activeSession,
    query: normalizedQuery,
    selectedSectionId,
    sections,
    students,
    isMonitorClassmateRestricted: scope.isMonitorClassmateRestricted,
    canViewSectionFilter:
      !scope.isMonitorClassmateRestricted &&
      sections.length > 0 &&
      (scope.isLeadership ||
        scope.hasPeopleRead ||
        scope.hodDepartmentIds.size > 0 ||
        scope.classTeacherSectionIds.size > 0 ||
        scope.subjectTeacherGroupIds.size > 0),
  };
}

export async function getStudentHandbookDetail(
  context: VerifiedTenantContext,
  studentProfileId: string,
  options: { categoryFilter?: string; includeArchived?: boolean } = {},
): Promise<StudentHandbookDetailResult> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadHandbookCallerScope(supabase, context, todayDate);

  const { data: studentProfile, error: spErr } = await supabase
    .from("student_profiles")
    .select("id, person_id, admission_number")
    .eq("institution_id", context.institutionId)
    .eq("id", studentProfileId)
    .maybeSingle<{ id: string; person_id: string; admission_number: string }>();

  if (spErr) {
    throw new Error(`Failed to resolve student profile: ${spErr.message}`);
  }
  if (!studentProfile) {
    return { status: "not-found" };
  }

  // Strictly block peer/classmate handbook inspection for monitor-only accounts.
  if (
    scope.isMonitorClassmateRestricted &&
    studentProfile.person_id !== context.personId
  ) {
    return {
      status: "denied",
      reason:
        "Classmate handbooks are private. Monitors may access only their own student handbook.",
    };
  }

  const categoryFilter: "all" | HandbookCategory = HANDBOOK_CATEGORIES.includes(
    options.categoryFilter as HandbookCategory,
  )
    ? (options.categoryFilter as HandbookCategory)
    : "all";
  const includeArchived = Boolean(options.includeArchived);

  const [
    enrolmentRes,
    policyRes,
    dailyRes,
    leavesRes,
    noticesRes,
    entriesRes,
    authoringState,
  ] = await Promise.all([
    scope.activeSession
      ? supabase
          .from("student_session_enrolments")
          .select(
            "id, roll_number, section:sections(code, name, grade:grade_levels(code)), stream:streams(name)",
          )
          .eq("institution_id", context.institutionId)
          .eq("session_id", scope.activeSession.id)
          .eq("student_profile_id", studentProfile.id)
          .eq("status", "active")
          .maybeSingle<{
            id: string;
            roll_number: string | null;
            section:
              | {
                  code: string;
                  name: string;
                  grade: { code: string } | { code: string }[] | null;
                }
              | {
                  code: string;
                  name: string;
                  grade: { code: string } | { code: string }[] | null;
                }[]
              | null;
            stream: { name: string } | { name: string }[] | null;
          }>()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("attendance_policies")
      .select("minimum_attendance_percent, warning_threshold_percent")
      .eq("institution_id", context.institutionId)
      .maybeSingle<{
        minimum_attendance_percent: number;
        warning_threshold_percent: number;
      }>(),
    scope.activeSession
      ? supabase
          .from("student_daily_attendance")
          .select("id, attendance_date, status, verification_status, remarks")
          .eq("institution_id", context.institutionId)
          .eq("session_id", scope.activeSession.id)
          .eq("student_profile_id", studentProfile.id)
          .order("attendance_date", { ascending: false })
          .returns<
            {
              id: string;
              attendance_date: string;
              status: StudentDailyAttendanceStatus;
              verification_status: StudentVerificationStatus;
              remarks: string | null;
            }[]
          >()
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("leave_applications")
      .select("id, starts_on, ends_on, leave_type, reason, status")
      .eq("institution_id", context.institutionId)
      .eq("applicant_kind", "student")
      .eq("student_profile_id", studentProfile.id)
      .order("starts_on", { ascending: false })
      .limit(15)
      .returns<
        {
          id: string;
          starts_on: string;
          ends_on: string;
          leave_type: LeaveType;
          reason: string;
          status: LeaveStatus;
        }[]
      >(),
    supabase
      .from("parent_attendance_notices")
      .select(
        "id, guardian_person_id, attendance_date, notice_kind, message, status",
      )
      .eq("institution_id", context.institutionId)
      .eq("student_profile_id", studentProfile.id)
      .order("attendance_date", { ascending: false })
      .limit(15)
      .returns<
        {
          id: string;
          guardian_person_id: string;
          attendance_date: string;
          notice_kind: ParentNoticeKind;
          message: string;
          status: ParentNoticeStatus;
        }[]
      >(),
    (() => {
      let query = supabase
        .from("handbook_entries")
        .select(
          "id, category, visibility_scope, teaching_group_id, title, body, authored_by_person_id, acknowledged_by_guardian_at, acknowledged_by_guardian_person_id, status, created_at, updated_at",
        )
        .eq("institution_id", context.institutionId)
        .eq("student_profile_id", studentProfile.id)
        .order("created_at", { ascending: false })
        .limit(80);
      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }
      if (!includeArchived) {
        query = query.eq("status", "active");
      }
      return query.returns<
        {
          id: string;
          category: HandbookCategory;
          visibility_scope: HandbookVisibilityScope;
          teaching_group_id: string | null;
          title: string;
          body: string;
          authored_by_person_id: string;
          acknowledged_by_guardian_at: string | null;
          acknowledged_by_guardian_person_id: string | null;
          status: HandbookEntryStatus;
          created_at: string;
          updated_at: string;
        }[]
      >();
    })(),
    resolveStudentAuthoringState(
      supabase,
      context.institutionId,
      scope.activeSession?.id ?? null,
      studentProfile.id,
      scope,
    ),
  ]);

  if (
    enrolmentRes.error ||
    policyRes.error ||
    dailyRes.error ||
    leavesRes.error ||
    noticesRes.error ||
    entriesRes.error
  ) {
    throw new Error("Failed to assemble live student handbook workspace.");
  }

  const entryRows = entriesRes.data ?? [];
  const noticeRows = noticesRes.data ?? [];
  const tgIds = [
    ...new Set(
      entryRows
        .map((e) => e.teaching_group_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [tgRes, personNameMap] = await Promise.all([
    tgIds.length > 0
      ? supabase
          .from("teaching_groups")
          .select("id, code, name")
          .eq("institution_id", context.institutionId)
          .in("id", tgIds)
          .returns<{ id: string; code: string; name: string }[]>()
      : Promise.resolve({ data: [], error: null }),
    fetchPersonNameMap(supabase, [
      studentProfile.person_id,
      ...entryRows.flatMap((e) => [
        e.authored_by_person_id,
        e.acknowledged_by_guardian_person_id,
      ]),
      ...noticeRows.map((n) => n.guardian_person_id),
    ]),
  ]);

  if (tgRes.error) {
    throw new Error(
      `Failed to resolve teaching groups for handbook: ${tgRes.error.message}`,
    );
  }

  const tgLabelById = new Map(
    (tgRes.data ?? []).map((g) => [g.id, `${g.code} — ${g.name}`]),
  );

  let liveAssignmentsSummary: HandbookLiveAssignmentsSummaryDto = {
    totalAssigned: 0,
    completedCount: 0,
    pendingCount: 0,
    evaluatedCount: 0,
    recentRecords: [],
  };

  if (scope.activeSession && enrolmentRes.data?.id) {
    const [tgMembershipRes, studentSubmissionsRes] = await Promise.all([
      supabase
        .from("teaching_group_memberships")
        .select("teaching_group_id")
        .eq("institution_id", context.institutionId)
        .eq("student_enrolment_id", enrolmentRes.data.id)
        .eq("status", "active")
        .returns<{ teaching_group_id: string }[]>(),
      supabase
        .from("assignment_submissions")
        .select(
          "assignment_id, submission_channel, status, marks_awarded, teacher_remarks",
        )
        .eq("institution_id", context.institutionId)
        .eq("student_profile_id", studentProfile.id)
        .eq("student_enrolment_id", enrolmentRes.data.id)
        .returns<
          {
            assignment_id: string;
            submission_channel: SubmissionChannel;
            status: SubmissionStatus;
            marks_awarded: number | null;
            teacher_remarks: string | null;
          }[]
        >(),
    ]);

    if (tgMembershipRes.error) {
      throw new Error(
        `Failed to resolve student teaching group memberships: ${tgMembershipRes.error.message}`,
      );
    }
    if (studentSubmissionsRes.error) {
      throw new Error(
        `Failed to resolve student assignment submissions: ${studentSubmissionsRes.error.message}`,
      );
    }

    const enrolledTgIds = [
      ...new Set(
        (tgMembershipRes.data ?? []).map((row) => row.teaching_group_id),
      ),
    ];

    if (enrolledTgIds.length > 0) {
      const [assignmentsRes, missingTgLabelsRes] = await Promise.all([
        supabase
          .from("assignments")
          .select(
            "id, teaching_group_id, title, assignment_type, submission_mode, max_marks, due_at, status, created_at",
          )
          .eq("institution_id", context.institutionId)
          .eq("session_id", scope.activeSession.id)
          .in("teaching_group_id", enrolledTgIds)
          .in("status", ["published", "closed"])
          .order("due_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(30)
          .returns<
            {
              id: string;
              teaching_group_id: string;
              title: string;
              assignment_type: AssignmentType;
              submission_mode: SubmissionMode;
              max_marks: number | null;
              due_at: string | null;
              status: AssignmentStatus;
              created_at: string;
            }[]
          >(),
        (() => {
          const missingIds = enrolledTgIds.filter((id) => !tgLabelById.has(id));
          if (missingIds.length === 0) {
            return Promise.resolve({ data: [], error: null });
          }
          return supabase
            .from("teaching_groups")
            .select("id, code, name")
            .eq("institution_id", context.institutionId)
            .in("id", missingIds)
            .returns<{ id: string; code: string; name: string }[]>();
        })(),
      ]);

      if (assignmentsRes.error) {
        throw new Error(
          `Failed to load student assignments for handbook: ${assignmentsRes.error.message}`,
        );
      }
      if (missingTgLabelsRes.error) {
        throw new Error(
          `Failed to resolve teaching group labels for assignments: ${missingTgLabelsRes.error.message}`,
        );
      }

      for (const tgRow of missingTgLabelsRes.data ?? []) {
        tgLabelById.set(tgRow.id, `${tgRow.code} — ${tgRow.name}`);
      }

      const submissionByAssignmentId = new Map(
        (studentSubmissionsRes.data ?? []).map((sub) => [sub.assignment_id, sub]),
      );

      const assignmentRows = assignmentsRes.data ?? [];
      let completedCount = 0;
      let evaluatedCount = 0;

      const records: HandbookAssignmentRecordDto[] = assignmentRows.map(
        (asg) => {
          const sub = submissionByAssignmentId.get(asg.id);
          const subStatus: SubmissionStatus = sub?.status ?? "assigned";
          if (
            subStatus === "submitted" ||
            subStatus === "late_submitted" ||
            subStatus === "completed_offline" ||
            subStatus === "evaluated"
          ) {
            completedCount += 1;
          }
          if (subStatus === "evaluated") {
            evaluatedCount += 1;
          }

          return {
            assignmentId: asg.id,
            title: asg.title,
            teachingGroupLabel:
              tgLabelById.get(asg.teaching_group_id) ?? "Teaching Group",
            assignmentType: asg.assignment_type,
            submissionMode: asg.submission_mode,
            assignmentStatus: asg.status,
            dueAt: asg.due_at,
            maxMarks: asg.max_marks !== null ? Number(asg.max_marks) : null,
            submissionChannel: sub?.submission_channel ?? null,
            submissionStatus: subStatus,
            marksAwarded:
              sub?.marks_awarded !== null && sub?.marks_awarded !== undefined
                ? Number(sub.marks_awarded)
                : null,
            teacherRemarks: sub?.teacher_remarks ?? null,
          };
        },
      );

      liveAssignmentsSummary = {
        totalAssigned: assignmentRows.length,
        completedCount,
        pendingCount: Math.max(0, assignmentRows.length - completedCount),
        evaluatedCount,
        recentRecords: records.slice(0, 15),
      };
    }
  }

  const policyMin = policyRes.data
    ? Number(policyRes.data.minimum_attendance_percent)
    : 75;
  const policyWarn = policyRes.data
    ? Number(policyRes.data.warning_threshold_percent)
    : 80;
  const dailyRows = dailyRes.data ?? [];
  const attendanceSummary = summarizeStudentDailyRecords(
    dailyRows.map((d) => d.status),
    {
      minimumAttendancePercent: policyMin,
      warningThresholdPercent: policyWarn,
    },
  );

  const isLinkedGuardian = scope.guardianWardIds.has(studentProfile.id);

  const entries: HandbookEntryDto[] = entryRows.map((row) => {
    const canManageEntry =
      scope.isLeadership ||
      (row.visibility_scope !== "leadership_only" &&
        (authoringState.isClassTeacherOrHodForStudent ||
          row.authored_by_person_id === context.personId));

    return {
      id: row.id,
      category: row.category,
      visibilityScope: row.visibility_scope,
      teachingGroupId: row.teaching_group_id,
      teachingGroupLabel: row.teaching_group_id
        ? (tgLabelById.get(row.teaching_group_id) ?? null)
        : null,
      title: row.title,
      body: row.body,
      authoredByPersonId: row.authored_by_person_id,
      authoredByName:
        personNameMap.get(row.authored_by_person_id) ?? "School Staff",
      acknowledgedByGuardianAt: row.acknowledged_by_guardian_at,
      acknowledgedByGuardianName: row.acknowledged_by_guardian_person_id
        ? (personNameMap.get(row.acknowledged_by_guardian_person_id) ?? null)
        : null,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      canEdit: canManageEntry && row.status === "active",
      canArchive: canManageEntry && row.status === "active",
      canAcknowledge: canGuardianAcknowledgeEntry({
        isLinkedGuardian,
        status: row.status,
        visibilityScope: row.visibility_scope,
        alreadyAcknowledged: Boolean(row.acknowledged_by_guardian_at),
      }),
    };
  });

  const sectionJoin = unwrapJoin(enrolmentRes.data?.section);
  const gradeJoin = unwrapJoin(sectionJoin?.grade);
  const streamJoin = unwrapJoin(enrolmentRes.data?.stream);

  return {
    status: "ok",
    context,
    categoryFilter,
    includeArchived,
    student: {
      id: studentProfile.id,
      admissionNumber: studentProfile.admission_number,
      fullName:
        personNameMap.get(studentProfile.person_id) ??
        `Student (${studentProfile.admission_number})`,
      sessionName: scope.activeSession?.name ?? null,
      sectionCode: sectionJoin?.code ?? null,
      sectionName: sectionJoin?.name ?? null,
      gradeCode: gradeJoin?.code ?? null,
      streamName: streamJoin?.name ?? null,
      rollNumber: enrolmentRes.data?.roll_number ?? null,
    },
    attendance: {
      policyMinimumPercent: policyMin,
      policyWarningPercent: policyWarn,
      summary: attendanceSummary,
      recentRecords: dailyRows.slice(0, 10).map((d) => ({
        id: d.id,
        attendanceDate: d.attendance_date,
        status: d.status,
        verificationStatus: d.verification_status,
        remarks: d.remarks,
      })),
    },
    leaves: (leavesRes.data ?? []).map((l) => ({
      id: l.id,
      startsOn: l.starts_on,
      endsOn: l.ends_on,
      inclusiveDays: calculateInclusiveLeaveDays(l.starts_on, l.ends_on),
      leaveType: l.leave_type,
      reason: l.reason,
      status: l.status,
    })),
    parentNotices: noticeRows.map((n) => ({
      id: n.id,
      attendanceDate: n.attendance_date,
      noticeKind: n.notice_kind,
      message: n.message,
      status: n.status,
      guardianName: personNameMap.get(n.guardian_person_id) ?? "Guardian",
    })),
    liveAssignmentsSummary,
    entries,
    authoringPolicy: authoringState.authoringPolicy,
    assignedTeachingGroups: authoringState.assignedTeachingGroups,
    isLinkedGuardian,
    isMonitorSelfView:
      scope.isMonitorClassmateRestricted &&
      studentProfile.person_id === context.personId,
    extensionSeams: buildHandbookExtensionSeams(),
  };
}

export async function createHandbookEntry(
  slug: string,
  rawInput: unknown,
): Promise<HandbookActionResult<{ entryId: string }>> {
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

  const parsed = createHandbookEntrySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid handbook entry payload.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadHandbookCallerScope(supabase, context, todayDate);

  if (!scope.activeSession) {
    return {
      ok: false,
      error: "An active academic session is required before authoring handbook entries.",
      status: 400,
    };
  }

  const authoringState = await resolveStudentAuthoringState(
    supabase,
    context.institutionId,
    scope.activeSession.id,
    parsed.data.studentProfileId,
    scope,
  );

  const policyCheck = validateEntryAuthoringAgainstPolicy(
    {
      category: parsed.data.category,
      visibilityScope: parsed.data.visibilityScope,
      teachingGroupId: parsed.data.teachingGroupId ?? null,
    },
    authoringState.authoringPolicy,
  );

  if (!policyCheck.ok) {
    return { ok: false, error: policyCheck.error, status: 403 };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("handbook_entries")
    .insert({
      institution_id: context.institutionId,
      session_id: scope.activeSession.id,
      student_profile_id: parsed.data.studentProfileId,
      category: parsed.data.category,
      visibility_scope: parsed.data.visibilityScope,
      teaching_group_id: parsed.data.teachingGroupId ?? null,
      title: parsed.data.title,
      body: parsed.data.body,
      authored_by_person_id: context.personId,
      status: "active",
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: insertErr?.message ?? "Failed to record handbook entry.",
      status: 400,
    };
  }

  // Log strictly metadata — never copy sensitive note bodies into audit_events.
  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "handbook.entry_created",
    entityType: "handbook_entries",
    entityId: inserted.id,
    afterState: {
      studentProfileId: parsed.data.studentProfileId,
      category: parsed.data.category,
      visibilityScope: parsed.data.visibilityScope,
      teachingGroupId: parsed.data.teachingGroupId ?? null,
      title: parsed.data.title,
      status: "active",
    },
  });

  return { ok: true, data: { entryId: inserted.id } };
}

export async function updateHandbookEntry(
  slug: string,
  rawInput: unknown,
): Promise<HandbookActionResult<{ entryId: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = updateHandbookEntrySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid handbook entry update.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadHandbookCallerScope(supabase, context, todayDate);

  const { data: existing, error: fetchErr } = await supabase
    .from("handbook_entries")
    .select(
      "id, student_profile_id, category, visibility_scope, teaching_group_id, title, authored_by_person_id, status",
    )
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.entryId)
    .eq("student_profile_id", parsed.data.studentProfileId)
    .maybeSingle<{
      id: string;
      student_profile_id: string;
      category: HandbookCategory;
      visibility_scope: HandbookVisibilityScope;
      teaching_group_id: string | null;
      title: string;
      authored_by_person_id: string;
      status: HandbookEntryStatus;
    }>();

  if (fetchErr || !existing) {
    return {
      ok: false,
      error: "Handbook entry not found or inaccessible.",
      status: 404,
    };
  }

  if (existing.status !== "active") {
    return {
      ok: false,
      error: "Archived handbook entries cannot be edited.",
      status: 400,
    };
  }

  const authoringState = await resolveStudentAuthoringState(
    supabase,
    context.institutionId,
    scope.activeSession?.id ?? null,
    existing.student_profile_id,
    scope,
  );

  // Guardians have RLS update solely for acknowledgement, never staff edits.
  const canEdit =
    scope.isLeadership ||
    (existing.visibility_scope !== "leadership_only" &&
      (authoringState.isClassTeacherOrHodForStudent ||
        existing.authored_by_person_id === context.personId));

  if (!canEdit) {
    return {
      ok: false,
      error: "You do not have permission to edit this handbook entry.",
      status: 403,
    };
  }

  const nextVisibility = parsed.data.visibilityScope ?? existing.visibility_scope;
  if (nextVisibility !== existing.visibility_scope) {
    const scopeCheck = validateEntryAuthoringAgainstPolicy(
      {
        category: existing.category,
        visibilityScope: nextVisibility,
        teachingGroupId: existing.teaching_group_id,
      },
      authoringState.authoringPolicy,
    );
    if (!scopeCheck.ok) {
      return { ok: false, error: scopeCheck.error, status: 403 };
    }
  }

  const { error: updateErr } = await supabase
    .from("handbook_entries")
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      visibility_scope: nextVisibility,
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
    action: "handbook.entry_updated",
    entityType: "handbook_entries",
    entityId: existing.id,
    beforeState: {
      title: existing.title,
      visibilityScope: existing.visibility_scope,
    },
    afterState: {
      title: parsed.data.title,
      visibilityScope: nextVisibility,
    },
  });

  return { ok: true, data: { entryId: existing.id } };
}

export async function archiveHandbookEntry(
  slug: string,
  rawInput: unknown,
): Promise<HandbookActionResult<{ entryId: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = archiveHandbookEntrySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid archive payload.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadHandbookCallerScope(supabase, context, todayDate);

  const { data: existing, error: fetchErr } = await supabase
    .from("handbook_entries")
    .select(
      "id, student_profile_id, category, visibility_scope, title, authored_by_person_id, status",
    )
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.entryId)
    .eq("student_profile_id", parsed.data.studentProfileId)
    .maybeSingle<{
      id: string;
      student_profile_id: string;
      category: HandbookCategory;
      visibility_scope: HandbookVisibilityScope;
      title: string;
      authored_by_person_id: string;
      status: HandbookEntryStatus;
    }>();

  if (fetchErr || !existing) {
    return {
      ok: false,
      error: "Handbook entry not found or inaccessible.",
      status: 404,
    };
  }

  if (existing.status === "archived") {
    return {
      ok: false,
      error: "Handbook entry is already archived.",
      status: 400,
    };
  }

  const authoringState = await resolveStudentAuthoringState(
    supabase,
    context.institutionId,
    scope.activeSession?.id ?? null,
    existing.student_profile_id,
    scope,
  );

  const canArchive =
    scope.isLeadership ||
    (existing.visibility_scope !== "leadership_only" &&
      (authoringState.isClassTeacherOrHodForStudent ||
        existing.authored_by_person_id === context.personId));

  if (!canArchive) {
    return {
      ok: false,
      error: "You do not have permission to archive this handbook entry.",
      status: 403,
    };
  }

  const { error: updateErr } = await supabase
    .from("handbook_entries")
    .update({ status: "archived" })
    .eq("institution_id", context.institutionId)
    .eq("id", existing.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message, status: 400 };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "handbook.entry_archived",
    entityType: "handbook_entries",
    entityId: existing.id,
    beforeState: {
      status: existing.status,
      category: existing.category,
      visibilityScope: existing.visibility_scope,
    },
    afterState: { status: "archived" },
  });

  return { ok: true, data: { entryId: existing.id } };
}

export async function acknowledgeHandbookEntry(
  slug: string,
  rawInput: unknown,
): Promise<HandbookActionResult<{ entryId: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = acknowledgeHandbookEntrySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid acknowledgement payload.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadHandbookCallerScope(supabase, context, todayDate);

  const isLinkedGuardian = scope.guardianWardIds.has(
    parsed.data.studentProfileId,
  );
  if (!isLinkedGuardian) {
    return {
      ok: false,
      error: "Only an active linked guardian may acknowledge this entry.",
      status: 403,
    };
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("handbook_entries")
    .select(
      "id, student_profile_id, category, visibility_scope, status, acknowledged_by_guardian_at",
    )
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.entryId)
    .eq("student_profile_id", parsed.data.studentProfileId)
    .maybeSingle<{
      id: string;
      student_profile_id: string;
      category: HandbookCategory;
      visibility_scope: HandbookVisibilityScope;
      status: HandbookEntryStatus;
      acknowledged_by_guardian_at: string | null;
    }>();

  if (fetchErr || !existing) {
    return {
      ok: false,
      error: "Handbook entry not found or inaccessible.",
      status: 404,
    };
  }

  if (
    !canGuardianAcknowledgeEntry({
      isLinkedGuardian,
      status: existing.status,
      visibilityScope: existing.visibility_scope,
      alreadyAcknowledged: Boolean(existing.acknowledged_by_guardian_at),
    })
  ) {
    return {
      ok: false,
      error:
        "This handbook entry is not eligible for guardian acknowledgement or is already acknowledged.",
      status: 400,
    };
  }

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("handbook_entries")
    .update({
      acknowledged_by_guardian_at: nowIso,
      acknowledged_by_guardian_person_id: context.personId,
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
    action: "handbook.entry_guardian_acknowledged",
    entityType: "handbook_entries",
    entityId: existing.id,
    afterState: {
      studentProfileId: existing.student_profile_id,
      category: existing.category,
      acknowledgedByGuardianPersonId: context.personId,
      acknowledgedByGuardianAt: nowIso,
    },
  });

  return { ok: true, data: { entryId: existing.id } };
}
