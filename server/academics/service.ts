import "server-only";

import type { VerifiedTenantContext } from "@/lib/auth/permissions";
import {
  detectAcademicAssignmentConflicts,
  resolveSectionRoleAssignments,
  validateCrossSectionGroupMembership,
  type ExistingAcademicAssignmentLike,
} from "@/lib/academics/conflicts";
import {
  addTeachingGroupMemberSchema,
  assignAcademicResponsibilitySchema,
  createDepartmentSchema,
  createGradeAndSectionSchema,
  createSessionSchema,
  createSubjectAndOfferingSchema,
  createTeachingGroupSchema,
  enrolStudentSessionSchema,
  enrolStudentSubjectSchema,
  type AcademicAssignmentStatus,
  type AcademicAssignmentType,
  type AcademicSessionStatus,
  type DepartmentKind,
  type SubjectCategory,
  type SubjectEnrolmentKind,
} from "@/lib/academics/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/server/audit/log";
import { requireInstitutionPermission } from "@/server/auth/guards";

export interface AcademicSessionDto {
  id: string;
  code: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status: AcademicSessionStatus;
}

export interface AcademicTermDto {
  id: string;
  sessionId: string;
  code: string;
  name: string;
  sequenceNo: number;
  startsOn: string;
  endsOn: string;
}

export interface AcademicDepartmentDto {
  id: string;
  code: string;
  name: string;
  departmentKind: DepartmentKind;
  description: string | null;
  isActive: boolean;
}

export interface GradeLevelDto {
  id: string;
  departmentId: string;
  code: string;
  name: string;
  displayOrder: number;
}

export interface SectionDto {
  id: string;
  sessionId: string;
  gradeLevelId: string;
  gradeCode: string;
  code: string;
  name: string;
  roomLabel: string | null;
  capacity: number | null;
}

export interface StreamDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface SubjectOfferingDto {
  id: string;
  sessionId: string;
  gradeLevelId: string;
  gradeCode: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  boardSubjectCode: string | null;
  category: SubjectCategory;
  streamId: string | null;
  streamName: string | null;
  isMandatory: boolean;
  maxStudents: number | null;
}

export interface AcademicsOverviewDto {
  sessions: readonly AcademicSessionDto[];
  selectedSession: AcademicSessionDto | null;
  terms: readonly AcademicTermDto[];
  departments: readonly AcademicDepartmentDto[];
  gradeLevels: readonly GradeLevelDto[];
  sections: readonly SectionDto[];
  streams: readonly StreamDto[];
  offerings: readonly SubjectOfferingDto[];
  teachingGroupsCount: number;
}

export interface SectionStudentRosterDto {
  enrolmentId: string;
  studentProfileId: string;
  admissionNumber: string;
  fullName: string;
  rollNumber: string | null;
  streamName: string | null;
  electives: readonly {
    id: string;
    subjectCode: string;
    subjectName: string;
    enrolmentKind: SubjectEnrolmentKind;
  }[];
}

export interface AssignmentSummaryDto {
  id: string;
  sessionId: string;
  personId: string;
  personName: string;
  assignmentType: AcademicAssignmentType;
  departmentId: string | null;
  sectionId: string | null;
  teachingGroupId: string | null;
  targetLabel: string;
  startsOn: string;
  endsOn: string | null;
  status: AcademicAssignmentStatus;
}

export interface SectionDetailDto {
  section: SectionDto;
  session: AcademicSessionDto | null;
  classTeacher: AssignmentSummaryDto | null;
  monitors: readonly AssignmentSummaryDto[];
  isCurrentUserMonitorReadOnly: boolean;
  roster: readonly SectionStudentRosterDto[];
  availableStudents: readonly {
    id: string;
    admissionNumber: string;
    fullName: string;
  }[];
  gradeOfferings: readonly SubjectOfferingDto[];
  streams: readonly StreamDto[];
}

export interface TeachingGroupMemberDto {
  membershipId: string;
  enrolmentId: string;
  studentProfileId: string;
  admissionNumber: string;
  fullName: string;
  sectionCode: string;
  rollNumber: string | null;
}

export interface TeachingGroupDto {
  id: string;
  sessionId: string;
  subjectOfferingId: string;
  subjectCode: string;
  subjectName: string;
  code: string;
  name: string;
  isCrossSection: boolean;
  venueLabel: string | null;
  subjectTeachers: readonly string[];
  sectionBreakdown: readonly { sectionCode: string; count: number }[];
  members: readonly TeachingGroupMemberDto[];
}

export interface AcademicsAssignmentPageDto {
  sessions: readonly AcademicSessionDto[];
  selectedSession: AcademicSessionDto | null;
  assignments: readonly AssignmentSummaryDto[];
  departments: readonly AcademicDepartmentDto[];
  sections: readonly SectionDto[];
  teachingGroups: readonly { id: string; code: string; name: string }[];
  candidatePersons: readonly { id: string; label: string }[];
}

type MutationResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function fetchPersonNameMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  personIds: readonly string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(personIds.filter((id) => id.length > 0))];
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

function selectSessionFromList(
  sessions: readonly AcademicSessionDto[],
  requestedSessionId?: string,
): AcademicSessionDto | null {
  if (sessions.length === 0) return null;
  if (requestedSessionId) {
    const matched = sessions.find((s) => s.id === requestedSessionId);
    if (matched) return matched;
  }
  return sessions.find((s) => s.status === "active") ?? sessions[0] ?? null;
}

