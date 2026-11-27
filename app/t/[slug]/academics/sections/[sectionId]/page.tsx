import Link from "next/link";
import {
  enrolStudentInSessionAction,
  enrolStudentInSubjectAction,
} from "@/app/t/[slug]/academics/actions";
import { AcademicsSubNav } from "@/components/academics/AcademicsSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { SUBJECT_ENROLMENT_KINDS } from "@/lib/academics/schemas";
import { evaluatePermission } from "@/lib/auth/permissions";
import { getSectionDetail } from "@/server/academics/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface SectionDetailPageProps {
  params: Promise<{ slug: string; sectionId: string }>;
}

export default async function SectionDetailPage({
  params,
}: SectionDetailPageProps) {
  const { slug, sectionId } = await params;
  const resolution = await resolveVerifiedTenantContext(slug);

  if (resolution.status !== "ok") {
    return (
      <StateNotice
        kind="permission-denied"
        title="Workspace verification required"
        description="Server-side membership verification did not succeed."
      />
    );
  }

  const { context } = resolution;
  const canManageAcademics = evaluatePermission(context, {
    permission: "academics.manage",
  }).allowed;

  const detail = await getSectionDetail(context, sectionId);
  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/academics`;

  if (!detail) {
    return (
      <div className="space-y-[var(--density-gap)]">
        <AcademicsSubNav
          slug={context.institutionSlug}
          activeTab="overview"
        />
        <StateNotice
          kind="permission-denied"
          title="Section unavailable"
          description="This section could not be found in your verified institution workspace."
          action={
            <Link
              href={basePath}
              className="inline-flex min-h-9 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
            >
              Back to Academics
            </Link>
          }
        />
      </div>
    );
  }

  const boundEnrolSession = enrolStudentInSessionAction.bind(
    null,
    context.institutionSlug,
    detail.section.sessionId,
    detail.section.gradeLevelId,
    detail.section.id,
  );
  const boundEnrolSubject = enrolStudentInSubjectAction.bind(
    null,
    context.institutionSlug,
    detail.section.sessionId,
    detail.section.id,
  );

  return (
    <div className="space-y-[var(--density-gap)]">
      <AcademicsSubNav
        slug={context.institutionSlug}
        activeTab="overview"
        sessionId={detail.section.sessionId}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`${basePath}?session=${encodeURIComponent(detail.section.sessionId)}`}
          className="text-xs font-medium text-accent hover:underline"
        >
          ← Back to Structure Overview
        </Link>
        <Badge tone="accent">
          {detail.session?.code ?? ""} • {detail.section.name}
        </Badge>
      </div>

      {detail.isCurrentUserMonitorReadOnly && !canManageAcademics ? (
        <StateNotice
          kind="empty"
          title="Monitor / Monitress Read-Only Coordination View"
          description="Classroom monitors and monitresses hold read-only summary visibility for their assigned section and cannot alter student enrolments, electives, or official records."
        />
      ) : null}

      <Card
        title={`Section ${detail.section.name} (${detail.section.gradeCode})`}
        description={`${detail.section.roomLabel ?? "Room TBD"} • Capacity ${detail.section.capacity ?? "—"}`}
      >
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-medium text-fg-muted">Class Teacher</dt>
            <dd className="mt-0.5 font-semibold text-fg">
              {detail.classTeacher?.personName ?? "Unassigned"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-fg-muted">
              Monitor / Monitress
            </dt>
            <dd className="mt-0.5 font-semibold text-fg">
              {detail.monitors.length > 0
                ? detail.monitors
                    .map((m) => `${m.personName} (${m.assignmentType})`)
                    .join(", ")
                : "Unassigned"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card
        title="Enrolled Cohort & Individual Mixed Electives"
        description="Students in one administrative section may carry distinct streams and Senior Secondary subject electives."
      >
        {detail.roster.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No visible student enrolments in this section"
            description="Either no students are enrolled yet or your active RLS relationship scope does not include this section."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-elevated text-fg-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Roll
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Student
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Stream
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Subject Enrolments
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface">
                {detail.roster.map((student) => (
                  <tr key={student.enrolmentId}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono font-medium text-fg">
                      {student.rollNumber ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-medium text-fg">
                      {student.fullName}{" "}
                      <span className="font-mono text-fg-muted">
                        ({student.admissionNumber})
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-fg-muted">
                      {student.streamName ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {student.electives.length === 0 ? (
                          <span className="text-fg-muted">No subjects yet</span>
                        ) : (
                          student.electives.map((elec) => (
                            <Badge
                              key={elec.id}
                              tone={
                                elec.enrolmentKind === "elective"
                                  ? "accent"
                                  : "neutral"
                              }
                            >
                              {elec.subjectName}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {canManageAcademics ? (
        <div className="grid gap-[var(--density-gap)] lg:grid-cols-2">
          <Card title="Enrol Student in Section">
            <RegistryActionForm
              action={boundEnrolSession}
              submitLabel="Enrol Student in Section"
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="enrol-student"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Student *
                  </label>
                  <select
                    id="enrol-student"
                    name="studentProfileId"
                    required
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  >
                    {detail.availableStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName} ({st.admissionNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="enrol-stream"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Stream
                  </label>
                  <select
                    id="enrol-stream"
                    name="streamId"
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  >
                    <option value="">None</option>
                    {detail.streams.map((stream) => (
                      <option key={stream.id} value={stream.id}>
                        {stream.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="enrol-roll"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Roll Number
                  </label>
                  <input
                    id="enrol-roll"
                    name="rollNumber"
                    placeholder="03"
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  />
                </div>
              </div>
            </RegistryActionForm>
          </Card>

          <Card title="Assign Individual Subject Elective">
            <RegistryActionForm
              action={boundEnrolSubject}
              submitLabel="Enrol in Subject Offering"
              submitVariant="secondary"
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="sub-enrol-student"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Enrolled Student *
                  </label>
                  <select
                    id="sub-enrol-student"
                    name="studentEnrolmentId"
                    required
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  >
                    {detail.roster.map((st) => (
                      <option key={st.enrolmentId} value={st.enrolmentId}>
                        {st.fullName} ({st.admissionNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="sub-enrol-offering"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Subject Offering *
                  </label>
                  <select
                    id="sub-enrol-offering"
                    name="subjectOfferingId"
                    required
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  >
                    {detail.gradeOfferings.map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.subjectName} ({off.subjectCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="sub-enrol-kind"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Enrolment Kind
                  </label>
                  <select
                    id="sub-enrol-kind"
                    name="enrolmentKind"
                    defaultValue="elective"
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  >
                    {SUBJECT_ENROLMENT_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </RegistryActionForm>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
