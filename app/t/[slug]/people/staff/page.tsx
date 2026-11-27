import { createStaffAction } from "@/app/t/[slug]/people/actions";
import { PeopleSubNav } from "@/components/registry/PeopleSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { evaluatePermission } from "@/lib/auth/permissions";
import {
  STAFF_EMPLOYMENT_TYPES,
  STAFF_LIFECYCLE_STATUSES,
  type StaffLifecycleStatus,
} from "@/lib/registry/schemas";
import { listStaff } from "@/server/registry/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface StaffDirectoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function StaffDirectoryPage({
  params,
  searchParams,
}: StaffDirectoryPageProps) {
  const { slug } = await params;
  const queryParams = await searchParams;
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
  const canReadStaff =
    evaluatePermission(context, { permission: "people.read" }).allowed ||
    evaluatePermission(context, { permission: "academics.manage" }).allowed;
  const canManagePeople = evaluatePermission(context, {
    permission: "people.manage",
  }).allowed;
  const canViewAdmissions =
    evaluatePermission(context, { permission: "admissions.read" }).allowed ||
    evaluatePermission(context, { permission: "admissions.manage" }).allowed ||
    canReadStaff;

  if (!canReadStaff) {
    return (
      <div className="space-y-[var(--density-gap)]">
        <PeopleSubNav
          slug={context.institutionSlug}
          activeTab="staff"
          canViewStaff={false}
          canViewAdmissions={canViewAdmissions}
          canManageCustomFields={canManagePeople}
        />
        <StateNotice
          kind="permission-denied"
          title="Staff directory restricted"
          description="You require people.read or academics.manage authority to inspect the institutional staff directory."
        />
      </div>
    );
  }

  const statusFilter = STAFF_LIFECYCLE_STATUSES.includes(
    queryParams.status as StaffLifecycleStatus,
  )
    ? (queryParams.status as StaffLifecycleStatus)
    : undefined;
  const page = Number.parseInt(queryParams.page ?? "1", 10) || 1;
  const directory = await listStaff(context, {
    query: queryParams.q?.trim() || undefined,
    lifecycleStatus: statusFilter,
    page,
    pageSize: 25,
  });

  const boundCreateStaff = createStaffAction.bind(null, context.institutionSlug);

  return (
    <div className="space-y-[var(--density-gap)]">
      <PeopleSubNav
        slug={context.institutionSlug}
        activeTab="staff"
        canViewStaff={true}
        canViewAdmissions={canViewAdmissions}
        canManageCustomFields={canManagePeople}
      />

      <Card
        title="Institutional Staff Directory"
        description="Permanent staff profiles separated from time-bound academic and administrative assignments."
      >
        {directory.items.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No staff profiles found"
            description="No staff directory entries matched your query."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-elevated text-fg-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Code
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Staff Member
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Designation
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Employment
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Lifecycle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface">
                {directory.items.map((staff) => (
                  <tr key={staff.id}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono font-medium text-fg">
                      {staff.employeeCode}
                    </td>
                    <td className="px-3 py-2 font-medium text-fg">
                      {staff.fullName}
                    </td>
                    <td className="px-3 py-2 text-fg">{staff.designation}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-fg-muted">
                      {staff.employmentType}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Badge tone="accent">{staff.lifecycleStatus}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {canManagePeople ? (
        <Card
          title="Add Staff Member"
          description="Creates or links a permanent DD-oodle Person record and appends an audit log entry."
        >
          <RegistryActionForm
            action={boundCreateStaff}
            submitLabel="Add Staff Record"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="staff-name"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Full Name *
                </label>
                <input
                  id="staff-name"
                  name="fullName"
                  required
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <label
                  htmlFor="staff-code"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Employee Code *
                </label>
                <input
                  id="staff-code"
                  name="employeeCode"
                  required
                  placeholder="EMP-SR-010"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <label
                  htmlFor="staff-designation"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Designation *
                </label>
                <input
                  id="staff-designation"
                  name="designation"
                  required
                  placeholder="PGT Physics"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <label
                  htmlFor="staff-email"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Email
                </label>
                <input
                  id="staff-email"
                  name="email"
                  type="email"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <label
                  htmlFor="staff-employment"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Employment Type
                </label>
                <select
                  id="staff-employment"
                  name="employmentType"
                  defaultValue="full_time"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                >
                  {STAFF_EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="staff-qualifications"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Qualifications
                </label>
                <input
                  id="staff-qualifications"
                  name="qualifications"
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