export async function getAcademicsOverview(
  context: VerifiedTenantContext,
  requestedSessionId?: string,
): Promise<AcademicsOverviewDto> {
  const supabase = await createSupabaseServerClient();

  const [sessionsRes, deptsRes, gradesRes, streamsRes] = await Promise.all([
    supabase
      .from("academic_sessions")
      .select("id, code, name, starts_on, ends_on, status")
      .eq("institution_id", context.institutionId)
      .order("starts_on", { ascending: false })
      .returns<
        {
          id: string;
          code: string;
          name: string;
          starts_on: string;
          ends_on: string;
          status: AcademicSessionStatus;
        }[]
      >(),
    supabase
      .from("academic_departments")
      .select("id, code, name, department_kind, description, is_active")
      .eq("institution_id", context.institutionId)
      .order("name", { ascending: true })
      .returns<
        {
          id: string;
          code: string;
          name: string;
          department_kind: DepartmentKind;
          description: string | null;
          is_active: boolean;
        }[]
      >(),
    supabase
      .from("grade_levels")
      .select("id, department_id, code, name, display_order")
      .eq("institution_id", context.institutionId)
      .order("display_order", { ascending: true })
      .returns<
        {
          id: string;
          department_id: string;
          code: string;
          name: string;
          display_order: number;
        }[]
      >(),
    supabase
      .from("streams")
      .select("id, code, name, description")
      .eq("institution_id", context.institutionId)
      .order("name", { ascending: true })
      .returns<
        { id: string; code: string; name: string; description: string | null }[]
      >(),
  ]);

  const sessions: AcademicSessionDto[] = (sessionsRes.data ?? []).map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    startsOn: s.starts_on,
    endsOn: s.ends_on,
    status: s.status,
  }));

  const selectedSession = selectSessionFromList(sessions, requestedSessionId);
  const departments: AcademicDepartmentDto[] = (deptsRes.data ?? []).map(
    (d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      departmentKind: d.department_kind,
      description: d.description,
      isActive: d.is_active,
    }),
  );
  const gradeLevels: GradeLevelDto[] = (gradesRes.data ?? []).map((g) => ({
    id: g.id,
    departmentId: g.department_id,
    code: g.code,
    name: g.name,
    displayOrder: g.display_order,
  }));
  const gradeById = new Map(gradeLevels.map((g) => [g.id, g]));
  const streams: StreamDto[] = (streamsRes.data ?? []).map((st) => ({
    id: st.id,
    code: st.code,
    name: st.name,
    description: st.description,
  }));

  if (!selectedSession) {
    return {
      sessions,
      selectedSession: null,
      terms: [],
      departments,
      gradeLevels,
      sections: [],
      streams,
      offerings: [],
      teachingGroupsCount: 0,
    };
  }

  const [termsRes, sectionsRes, offeringsRes, tgCountRes] = await Promise.all([
    supabase
      .from("academic_terms")
      .select("id, session_id, code, name, sequence_no, starts_on, ends_on")
      .eq("institution_id", context.institutionId)
      .eq("session_id", selectedSession.id)
      .order("sequence_no", { ascending: true })
      .returns<
        {
          id: string;
          session_id: string;
          code: string;
          name: string;
          sequence_no: number;
          starts_on: string;
          ends_on: string;
        }[]
      >(),
    supabase
      .from("sections")
      .select(
        "id, session_id, grade_level_id, code, name, room_label, capacity",
      )
      .eq("institution_id", context.institutionId)
      .eq("session_id", selectedSession.id)
      .order("code", { ascending: true })
      .returns<
        {
          id: string;
          session_id: string;
          grade_level_id: string;
          code: string;
          name: string;
          room_label: string | null;
          capacity: number | null;
        }[]
      >(),
    supabase
      .from("subject_offerings")
      .select(
        "id, session_id, grade_level_id, subject_id, stream_id, is_mandatory, max_students, subject:subjects(id, code, name, board_subject_code, category), stream:streams(id, name)",
      )
      .eq("institution_id", context.institutionId)
      .eq("session_id", selectedSession.id)
      .returns<
        {
          id: string;
          session_id: string;
          grade_level_id: string;
          subject_id: string;
          stream_id: string | null;
          is_mandatory: boolean;
          max_students: number | null;
          subject:
            | {
                id: string;
                code: string;
                name: string;
                board_subject_code: string | null;
                category: SubjectCategory;
              }
            | {
                id: string;
                code: string;
                name: string;
                board_subject_code: string | null;
                category: SubjectCategory;
              }[]
            | null;
          stream: { id: string; name: string } | { id: string; name: string }[] | null;
        }[]
      >(),
    supabase
      .from("teaching_groups")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", context.institutionId)
      .eq("session_id", selectedSession.id),
  ]);

  const terms: AcademicTermDto[] = (termsRes.data ?? []).map((t) => ({
    id: t.id,
    sessionId: t.session_id,
    code: t.code,
    name: t.name,
    sequenceNo: t.sequence_no,
    startsOn: t.starts_on,
    endsOn: t.ends_on,
  }));

  const sections: SectionDto[] = (sectionsRes.data ?? []).map((sec) => ({
    id: sec.id,
    sessionId: sec.session_id,
    gradeLevelId: sec.grade_level_id,
    gradeCode: gradeById.get(sec.grade_level_id)?.code ?? "",
    code: sec.code,
    name: sec.name,
    roomLabel: sec.room_label,
    capacity: sec.capacity,
  }));

  const offerings: SubjectOfferingDto[] = (offeringsRes.data ?? []).flatMap(
    (off) => {
      const subject = unwrapJoin(off.subject);
      if (!subject) return [];
      const stream = unwrapJoin(off.stream);
      return [
        {
          id: off.id,
          sessionId: off.session_id,
          gradeLevelId: off.grade_level_id,
          gradeCode: gradeById.get(off.grade_level_id)?.code ?? "",
          subjectId: subject.id,
          subjectCode: subject.code,
          subjectName: subject.name,
          boardSubjectCode: subject.board_subject_code,
          category: subject.category,
          streamId: off.stream_id,
          streamName: stream?.name ?? null,
          isMandatory: off.is_mandatory,
          maxStudents: off.max_students,
        },
      ];
    },
  );

  return {
    sessions,
    selectedSession,
    terms,
    departments,
    gradeLevels,
    sections,
    streams,
    offerings,
    teachingGroupsCount: tgCountRes.count ?? 0,
  };
}

