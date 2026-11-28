import Link from "next/link";
import {
  acknowledgeParentNoticeAction,
  submitParentNoticeAction,
} from "@/app/t/[slug]/leave/actions";
import { LeaveSubNav } from "@/components/leave/LeaveSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import {
  PARENT_NOTICE_KINDS,
  PARENT_NOTICE_STATUSES,
} from "@/lib/leave/schemas";
import { getInstitutionTodayIsoDate } from "@/server/attendance/service";
import { getParentNoticesWorkspace } from "@/server/leave/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface ParentNoticesPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; date?: string }>;
}

export default async function ParentNoticesPage({
  params,
  searchParams,
}: ParentNoticesPageProps) {
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
  const todayDate = getInstitutionTodayIsoDate(context.institutionTimezone);
  const workspace = await getParentNoticesWorkspace(context, {
    statusFilter: query.status,
    date: query.date,
  });

  if (workspace.capabilities.isMonitorRestricted) {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <StateNotice
          kind="permission-denied"
          title="Parent attendance notices restricted"
          description="Classroom monitors hold read-only access to verified attendance summaries only and cannot access parent notices."
          action={
            <Link
              href={`/t/${encodeURIComponent(context.institutionSlug)}/attendance/summary`}
              className="inline-flex min-h-10 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
            >
              Open Verified Board Summary
            </Link>
          }
        />
      </div>
    );
  }

  const wardOptions =
    workspace.guardianWards.length > 0 &&
    workspace.selectableStudents.length === 0
      ? workspace.guardianWards
      : workspace.selectableStudents.length > 0
        ? workspace.selectableStudents
        : workspace.guardianWards;

  const boundSubmitNotice = submitParentNoticeAction.bind(
    null,
    context.institutionSlug,
  );

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <LeaveSubNav slug={context.institutionSlug} activeTab="notices" />

      <Card
        title="Parent Attendance Notices Filter"
        description="Structured absence, late-arrival, and early-pickup notices shared cleanly between linked guardians and class leadership."
      >
        <form method="GET" className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <label
              htmlFor="notice-date-filter"
              className="mb-1 block text-xs font-medium text-fg"
            >
              Attendance Date (Optional)
            </label>
            <input
              id="notice-date-filter"
              name="date"
              type="date"
              defaultValue={workspace.dateFilter}
              className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
            />
          </div>

          <div>
            <label
              htmlFor="notice-status-filter"
              className="mb-1 block text-xs font-medium text-fg"
            >
              Status
            </label>
            <select
              id="notice-status-filter"
              name="status"
              defaultValue={workspace.statusFilter}
              className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
            >
              <option value="all">All Notices</option>
              {PARENT_NOTICE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button type="submit" variant="secondary" size="sm">
              Apply Filter
            </Button>
          </div>
        </form>
      </Card>

      {workspace.capabilities.canSubmitParentNotice && wardOptions.length > 0 ? (
        <Card
          title="Submit Parent Attendance Notice"
          description={`Scoped strictly to linked wards or authorized ${context.institutionName} student records.`}
        >
          <RegistryActionForm
            action={boundSubmitNotice}
            submitLabel="Submit Parent Notice"
            pendingLabel="Submitting..."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="parent-notice-ward"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Student / Ward
                </label>
                <select
                  id="parent-notice-ward"
                  name="studentProfileId"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  {wardOptions.map((ward) => (
                    <option
                      key={ward.studentProfileId}
                      value={ward.studentProfileId}
                    >
                      {ward.fullName} ({ward.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="parent-notice-date"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Attendance Date
                </label>
                <input
                  id="parent-notice-date"
                  name="attendanceDate"
                  type="date"
                  required
                  defaultValue={todayDate}
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                />
              </div>

              <div>
                <label
                  htmlFor="parent-notice-kind"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Notice Kind
                </label>
                <select
                  id="parent-notice-kind"
                  name="noticeKind"
                  defaultValue="absence"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  {PARENT_NOTICE_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label
                  htmlFor="parent-notice-message"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Message (min 5 chars)
                </label>
                <input
                  id="parent-notice-message"
                  name="message"
                  type="text"
                  required
                  minLength={5}
                  maxLength={1000}
                  placeholder="Morning dental checkup; will arrive by 10:15 AM"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                />
              </div>
            </div>
          </RegistryActionForm>
        </Card>
      ) : null}

      <Card
        title="Submitted Parent Attendance Notices"
        description="Class Teachers, HODs, and Attendance Managers can acknowledge notices in one click with immutable audit logging."
      >
        {workspace.notices.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No parent attendance notices found"
            description="Adjust date/status filters or submit a guardian notice above."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full min-w-[48rem] divide-y divide-border-subtle text-left text-xs">
              <thead className="bg-elevated text-fg-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Guardian</th>
                  <th className="px-3 py-2 font-medium">Kind</th>
                  <th className="px-3 py-2 font-medium">Message</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Acknowledgement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface">
                {workspace.notices.map((notice) => (
                  <tr key={notice.id}>
                    <td className="px-3 py-2 font-mono text-[11px] text-fg-muted">
                      {notice.attendanceDate}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-fg">
                        {notice.studentName}
                      </div>
                      <div className="font-mono text-[11px] text-fg-muted">
                        {notice.admissionNumber}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-fg-muted">
                      {notice.guardianName}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone="accent">{notice.noticeKind}</Badge>
                    </td>
                    <td className="max-w-xs px-3 py-2 text-fg">
                      {notice.message}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        tone={
                          notice.status === "acknowledged"
                            ? "success"
                            : "warning"
                        }
                      >
                        {notice.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {notice.canAcknowledge ? (
                        <RegistryActionForm
                          action={acknowledgeParentNoticeAction.bind(
                            null,
                            context.institutionSlug,
                            notice.id,
                          )}
                          submitLabel="Acknowledge"
                          pendingLabel="Acknowledging..."
                          submitVariant="secondary"
                          className="inline-flex flex-col gap-1"
                        >
                          <span className="sr-only">
                            Acknowledge notice from {notice.guardianName} for{" "}
                            {notice.studentName}
                          </span>
                        </RegistryActionForm>
                      ) : notice.acknowledgedByName ? (
                        <span className="text-fg-muted">
                          {notice.acknowledgedByName}
                        </span>
                      ) : (
                        <span className="text-fg-muted">—</span>
                      )}
                    </td>
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
