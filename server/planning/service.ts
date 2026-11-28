import "server-only";

import {
  evaluatePermission,
  type VerifiedTenantContext,
} from "@/lib/auth/permissions";
import {
  buildSyllabusTree,
  canTransitionResourceStatus,
  computeSyllabusProgressRollup,
  resolvePlanningRoleAccess,
  validateSyllabusParentKind,
  type PlanningRoleAccess,
  type SyllabusProgressRollup,
  type SyllabusTreeNode,
} from "@/lib/planning/rules";
import {
  createLearningResourceSchema,
  createLessonPlanSchema,
  createSyllabusItemSchema,
  LEARNING_RESOURCE_KINDS,
  LESSON_PLAN_STATUSES,
  SYLLABUS_PROGRESS_STATUSES,
  transitionResourceStatusSchema,
  updateLessonPlanStatusSchema,
  updateSyllabusProgressSchema,
  upsertAcademicTermStatusSchema,
  type AcademicTermStatus,
  type LearningResourceKind,
  type LearningResourceStatus,
  type LearningResourceVisibility,
  type LessonPlanStatus,
  type SyllabusItemKind,
  type SyllabusProgressStatus,
} from "@/lib/planning/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/server/audit/log";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export type PlanningActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export interface PlanningTermDto {
  id: string;
  code: string;
  name: string;
  sequenceNo: number;
  startsOn: string;
  endsOn: string;
  status: AcademicTermStatus;
}

export interface PlanningOfferingOptionDto {
  id: string;
  departmentId: string;
  gradeCode: string;
  subjectCode: string;
  subjectName: string;
  streamName: string | null;
  label: string;
}

export interface PlanningTeachingGroupOptionDto {
  id: string;
  subjectOfferingId: string;
  code: string;
  name: string;
  subjectName: string;
}

export interface SyllabusItemDto {
  id: string;
  subjectOfferingId: string;
  termId: string | null;
  termCode: string | null;
  parentItemId: string | null;
  itemKind: SyllabusItemKind;
  code: string;
  title: string;
  description: string | null;
  sequenceNo: number;
  targetDate: string | null;
  progressStatus: SyllabusProgressStatus;
  delayReason: string | null;
  carryForwardNotes: string | null;
  updatedByName: string | null;
  canUpdate: boolean;
}

export type SyllabusTreeItemDto = SyllabusTreeNode<SyllabusItemDto>;

export interface SyllabusWorkspaceDto {
  context: VerifiedTenantContext;
  activeSession: { id: string; code: string; name: string } | null;
  terms: readonly PlanningTermDto[];
  offerings: readonly PlanningOfferingOptionDto[];
  selectedOfferingId: string;
  selectedTermId: string;
  statusFilter: SyllabusProgressStatus | "all";
  tree: readonly SyllabusTreeItemDto[];
  flatItems: readonly SyllabusItemDto[];
  rollup: SyllabusProgressRollup;
  canManageSelectedOffering: boolean;
  manageableOfferingIds: readonly string[];
  access: PlanningRoleAccess;
}

export interface LessonPlanDto {
  id: string;
  teachingGroupId: string;
  teachingGroupLabel: string;
  syllabusItemId: string | null;
  syllabusItemLabel: string | null;
  plannedForDate: string;
  weekLabel: string | null;
  title: string;
  learningObjectives: string;
  teachingNotes: string | null;
  status: LessonPlanStatus;
  carryForwardNotes: string | null;
  authoredByName: string;
  canUpdate: boolean;
}

export interface LessonPlansWorkspaceDto {
  context: VerifiedTenantContext;
  accessDenied: boolean;
  activeSession: { id: string; code: string; name: string } | null;
  teachingGroups: readonly PlanningTeachingGroupOptionDto[];
  writableTeachingGroups: readonly PlanningTeachingGroupOptionDto[];
  selectedGroupId: string;
  statusFilter: LessonPlanStatus | "all";
  syllabusOptions: readonly {
    id: string;
    subjectOfferingId: string;
    code: string;
    title: string;
  }[];
  lessonPlans: readonly LessonPlanDto[];
  access: PlanningRoleAccess;
}

export interface LearningResourceDto {
  id: string;
  subjectOfferingId: string;
  offeringLabel: string;
  teachingGroupId: string | null;
  teachingGroupLabel: string | null;
  syllabusItemId: string | null;
  syllabusItemLabel: string | null;
  title: string;
  description: string | null;
  resourceKind: LearningResourceKind;
  externalUrl: string | null;
  storageRefLabel: string | null;
  signedStorageUrl: string | null;
  visibility: LearningResourceVisibility;
  status: LearningResourceStatus;
  authoredByName: string;
  canPublish: boolean;
  canArchive: boolean;
}

export interface LearningResourcesWorkspaceDto {
  context: VerifiedTenantContext;
  activeSession: { id: string; code: string; name: string } | null;
  offerings: readonly PlanningOfferingOptionDto[];
  teachingGroups: readonly PlanningTeachingGroupOptionDto[];
  manageableOfferings: readonly PlanningOfferingOptionDto[];
  manageableTeachingGroups: readonly PlanningTeachingGroupOptionDto[];
  syllabusOptions: readonly {
    id: string;
    subjectOfferingId: string;
    code: string;
    title: string;
  }[];
  selectedOfferingId: string;
  selectedGroupId: string;
  kindFilter: LearningResourceKind | "all";
  includeDrafts: boolean;
  resources: readonly LearningResourceDto[];
  access: PlanningRoleAccess;
}

export interface OversightOfferingRollupDto {
  offeringId: string;
  offeringLabel: string;
  departmentName: string;
  rollup: SyllabusProgressRollup;
  lessonPlanCount: number;
  deliveredOrRevisedLessons: number;
  publishedResourceCount: number;
}

export interface OversightDelayedItemDto {
  id: string;
  offeringId: string;
  offeringLabel: string;
  code: string;
  title: string;
  itemKind: SyllabusItemKind;
  targetDate: string | null;
  delayReason: string;
  carryForwardNotes: string | null;
}

