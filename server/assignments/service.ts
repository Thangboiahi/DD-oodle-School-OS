import "server-only";

import { z } from "zod";
import {
  buildMonitorBoardAssignmentView,
  canStudentSubmitAssignment,
  canTransitionAssignmentStatus,
  computeAssignmentCompletionMetrics,
  sanitizeObjectiveQuestionsForLearner,
  scoreObjectiveQuiz,
  type AssignmentCompletionMetrics,
  type MonitorBoardAssignmentView,
  type ObjectiveQuizScoreResult,
} from "@/lib/assignments/rules";
import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_TYPES,
  createAssignmentSchema,
  evaluateSubmissionSchema,
  normalizeOptionalDueAt,
  objectiveQuestionSchema,
  recordOfflineCompletionSchema,
  submitStudentAssignmentSchema,
  transitionAssignmentStatusSchema,
  type AssignmentStatus,
  type AssignmentType,
  type EvaluationMode,
  type ObjectiveQuestion,
  type SanitizedObjectiveQuestion,
  type SubmissionChannel,
  type SubmissionMode,
  type SubmissionStatus,
} from "@/lib/assignments/schemas";
import {
  evaluatePermission,
  type VerifiedTenantContext,
} from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/server/audit/log";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export type AssignmentActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export interface AssignmentTeachingGroupOptionDto {
  id: string;
  code: string;
  name: string;
  subjectOfferingId: string;
  subjectLabel: string;
  departmentId: string;
}

export interface AssignmentSyllabusOptionDto {
  id: string;
  subjectOfferingId: string;
  code: string;
  title: string;
}

export interface AssignmentWorkspaceItemDto {
  id: string;
  teachingGroupId: string;
  teachingGroupLabel: string;
  subjectLabel: string;
  syllabusItemLabel: string | null;
  title: string;
  assignmentType: AssignmentType;
  submissionMode: SubmissionMode;
  evaluationMode: EvaluationMode;
  maxMarks: number | null;
  dueAt: string | null;
  allowLateSubmission: boolean;
  status: AssignmentStatus;
  authoredByName: string;
  completionMetrics: AssignmentCompletionMetrics | null;
  learnerSubmissionStatus: SubmissionStatus | null;
  learnerMarksAwarded: number | null;
}

export interface AssignmentsWorkspaceDto {
  context: VerifiedTenantContext;
  activeSession: { id: string; code: string; name: string } | null;
  teachingGroups: readonly AssignmentTeachingGroupOptionDto[];
  writableTeachingGroups: readonly AssignmentTeachingGroupOptionDto[];
  syllabusOptions: readonly AssignmentSyllabusOptionDto[];
  selectedGroupId: string;
  statusFilter: AssignmentStatus | "all";
  typeFilter: AssignmentType | "all";
  isMonitorBoardOnly: boolean;
  isOversightReadOnly: boolean;
  isStudentOrGuardian: boolean;
  canCreateAssignment: boolean;
  monitorBoardAssignments: readonly MonitorBoardAssignmentView[];
  assignments: readonly AssignmentWorkspaceItemDto[];
}

export interface AssignmentCommentDto {
  id: string;
  body: string;
  isInternalStaffNote: boolean;
  authoredByName: string;
  createdAt: string;
}

export interface AssignmentRosterEntryDto {
  studentEnrolmentId: string;
  studentProfileId: string;
  admissionNumber: string;
  studentName: string;
  sectionLabel: string;
  rollNumber: string | null;
  submissionId: string | null;
  submissionChannel: SubmissionChannel | null;
  status: SubmissionStatus;
  submittedAt: string | null;
  responseText: string | null;
  objectiveAnswers: Readonly<Record<string, number>>;
  autoMcqPreview: ObjectiveQuizScoreResult | null;
  attachmentStoragePath: string | null;
  marksAwarded: number | null;
  teacherRemarks: string | null;
  evaluatedByName: string | null;
}

export interface AssignmentLearnerSubmissionDto {
  submissionId: string;
  studentProfileId: string;
  studentName: string;
  admissionNumber: string;
  submissionChannel: SubmissionChannel;
  status: SubmissionStatus;
  submittedAt: string | null;
  responseText: string | null;
  objectiveAnswers: Readonly<Record<string, number>>;
  attachmentStoragePath: string | null;
  marksAwarded: number | null;
  teacherRemarks: string | null;
  evaluatedByName: string | null;
  quizSummary: {
    totalMarks: number;
    marksAwarded: number;
    correctCount: number;
    totalQuestions: number;
  } | null;
  quizBreakdown: ObjectiveQuizScoreResult["breakdown"] | null;
}

export type AssignmentDetailResult =
  | { status: "not-found" }
  | {
      status: "ok";
      context: VerifiedTenantContext;
      assignment: {
        id: string;
        sessionId: string;
        teachingGroupId: string;
        teachingGroupLabel: string;
        subjectLabel: string;
        syllabusItemLabel: string | null;
        title: string;
        instructions: string;
        assignmentType: AssignmentType;
        submissionMode: SubmissionMode;
        evaluationMode: EvaluationMode;
        maxMarks: number | null;
        issuedAt: string;
        dueAt: string | null;
        allowLateSubmission: boolean;
        status: AssignmentStatus;
        authoredByName: string;
        questions: readonly SanitizedObjectiveQuestion[];
      };
      isMonitorBoardOnly: boolean;
      isOversightReadOnly: boolean;
      canManageAssignment: boolean;
      canComment: boolean;
      canPostInternalNote: boolean;
      completionMetrics: AssignmentCompletionMetrics | null;
      roster: readonly AssignmentRosterEntryDto[];
      canStudentSubmit: boolean;
      submitBlockReason: string | null;
      learnerSubmissions: readonly AssignmentLearnerSubmissionDto[];
      comments: readonly AssignmentCommentDto[];
    };

interface CallerAssignmentScope {
  activeSession: { id: string; code: string; name: string } | null;
  isLeadership: boolean;
  hodDepartmentIds: Set<string>;
  classTeacherSectionIds: Set<string>;
  subjectTeacherGroupIds: Set<string>;
  monitorSectionIds: Set<string>;
  guardianWardIds: Set<string>;
  ownStudentProfile: { id: string; admissionNumber: string } | null;
  isStaffOrLeadership: boolean;
  isMonitorBoardOnly: boolean;
  isOversightReadOnly: boolean;
  isStudentOrGuardian: boolean;
}

function getInstitutionTodayIsoDate(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
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
    ...new Set(personIds.filter((id): id is string => Boolean(id))),
  ];
  const map = new Map<string, string>();
  if (uniqueIds.length === 0) return map;

  const { data, error } = await supabase
    .from("persons")
    .select("id, full_name, display_name")
    .in("id", uniqueIds)
    .returns<
      { id: string; full_name: string; display_name: string | null }[]
    >();

  if (error) {
    throw new Error(`Failed to resolve person names: ${error.message}`);
  }

  for (const row of data ?? []) {
    map.set(
      row.id,
      row.display_name?.trim() || row.full_name || row.id.slice(0, 8),
    );
  }
  return map;
}

function parseObjectiveQuestionsJsonb(raw: unknown): ObjectiveQuestion[] {
  if (!Array.isArray(raw)) return [];
  const parsed: ObjectiveQuestion[] = [];
  for (const item of raw) {
    const check = objectiveQuestionSchema.safeParse(item);
    if (check.success) {
      parsed.push(check.data);
    }
  }
  return parsed;
}

function parseObjectiveAnswersJsonb(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number" && Number.isInteger(v) && v >= 0) {
      result[k] = v;
    }
  }
  return result;
}