export async function getSectionDetail(
  context: VerifiedTenantContext,
  sectionId: string,
): Promise<SectionDetailDto | null> {
  const supabase = await createSupabaseServerClient();

  const { data: secRow, error } = await supabase
    .from("sections")
    .select(
      "id, session_id, grade_level_id, code, name, room_label, capacity, grade:grade_levels(code, name), session:academic_sessions(id, code, name, starts_on, ends_on, status)",
    )
    .eq("institution_id", context.institutionId)
    .eq("id", sectionId)
    .maybeSingle<{
      id: string;
      session_id: string;
      grade_level_id: string;
      code: string;
      name: string;
      room_label: string | null;
      capacity: number | null;
      grade: { code: string; name: string } | { code: string; name: string }[] | null;
      session:
        | {
            id: string;
            code: string;
            name: string;
            starts_on: string;
            ends_on: string;
            status: AcademicSessionStatus;
          }
        | {
            id: string;
            code: string;
            name: string;
            starts_on: string;
            ends_on: string;
            status: AcademicSessionStatus;
          }[]
        | null;
    }>();

  if (error || !secRow) {
    return null;
  }

  const gradeJoin = unwrapJoin(secRow.grade);
  const sessionJoin = unwrapJoin(secRow.session);

  const [
    enrolmentsRes,
    assignmentsRes,
    offeringsRes,
    streamsRes,
    allStudentsRes,
  ] = await Promise.all([
    supabase
      .from("student_session_enrolments")
      .select(
        "id, student_profile_id, roll_number, status, stream:streams(name), student:student_profiles(id, admission_number, person:persons(id, full_name))",
      )
      .eq("institution_id", context.institutionId)
      .eq("section_id", secRow.id)
      .eq("status", "active")
      .order("roll_number", { ascending: true })
      .returns<
        {
          id: string;
          student_profile_id: string;
          roll_number: string | null;
          status: string;
          stream: { name: string } | { name: string }[] | null;
          student:
            | {
                id: string;
                admission_number: string;
                person:
                  | { id: string; full_name: string }
                  | { id: string; full_name: string }[]
                  | null;
              }
            | {
                id: string;
                admission_number: string;
                person:
                  | { id: string; full_name: string }
                  | { id: string; full_name: string }[]
                  | null;
              }[]
            | null;
        }[]
      >(),
    supabase
      .from("academic_assignments")
      .select(
        "id, session_id, person_id, assignment_type, department_id, section_id, teaching_group_id, starts_on, ends_on, status",
      )
      .eq("institution_id", context.institutionId)
      .eq("section_id", secRow.id)
      .in("status", ["active", "delegated"])
      .returns<
        {
          id: string;
          session_id: string;
          person_id: string;
          assignment_type: AcademicAssignmentType;
          department_id: string | null;
          section_id: string | null;
          teaching_group_id: string | null;
          starts_on: string;
          ends_on: string | null;
          status: AcademicAssignmentStatus;
        }[]
      >(),
    supabase
      .from("subject_offerings")
      .select(
        "id, session_id, grade_level_id, subject_id, stream_id, is_mandatory, max_students, subject:subjects(id, code, name, board_subject_code, category), stream:streams(id, name)",
      )
      .eq("institution_id", context.institutionId)
      .eq("session_id", secRow.session_id)
      .eq("grade_level_id", secRow.grade_level_id)
      .returns<
        {
          id: string;
          session_id: string;
          grade_level_id: string;
          subject_id: string;
          stream_id: string | null;
          is_mandatory: boolean;
          max_students: number | null;
          subject:
            | {
                id: string;
                code: string;
                name: string;
                board_subject_code: string | null;
                category: SubjectCategory;
              }
            | {
                id: string;
                code: string;
                name: string;
                board_subject_code: string | null;
                category: SubjectCategory;
              }[]
            | null;
          stream: { id: string; name: string } | { id: string; name: string }[] | null;
        }[]
      >(),
    supabase
      .from("streams")
      .select("id, code, name, description")
      .eq("institution_id", context.institutionId)
      .order("name", { ascending: true })
      .returns<
        { id: string; code: string; name: string; description: string | null }[]
      >(),
    supabase
      .from("student_profiles")
      .select("id, admission_number, person:persons(id, full_name)")
      .eq("institution_id", context.institutionId)
      .eq("lifecycle_status", "active")
      .order("admission_number", { ascending: true })
      .limit(50)
      .returns<
        {
          id: string;
          admission_number: string;
          person:
            | { id: string; full_name: string }
            | { id: string; full_name: string }[]
            | null;
        }[]
      >(),
  ]);

  const enrolmentIds = (enrolmentsRes.data ?? []).map((e) => e.id);
  const subjectEnrolmentsByEnrolmentId = new Map<
    string,
    {
      id: string;
      subjectCode: string;
      subjectName: string;
      enrolmentKind: SubjectEnrolmentKind;
    }[]
  >();

  if (enrolmentIds.length > 0) {
    const { data: subjEnrols } = await supabase
      .from("student_subject_enrolments")
      .select(
        "id, student_enrolment_id, enrolment_kind, status, offering:subject_offerings(subject:subjects(code, name))",
      )
      .eq("institution_id", context.institutionId)
      .in("student_enrolment_id", enrolmentIds)
      .eq("status", "active")
      .returns<
        {
          id: string;
          student_enrolment_id: string;
          enrolment_kind: SubjectEnrolmentKind;
          status: string;
          offering:
            | {
                subject:
                  | { code: string; name: string }
                  | { code: string; name: string }[]
                  | null;
              }
            | {
                subject:
                  | { code: string; name: string }
                  | { code: string; name: string }[]
                  | null;
              }[]
            | null;
        }[]
      >();

    for (const row of subjEnrols ?? []) {
      const off = unwrapJoin(row.offering);
      const subj = unwrapJoin(off?.subject);
      if (!subj) continue;
      const list =
        subjectEnrolmentsByEnrolmentId.get(row.student_enrolment_id) ?? [];
      list.push({
        id: row.id,
        subjectCode: subj.code,
        subjectName: subj.name,
        enrolmentKind: row.enrolment_kind,
      });
      subjectEnrolmentsByEnrolmentId.set(row.student_enrolment_id, list);
    }
  }

  const roster: SectionStudentRosterDto[] = (enrolmentsRes.data ?? []).map(
    (enr) => {
      const st = unwrapJoin(enr.student);
      const person = unwrapJoin(st?.person);
      const stream = unwrapJoin(enr.stream);
      return {
        enrolmentId: enr.id,
        studentProfileId: enr.student_profile_id,
        admissionNumber: st?.admission_number ?? "ADM",
        fullName:
          person?.full_name ??
          `Student (${st?.admission_number ?? enr.student_profile_id.slice(0, 6)})`,
        rollNumber: enr.roll_number,
        streamName: stream?.name ?? null,
        electives: subjectEnrolmentsByEnrolmentId.get(enr.id) ?? [],
      };
    },
  );

  if (assignmentsRes.error) {
    throw new Error(
      `Failed to load section academic assignments: ${assignmentsRes.error.message}`,
    );
  }

  const assignmentPersonNames = await fetchPersonNameMap(
    supabase,
    (assignmentsRes.data ?? []).map((a) => a.person_id),
  );

  const assignmentSummaries: AssignmentSummaryDto[] = (
    assignmentsRes.data ?? []
  ).map((a) => ({
    id: a.id,
    sessionId: a.session_id,
    personId: a.person_id,
    personName:
      assignmentPersonNames.get(a.person_id) ?? "Assigned Member",
    assignmentType: a.assignment_type,
    departmentId: a.department_id,
    sectionId: a.section_id,
    teachingGroupId: a.teaching_group_id,
    targetLabel: secRow.name,
    startsOn: a.starts_on,
    endsOn: a.ends_on,
    status: a.status,
  }));

  const { classTeacher, monitors, isCurrentUserMonitorReadOnly } =
    resolveSectionRoleAssignments(assignmentSummaries, context.personId);

  const gradeOfferings: SubjectOfferingDto[] = (offeringsRes.data ?? []).flatMap(
    (off) => {
      const subject = unwrapJoin(off.subject);
      if (!subject) return [];
      const stream = unwrapJoin(off.stream);
      return [
        {
          id: off.id,
          sessionId: off.session_id,
          gradeLevelId: off.grade_level_id,
          gradeCode: gradeJoin?.code ?? "",
          subjectId: subject.id,
          subjectCode: subject.code,
          subjectName: subject.name,
          boardSubjectCode: subject.board_subject_code,
          category: subject.category,
          streamId: off.stream_id,
          streamName: stream?.name ?? null,
          isMandatory: off.is_mandatory,
          maxStudents: off.max_students,
        },
      ];
    },
  );

  return {
    section: {
      id: secRow.id,
      sessionId: secRow.session_id,
      gradeLevelId: secRow.grade_level_id,
      gradeCode: gradeJoin?.code ?? "",
      code: secRow.code,
      name: secRow.name,
      roomLabel: secRow.room_label,
      capacity: secRow.capacity,
    },
    session: sessionJoin
      ? {
          id: sessionJoin.id,
          code: sessionJoin.code,
          name: sessionJoin.name,
          startsOn: sessionJoin.starts_on,
          endsOn: sessionJoin.ends_on,
          status: sessionJoin.status,
        }
      : null,
    classTeacher,
    monitors,
    isCurrentUserMonitorReadOnly,
    roster,
    availableStudents: (allStudentsRes.data ?? []).map((s) => {
      const person = unwrapJoin(s.person);
      return {
        id: s.id,
        admissionNumber: s.admission_number,
        fullName: person?.full_name ?? `Student (${s.admission_number})`,
      };
    }),
    gradeOfferings,
    streams: (streamsRes.data ?? []).map((st) => ({
      id: st.id,
      code: st.code,
      name: st.name,
      description: st.description,
    })),
  };
}