export interface AcademicOversightWorkspaceDto {
  context: VerifiedTenantContext;
  accessDenied: boolean;
  activeSession: { id: string; code: string; name: string } | null;
  departments: readonly { id: string; code: string; name: string }[];
  sections: readonly { id: string; gradeCode: string; code: string; name: string }[];
  selectedDepartmentId: string;
  selectedSectionId: string;
  subjectRollups: readonly OversightOfferingRollupDto[];
  delayedItems: readonly OversightDelayedItemDto[];
  averageCompletionPercent: number;
  totalLessonPlans: number;
  totalPublishedResources: number;
  access: PlanningRoleAccess;
}

interface CallerPlanningScope {
  activeSession: { id: string; code: string; name: string } | null;
  isLeadership: boolean;
  isHod: boolean;
  isClassTeacher: boolean;
  hodDepartmentIds: Set<string>;
  classTeacherSectionIds: Set<string>;
  subjectTeacherGroupIds: Set<string>;
  subjectTeacherOfferingIds: Set<string>;
  monitorSectionIds: Set<string>;
  access: PlanningRoleAccess;
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

async function loadOfferingsAndGroups(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  institutionId: string,
  activeSessionId: string | null,
): Promise<{
  offerings: PlanningOfferingOptionDto[];
  offeringById: Map<string, PlanningOfferingOptionDto>;
  teachingGroups: PlanningTeachingGroupOptionDto[];
  groupById: Map<string, PlanningTeachingGroupOptionDto>;
}> {
  let offeringsQuery = supabase
    .from("subject_offerings")
    .select(
      "id, session_id, grade:grade_levels(department_id, code), subject:subjects(code, name), stream:streams(name)",
    )
    .eq("institution_id", institutionId)
    .order("id", { ascending: true });

  let groupsQuery = supabase
    .from("teaching_groups")
    .select(
      "id, session_id, subject_offering_id, code, name, offering:subject_offerings(subject:subjects(name))",
    )
    .eq("institution_id", institutionId)
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (activeSessionId) {
    offeringsQuery = offeringsQuery.eq("session_id", activeSessionId);
    groupsQuery = groupsQuery.eq("session_id", activeSessionId);
  }

  const [offRes, tgRes] = await Promise.all([
    offeringsQuery.returns<
      {
        id: string;
        session_id: string;
        grade:
          | { department_id: string; code: string }
          | { department_id: string; code: string }[]
          | null;
        subject:
          | { code: string; name: string }
          | { code: string; name: string }[]
          | null;
        stream: { name: string } | { name: string }[] | null;
      }[]
    >(),
    groupsQuery.returns<
      {
        id: string;
        session_id: string;
        subject_offering_id: string;
        code: string;
        name: string;
        offering:
          | { subject: { name: string } | { name: string }[] | null }
          | { subject: { name: string } | { name: string }[] | null }[]
          | null;
      }[]
    >(),
  ]);

  if (offRes.error) {
    throw new Error(`Failed to load subject offerings: ${offRes.error.message}`);
  }
  if (tgRes.error) {
    throw new Error(`Failed to load teaching groups: ${tgRes.error.message}`);
  }

  const offerings: PlanningOfferingOptionDto[] = (offRes.data ?? [])
    .map((o) => {
      const grade = unwrapJoin(o.grade);
      const subject = unwrapJoin(o.subject);
      const stream = unwrapJoin(o.stream);
      const gradeCode = grade?.code ?? "";
      const subjectCode = subject?.code ?? "";
      const subjectName = subject?.name ?? "Subject";
      const streamName = stream?.name ?? null;
      return {
        id: o.id,
        departmentId: grade?.department_id ?? "",
        gradeCode,
        subjectCode,
        subjectName,
        streamName,
        label: `${gradeCode} ${subjectName} (${subjectCode})${streamName ? ` • ${streamName}` : ""}`.trim(),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const offeringById = new Map(offerings.map((o) => [o.id, o]));

  const teachingGroups: PlanningTeachingGroupOptionDto[] = (
    tgRes.data ?? []
  ).map((tg) => {
    const off = unwrapJoin(tg.offering);
    const subj = unwrapJoin(off?.subject);
    return {
      id: tg.id,
      subjectOfferingId: tg.subject_offering_id,
      code: tg.code,
      name: tg.name,
      subjectName: subj?.name ?? "Subject",
    };
  });

  const groupById = new Map(teachingGroups.map((tg) => [tg.id, tg]));

  return { offerings, offeringById, teachingGroups, groupById };
}

async function loadCallerPlanningScope(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  context: VerifiedTenantContext,
  todayDate: string,
): Promise<CallerPlanningScope> {
  const [sessionRes, assignmentsRes, studentSelfRes, guardianRes] =
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
        .from("student_profiles")
        .select("id")
        .eq("institution_id", context.institutionId)
        .eq("person_id", context.personId)
        .maybeSingle<{ id: string }>(),
      supabase
        .from("student_guardians")
        .select("id")
        .eq("institution_id", context.institutionId)
        .eq("guardian_person_id", context.personId)
        .eq("status", "active")
        .limit(1)
        .returns<{ id: string }[]>(),
    ]);

  if (sessionRes.error) {
    throw new Error(`Failed to load active session: ${sessionRes.error.message}`);
  }
  if (assignmentsRes.error) {
    throw new Error(
      `Failed to load caller assignments: ${assignmentsRes.error.message}`,
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

  const isLeadership = evaluatePermission(context, {
    permission: "academics.manage",
  }).allowed;
  const isHod = hodDepartmentIds.size > 0;
  const isClassTeacher = classTeacherSectionIds.size > 0;

  const { offerings, teachingGroups } = await loadOfferingsAndGroups(
    supabase,
    context.institutionId,
    activeSession?.id ?? null,
  );

  const subjectTeacherOfferingIds = new Set<string>();
  for (const tg of teachingGroups) {
    if (subjectTeacherGroupIds.has(tg.id)) {
      subjectTeacherOfferingIds.add(tg.subjectOfferingId);
    }
  }
  if (isLeadership) {
    for (const off of offerings) {
      subjectTeacherOfferingIds.add(off.id);
    }
  } else if (isHod) {
    for (const off of offerings) {
      if (hodDepartmentIds.has(off.departmentId)) {
        subjectTeacherOfferingIds.add(off.id);
      }
    }
  }

  const isStudentOrGuardian =
    Boolean(studentSelfRes.data) || (guardianRes.data?.length ?? 0) > 0;
  const isMonitor =
    monitorSectionIds.size > 0 ||
    evaluatePermission(context, { permission: "classroom.summary.read" })
      .allowed;

  const access = resolvePlanningRoleAccess({
    isLeadership,
    isHod,
    isClassTeacher,
    subjectTeacherOfferingIds: [...subjectTeacherOfferingIds],
    subjectTeacherGroupIds: isLeadership
      ? teachingGroups.map((tg) => tg.id)
      : [...subjectTeacherGroupIds],
    isStudentOrGuardian,
    isMonitor,
  });

  return {
    activeSession,
    isLeadership,
    isHod,
    isClassTeacher,
    hodDepartmentIds,
    classTeacherSectionIds,
    subjectTeacherGroupIds,
    subjectTeacherOfferingIds,
    monitorSectionIds,
    access,
  };
}

export async function getSyllabusWorkspace(
  context: VerifiedTenantContext,
  options: {
    subjectOfferingId?: string;
    termId?: string;
    statusFilter?: string;
  } = {},
): Promise<SyllabusWorkspaceDto> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerPlanningScope(supabase, context, todayDate);

  const { offerings } = await loadOfferingsAndGroups(
    supabase,
    context.institutionId,
    scope.activeSession?.id ?? null,
  );

  let terms: PlanningTermDto[] = [];
  if (scope.activeSession) {
    const { data: termRows, error: termErr } = await supabase
      .from("academic_terms")
      .select("id, code, name, sequence_no, starts_on, ends_on, status")
      .eq("institution_id", context.institutionId)
      .eq("session_id", scope.activeSession.id)
      .order("sequence_no", { ascending: true })
      .returns<
        {
          id: string;
          code: string;
          name: string;
          sequence_no: number;
          starts_on: string;
          ends_on: string;
          status: AcademicTermStatus;
        }[]
      >();

    if (termErr) {
      throw new Error(`Failed to load academic terms: ${termErr.message}`);
    }
    terms = (termRows ?? []).map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      sequenceNo: t.sequence_no,
      startsOn: t.starts_on,
      endsOn: t.ends_on,
      status: t.status,
    }));
  }

