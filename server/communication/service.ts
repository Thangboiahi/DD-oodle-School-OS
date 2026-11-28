import "server-only";

import { z } from "zod";
import {
  evaluatePermission,
  type VerifiedTenantContext,
} from "@/lib/auth/permissions";
import {
  buildWhatsAppClickToChatUrl,
  canPostInternalStaffNote,
  canTransitionEnquiryStatus,
  canTransitionNoticeStatus,
  filterCacheablePublishedNotices,
  resolveNoticeAuthoringPolicy,
  validateNoticeAuthoringAgainstPolicy,
  type NoticeAuthoringPolicy,
  type OfflineCachedNoticeDto,
} from "@/lib/communication/rules";
import {
  acknowledgeNoticeSchema,
  createOfficialNoticeSchema,
  createParentEnquirySchema,
  createRecordCommentSchema,
  ENQUIRY_CATEGORIES,
  ENQUIRY_STATUSES,
  NOTICE_CATEGORIES,
  NOTICE_SCOPE_TYPES,
  transitionNoticeStatusSchema,
  updateParentEnquirySchema,
  type EnquiryCategory,
  type EnquiryStatus,
  type NoticeCategory,
  type NoticeScopeType,
  type NoticeStatus,
  type RecordCommentParentKind,
} from "@/lib/communication/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/server/audit/log";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export type CommunicationActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export interface CommunicationDepartmentOptionDto {
  id: string;
  code: string;
  name: string;
}

export interface CommunicationSectionOptionDto {
  id: string;
  gradeCode: string;
  code: string;
  name: string;
}

export interface CommunicationTeachingGroupOptionDto {
  id: string;
  code: string;
  name: string;
  subjectName: string;
}

export interface OfficialNoticeListItemDto {
  id: string;
  scopeType: NoticeScopeType;
  targetLabel: string;
  category: NoticeCategory;
  title: string;
  body: string;
  requiresAcknowledgement: boolean;
  isOfflineCacheable: boolean;
  status: NoticeStatus;
  publishedAt: string | null;
  authoredByName: string;
  acknowledgementCount: number;
  callerHasAcknowledged: boolean;
  createdAt: string;
}

export interface NoticesWorkspaceDto {
  context: VerifiedTenantContext;
  activeSession: { id: string; code: string; name: string } | null;
  scopeFilter: NoticeScopeType | "all";
  categoryFilter: NoticeCategory | "all";
  includeDrafts: boolean;
  notices: readonly OfficialNoticeListItemDto[];
  cacheableNotices: readonly OfflineCachedNoticeDto[];
  authoringPolicy: NoticeAuthoringPolicy;
  departments: readonly CommunicationDepartmentOptionDto[];
  sections: readonly CommunicationSectionOptionDto[];
  teachingGroups: readonly CommunicationTeachingGroupOptionDto[];
  canAccessEnquiries: boolean;
  isMonitorRestricted: boolean;
}

export interface NoticeCommentDto {
  id: string;
  body: string;
  isInternalStaffNote: boolean;
  authoredByPersonId: string;
  authoredByName: string;
  createdAt: string;
}

export interface NoticeAcknowledgementRowDto {
  id: string;
  personName: string;
  studentName: string | null;
  acknowledgedAt: string;
  note: string | null;
}

export type NoticeDetailResult =
  | { status: "not-found" }
  | {
      status: "ok";
      context: VerifiedTenantContext;
      notice: OfficialNoticeListItemDto;
      comments: readonly NoticeCommentDto[];
      acknowledgements: readonly NoticeAcknowledgementRowDto[];
      guardianWards: readonly {
        studentProfileId: string;
        fullName: string;
        admissionNumber: string;
      }[];
      canAcknowledge: boolean;
      canPublish: boolean;
      canArchive: boolean;
      canComment: boolean;
      canPostInternalNote: boolean;
      canAccessEnquiries: boolean;
    };

export interface ParentEnquiryListItemDto {
  id: string;
  studentProfileId: string;
  studentName: string;
  admissionNumber: string;
  guardianName: string;
  category: EnquiryCategory;
  subject: string;
  body: string;
  status: EnquiryStatus;
  assignedToName: string | null;
  sectionLabel: string | null;
  teachingGroupLabel: string | null;
  resolutionSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParentEnquiriesWorkspaceDto {
  context: VerifiedTenantContext;
  allowed: boolean;
  isMonitorRestricted: boolean;
  activeSession: { id: string; code: string; name: string } | null;
  statusFilter: EnquiryStatus | "all";
  categoryFilter: EnquiryCategory | "all";
  enquiries: readonly ParentEnquiryListItemDto[];
  guardianWards: readonly {
    studentProfileId: string;
    fullName: string;
    admissionNumber: string;
  }[];
  teachingGroups: readonly CommunicationTeachingGroupOptionDto[];
  canSubmitEnquiry: boolean;
  canManageEnquiries: boolean;
}

export type ParentEnquiryDetailResult =
  | { status: "denied"; reason: string }
  | { status: "not-found" }
  | {
      status: "ok";
      context: VerifiedTenantContext;
      enquiry: ParentEnquiryListItemDto & {
        assignedToPersonId: string | null;
        guardianPersonId: string;
      };
      comments: readonly NoticeCommentDto[];
      staffAssignees: readonly { personId: string; fullName: string; designation: string | null }[];
      canManageEnquiry: boolean;
      canGuardianClose: boolean;
      canPostInternalNote: boolean;
      whatsAppUrl: string | null;
    };

interface CallerCommunicationScope {
  activeSession: { id: string; code: string; name: string } | null;
  isNoticeLeadership: boolean;
  isStaffOrLeadership: boolean;
  canAccessEnquiries: boolean;
  isMonitorRestricted: boolean;
  hodDepartmentIds: Set<string>;
  classTeacherSectionIds: Set<string>;
  subjectTeacherGroupIds: Set<string>;
  monitorSectionIds: Set<string>;
  guardianWards: {
    studentProfileId: string;
    fullName: string;
    admissionNumber: string;
  }[];
  authoringPolicy: NoticeAuthoringPolicy;
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
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
}

function unwrapJoin<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

async function fetchPersonNameMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  personIds: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const uniqueIds = [
    ...new Set(personIds.filter((id): id is string => Boolean(id))),
  ];
  if (uniqueIds.length === 0) return new Map();

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

