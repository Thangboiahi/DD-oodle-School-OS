import "server-only";

import {
  evaluatePermission,
  type VerifiedTenantContext,
} from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildOfflineTimetableSnapshot,
  canTransitionCalendarEventStatus,
  canTransitionTimetableStatus,
  computeTeacherWorkloadSummary,
  DAY_OF_WEEK_LABELS,
  detectTimetableSlotConflicts,
  filterAvailableSubstituteStaff,
  type OfflineTimetableSnapshot,
  type TeacherWorkloadSummary,
} from "@/lib/timetable/rules";
import {
  CALENDAR_EVENT_KINDS,
  CALENDAR_SCOPE_TYPES,
  createCalendarEventSchema,
  createSubstitutionSchema,
  createTimetablePeriodSchema,
  createTimetableSchema,
  createTimetableSlotSchema,
  createVenueSchema,
  normalizeTimeString,
  transitionSubstitutionStatusSchema,
  transitionTimetableStatusSchema,
  updateCalendarEventStatusSchema,
  type CalendarEventKind,
  type CalendarEventStatus,
  type CalendarScopeType,
  type SubstitutionStatus,
  type TimetablePeriodKind,
  type TimetableStatus,
  type VenueKind,
} from "@/lib/timetable/schemas";
import { recordAuditEvent } from "@/server/audit/log";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export type TimetableActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export interface VenueDto {
  id: string;
  code: string;
  name: string;
  venueKind: VenueKind;
  capacity: number | null;
  building: string | null;
  floor: string | null;
  isActive: boolean;
}