  const termCodeById = new Map(terms.map((t) => [t.id, t.code]));
  const requestedOfferingId =
    options.subjectOfferingId &&
    offerings.some((o) => o.id === options.subjectOfferingId)
      ? options.subjectOfferingId
      : (offerings.find((o) =>
          scope.access.manageableOfferingIds.includes(o.id),
        )?.id ??
        offerings[0]?.id ??
        "");

  const selectedTermId =
    options.termId && terms.some((t) => t.id === options.termId)
      ? options.termId
      : "";

  const statusFilter: SyllabusProgressStatus | "all" =
    options.statusFilter &&
    (SYLLABUS_PROGRESS_STATUSES as readonly string[]).includes(
      options.statusFilter,
    )
      ? (options.statusFilter as SyllabusProgressStatus)
      : "all";

  const canManageSelectedOffering =
    Boolean(requestedOfferingId) &&
    scope.access.manageableOfferingIds.includes(requestedOfferingId);

  let itemRows: {
    id: string;
    subject_offering_id: string;
    term_id: string | null;
    parent_item_id: string | null;
    item_kind: SyllabusItemKind;
    code: string;
    title: string;
    description: string | null;
    sequence_no: number;
    target_date: string | null;
    progress_status: SyllabusProgressStatus;
    delay_reason: string | null;
    carry_forward_notes: string | null;
    updated_by_person_id: string | null;
  }[] = [];

  if (requestedOfferingId) {
    let itemsQuery = supabase
      .from("syllabus_items")
      .select(
        "id, subject_offering_id, term_id, parent_item_id, item_kind, code, title, description, sequence_no, target_date, progress_status, delay_reason, carry_forward_notes, updated_by_person_id",
      )
      .eq("institution_id", context.institutionId)
      .eq("subject_offering_id", requestedOfferingId);

    if (selectedTermId) {
      itemsQuery = itemsQuery.eq("term_id", selectedTermId);
    }
    if (statusFilter !== "all") {
      itemsQuery = itemsQuery.eq("progress_status", statusFilter);
    }

    const { data, error } = await itemsQuery.returns<typeof itemRows>();
    if (error) {
      throw new Error(`Failed to load syllabus items: ${error.message}`);
    }
    itemRows = data ?? [];
  }

  const updaterNames = await fetchPersonNameMap(
    supabase,
    itemRows.map((i) => i.updated_by_person_id),
  );

  const flatItems: SyllabusItemDto[] = itemRows.map((row) => ({
    id: row.id,
    subjectOfferingId: row.subject_offering_id,
    termId: row.term_id,
    termCode: row.term_id ? (termCodeById.get(row.term_id) ?? null) : null,
    parentItemId: row.parent_item_id,
    itemKind: row.item_kind,
    code: row.code,
    title: row.title,
    description: row.description,
    sequenceNo: row.sequence_no,
    targetDate: row.target_date,
    progressStatus: row.progress_status,
    delayReason: row.delay_reason,
    carryForwardNotes: row.carry_forward_notes,
    updatedByName: row.updated_by_person_id
      ? (updaterNames.get(row.updated_by_person_id) ?? null)
      : null,
    canUpdate: canManageSelectedOffering,
  }));

  return {
    context,
    activeSession: scope.activeSession,
    terms,
    offerings,
    selectedOfferingId: requestedOfferingId,
    selectedTermId,
    statusFilter,
    tree: buildSyllabusTree(flatItems),
    flatItems,
    rollup: computeSyllabusProgressRollup(flatItems),
    canManageSelectedOffering,
    manageableOfferingIds: scope.access.manageableOfferingIds,
    access: scope.access,
  };
}