export async function listTeachingGroups(
  context: VerifiedTenantContext,
  requestedSessionId?: string,
): Promise<{
  sessions: readonly AcademicSessionDto[];
  selectedSession: AcademicSessionDto | null;
  groups: readonly TeachingGroupDto[];
  offerings: readonly SubjectOfferingDto[];
  activeEnrolments: readonly {
    id: string;
    label: string;
    sectionCode: string;
  }[];
}> {
  const overview = await getAcademicsOverview(context, requestedSessionId);
  if (!overview.selectedSession) {
    return {
      sessions: overview.sessions,
      selectedSession: null,
      groups: [],
      offerings: [],
      activeEnrolments: [],
    };
  }

  const supabase = await createSupabaseServerClient();
  const [groupsRes, membersRes, assignmentsRes, enrolmentsRes] =
    await Promise.all([
      supabase
        .from("teaching_groups")
        .select(
          "id, session_id, subject_offering_id, code, name, is_cross_section, venue_label, offering:subject_offerings(subject:subjects(code, name))",
        )
        .eq("institution_id", context.institutionId)
        .eq("session_id", overview.selectedSession.id)
        .order("code", { ascending: true })
        .returns<
          {
            id: string;
            session_id: string;
            subject_offering_id: string;
            code: string;
            name: string;
            is_cross_section: boolean;
            venue_label: string | null;
            offering:
              | {
                  subject:
                    | { code: string; name: string }
                    | { code: string; name: string }[]
                    | null;
                }
              | {
                  subject:
                    | { code: string; name: string }
                    | { code: string; name: string }[]
                    | null;
                }[]
              | null;
          }[]
        >(),
      supabase
        .from("teaching_group_memberships")
        .select(
          "id, teaching_group_id, student_enrolment_id, status, enrolment:student_session_enrolments(id, student_profile_id, roll_number, section:sections(code), student:student_profiles(admission_number, person:persons(full_name)))",
        )
        .eq("institution_id", context.institutionId)
        .eq("status", "active")
        .returns<
          {
            id: string;
            teaching_group_id: string;
            student_enrolment_id: string;
            status: string;
            enrolment:
              | {
                  id: string;
                  student_profile_id: string;
                  roll_number: string | null;
                  section: { code: string } | { code: string }[] | null;
                  student:
                    | {
                        admission_number: string;
                        person:
                          | { full_name: string }
                          | { full_name: string }[]
                          | null;
                      }
                    | {
                        admission_number: string;
                        person:
                          | { full_name: string }
                          | { full_name: string }[]
                          | null;
                      }[]
                    | null;
                }
              | {
                  id: string;
                  student_profile_id: string;
                  roll_number: string | null;
                  section: { code: string } | { code: string }[] | null;
                  student:
                    | {
                        admission_number: string;
                        person:
                          | { full_name: string }
                          | { full_name: string }[]
                          | null;
                      }
                    | {
                        admission_number: string;
                        person:
                          | { full_name: string }
                          | { full_name: string }[]
                          | null;
                      }[]
                    | null;
                }[]
              | null;
          }[]
        >(),
      supabase
        .from("academic_assignments")
        .select("teaching_group_id, person_id")
        .eq("institution_id", context.institutionId)
        .eq("session_id", overview.selectedSession.id)
        .eq("assignment_type", "subject_teacher")
        .in("status", ["active", "delegated"])
        .returns<
          {
            teaching_group_id: string | null;
            person_id: string;
          }[]
        >(),
      supabase
        .from("student_session_enrolments")
        .select(
          "id, roll_number, section:sections(code), student:student_profiles(admission_number, person:persons(full_name))",
        )
        .eq("institution_id", context.institutionId)
        .eq("session_id", overview.selectedSession.id)
        .eq("status", "active")
        .limit(50)
        .returns<
          {
            id: string;
            roll_number: string | null;
            section: { code: string } | { code: string }[] | null;
            student:
              | {
                  admission_number: string;
                  person:
                    | { full_name: string }
                    | { full_name: string }[]
                    | null;
                }
              | {
                  admission_number: string;
                  person:
                    | { full_name: string }
                    | { full_name: string }[]
                    | null;
                }[]
              | null;
          }[]
        >(),
    ]);

  const membersByGroup = new Map<string, TeachingGroupMemberDto[]>();
  for (const m of membersRes.data ?? []) {
    const enr = unwrapJoin(m.enrolment);
    if (!enr) continue;
    const sec = unwrapJoin(enr.section);
    const st = unwrapJoin(enr.student);
    const person = unwrapJoin(st?.person);
    const list = membersByGroup.get(m.teaching_group_id) ?? [];
    list.push({
      membershipId: m.id,
      enrolmentId: m.student_enrolment_id,
      studentProfileId: enr.student_profile_id,
      admissionNumber: st?.admission_number ?? "ADM",
      fullName:
        person?.full_name ??
        `Student (${st?.admission_number ?? enr.student_profile_id.slice(0, 6)})`,
      sectionCode: sec?.code ?? "Unassigned",
      rollNumber: enr.roll_number,
    });
    membersByGroup.set(m.teaching_group_id, list);
  }

  if (assignmentsRes.error) {
    throw new Error(
      `Failed to load teaching group subject teachers: ${assignmentsRes.error.message}`,
    );
  }

  const teacherNameMap = await fetchPersonNameMap(
    supabase,
    (assignmentsRes.data ?? []).map((a) => a.person_id),
  );

  const teachersByGroup = new Map<string, string[]>();
  for (const a of assignmentsRes.data ?? []) {
    if (!a.teaching_group_id) continue;
    const list = teachersByGroup.get(a.teaching_group_id) ?? [];
    list.push(teacherNameMap.get(a.person_id) ?? "Subject Teacher");
    teachersByGroup.set(a.teaching_group_id, list);
  }

  const groups: TeachingGroupDto[] = (groupsRes.data ?? []).map((g) => {
    const off = unwrapJoin(g.offering);
    const subj = unwrapJoin(off?.subject);
    const members = membersByGroup.get(g.id) ?? [];
    const counts = new Map<string, number>();
    for (const m of members) {
      counts.set(m.sectionCode, (counts.get(m.sectionCode) ?? 0) + 1);
    }
    const sectionBreakdown = [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([sectionCode, count]) => ({ sectionCode, count }));

    return {
      id: g.id,
      sessionId: g.session_id,
      subjectOfferingId: g.subject_offering_id,
      subjectCode: subj?.code ?? "",
      subjectName: subj?.name ?? "",
      code: g.code,
      name: g.name,
      isCrossSection: g.is_cross_section,
      venueLabel: g.venue_label,
      subjectTeachers: teachersByGroup.get(g.id) ?? [],
      sectionBreakdown,
      members,
    };
  });

  const activeEnrolments = (enrolmentsRes.data ?? []).map((enr) => {
    const sec = unwrapJoin(enr.section);
    const st = unwrapJoin(enr.student);
    const person = unwrapJoin(st?.person);
    const sectionCode = sec?.code ?? "";
    const adm = st?.admission_number ?? "";
    const name = person?.full_name ?? `Student (${adm})`;
    return {
      id: enr.id,
      label: `${name} • ${sectionCode} (${adm})`,
      sectionCode,
    };
  });

  return {
    sessions: overview.sessions,
    selectedSession: overview.selectedSession,
    groups,
    offerings: overview.offerings,
    activeEnrolments,
  };
}