export interface TimetablePeriodDto {
  id: string;
  code: string;
  label: string;
  periodKind: TimetablePeriodKind;
  sequenceNo: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface TimetableSummaryDto {
  id: string;
  termId: string | null;
  termCode: string | null;
  code: string;
  name: string;
  versionNo: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: TimetableStatus;
  isOfflineCacheable: boolean;
  publishedAt: string | null;
  publishedByName: string | null;
  authoredByName: string;
}

export interface TimetableSlotDto {
  id: string;
  timetableId: string;
  dayOfWeek: number;
  dayLabel: string;
  periodId: string;
  periodCode: string;
  periodLabel: string;
  periodKind: TimetablePeriodKind;
  periodSequenceNo: number;
  startTime: string;
  endTime: string;
  teachingGroupId: string | null;
  sectionId: string | null;
  groupLabel: string;
  teacherPersonId: string | null;
  teacherName: string | null;
  venueId: string | null;
  venueLabel: string | null;
  notes: string | null;
  canWriteSubstitutionForSlot: boolean;
}

export interface TimetableSubstitutionDto {
  id: string;
  timetableSlotId: string;
  dayOfWeek: number;
  dayLabel: string;
  periodLabel: string;
  groupLabel: string;
  substitutionDate: string;
  originalTeacherPersonId: string | null;
  originalTeacherName: string | null;
  substituteTeacherPersonId: string;
  substituteTeacherName: string;
  reason: string;
  status: SubstitutionStatus;
  assignedByName: string;
  canTransition: boolean;
}

export interface TeacherWorkloadDto extends TeacherWorkloadSummary {
  teacherName: string;
}

export interface TimetableTermOptionDto {
  id: string;
  code: string;
  name: string;
}

export interface TimetableGroupOptionDto {
  id: string;
  code: string;
  name: string;
  subjectName: string;
  departmentId: string | null;
}

export interface TimetableSectionOptionDto {
  id: string;
  code: string;
  name: string;
  gradeCode: string;
  departmentId: string | null;
  label: string;
}

export interface TimetableStaffOptionDto {
  personId: string;
  name: string;
}

export interface TimetableWorkspaceDto {
  accessDenied: boolean;
  context: VerifiedTenantContext | null;
  activeSession: { id: string; code: string; name: string } | null;
  terms: readonly TimetableTermOptionDto[];
  venues: readonly VenueDto[];
  periods: readonly TimetablePeriodDto[];
  timetables: readonly TimetableSummaryDto[];
  selectedTimetable: TimetableSummaryDto | null;
  slots: readonly TimetableSlotDto[];
  substitutions: readonly TimetableSubstitutionDto[];
  workload: readonly TeacherWorkloadDto[];
  teachingGroupOptions: readonly TimetableGroupOptionDto[];
  sectionOptions: readonly TimetableSectionOptionDto[];
  staffOptions: readonly TimetableStaffOptionDto[];
  dayOfWeekFilter: number | null;
  includeDrafts: boolean;
  canManageTimetable: boolean;
  canWriteSubstitution: boolean;
  isReadOnlyBoard: boolean;
  offlineCacheablePayload: OfflineTimetableSnapshot | null;
}

export interface AcademicCalendarEventDto {
  id: string;
  termId: string | null;
  termCode: string | null;
  scopeType: CalendarScopeType;
  departmentId: string | null;
  departmentName: string | null;
  sectionId: string | null;
  sectionLabel: string | null;
  scopeLabel: string;
  eventKind: CalendarEventKind;
  title: string;
  description: string | null;
  startsOn: string;
  endsOn: string;
  isNonInstructional: boolean;
  status: CalendarEventStatus;
  authoredByName: string;
  canUpdateStatus: boolean;
}

export interface AcademicCalendarWorkspaceDto {
  accessDenied: boolean;
  context: VerifiedTenantContext | null;
  activeSession: { id: string; code: string; name: string } | null;
  terms: readonly TimetableTermOptionDto[];
  scopeFilter: CalendarScopeType | "all";
  kindFilter: CalendarEventKind | "all";
  includeDrafts: boolean;
  events: readonly AcademicCalendarEventDto[];
  canCreateEvent: boolean;
  canCreateInstitution: boolean;
  departmentOptions: readonly { id: string; code: string; name: string }[];
  sectionOptions: readonly TimetableSectionOptionDto[];
  isReadOnlyBoard: boolean;
}

interface CallerTimetableScope {
  activeSession: { id: string; code: string; name: string } | null;
  canManageTimetable: boolean;
  isStaffView: boolean;
  isReadOnlyBoard: boolean;
  canWriteSubstitution: boolean;
  hodDepartmentIds: Set<string>;
  classTeacherSectionIds: Set<string>;
}

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
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

function shiftIsoDateDays(isoDate: string, deltaDays: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function getIsoWeekdayFromDate(isoDate: string): number {
  const utcDay = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return utcDay === 0 ? 7 : utcDay;
}

function mapMutationError(
  error: { code?: string; message?: string } | null | undefined,
  fallback: string,
  uniqueMessages?: Record<string, string>,
): { error: string; status: number } {
  const code = error?.code ?? "";
  const message = error?.message ?? "";

  if (code === "42501" || /row-level security/i.test(message)) {
    return {
      error: "You do not have permission to perform this action.",
      status: 403,
    };
  }

  if (code === "23505") {
    if (uniqueMessages) {
      for (const [constraint, friendly] of Object.entries(uniqueMessages)) {
        if (message.includes(constraint)) {
          return { error: friendly, status: 409 };
        }
      }
    }
    return {
      error: "A conflicting duplicate record already exists.",
      status: 409,
    };
  }

  if (code === "23503") {
    return {
      error:
        "This record is referenced by existing timetable or substitution entries and cannot be removed.",
      status: 409,
    };
  }

  return { error: message || fallback, status: 400 };
}

async function resolveContextInput(
  slugOrContext: string | VerifiedTenantContext,
): Promise<VerifiedTenantContext | null> {
  if (typeof slugOrContext !== "string") {
    return slugOrContext;
  }
  const resolution = await resolveVerifiedTenantContext(slugOrContext);
  if (resolution.status !== "ok") {
    return null;
  }
  return resolution.context;
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

async function loadCallerTimetableScope(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  context: VerifiedTenantContext,
  todayDate: string,
): Promise<CallerTimetableScope> {
  const [sessionRes, assignmentsRes] = await Promise.all([
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
    }
  }

  const canManageTimetable = evaluatePermission(context, {
    permission: "academics.manage",
  }).allowed;
  const hasTeachOrCoordinatePerm =
    evaluatePermission(context, { permission: "academics.teach" }).allowed ||
    evaluatePermission(context, { permission: "section.coordinate" }).allowed;

  const isStaffView =
    canManageTimetable ||
    hodDepartmentIds.size > 0 ||
    classTeacherSectionIds.size > 0 ||
    subjectTeacherGroupIds.size > 0 ||
    hasTeachOrCoordinatePerm;

  const isReadOnlyBoard = !isStaffView;
  const canWriteSubstitution =
    canManageTimetable || hodDepartmentIds.size > 0;

  return {
    activeSession,
    canManageTimetable,
    isStaffView,
    isReadOnlyBoard,
    canWriteSubstitution,
    hodDepartmentIds,
    classTeacherSectionIds,
  };
}

export async function getTimetableWorkspace(
  slugOrContext: string | VerifiedTenantContext,
  options: {
    timetableId?: string;
    dayOfWeek?: number | string | null;
    includeDrafts?: boolean;
  } = {},
): Promise<TimetableWorkspaceDto> {
  const context = await resolveContextInput(slugOrContext);
  if (!context) {
    return {
      accessDenied: true,
      context: null,
      activeSession: null,
      terms: [],
      venues: [],
      periods: [],
      timetables: [],
      selectedTimetable: null,
      slots: [],
      substitutions: [],
      workload: [],
      teachingGroupOptions: [],
      sectionOptions: [],
      staffOptions: [],
      dayOfWeekFilter: null,
      includeDrafts: false,
      canManageTimetable: false,
      canWriteSubstitution: false,
      isReadOnlyBoard: true,
      offlineCacheablePayload: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerTimetableScope(supabase, context, todayDate);

  const includeDrafts = scope.isReadOnlyBoard
    ? false
    : (options.includeDrafts ?? scope.isStaffView);

  const parsedDay =
    options.dayOfWeek !== undefined &&
    options.dayOfWeek !== null &&
    options.dayOfWeek !== ""
      ? Number(options.dayOfWeek)
      : null;
  const dayOfWeekFilter =
    parsedDay && Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= 7
      ? parsedDay
      : null;

  let timetablesQuery = supabase
    .from("timetables")
    .select(
      "id, term_id, code, name, version_no, effective_from, effective_to, status, is_offline_cacheable, published_at, published_by_person_id, authored_by_person_id",
    )
    .eq("institution_id", context.institutionId)
    .order("effective_from", { ascending: false })
    .order("version_no", { ascending: false });

  if (scope.activeSession) {
    timetablesQuery = timetablesQuery.eq("session_id", scope.activeSession.id);
  }
  if (!includeDrafts) {
    timetablesQuery = timetablesQuery.eq("status", "published");
  }

  let tgQuery = supabase
    .from("teaching_groups")
    .select(
      "id, code, name, offering:subject_offerings(subject:subjects(name), grade:grade_levels(department_id))",
    )
    .eq("institution_id", context.institutionId)
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (scope.activeSession) {
    tgQuery = tgQuery.eq("session_id", scope.activeSession.id);
  }

  let sectionsQuery = supabase
    .from("sections")
    .select("id, code, name, grade:grade_levels(code, department_id)")
    .eq("institution_id", context.institutionId)
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (scope.activeSession) {
    sectionsQuery = sectionsQuery.eq("session_id", scope.activeSession.id);
  }

  let termsQuery = supabase
    .from("academic_terms")
    .select("id, code, name, sequence_no")
    .eq("institution_id", context.institutionId)
    .order("sequence_no", { ascending: true });

  if (scope.activeSession) {
    termsQuery = termsQuery.eq("session_id", scope.activeSession.id);
  }

  const [venuesRes, periodsRes, timetablesRes, termsRes, tgRes, sectionsRes] =
    await Promise.all([
      supabase
        .from("venues")
        .select(
          "id, code, name, venue_kind, capacity, building, floor, is_active",
        )
        .eq("institution_id", context.institutionId)
        .order("code", { ascending: true })
        .returns<
          {
            id: string;
            code: string;
            name: string;
            venue_kind: VenueKind;
            capacity: number | null;
            building: string | null;
            floor: string | null;
            is_active: boolean;
          }[]
        >(),
      supabase
        .from("timetable_periods")
        .select(
          "id, code, label, period_kind, sequence_no, start_time, end_time, is_active",
        )
        .eq("institution_id", context.institutionId)
        .order("sequence_no", { ascending: true })
        .returns<
          {
            id: string;
            code: string;
            label: string;
            period_kind: TimetablePeriodKind;
            sequence_no: number;
            start_time: string;
            end_time: string;
            is_active: boolean;
          }[]
        >(),
      timetablesQuery.returns<
        {
          id: string;
          term_id: string | null;
          code: string;
          name: string;
          version_no: number;
          effective_from: string;
          effective_to: string | null;
          status: TimetableStatus;
          is_offline_cacheable: boolean;
          published_at: string | null;
          published_by_person_id: string | null;
          authored_by_person_id: string;
        }[]
      >(),
      termsQuery.returns<{ id: string; code: string; name: string }[]>(),
      tgQuery.returns<
        {
          id: string;
          code: string;
          name: string;
          offering:
            | {
                subject: { name: string } | { name: string }[] | null;
                grade:
                  | { department_id: string | null }
                  | { department_id: string | null }[]
                  | null;
              }
            | {
                subject: { name: string } | { name: string }[] | null;
                grade:
                  | { department_id: string | null }
                  | { department_id: string | null }[]
                  | null;
              }[]
            | null;
        }[]
      >(),
      sectionsQuery.returns<
        {
          id: string;
          code: string;
          name: string;
          grade:
            | { code: string; department_id: string | null }
            | { code: string; department_id: string | null }[]
            | null;
        }[]
      >(),
    ]);

  if (
    venuesRes.error ||
    periodsRes.error ||
    timetablesRes.error ||
    termsRes.error ||
    tgRes.error ||
    sectionsRes.error
  ) {
    throw new Error(
      `Failed to load timetable workspace data: ${
        venuesRes.error?.message ||
        periodsRes.error?.message ||
        timetablesRes.error?.message ||
        termsRes.error?.message ||
        tgRes.error?.message ||
        sectionsRes.error?.message
      }`,
    );
  }

  const terms: TimetableTermOptionDto[] = termsRes.data ?? [];
  const termCodeById = new Map(terms.map((t) => [t.id, t.code]));

  const venues: VenueDto[] = (venuesRes.data ?? []).map((v) => ({
    id: v.id,
    code: v.code,
    name: v.name,
    venueKind: v.venue_kind,
    capacity: v.capacity,
    building: v.building,
    floor: v.floor,
    isActive: v.is_active,
  }));
  const venueById = new Map(venues.map((v) => [v.id, v]));

  const periods: TimetablePeriodDto[] = (periodsRes.data ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    label: p.label,
    periodKind: p.period_kind,
    sequenceNo: p.sequence_no,
    startTime: p.start_time,
    endTime: p.end_time,
    isActive: p.is_active,
  }));
  const periodById = new Map(periods.map((p) => [p.id, p]));

  const teachingGroupOptions: TimetableGroupOptionDto[] = (
    tgRes.data ?? []
  ).map((tg) => {
    const offering = unwrapJoin(tg.offering);
    const subject = unwrapJoin(offering?.subject);
    const grade = unwrapJoin(offering?.grade);
    return {
      id: tg.id,
      code: tg.code,
      name: tg.name,
      subjectName: subject?.name ?? tg.name,
      departmentId: grade?.department_id ?? null,
    };
  });
  const groupLabelById = new Map(
    teachingGroupOptions.map((tg) => [tg.id, `${tg.code} · ${tg.name}`]),
  );
  const groupDepartmentById = new Map(
    teachingGroupOptions.map((tg) => [tg.id, tg.departmentId]),
  );

  const sectionOptions: TimetableSectionOptionDto[] = (
    sectionsRes.data ?? []
  ).map((sec) => {
    const grade = unwrapJoin(sec.grade);
    const gradeCode = grade?.code ?? "";
    return {
      id: sec.id,
      code: sec.code,
      name: sec.name,
      gradeCode,
      departmentId: grade?.department_id ?? null,
      label: gradeCode
        ? `${gradeCode}-${sec.code} (${sec.name})`
        : `${sec.code} (${sec.name})`,
    };
  });
  const sectionLabelById = new Map(
    sectionOptions.map((s) => [s.id, s.label]),
  );
  const sectionDepartmentById = new Map(
    sectionOptions.map((s) => [s.id, s.departmentId]),
  );

  const rawTimetables = timetablesRes.data ?? [];
  const selectedRawTimetable =
    rawTimetables.find((t) => t.id === options.timetableId) ??
    rawTimetables.find((t) => t.status === "published") ??
    rawTimetables[0] ??
    null;

  let rawSlots: {
    id: string;
    timetable_id: string;
    day_of_week: number;
    period_id: string;
    teaching_group_id: string | null;
    section_id: string | null;
    teacher_person_id: string | null;
    venue_id: string | null;
    notes: string | null;
  }[] = [];

  if (selectedRawTimetable) {
    const slotsRes = await supabase
      .from("timetable_slots")
      .select(
        "id, timetable_id, day_of_week, period_id, teaching_group_id, section_id, teacher_person_id, venue_id, notes",
      )
      .eq("institution_id", context.institutionId)
      .eq("timetable_id", selectedRawTimetable.id)
      .order("day_of_week", { ascending: true })
      .returns<typeof rawSlots>();

    if (slotsRes.error) {
      throw new Error(
        `Failed to load timetable slots: ${slotsRes.error.message}`,
      );
    }
    rawSlots = slotsRes.data ?? [];
  }

  let rawSubstitutions: {
    id: string;
    timetable_slot_id: string;
    substitution_date: string;
    original_teacher_person_id: string | null;
    substitute_teacher_person_id: string;
    reason: string;
    status: SubstitutionStatus;
    assigned_by_person_id: string;
  }[] = [];

  const slotIds = rawSlots.map((s) => s.id);
  if (scope.isStaffView && slotIds.length > 0) {
    const minSubDate = shiftIsoDateDays(todayDate, -7);
    const subsRes = await supabase
      .from("timetable_substitutions")
      .select(
        "id, timetable_slot_id, substitution_date, original_teacher_person_id, substitute_teacher_person_id, reason, status, assigned_by_person_id",
      )
      .eq("institution_id", context.institutionId)
      .in("timetable_slot_id", slotIds)
      .gte("substitution_date", minSubDate)
      .order("substitution_date", { ascending: true })
      .limit(200)
      .returns<typeof rawSubstitutions>();

    if (subsRes.error) {
      throw new Error(
        `Failed to load timetable substitutions: ${subsRes.error.message}`,
      );
    }
    rawSubstitutions = subsRes.data ?? [];
  }

  let staffAssignmentPersonIds: string[] = [];
  if (scope.canManageTimetable || scope.canWriteSubstitution) {
    let staffQuery = supabase
      .from("academic_assignments")
      .select("person_id")
      .eq("institution_id", context.institutionId)
      .in("assignment_type", ["hod", "class_teacher", "subject_teacher"])
      .in("status", ["active", "delegated"]);

    if (scope.activeSession) {
      staffQuery = staffQuery.eq("session_id", scope.activeSession.id);
    }

    const staffRes = await staffQuery.returns<{ person_id: string }[]>();
    if (staffRes.error) {
      throw new Error(
        `Failed to load teaching staff candidates: ${staffRes.error.message}`,
      );
    }
    staffAssignmentPersonIds = (staffRes.data ?? []).map((r) => r.person_id);
  }

  const allPersonIds: (string | null | undefined)[] = [
    ...rawTimetables.flatMap((t) => [
      t.published_by_person_id,
      t.authored_by_person_id,
    ]),
    ...rawSlots.map((s) => s.teacher_person_id),
    ...rawSubstitutions.flatMap((sub) => [
      sub.original_teacher_person_id,
      sub.substitute_teacher_person_id,
      sub.assigned_by_person_id,
    ]),
    ...staffAssignmentPersonIds,
  ];
  const personNameMap = await fetchPersonNameMap(supabase, allPersonIds);

  const timetables: TimetableSummaryDto[] = rawTimetables.map((t) => ({
    id: t.id,
    termId: t.term_id,
    termCode: t.term_id ? (termCodeById.get(t.term_id) ?? null) : null,
    code: t.code,
    name: t.name,
    versionNo: t.version_no,
    effectiveFrom: t.effective_from,
    effectiveTo: t.effective_to,
    status: t.status,
    isOfflineCacheable: t.is_offline_cacheable,
    publishedAt: t.published_at,
    publishedByName: t.published_by_person_id
      ? (personNameMap.get(t.published_by_person_id) ?? null)
      : null,
    authoredByName:
      personNameMap.get(t.authored_by_person_id) ?? "Academic Leadership",
  }));

  const selectedTimetable = selectedRawTimetable
    ? (timetables.find((t) => t.id === selectedRawTimetable.id) ?? null)
    : null;

  const fullMappedSlots: TimetableSlotDto[] = rawSlots
    .map((s) => {
      const period = periodById.get(s.period_id);
      const tgLabel = s.teaching_group_id
        ? groupLabelById.get(s.teaching_group_id)
        : undefined;
      const secLabel = s.section_id
        ? sectionLabelById.get(s.section_id)
        : undefined;
      const venue = s.venue_id ? venueById.get(s.venue_id) : undefined;
      const tgDept = s.teaching_group_id
        ? (groupDepartmentById.get(s.teaching_group_id) ?? null)
        : null;
      const secDept = s.section_id
        ? (sectionDepartmentById.get(s.section_id) ?? null)
        : null;
      const canWriteSubForSlot =
        scope.canManageTimetable ||
        (tgDept !== null && scope.hodDepartmentIds.has(tgDept)) ||
        (secDept !== null && scope.hodDepartmentIds.has(secDept));

      return {
        id: s.id,
        timetableId: s.timetable_id,
        dayOfWeek: s.day_of_week,
        dayLabel: DAY_OF_WEEK_LABELS[s.day_of_week] ?? `Day ${s.day_of_week}`,
        periodId: s.period_id,
        periodCode: period?.code ?? "PER",
        periodLabel: period?.label ?? "Period",
        periodKind: period?.periodKind ?? "instructional",
        periodSequenceNo: period?.sequenceNo ?? 999,
        startTime: period ? period.startTime.slice(0, 5) : "--:--",
        endTime: period ? period.endTime.slice(0, 5) : "--:--",
        teachingGroupId: s.teaching_group_id,
        sectionId: s.section_id,
        groupLabel:
          [tgLabel, secLabel].filter(Boolean).join(" · ") || "Assigned Class",
        teacherPersonId: s.teacher_person_id,
        teacherName: s.teacher_person_id
          ? (personNameMap.get(s.teacher_person_id) ?? "Assigned Staff")
          : null,
        venueId: s.venue_id,
        venueLabel: venue ? `${venue.code} — ${venue.name}` : null,
        notes: scope.isReadOnlyBoard ? null : s.notes,
        canWriteSubstitutionForSlot: canWriteSubForSlot,
      };
    })
    .sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.periodSequenceNo - b.periodSequenceNo;
    });

  const fullSlotById = new Map(fullMappedSlots.map((s) => [s.id, s]));

  const substitutions: TimetableSubstitutionDto[] = scope.isReadOnlyBoard
    ? []
    : rawSubstitutions.map((sub) => {
        const slot = fullSlotById.get(sub.timetable_slot_id);
        return {
          id: sub.id,
          timetableSlotId: sub.timetable_slot_id,
          dayOfWeek: slot?.dayOfWeek ?? 1,
          dayLabel: slot?.dayLabel ?? "Day",
          periodLabel: slot
            ? `${slot.periodLabel} (${slot.startTime}–${slot.endTime})`
            : "Period",
          groupLabel: slot?.groupLabel ?? "Assigned Class",
          substitutionDate: sub.substitution_date,
          originalTeacherPersonId: sub.original_teacher_person_id,
          originalTeacherName: sub.original_teacher_person_id
            ? (personNameMap.get(sub.original_teacher_person_id) ?? "Teacher")
            : null,
          substituteTeacherPersonId: sub.substitute_teacher_person_id,
          substituteTeacherName:
            personNameMap.get(sub.substitute_teacher_person_id) ??
            "Substitute Teacher",
          reason: sub.reason,
          status: sub.status,
          assignedByName:
            personNameMap.get(sub.assigned_by_person_id) ?? "Academic Staff",
          canTransition:
            sub.status === "assigned" &&
            (slot?.canWriteSubstitutionForSlot ?? scope.canManageTimetable),
        };
      });

  const workload: TeacherWorkloadDto[] = scope.isReadOnlyBoard
    ? []
    : computeTeacherWorkloadSummary(
        rawSlots.map((s) => ({
          teacherPersonId: s.teacher_person_id,
          periodId: s.period_id,
          dayOfWeek: s.day_of_week,
        })),
        periodById,
      ).map((item) => ({
        ...item,
        teacherName:
          personNameMap.get(item.teacherPersonId) ?? "Assigned Staff",
      }));

  const uniqueStaffIds = [...new Set(staffAssignmentPersonIds)];
  const staffOptions: TimetableStaffOptionDto[] = uniqueStaffIds
    .map((personId) => ({
      personId,
      name: personNameMap.get(personId) ?? "Staff Member",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const offlineCacheablePayload = selectedTimetable
    ? buildOfflineTimetableSnapshot(
        selectedTimetable,
        periods,
        venues,
        rawSlots.map((s) => ({
          timetableId: s.timetable_id,
          dayOfWeek: s.day_of_week,
          periodId: s.period_id,
          teachingGroupId: s.teaching_group_id,
          sectionId: s.section_id,
          teacherPersonId: s.teacher_person_id,
          venueId: s.venue_id,
        })),
        {
          teachingGroups: groupLabelById,
          sections: sectionLabelById,
          teachers: personNameMap,
        },
      )
    : null;

  const displayedSlots = dayOfWeekFilter
    ? fullMappedSlots.filter((s) => s.dayOfWeek === dayOfWeekFilter)
    : fullMappedSlots;

  return {
    accessDenied: false,
    context,
    activeSession: scope.activeSession,
    terms,
    venues,
    periods,
    timetables,
    selectedTimetable,
    slots: displayedSlots,
    substitutions,
    workload,
    teachingGroupOptions,
    sectionOptions,
    staffOptions,
    dayOfWeekFilter,
    includeDrafts,
    canManageTimetable: scope.canManageTimetable,
    canWriteSubstitution: scope.canWriteSubstitution,
    isReadOnlyBoard: scope.isReadOnlyBoard,
    offlineCacheablePayload,
  };
}

export async function createVenue(
  slug: string,
  rawInput: unknown,
): Promise<TimetableActionResult<{ id: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = createVenueSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid venue input.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerTimetableScope(supabase, context, todayDate);

  if (!scope.canManageTimetable) {
    return {
      ok: false,
      error: "Only academic leadership can configure institutional venues.",
      status: 403,
    };
  }

  const { data: inserted, error } = await supabase
    .from("venues")
    .insert({
      institution_id: context.institutionId,
      code: parsed.data.code,
      name: parsed.data.name,
      venue_kind: parsed.data.venueKind,
      capacity: parsed.data.capacity,
      building: parsed.data.building ?? null,
      floor: parsed.data.floor ?? null,
      is_active: parsed.data.isActive,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !inserted) {
    const mapped = mapMutationError(error, "Failed to create venue.", {
      venues_institution_id_code_key: "Venue code already exists.",
    });
    return { ok: false, error: mapped.error, status: mapped.status };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "timetable.venue_created",
    entityType: "venues",
    entityId: inserted.id,
    afterState: {
      code: parsed.data.code,
      venueKind: parsed.data.venueKind,
      isActive: parsed.data.isActive,
    },
  });

  return { ok: true, data: { id: inserted.id } };
}

export async function createTimetablePeriod(
  slug: string,
  rawInput: unknown,
): Promise<TimetableActionResult<{ id: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = createTimetablePeriodSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid timetable period.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerTimetableScope(supabase, context, todayDate);

  if (!scope.canManageTimetable) {
    return {
      ok: false,
      error: "Only academic leadership can configure timetable bell periods.",
      status: 403,
    };
  }

  const startTime = normalizeTimeString(parsed.data.startTime);
  const endTime = normalizeTimeString(parsed.data.endTime);

  const { data: inserted, error } = await supabase
    .from("timetable_periods")
    .insert({
      institution_id: context.institutionId,
      code: parsed.data.code,
      label: parsed.data.label,
      period_kind: parsed.data.periodKind,
      sequence_no: parsed.data.sequenceNo,
      start_time: startTime,
      end_time: endTime,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !inserted) {
    const mapped = mapMutationError(error, "Failed to create period.", {
      timetable_periods_institution_id_code_key: "Period code already exists.",
    });
    return { ok: false, error: mapped.error, status: mapped.status };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "timetable.period_created",
    entityType: "timetable_periods",
    entityId: inserted.id,
    afterState: {
      code: parsed.data.code,
      periodKind: parsed.data.periodKind,
      sequenceNo: parsed.data.sequenceNo,
      startTime,
      endTime,
    },
  });

  return { ok: true, data: { id: inserted.id } };
}

export async function createTimetable(
  slug: string,
  rawInput: unknown,
): Promise<TimetableActionResult<{ id: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = createTimetableSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid timetable definition.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerTimetableScope(supabase, context, todayDate);

  if (!scope.activeSession) {
    return {
      ok: false,
      error: "An active academic session is required.",
      status: 400,
    };
  }
  if (!scope.canManageTimetable) {
    return {
      ok: false,
      error: "Only academic leadership can create timetable versions.",
      status: 403,
    };
  }

  const isPublished = parsed.data.initialStatus === "published";
  const nowIso = new Date().toISOString();

  const { data: inserted, error } = await supabase
    .from("timetables")
    .insert({
      institution_id: context.institutionId,
      session_id: scope.activeSession.id,
      term_id: parsed.data.termId,
      code: parsed.data.code,
      name: parsed.data.name,
      version_no: parsed.data.versionNo,
      effective_from: parsed.data.effectiveFrom,
      effective_to: parsed.data.effectiveTo,
      status: parsed.data.initialStatus,
      is_offline_cacheable: parsed.data.isOfflineCacheable,
      published_at: isPublished ? nowIso : null,
      published_by_person_id: isPublished ? context.personId : null,
      authored_by_person_id: context.personId,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !inserted) {
    const mapped = mapMutationError(error, "Failed to create timetable.", {
      timetables_institution_id_session_id_code_version_no_key:
        "That timetable code and version number already exists in this session.",
    });
    return { ok: false, error: mapped.error, status: mapped.status };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "timetable.created",
    entityType: "timetables",
    entityId: inserted.id,
    afterState: {
      code: parsed.data.code,
      versionNo: parsed.data.versionNo,
      status: parsed.data.initialStatus,
      isOfflineCacheable: parsed.data.isOfflineCacheable,
    },
  });

  return { ok: true, data: { id: inserted.id } };
}

export async function transitionTimetableStatus(
  slug: string,
  rawInput: unknown,
): Promise<TimetableActionResult<{ id: string; status: TimetableStatus }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = transitionTimetableStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Invalid timetable status transition.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerTimetableScope(supabase, context, todayDate);

  if (!scope.canManageTimetable) {
    return {
      ok: false,
      error: "Only academic leadership can publish or archive timetables.",
      status: 403,
    };
  }

  const { data: current, error: loadErr } = await supabase
    .from("timetables")
    .select("id, status")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.timetableId)
    .maybeSingle<{ id: string; status: TimetableStatus }>();

  if (loadErr || !current) {
    return {
      ok: false,
      error: loadErr?.message ?? "Timetable version not found.",
      status: 404,
    };
  }

  if (!canTransitionTimetableStatus(current.status, parsed.data.targetStatus)) {
    return {
      ok: false,
      error: `Cannot transition timetable from ${current.status} to ${parsed.data.targetStatus}.`,
      status: 409,
    };
  }

  const updatePayload: Record<string, unknown> = {
    status: parsed.data.targetStatus,
  };
  if (parsed.data.targetStatus === "published") {
    updatePayload.published_at = new Date().toISOString();
    updatePayload.published_by_person_id = context.personId;
  }

  const { data: updated, error: updateErr } = await supabase
    .from("timetables")
    .update(updatePayload)
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.timetableId)
    .select("id, status")
    .returns<{ id: string; status: TimetableStatus }[]>();

  if (updateErr) {
    const mapped = mapMutationError(updateErr, "Failed to update timetable status.");
    return { ok: false, error: mapped.error, status: mapped.status };
  }
  const updatedRow = updated?.[0];
  if (!updatedRow) {
    return {
      ok: false,
      error: "Timetable version not found or not permitted.",
      status: 403,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "timetable.status_transitioned",
    entityType: "timetables",
    entityId: parsed.data.timetableId,
    beforeState: { status: current.status },
    afterState: { status: parsed.data.targetStatus },
  });

  return {
    ok: true,
    data: { id: updatedRow.id, status: updatedRow.status },
  };
}

export async function createTimetableSlot(
  slug: string,
  rawInput: unknown,
): Promise<TimetableActionResult<{ id: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = createTimetableSlotSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid timetable slot input.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerTimetableScope(supabase, context, todayDate);

  if (!scope.canManageTimetable) {
    return {
      ok: false,
      error: "Only academic leadership can schedule timetable slots.",
      status: 403,
    };
  }

  const [ttRes, periodRes, existingSlotsRes] = await Promise.all([
    supabase
      .from("timetables")
      .select("id, status")
      .eq("institution_id", context.institutionId)
      .eq("id", parsed.data.timetableId)
      .maybeSingle<{ id: string; status: TimetableStatus }>(),
    supabase
      .from("timetable_periods")
      .select("id, period_kind")
      .eq("institution_id", context.institutionId)
      .eq("id", parsed.data.periodId)
      .maybeSingle<{ id: string; period_kind: TimetablePeriodKind }>(),
    supabase
      .from("timetable_slots")
      .select(
        "id, timetable_id, day_of_week, period_id, teaching_group_id, section_id, teacher_person_id, venue_id",
      )
      .eq("institution_id", context.institutionId)
      .eq("timetable_id", parsed.data.timetableId)
      .eq("day_of_week", parsed.data.dayOfWeek)
      .eq("period_id", parsed.data.periodId)
      .returns<
        {
          id: string;
          timetable_id: string;
          day_of_week: number;
          period_id: string;
          teaching_group_id: string | null;
          section_id: string | null;
          teacher_person_id: string | null;
          venue_id: string | null;
        }[]
      >(),
  ]);

  if (ttRes.error || !ttRes.data) {
    return {
      ok: false,
      error: ttRes.error?.message ?? "Selected timetable not found.",
      status: 404,
    };
  }

  if (ttRes.data.status !== "draft") {
    return {
      ok: false,
      error:
        "Published and archived timetables are locked; create a new draft version to change slots.",
      status: 409,
    };
  }

  if (periodRes.error || !periodRes.data) {
    return {
      ok: false,
      error: periodRes.error?.message ?? "Selected period not found.",
      status: 404,
    };
  }

  if (existingSlotsRes.error) {
    return {
      ok: false,
      error: existingSlotsRes.error.message,
      status: 400,
    };
  }

  const periodKindMap = new Map<string, TimetablePeriodKind>([
    [periodRes.data.id, periodRes.data.period_kind],
  ]);

  const conflicts = detectTimetableSlotConflicts(
    (existingSlotsRes.data ?? []).map((s) => ({
      id: s.id,
      timetableId: s.timetable_id,
      dayOfWeek: s.day_of_week,
      periodId: s.period_id,
      teachingGroupId: s.teaching_group_id,
      sectionId: s.section_id,
      teacherPersonId: s.teacher_person_id,
      venueId: s.venue_id,
    })),
    {
      timetableId: parsed.data.timetableId,
      dayOfWeek: parsed.data.dayOfWeek,
      periodId: parsed.data.periodId,
      teachingGroupId: parsed.data.teachingGroupId,
      sectionId: parsed.data.sectionId,
      teacherPersonId: parsed.data.teacherPersonId,
      venueId: parsed.data.venueId,
    },
    periodKindMap,
  );

  if (conflicts.length > 0) {
    return {
      ok: false,
      error: conflicts.map((c) => c.message).join(" "),
      status: 409,
    };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("timetable_slots")
    .insert({
      institution_id: context.institutionId,
      timetable_id: parsed.data.timetableId,
      day_of_week: parsed.data.dayOfWeek,
      period_id: parsed.data.periodId,
      teaching_group_id: parsed.data.teachingGroupId,
      section_id: parsed.data.sectionId,
      teacher_person_id: parsed.data.teacherPersonId,
      venue_id: parsed.data.venueId,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    const mapped = mapMutationError(insertErr, "Failed to schedule slot.", {
      uq_timetable_slots_teacher:
        "Teacher is already booked in this day and period.",
      uq_timetable_slots_venue:
        "Venue is already booked in this day and period.",
      uq_timetable_slots_teaching_group:
        "Teaching group is already scheduled in this day and period.",
    });
    return { ok: false, error: mapped.error, status: mapped.status };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "timetable.slot_created",
    entityType: "timetable_slots",
    entityId: inserted.id,
    afterState: {
      timetableId: parsed.data.timetableId,
      dayOfWeek: parsed.data.dayOfWeek,
      periodId: parsed.data.periodId,
      teachingGroupId: parsed.data.teachingGroupId,
      sectionId: parsed.data.sectionId,
      teacherPersonId: parsed.data.teacherPersonId,
      venueId: parsed.data.venueId,
    },
  });

  return { ok: true, data: { id: inserted.id } };
}

export async function deleteTimetableSlot(
  slug: string,
  slotId: string,
): Promise<TimetableActionResult<{ id: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  if (!/^[0-9a-f-]{36}$/i.test(slotId)) {
    return { ok: false, error: "Invalid timetable slot ID.", status: 400 };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerTimetableScope(supabase, context, todayDate);

  if (!scope.canManageTimetable) {
    return {
      ok: false,
      error: "Only academic leadership can remove draft timetable slots.",
      status: 403,
    };
  }

  const { data: slot, error: slotErr } = await supabase
    .from("timetable_slots")
    .select("id, timetable_id, day_of_week, period_id")
    .eq("institution_id", context.institutionId)
    .eq("id", slotId)
    .maybeSingle<{
      id: string;
      timetable_id: string;
      day_of_week: number;
      period_id: string;
    }>();

  if (slotErr || !slot) {
    return {
      ok: false,
      error: slotErr?.message ?? "Timetable slot not found.",
      status: 404,
    };
  }

  const { data: tt, error: ttErr } = await supabase
    .from("timetables")
    .select("status")
    .eq("institution_id", context.institutionId)
    .eq("id", slot.timetable_id)
    .maybeSingle<{ status: TimetableStatus }>();

  if (ttErr || !tt) {
    return { ok: false, error: "Parent timetable not found.", status: 404 };
  }
  if (tt.status !== "draft") {
    return {
      ok: false,
      error:
        "Slots cannot be deleted from published or archived timetables.",
      status: 409,
    };
  }

  const { data: deleted, error: deleteErr } = await supabase
    .from("timetable_slots")
    .delete()
    .eq("institution_id", context.institutionId)
    .eq("id", slotId)
    .select("id")
    .returns<{ id: string }[]>();

  if (deleteErr) {
    const mapped = mapMutationError(deleteErr, "Failed to delete slot.");
    return { ok: false, error: mapped.error, status: mapped.status };
  }
  if (!deleted || deleted.length === 0) {
    return {
      ok: false,
      error: "Timetable slot not found or not permitted.",
      status: 403,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "timetable.slot_deleted",
    entityType: "timetable_slots",
    entityId: slotId,
    beforeState: {
      timetableId: slot.timetable_id,
      dayOfWeek: slot.day_of_week,
      periodId: slot.period_id,
    },
  });

  return { ok: true, data: { id: slotId } };
}

export async function createTimetableSubstitution(
  slug: string,
  rawInput: unknown,
): Promise<TimetableActionResult<{ id: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = createSubstitutionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid substitution input.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerTimetableScope(supabase, context, todayDate);

  if (!scope.canWriteSubstitution) {
    return {
      ok: false,
      error:
        "Only academic leadership or department HODs can assign teacher substitutions.",
      status: 403,
    };
  }

  const { data: slot, error: slotErr } = await supabase
    .from("timetable_slots")
    .select(
      "id, timetable_id, day_of_week, period_id, teacher_person_id, teaching_group_id, section_id",
    )
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.timetableSlotId)
    .maybeSingle<{
      id: string;
      timetable_id: string;
      day_of_week: number;
      period_id: string;
      teacher_person_id: string | null;
      teaching_group_id: string | null;
      section_id: string | null;
    }>();

  if (slotErr || !slot) {
    return {
      ok: false,
      error: slotErr?.message ?? "Timetable slot not found.",
      status: 404,
    };
  }

  const { data: tt, error: ttErr } = await supabase
    .from("timetables")
    .select("status")
    .eq("institution_id", context.institutionId)
    .eq("id", slot.timetable_id)
    .maybeSingle<{ status: TimetableStatus }>();

  if (ttErr || !tt) {
    return { ok: false, error: "Parent timetable not found.", status: 404 };
  }
  if (tt.status !== "published") {
    return {
      ok: false,
      error: "Substitutions can only be recorded against a published timetable.",
      status: 409,
    };
  }

  if (
    slot.teacher_person_id &&
    slot.teacher_person_id === parsed.data.substituteTeacherPersonId
  ) {
    return {
      ok: false,
      error:
        "Substitute teacher must differ from the originally scheduled teacher.",
      status: 400,
    };
  }

  const dateWeekday = getIsoWeekdayFromDate(parsed.data.substitutionDate);
  if (dateWeekday !== slot.day_of_week) {
    return {
      ok: false,
      error: `Selected date (${parsed.data.substitutionDate}) is ${
        DAY_OF_WEEK_LABELS[dateWeekday] ?? "another day"
      }, which does not match this slot's scheduled day (${
        DAY_OF_WEEK_LABELS[slot.day_of_week] ?? slot.day_of_week
      }).`,
      status: 400,
    };
  }

  const [sameDayPeriodSlotsRes, subsOnDateRes] = await Promise.all([
    supabase
      .from("timetable_slots")
      .select("teacher_person_id, day_of_week, period_id")
      .eq("institution_id", context.institutionId)
      .eq("timetable_id", slot.timetable_id)
      .eq("day_of_week", slot.day_of_week)
      .eq("period_id", slot.period_id)
      .returns<
        {
          teacher_person_id: string | null;
          day_of_week: number;
          period_id: string;
        }[]
      >(),
    supabase
      .from("timetable_substitutions")
      .select("timetable_slot_id, substitute_teacher_person_id, status")
      .eq("institution_id", context.institutionId)
      .eq("substitution_date", parsed.data.substitutionDate)
      .returns<
        {
          timetable_slot_id: string;
          substitute_teacher_person_id: string;
          status: SubstitutionStatus;
        }[]
      >(),
  ]);

  if (sameDayPeriodSlotsRes.error || subsOnDateRes.error) {
    return {
      ok: false,
      error:
        sameDayPeriodSlotsRes.error?.message ||
        subsOnDateRes.error?.message ||
        "Failed to check substitute availability.",
      status: 400,
    };
  }

  const subSlotIds = [
    ...new Set((subsOnDateRes.data ?? []).map((s) => s.timetable_slot_id)),
  ];
  const subSlotPeriodById = new Map<string, string>();
  if (subSlotIds.length > 0) {
    const subSlotsMetaRes = await supabase
      .from("timetable_slots")
      .select("id, period_id")
      .eq("institution_id", context.institutionId)
      .in("id", subSlotIds)
      .returns<{ id: string; period_id: string }[]>();
    if (subSlotsMetaRes.error) {
      return {
        ok: false,
        error: subSlotsMetaRes.error.message,
        status: 400,
      };
    }
    for (const meta of subSlotsMetaRes.data ?? []) {
      subSlotPeriodById.set(meta.id, meta.period_id);
    }
  }

  const available = filterAvailableSubstituteStaff(
    [{ personId: parsed.data.substituteTeacherPersonId }],
    {
      teacherPersonId: slot.teacher_person_id,
      dayOfWeek: slot.day_of_week,
      periodId: slot.period_id,
    },
    (subsOnDateRes.data ?? []).map((s) => ({
      substituteTeacherPersonId: s.substitute_teacher_person_id,
      periodId: subSlotPeriodById.get(s.timetable_slot_id) ?? "",
      status: s.status,
    })),
    (sameDayPeriodSlotsRes.data ?? []).map((s) => ({
      teacherPersonId: s.teacher_person_id,
      dayOfWeek: s.day_of_week,
      periodId: s.period_id,
    })),
  );

  if (available.length === 0) {
    return {
      ok: false,
      error:
        "Selected substitute teacher is already scheduled or covering another class during this period.",
      status: 409,
    };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("timetable_substitutions")
    .insert({
      institution_id: context.institutionId,
      timetable_slot_id: parsed.data.timetableSlotId,
      substitution_date: parsed.data.substitutionDate,
      original_teacher_person_id: slot.teacher_person_id,
      substitute_teacher_person_id: parsed.data.substituteTeacherPersonId,
      reason: parsed.data.reason,
      status: "assigned",
      assigned_by_person_id: context.personId,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    const mapped = mapMutationError(
      insertErr,
      "Failed to assign teacher substitution.",
      {
        timetable_substitutions_institution_id_timetable_slot_id_subst_key:
          "A substitution is already recorded for this slot on that date.",
      },
    );
    return { ok: false, error: mapped.error, status: mapped.status };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "timetable.substitution_created",
    entityType: "timetable_substitutions",
    entityId: inserted.id,
    afterState: {
      timetableSlotId: parsed.data.timetableSlotId,
      substitutionDate: parsed.data.substitutionDate,
      substituteTeacherPersonId: parsed.data.substituteTeacherPersonId,
      status: "assigned",
    },
    metadata: {
      reasonLength: parsed.data.reason.length,
    },
  });

  return { ok: true, data: { id: inserted.id } };
}

export async function transitionSubstitutionStatus(
  slug: string,
  rawInput: unknown,
): Promise<TimetableActionResult<{ id: string; status: SubstitutionStatus }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = transitionSubstitutionStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Invalid substitution status transition.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();

  const { data: current, error: loadErr } = await supabase
    .from("timetable_substitutions")
    .select("id, status")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.substitutionId)
    .maybeSingle<{ id: string; status: SubstitutionStatus }>();

  if (loadErr || !current) {
    return {
      ok: false,
      error: loadErr?.message ?? "Substitution record not found.",
      status: 404,
    };
  }

  if (current.status !== "assigned") {
    return {
      ok: false,
      error: `Only assigned substitutions can transition (currently ${current.status}).`,
      status: 409,
    };
  }

  const { data: updated, error: updateErr } = await supabase
    .from("timetable_substitutions")
    .update({ status: parsed.data.targetStatus })
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.substitutionId)
    .select("id, status")
    .returns<{ id: string; status: SubstitutionStatus }[]>();

