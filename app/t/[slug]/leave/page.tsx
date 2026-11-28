import Link from "next/link";
import {
  cancelLeaveAction,
  reviewLeaveAction,
  submitStaffLeaveAction,
  submitStudentLeaveAction,
} from "@/app/t/[slug]/leave/actions";
import { LeaveSubNav } from "@/components/leave/LeaveSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import {
  LEAVE_APPLICANT_KINDS,
  LEAVE_STATUSES,
  LEAVE_TYPES,
  type LeaveStatus,
} from "@/lib/leave/schemas";
import { getInstitutionTodayIsoDate } from "@/server/attendance/service";
import { getLeaveWorkspace } from "@/server/leave/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface LeavePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; kind?: string }>;
}

function leaveStatusTone(status: LeaveStatus): BadgeTone {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "danger";
    case "cancelled":
      return "neutral";
    default:
      return "warning";
  }
}

export default async function LeaveApplicationsPage({
  params,
  searchParams,
}: LeavePageProps) {
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
  const workspace = await getLeaveWorkspace(context, {
    statusFilter: query.status,
    kindFilter: query.kind,
  });

  if (workspace.capabilities.isMonitorRestricted) {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <StateNotice
          kind="permission-denied"
          title="Leave workflows restricted"
          description="Classroom monitors hold read-only access to verified daily attendance summaries only and cannot view or manage student or staff leave records."
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

  const studentOptions =
    workspace.guardianWards.length > 0 && workspace.selectableStudents.length === 0
      ? workspace.guardianWards
      : workspace.selectableStudents.length > 0
        ? workspace.selectableStudents
        : workspace.guardianWards;

  const boundSubmitStudentLeave = submitStudentLeaveAction.bind(
    null,
    context.institutionSlug,
  );
  const boundSubmitStaffLeave = submitStaffLeaveAction.bind(
    null,
    context.institutionSlug,
  );

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <LeaveSubNav slug={context.institutionSlug} activeTab="applications" />

      <Card
        title="Leave Applications Filter"
        description="Filter student and staff leave requests visible under your institutional and relationship RLS scope."
      >
        <form method="GET" className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <label
              htmlFor="leave-status-filter"
              className="mb-1 block text-xs font-medium text-fg"
            >
              Status
            </label>
            <select
              id="leave-status-filter"
              name="status"
              defaultValue={workspace.statusFilter}
              className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
            >
              <option value="all">All Statuses</option>
              {LEAVE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="leave-kind-filter"
              className="mb-1 block text-xs font-medium text-fg"
            >
              Applicant Kind
            </label>
            <select
              id="leave-kind-filter"
              name="kind"
              defaultValue={workspace.kindFilter}
              className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
            >
              <option value="all">All Applicants</option>
              {LEAVE_APPLICANT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
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

      {workspace.capabilities.canSubmitStudentLeave ||
      workspace.capabilities.canSubmitStaffLeave ? (
        <div className="grid gap-[var(--density-gap)] lg:grid-cols-2">
          {workspace.capabilities.canSubmitStudentLeave &&
          studentOptions.length > 0 ? (
            <Card
              title="Submit Student Leave Application"
              description="Guardians may request leave strictly for linked wards; authorized attendance managers may submit for enrolled students."
            >
              <RegistryActionForm
                action={boundSubmitStudentLeave}
                submitLabel="Submit Student Leave"
                pendingLabel="Submitting..."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="student-leave-student"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Student
                    </label>
                    <select
                      id="student-leave-student"
                      name="studentProfileId"
                      className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                    >
                      {studentOptions.map((st) => (
                        <option
                          key={st.studentProfileId}
                          value={st.studentProfileId}
                        >
                          {st.fullName} ({st.admissionNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="student-leave-starts"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Starts On
                    </label>
                    <input
                      id="student-leave-starts"
                      name="startsOn"
                      type="date"
                      required
                      defaultValue={todayDate}
                      className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="student-leave-ends"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Ends On
                    </label>
                    <input
                      id="student-leave-ends"
                      name="endsOn"
                      type="date"
                      required
                      defaultValue={todayDate}
                      className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="student-leave-type"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Leave Type
                    </label>
                    <select
                      id="student-leave-type"
                      name="leaveType"
                      defaultValue="sick"
                      className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                    >
                      {LEAVE_TYPES.map((lt) => (
                        <option key={lt} value={lt}>
                          {lt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="student-leave-reason"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Reason (min 5 chars)
                    </label>
                    <input
                      id="student-leave-reason"
                      name="reason"
                      type="text"
                      required
                      minLength={5}
                      maxLength={1000}
                      placeholder="High fever recovery advised by doctor"
                      className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                    />
                  </div>
                </div>
              </RegistryActionForm>
            </Card>
          ) : null}

          {workspace.capabilities.canSubmitStaffLeave ? (
            <Card
              title="Submit Staff Leave Application"
              description="Self-submitted staff leaves cannot be self-approved; HR or institutional leadership must review."
            >
              <RegistryActionForm
                action={boundSubmitStaffLeave}
                submitLabel="Submit Staff Leave"
                pendingLabel="Submitting..."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {workspace.selectableStaff.length > 0 ? (
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="staff-leave-member"
                        className="mb-1 block text-xs font-medium text-fg"
                      >
                        Staff Member
                      </label>
                      <select
                        id="staff-leave-member"
                        name="staffProfileId"
                        defaultValue={
                          workspace.ownStaffProfile?.staffProfileId ?? ""
                        }
                        className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                      >
                        {workspace.selectableStaff.map((sf) => (
                          <option
                            key={sf.staffProfileId}
                            value={sf.staffProfileId}
                          >
                            {sf.fullName} ({sf.employeeCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : workspace.ownStaffProfile ? (
                    <div className="sm:col-span-2 rounded-md border border-border-subtle bg-elevated px-3 py-2 text-xs text-fg">
                      Submitting as:{" "}
                      <strong>{workspace.ownStaffProfile.fullName}</strong> (
                      {workspace.ownStaffProfile.employeeCode})
                    </div>
                  ) : null}

                  <div>
                    <label
                      htmlFor="staff-leave-starts"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Starts On
                    </label>
                    <input
                      id="staff-leave-starts"
                      name="startsOn"
                      type="date"
                      required
                      defaultValue={todayDate}
                      className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="staff-leave-ends"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Ends On
                    </label>
                    <input
                      id="staff-leave-ends"
                      name="endsOn"
                      type="date"
                      required
                      defaultValue={todayDate}
                      className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="staff-leave-type"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Leave Type
                    </label>
                    <select
                      id="staff-leave-type"
                      name="leaveType"
                      defaultValue="casual"
                      className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                    >
                      {LEAVE_TYPES.map((lt) => (
                        <option key={lt} value={lt}>
                          {lt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="staff-leave-reason"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Reason (min 5 chars)
                    </label>
                    <input
                      id="staff-leave-reason"
                      name="reason"
                      type="text"
                      required
                      minLength={5}
                      maxLength={1000}
                      placeholder="CBSE regional workshop duty or family travel"
                      className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                    />
                  </div>
                </div>
              </RegistryActionForm>
            </Card>
          ) : null}
        </div>
      ) : null}

      <Card
        title="Leave Applications Ledger"
        description="Pending requests stay editable by submitter (cancel) or reviewer (approve/reject). Approved, rejected, and cancelled rows are immutable."
      >
        {workspace.applications.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No leave applications found"
            description="Adjust your status/kind filter or submit a new leave request above."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full min-w-[54rem] divide-y divide-border-subtle text-left text-xs">
              <thead className="bg-elevated text-fg-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Applicant</th>
                  <th className="px-3 py-2 font-medium">Kind / Type</th>
                  <th className="px-3 py-2 font-medium">Dates</th>
                  <th className="px-3 py-2 font-medium">Reason</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Decision / Reviewer</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface">
                {workspace.applications.map((app) => (
                  <tr key={app.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-fg">
                        {app.applicantLabel}
                      </div>
                      <div className="font-mono text-[11px] text-fg-muted">
                        {app.applicantSublabel} • By: {app.submittedByName}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone="neutral">{app.applicantKind}</Badge>
                        <Badge tone="accent">{app.leaveType}</Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-fg-muted">
                      <div>
                        {app.startsOn} → {app.endsOn}
                      </div>
                      <div>{app.inclusiveDays} day(s)</div>
                    </td>
                    <td className="max-w-xs px-3 py-2 text-fg">
                      {app.reason}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={leaveStatusTone(app.status)}>
                        {app.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-fg-muted">
                      {app.reviewedByName ? (
                        <div>
                          <div>{app.reviewedByName}</div>
                          {app.decisionNote ? (
                            <div className="text-[11px] text-fg">
                              {app.decisionNote}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-2">
                        {app.canCancel ? (
                          <RegistryActionForm
                            action={cancelLeaveAction.bind(
                              null,
                              context.institutionSlug,
                              app.id,
                            )}
                            submitLabel="Cancel"
                            pendingLabel="Cancelling..."
                            submitVariant="secondary"
                            className="inline-flex flex-col gap-1"
                          >
                            <span className="sr-only">
                              Cancel leave request for {app.applicantLabel}
                            </span>
                          </RegistryActionForm>
                        ) : null}

                        {app.canReview ? (
                          <div className="space-y-1.5 border-t border-border-subtle pt-1.5">
                            <RegistryActionForm
                              action={reviewLeaveAction.bind(
                                null,
                                context.institutionSlug,
                                app.id,
                                "approved",
                              )}
                              submitLabel="Approve"
                              pendingLabel="Approving..."
                              submitVariant="primary"
                              className="inline-flex flex-col gap-1"
                            >
                              <input
                                aria-label={`Approval note for ${app.applicantLabel}`}
                                type="text"
                                name="decisionNote"
                                maxLength={500}
                                placeholder="Optional note"
                                className="min-h-8 w-36 rounded border border-border-strong bg-surface px-2 text-[11px] text-fg"
                              />
                            </RegistryActionForm>

                            <RegistryActionForm
                              action={reviewLeaveAction.bind(
                                null,
                                context.institutionSlug,
                                app.id,
                                "rejected",
                              )}
                              submitLabel="Reject"
                              pendingLabel="Rejecting..."
                              submitVariant="secondary"
                              className="inline-flex flex-col gap-1"
                            >
                              <input
                                aria-label={`Rejection reason for ${app.applicantLabel}`}
                                type="text"
                                name="decisionNote"
                                required
                                minLength={3}
                                maxLength={500}
                                placeholder="Rejection reason (min 3)"
                                className="min-h-8 w-36 rounded border border-border-strong bg-surface px-2 text-[11px] text-fg"
                              />
                            </RegistryActionForm>
                          </div>
                        ) : app.status === "submitted" &&
                          app.isSelfApplicant &&
                          !workspace.capabilities.hasInstitutionalOverride ? (
                          <span className="text-[11px] text-fg-muted">
                            Self-review locked
                          </span>
                        ) : null}
                      </div>
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