export async function listAcademicAssignments(
  context: VerifiedTenantContext,
  requestedSessionId?: string,
): Promise<AcademicsAssignmentPageDto> {
  const overview = await getAcademicsOverview(context, requestedSessionId);
  if (!overview.selectedSession) {
    return {
      sessions: overview.sessions,
      selectedSession: null,
      assignments: [],
      departments: overview.departments,
      sections: overview.sections,
      teachingGroups: [],
      candidatePersons: [],
    };
  }

  const supabase = await createSupabaseServerClient();
  const [assignmentsRes, groupsRes, membershipsRes] = await Promise.all([
    supabase
      .from("academic_assignments")
      .select(
        "id, session_id, person_id, assignment_type, department_id, section_id, teaching_group_id, starts_on, ends_on, status",
      )
      .eq("institution_id", context.institutionId)
      .eq("session_id", overview.selectedSession.id)
      .order("starts_on", { ascending: false })
      .returns<
        {
          id: string;
          session_id: string;
          person_id: string;
          assignment_type: AcademicAssignmentType;
          department_id: string | null;
          section_id: string | null;
          teaching_group_id: string | null;
          starts_on: string;
          ends_on: string | null;
          status: AcademicAssignmentStatus;
        }[]
      >(),
    supabase
      .from("teaching_groups")
      .select("id, code, name")
      .eq("institution_id", context.institutionId)
      .eq("session_id", overview.selectedSession.id)
      .order("code", { ascending: true })
      .returns<{ id: string; code: string; name: string }[]>(),
    supabase
      .from("institution_memberships")
      .select("person_id, person:persons(id, full_name)")
      .eq("institution_id", context.institutionId)
      .eq("status", "active")
      .limit(50)
      .returns<
        {
          person_id: string;
          person:
            | { id: string; full_name: string }
            | { id: string; full_name: string }[]
            | null;
        }[]
      >(),
  ]);

  const deptById = new Map(overview.departments.map((d) => [d.id, d.name]));
  const secById = new Map(overview.sections.map((s) => [s.id, s.name]));
  const groupById = new Map(
    (groupsRes.data ?? []).map((g) => [g.id, `${g.code} (${g.name})`]),
  );

  if (assignmentsRes.error) {
    throw new Error(
      `Failed to load academic assignments ledger: ${assignmentsRes.error.message}`,
    );
  }

  const assignmentPersonNames = await fetchPersonNameMap(
    supabase,
    (assignmentsRes.data ?? []).map((a) => a.person_id),
  );

  const assignments: AssignmentSummaryDto[] = (assignmentsRes.data ?? []).map(
    (a) => {
      const targetLabel = a.department_id
        ? (deptById.get(a.department_id) ?? "Department")
        : a.section_id
          ? (secById.get(a.section_id) ?? "Section")
          : a.teaching_group_id
            ? (groupById.get(a.teaching_group_id) ?? "Teaching Group")
            : "Unscoped";

      return {
        id: a.id,
        sessionId: a.session_id,
        personId: a.person_id,
        personName:
          assignmentPersonNames.get(a.person_id) ?? "Assigned Member",
        assignmentType: a.assignment_type,
        departmentId: a.department_id,
        sectionId: a.section_id,
        teachingGroupId: a.teaching_group_id,
        targetLabel,
        startsOn: a.starts_on,
        endsOn: a.ends_on,
        status: a.status,
      };
    },
  );

  const candidatePersons = (membershipsRes.data ?? []).map((m) => {
    const person = unwrapJoin(m.person);
    return {
      id: m.person_id,
      label: person?.full_name ?? m.person_id.slice(0, 8),
    };
  });

  return {
    sessions: overview.sessions,
    selectedSession: overview.selectedSession,
    assignments,
    departments: overview.departments,
    sections: overview.sections,
    teachingGroups: groupsRes.data ?? [],
    candidatePersons,
  };
}