  return new Map(
    (data ?? []).map((p) => [p.id, p.display_name?.trim() || p.full_name]),
  );
}

async function loadCallerCommunicationScope(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  context: VerifiedTenantContext,
  todayDate: string,
): Promise<CallerCommunicationScope> {
  const [sessionRes, assignmentsRes, staffRes, guardianLinksRes] =
    await Promise.all([
      supabase
        .from("academic_sessions")
        .select("id, code, name")
        .eq("institution_id", context.institutionId)
        .eq("status", "active")
        .maybeSingle<{ id: string; code: string; name: string }>(),
      supabase
        .from("academic_assignments")
        .select(
          "session_id, assignment_type, department_id, section_id, teaching_group_id, starts_on, ends_on",
        )
        .eq("institution_id", context.institutionId)
        .eq("person_id", context.personId)
        .in("status", ["active", "delegated"])
        .lte("starts_on", todayDate)
        .returns<
          {
            session_id: string;
            assignment_type: string;
            department_id: string | null;
            section_id: string | null;
            teaching_group_id: string | null;
            starts_on: string;
            ends_on: string | null;
          }[]
        >(),
      supabase
        .from("staff_profiles")
        .select("id")
        .eq("institution_id", context.institutionId)
        .eq("person_id", context.personId)
        .eq("lifecycle_status", "active")
        .maybeSingle<{ id: string }>(),
      supabase
        .from("student_guardians")
        .select("student_profile_id")
        .eq("institution_id", context.institutionId)
        .eq("guardian_person_id", context.personId)
        .eq("status", "active")
        .returns<{ student_profile_id: string }[]>(),
    ]);

  if (sessionRes.error) {
    throw new Error(`Failed to load active session: ${sessionRes.error.message}`);
  }
  if (assignmentsRes.error) {
    throw new Error(
      `Failed to load caller assignments: ${assignmentsRes.error.message}`,
    );
  }
  if (staffRes.error) {
    throw new Error(`Failed to check staff status: ${staffRes.error.message}`);
  }
  if (guardianLinksRes.error) {
    throw new Error(
      `Failed to load guardian links: ${guardianLinksRes.error.message}`,
    );
  }

  const activeSession = sessionRes.data ?? null;
  const hodDepartmentIds = new Set<string>();
  const classTeacherSectionIds = new Set<string>();
  const subjectTeacherGroupIds = new Set<string>();
  const monitorSectionIds = new Set<string>();

  for (const row of assignmentsRes.data ?? []) {
    if (row.ends_on && row.ends_on < todayDate) continue;
    if (activeSession && row.session_id !== activeSession.id) continue;

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

  const wardIds = (guardianLinksRes.data ?? []).map(
    (g) => g.student_profile_id,
  );
  let guardianWards: {
    studentProfileId: string;
    fullName: string;
    admissionNumber: string;
  }[] = [];

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

    const wardNames = await fetchPersonNameMap(
      supabase,
      (wardProfiles ?? []).map((p) => p.person_id),
    );
    guardianWards = (wardProfiles ?? []).map((p) => ({
      studentProfileId: p.id,
      fullName: wardNames.get(p.person_id) ?? p.admission_number,
      admissionNumber: p.admission_number,
    }));
  }

  const isNoticeLeadership = evaluatePermission(context, {
    permission: "academics.manage",
  }).allowed;
  const hasPeopleOrAttendance =
    evaluatePermission(context, { permission: "people.read" }).allowed ||
    evaluatePermission(context, { permission: "people.manage" }).allowed ||
    evaluatePermission(context, { permission: "attendance.manage" }).allowed;

  const isStaffOrLeadership =
    isNoticeLeadership ||
    hasPeopleOrAttendance ||
    Boolean(staffRes.data) ||
    hodDepartmentIds.size > 0 ||
    classTeacherSectionIds.size > 0 ||
    subjectTeacherGroupIds.size > 0;

  const canAccessEnquiries = isStaffOrLeadership || guardianWards.length > 0;
  const isMonitorRestricted =
    !canAccessEnquiries &&
    (monitorSectionIds.size > 0 ||
      evaluatePermission(context, { permission: "classroom.summary.read" })
        .allowed);

  const authoringPolicy = resolveNoticeAuthoringPolicy({
    isLeadership: isNoticeLeadership,
    hodDepartmentIds: [...hodDepartmentIds],
    classTeacherSectionIds: [...classTeacherSectionIds],
    subjectTeacherGroupIds: [...subjectTeacherGroupIds],
  });

  return {
    activeSession,
    isNoticeLeadership,
    isStaffOrLeadership,
    canAccessEnquiries,
    isMonitorRestricted,
    hodDepartmentIds,
    classTeacherSectionIds,
    subjectTeacherGroupIds,
    monitorSectionIds,
    guardianWards,
    authoringPolicy,
  };
}

async function resolveScopeTargetLabels(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  institutionId: string,
): Promise<{
  departmentById: Map<string, CommunicationDepartmentOptionDto>;
  sectionById: Map<string, CommunicationSectionOptionDto>;
  groupById: Map<string, CommunicationTeachingGroupOptionDto>;
}> {
  const [deptsRes, secsRes, tgsRes] = await Promise.all([
    supabase
      .from("academic_departments")
      .select("id, code, name")
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("code", { ascending: true })
      .returns<{ id: string; code: string; name: string }[]>(),
    supabase
      .from("sections")
      .select("id, code, name, grade:grade_levels(code)")
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("code", { ascending: true })
      .returns<
        {
          id: string;
          code: string;
          name: string;
          grade: { code: string } | { code: string }[] | null;
        }[]
      >(),
    supabase
      .from("teaching_groups")
      .select(
        "id, code, name, offering:subject_offerings(subject:subjects(name))",
      )
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("code", { ascending: true })
      .returns<
        {
          id: string;
          code: string;
          name: string;
          offering:
            | { subject: { name: string } | { name: string }[] | null }
            | { subject: { name: string } | { name: string }[] | null }[]
            | null;
        }[]
      >(),
  ]);

  if (deptsRes.error) {
    throw new Error(`Failed to load departments: ${deptsRes.error.message}`);
  }
  if (secsRes.error) {
    throw new Error(`Failed to load sections: ${secsRes.error.message}`);
  }
  if (tgsRes.error) {
    throw new Error(`Failed to load teaching groups: ${tgsRes.error.message}`);
  }

  const departmentById = new Map<string, CommunicationDepartmentOptionDto>(
    (deptsRes.data ?? []).map((d) => [d.id, d]),
  );

  const sectionById = new Map<string, CommunicationSectionOptionDto>(
    (secsRes.data ?? []).map((s) => [
      s.id,
      {
        id: s.id,
        gradeCode: unwrapJoin(s.grade)?.code ?? "",
        code: s.code,
        name: s.name,
      },
    ]),
  );

  const groupById = new Map<string, CommunicationTeachingGroupOptionDto>(
    (tgsRes.data ?? []).map((tg) => {
      const offering = unwrapJoin(tg.offering);
      const subject = unwrapJoin(offering?.subject);
      return [
        tg.id,
        {
          id: tg.id,
          code: tg.code,
          name: tg.name,
          subjectName: subject?.name ?? "Subject",
        },
      ];
    }),
  );

  return { departmentById, sectionById, groupById };
}