async function loadCallerAssignmentScope(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  context: VerifiedTenantContext,
  todayDate: string,
): Promise<CallerAssignmentScope> {
  const [sessionRes, guardianRes, ownStudentRes, staffProfileRes] =
    await Promise.all([
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
      supabase
        .from("student_profiles")
        .select("id, admission_number")
        .eq("institution_id", context.institutionId)
        .eq("person_id", context.personId)
        .eq("lifecycle_status", "active")
        .maybeSingle<{ id: string; admission_number: string }>(),
      supabase
        .from("staff_profiles")
        .select("id")
        .eq("institution_id", context.institutionId)
        .eq("person_id", context.personId)
        .eq("lifecycle_status", "active")
        .maybeSingle<{ id: string }>(),
    ]);

  if (sessionRes.error) {
    throw new Error(
      `Failed to load active academic session: ${sessionRes.error.message}`,
    );
  }
  if (guardianRes.error) {
    throw new Error(
      `Failed to load guardian links: ${guardianRes.error.message}`,
    );
  }
  if (ownStudentRes.error) {
    throw new Error(
      `Failed to load student profile: ${ownStudentRes.error.message}`,
    );
  }
  if (staffProfileRes.error) {
    throw new Error(
      `Failed to load staff profile: ${staffProfileRes.error.message}`,
    );
  }

  const hodDepartmentIds = new Set<string>();
  const classTeacherSectionIds = new Set<string>();
  const subjectTeacherGroupIds = new Set<string>();
  const monitorSectionIds = new Set<string>();

  if (sessionRes.data) {
    const { data: aaRows, error: aaErr } = await supabase
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

    if (aaErr) {
      throw new Error(`Failed to load academic assignments: ${aaErr.message}`);
    }

    for (const row of aaRows ?? []) {
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
    evaluatePermission(context, { permission: "academics.manage" }).allowed ||
    evaluatePermission(context, { permission: "institution.*" }).allowed;
  const hasPeopleRead = evaluatePermission(context, {
    permission: "people.read",
  }).allowed;
  const hasClassroomSummary = evaluatePermission(context, {
    permission: "classroom.summary.read",
  }).allowed;

  const guardianWardIds = new Set(
    (guardianRes.data ?? []).map((row) => row.student_profile_id),
  );
  const ownStudentProfile = ownStudentRes.data
    ? {
        id: ownStudentRes.data.id,
        admissionNumber: ownStudentRes.data.admission_number,
      }
    : null;

  const isStaffOrLeadership =
    isLeadership ||
    hasPeopleRead ||
    Boolean(staffProfileRes.data) ||
    hodDepartmentIds.size > 0 ||
    classTeacherSectionIds.size > 0 ||
    subjectTeacherGroupIds.size > 0;

  const isMonitorBoardOnly =
    !isStaffOrLeadership &&
    guardianWardIds.size === 0 &&
    (monitorSectionIds.size > 0 || hasClassroomSummary);

  const isOversightReadOnly =
    isStaffOrLeadership &&
    !isLeadership &&
    subjectTeacherGroupIds.size === 0 &&
    (hodDepartmentIds.size > 0 || classTeacherSectionIds.size > 0);

  const isStudentOrGuardian =
    !isStaffOrLeadership &&
    !isMonitorBoardOnly &&
    (Boolean(ownStudentProfile) || guardianWardIds.size > 0);

  return {
    activeSession: sessionRes.data ?? null,
    isLeadership,
    hodDepartmentIds,
    classTeacherSectionIds,
    subjectTeacherGroupIds,
    monitorSectionIds,
    guardianWardIds,
    ownStudentProfile,
    isStaffOrLeadership,
    isMonitorBoardOnly,
    isOversightReadOnly,
    isStudentOrGuardian,
  };
}

async function loadTeachingGroupsCatalog(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  institutionId: string,
  sessionId: string | null,
): Promise<{
  groups: AssignmentTeachingGroupOptionDto[];
  groupById: Map<string, AssignmentTeachingGroupOptionDto>;
}> {
  let query = supabase
    .from("teaching_groups")
    .select(
      "id, code, name, subject_offering_id, offering:subject_offerings(grade:grade_levels(code, department_id), subject:subjects(code, name))",
    )
    .eq("institution_id", institutionId)
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data, error } = await query.returns<
    {
      id: string;
      code: string;
      name: string;
      subject_offering_id: string;
      offering:
        | {
            grade:
              | { code: string; department_id: string }
              | { code: string; department_id: string }[]
              | null;
            subject:
              | { code: string; name: string }
              | { code: string; name: string }[]
              | null;
          }
        | {
            grade:
              | { code: string; department_id: string }
              | { code: string; department_id: string }[]
              | null;
            subject:
              | { code: string; name: string }
              | { code: string; name: string }[]
              | null;
          }[]
        | null;
    }[]
  >();

  if (error) {
    throw new Error(`Failed to load teaching groups: ${error.message}`);
  }

  const groups: AssignmentTeachingGroupOptionDto[] = (data ?? []).map((row) => {
    const offering = unwrapJoin(row.offering);
    const grade = unwrapJoin(offering?.grade);
    const subject = unwrapJoin(offering?.subject);
    const subjectLabel = subject
      ? `${grade?.code ? `${grade.code} ` : ""}${subject.name} (${subject.code})`
      : row.name;

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      subjectOfferingId: row.subject_offering_id,
      subjectLabel,
      departmentId: grade?.department_id ?? "",
    };
  });

  return {
    groups,
    groupById: new Map(groups.map((g) => [g.id, g])),
  };
}