export async function createSession(
  slug: string,
  rawInput: unknown,
): Promise<MutationResult<{ sessionId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "academics.manage",
  });
  if (!guard.ok) {
    return { ok: false, error: "Permission denied to create academic sessions." };
  }

  const parsed = createSessionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid academic session.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: session, error } = await supabase
    .from("academic_sessions")
    .insert({
      institution_id: guard.context.institutionId,
      code: parsed.data.code,
      name: parsed.data.name,
      starts_on: parsed.data.startsOn,
      ends_on: parsed.data.endsOn,
      status: "planned",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !session) {
    return { ok: false, error: error?.message ?? "Unable to create session." };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "academic_session.created",
    entityType: "academic_sessions",
    entityId: session.id,
    afterState: { code: parsed.data.code, status: "planned" },
  });

  return { ok: true, data: { sessionId: session.id } };
}

export async function activateSession(
  slug: string,
  sessionId: string,
): Promise<MutationResult<{ sessionId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "academics.manage",
  });
  if (!guard.ok) {
    return { ok: false, error: "Permission denied to activate sessions." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: target, error: fetchError } = await supabase
    .from("academic_sessions")
    .select("id, status, code")
    .eq("institution_id", guard.context.institutionId)
    .eq("id", sessionId)
    .maybeSingle<{ id: string; status: AcademicSessionStatus; code: string }>();

  if (fetchError || !target) {
    return { ok: false, error: "Academic session not found." };
  }

  // Archive any currently active session first to satisfy uq_academic_sessions_one_active.
  const { error: archiveError } = await supabase
    .from("academic_sessions")
    .update({ status: "archived" })
    .eq("institution_id", guard.context.institutionId)
    .eq("status", "active")
    .neq("id", target.id);

  if (archiveError) {
    return { ok: false, error: archiveError.message };
  }

  const { error: activateError } = await supabase
    .from("academic_sessions")
    .update({ status: "active" })
    .eq("institution_id", guard.context.institutionId)
    .eq("id", target.id);

  if (activateError) {
    return { ok: false, error: activateError.message };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "academic_session.activated",
    entityType: "academic_sessions",
    entityId: target.id,
    beforeState: { status: target.status },
    afterState: { status: "active", code: target.code },
  });

  return { ok: true, data: { sessionId: target.id } };
}

export async function createDepartment(
  slug: string,
  rawInput: unknown,
): Promise<MutationResult<{ departmentId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "academics.manage",
  });
  if (!guard.ok) {
    return { ok: false, error: "Permission denied to create departments." };
  }

  const parsed = createDepartmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid department input.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: dept, error } = await supabase
    .from("academic_departments")
    .insert({
      institution_id: guard.context.institutionId,
      code: parsed.data.code,
      name: parsed.data.name,
      department_kind: parsed.data.departmentKind,
      description: parsed.data.description ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !dept) {
    return { ok: false, error: error?.message ?? "Unable to create department." };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "academic_department.created",
    entityType: "academic_departments",
    entityId: dept.id,
    afterState: { code: parsed.data.code, kind: parsed.data.departmentKind },
  });

  return { ok: true, data: { departmentId: dept.id } };
}

export async function createGradeAndSection(
  slug: string,
  rawInput: unknown,
): Promise<MutationResult<{ gradeLevelId: string; sectionId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "academics.manage",
  });
  if (!guard.ok) {
    return { ok: false, error: "Permission denied to create grades/sections." };
  }

  const parsed = createGradeAndSectionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid grade/section input.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: gradeRow, error: gradeError } = await supabase
    .from("grade_levels")
    .upsert(
      {
        institution_id: guard.context.institutionId,
        department_id: parsed.data.departmentId,
        code: parsed.data.gradeCode,
        name: parsed.data.gradeName,
        display_order: parsed.data.displayOrder,
      },
      { onConflict: "institution_id,code" },
    )
    .select("id")
    .single<{ id: string }>();

  if (gradeError || !gradeRow) {
    return {
      ok: false,
      error: gradeError?.message ?? "Unable to save grade level.",
    };
  }

  const { data: sectionRow, error: sectionError } = await supabase
    .from("sections")
    .insert({
      institution_id: guard.context.institutionId,
      session_id: parsed.data.sessionId,
      grade_level_id: gradeRow.id,
      code: parsed.data.sectionCode,
      name: parsed.data.sectionName,
      room_label: parsed.data.roomLabel ?? null,
      capacity: parsed.data.capacity ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (sectionError || !sectionRow) {
    return {
      ok: false,
      error: sectionError?.message ?? "Unable to create section.",
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "section.created",
    entityType: "sections",
    entityId: sectionRow.id,
    afterState: {
      grade_code: parsed.data.gradeCode,
      section_code: parsed.data.sectionCode,
    },
  });

  return {
    ok: true,
    data: { gradeLevelId: gradeRow.id, sectionId: sectionRow.id },
  };
}

export async function createSubjectAndOffering(
  slug: string,
  rawInput: unknown,
): Promise<MutationResult<{ subjectId: string; offeringId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "academics.manage",
  });
  if (!guard.ok) {
    return { ok: false, error: "Permission denied to create subject offerings." };
  }

  const parsed = createSubjectAndOfferingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Invalid subject offering input.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: subjectRow, error: subjectError } = await supabase
    .from("subjects")
    .upsert(
      {
        institution_id: guard.context.institutionId,
        code: parsed.data.subjectCode,
        name: parsed.data.subjectName,
        board_subject_code: parsed.data.boardSubjectCode ?? null,
        category: parsed.data.category,
      },
      { onConflict: "institution_id,code" },
    )
    .select("id")
    .single<{ id: string }>();

  if (subjectError || !subjectRow) {
    return {
      ok: false,
      error: subjectError?.message ?? "Unable to save subject.",
    };
  }

  const { data: offeringRow, error: offeringError } = await supabase
    .from("subject_offerings")
    .insert({
      institution_id: guard.context.institutionId,
      session_id: parsed.data.sessionId,
      grade_level_id: parsed.data.gradeLevelId,
      subject_id: subjectRow.id,
      stream_id: parsed.data.streamId ?? null,
      is_mandatory: parsed.data.isMandatory,
      max_students: parsed.data.maxStudents ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (offeringError || !offeringRow) {
    return {
      ok: false,
      error: offeringError?.message ?? "Unable to create subject offering.",
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "subject_offering.created",
    entityType: "subject_offerings",
    entityId: offeringRow.id,
    afterState: {
      subject_code: parsed.data.subjectCode,
      category: parsed.data.category,
    },
  });

  return {
    ok: true,
    data: { subjectId: subjectRow.id, offeringId: offeringRow.id },
  };
}

export async function enrolStudentInSession(
  slug: string,
  rawInput: unknown,
): Promise<MutationResult<{ enrolmentId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "academics.manage",
  });
  if (!guard.ok) {
    return { ok: false, error: "Permission denied to enrol students." };
  }

  const parsed = enrolStudentSessionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid session enrolment.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: enrolment, error } = await supabase
    .from("student_session_enrolments")
    .insert({
      institution_id: guard.context.institutionId,
      session_id: parsed.data.sessionId,
      student_profile_id: parsed.data.studentProfileId,
      grade_level_id: parsed.data.gradeLevelId,
      section_id: parsed.data.sectionId,
      stream_id: parsed.data.streamId ?? null,
      roll_number: parsed.data.rollNumber ?? null,
      status: "active",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !enrolment) {
    return {
      ok: false,
      error: error?.message ?? "Unable to create student session enrolment.",
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "student_session_enrolment.created",
    entityType: "student_session_enrolments",
    entityId: enrolment.id,
    afterState: {
      section_id: parsed.data.sectionId,
      roll_number: parsed.data.rollNumber ?? null,
    },
  });

  return { ok: true, data: { enrolmentId: enrolment.id } };
}