function formatNoticeTargetLabel(
  row: {
    scope_type: NoticeScopeType;
    department_id: string | null;
    section_id: string | null;
    teaching_group_id: string | null;
  },
  maps: {
    departmentById: Map<string, CommunicationDepartmentOptionDto>;
    sectionById: Map<string, CommunicationSectionOptionDto>;
    groupById: Map<string, CommunicationTeachingGroupOptionDto>;
  },
): string {
  if (row.scope_type === "institution") return "Whole Institution";
  if (row.scope_type === "department" && row.department_id) {
    const dept = maps.departmentById.get(row.department_id);
    return dept ? `${dept.code} — ${dept.name}` : "Department";
  }
  if (row.scope_type === "section" && row.section_id) {
    const sec = maps.sectionById.get(row.section_id);
    return sec ? `${sec.gradeCode} ${sec.code}`.trim() : "Section";
  }
  if (row.scope_type === "teaching_group" && row.teaching_group_id) {
    const tg = maps.groupById.get(row.teaching_group_id);
    return tg ? `${tg.code} — ${tg.subjectName}` : "Teaching Group";
  }
  return row.scope_type;
}

export async function getNoticesWorkspace(
  context: VerifiedTenantContext,
  options: {
    scopeFilter?: string;
    categoryFilter?: string;
    includeDrafts?: boolean;
  } = {},
): Promise<NoticesWorkspaceDto> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerCommunicationScope(supabase, context, todayDate);

  const scopeFilter: NoticeScopeType | "all" =
    options.scopeFilter &&
    (NOTICE_SCOPE_TYPES as readonly string[]).includes(options.scopeFilter)
      ? (options.scopeFilter as NoticeScopeType)
      : "all";

  const categoryFilter: NoticeCategory | "all" =
    options.categoryFilter &&
    (NOTICE_CATEGORIES as readonly string[]).includes(options.categoryFilter)
      ? (options.categoryFilter as NoticeCategory)
      : "all";

  const includeDrafts =
    Boolean(options.includeDrafts) && scope.isStaffOrLeadership;

  let noticesQuery = supabase
    .from("official_notices")
    .select(
      "id, scope_type, department_id, section_id, teaching_group_id, category, title, body, requires_acknowledgement, is_offline_cacheable, status, published_at, authored_by_person_id, created_at",
    )
    .eq("institution_id", context.institutionId)
    .order("published_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(60);

  if (scopeFilter !== "all") {
    noticesQuery = noticesQuery.eq("scope_type", scopeFilter);
  }
  if (categoryFilter !== "all") {
    noticesQuery = noticesQuery.eq("category", categoryFilter);
  }
  if (!includeDrafts) {
    noticesQuery = noticesQuery.eq("status", "published");
  } else {
    noticesQuery = noticesQuery.in("status", ["draft", "published"]);
  }

  const [noticesRes, maps] = await Promise.all([
    noticesQuery.returns<
      {
        id: string;
        scope_type: NoticeScopeType;
        department_id: string | null;
        section_id: string | null;
        teaching_group_id: string | null;
        category: NoticeCategory;
        title: string;
        body: string;
        requires_acknowledgement: boolean;
        is_offline_cacheable: boolean;
        status: NoticeStatus;
        published_at: string | null;
        authored_by_person_id: string;
        created_at: string;
      }[]
    >(),
    resolveScopeTargetLabels(supabase, context.institutionId),
  ]);

  if (noticesRes.error) {
    throw new Error(`Failed to load official notices: ${noticesRes.error.message}`);
  }

  const noticeRows = noticesRes.data ?? [];
  const noticeIds = noticeRows.map((n) => n.id);

  let ackRows: { notice_id: string; person_id: string }[] = [];
  if (noticeIds.length > 0) {
    const { data: ackData, error: ackErr } = await supabase
      .from("notice_acknowledgements")
      .select("notice_id, person_id")
      .eq("institution_id", context.institutionId)
      .in("notice_id", noticeIds)
      .returns<{ notice_id: string; person_id: string }[]>();

    if (ackErr) {
      throw new Error(
        `Failed to load notice acknowledgements: ${ackErr.message}`,
      );
    }
    ackRows = ackData ?? [];
  }

  const ackCountByNotice = new Map<string, number>();
  const callerAckSet = new Set<string>();
  for (const ack of ackRows) {
    ackCountByNotice.set(
      ack.notice_id,
      (ackCountByNotice.get(ack.notice_id) ?? 0) + 1,
    );
    if (ack.person_id === context.personId) {
      callerAckSet.add(ack.notice_id);
    }
  }

  const authorNames = await fetchPersonNameMap(
    supabase,
    noticeRows.map((n) => n.authored_by_person_id),
  );

  const notices: OfficialNoticeListItemDto[] = noticeRows.map((n) => ({
    id: n.id,
    scopeType: n.scope_type,
    targetLabel: formatNoticeTargetLabel(n, maps),
    category: n.category,
    title: n.title,
    body: n.body,
    requiresAcknowledgement: n.requires_acknowledgement,
    isOfflineCacheable: n.is_offline_cacheable,
    status: n.status,
    publishedAt: n.published_at,
    authoredByName: authorNames.get(n.authored_by_person_id) ?? "Staff",
    acknowledgementCount: ackCountByNotice.get(n.id) ?? 0,
    callerHasAcknowledged: callerAckSet.has(n.id),
    createdAt: n.created_at,
  }));

  const cacheableNotices = filterCacheablePublishedNotices(notices);

  const departments = scope.authoringPolicy.isLeadership
    ? [...maps.departmentById.values()]
    : [...maps.departmentById.values()].filter((d) =>
        scope.authoringPolicy.allowedDepartmentIds.includes(d.id),
      );
  const sections = scope.authoringPolicy.isLeadership
    ? [...maps.sectionById.values()]
    : [...maps.sectionById.values()].filter((s) =>
        scope.authoringPolicy.allowedSectionIds.includes(s.id),
      );
  const teachingGroups = scope.authoringPolicy.isLeadership
    ? [...maps.groupById.values()]
    : [...maps.groupById.values()].filter((tg) =>
        scope.authoringPolicy.allowedTeachingGroupIds.includes(tg.id),
      );

  return {
    context,
    activeSession: scope.activeSession,
    scopeFilter,
    categoryFilter,
    includeDrafts,
    notices,
    cacheableNotices,
    authoringPolicy: scope.authoringPolicy,
    departments,
    sections,
    teachingGroups,
    canAccessEnquiries: scope.canAccessEnquiries,
    isMonitorRestricted: scope.isMonitorRestricted,
  };
}