export async function getAssignmentsWorkspace(
  context: VerifiedTenantContext,
  options: {
    teachingGroupId?: string;
    statusFilter?: string;
    typeFilter?: string;
  } = {},
): Promise<AssignmentsWorkspaceDto> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerAssignmentScope(supabase, context, todayDate);

  const selectedGroupId = z.string().uuid().safeParse(options.teachingGroupId)
    .success
    ? (options.teachingGroupId as string)
    : "all";
  const statusFilter: AssignmentStatus | "all" =
    options.statusFilter &&
    (ASSIGNMENT_STATUSES as readonly string[]).includes(options.statusFilter)
      ? (options.statusFilter as AssignmentStatus)
      : "all";
  const typeFilter: AssignmentType | "all" =
    options.typeFilter &&
    (ASSIGNMENT_TYPES as readonly string[]).includes(options.typeFilter)
      ? (options.typeFilter as AssignmentType)
      : "all";

  const { groups, groupById } = await loadTeachingGroupsCatalog(
    supabase,
    context.institutionId,
    scope.activeSession?.id ?? null,
  );

  const writableTeachingGroups = scope.isLeadership
    ? groups
    : groups.filter((g) => scope.subjectTeacherGroupIds.has(g.id));

  let assignmentsQuery = supabase
    .from("assignments")
    .select(
      "id, teaching_group_id, syllabus_item_id, title, assignment_type, submission_mode, evaluation_mode, max_marks, due_at, allow_late_submission, status, authored_by_person_id, created_at",
    )
    .eq("institution_id", context.institutionId)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (scope.activeSession) {
    assignmentsQuery = assignmentsQuery.eq("session_id", scope.activeSession.id);
  }
  if (selectedGroupId !== "all") {
    assignmentsQuery = assignmentsQuery.eq("teaching_group_id", selectedGroupId);
  }
  if (statusFilter !== "all" && !scope.isMonitorBoardOnly) {
    assignmentsQuery = assignmentsQuery.eq("status", statusFilter);
  }
  if (typeFilter !== "all") {
    assignmentsQuery = assignmentsQuery.eq("assignment_type", typeFilter);
  }

  const offeringIdsForSyllabus = [
    ...new Set(writableTeachingGroups.map((g) => g.subjectOfferingId)),
  ];

  const [assignmentsRes, syllabusRes] = await Promise.all([
    assignmentsQuery.returns<
      {
        id: string;
        teaching_group_id: string;
        syllabus_item_id: string | null;
        title: string;
        assignment_type: AssignmentType;
        submission_mode: SubmissionMode;
        evaluation_mode: EvaluationMode;
        max_marks: number | null;
        due_at: string | null;
        allow_late_submission: boolean;
        status: AssignmentStatus;
        authored_by_person_id: string;
        created_at: string;
      }[]
    >(),
    offeringIdsForSyllabus.length > 0 && scope.activeSession
      ? supabase
          .from("syllabus_items")
          .select("id, subject_offering_id, code, title")
          .eq("institution_id", context.institutionId)
          .eq("session_id", scope.activeSession.id)
          .in("subject_offering_id", offeringIdsForSyllabus)
          .order("sequence_no", { ascending: true })
          .returns<
            {
              id: string;
              subject_offering_id: string;
              code: string;
              title: string;
            }[]
          >()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (assignmentsRes.error) {
    throw new Error(
      `Failed to load assignments: ${assignmentsRes.error.message}`,
    );
  }
  if (syllabusRes.error) {
    throw new Error(
      `Failed to load syllabus link options: ${syllabusRes.error.message}`,
    );
  }

  const rawAssignments = assignmentsRes.data ?? [];

  if (scope.isMonitorBoardOnly) {
    const boardSources = rawAssignments.map((row) => {
      const tg = groupById.get(row.teaching_group_id);
      return {
        id: row.id,
        title: row.title,
        teachingGroupLabel: tg ? `${tg.code} — ${tg.name}` : "Teaching Group",
        subjectLabel: tg?.subjectLabel ?? "Subject",
        assignmentType: row.assignment_type,
        submissionMode: row.submission_mode,
        status: row.status,
        dueAt: row.due_at,
        maxMarks: row.max_marks !== null ? Number(row.max_marks) : null,
      };
    });

    return {
      context,
      activeSession: scope.activeSession,
      teachingGroups: groups,
      writableTeachingGroups: [],
      syllabusOptions: [],
      selectedGroupId,
      statusFilter,
      typeFilter,
      isMonitorBoardOnly: true,
      isOversightReadOnly: false,
      isStudentOrGuardian: false,
      canCreateAssignment: false,
      monitorBoardAssignments: buildMonitorBoardAssignmentView(boardSources),
      assignments: [],
    };
  }

  const assignmentIds = rawAssignments.map((a) => a.id);
  const syllabusIds = [
    ...new Set(
      rawAssignments
        .map((a) => a.syllabus_item_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const visibleTgIds = [
    ...new Set(rawAssignments.map((a) => a.teaching_group_id)),
  ];

  const [
    personNameMap,
    syllabusLabelsRes,
    submissionsRes,
    tgMemberCountsRes,
  ] = await Promise.all([
    fetchPersonNameMap(
      supabase,
      rawAssignments.map((a) => a.authored_by_person_id),
    ),
    syllabusIds.length > 0
      ? supabase
          .from("syllabus_items")
          .select("id, code, title")
          .eq("institution_id", context.institutionId)
          .in("id", syllabusIds)
          .returns<{ id: string; code: string; title: string }[]>()
      : Promise.resolve({ data: [], error: null }),
    assignmentIds.length > 0
      ? supabase
          .from("assignment_submissions")
          .select("assignment_id, student_profile_id, status, marks_awarded")
          .eq("institution_id", context.institutionId)
          .in("assignment_id", assignmentIds)
          .returns<
            {
              assignment_id: string;
              student_profile_id: string;
              status: SubmissionStatus;
              marks_awarded: number | null;
            }[]
          >()
      : Promise.resolve({ data: [], error: null }),
    scope.isStaffOrLeadership && visibleTgIds.length > 0
      ? supabase
          .from("teaching_group_memberships")
          .select("teaching_group_id")
          .eq("institution_id", context.institutionId)
          .in("teaching_group_id", visibleTgIds)
          .eq("status", "active")
          .returns<{ teaching_group_id: string }[]>()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (syllabusLabelsRes.error) {
    throw new Error(
      `Failed to resolve syllabus item titles: ${syllabusLabelsRes.error.message}`,
    );
  }
  if (submissionsRes.error) {
    throw new Error(
      `Failed to load assignment submission status: ${submissionsRes.error.message}`,
    );
  }
  if (tgMemberCountsRes.error) {
    throw new Error(
      `Failed to resolve teaching group counts: ${tgMemberCountsRes.error.message}`,
    );
  }

  const syllabusLabelMap = new Map(
    (syllabusLabelsRes.data ?? []).map((item) => [
      item.id,
      `${item.code} — ${item.title}`,
    ]),
  );

  const enrolledCountByTg = new Map<string, number>();
  for (const row of tgMemberCountsRes.data ?? []) {
    enrolledCountByTg.set(
      row.teaching_group_id,
      (enrolledCountByTg.get(row.teaching_group_id) ?? 0) + 1,
    );
  }

  const submissionsByAssignment = new Map<
    string,
    {
      student_profile_id: string;
      status: SubmissionStatus;
      marks_awarded: number | null;
    }[]
  >();
  for (const sub of submissionsRes.data ?? []) {
    const existing = submissionsByAssignment.get(sub.assignment_id) ?? [];
    existing.push(sub);
    submissionsByAssignment.set(sub.assignment_id, existing);
  }

  const assignments: AssignmentWorkspaceItemDto[] = rawAssignments.map(
    (row) => {
      const tg = groupById.get(row.teaching_group_id);
      const subRows = submissionsByAssignment.get(row.id) ?? [];

      const completionMetrics = scope.isStaffOrLeadership
        ? computeAssignmentCompletionMetrics(
            enrolledCountByTg.get(row.teaching_group_id) ?? 0,
            subRows,
          )
        : null;

      let learnerSub: (typeof subRows)[number] | undefined;
      if (!scope.isStaffOrLeadership) {
        if (scope.ownStudentProfile) {
          learnerSub = subRows.find(
            (s) => s.student_profile_id === scope.ownStudentProfile!.id,
          );
        }
        if (!learnerSub) {
          learnerSub = subRows[0];
        }
      }

      return {
        id: row.id,
        teachingGroupId: row.teaching_group_id,
        teachingGroupLabel: tg
          ? `${tg.code} — ${tg.name}`
          : row.teaching_group_id.slice(0, 8),
        subjectLabel: tg?.subjectLabel ?? "Subject",
        syllabusItemLabel: row.syllabus_item_id
          ? (syllabusLabelMap.get(row.syllabus_item_id) ?? null)
          : null,
        title: row.title,
        assignmentType: row.assignment_type,
        submissionMode: row.submission_mode,
        evaluationMode: row.evaluation_mode,
        maxMarks: row.max_marks !== null ? Number(row.max_marks) : null,
        dueAt: row.due_at,
        allowLateSubmission: row.allow_late_submission,
        status: row.status,
        authoredByName:
          personNameMap.get(row.authored_by_person_id) ?? "School Staff",
        completionMetrics,
        learnerSubmissionStatus: learnerSub?.status ?? (scope.isStaffOrLeadership ? null : "assigned"),
        learnerMarksAwarded:
          learnerSub?.marks_awarded !== null &&
          learnerSub?.marks_awarded !== undefined
            ? Number(learnerSub.marks_awarded)
            : null,
      };
    },
  );

  return {
    context,
    activeSession: scope.activeSession,
    teachingGroups: groups,
    writableTeachingGroups,
    syllabusOptions: (syllabusRes.data ?? []).map((item) => ({
      id: item.id,
      subjectOfferingId: item.subject_offering_id,
      code: item.code,
      title: item.title,
    })),
    selectedGroupId,
    statusFilter,
    typeFilter,
    isMonitorBoardOnly: false,
    isOversightReadOnly: scope.isOversightReadOnly,
    isStudentOrGuardian: scope.isStudentOrGuardian,
    canCreateAssignment: writableTeachingGroups.length > 0,
    monitorBoardAssignments: [],
    assignments,
  };
}

export async function getAssignmentDetail(
  context: VerifiedTenantContext,
  assignmentId: string,
): Promise<AssignmentDetailResult> {
  if (!z.string().uuid().safeParse(assignmentId).success) {
    return { status: "not-found" };
  }

  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerAssignmentScope(supabase, context, todayDate);

  const { data: assignmentRow, error: asgErr } = await supabase
    .from("assignments")
    .select(
      "id, session_id, teaching_group_id, syllabus_item_id, title, instructions, assignment_type, submission_mode, evaluation_mode, max_marks, issued_at, due_at, allow_late_submission, objective_questions, status, authored_by_person_id",
    )
    .eq("institution_id", context.institutionId)
    .eq("id", assignmentId)
    .maybeSingle<{
      id: string;
      session_id: string;
      teaching_group_id: string;
      syllabus_item_id: string | null;
      title: string;
      instructions: string;
      assignment_type: AssignmentType;
      submission_mode: SubmissionMode;
      evaluation_mode: EvaluationMode;
      max_marks: number | null;
      issued_at: string;
      due_at: string | null;
      allow_late_submission: boolean;
      objective_questions: unknown;
      status: AssignmentStatus;
      authored_by_person_id: string;
    }>();

  if (asgErr) {
    throw new Error(`Failed to load assignment detail: ${asgErr.message}`);
  }
  if (!assignmentRow) {
    return { status: "not-found" };
  }

  if (scope.isMonitorBoardOnly && assignmentRow.status !== "published") {
    return { status: "not-found" };
  }

  const [{ groupById }, syllabusItemRes, commentsRes] = await Promise.all([
    loadTeachingGroupsCatalog(supabase, context.institutionId, null),
    assignmentRow.syllabus_item_id
      ? supabase
          .from("syllabus_items")
          .select("id, code, title")
          .eq("institution_id", context.institutionId)
          .eq("id", assignmentRow.syllabus_item_id)
          .maybeSingle<{ id: string; code: string; title: string }>()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("record_comments")
      .select(
        "id, body, is_internal_staff_note, authored_by_person_id, created_at",
      )
      .eq("institution_id", context.institutionId)
      .eq("parent_kind", "assignment")
      .eq("assignment_id", assignmentRow.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(80)
      .returns<
        {
          id: string;
          body: string;
          is_internal_staff_note: boolean;
          authored_by_person_id: string;
          created_at: string;
        }[]
      >(),
  ]);

  if (syllabusItemRes.error) {
    throw new Error(
      `Failed to load linked syllabus item: ${syllabusItemRes.error.message}`,
    );
  }
  if (commentsRes.error) {
    throw new Error(
      `Failed to load assignment comments: ${commentsRes.error.message}`,
    );
  }

  const tg = groupById.get(assignmentRow.teaching_group_id);
  const parsedQuestions = parseObjectiveQuestionsJsonb(
    assignmentRow.objective_questions,
  );
  const commentRows = commentsRes.data ?? [];

  if (scope.isMonitorBoardOnly) {
    const authorNames = await fetchPersonNameMap(supabase, [
      assignmentRow.authored_by_person_id,
      ...commentRows.map((c) => c.authored_by_person_id),
    ]);

    return {
      status: "ok",
      context,
      assignment: {
        id: assignmentRow.id,
        sessionId: assignmentRow.session_id,
        teachingGroupId: assignmentRow.teaching_group_id,
        teachingGroupLabel: tg ? `${tg.code} — ${tg.name}` : "Teaching Group",
        subjectLabel: tg?.subjectLabel ?? "Subject",
        syllabusItemLabel: syllabusItemRes.data
          ? `${syllabusItemRes.data.code} — ${syllabusItemRes.data.title}`
          : null,
        title: assignmentRow.title,
        instructions: assignmentRow.instructions,
        assignmentType: assignmentRow.assignment_type,
        submissionMode: assignmentRow.submission_mode,
        evaluationMode: assignmentRow.evaluation_mode,
        maxMarks:
          assignmentRow.max_marks !== null
            ? Number(assignmentRow.max_marks)
            : null,
        issuedAt: assignmentRow.issued_at,
        dueAt: assignmentRow.due_at,
        allowLateSubmission: assignmentRow.allow_late_submission,
        status: assignmentRow.status,
        authoredByName:
          authorNames.get(assignmentRow.authored_by_person_id) ??
          "School Staff",
        questions: sanitizeObjectiveQuestionsForLearner(parsedQuestions, {
          revealAnswerKey: false,
        }),
      },
      isMonitorBoardOnly: true,
      isOversightReadOnly: false,
      canManageAssignment: false,
      canComment: false,
      canPostInternalNote: false,
      completionMetrics: null,
      roster: [],
      canStudentSubmit: false,
      submitBlockReason: "Monitor role renders classroom board details only.",
      learnerSubmissions: [],
      comments: commentRows
        .filter((c) => !c.is_internal_staff_note)
        .map((c) => ({
          id: c.id,
          body: c.body,
          isInternalStaffNote: false,
          authoredByName:
            authorNames.get(c.authored_by_person_id) ?? "School Member",
          createdAt: c.created_at,
        })),
    };
  }

  const canManageAssignment =
    scope.isLeadership ||
    scope.subjectTeacherGroupIds.has(assignmentRow.teaching_group_id);

  if (scope.isStaffOrLeadership) {
    const [membershipsRes, submissionsRes] = await Promise.all([
      supabase
        .from("teaching_group_memberships")
        .select("student_enrolment_id")
        .eq("institution_id", context.institutionId)
        .eq("teaching_group_id", assignmentRow.teaching_group_id)
        .eq("status", "active")
        .returns<{ student_enrolment_id: string }[]>(),
      supabase
        .from("assignment_submissions")
        .select(
          "id, student_enrolment_id, student_profile_id, submission_channel, status, submitted_at, response_text, objective_answers, attachment_storage_path, marks_awarded, teacher_remarks, evaluated_by_person_id",
        )
        .eq("institution_id", context.institutionId)
        .eq("assignment_id", assignmentRow.id)
        .returns<
          {
            id: string;
            student_enrolment_id: string;
            student_profile_id: string;
            submission_channel: SubmissionChannel;
            status: SubmissionStatus;
            submitted_at: string | null;
            response_text: string | null;
            objective_answers: unknown;
            attachment_storage_path: string | null;
            marks_awarded: number | null;
            teacher_remarks: string | null;
            evaluated_by_person_id: string | null;
          }[]
        >(),
    ]);

    if (membershipsRes.error) {
      throw new Error(
        `Failed to load enrolled teaching group roster: ${membershipsRes.error.message}`,
      );
    }
    if (submissionsRes.error) {
      throw new Error(
        `Failed to load assignment submissions: ${submissionsRes.error.message}`,
      );
    }

    const enrolmentIds = [
      ...new Set(
        (membershipsRes.data ?? []).map((m) => m.student_enrolment_id),
      ),
    ];

    const enrolmentsRes =
      enrolmentIds.length > 0
        ? await supabase
            .from("student_session_enrolments")
            .select(
              "id, student_profile_id, roll_number, section:sections(code, grade:grade_levels(code))",
            )
            .eq("institution_id", context.institutionId)
            .eq("status", "active")
            .in("id", enrolmentIds)
            .returns<
              {
                id: string;
                student_profile_id: string;
                roll_number: string | null;
                section:
                  | {
                      code: string;
                      grade: { code: string } | { code: string }[] | null;
                    }
                  | {
                      code: string;
                      grade: { code: string } | { code: string }[] | null;
                    }[]
                  | null;
              }[]
            >()
        : { data: [], error: null };

    if (enrolmentsRes.error) {
      throw new Error(
        `Failed to load student session enrolments: ${enrolmentsRes.error.message}`,
      );
    }

    const enrolmentRows = enrolmentsRes.data ?? [];
    const studentProfileIds = [
      ...new Set(enrolmentRows.map((e) => e.student_profile_id)),
    ];

    const profilesRes =
      studentProfileIds.length > 0
        ? await supabase
            .from("student_profiles")
            .select("id, person_id, admission_number")
            .eq("institution_id", context.institutionId)
            .in("id", studentProfileIds)
            .returns<
              { id: string; person_id: string; admission_number: string }[]
            >()
        : { data: [], error: null };

    if (profilesRes.error) {
      throw new Error(
        `Failed to load student profiles: ${profilesRes.error.message}`,
      );
    }

    const profileRows = profilesRes.data ?? [];
    const submissionRows = submissionsRes.data ?? [];
    const profileById = new Map(profileRows.map((p) => [p.id, p]));
    const submissionByEnrolment = new Map(
      submissionRows.map((s) => [s.student_enrolment_id, s]),
    );

    const personNames = await fetchPersonNameMap(supabase, [
      assignmentRow.authored_by_person_id,
      ...profileRows.map((p) => p.person_id),
      ...submissionRows.map((s) => s.evaluated_by_person_id),
      ...commentRows.map((c) => c.authored_by_person_id),
    ]);

    const roster: AssignmentRosterEntryDto[] = enrolmentRows
      .map((enr) => {
        const profile = profileById.get(enr.student_profile_id);
        const sub = submissionByEnrolment.get(enr.id);
        const sectionJoin = unwrapJoin(enr.section);
        const gradeJoin = unwrapJoin(sectionJoin?.grade);
        const sectionLabel = sectionJoin
          ? `${gradeJoin?.code ?? ""} ${sectionJoin.code}`.trim()
          : "—";
        const answers = sub
          ? parseObjectiveAnswersJsonb(sub.objective_answers)
          : {};
        const autoMcqPreview =
          assignmentRow.evaluation_mode === "auto_mcq" &&
          sub &&
          parsedQuestions.length > 0 &&
          Object.keys(answers).length > 0
            ? scoreObjectiveQuiz(parsedQuestions, answers)
            : null;

        return {
          studentEnrolmentId: enr.id,
          studentProfileId: enr.student_profile_id,
          admissionNumber: profile?.admission_number ?? "—",
          studentName: profile
            ? (personNames.get(profile.person_id) ?? profile.admission_number)
            : enr.student_profile_id.slice(0, 8),
          sectionLabel,
          rollNumber: enr.roll_number,
          submissionId: sub?.id ?? null,
          submissionChannel: sub?.submission_channel ?? null,
          status: sub?.status ?? "assigned",
          submittedAt: sub?.submitted_at ?? null,
          responseText: sub?.response_text ?? null,
          objectiveAnswers: answers,
          autoMcqPreview,
          attachmentStoragePath: sub?.attachment_storage_path ?? null,
          marksAwarded:
            sub?.marks_awarded !== null && sub?.marks_awarded !== undefined
              ? Number(sub.marks_awarded)
              : null,
          teacherRemarks: sub?.teacher_remarks ?? null,
          evaluatedByName: sub?.evaluated_by_person_id
            ? (personNames.get(sub.evaluated_by_person_id) ?? null)
            : null,
        };
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName));

    const completionMetrics = computeAssignmentCompletionMetrics(
      enrolmentRows.length,
      submissionRows,
    );

    return {
      status: "ok",
      context,
      assignment: {
        id: assignmentRow.id,
        sessionId: assignmentRow.session_id,
        teachingGroupId: assignmentRow.teaching_group_id,
        teachingGroupLabel: tg ? `${tg.code} — ${tg.name}` : "Teaching Group",
        subjectLabel: tg?.subjectLabel ?? "Subject",
        syllabusItemLabel: syllabusItemRes.data
          ? `${syllabusItemRes.data.code} — ${syllabusItemRes.data.title}`
          : null,
        title: assignmentRow.title,
        instructions: assignmentRow.instructions,
        assignmentType: assignmentRow.assignment_type,
        submissionMode: assignmentRow.submission_mode,
        evaluationMode: assignmentRow.evaluation_mode,
        maxMarks:
          assignmentRow.max_marks !== null
            ? Number(assignmentRow.max_marks)
            : null,
        issuedAt: assignmentRow.issued_at,
        dueAt: assignmentRow.due_at,
        allowLateSubmission: assignmentRow.allow_late_submission,
        status: assignmentRow.status,
        authoredByName:
          personNames.get(assignmentRow.authored_by_person_id) ??
          "School Staff",
        questions: sanitizeObjectiveQuestionsForLearner(parsedQuestions, {
          revealAnswerKey: true,
        }),
      },
      isMonitorBoardOnly: false,
      isOversightReadOnly: !canManageAssignment,
      canManageAssignment,
      canComment: true,
      canPostInternalNote: true,
      completionMetrics,
      roster,
      canStudentSubmit: false,
      submitBlockReason: null,
      learnerSubmissions: [],
      comments: commentRows.map((c) => ({
        id: c.id,
        body: c.body,
        isInternalStaffNote: c.is_internal_staff_note,
        authoredByName:
          personNames.get(c.authored_by_person_id) ?? "School Staff",
        createdAt: c.created_at,
      })),
    };
  }

  // Student or Guardian caller path (strictly RLS-scoped own / linked ward submissions + zero premature answer keys)
  const { data: learnerSubRows, error: learnerSubErr } = await supabase
    .from("assignment_submissions")
    .select(
      "id, student_profile_id, submission_channel, status, submitted_at, response_text, objective_answers, attachment_storage_path, marks_awarded, teacher_remarks, evaluated_by_person_id",
    )
    .eq("institution_id", context.institutionId)
    .eq("assignment_id", assignmentRow.id)
    .returns<
      {
        id: string;
        student_profile_id: string;
        submission_channel: SubmissionChannel;
        status: SubmissionStatus;
        submitted_at: string | null;
        response_text: string | null;
        objective_answers: unknown;
        attachment_storage_path: string | null;
        marks_awarded: number | null;
        teacher_remarks: string | null;
        evaluated_by_person_id: string | null;
      }[]
    >();

  if (learnerSubErr) {
    throw new Error(
      `Failed to load learner assignment submissions: ${learnerSubErr.message}`,
    );
  }

  const subRows = learnerSubRows ?? [];
  const profileIds = [...new Set(subRows.map((s) => s.student_profile_id))];
  const profilesRes =
    profileIds.length > 0
      ? await supabase
          .from("student_profiles")
          .select("id, person_id, admission_number")
          .eq("institution_id", context.institutionId)
          .in("id", profileIds)
          .returns<
            { id: string; person_id: string; admission_number: string }[]
          >()
      : { data: [], error: null };

  if (profilesRes.error) {
    throw new Error(
      `Failed to resolve student profiles: ${profilesRes.error.message}`,
    );
  }

  const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const personNames = await fetchPersonNameMap(supabase, [
    assignmentRow.authored_by_person_id,
    ...(profilesRes.data ?? []).map((p) => p.person_id),
    ...subRows.map((s) => s.evaluated_by_person_id),
    ...commentRows.map((c) => c.authored_by_person_id),
  ]);

  let ownEnrolledInTg = false;
  if (scope.ownStudentProfile) {
    const { data: ownEnr, error: ownEnrErr } = await supabase
      .from("student_session_enrolments")
      .select("id")
      .eq("institution_id", context.institutionId)
      .eq("session_id", assignmentRow.session_id)
      .eq("student_profile_id", scope.ownStudentProfile.id)
      .eq("status", "active")
      .maybeSingle<{ id: string }>();

    if (ownEnrErr) {
      throw new Error(
        `Failed to resolve student session enrolment: ${ownEnrErr.message}`,
      );
    }

    if (ownEnr) {
      const { data: ownMembership, error: ownMemErr } = await supabase
        .from("teaching_group_memberships")
        .select("id")
        .eq("institution_id", context.institutionId)
        .eq("teaching_group_id", assignmentRow.teaching_group_id)
        .eq("student_enrolment_id", ownEnr.id)
        .eq("status", "active")
        .maybeSingle<{ id: string }>();

      if (ownMemErr) {
        throw new Error(
          `Failed to verify teaching group membership: ${ownMemErr.message}`,
        );
      }
      ownEnrolledInTg = Boolean(ownMembership);
    }
  }

  const ownSubRow = scope.ownStudentProfile
    ? subRows.find((s) => s.student_profile_id === scope.ownStudentProfile!.id)
    : undefined;

  let canStudentSubmit = false;
  let submitBlockReason: string | null = null;
  if (ownEnrolledInTg) {
    const submitGate = canStudentSubmitAssignment({
      assignmentStatus: assignmentRow.status,
      submissionMode: assignmentRow.submission_mode,
      existingSubmissionStatus: ownSubRow?.status ?? null,
      dueAt: assignmentRow.due_at,
      allowLateSubmission: assignmentRow.allow_late_submission,
    });
    canStudentSubmit = submitGate.allowed;
    submitBlockReason = submitGate.allowed ? null : submitGate.reason;
  } else if (scope.guardianWardIds.size > 0) {
    submitBlockReason =
      "Guardians view ward submission progress in read-only mode.";
  }

  const anyEvaluated = subRows.some((s) => s.status === "evaluated");
  const learnerSubmissions: AssignmentLearnerSubmissionDto[] = subRows.map(
    (s) => {
      const prof = profileById.get(s.student_profile_id);
      const answers = parseObjectiveAnswersJsonb(s.objective_answers);
      const isEvaluated = s.status === "evaluated";
      const scored =
        assignmentRow.evaluation_mode === "auto_mcq" &&
        parsedQuestions.length > 0 &&
        Object.keys(answers).length > 0
          ? scoreObjectiveQuiz(parsedQuestions, answers)
          : null;

      return {
        submissionId: s.id,
        studentProfileId: s.student_profile_id,
        studentName: prof
          ? (personNames.get(prof.person_id) ?? prof.admission_number)
          : "Student",
        admissionNumber: prof?.admission_number ?? "—",
        submissionChannel: s.submission_channel,
        status: s.status,
        submittedAt: s.submitted_at,
        responseText: s.response_text,
        objectiveAnswers: answers,
        attachmentStoragePath: s.attachment_storage_path,
        marksAwarded:
          s.marks_awarded !== null ? Number(s.marks_awarded) : null,
        teacherRemarks: s.teacher_remarks,
        evaluatedByName: s.evaluated_by_person_id
          ? (personNames.get(s.evaluated_by_person_id) ?? null)
          : null,
        quizSummary: scored
          ? {
              totalMarks: scored.totalMarks,
              marksAwarded: scored.marksAwarded,
              correctCount: scored.correctCount,
              totalQuestions: scored.totalQuestions,
            }
          : null,
        quizBreakdown: isEvaluated && scored ? scored.breakdown : null,
      };
    },
  );

  return {
    status: "ok",
    context,
    assignment: {
      id: assignmentRow.id,
      sessionId: assignmentRow.session_id,
      teachingGroupId: assignmentRow.teaching_group_id,
      teachingGroupLabel: tg ? `${tg.code} — ${tg.name}` : "Teaching Group",
      subjectLabel: tg?.subjectLabel ?? "Subject",
      syllabusItemLabel: syllabusItemRes.data
        ? `${syllabusItemRes.data.code} — ${syllabusItemRes.data.title}`
        : null,
      title: assignmentRow.title,
      instructions: assignmentRow.instructions,
      assignmentType: assignmentRow.assignment_type,
      submissionMode: assignmentRow.submission_mode,
      evaluationMode: assignmentRow.evaluation_mode,
      maxMarks:
        assignmentRow.max_marks !== null
          ? Number(assignmentRow.max_marks)
          : null,
      issuedAt: assignmentRow.issued_at,
      dueAt: assignmentRow.due_at,
      allowLateSubmission: assignmentRow.allow_late_submission,
      status: assignmentRow.status,
      authoredByName:
        personNames.get(assignmentRow.authored_by_person_id) ?? "School Staff",
      questions: sanitizeObjectiveQuestionsForLearner(parsedQuestions, {
        revealAnswerKey: anyEvaluated,
      }),
    },
    isMonitorBoardOnly: false,
    isOversightReadOnly: false,
    canManageAssignment: false,
    canComment: true,
    canPostInternalNote: false,
    completionMetrics: null,
    roster: [],
    canStudentSubmit,
    submitBlockReason,
    learnerSubmissions,
    comments: commentRows
      .filter((c) => !c.is_internal_staff_note)
      .map((c) => ({
        id: c.id,
        body: c.body,
        isInternalStaffNote: false,
        authoredByName:
          personNames.get(c.authored_by_person_id) ?? "School Member",
        createdAt: c.created_at,
      })),
  };
}

export async function createAssignment(
  slug: string,
  rawInput: unknown,
): Promise<AssignmentActionResult<{ id: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return {
      ok: false,
      error: "Workspace authorization required.",
      status: resolution.status === "unauthenticated" ? 401 : 403,
    };
  }

  const parsed = createAssignmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid assignment payload.",
      status: 400,
    };
  }

  const dueAtCheck = normalizeOptionalDueAt(parsed.data.dueAt);
  if (!dueAtCheck.ok) {
    return { ok: false, error: dueAtCheck.error, status: 400 };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerAssignmentScope(supabase, context, todayDate);

  if (!scope.activeSession) {
    return {
      ok: false,
      error: "An active academic session is required to create assignments.",
      status: 400,
    };
  }

  const canWrite =
    scope.isLeadership ||
    scope.subjectTeacherGroupIds.has(parsed.data.teachingGroupId);
  if (!canWrite) {
    return {
      ok: false,
      error:
        "You may create assignments only for your active teaching groups or with academic management permission.",
      status: 403,
    };
  }

  const { data: tgRow, error: tgErr } = await supabase
    .from("teaching_groups")
    .select("id, session_id")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.teachingGroupId)
    .maybeSingle<{ id: string; session_id: string }>();

  if (tgErr || !tgRow) {
    return {
      ok: false,
      error: "Selected teaching group was not found in this institution.",
      status: 404,
    };
  }

  const derivedMaxMarks =
    parsed.data.evaluationMode === "auto_mcq" &&
    (parsed.data.maxMarks === null || parsed.data.maxMarks === undefined)
      ? parsed.data.objectiveQuestions.reduce((sum, q) => sum + q.marks, 0)
      : (parsed.data.maxMarks ?? null);

  const { data: inserted, error: insertErr } = await supabase
    .from("assignments")
    .insert({
      institution_id: context.institutionId,
      session_id: tgRow.session_id,
      teaching_group_id: parsed.data.teachingGroupId,
      syllabus_item_id: parsed.data.syllabusItemId ?? null,
      title: parsed.data.title,
      instructions: parsed.data.instructions,
      assignment_type: parsed.data.assignmentType,
      submission_mode: parsed.data.submissionMode,
      evaluation_mode: parsed.data.evaluationMode,
      max_marks: derivedMaxMarks,
      due_at: dueAtCheck.value,
      allow_late_submission: parsed.data.allowLateSubmission,
      objective_questions: parsed.data.objectiveQuestions,
      status: parsed.data.initialStatus,
      authored_by_person_id: context.personId,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: insertErr?.message ?? "Failed to create assignment under RLS.",
      status: 403,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "assignments.created",
    entityType: "assignments",
    entityId: inserted.id,
    afterState: {
      teachingGroupId: parsed.data.teachingGroupId,
      assignmentType: parsed.data.assignmentType,
      submissionMode: parsed.data.submissionMode,
      evaluationMode: parsed.data.evaluationMode,
      status: parsed.data.initialStatus,
    },
  });

  return { ok: true, data: { id: inserted.id } };
}

export async function transitionAssignmentStatus(
  slug: string,
  rawInput: unknown,
): Promise<AssignmentActionResult<{ id: string; status: AssignmentStatus }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return {
      ok: false,
      error: "Workspace authorization required.",
      status: resolution.status === "unauthenticated" ? 401 : 403,
    };
  }

  const parsed = transitionAssignmentStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid status transition.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("assignments")
    .select("id, status")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.assignmentId)
    .maybeSingle<{ id: string; status: AssignmentStatus }>();

  if (fetchErr || !existing) {
    return { ok: false, error: "Assignment not found.", status: 404 };
  }

  if (
    !canTransitionAssignmentStatus(existing.status, parsed.data.targetStatus)
  ) {
    return {
      ok: false,
      error: `Cannot transition assignment from "${existing.status}" to "${parsed.data.targetStatus}".`,
      status: 400,
    };
  }

  const { error: updateErr } = await supabase
    .from("assignments")
    .update({ status: parsed.data.targetStatus })
    .eq("institution_id", context.institutionId)
    .eq("id", existing.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message, status: 403 };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "assignments.status_changed",
    entityType: "assignments",
    entityId: existing.id,
    beforeState: { status: existing.status },
    afterState: { status: parsed.data.targetStatus },
  });

  return {
    ok: true,
    data: { id: existing.id, status: parsed.data.targetStatus },
  };
}

