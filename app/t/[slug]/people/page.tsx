import Link from "next/link";
import { createStudentAction } from "@/app/t/[slug]/people/actions";
import { PeopleSubNav } from "@/components/registry/PeopleSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { evaluatePermission } from "@/lib/auth/permissions";
import {
  EXTERNAL_ID_VERIFICATION_STATUSES,
  STUDENT_LIFECYCLE_STATUSES,
  type StudentLifecycleStatus,
} from "@/lib/registry/schemas";
import { listStudents } from "@/server/registry/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface PeoplePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function InstitutionPeoplePage({
  params,
  searchParams,
}: PeoplePageProps) {
  const { slug } = await params;
  const queryParams = await searchParams;
  const resolution = await resolveVerifiedTenantContext(slug);

  if (resolution.status !== "ok") {
    return (
      <StateNotice
        kind="permission-denied"
        title="Workspace verification required"
        description="Server-side membership verification did not succeed for this institution registry."
      />
    );
  }

  const { context } = resolution;
  const canManagePeople = evaluatePermission(context, {
    permission: "people.manage",
  }).allowed;
  const canViewStaff =
    evaluatePermission(context, { permission: "people.read" }).allowed ||
    evaluatePermission(context, { permission: "academics.manage" }).allowed;
  const canViewAdmissions =
    evaluatePermission(context, { permission: "admissions.read" }).allowed ||
    evaluatePermission(context, { permission: "admissions.manage" }).allowed ||
    evaluatePermission(context, { permission: "people.read" }).allowed;

  const statusFilter = STUDENT_LIFECYCLE_STATUSES.includes(
    queryParams.status as StudentLifecycleStatus,
  )
    ? (queryParams.status as StudentLifecycleStatus)
    : undefined;
  const searchQuery = queryParams.q?.trim() ?? "";
  const pageNumber = Number.parseInt(queryParams.page ?? "1", 10) || 1;

  const roster = await listStudents(context, {
    query: searchQuery || undefined,
    lifecycleStatus: statusFilter,
    page: pageNumber,
    pageSize: 25,
  });

  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/people`;
  const totalPages = Math.max(1, Math.ceil(roster.totalCount / roster.pageSize));
  const boundCreateStudent = createStudentAction.bind(
    null,
    context.institutionSlug,
  );

  return (
    <div className="space-y-[var(--density-gap)]">
      <PeopleSubNav
        slug={context.institutionSlug}
        activeTab="students"
        canViewStaff={canViewStaff}
        canViewAdmissions={canViewAdmissions}
        canManageCustomFields={canManagePeople}
      />

      <Card
        title="Student Registry Roster"
        description="Relationship- and RLS-scoped roster. Teachers see only students enrolled in their assigned teaching groups; guardians see only their linked wards."
      >
        <div className="space-y-4">
          <form
            method="GET"
            action={basePath}
            className="flex flex-wrap items-end gap-2.5"
          >
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <label
                htmlFor="student-search-input"
                className="mb-1 block text-xs font-medium text-fg-muted"
              >
                Admission No.
              </label>
              <input
                id="student-search-input"
                name="q"
                type="search"
                defaultValue={searchQuery}
                placeholder="Search ADM-..."
                className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="w-full sm:w-44">
              <label
                htmlFor="student-status-filter"
                className="mb-1 block text-xs font-medium text-fg-muted"
              >
                Lifecycle Status
              </label>
              <select
                id="student-status-filter"
                name="status"
                defaultValue={statusFilter ?? ""}
                className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">All Statuses</option>
                {STUDENT_LIFECYCLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex min-h-9 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
            >
              Filter
            </button>

            <span className="ml-auto text-xs text-fg-muted">
              Showing {roster.items.length} of {roster.totalCount}
            </span>
          </form>

          {roster.items.length === 0 ? (
            <StateNotice
              kind="empty"
              title="No matching student records visible"
              description="No students matched your filter or your active verified institutional scope."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-border-subtle">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-elevated text-fg-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Admission No.
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Student
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Lifecycle
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      PEN / APAAR
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Record
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface">
                  {roster.items.map((student) => (
                    <tr key={student.id} className="hover:bg-elevated/60">
                      <td className="whitespace-nowrap px-3 py-2 font-mono font-medium text-fg">
                        {student.admissionNumber}
                      </td>
                      <td className="px-3 py-2 font-medium text-fg">
                        {student.fullName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <Badge tone="accent">{student.lifecycleStatus}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-fg-muted">
                        {student.maskedPenNumber ??
                          student.maskedApaarId ??
                          "Not linked"}{" "}
                        <span className="font-sans">
                          ({student.externalIdVerificationStatus})
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <Link
                          href={`${basePath}/students/${encodeURIComponent(student.id)}`}
                          className="font-medium text-accent hover:underline"
                        >
                          Open Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border-subtle pt-3 text-xs">
              <span className="text-fg-muted">
                Page {roster.page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                {roster.page > 1 ? (
                  <Link
                    href={`${basePath}?page=${roster.page - 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`}
                    className="rounded border border-border-strong px-2.5 py-1 hover:bg-elevated"
                  >
                    Previous
                  </Link>
                ) : null}
                {roster.page < totalPages ? (
                  <Link
                    href={`${basePath}?page=${roster.page + 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`}
                    className="rounded border border-border-strong px-2.5 py-1 hover:bg-elevated"
                  >
                    Next
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      {canManagePeople ? (
        <Card
          title="Register New Student"
          description="Links or creates a permanent DD-oodle Person record (never duplicates by email) and appends an immutable audit log entry. Aadhaar is never collected."
        >
          <RegistryActionForm
            action={boundCreateStudent}
            submitLabel="Create Student Profile"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="add-student-name"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Full Name *
                </label>
                <input
                  id="add-student-name"
                  name="fullName"
                  required
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>

              <div>
                <label
                  htmlFor="add-student-adm"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Admission Number *
                </label>
                <input
                  id="add-student-adm"
                  name="admissionNumber"
                  required
                  placeholder="ADM-SR-2026-010"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>

              <div>
                <label
                  htmlFor="add-student-email"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Personal Email (optional)
                </label>
                <input
                  id="add-student-email"
                  name="email"
                  type="email"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>

              <div>
                <label
                  htmlFor="add-student-lifecycle"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Lifecycle Status
                </label>
                <select
                  id="add-student-lifecycle"
                  name="lifecycleStatus"
                  defaultValue="active"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                >
                  {STUDENT_LIFECYCLE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="add-student-pen"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Optional PEN Number
                </label>
                <input
                  id="add-student-pen"
                  name="penNumber"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>

              <div>
                <label
                  htmlFor="add-student-apaar"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Optional APAAR ID
                </label>
                <input
                  id="add-student-apaar"
                  name="apaarId"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>

              <div>
                <label
                  htmlFor="add-student-ext-status"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  External ID Verification
                </label>
                <select
                  id="add-student-ext-status"
                  name="externalIdVerificationStatus"
                  defaultValue="unverified"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                >
                  {EXTERNAL_ID_VERIFICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="add-student-emergency-name"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Emergency Contact Name
                </label>
                <input
                  id="add-student-emergency-name"
                  name="emergencyContactName"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>

              <div>
                <label
                  htmlFor="add-student-emergency-phone"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Emergency Contact Phone
                </label>
                <input
                  id="add-student-emergency-phone"
                  name="emergencyContactPhone"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
            </div>
          </RegistryActionForm>
        </Card>
      ) : null}
    </div>
  );
}