export async function getNoticeDetail(
  context: VerifiedTenantContext,
  noticeId: string,
): Promise<NoticeDetailResult> {
  if (!z.string().uuid().safeParse(noticeId).success) {
    return { status: "not-found" };
  }

  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerCommunicationScope(supabase, context, todayDate);

  const [noticeRes, maps] = await Promise.all([
    supabase
      .from("official_notices")
      .select(
        "id, scope_type, department_id, section_id, teaching_group_id, category, title, body, requires_acknowledgement, is_offline_cacheable, status, published_at, authored_by_person_id, created_at",
      )
      .eq("institution_id", context.institutionId)
      .eq("id", noticeId)
      .maybeSingle<{
        id: string;
        scope_type: NoticeScopeType;
        department_id: string | null;
        section_id: string | null;
        teaching_group_id: string | null;
        category: NoticeCategory;
        title: string;
        body: string;
        requires_acknowledgement: boolean;
        is_offline_cacheable: boolean;
        status: NoticeStatus;
        published_at: string | null;
        authored_by_person_id: string;
        created_at: string;
      }>(),
    resolveScopeTargetLabels(supabase, context.institutionId),
  ]);

  if (noticeRes.error) {
    throw new Error(`Failed to load notice: ${noticeRes.error.message}`);
  }
  if (!noticeRes.data) {
    return { status: "not-found" };
  }

  const n = noticeRes.data;
  const [ackRes, commentsRes] = await Promise.all([
    supabase
      .from("notice_acknowledgements")
      .select("id, person_id, student_profile_id, acknowledged_at, note")
      .eq("institution_id", context.institutionId)
      .eq("notice_id", n.id)
      .order("acknowledged_at", { ascending: false })
      .returns<
        {
          id: string;
          person_id: string;
          student_profile_id: string | null;
          acknowledged_at: string;
          note: string | null;
        }[]
      >(),
    supabase
      .from("record_comments")
      .select("id, authored_by_person_id, body, is_internal_staff_note, created_at")
      .eq("institution_id", context.institutionId)
      .eq("parent_kind", "notice")
      .eq("notice_id", n.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .returns<
        {
          id: string;
          authored_by_person_id: string;
          body: string;
          is_internal_staff_note: boolean;
          created_at: string;
        }[]
      >(),
  ]);

  if (ackRes.error) {
    throw new Error(`Failed to load acknowledgements: ${ackRes.error.message}`);
  }
  if (commentsRes.error) {
    throw new Error(`Failed to load comments: ${commentsRes.error.message}`);
  }

  const ackRows = ackRes.data ?? [];
  const commentRows = commentsRes.data ?? [];

  const studentIds = [
    ...new Set(
      ackRows
        .map((a) => a.student_profile_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const studentNameById = new Map<string, string>();
  const allPersonIds = [
    n.authored_by_person_id,
    ...ackRows.map((a) => a.person_id),
    ...commentRows.map((c) => c.authored_by_person_id),
  ];

  let studentProfilesData: { id: string; person_id: string; admission_number: string }[] = [];
  if (studentIds.length > 0 && scope.isStaffOrLeadership) {
    const { data: stData, error: stErr } = await supabase
      .from("student_profiles")
      .select("id, person_id, admission_number")
      .eq("institution_id", context.institutionId)
      .in("id", studentIds)
      .returns<{ id: string; person_id: string; admission_number: string }[]>();

    if (!stErr && stData) {
      studentProfilesData = stData;
      allPersonIds.push(...stData.map((s) => s.person_id));
    }
  }

  const personNames = await fetchPersonNameMap(supabase, allPersonIds);
  for (const sp of studentProfilesData) {
    studentNameById.set(
      sp.id,
      personNames.get(sp.person_id) ?? sp.admission_number,
    );
  }

  const callerHasAcknowledged = ackRows.some(
    (a) => a.person_id === context.personId,
  );
  const canAuthorForNotice =
    scope.isNoticeLeadership ||
    (n.authored_by_person_id === context.personId &&
      validateNoticeAuthoringAgainstPolicy(
        {
          scopeType: n.scope_type,
          departmentId: n.department_id,
          sectionId: n.section_id,
          teachingGroupId: n.teaching_group_id,
        },
        scope.authoringPolicy,
      ).ok);

  const canPublish =
    canAuthorForNotice && canTransitionNoticeStatus(n.status, "published");
  const canArchive =
    canAuthorForNotice && canTransitionNoticeStatus(n.status, "archived");
  const canAcknowledge =
    n.status === "published" &&
    n.requires_acknowledgement &&
    !callerHasAcknowledged;
  const canComment = scope.isStaffOrLeadership && n.status !== "archived";
  const canPostInternalNote =
    canComment &&
    canPostInternalStaffNote({ isStaffOrLeadership: scope.isStaffOrLeadership });

  return {
    status: "ok",
    context,
    notice: {
      id: n.id,
      scopeType: n.scope_type,
      targetLabel: formatNoticeTargetLabel(n, maps),
      category: n.category,
      title: n.title,
      body: n.body,
      requiresAcknowledgement: n.requires_acknowledgement,
      isOfflineCacheable: n.is_offline_cacheable,
      status: n.status,
      publishedAt: n.published_at,
      authoredByName: personNames.get(n.authored_by_person_id) ?? "Staff",
      acknowledgementCount: ackRows.length,
      callerHasAcknowledged,
      createdAt: n.created_at,
    },
    comments: commentRows.map((c) => ({
      id: c.id,
      body: c.body,
      isInternalStaffNote: c.is_internal_staff_note,
      authoredByPersonId: c.authored_by_person_id,
      authoredByName: personNames.get(c.authored_by_person_id) ?? "Staff",
      createdAt: c.created_at,
    })),
    acknowledgements: scope.isStaffOrLeadership
      ? ackRows.map((a) => ({
          id: a.id,
          personName: personNames.get(a.person_id) ?? "Member",
          studentName: a.student_profile_id
            ? (studentNameById.get(a.student_profile_id) ?? null)
            : null,
          acknowledgedAt: a.acknowledged_at,
          note: a.note,
        }))
      : [],
    guardianWards: scope.guardianWards,
    canAcknowledge,
    canPublish,
    canArchive,
    canComment,
    canPostInternalNote,
    canAccessEnquiries: scope.canAccessEnquiries,
  };
}

export async function createOfficialNotice(
  slug: string,
  rawInput: unknown,
): Promise<CommunicationActionResult<{ id: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return {
      ok: false,
      error: "Workspace authorization required.",
      status: resolution.status === "unauthenticated" ? 401 : 403,
    };
  }

  const parsed = createOfficialNoticeSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid official notice.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerCommunicationScope(supabase, context, todayDate);

  if (!scope.activeSession) {
    return {
      ok: false,
      error: "An active academic session is required before issuing notices.",
      status: 400,
    };
  }

  const guard = validateNoticeAuthoringAgainstPolicy(
    parsed.data,
    scope.authoringPolicy,
  );
  if (!guard.ok) {
    return { ok: false, error: guard.error, status: 403 };
  }

  const publishedAt =
    parsed.data.initialStatus === "published" ? new Date().toISOString() : null;

  const { data: inserted, error: insertErr } = await supabase
    .from("official_notices")
    .insert({
      institution_id: context.institutionId,
      session_id: scope.activeSession.id,
      scope_type: parsed.data.scopeType,
      department_id: parsed.data.departmentId,
      section_id: parsed.data.sectionId,
      teaching_group_id: parsed.data.teachingGroupId,
      category: parsed.data.category,
      title: parsed.data.title,
      body: parsed.data.body,
      requires_acknowledgement: parsed.data.requiresAcknowledgement,
      is_offline_cacheable: parsed.data.isOfflineCacheable,
      status: parsed.data.initialStatus,
      published_at: publishedAt,
      authored_by_person_id: context.personId,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: insertErr?.message ?? "Failed to create official notice.",
      status: 403,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "communication.notice_created",
    entityType: "official_notices",
    entityId: inserted.id,
    afterState: {
      scopeType: parsed.data.scopeType,
      category: parsed.data.category,
      status: parsed.data.initialStatus,
      requiresAcknowledgement: parsed.data.requiresAcknowledgement,
      isOfflineCacheable: parsed.data.isOfflineCacheable,
    },
  });

  return { ok: true, data: { id: inserted.id } };
}

export async function transitionOfficialNoticeStatus(
  slug: string,
  rawInput: unknown,
): Promise<CommunicationActionResult<{ id: string; status: NoticeStatus }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = transitionNoticeStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid notice transition.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("official_notices")
    .select("id, status, published_at")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.noticeId)
    .maybeSingle<{ id: string; status: NoticeStatus; published_at: string | null }>();

  if (fetchErr || !existing) {
    return { ok: false, error: "Official notice not found.", status: 404 };
  }

  if (!canTransitionNoticeStatus(existing.status, parsed.data.targetStatus)) {
    return {
      ok: false,
      error: `Cannot transition notice from "${existing.status}" to "${parsed.data.targetStatus}".`,
      status: 400,
    };
  }

  const publishedAt =
    parsed.data.targetStatus === "published"
      ? (existing.published_at ?? new Date().toISOString())
      : existing.published_at;

  const { error: updateErr } = await supabase
    .from("official_notices")
    .update({
      status: parsed.data.targetStatus,
      published_at: publishedAt,
    })
    .eq("institution_id", context.institutionId)
    .eq("id", existing.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message, status: 403 };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "communication.notice_status_updated",
    entityType: "official_notices",
    entityId: existing.id,
    beforeState: { status: existing.status },
    afterState: { status: parsed.data.targetStatus },
  });

  return {
    ok: true,
    data: { id: existing.id, status: parsed.data.targetStatus },
  };
}