export async function submitStudentAssignment(
  slug: string,
  rawInput: unknown,
): Promise<
  AssignmentActionResult<{
    submissionId: string;
    status: "submitted" | "late_submitted";
    quizScorePreview: ObjectiveQuizScoreResult | null;
  }>
> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return {
      ok: false,
      error: "Workspace authorization required.",
      status: resolution.status === "unauthenticated" ? 401 : 403,
    };
  }

  const parsed = submitStudentAssignmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid submission payload.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();

  const { data: assignmentRow, error: asgErr } = await supabase
    .from("assignments")
    .select(
      "id, session_id, teaching_group_id, submission_mode, evaluation_mode, due_at, allow_late_submission, objective_questions, status",
    )
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.assignmentId)
    .maybeSingle<{
      id: string;
      session_id: string;
      teaching_group_id: string;
      submission_mode: SubmissionMode;
      evaluation_mode: EvaluationMode;
      due_at: string | null;
      allow_late_submission: boolean;
      objective_questions: unknown;
      status: AssignmentStatus;
    }>();

  if (asgErr || !assignmentRow) {
    return { ok: false, error: "Assignment not found.", status: 404 };
  }

  const { data: studentProfile, error: spErr } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("institution_id", context.institutionId)
    .eq("person_id", context.personId)
    .eq("lifecycle_status", "active")
    .maybeSingle<{ id: string }>();

  if (spErr || !studentProfile) {
    return {
      ok: false,
      error: "Only an active enrolled student may submit online coursework.",
      status: 403,
    };
  }

  const { data: enrolment, error: enrErr } = await supabase
    .from("student_session_enrolments")
    .select("id")
    .eq("institution_id", context.institutionId)
    .eq("session_id", assignmentRow.session_id)
    .eq("student_profile_id", studentProfile.id)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (enrErr || !enrolment) {
    return {
      ok: false,
      error: "No active session enrolment found for this assignment.",
      status: 403,
    };
  }

  const { data: membership, error: memErr } = await supabase
    .from("teaching_group_memberships")
    .select("id")
    .eq("institution_id", context.institutionId)
    .eq("teaching_group_id", assignmentRow.teaching_group_id)
    .eq("student_enrolment_id", enrolment.id)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (memErr || !membership) {
    return {
      ok: false,
      error: "You are not actively enrolled in this assignment's teaching group.",
      status: 403,
    };
  }

  const { data: existingSub, error: subFetchErr } = await supabase
    .from("assignment_submissions")
    .select("id, status")
    .eq("institution_id", context.institutionId)
    .eq("assignment_id", assignmentRow.id)
    .eq("student_enrolment_id", enrolment.id)
    .maybeSingle<{ id: string; status: SubmissionStatus }>();

  if (subFetchErr) {
    return { ok: false, error: subFetchErr.message, status: 500 };
  }

  const gate = canStudentSubmitAssignment({
    assignmentStatus: assignmentRow.status,
    submissionMode: assignmentRow.submission_mode,
    existingSubmissionStatus: existingSub?.status ?? null,
    dueAt: assignmentRow.due_at,
    allowLateSubmission: assignmentRow.allow_late_submission,
  });

  if (!gate.allowed) {
    return { ok: false, error: gate.reason, status: 400 };
  }

  const cleanAttachment = parsed.data.attachmentStoragePath?.trim() || null;
  if (
    cleanAttachment &&
    !cleanAttachment.startsWith(`${context.institutionId}/`)
  ) {
    return {
      ok: false,
      error:
        "Attachment storage path must start with this institution's tenant folder prefix.",
      status: 400,
    };
  }

  const parsedQuestions = parseObjectiveQuestionsJsonb(
    assignmentRow.objective_questions,
  );
  const validAnswers: Record<string, number> = {};
  for (const question of parsedQuestions) {
    const choice = parsed.data.objectiveAnswers[question.id];
    if (
      typeof choice === "number" &&
      Number.isInteger(choice) &&
      choice >= 0 &&
      choice < question.options.length
    ) {
      validAnswers[question.id] = choice;
    }
  }

  if (
    !parsed.data.responseText &&
    Object.keys(validAnswers).length === 0 &&
    !cleanAttachment
  ) {
    return {
      ok: false,
      error:
        "Provide a written response, quiz selection, or attachment path before submitting.",
      status: 400,
    };
  }

  const nowIso = new Date().toISOString();

  // Strictly adhere to PostgreSQL student grade-column RLS locks:
  // marks_awarded, teacher_remarks, evaluated_by_person_id, evaluated_at MUST remain NULL on student writes.
  let submissionId: string;
  if (existingSub) {
    const { data: updated, error: updErr } = await supabase
      .from("assignment_submissions")
      .update({
        submission_channel: "online",
        status: gate.nextStatus,
        submitted_at: nowIso,
        response_text: parsed.data.responseText || null,
        objective_answers: validAnswers,
        attachment_storage_path: cleanAttachment,
        submitted_by_person_id: context.personId,
        marks_awarded: null,
        teacher_remarks: null,
        evaluated_by_person_id: null,
        evaluated_at: null,
      })
      .eq("institution_id", context.institutionId)
      .eq("id", existingSub.id)
      .select("id")
      .single<{ id: string }>();

    if (updErr || !updated) {
      return {
        ok: false,
        error: updErr?.message ?? "Failed to update student submission.",
        status: 403,
      };
    }
    submissionId = updated.id;
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from("assignment_submissions")
      .insert({
        institution_id: context.institutionId,
        assignment_id: assignmentRow.id,
        student_enrolment_id: enrolment.id,
        student_profile_id: studentProfile.id,
        submission_channel: "online",
        status: gate.nextStatus,
        submitted_at: nowIso,
        response_text: parsed.data.responseText || null,
        objective_answers: validAnswers,
        attachment_storage_path: cleanAttachment,
        submitted_by_person_id: context.personId,
        marks_awarded: null,
        teacher_remarks: null,
        evaluated_by_person_id: null,
        evaluated_at: null,
      })
      .select("id")
      .single<{ id: string }>();

    if (insErr || !inserted) {
      return {
        ok: false,
        error: insErr?.message ?? "Failed to record student submission.",
        status: 403,
      };
    }
    submissionId = inserted.id;
  }

  const quizScorePreview =
    assignmentRow.evaluation_mode === "auto_mcq" && parsedQuestions.length > 0
      ? scoreObjectiveQuiz(parsedQuestions, validAnswers)
      : null;

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "assignments.submission_submitted",
    entityType: "assignment_submissions",
    entityId: submissionId,
    afterState: {
      assignmentId: assignmentRow.id,
      status: gate.nextStatus,
      submissionChannel: "online",
    },
  });

  return {
    ok: true,
    data: {
      submissionId,
      status: gate.nextStatus,
      quizScorePreview,
    },
  };
}