  if (updateErr) {
    const mapped = mapMutationError(
      updateErr,
      "Failed to update substitution status.",
    );
    return { ok: false, error: mapped.error, status: mapped.status };
  }
  const updatedRow = updated?.[0];
  if (!updatedRow) {
    return {
      ok: false,
      error: "Substitution record not found or not permitted.",
      status: 403,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "timetable.substitution_status_transitioned",
    entityType: "timetable_substitutions",
    entityId: parsed.data.substitutionId,
    beforeState: { status: current.status },
    afterState: { status: parsed.data.targetStatus },
  });

  return {
    ok: true,
    data: { id: updatedRow.id, status: updatedRow.status },
  };
}

export async function getAcademicCalendarWorkspace(
  slugOrContext: string | VerifiedTenantContext,
  options: {
    scopeFilter?: string;
    kindFilter?: string;
    includeDrafts?: boolean;
  } = {},
): Promise<AcademicCalendarWorkspaceDto> {
  const context = await resolveContextInput(slugOrContext);
  if (!context) {
    return {
      accessDenied: true,
      context: null,
      activeSession: null,
      terms: [],
      scopeFilter: "all",
      kindFilter: "all",
      includeDrafts: false,
      events: [],
      canCreateEvent: false,
      canCreateInstitution: false,
      departmentOptions: [],
      sectionOptions: [],
      isReadOnlyBoard: true,
    };
  }

  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerTimetableScope(supabase, context, todayDate);

  const includeDrafts = scope.isReadOnlyBoard
    ? false
    : (options.includeDrafts ?? scope.isStaffView);

  const scopeFilter: CalendarScopeType | "all" =
    options.scopeFilter &&
    CALENDAR_SCOPE_TYPES.includes(options.scopeFilter as CalendarScopeType)
      ? (options.scopeFilter as CalendarScopeType)
      : "all";

  const kindFilter: CalendarEventKind | "all" =
    options.kindFilter &&
    CALENDAR_EVENT_KINDS.includes(options.kindFilter as CalendarEventKind)
      ? (options.kindFilter as CalendarEventKind)
      : "all";

  let eventsQuery = supabase
    .from("academic_calendar_events")
    .select(
      "id, term_id, scope_type, department_id, section_id, event_kind, title, description, starts_on, ends_on, is_non_instructional, status, authored_by_person_id",
    )
    .eq("institution_id", context.institutionId)
    .order("starts_on", { ascending: true });

  if (scope.activeSession) {
    eventsQuery = eventsQuery.eq("session_id", scope.activeSession.id);
  }
  if (!includeDrafts) {
    eventsQuery = eventsQuery.eq("status", "published");
  }
  if (scopeFilter !== "all") {
    eventsQuery = eventsQuery.eq("scope_type", scopeFilter);
  }
  if (kindFilter !== "all") {
    eventsQuery = eventsQuery.eq("event_kind", kindFilter);
  }

  let termsQuery = supabase
    .from("academic_terms")
    .select("id, code, name, sequence_no")
    .eq("institution_id", context.institutionId)
    .order("sequence_no", { ascending: true });
  if (scope.activeSession) {
    termsQuery = termsQuery.eq("session_id", scope.activeSession.id);
  }

  let sectionsQuery = supabase
    .from("sections")
    .select("id, code, name, grade:grade_levels(code, department_id)")
    .eq("institution_id", context.institutionId)
    .eq("is_active", true)
    .order("code", { ascending: true });
  if (scope.activeSession) {
    sectionsQuery = sectionsQuery.eq("session_id", scope.activeSession.id);
  }

  const [eventsRes, termsRes, deptsRes, sectionsRes] = await Promise.all([
    eventsQuery.returns<
      {
        id: string;
        term_id: string | null;
        scope_type: CalendarScopeType;
        department_id: string | null;
        section_id: string | null;
        event_kind: CalendarEventKind;
        title: string;
        description: string | null;
        starts_on: string;
        ends_on: string;
        is_non_instructional: boolean;
        status: CalendarEventStatus;
        authored_by_person_id: string;
      }[]
    >(),
    termsQuery.returns<{ id: string; code: string; name: string }[]>(),
    supabase
      .from("academic_departments")
      .select("id, code, name")
      .eq("institution_id", context.institutionId)
      .eq("is_active", true)
      .order("code", { ascending: true })
      .returns<{ id: string; code: string; name: string }[]>(),
    sectionsQuery.returns<
      {
        id: string;
        code: string;
        name: string;
        grade:
          | { code: string; department_id: string | null }
          | { code: string; department_id: string | null }[]
          | null;
      }[]
    >(),
  ]);

  if (
    eventsRes.error ||
    termsRes.error ||
    deptsRes.error ||
    sectionsRes.error
  ) {
    throw new Error(
      `Failed to load academic calendar workspace: ${
        eventsRes.error?.message ||
        termsRes.error?.message ||
        deptsRes.error?.message ||
        sectionsRes.error?.message
      }`,
    );
  }

  const terms: TimetableTermOptionDto[] = termsRes.data ?? [];
  const termCodeById = new Map(terms.map((t) => [t.id, t.code]));

  const allDepartments = deptsRes.data ?? [];
  const deptNameById = new Map(allDepartments.map((d) => [d.id, d.name]));

  const allSections: TimetableSectionOptionDto[] = (
    sectionsRes.data ?? []
  ).map((sec) => {
    const grade = unwrapJoin(sec.grade);
    const gradeCode = grade?.code ?? "";
    return {
      id: sec.id,
      code: sec.code,
      name: sec.name,
      gradeCode,
      departmentId: grade?.department_id ?? null,
      label: gradeCode
        ? `${gradeCode}-${sec.code} (${sec.name})`
        : `${sec.code} (${sec.name})`,
    };
  });
  const sectionLabelById = new Map(allSections.map((s) => [s.id, s.label]));
  const sectionDeptById = new Map(
    allSections.map((s) => [s.id, s.departmentId]),
  );

  const rawEvents = eventsRes.data ?? [];
  const authorNames = await fetchPersonNameMap(
    supabase,
    rawEvents.map((e) => e.authored_by_person_id),
  );

  const canManageScopeTarget = (
    scopeType: CalendarScopeType,
    departmentId: string | null,
    sectionId: string | null,
  ): boolean => {
    if (scope.canManageTimetable) return true;
    if (scopeType === "department" && departmentId) {
      return scope.hodDepartmentIds.has(departmentId);
    }
    if (scopeType === "section" && sectionId) {
      const secDept = sectionDeptById.get(sectionId) ?? null;
      return (
        scope.classTeacherSectionIds.has(sectionId) ||
        (secDept !== null && scope.hodDepartmentIds.has(secDept))
      );
    }
    return false;
  };

  const events: AcademicCalendarEventDto[] = rawEvents.map((ev) => {
    const deptName = ev.department_id
      ? (deptNameById.get(ev.department_id) ?? "Department")
      : null;
    const secLabel = ev.section_id
      ? (sectionLabelById.get(ev.section_id) ?? "Section")
      : null;

    let scopeLabel = "Institution-wide";
    if (ev.scope_type === "department") {
      scopeLabel = deptName ?? "Department";
    } else if (ev.scope_type === "section") {
      scopeLabel = secLabel ?? "Section";
    }

    return {
      id: ev.id,
      termId: ev.term_id,
      termCode: ev.term_id ? (termCodeById.get(ev.term_id) ?? null) : null,
      scopeType: ev.scope_type,
      departmentId: ev.department_id,
      departmentName: deptName,
      sectionId: ev.section_id,
      sectionLabel: secLabel,
      scopeLabel,
      eventKind: ev.event_kind,
      title: ev.title,
      description: ev.description,
      startsOn: ev.starts_on,
      endsOn: ev.ends_on,
      isNonInstructional: ev.is_non_instructional,
      status: ev.status,
      authoredByName:
        authorNames.get(ev.authored_by_person_id) ?? "Academic Staff",
      canUpdateStatus: canManageScopeTarget(
        ev.scope_type,
        ev.department_id,
        ev.section_id,
      ),
    };
  });

  const departmentOptions = scope.canManageTimetable
    ? allDepartments
    : allDepartments.filter((d) => scope.hodDepartmentIds.has(d.id));

  const sectionOptions = scope.canManageTimetable
    ? allSections
    : allSections.filter(
        (s) =>
          scope.classTeacherSectionIds.has(s.id) ||
          (s.departmentId !== null && scope.hodDepartmentIds.has(s.departmentId)),
      );

  const canCreateInstitution = scope.canManageTimetable;
  const canCreateEvent =
    canCreateInstitution ||
    departmentOptions.length > 0 ||
    sectionOptions.length > 0;

  return {
    accessDenied: false,
    context,
    activeSession: scope.activeSession,
    terms,
    scopeFilter,
    kindFilter,
    includeDrafts,
    events,
    canCreateEvent,
    canCreateInstitution,
    departmentOptions,
    sectionOptions,
    isReadOnlyBoard: scope.isReadOnlyBoard,
  };
}