export async function createSyllabusItem(
  slug: string,
  rawInput: unknown,
): Promise<PlanningActionResult<{ id: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = createSyllabusItemSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid syllabus item.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerPlanningScope(supabase, context, todayDate);

  if (!scope.activeSession) {
    return {
      ok: false,
      error: "An active academic session is required before adding syllabus items.",
      status: 400,
    };
  }

  if (
    !scope.access.manageableOfferingIds.includes(parsed.data.subjectOfferingId)
  ) {
    return {
      ok: false,
      error:
        "You may only manage syllabus items for assigned subject offerings or departments.",
      status: 403,
    };
  }

  let parentKind: SyllabusItemKind | null = null;
  if (parsed.data.parentItemId) {
    const { data: parentRow, error: parentErr } = await supabase
      .from("syllabus_items")
      .select("id, item_kind, subject_offering_id")
      .eq("institution_id", context.institutionId)
      .eq("id", parsed.data.parentItemId)
      .maybeSingle<{
        id: string;
        item_kind: SyllabusItemKind;
        subject_offering_id: string;
      }>();

    if (parentErr || !parentRow) {
      return {
        ok: false,
        error: "Selected parent syllabus item was not found.",
        status: 404,
      };
    }
    if (parentRow.subject_offering_id !== parsed.data.subjectOfferingId) {
      return {
        ok: false,
        error:
          "Parent syllabus item must belong to the same subject offering.",
        status: 400,
      };
    }
    parentKind = parentRow.item_kind;
  }

  const hierarchyCheck = validateSyllabusParentKind(
    parentKind,
    parsed.data.itemKind,
  );
  if (!hierarchyCheck.ok) {
    return { ok: false, error: hierarchyCheck.error, status: 400 };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("syllabus_items")
    .insert({
      institution_id: context.institutionId,
      session_id: scope.activeSession.id,
      term_id: parsed.data.termId,
      subject_offering_id: parsed.data.subjectOfferingId,
      parent_item_id: parsed.data.parentItemId,
      item_kind: parsed.data.itemKind,
      code: parsed.data.code,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      sequence_no: parsed.data.sequenceNo,
      target_date: parsed.data.targetDate,
      progress_status: parsed.data.progressStatus,
      delay_reason: parsed.data.delayReason ?? null,
      carry_forward_notes: parsed.data.carryForwardNotes ?? null,
      updated_by_person_id: context.personId,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: insertErr?.message ?? "Failed to create syllabus item.",
      status: 403,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "planning.syllabus_item_created",
    entityType: "syllabus_items",
    entityId: inserted.id,
    afterState: {
      itemKind: parsed.data.itemKind,
      code: parsed.data.code,
      progressStatus: parsed.data.progressStatus,
    },
  });

  return { ok: true, data: { id: inserted.id } };
}

export async function updateSyllabusItemProgress(
  slug: string,
  rawInput: unknown,
): Promise<PlanningActionResult<{ id: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = updateSyllabusProgressSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Invalid syllabus progress update.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("syllabus_items")
    .select("id, progress_status, subject_offering_id")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.itemId)
    .maybeSingle<{
      id: string;
      progress_status: SyllabusProgressStatus;
      subject_offering_id: string;
    }>();

  if (fetchErr || !existing) {
    return { ok: false, error: "Syllabus item not found.", status: 404 };
  }

  const { error: updateErr } = await supabase
    .from("syllabus_items")
    .update({
      progress_status: parsed.data.progressStatus,
      target_date: parsed.data.targetDate,
      delay_reason:
        parsed.data.progressStatus === "delayed"
          ? (parsed.data.delayReason ?? null)
          : (parsed.data.delayReason ?? null),
      carry_forward_notes: parsed.data.carryForwardNotes ?? null,
      updated_by_person_id: context.personId,
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
    action: "planning.syllabus_progress_updated",
    entityType: "syllabus_items",
    entityId: existing.id,
    beforeState: { progressStatus: existing.progress_status },
    afterState: { progressStatus: parsed.data.progressStatus },
  });

  return { ok: true, data: { id: existing.id } };
}

export async function updateAcademicTermStatus(
  slug: string,
  rawInput: unknown,
): Promise<PlanningActionResult<{ id: string; status: AcademicTermStatus }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = upsertAcademicTermStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid academic term update.",
      status: 400,
    };
  }

  const { context } = resolution;
  if (
    !evaluatePermission(context, { permission: "academics.manage" }).allowed
  ) {
    return {
      ok: false,
      error: "Only academic administrators may update term lifecycle states.",
      status: 403,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("academic_terms")
    .select("id, status")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.termId)
    .maybeSingle<{ id: string; status: AcademicTermStatus }>();

  if (fetchErr || !existing) {
    return { ok: false, error: "Academic term not found.", status: 404 };
  }

  const { error: updateErr } = await supabase
    .from("academic_terms")
    .update({ status: parsed.data.status })
    .eq("institution_id", context.institutionId)
    .eq("id", existing.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message, status: 403 };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "planning.academic_term_status_updated",
    entityType: "academic_terms",
    entityId: existing.id,
    beforeState: { status: existing.status },
    afterState: { status: parsed.data.status },
  });

  return { ok: true, data: { id: existing.id, status: parsed.data.status } };
}