export async function recordOfflineAssignmentCompletion(
  slug: string,
  rawInput: unknown,
): Promise<AssignmentActionResult<{ submissionId: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return {
      ok: false,
      error: "Workspace authorization required.",
      status: resolution.status === "unauthenticated" ? 401 : 403,
    };
  }

  const parsed = recordOfflineCompletionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Invalid offline completion payload.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerAssignmentScope(supabase, context, todayDate);

  const { data: assignmentRow, error: asgErr } = await supabase
    .from("assignments")
    .select("id, teaching_group_id, max_marks")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.assignmentId)
    .maybeSingle<{
      id: string;
      teaching_group_id: string;
      max_marks: number | null;
    }>();

  if (asgErr || !assignmentRow) {
    return { ok: false, error: "Assignment not found.", status: 404 };
  }

  const canGrade =
    scope.isLeadership ||
    scope.subjectTeacherGroupIds.has(assignmentRow.teaching_group_id);
  if (!canGrade) {
    return {
      ok: false,
      error:
        "Only assigned subject teachers or academic management may record offline notebook completion.",
      status: 403,
    };
  }

  if (
    parsed.data.marksAwarded !== null &&
    parsed.data.marksAwarded !== undefined &&
    assignmentRow.max_marks !== null &&
    parsed.data.marksAwarded > Number(assignmentRow.max_marks)
  ) {
    return {
      ok: false,
      error: `Marks awarded (${parsed.data.marksAwarded}) cannot exceed max marks (${assignmentRow.max_marks}).`,
      status: 400,
    };
  }

  const nowIso = new Date().toISOString();
  const isEvaluated = parsed.data.status === "evaluated";

  const { data: existingSub, error: existingErr } = await supabase
    .from("assignment_submissions")
    .select("id")
    .eq("institution_id", context.institutionId)
    .eq("assignment_id", assignmentRow.id)
    .eq("student_enrolment_id", parsed.data.studentEnrolmentId)
    .maybeSingle<{ id: string }>();

  if (existingErr) {
    return { ok: false, error: existingErr.message, status: 500 };
  }

  let submissionId: string;
  if (existingSub) {
    const { data: updated, error: updErr } = await supabase
      .from("assignment_submissions")
      .update({
        submission_channel: "offline_recorded",
        status: parsed.data.status,
        submitted_at: nowIso,
        marks_awarded: parsed.data.marksAwarded ?? null,
        teacher_remarks: parsed.data.teacherRemarks?.trim() || null,
        evaluated_by_person_id: isEvaluated ? context.personId : null,
        evaluated_at: isEvaluated ? nowIso : null,
      })
      .eq("institution_id", context.institutionId)
      .eq("id", existingSub.id)
      .select("id")
      .single<{ id: string }>();

    if (updErr || !updated) {
      return {
        ok: false,
        error: updErr?.message ?? "Failed to update offline completion.",
        status: 403,
      };
    }
    submissionId = updated.id;
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from("assignment_submissions")
      .insert({
        institution_id: context.institutionId,
        assignment_id: assignmentRow.id,
        student_enrolment_id: parsed.data.studentEnrolmentId,
        student_profile_id: parsed.data.studentProfileId,
        submission_channel: "offline_recorded",
        status: parsed.data.status,
        submitted_at: nowIso,
        marks_awarded: parsed.data.marksAwarded ?? null,
        teacher_remarks: parsed.data.teacherRemarks?.trim() || null,
        evaluated_by_person_id: isEvaluated ? context.personId : null,
        evaluated_at: isEvaluated ? nowIso : null,
      })
      .select("id")
      .single<{ id: string }>();

    if (insErr || !inserted) {
      return {
        ok: false,
        error: insErr?.message ?? "Failed to record offline completion.",
        status: 403,
      };
    }
    submissionId = inserted.id;
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "assignments.offline_completion_recorded",
    entityType: "assignment_submissions",
    entityId: submissionId,
    afterState: {
      assignmentId: assignmentRow.id,
      status: parsed.data.status,
      submissionChannel: "offline_recorded",
    },
  });

  return { ok: true, data: { submissionId } };
}