export async function createCalendarEvent(
  slug: string,
  rawInput: unknown,
): Promise<TimetableActionResult<{ id: string }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = createCalendarEventSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid calendar event input.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const scope = await loadCallerTimetableScope(supabase, context, todayDate);

  if (!scope.activeSession) {
    return {
      ok: false,
      error: "An active academic session is required.",
      status: 400,
    };
  }

  let hasScopeAuthority = scope.canManageTimetable;
  if (!hasScopeAuthority && parsed.data.scopeType === "department") {
    hasScopeAuthority = Boolean(
      parsed.data.departmentId &&
        scope.hodDepartmentIds.has(parsed.data.departmentId),
    );
  } else if (!hasScopeAuthority && parsed.data.scopeType === "section") {
    if (
      parsed.data.sectionId &&
      scope.classTeacherSectionIds.has(parsed.data.sectionId)
    ) {
      hasScopeAuthority = true;
    } else if (parsed.data.sectionId && scope.hodDepartmentIds.size > 0) {
      const secRes = await supabase
        .from("sections")
        .select("id, grade:grade_levels(department_id)")
        .eq("institution_id", context.institutionId)
        .eq("id", parsed.data.sectionId)
        .maybeSingle<{
          id: string;
          grade:
            | { department_id: string | null }
            | { department_id: string | null }[]
            | null;
        }>();
      const grade = unwrapJoin(secRes.data?.grade);
      if (
        grade?.department_id &&
        scope.hodDepartmentIds.has(grade.department_id)
      ) {
        hasScopeAuthority = true;
      }
    }
  }

  if (!hasScopeAuthority) {
    return {
      ok: false,
      error:
        "You do not have authority to create calendar events for the selected scope.",
      status: 403,
    };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("academic_calendar_events")
    .insert({
      institution_id: context.institutionId,
      session_id: scope.activeSession.id,
      term_id: parsed.data.termId,
      scope_type: parsed.data.scopeType,
      department_id: parsed.data.departmentId,
      section_id: parsed.data.sectionId,
      event_kind: parsed.data.eventKind,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      starts_on: parsed.data.startsOn,
      ends_on: parsed.data.endsOn,
      is_non_instructional: parsed.data.isNonInstructional,
      status: parsed.data.status,
      authored_by_person_id: context.personId,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    const mapped = mapMutationError(
      insertErr,
      "Failed to create calendar event.",
    );
    return { ok: false, error: mapped.error, status: mapped.status };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "calendar.event_created",
    entityType: "academic_calendar_events",
    entityId: inserted.id,
    afterState: {
      scopeType: parsed.data.scopeType,
      eventKind: parsed.data.eventKind,
      startsOn: parsed.data.startsOn,
      endsOn: parsed.data.endsOn,
      status: parsed.data.status,
    },
  });

  return { ok: true, data: { id: inserted.id } };
}