export async function acknowledgeOfficialNotice(
  slug: string,
  rawInput: unknown,
): Promise<CommunicationActionResult<{ alreadyAcknowledged: boolean }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = acknowledgeNoticeSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Invalid notice acknowledgement.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();

  let checkQuery = supabase
    .from("notice_acknowledgements")
    .select("id")
    .eq("institution_id", context.institutionId)
    .eq("notice_id", parsed.data.noticeId)
    .eq("person_id", context.personId);

  checkQuery = parsed.data.studentProfileId
    ? checkQuery.eq("student_profile_id", parsed.data.studentProfileId)
    : checkQuery.is("student_profile_id", null);

  const { data: existingAck, error: checkErr } =
    await checkQuery.maybeSingle<{ id: string }>();

  if (checkErr) {
    return { ok: false, error: checkErr.message, status: 500 };
  }
  if (existingAck) {
    return { ok: true, data: { alreadyAcknowledged: true } };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("notice_acknowledgements")
    .insert({
      institution_id: context.institutionId,
      notice_id: parsed.data.noticeId,
      person_id: context.personId,
      student_profile_id: parsed.data.studentProfileId,
      note: parsed.data.note || null,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: insertErr?.message ?? "Unable to acknowledge notice.",
      status: 403,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "communication.notice_acknowledged",
    entityType: "notice_acknowledgements",
    entityId: inserted.id,
    afterState: {
      noticeId: parsed.data.noticeId,
      studentProfileId: parsed.data.studentProfileId,
    },
  });

  return { ok: true, data: { alreadyAcknowledged: false } };
}