export async function evaluateAssignmentSubmission(
  slug: string,
  rawInput: unknown,
  options: { useAutoMcqScore?: boolean } = {},
): Promise<AssignmentActionResult<{ submissionId: string; status: SubmissionStatus }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return {
      ok: false,
      error: "Workspace authorization required.",
      status: resolution.status === "unauthenticated" ? 401 : 403,
    };
  }

  const parsed = evaluateSubmissionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Invalid evaluation payload.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerAssignmentScope(supabase, context, todayDate);

  const [assignmentRes, subRes] = await Promise.all([
    supabase
      .from("assignments")
      .select(
        "id, teaching_group_id, evaluation_mode, max_marks, objective_questions",
      )
      .eq("institution_id", context.institutionId)
      .eq("id", parsed.data.assignmentId)
      .maybeSingle<{
        id: string;
        teaching_group_id: string;
        evaluation_mode: EvaluationMode;
        max_marks: number | null;
        objective_questions: unknown;
      }>(),
    supabase
      .from("assignment_submissions")
      .select("id, assignment_id, status, objective_answers")
      .eq("institution_id", context.institutionId)
      .eq("id", parsed.data.submissionId)
      .eq("assignment_id", parsed.data.assignmentId)
      .maybeSingle<{
        id: string;
        assignment_id: string;
        status: SubmissionStatus;
        objective_answers: unknown;
      }>(),
  ]);

  if (assignmentRes.error || !assignmentRes.data || subRes.error || !subRes.data) {
    return {
      ok: false,
      error: "Assignment submission not found.",
      status: 404,
    };
  }

  const assignmentRow = assignmentRes.data;
  const subRow = subRes.data;

  const canGrade =
    scope.isLeadership ||
    scope.subjectTeacherGroupIds.has(assignmentRow.teaching_group_id);
  if (!canGrade) {
    return {
      ok: false,
      error:
        "Only assigned subject teachers or academic management may evaluate submissions.",
      status: 403,
    };
  }

  let marksToSave = parsed.data.marksAwarded ?? null;
  if (
    options.useAutoMcqScore &&
    assignmentRow.evaluation_mode === "auto_mcq" &&
    parsed.data.status === "evaluated"
  ) {
    const questions = parseObjectiveQuestionsJsonb(
      assignmentRow.objective_questions,
    );
    const answers = parseObjectiveAnswersJsonb(subRow.objective_answers);
    marksToSave = scoreObjectiveQuiz(questions, answers).marksAwarded;
  }

  if (
    marksToSave !== null &&
    assignmentRow.max_marks !== null &&
    marksToSave > Number(assignmentRow.max_marks)
  ) {
    return {
      ok: false,
      error: `Marks awarded (${marksToSave}) cannot exceed max marks (${assignmentRow.max_marks}).`,
      status: 400,
    };
  }

  const nowIso = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("assignment_submissions")
    .update({
      status: parsed.data.status,
      marks_awarded:
        parsed.data.status === "resubmit_requested" ? null : marksToSave,
      teacher_remarks: parsed.data.teacherRemarks?.trim() || null,
      evaluated_by_person_id: context.personId,
      evaluated_at: nowIso,
    })
    .eq("institution_id", context.institutionId)
    .eq("id", subRow.id);

  if (updErr) {
    return { ok: false, error: updErr.message, status: 403 };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "assignments.submission_evaluated",
    entityType: "assignment_submissions",
    entityId: subRow.id,
    beforeState: { status: subRow.status },
    afterState: {
      assignmentId: assignmentRow.id,
      status: parsed.data.status,
      hasMarks: marksToSave !== null,
    },
  });

  return {
    ok: true,
    data: { submissionId: subRow.id, status: parsed.data.status },
  };
}