export async function updateCalendarEventStatus(
  slug: string,
  rawInput: unknown,
): Promise<TimetableActionResult<{ id: string; status: CalendarEventStatus }>> {
  const resolution = await resolveVerifiedTenantContext(slug);
  if (resolution.status !== "ok") {
    return { ok: false, error: "Workspace authorization required.", status: 403 };
  }

  const parsed = updateCalendarEventStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Invalid calendar event status update.",
      status: 400,
    };
  }

  const { context } = resolution;
  const supabase = await createSupabaseServerClient();

  const { data: current, error: loadErr } = await supabase
    .from("academic_calendar_events")
    .select("id, status")
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.eventId)
    .maybeSingle<{ id: string; status: CalendarEventStatus }>();

  if (loadErr || !current) {
    return {
      ok: false,
      error: loadErr?.message ?? "Calendar event not found.",
      status: 404,
    };
  }

  if (
    !canTransitionCalendarEventStatus(current.status, parsed.data.targetStatus)
  ) {
    return {
      ok: false,
      error: `Cannot change calendar event from ${current.status} to ${parsed.data.targetStatus}.`,
      status: 409,
    };
  }

  const { data: updated, error: updateErr } = await supabase
    .from("academic_calendar_events")
    .update({ status: parsed.data.targetStatus })
    .eq("institution_id", context.institutionId)
    .eq("id", parsed.data.eventId)
    .select("id, status")
    .returns<{ id: string; status: CalendarEventStatus }[]>();

  if (updateErr) {
    const mapped = mapMutationError(
      updateErr,
      "Failed to update calendar event status.",
    );
    return { ok: false, error: mapped.error, status: mapped.status };
  }
  const updatedRow = updated?.[0];
  if (!updatedRow) {
    return {
      ok: false,
      error: "Calendar event not found or not permitted.",
      status: 403,
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: context.institutionId,
    actorPersonId: context.personId,
    actorAuthUserId: context.authUserId,
    action: "calendar.event_status_updated",
    entityType: "academic_calendar_events",
    entityId: parsed.data.eventId,
    beforeState: { status: current.status },
    afterState: { status: parsed.data.targetStatus },
  });

  return {
    ok: true,
    data: { id: updatedRow.id, status: updatedRow.status },
  };
}