export async function getLessonPlansWorkspace(
  context: VerifiedTenantContext,
  options: { teachingGroupId?: string; statusFilter?: string } = {},
): Promise<LessonPlansWorkspaceDto> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerPlanningScope(supabase, context, todayDate);

  const statusFilter: LessonPlanStatus | "all" =
    options.statusFilter &&
    (LESSON_PLAN_STATUSES as readonly string[]).includes(options.statusFilter)
      ? (options.statusFilter as LessonPlanStatus)
      : "all";

  if (!scope.access.canAccessLessonPlans) {
    return {
      context,
      accessDenied: true,
      activeSession: scope.activeSession,
      teachingGroups: [],
      writableTeachingGroups: [],
      selectedGroupId: "",
      statusFilter,
      syllabusOptions: [],
      lessonPlans: [],
      access: scope.access,
    };
  }

  const { teachingGroups, groupById } = await loadOfferingsAndGroups(
    supabase,
    context.institutionId,
    scope.activeSession?.id ?? null,
  );

  const writableTeachingGroups = teachingGroups.filter((tg) =>
    scope.access.writableTeachingGroupIds.includes(tg.id),
  );

  const selectedGroupId =
    options.teachingGroupId && groupById.has(options.teachingGroupId)
      ? options.teachingGroupId
      : "";

  let plansQuery = supabase
    .from("lesson_plans")
    .select(
      "id, teaching_group_id, syllabus_item_id, planned_for_date, week_label, title, learning_objectives, teaching_notes, status, carry_forward_notes, authored_by_person_id",
    )
    .eq("institution_id", context.institutionId)
    .order("planned_for_date", { ascending: false })
    .limit(60);

  if (selectedGroupId) {
    plansQuery = plansQuery.eq("teaching_group_id", selectedGroupId);
  }
  if (statusFilter !== "all") {
    plansQuery = plansQuery.eq("status", statusFilter);
  }

  const [plansRes, syllabusRes] = await Promise.all([
    plansQuery.returns<
      {
        id: string;
        teaching_group_id: string;
        syllabus_item_id: string | null;
        planned_for_date: string;
        week_label: string | null;
        title: string;
        learning_objectives: string;
        teaching_notes: string | null;
        status: LessonPlanStatus;
        carry_forward_notes: string | null;
        authored_by_person_id: string;
      }[]
    >(),
    supabase
      .from("syllabus_items")
      .select("id, subject_offering_id, code, title")
      .eq("institution_id", context.institutionId)
      .order("sequence_no", { ascending: true })
      .returns<
        { id: string; subject_offering_id: string; code: string; title: string }[]
      >(),
  ]);

  if (plansRes.error) {
    throw new Error(`Failed to load lesson plans: ${plansRes.error.message}`);
  }
  if (syllabusRes.error) {
    throw new Error(
      `Failed to load syllabus references: ${syllabusRes.error.message}`,
    );
  }

  const planRows = plansRes.data ?? [];
  const syllabusById = new Map(
    (syllabusRes.data ?? []).map((s) => [s.id, `${s.code} — ${s.title}`]),
  );
  const authorNames = await fetchPersonNameMap(
    supabase,
    planRows.map((p) => p.authored_by_person_id),
  );

  const lessonPlans: LessonPlanDto[] = planRows.map((p) => {
    const tg = groupById.get(p.teaching_group_id);
    return {
      id: p.id,
      teachingGroupId: p.teaching_group_id,
      teachingGroupLabel: tg ? `${tg.code} — ${tg.subjectName}` : "Teaching Group",
      syllabusItemId: p.syllabus_item_id,
      syllabusItemLabel: p.syllabus_item_id
        ? (syllabusById.get(p.syllabus_item_id) ?? null)
        : null,
      plannedForDate: p.planned_for_date,
      weekLabel: p.week_label,
      title: p.title,
      learningObjectives: p.learning_objectives,
      teachingNotes: p.teaching_notes,
      status: p.status,
      carryForwardNotes: p.carry_forward_notes,
      authoredByName: authorNames.get(p.authored_by_person_id) ?? "Staff",
      canUpdate:
        scope.isLeadership ||
        scope.subjectTeacherGroupIds.has(p.teaching_group_id),
    };
  });

  return {
    context,
    accessDenied: false,
    activeSession: scope.activeSession,
    teachingGroups,
    writableTeachingGroups,
    selectedGroupId,
    statusFilter,
    syllabusOptions: (syllabusRes.data ?? []).map((s) => ({
      id: s.id,
      subjectOfferingId: s.subject_offering_id,
      code: s.code,
      title: s.title,
    })),
    lessonPlans,
    access: scope.access,
  };
}

export async function createLessonPlan(
  slug: string,
  rawInput: unknown,
): Promise<PlanningActionResult<{ id: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = createLessonPlanSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid lesson plan.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerPlanningScope(supabase, context, todayDate);

  if (!scope.activeSession) {
    return {
      ok: false,
      error: "An active academic session is required.",
      status: 400,
    };
  }

  if (
    !scope.isLeadership &&
    !scope.subjectTeacherGroupIds.has(parsed.data.teachingGroupId)
  ) {
    return {
      ok: false,
      error:
        "Lesson plans may only be authored by the assigned subject teacher or academic leadership.",
      status: 403,
    };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("lesson_plans")
    .insert({
      institution_id: context.institutionId,
      session_id: scope.activeSession.id,
      teaching_group_id: parsed.data.teachingGroupId,
      syllabus_item_id: parsed.data.syllabusItemId,
      planned_for_date: parsed.data.plannedForDate,
      week_label: parsed.data.weekLabel ?? null,
      title: parsed.data.title,
      learning_objectives: parsed.data.learningObjectives,
      teaching_notes: parsed.data.teachingNotes ?? null,
      status: parsed.data.status,
      carry_forward_notes: parsed.data.carryForwardNotes ?? null,
      authored_by_person_id: context.personId,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: insertErr?.message ?? "Failed to create lesson plan.",
      status: 403,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "planning.lesson_plan_created",
    entityType: "lesson_plans",
    entityId: inserted.id,
    afterState: {
      teachingGroupId: parsed.data.teachingGroupId,
      plannedForDate: parsed.data.plannedForDate,
      status: parsed.data.status,
    },
  });

  return { ok: true, data: { id: inserted.id } };
}

export async function updateLessonPlanStatus(
  slug: string,
  rawInput: unknown,
): Promise<PlanningActionResult<{ id: string; status: LessonPlanStatus }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = updateLessonPlanStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid lesson plan update.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerPlanningScope(supabase, context, todayDate);

  const { data: existing, error: fetchErr } = await supabase
    .from("lesson_plans")
    .select("id, status, teaching_group_id")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.lessonPlanId)
    .maybeSingle<{
      id: string;
      status: LessonPlanStatus;
      teaching_group_id: string;
    }>();

  if (fetchErr || !existing) {
    return { ok: false, error: "Lesson plan not found.", status: 404 };
  }

  if (
    !scope.isLeadership &&
    !scope.subjectTeacherGroupIds.has(existing.teaching_group_id)
  ) {
    return {
      ok: false,
      error:
        "Class teachers and HODs hold read-only oversight on subject lesson plans.",
      status: 403,
    };
  }

  const updateFields: {
    status: LessonPlanStatus;
    carry_forward_notes?: string | null;
    teaching_notes?: string | null;
  } = { status: parsed.data.status };
  if (parsed.data.carryForwardNotes !== undefined) {
    updateFields.carry_forward_notes = parsed.data.carryForwardNotes;
  }
  if (parsed.data.teachingNotes !== undefined) {
    updateFields.teaching_notes = parsed.data.teachingNotes;
  }

  const { error: updateErr } = await supabase
    .from("lesson_plans")
    .update(updateFields)
    .eq("institution_id", context.institutionId)
    .eq("id", existing.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message, status: 403 };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "planning.lesson_plan_updated",
    entityType: "lesson_plans",
    entityId: existing.id,
    beforeState: { status: existing.status },
    afterState: { status: parsed.data.status },
  });

  return { ok: true, data: { id: existing.id, status: parsed.data.status } };
}