export async function enrolStudentInSubject(
  slug: string,
  rawInput: unknown,
): Promise<MutationResult<{ subjectEnrolmentId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "academics.manage",
  });
  if (!guard.ok) {
    return { ok: false, error: "Permission denied to assign student subjects." };
  }

  const parsed = enrolStudentSubjectSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid subject enrolment.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: subjectEnrolment, error } = await supabase
    .from("student_subject_enrolments")
    .insert({
      institution_id: guard.context.institutionId,
      session_id: parsed.data.sessionId,
      student_enrolment_id: parsed.data.studentEnrolmentId,
      subject_offering_id: parsed.data.subjectOfferingId,
      enrolment_kind: parsed.data.enrolmentKind,
      status: "active",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !subjectEnrolment) {
    return {
      ok: false,
      error: error?.message ?? "Unable to enrol student in subject.",
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "student_subject_enrolment.created",
    entityType: "student_subject_enrolments",
    entityId: subjectEnrolment.id,
    afterState: {
      student_enrolment_id: parsed.data.studentEnrolmentId,
      subject_offering_id: parsed.data.subjectOfferingId,
      enrolment_kind: parsed.data.enrolmentKind,
    },
  });

  return { ok: true, data: { subjectEnrolmentId: subjectEnrolment.id } };
}

export async function createTeachingGroup(
  slug: string,
  rawInput: unknown,
): Promise<MutationResult<{ teachingGroupId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "academics.manage",
  });
  if (!guard.ok) {
    return { ok: false, error: "Permission denied to create teaching groups." };
  }

  const parsed = createTeachingGroupSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid teaching group.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: groupRow, error } = await supabase
    .from("teaching_groups")
    .insert({
      institution_id: guard.context.institutionId,
      session_id: parsed.data.sessionId,
      subject_offering_id: parsed.data.subjectOfferingId,
      code: parsed.data.code,
      name: parsed.data.name,
      is_cross_section: parsed.data.isCrossSection,
      venue_label: parsed.data.venueLabel ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !groupRow) {
    return {
      ok: false,
      error: error?.message ?? "Unable to create teaching group.",
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "teaching_group.created",
    entityType: "teaching_groups",
    entityId: groupRow.id,
    afterState: {
      code: parsed.data.code,
      is_cross_section: parsed.data.isCrossSection,
    },
  });

  return { ok: true, data: { teachingGroupId: groupRow.id } };
}

export async function addStudentToTeachingGroup(
  slug: string,
  rawInput: unknown,
): Promise<MutationResult<{ membershipId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "academics.manage",
  });
  if (!guard.ok) {
    return {
      ok: false,
      error: "Permission denied to assign students to teaching groups.",
    };
  }

  const parsed = addTeachingGroupMemberSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Invalid teaching group membership input.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const [groupRes, enrolmentRes, subjEnrolsRes] = await Promise.all([
    supabase
      .from("teaching_groups")
      .select("id, session_id, subject_offering_id, is_cross_section")
      .eq("institution_id", guard.context.institutionId)
      .eq("id", parsed.data.teachingGroupId)
      .maybeSingle<{
        id: string;
        session_id: string;
        subject_offering_id: string;
        is_cross_section: boolean;
      }>(),
    supabase
      .from("student_session_enrolments")
      .select("id, session_id, section_id, status")
      .eq("institution_id", guard.context.institutionId)
      .eq("id", parsed.data.studentEnrolmentId)
      .maybeSingle<{
        id: string;
        session_id: string;
        section_id: string;
        status: string;
      }>(),
    supabase
      .from("student_subject_enrolments")
      .select("student_enrolment_id, subject_offering_id, status")
      .eq("institution_id", guard.context.institutionId)
      .eq("student_enrolment_id", parsed.data.studentEnrolmentId)
      .eq("status", "active")
      .returns<
        {
          student_enrolment_id: string;
          subject_offering_id: string;
          status: string;
        }[]
      >(),
  ]);

  if (!groupRes.data || !enrolmentRes.data) {
    return {
      ok: false,
      error: "Teaching group or student enrolment not found in this school.",
    };
  }

  const conflict = validateCrossSectionGroupMembership(
    {
      id: enrolmentRes.data.id,
      sessionId: enrolmentRes.data.session_id,
      sectionId: enrolmentRes.data.section_id,
      status: enrolmentRes.data.status,
    },
    {
      id: groupRes.data.id,
      sessionId: groupRes.data.session_id,
      subjectOfferingId: groupRes.data.subject_offering_id,
      isCrossSection: groupRes.data.is_cross_section,
    },
    (subjEnrolsRes.data ?? []).map((item) => ({
      studentEnrolmentId: item.student_enrolment_id,
      subjectOfferingId: item.subject_offering_id,
      status: item.status,
    })),
  );

  if (!conflict.ok) {
    return { ok: false, error: conflict.error };
  }

  const { data: membershipRow, error } = await supabase
    .from("teaching_group_memberships")
    .insert({
      institution_id: guard.context.institutionId,
      teaching_group_id: groupRes.data.id,
      student_enrolment_id: enrolmentRes.data.id,
      status: "active",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !membershipRow) {
    return {
      ok: false,
      error: error?.message ?? "Unable to allocate student to teaching group.",
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "teaching_group_membership.created",
    entityType: "teaching_group_memberships",
    entityId: membershipRow.id,
    afterState: {
      teaching_group_id: groupRes.data.id,
      student_enrolment_id: enrolmentRes.data.id,
    },
  });

  return { ok: true, data: { membershipId: membershipRow.id } };
}