export async function getParentEnquiriesWorkspace(
  context: VerifiedTenantContext,
  options: { statusFilter?: string; categoryFilter?: string } = {},
): Promise<ParentEnquiriesWorkspaceDto> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerCommunicationScope(supabase, context, todayDate);

  const statusFilter: EnquiryStatus | "all" =
    options.statusFilter &&
    (ENQUIRY_STATUSES as readonly string[]).includes(options.statusFilter)
      ? (options.statusFilter as EnquiryStatus)
      : "all";

  const categoryFilter: EnquiryCategory | "all" =
    options.categoryFilter &&
    (ENQUIRY_CATEGORIES as readonly string[]).includes(options.categoryFilter)
      ? (options.categoryFilter as EnquiryCategory)
      : "all";

  if (scope.isMonitorRestricted || !scope.canAccessEnquiries) {
    return {
      context,
      allowed: false,
      isMonitorRestricted: scope.isMonitorRestricted,
      activeSession: scope.activeSession,
      statusFilter,
      categoryFilter,
      enquiries: [],
      guardianWards: [],
      teachingGroups: [],
      canSubmitEnquiry: false,
      canManageEnquiries: false,
    };
  }

  let enquiriesQuery = supabase
    .from("parent_enquiries")
    .select(
      "id, student_profile_id, guardian_person_id, category, subject, body, status, assigned_to_person_id, section_id, teaching_group_id, resolution_summary, created_at, updated_at",
    )
    .eq("institution_id", context.institutionId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (statusFilter !== "all") {
    enquiriesQuery = enquiriesQuery.eq("status", statusFilter);
  }
  if (categoryFilter !== "all") {
    enquiriesQuery = enquiriesQuery.eq("category", categoryFilter);
  }

  const [enquiriesRes, maps] = await Promise.all([
    enquiriesQuery.returns<
      {
        id: string;
        student_profile_id: string;
        guardian_person_id: string;
        category: EnquiryCategory;
        subject: string;
        body: string;
        status: EnquiryStatus;
        assigned_to_person_id: string | null;
        section_id: string | null;
        teaching_group_id: string | null;
        resolution_summary: string | null;
        created_at: string;
        updated_at: string;
      }[]
    >(),
    resolveScopeTargetLabels(supabase, context.institutionId),
  ]);

  if (enquiriesRes.error) {
    throw new Error(
      `Failed to load parent enquiries: ${enquiriesRes.error.message}`,
    );
  }

  const rows = enquiriesRes.data ?? [];
  const studentIds = [...new Set(rows.map((r) => r.student_profile_id))];
  const studentMap = new Map<
    string,
    { personId: string; admissionNumber: string }
  >();

  if (studentIds.length > 0) {
    const { data: stData, error: stErr } = await supabase
      .from("student_profiles")
      .select("id, person_id, admission_number")
      .eq("institution_id", context.institutionId)
      .in("id", studentIds)
      .returns<{ id: string; person_id: string; admission_number: string }[]>();

    if (stErr) {
      throw new Error(`Failed to load enquiry students: ${stErr.message}`);
    }
    for (const s of stData ?? []) {
      studentMap.set(s.id, {
        personId: s.person_id,
        admissionNumber: s.admission_number,
      });
    }
  }

  const personNames = await fetchPersonNameMap(supabase, [
    ...rows.map((r) => r.guardian_person_id),
    ...rows.map((r) => r.assigned_to_person_id),
    ...[...studentMap.values()].map((s) => s.personId),
  ]);

  const enquiries: ParentEnquiryListItemDto[] = rows.map((r) => {
    const st = studentMap.get(r.student_profile_id);
    const sec = r.section_id ? maps.sectionById.get(r.section_id) : undefined;
    const tg = r.teaching_group_id
      ? maps.groupById.get(r.teaching_group_id)
      : undefined;

    return {
      id: r.id,
      studentProfileId: r.student_profile_id,
      studentName: st ? (personNames.get(st.personId) ?? st.admissionNumber) : "Student",
      admissionNumber: st?.admissionNumber ?? "—",
      guardianName: personNames.get(r.guardian_person_id) ?? "Guardian",
      category: r.category,
      subject: r.subject,
      body: r.body,
      status: r.status,
      assignedToName: r.assigned_to_person_id
        ? (personNames.get(r.assigned_to_person_id) ?? null)
        : null,
      sectionLabel: sec ? `${sec.gradeCode} ${sec.code}`.trim() : null,
      teachingGroupLabel: tg ? `${tg.code} — ${tg.subjectName}` : null,
      resolutionSummary: r.resolution_summary,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  return {
    context,
    allowed: true,
    isMonitorRestricted: false,
    activeSession: scope.activeSession,
    statusFilter,
    categoryFilter,
    enquiries,
    guardianWards: scope.guardianWards,
    teachingGroups: [...maps.groupById.values()],
    canSubmitEnquiry: scope.guardianWards.length > 0,
    canManageEnquiries: scope.isStaffOrLeadership,
  };
}

export async function getParentEnquiryDetail(
  context: VerifiedTenantContext,
  enquiryId: string,
): Promise<ParentEnquiryDetailResult> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerCommunicationScope(supabase, context, todayDate);

  if (scope.isMonitorRestricted || !scope.canAccessEnquiries) {
    return {
      status: "denied",
      reason:
        "Parent enquiry cases are restricted strictly to linked guardians, assigned academic staff, and authorized institutional leadership.",
    };
  }

  if (!z.string().uuid().safeParse(enquiryId).success) {
    return { status: "not-found" };
  }

  const [enquiryRes, maps] = await Promise.all([
    supabase
      .from("parent_enquiries")
      .select(
        "id, student_profile_id, guardian_person_id, category, subject, body, status, assigned_to_person_id, section_id, teaching_group_id, resolution_summary, created_at, updated_at",
      )
      .eq("institution_id", context.institutionId)
      .eq("id", enquiryId)
      .maybeSingle<{
        id: string;
        student_profile_id: string;
        guardian_person_id: string;
        category: EnquiryCategory;
        subject: string;
        body: string;
        status: EnquiryStatus;
        assigned_to_person_id: string | null;
        section_id: string | null;
        teaching_group_id: string | null;
        resolution_summary: string | null;
        created_at: string;
        updated_at: string;
      }>(),
    resolveScopeTargetLabels(supabase, context.institutionId),
  ]);

  if (enquiryRes.error) {
    throw new Error(`Failed to load enquiry: ${enquiryRes.error.message}`);
  }
  if (!enquiryRes.data) {
    return { status: "not-found" };
  }

  const r = enquiryRes.data;
  const [studentRes, commentsRes, staffRes, guardianPhoneRes] =
    await Promise.all([
      supabase
        .from("student_profiles")
        .select("id, person_id, admission_number")
        .eq("institution_id", context.institutionId)
        .eq("id", r.student_profile_id)
        .maybeSingle<{ id: string; person_id: string; admission_number: string }>(),
      supabase
        .from("record_comments")
        .select("id, authored_by_person_id, body, is_internal_staff_note, created_at")
        .eq("institution_id", context.institutionId)
        .eq("parent_kind", "parent_enquiry")
        .eq("parent_enquiry_id", r.id)
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .returns<
          {
            id: string;
            authored_by_person_id: string;
            body: string;
            is_internal_staff_note: boolean;
            created_at: string;
          }[]
        >(),
      scope.isStaffOrLeadership
        ? supabase
            .from("staff_profiles")
            .select("person_id, designation")
            .eq("institution_id", context.institutionId)
            .eq("lifecycle_status", "active")
            .order("employee_code", { ascending: true })
            .returns<{ person_id: string; designation: string | null }[]>()
        : Promise.resolve({ data: [], error: null }),
      scope.isStaffOrLeadership
        ? supabase
            .from("persons")
            .select("primary_phone")
            .eq("id", r.guardian_person_id)
            .maybeSingle<{ primary_phone: string | null }>()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (commentsRes.error) {
    throw new Error(`Failed to load comments: ${commentsRes.error.message}`);
  }
  if (staffRes.error) {
    throw new Error(`Failed to load staff roster: ${staffRes.error.message}`);
  }

  const commentRows = commentsRes.data ?? [];
  const staffRows = staffRes.data ?? [];

  const personNames = await fetchPersonNameMap(supabase, [
    r.guardian_person_id,
    r.assigned_to_person_id,
    studentRes.data?.person_id,
    ...commentRows.map((c) => c.authored_by_person_id),
    ...staffRows.map((st) => st.person_id),
  ]);

  const sec = r.section_id ? maps.sectionById.get(r.section_id) : undefined;
  const tg = r.teaching_group_id
    ? maps.groupById.get(r.teaching_group_id)
    : undefined;

  const canManageEnquiry =
    scope.isStaffOrLeadership && r.status !== "closed";
  const canGuardianClose =
    r.guardian_person_id === context.personId &&
    (r.status === "open" || r.status === "resolved");
  const canPostInternalNote =
    scope.isStaffOrLeadership &&
    canPostInternalStaffNote({ isStaffOrLeadership: scope.isStaffOrLeadership });

  const whatsAppUrl = scope.isStaffOrLeadership
    ? buildWhatsAppClickToChatUrl({
        phone: guardianPhoneRes.data?.primary_phone,
        prefillText: `Regarding formal DD-oodle enquiry: ${r.subject}`,
      })
    : null;

  return {
    status: "ok",
    context,
    enquiry: {
      id: r.id,
      studentProfileId: r.student_profile_id,
      studentName: studentRes.data
        ? (personNames.get(studentRes.data.person_id) ??
          studentRes.data.admission_number)
        : "Student",
      admissionNumber: studentRes.data?.admission_number ?? "—",
      guardianPersonId: r.guardian_person_id,
      guardianName: personNames.get(r.guardian_person_id) ?? "Guardian",
      category: r.category,
      subject: r.subject,
      body: r.body,
      status: r.status,
      assignedToPersonId: r.assigned_to_person_id,
      assignedToName: r.assigned_to_person_id
        ? (personNames.get(r.assigned_to_person_id) ?? null)
        : null,
      sectionLabel: sec ? `${sec.gradeCode} ${sec.code}`.trim() : null,
      teachingGroupLabel: tg ? `${tg.code} — ${tg.subjectName}` : null,
      resolutionSummary: r.resolution_summary,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    },
    comments: commentRows.map((c) => ({
      id: c.id,
      body: c.body,
      isInternalStaffNote: c.is_internal_staff_note,
      authoredByPersonId: c.authored_by_person_id,
      authoredByName: personNames.get(c.authored_by_person_id) ?? "Member",
      createdAt: c.created_at,
    })),
    staffAssignees: staffRows.map((st) => ({
      personId: st.person_id,
      fullName: personNames.get(st.person_id) ?? "Staff",
      designation: st.designation,
    })),
    canManageEnquiry,
    canGuardianClose,
    canPostInternalNote,
    whatsAppUrl,
  };
}

export async function createParentEnquiry(
  slug: string,
  rawInput: unknown,
): Promise<CommunicationActionResult<{ id: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return {
      ok: false,
      error: "Workspace authorization required.",
      status: resolution.status === "unauthenticated" ? 401 : 403,
    };
  }

  const parsed = createParentEnquirySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid parent enquiry.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerCommunicationScope(supabase, context, todayDate);

  if (!scope.activeSession) {
    return {
      ok: false,
      error: "An active academic session is required to log enquiries.",
      status: 400,
    };
  }

  if (
    !scope.guardianWards.some(
      (w) => w.studentProfileId === parsed.data.studentProfileId,
    )
  ) {
    return {
      ok: false,
      error:
        "Parent enquiries can only be filed by an active linked guardian for their ward.",
      status: 403,
    };
  }

  const { data: enrolment } = await supabase
    .from("student_session_enrolments")
    .select("section_id")
    .eq("institution_id", context.institutionId)
    .eq("session_id", scope.activeSession.id)
    .eq("student_profile_id", parsed.data.studentProfileId)
    .eq("status", "active")
    .maybeSingle<{ section_id: string }>();

  const { data: inserted, error: insertErr } = await supabase
    .from("parent_enquiries")
    .insert({
      institution_id: context.institutionId,
      session_id: scope.activeSession.id,
      student_profile_id: parsed.data.studentProfileId,
      guardian_person_id: context.personId,
      category: parsed.data.category,
      subject: parsed.data.subject,
      body: parsed.data.body,
      status: "open",
      section_id: enrolment?.section_id ?? null,
      teaching_group_id: parsed.data.teachingGroupId,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: insertErr?.message ?? "Failed to submit parent enquiry.",
      status: 403,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "communication.enquiry_created",
    entityType: "parent_enquiries",
    entityId: inserted.id,
    afterState: {
      studentProfileId: parsed.data.studentProfileId,
      category: parsed.data.category,
      status: "open",
    },
  });

  return { ok: true, data: { id: inserted.id } };
}

export async function updateParentEnquiry(
  slug: string,
  rawInput: unknown,
): Promise<CommunicationActionResult<{ id: string; status: EnquiryStatus }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = updateParentEnquirySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid enquiry update.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerCommunicationScope(supabase, context, todayDate);

  if (scope.isMonitorRestricted || !scope.canAccessEnquiries) {
    return {
      ok: false,
      error: "Classroom monitors cannot access or triage parent enquiries.",
      status: 403,
    };
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("parent_enquiries")
    .select(
      "id, status, guardian_person_id, assigned_to_person_id, resolution_summary, resolved_at, closed_at",
    )
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.enquiryId)
    .maybeSingle<{
      id: string;
      status: EnquiryStatus;
      guardian_person_id: string;
      assigned_to_person_id: string | null;
      resolution_summary: string | null;
      resolved_at: string | null;
      closed_at: string | null;
    }>();

  if (fetchErr || !existing) {
    return { ok: false, error: "Parent enquiry not found.", status: 404 };
  }

  if (!canTransitionEnquiryStatus(existing.status, parsed.data.targetStatus)) {
    return {
      ok: false,
      error: `Cannot transition enquiry from "${existing.status}" to "${parsed.data.targetStatus}".`,
      status: 400,
    };
  }

  if (
    !scope.isStaffOrLeadership &&
    !(
      existing.guardian_person_id === context.personId &&
      parsed.data.targetStatus === "closed"
    )
  ) {
    return {
      ok: false,
      error: "Only authorized staff may triage or resolve enquiries.",
      status: 403,
    };
  }

  const nowIso = new Date().toISOString();
  const updatePayload: {
    status: EnquiryStatus;
    assigned_to_person_id?: string | null;
    resolution_summary?: string | null;
    resolved_at?: string | null;
    closed_at?: string | null;
  } = {
    status: parsed.data.targetStatus,
  };

  if (scope.isStaffOrLeadership) {
    updatePayload.assigned_to_person_id =
      parsed.data.assignedToPersonId !== undefined
        ? parsed.data.assignedToPersonId
        : existing.assigned_to_person_id;
    if (parsed.data.resolutionSummary) {
      updatePayload.resolution_summary = parsed.data.resolutionSummary;
    }
  }

  if (parsed.data.targetStatus === "resolved") {
    updatePayload.resolved_at = existing.resolved_at ?? nowIso;
  }
  if (parsed.data.targetStatus === "closed") {
    updatePayload.closed_at = existing.closed_at ?? nowIso;
  }

  const { error: updateErr } = await supabase
    .from("parent_enquiries")
    .update(updatePayload)
    .eq("institution_id", context.institutionId)
    .eq("id", existing.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message, status: 403 };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "communication.enquiry_updated",
    entityType: "parent_enquiries",
    entityId: existing.id,
    beforeState: { status: existing.status },
    afterState: {
      status: parsed.data.targetStatus,
      assignedToPersonId: updatePayload.assigned_to_person_id ?? null,
    },
  });

  return {
    ok: true,
    data: { id: existing.id, status: parsed.data.targetStatus },
  };
}