export async function getLearningResourcesWorkspace(
  context: VerifiedTenantContext,
  options: {
    subjectOfferingId?: string;
    teachingGroupId?: string;
    kindFilter?: string;
    includeDrafts?: boolean;
  } = {},
): Promise<LearningResourcesWorkspaceDto> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerPlanningScope(supabase, context, todayDate);

  const { offerings, offeringById, teachingGroups, groupById } =
    await loadOfferingsAndGroups(
      supabase,
      context.institutionId,
      scope.activeSession?.id ?? null,
    );

  const selectedOfferingId =
    options.subjectOfferingId && offeringById.has(options.subjectOfferingId)
      ? options.subjectOfferingId
      : "";
  const selectedGroupId =
    options.teachingGroupId && groupById.has(options.teachingGroupId)
      ? options.teachingGroupId
      : "";
  const kindFilter: LearningResourceKind | "all" =
    options.kindFilter &&
    (LEARNING_RESOURCE_KINDS as readonly string[]).includes(options.kindFilter)
      ? (options.kindFilter as LearningResourceKind)
      : "all";
  const includeDrafts =
    Boolean(options.includeDrafts) && !scope.access.isReadOnlyLearner;

  let resQuery = supabase
    .from("learning_resources")
    .select(
      "id, subject_offering_id, teaching_group_id, syllabus_item_id, title, description, resource_kind, external_url, storage_bucket, storage_path, visibility, status, authored_by_person_id",
    )
    .eq("institution_id", context.institutionId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (selectedOfferingId) {
    resQuery = resQuery.eq("subject_offering_id", selectedOfferingId);
  }
  if (selectedGroupId) {
    resQuery = resQuery.eq("teaching_group_id", selectedGroupId);
  }
  if (kindFilter !== "all") {
    resQuery = resQuery.eq("resource_kind", kindFilter);
  }
  if (!includeDrafts) {
    resQuery = resQuery.eq("status", "published");
  } else {
    resQuery = resQuery.in("status", ["draft", "published"]);
  }

  const [resourcesRes, syllabusRes] = await Promise.all([
    resQuery.returns<
      {
        id: string;
        subject_offering_id: string;
        teaching_group_id: string | null;
        syllabus_item_id: string | null;
        title: string;
        description: string | null;
        resource_kind: LearningResourceKind;
        external_url: string | null;
        storage_bucket: string | null;
        storage_path: string | null;
        visibility: LearningResourceVisibility;
        status: LearningResourceStatus;
        authored_by_person_id: string;
      }[]
    >(),
    supabase
      .from("syllabus_items")
      .select("id, subject_offering_id, code, title")
      .eq("institution_id", context.institutionId)
      .order("sequence_no", { ascending: true })
      .returns<
        { id: string; subject_offering_id: string; code: string; title: string }[]
      >(),
  ]);

  if (resourcesRes.error) {
    throw new Error(
      `Failed to load learning resources: ${resourcesRes.error.message}`,
    );
  }

  const rows = resourcesRes.data ?? [];
  const syllabusById = new Map(
    (syllabusRes.data ?? []).map((s) => [s.id, `${s.code} — ${s.title}`]),
  );
  const authorNames = await fetchPersonNameMap(
    supabase,
    rows.map((r) => r.authored_by_person_id),
  );

  // Mint short-lived caller-RLS signed URLs ONLY for private storage paths (never public URLs)
  const resources: LearningResourceDto[] = await Promise.all(
    rows.map(async (r) => {
      let signedStorageUrl: string | null = null;
      if (r.storage_bucket && r.storage_path) {
        try {
          const { data: signedData } = await supabase.storage
            .from(r.storage_bucket)
            .createSignedUrl(r.storage_path, 120);
          signedStorageUrl = signedData?.signedUrl ?? null;
        } catch {
          signedStorageUrl = null;
        }
      }

      const canManageItem =
        scope.isLeadership ||
        (r.teaching_group_id !== null
          ? scope.subjectTeacherGroupIds.has(r.teaching_group_id)
          : scope.access.manageableOfferingIds.includes(r.subject_offering_id));

      return {
        id: r.id,
        subjectOfferingId: r.subject_offering_id,
        offeringLabel:
          offeringById.get(r.subject_offering_id)?.label ?? "Subject Offering",
        teachingGroupId: r.teaching_group_id,
        teachingGroupLabel: r.teaching_group_id
          ? (groupById.get(r.teaching_group_id)?.code ?? null)
          : null,
        syllabusItemId: r.syllabus_item_id,
        syllabusItemLabel: r.syllabus_item_id
          ? (syllabusById.get(r.syllabus_item_id) ?? null)
          : null,
        title: r.title,
        description: r.description,
        resourceKind: r.resource_kind,
        externalUrl: r.external_url,
        storageRefLabel:
          r.storage_bucket && r.storage_path
            ? `${r.storage_bucket}/${r.storage_path}`
            : null,
        signedStorageUrl,
        visibility: r.visibility,
        status: r.status,
        authoredByName: authorNames.get(r.authored_by_person_id) ?? "Staff",
        canPublish:
          canManageItem && canTransitionResourceStatus(r.status, "published"),
        canArchive:
          canManageItem && canTransitionResourceStatus(r.status, "archived"),
      };
    }),
  );

  return {
    context,
    activeSession: scope.activeSession,
    offerings,
    teachingGroups,
    manageableOfferings: offerings.filter((o) =>
      scope.access.manageableOfferingIds.includes(o.id),
    ),
    manageableTeachingGroups: teachingGroups.filter((tg) =>
      scope.access.writableTeachingGroupIds.includes(tg.id),
    ),
    syllabusOptions: (syllabusRes.data ?? []).map((s) => ({
      id: s.id,
      subjectOfferingId: s.subject_offering_id,
      code: s.code,
      title: s.title,
    })),
    selectedOfferingId,
    selectedGroupId,
    kindFilter,
    includeDrafts,
    resources,
    access: scope.access,
  };
}

