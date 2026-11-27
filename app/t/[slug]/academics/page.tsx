import Link from "next/link";
import {
  activateSessionAction,
  createDepartmentAction,
  createGradeAndSectionAction,
  createSessionAction,
  createSubjectAndOfferingAction,
} from "@/app/t/[slug]/academics/actions";
import { AcademicsSubNav } from "@/components/academics/AcademicsSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import {
  DEPARTMENT_KINDS,
  SUBJECT_CATEGORIES,
} from "@/lib/academics/schemas";
import { evaluatePermission } from "@/lib/auth/permissions";
import { getAcademicsOverview } from "@/server/academics/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface AcademicsOverviewPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}

export default async function AcademicsOverviewPage({
  params,
  searchParams,
}: AcademicsOverviewPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const resolution = await resolveVerifiedTenantContext(slug);

  if (resolution.status !== "ok") {
    return (
      <StateNotice
        kind="permission-denied"
        title="Workspace verification required"
        description="Server-side membership verification did not succeed for this institution."
      />
    );
  }

  const { context } = resolution;
  const canManageAcademics = evaluatePermission(context, {
    permission: "academics.manage",
  }).allowed;

  const overview = await getAcademicsOverview(context, query.session);
  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/academics`;

  const boundCreateSession = createSessionAction.bind(
    null,
    context.institutionSlug,
  );
  const boundCreateDept = createDepartmentAction.bind(
    null,
    context.institutionSlug,
  );
  const boundCreateGradeSection = overview.selectedSession
    ? createGradeAndSectionAction.bind(
        null,
        context.institutionSlug,
        overview.selectedSession.id,
      )
    : null;
  const boundCreateOffering = overview.selectedSession
    ? createSubjectAndOfferingAction.bind(
        null,
        context.institutionSlug,
        overview.selectedSession.id,
      )
    : null;

  return (
    <div className="space-y-[var(--density-gap)]">
      <AcademicsSubNav
        slug={context.institutionSlug}
        activeTab="overview"
        sessionId={overview.selectedSession?.id}
      />

      <Card
        title="Academic Sessions & Terms"
        description="Three-layer session architecture: one active session at a time per institution; past sessions archive read-only."
      >
        <div className="space-y-4">
          {overview.sessions.length === 0 ? (
            <StateNotice
              kind="empty"
              title="No academic sessions configured"
              description="Create an academic session below to initialize classes, sections, and offerings."
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {overview.sessions.map((session) => {
                const isSelected = overview.selectedSession?.id === session.id;
                return (
                  <div
                    key={session.id}
                    className={[
                      "flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs",
                      isSelected
                        ? "border-accent bg-elevated"
                        : "border-border-subtle bg-surface",
                    ].join(" ")}
                  >
                    <Link
                      href={`${basePath}?session=${encodeURIComponent(session.id)}`}
                      className="font-semibold text-fg hover:underline"
                    >
                      {session.name} ({session.code})
                    </Link>
                    <Badge
                      tone={
                        session.status === "active"
                          ? "success"
                          : session.status === "planned"
                            ? "accent"
                            : "neutral"
                      }
                    >
                      {session.status}
                    </Badge>
                    {canManageAcademics && session.status !== "active" ? (
                      <RegistryActionForm
                        action={activateSessionAction.bind(
                          null,
                          context.institutionSlug,
                          session.id,
                        )}
                        submitLabel="Activate"
                        submitVariant="secondary"
                        className="inline-flex items-center gap-2"
                      >
                        <span className="sr-only">Activate {session.code}</span>
                      </RegistryActionForm>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {overview.terms.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-3 text-xs">
              {overview.terms.map((term) => (
                <Badge key={term.id} tone="neutral">
                  #{term.sequenceNo} {term.name} ({term.startsOn} → {term.endsOn})
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-[var(--density-gap)] lg:grid-cols-2">
        <Card
          title="Class-Band & Academic Departments"
          description="Supports Senior Secondary XI–XII coordination alongside class levels."
        >
          {overview.departments.length === 0 ? (
            <p className="text-xs text-fg-muted">No departments configured.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {overview.departments.map((dept) => (
                <li
                  key={dept.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-subtle bg-elevated px-3 py-2"
                >
                  <div>
                    <span className="font-semibold text-fg">{dept.name}</span>
                    <span className="ml-2 font-mono text-fg-muted">
                      ({dept.code})
                    </span>
                  </div>
                  <Badge tone="accent">{dept.departmentKind}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Streams & Teaching Groups Summary"
          description="Streams classify session focus; cross-section groups span sections per subject elective."
        >
          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap gap-1.5">
              {overview.streams.length === 0 ? (
                <span className="text-fg-muted">No streams defined.</span>
              ) : (
                overview.streams.map((stream) => (
                  <Badge key={stream.id} tone="neutral">
                    {stream.name} ({stream.code})
                  </Badge>
                ))
              )}
            </div>
            <div className="flex items-center justify-between border-t border-border-subtle pt-3">
              <span className="text-fg-muted">
                Active Session Teaching Groups:{" "}
                <strong className="text-fg">
                  {overview.teachingGroupsCount}
                </strong>
              </span>
              <Link
                href={`${basePath}/teaching-groups${overview.selectedSession ? `?session=${encodeURIComponent(overview.selectedSession.id)}` : ""}`}
                className="font-medium text-accent hover:underline"
              >
                Open Teaching Groups →
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <Card
        title="Classes & Sections"
        description="Inspect a section to view Class Teacher, Monitor/Monitress, and per-student mixed CBSE elective enrolments."
      >
        {overview.sections.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No sections created for this session"
            description="Create a class level and section below."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overview.sections.map((section) => (
              <Link
                key={section.id}
                href={`${basePath}/sections/${encodeURIComponent(section.id)}`}
                className="block rounded-md border border-border-subtle bg-elevated p-3 text-xs transition-colors hover:border-accent"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-fg">{section.name}</span>
                  <Badge tone="accent">Grade {section.gradeCode}</Badge>
                </div>
                <p className="mt-1 text-fg-muted">
                  {section.roomLabel ?? "Room TBD"} • Cap:{" "}
                  {section.capacity ?? "—"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Subject Offerings"
        description="Session-scoped board subjects available across core and mixed Senior Secondary electives."
      >
        {overview.offerings.length === 0 ? (
          <p className="text-xs text-fg-muted">
            No subject offerings configured in this session yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-elevated text-fg-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Code
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Subject
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Grade
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Stream
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface">
                {overview.offerings.map((off) => (
                  <tr key={off.id}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono font-medium text-fg">
                      {off.subjectCode}
                      {off.boardSubjectCode ? ` (${off.boardSubjectCode})` : ""}
                    </td>
                    <td className="px-3 py-2 font-medium text-fg">
                      {off.subjectName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-fg">
                      {off.gradeCode}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-fg-muted">
                      {off.streamName ?? "All / Mixed"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Badge tone={off.isMandatory ? "success" : "neutral"}>
                        {off.category}
                      </Badge>
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
          <Card title="Create Academic Session">
            <RegistryActionForm
              action={boundCreateSession}
              submitLabel="Create Planned Session"
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="sess-code"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Code *
                  </label>
                  <input
                    id="sess-code"
                    name="code"
                    required
                    placeholder="AY-2027-28"
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sess-name"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Name *
                  </label>
                  <input
                    id="sess-name"
                    name="name"
                    required
                    placeholder="Academic Session 2027-28"
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sess-start"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Starts On *
                  </label>
                  <input
                    id="sess-start"
                    name="startsOn"
                    type="date"
                    required
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sess-end"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Ends On *
                  </label>
                  <input
                    id="sess-end"
                    name="endsOn"
                    type="date"
                    required
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  />
                </div>
              </div>
            </RegistryActionForm>
          </Card>

          <Card title="Create Department">
            <RegistryActionForm
              action={boundCreateDept}
              submitLabel="Create Department"
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="dept-code"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Code *
                  </label>
                  <input
                    id="dept-code"
                    name="code"
                    required
                    placeholder="SECONDARY"
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dept-name"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Name *
                  </label>
                  <input
                    id="dept-name"
                    name="name"
                    required
                    placeholder="Secondary Classes IX-X"
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dept-kind"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Kind *
                  </label>
                  <select
                    id="dept-kind"
                    name="departmentKind"
                    defaultValue="class_band"
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  >
                    {DEPARTMENT_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="dept-desc"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Description
                  </label>
                  <input
                    id="dept-desc"
                    name="description"
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  />
                </div>
              </div>
            </RegistryActionForm>
          </Card>

          {boundCreateGradeSection && overview.departments.length > 0 ? (
            <Card title="Add Class & Section">
              <RegistryActionForm
                action={boundCreateGradeSection}
                submitLabel="Create Class & Section"
              >
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="sec-dept"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Department *
                    </label>
                    <select
                      id="sec-dept"
                      name="departmentId"
                      className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    >
                      {overview.departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="sec-grade-code"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Grade Code *
                    </label>
                    <input
                      id="sec-grade-code"
                      name="gradeCode"
                      required
                      defaultValue="XI"
                      className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sec-grade-name"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Grade Name *
                    </label>
                    <input
                      id="sec-grade-name"
                      name="gradeName"
                      required
                      defaultValue="Class XI"
                      className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sec-code"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Section Code *
                    </label>
                    <input
                      id="sec-code"
                      name="sectionCode"
                      required
                      placeholder="XI-C"
                      className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sec-name"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Section Name *
                    </label>
                    <input
                      id="sec-name"
                      name="sectionName"
                      required
                      placeholder="XI-C"
                      className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sec-room"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Room
                    </label>
                    <input
                      id="sec-room"
                      name="roomLabel"
                      className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sec-cap"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Capacity
                    </label>
                    <input
                      id="sec-cap"
                      name="capacity"
                      type="number"
                      min={1}
                      defaultValue={40}
                      className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                  </div>
                </div>
              </RegistryActionForm>
            </Card>
          ) : null}

          {boundCreateOffering && overview.gradeLevels.length > 0 ? (
            <Card title="Add Subject & Offering">
              <RegistryActionForm
                action={boundCreateOffering}
                submitLabel="Create Subject & Offering"
              >
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="off-grade"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Grade Level *
                    </label>
                    <select
                      id="off-grade"
                      name="gradeLevelId"
                      className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    >
                      {overview.gradeLevels.map((grade) => (
                        <option key={grade.id} value={grade.id}>
                          {grade.name} ({grade.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="off-stream"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Stream (optional)
                    </label>
                    <select
                      id="off-stream"
                      name="streamId"
                      className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    >
                      <option value="">All / Mixed Streams</option>
                      {overview.streams.map((stream) => (
                        <option key={stream.id} value={stream.id}>
                          {stream.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="off-subj-code"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Subject Code *
                    </label>
                    <input
                      id="off-subj-code"
                      name="subjectCode"
                      required
                      placeholder="ECO-030"
                      className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="off-subj-name"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Subject Name *
                    </label>
                    <input
                      id="off-subj-name"
                      name="subjectName"
                      required
                      placeholder="Economics"
                      className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="off-category"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Category
                    </label>
                    <select
                      id="off-category"
                      name="category"
                      defaultValue="elective"
                      className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    >
                      {SUBJECT_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center pt-5 text-xs">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" name="isMandatory" />
                      <span>Mandatory offering</span>
                    </label>
                  </div>
                </div>
              </RegistryActionForm>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