export async function createRecordComment(
  slug: string,
  rawInput: unknown,
): Promise<
  CommunicationActionResult<{ id: string; parentKind: RecordCommentParentKind }>
> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return {
      ok: false,
      error: "Workspace authorization required.",
      status: resolution.status === "unauthenticated" ? 401 : 403,
    };
  }

  const parsed = createRecordCommentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid contextual comment.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerCommunicationScope(supabase, context, todayDate);

  if (
    parsed.data.isInternalStaffNote &&
    !canPostInternalStaffNote({ isStaffOrLeadership: scope.isStaffOrLeadership })
  ) {
    return {
      ok: false,
      error:
        "Internal staff notes are restricted strictly to institutional staff and leadership.",
      status: 403,
    };
  }

  const insertRow = {
    institution_id: context.institutionId,
    parent_kind: parsed.data.parentKind,
    notice_id: parsed.data.parentKind === "notice" ? parsed.data.parentId : null,
    parent_enquiry_id:
      parsed.data.parentKind === "parent_enquiry" ? parsed.data.parentId : null,
    assignment_id:
      parsed.data.parentKind === "assignment" ? parsed.data.parentId : null,
    authored_by_person_id: context.personId,
    body: parsed.data.body,
    is_internal_staff_note: parsed.data.isInternalStaffNote,
    status: "active" as const,
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("record_comments")
    .insert(insertRow)
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error:
        insertErr?.message ??
        "Comment could not be recorded under your active role permissions.",
      status: 403,
    };
  }

  // Metadata-only audit event: NEVER log raw comment or internal-note body text.
  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "communication.record_comment_created",
    entityType: "record_comments",
    entityId: inserted.id,
    afterState: {
      parentKind: parsed.data.parentKind,
      parentId: parsed.data.parentId,
      isInternalStaffNote: parsed.data.isInternalStaffNote,
    },
  });

  return {
    ok: true,
    data: { id: inserted.id, parentKind: parsed.data.parentKind },
  };
}