export async function createLearningResource(
  slug: string,
  rawInput: unknown,
): Promise<PlanningActionResult<{ id: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = createLearningResourceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid learning resource.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerPlanningScope(supabase, context, todayDate);

  if (!scope.activeSession) {
    return {
      ok: false,
      error: "An active academic session is required.",
      status: 400,
    };
  }

  const hasAuth =
    scope.isLeadership ||
    (parsed.data.teachingGroupId !== null
      ? scope.subjectTeacherGroupIds.has(parsed.data.teachingGroupId)
      : scope.access.manageableOfferingIds.includes(
          parsed.data.subjectOfferingId,
        ));

  if (!hasAuth) {
    return {
      ok: false,
      error:
        "You may only publish learning resources for assigned teaching groups or subject offerings.",
      status: 403,
    };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("learning_resources")
    .insert({
      institution_id: context.institutionId,
      session_id: scope.activeSession.id,
      subject_offering_id: parsed.data.subjectOfferingId,
      teaching_group_id: parsed.data.teachingGroupId,
      syllabus_item_id: parsed.data.syllabusItemId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      resource_kind: parsed.data.resourceKind,
      external_url: parsed.data.externalUrl,
      storage_bucket: parsed.data.storageBucket ?? null,
      storage_path: parsed.data.storagePath ?? null,
      visibility: parsed.data.visibility,
      status: parsed.data.status,
      authored_by_person_id: context.personId,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: insertErr?.message ?? "Failed to create learning resource.",
      status: 403,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "planning.learning_resource_created",
    entityType: "learning_resources",
    entityId: inserted.id,
    afterState: {
      resourceKind: parsed.data.resourceKind,
      visibility: parsed.data.visibility,
      status: parsed.data.status,
    },
  });

  return { ok: true, data: { id: inserted.id } };
}

export async function transitionLearningResourceStatus(
  slug: string,
  rawInput: unknown,
): Promise<PlanningActionResult<{ id: string; status: LearningResourceStatus }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = transitionResourceStatusSchema.safeParse(rawInput);
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
    .from("learning_resources")
    .select("id, status")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.resourceId)
    .maybeSingle<{ id: string; status: LearningResourceStatus }>();

  if (fetchErr || !existing) {
    return { ok: false, error: "Learning resource not found.", status: 404 };
  }

  if (!canTransitionResourceStatus(existing.status, parsed.data.targetStatus)) {
    return {
      ok: false,
      error: `Cannot transition resource from "${existing.status}" to "${parsed.data.targetStatus}".`,
      status: 400,
    };
  }

  const { error: updateErr } = await supabase
    .from("learning_resources")
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
    action: "planning.learning_resource_status_updated",
    entityType: "learning_resources",
    entityId: existing.id,
    beforeState: { status: existing.status },
    afterState: { status: parsed.data.targetStatus },
  });

  return { ok: true, data: { id: existing.id, status: parsed.data.targetStatus } };
}

