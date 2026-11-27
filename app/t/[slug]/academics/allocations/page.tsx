import {
  assignAcademicResponsibilityAction,
  revokeAcademicResponsibilityAction,
} from "@/app/t/[slug]/academics/actions";
import { AcademicsSubNav } from "@/components/academics/AcademicsSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { ACADEMIC_ASSIGNMENT_TYPES } from "@/lib/academics/schemas";
import { evaluatePermission } from "@/lib/auth/permissions";
import { listAcademicAssignments } from "@/server/academics/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface AllocationsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}

export default async function AcademicAllocationsPage({
  params,
  searchParams,
}: AllocationsPageProps) {
  const { slug } = await params;
  const query = await searchParams;
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

  const data = await listAcademicAssignments(context, query.session);
  const boundAssign = data.selectedSession
    ? assignAcademicResponsibilityAction.bind(
        null,
        context.institutionSlug,
        data.selectedSession.id,
      )
    : null;

  return (
    <div className="space-y-[var(--density-gap)]">
      <AcademicsSubNav
        slug={context.institutionSlug}
        activeTab="allocations"
        sessionId={data.selectedSession?.id}
      />

      {canManageAcademics && boundAssign ? (
        <Card
          title="Assign Time-Bound Academic Responsibility"
          description="Supports concurrent teacher responsibilities (HOD + Class Teacher + multiple Subject Teacher groups) while rejecting overlapping Class Teacher or section Monitor conflicts."
        >
          <RegistryActionForm
            action={boundAssign}
            submitLabel="Assign Responsibility"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="alloc-person"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Person *
                </label>
                <select
                  id="alloc-person"
                  name="personId"
                  required
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                >
                  {data.candidatePersons.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="alloc-type"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Assignment Type *
                </label>
                <select
                  id="alloc-type"
                  name="assignmentType"
                  defaultValue="subject_teacher"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                >
                  {ACADEMIC_ASSIGNMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="alloc-dept"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Department (for hod)
                </label>
                <select
                  id="alloc-dept"
                  name="departmentId"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                >
                  <option value="">None</option>
                  {data.departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="alloc-section"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Section (for class_teacher / monitor / monitress)
                </label>
                <select
                  id="alloc-section"
                  name="sectionId"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                >
                  <option value="">None</option>
                  {data.sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="alloc-tg"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Teaching Group (for subject_teacher)
                </label>
                <select
                  id="alloc-tg"
                  name="teachingGroupId"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                >
                  <option value="">None</option>
                  {data.teachingGroups.map((tg) => (
                    <option key={tg.id} value={tg.id}>
                      {tg.code} — {tg.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="alloc-start"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Starts On *
                  </label>
                  <input
                    id="alloc-start"
                    name="startsOn"
                    type="date"
                    required
                    defaultValue={
                      data.selectedSession?.startsOn ?? "2026-04-01"
                    }
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="alloc-end"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Ends On
                  </label>
                  <input
                    id="alloc-end"
                    name="endsOn"
                    type="date"
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  />
                </div>
              </div>
            </div>
          </RegistryActionForm>
        </Card>
      ) : null}

      <Card
        title="Time-Bound Allocations Ledger"
        description="Historical and active HOD, Class Teacher, Subject Teacher, Monitor, and Monitress assignments."
      >
        {data.assignments.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No academic assignments recorded"
            description="Assign an HOD, Class Teacher, Subject Teacher, or Monitor above."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-elevated text-fg-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Person
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Type
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Scope Target
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Effective Dates
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Status
                  </th>
                  {canManageAcademics ? (
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Actions
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface">
                {data.assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="px-3 py-2 font-medium text-fg">
                      {assignment.personName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-fg">
                      {assignment.assignmentType}
                    </td>
                    <td className="px-3 py-2 text-fg">
                      {assignment.targetLabel}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-fg-muted">
                      {assignment.startsOn} →{" "}
                      {assignment.endsOn ?? "Open-ended"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Badge
                        tone={
                          assignment.status === "active"
                            ? "success"
                            : assignment.status === "delegated"
                              ? "accent"
                              : assignment.status === "revoked"
                                ? "danger"
                                : "neutral"
                        }
                      >
                        {assignment.status}
                      </Badge>
                    </td>
                    {canManageAcademics ? (
                      <td className="whitespace-nowrap px-3 py-2">
                        {assignment.status === "active" ||
                        assignment.status === "delegated" ? (
                          <RegistryActionForm
                            action={revokeAcademicResponsibilityAction.bind(
                              null,
                              context.institutionSlug,
                              assignment.id,
                            )}
                            submitLabel="Revoke"
                            submitVariant="secondary"
                            className="inline-flex items-center gap-2"
                          >
                            <span className="sr-only">
                              Revoke {assignment.personName}
                            </span>
                          </RegistryActionForm>
                        ) : (
                          <span className="text-fg-muted">—</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