export async function assignAcademicResponsibility(
  slug: string,
  rawInput: unknown,
): Promise<MutationResult<{ assignmentId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "academics.manage",
  });
  if (!guard.ok) {
    return {
      ok: false,
      error: "Permission denied to assign academic responsibilities.",
    };
  }

  const parsed = assignAcademicResponsibilitySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Invalid academic assignment.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const existingRes = await supabase
    .from("academic_assignments")
    .select(
      "id, session_id, person_id, assignment_type, department_id, section_id, teaching_group_id, starts_on, ends_on, status",
    )
    .eq("institution_id", guard.context.institutionId)
    .eq("session_id", parsed.data.sessionId)
    .in("status", ["active", "delegated"])
    .returns<
      {
        id: string;
        session_id: string;
        person_id: string;
        assignment_type: AcademicAssignmentType;
        department_id: string | null;
        section_id: string | null;
        teaching_group_id: string | null;
        starts_on: string;
        ends_on: string | null;
        status: AcademicAssignmentStatus;
      }[]
    >();

  let sectionStudentPersonIds: string[] | undefined;
  if (
    (parsed.data.assignmentType === "monitor" ||
      parsed.data.assignmentType === "monitress") &&
    parsed.data.sectionId
  ) {
    const { data: secEnrols } = await supabase
      .from("student_session_enrolments")
      .select("student:student_profiles(person_id)")
      .eq("institution_id", guard.context.institutionId)
      .eq("session_id", parsed.data.sessionId)
      .eq("section_id", parsed.data.sectionId)
      .eq("status", "active")
      .returns<
        {
          student: { person_id: string } | { person_id: string }[] | null;
        }[]
      >();

    sectionStudentPersonIds = (secEnrols ?? [])
      .map((row) => unwrapJoin(row.student)?.person_id)
      .filter((id): id is string => typeof id === "string");
  }

  const existingMapped: ExistingAcademicAssignmentLike[] = (
    existingRes.data ?? []
  ).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    personId: row.person_id,
    assignmentType: row.assignment_type,
    departmentId: row.department_id,
    sectionId: row.section_id,
    teachingGroupId: row.teaching_group_id,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status,
  }));

  const conflict = detectAcademicAssignmentConflicts(
    existingMapped,
    {
      sessionId: parsed.data.sessionId,
      personId: parsed.data.personId,
      assignmentType: parsed.data.assignmentType,
      departmentId: parsed.data.departmentId ?? null,
      sectionId: parsed.data.sectionId ?? null,
      teachingGroupId: parsed.data.teachingGroupId ?? null,
      startsOn: parsed.data.startsOn,
      endsOn: parsed.data.endsOn ?? null,
      status: "active",
    },
    sectionStudentPersonIds,
  );

  if (!conflict.ok) {
    return { ok: false, error: conflict.error };
  }

  const { data: created, error } = await supabase
    .from("academic_assignments")
    .insert({
      institution_id: guard.context.institutionId,
      session_id: parsed.data.sessionId,
      person_id: parsed.data.personId,
      assignment_type: parsed.data.assignmentType,
      department_id: parsed.data.departmentId ?? null,
      section_id: parsed.data.sectionId ?? null,
      teaching_group_id: parsed.data.teachingGroupId ?? null,
      starts_on: parsed.data.startsOn,
      ends_on: parsed.data.endsOn ?? null,
      status: "active",
      assigned_by_person_id: guard.context.personId,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !created) {
    return {
      ok: false,
      error: error?.message ?? "Unable to assign academic responsibility.",
    };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "academic_assignment.created",
    entityType: "academic_assignments",
    entityId: created.id,
    afterState: {
      assignment_type: parsed.data.assignmentType,
      person_id: parsed.data.personId,
      starts_on: parsed.data.startsOn,
    },
  });

  return { ok: true, data: { assignmentId: created.id } };
}

export async function revokeAcademicResponsibility(
  slug: string,
  assignmentId: string,
): Promise<MutationResult<{ assignmentId: string }>> {
  const guard = await requireInstitutionPermission(slug, {
    permission: "academics.manage",
  });
  if (!guard.ok) {
    return {
      ok: false,
      error: "Permission denied to revoke academic assignments.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: fetchError } = await supabase
    .from("academic_assignments")
    .select("id, status, assignment_type")
    .eq("institution_id", guard.context.institutionId)
    .eq("id", assignmentId)
    .maybeSingle<{
      id: string;
      status: AcademicAssignmentStatus;
      assignment_type: AcademicAssignmentType;
    }>();

  if (fetchError || !existing) {
    return { ok: false, error: "Academic assignment not found." };
  }

  const { error: updateError } = await supabase
    .from("academic_assignments")
    .update({ status: "revoked" })
    .eq("institution_id", guard.context.institutionId)
    .eq("id", existing.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await recordAuditEvent(supabase, {
    institutionId: guard.context.institutionId,
    actorPersonId: guard.context.personId,
    actorAuthUserId: guard.context.authUserId,
    action: "academic_assignment.revoked",
    entityType: "academic_assignments",
    entityId: existing.id,
    beforeState: { status: existing.status },
    afterState: { status: "revoked", assignment_type: existing.assignment_type },
  });

  return { ok: true, data: { assignmentId: existing.id } };
}