export async function getAcademicOversightWorkspace(
  context: VerifiedTenantContext,
  options: { departmentId?: string; sectionId?: string } = {},
): Promise<AcademicOversightWorkspaceDto> {
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerPlanningScope(supabase, context, todayDate);

  if (!scope.access.canAccessOversight) {
    return {
      context,
      accessDenied: true,
      activeSession: scope.activeSession,
      departments: [],
      sections: [],
      selectedDepartmentId: "",
      selectedSectionId: "",
      subjectRollups: [],
      delayedItems: [],
      averageCompletionPercent: 0,
      totalLessonPlans: 0,
      totalPublishedResources: 0,
      access: scope.access,
    };
  }

  const [deptsRes, secsRes, offeringsData, itemsRes, plansRes, resourcesRes] =
    await Promise.all([
      supabase
        .from("academic_departments")
        .select("id, code, name")
        .eq("institution_id", context.institutionId)
        .eq("is_active", true)
        .order("code", { ascending: true })
        .returns<{ id: string; code: string; name: string }[]>(),
      supabase
        .from("sections")
        .select("id, code, name, grade:grade_levels(code, department_id)")
        .eq("institution_id", context.institutionId)
        .eq("is_active", true)
        .order("code", { ascending: true })
        .returns<
          {
            id: string;
            code: string;
            name: string;
            grade:
              | { code: string; department_id: string }
              | { code: string; department_id: string }[]
              | null;
          }[]
        >(),
      loadOfferingsAndGroups(
        supabase,
        context.institutionId,
        scope.activeSession?.id ?? null,
      ),
      supabase
        .from("syllabus_items")
        .select(
          "id, subject_offering_id, item_kind, code, title, target_date, progress_status, delay_reason, carry_forward_notes",
        )
        .eq("institution_id", context.institutionId)
        .returns<
          {
            id: string;
            subject_offering_id: string;
            item_kind: SyllabusItemKind;
            code: string;
            title: string;
            target_date: string | null;
            progress_status: SyllabusProgressStatus;
            delay_reason: string | null;
            carry_forward_notes: string | null;
          }[]
        >(),
      supabase
        .from("lesson_plans")
        .select("id, teaching_group_id, status")
        .eq("institution_id", context.institutionId)
        .returns<
          { id: string; teaching_group_id: string; status: LessonPlanStatus }[]
        >(),
      supabase
        .from("learning_resources")
        .select("id, subject_offering_id, status")
        .eq("institution_id", context.institutionId)
        .eq("status", "published")
        .returns<{ id: string; subject_offering_id: string; status: string }[]>(),
    ]);

  if (deptsRes.error || secsRes.error || itemsRes.error || plansRes.error) {
    throw new Error("Failed to load academic oversight aggregates.");
  }

  const departments = deptsRes.data ?? [];
  const deptNameById = new Map(departments.map((d) => [d.id, d.name]));
  const sections = (secsRes.data ?? []).map((s) => ({
    id: s.id,
    gradeCode: unwrapJoin(s.grade)?.code ?? "",
    departmentId: unwrapJoin(s.grade)?.department_id ?? "",
    code: s.code,
    name: s.name,
  }));

  const selectedDepartmentId =
    options.departmentId && deptNameById.has(options.departmentId)
      ? options.departmentId
      : "";
  const selectedSectionId =
    options.sectionId && sections.some((s) => s.id === options.sectionId)
      ? options.sectionId
      : "";

  let sectionOfferingIds: Set<string> | null = null;
  if (selectedSectionId && scope.activeSession) {
    const { data: secEnrolments } = await supabase
      .from("student_session_enrolments")
      .select("id")
      .eq("institution_id", context.institutionId)
      .eq("session_id", scope.activeSession.id)
      .eq("section_id", selectedSectionId)
      .eq("status", "active")
      .returns<{ id: string }[]>();

    const enrolmentIds = (secEnrolments ?? []).map((e) => e.id);
    if (enrolmentIds.length > 0) {
      const { data: subEnrs } = await supabase
        .from("student_subject_enrolments")
        .select("subject_offering_id")
        .eq("institution_id", context.institutionId)
        .in("student_enrolment_id", enrolmentIds)
        .eq("status", "active")
        .returns<{ subject_offering_id: string }[]>();
      sectionOfferingIds = new Set(
        (subEnrs ?? []).map((s) => s.subject_offering_id),
      );
    } else {
      sectionOfferingIds = new Set();
    }
  }

  const filteredOfferings = offeringsData.offerings.filter((o) => {
    if (selectedDepartmentId && o.departmentId !== selectedDepartmentId) {
      return false;
    }
    if (sectionOfferingIds && !sectionOfferingIds.has(o.id)) {
      return false;
    }
    return true;
  });

  const groupToOffering = new Map(
    offeringsData.teachingGroups.map((tg) => [tg.id, tg.subjectOfferingId]),
  );

  const itemsByOffering = new Map<
    string,
    { progressStatus: SyllabusProgressStatus }[]
  >();
  for (const item of itemsRes.data ?? []) {
    const list = itemsByOffering.get(item.subject_offering_id) ?? [];
    list.push({ progressStatus: item.progress_status });
    itemsByOffering.set(item.subject_offering_id, list);
  }

  const plansByOffering = new Map<
    string,
    { total: number; deliveredOrRevised: number }
  >();
  for (const p of plansRes.data ?? []) {
    const offId = groupToOffering.get(p.teaching_group_id);
    if (!offId) continue;
    const stats = plansByOffering.get(offId) ?? {
      total: 0,
      deliveredOrRevised: 0,
    };
    stats.total += 1;
    if (p.status === "delivered" || p.status === "revised") {
      stats.deliveredOrRevised += 1;
    }
    plansByOffering.set(offId, stats);
  }

  const publishedResourcesByOffering = new Map<string, number>();
  for (const res of resourcesRes.data ?? []) {
    publishedResourcesByOffering.set(
      res.subject_offering_id,
      (publishedResourcesByOffering.get(res.subject_offering_id) ?? 0) + 1,
    );
  }

  const subjectRollups: OversightOfferingRollupDto[] = filteredOfferings.map(
    (off) => {
      const items = itemsByOffering.get(off.id) ?? [];
      const planStats = plansByOffering.get(off.id) ?? {
        total: 0,
        deliveredOrRevised: 0,
      };
      return {
        offeringId: off.id,
        offeringLabel: off.label,
        departmentName: deptNameById.get(off.departmentId) ?? "Department",
        rollup: computeSyllabusProgressRollup(items),
        lessonPlanCount: planStats.total,
        deliveredOrRevisedLessons: planStats.deliveredOrRevised,
        publishedResourceCount: publishedResourcesByOffering.get(off.id) ?? 0,
      };
    },
  );

  const filteredOfferingIdSet = new Set(filteredOfferings.map((o) => o.id));
  const offeringLabelById = new Map(
    filteredOfferings.map((o) => [o.id, o.label]),
  );

  const delayedItems: OversightDelayedItemDto[] = (itemsRes.data ?? [])
    .filter(
      (i) =>
        i.progress_status === "delayed" &&
        filteredOfferingIdSet.has(i.subject_offering_id),
    )
    .map((i) => ({
      id: i.id,
      offeringId: i.subject_offering_id,
      offeringLabel:
        offeringLabelById.get(i.subject_offering_id) ?? "Subject Offering",
      code: i.code,
      title: i.title,
      itemKind: i.item_kind,
      targetDate: i.target_date,
      delayReason: i.delay_reason ?? "Delay recorded",
      carryForwardNotes: i.carry_forward_notes,
    }));

  const trackedWithItems = subjectRollups.filter((r) => r.rollup.total > 0);
  const averageCompletionPercent =
    trackedWithItems.length === 0
      ? 0
      : Math.round(
          trackedWithItems.reduce(
            (sum, r) => sum + r.rollup.completionPercent,
            0,
          ) / trackedWithItems.length,
        );

  const totalLessonPlans = subjectRollups.reduce(
    (sum, r) => sum + r.lessonPlanCount,
    0,
  );
  const totalPublishedResources = subjectRollups.reduce(
    (sum, r) => sum + r.publishedResourceCount,
    0,
  );

  return {
    context,
    accessDenied: false,
    activeSession: scope.activeSession,
    departments,
    sections: sections.map(({ id, gradeCode, code, name }) => ({
      id,
      gradeCode,
      code,
      name,
    })),
    selectedDepartmentId,
    selectedSectionId,
    subjectRollups,
    delayedItems,
    averageCompletionPercent,
    totalLessonPlans,
    totalPublishedResources,
    access: scope.access,
  };
}
