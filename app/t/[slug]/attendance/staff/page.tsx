import {
  correctStaffAttendanceAction,
  recordStaffAttendanceAction,
  verifyOrSignOffStaffAttendanceAction,
} from "@/app/t/[slug]/attendance/actions";
import { AttendanceSubNav } from "@/components/attendance/AttendanceSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import {
  STAFF_ATTENDANCE_STATUSES,
  type StaffVerificationStatus,
} from "@/lib/attendance/schemas";
import { getStaffAttendanceView } from "@/server/attendance/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface StaffAttendancePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}

function staffVerificationTone(
  status: StaffVerificationStatus | null,
): BadgeTone {
  switch (status) {
    case "signed_off":
      return "success";
    case "verified":
      return "accent";
    case "draft":
      return "warning";
    default:
      return "neutral";
  }
}

export default async function StaffAttendancePage({
  params,
  searchParams,
}: StaffAttendancePageProps) {
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
  const view = await getStaffAttendanceView(context, query.date);

  if (!view.allowed) {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <AttendanceSubNav
          slug={context.institutionSlug}
          activeTab="staff"
          capabilities={view.capabilities}
          selectedDate={view.selectedDate}
        />
        <StateNotice
          kind="permission-denied"
          title="Staff attendance access restricted"
          description="Staff daily attendance registers are restricted strictly to active staff members and authorized personnel or attendance administrators."
        />
      </div>
    );
  }

  const boundRecordStaff = recordStaffAttendanceAction.bind(
    null,
    context.institutionSlug,
    view.selectedDate,
  );
  const boundCorrectStaff = correctStaffAttendanceAction.bind(
    null,
    context.institutionSlug,
  );
  const signedOffRows = view.rows.filter(
    (r) => r.verificationStatus === "signed_off" && r.attendanceId,
  );

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <AttendanceSubNav
        slug={context.institutionSlug}
        activeTab="staff"
        capabilities={view.capabilities}
        selectedDate={view.selectedDate}
      />

      <Card
        title="Staff Daily Attendance Register"
        description="View check-in/check-out records, perform HR/leadership verification & sign-off, and record audited post-sign-off corrections."
      >
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor="staff-attendance-date"
              className="mb-1 block text-xs font-medium text-fg"
            >
              Attendance Date
            </label>
            <input
              id="staff-attendance-date"
              name="date"
              type="date"
              defaultValue={view.selectedDate}
              className="min-h-10 rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Load Date
          </Button>
        </form>
      </Card>

      <Card
        title={`Staff Roster — ${view.selectedDate}`}
        description="Scoped strictly via PostgreSQL RLS: institutional staff viewers see their own record, while HR/attendance managers manage the directory."
      >
        {view.rows.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No staff profiles visible"
            description="No active staff records are visible in your institutional scope."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full min-w-[46rem] divide-y divide-border-subtle text-left text-xs">
              <thead className="bg-elevated text-fg-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Employee</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Check-In / Out</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 font-medium">Remarks / Correction</th>
                  {view.capabilities.canManageStaffAttendance ? (
                    <th className="px-3 py-2 font-medium">Transitions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface">
                {view.rows.map((row) => (
                  <tr key={row.staffProfileId}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-fg">{row.fullName}</div>
                      <div className="font-mono text-[11px] text-fg-muted">
                        {row.employeeCode}
                        {row.designation ? ` • ${row.designation}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone="neutral">{row.status ?? "unmarked"}</Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-fg-muted">
                      <div>In: {row.checkInAt ? row.checkInAt.slice(11, 16) : "—"}</div>
                      <div>Out: {row.checkOutAt ? row.checkOutAt.slice(11, 16) : "—"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5">
                        <Badge
                          tone={staffVerificationTone(row.verificationStatus)}
                        >
                          {row.verificationStatus ?? "unmarked"}
                        </Badge>
                        {row.correctionCount > 0 ? (
                          <span className="text-[11px] text-fg-muted">
                            Corrected ×{row.correctionCount}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-fg-muted">
                      {row.lastCorrectionReason
                        ? `Correction: ${row.lastCorrectionReason}`
                        : (row.remarks ?? "—")}
                    </td>
                    {view.capabilities.canManageStaffAttendance ? (
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {row.attendanceId && row.verificationStatus === "draft" ? (
                            <RegistryActionForm
                              action={verifyOrSignOffStaffAttendanceAction.bind(
                                null,
                                context.institutionSlug,
                                row.attendanceId,
                                "verified",
                              )}
                              submitLabel="Verify"
                              submitVariant="secondary"
                              className="inline-flex flex-col gap-1"
                            >
                              <span className="sr-only">
                                Verify {row.fullName}
                              </span>
                            </RegistryActionForm>
                          ) : null}
                          {view.capabilities.canSignOff &&
                          row.attendanceId &&
                          row.verificationStatus !== "signed_off" ? (
                            <RegistryActionForm
                              action={verifyOrSignOffStaffAttendanceAction.bind(
                                null,
                                context.institutionSlug,
                                row.attendanceId,
                                "signed_off",
                              )}
                              submitLabel="Sign Off"
                              submitVariant="primary"
                              className="inline-flex flex-col gap-1"
                            >
                              <span className="sr-only">
                                Sign Off {row.fullName}
                              </span>
                            </RegistryActionForm>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {view.capabilities.canManageStaffAttendance && view.rows.length > 0 ? (
        <Card
          title={`Record Staff Attendance (${view.selectedDate})`}
          description="Saves draft staff daily attendance and appends idempotent check-in/check-out events."
        >
          <RegistryActionForm
            action={boundRecordStaff}
            submitLabel="Save Staff Attendance"
            pendingLabel="Saving..."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="staff-profile-select"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Staff Member
                </label>
                <select
                  id="staff-profile-select"
                  name="staffProfileId"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  {view.rows.map((row) => (
                    <option key={row.staffProfileId} value={row.staffProfileId}>
                      {row.fullName} ({row.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="staff-status-select"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Status
                </label>
                <select
                  id="staff-status-select"
                  name="status"
                  defaultValue="present"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  {STAFF_ATTENDANCE_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="staff-checkin-time"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Check-In Time (Optional, HH:MM)
                </label>
                <input
                  id="staff-checkin-time"
                  name="checkInTime"
                  type="time"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                />
              </div>

              <div>
                <label
                  htmlFor="staff-checkout-time"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Check-Out Time (Optional, HH:MM)
                </label>
                <input
                  id="staff-checkout-time"
                  name="checkOutTime"
                  type="time"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="staff-remarks"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Remarks
                </label>
                <input
                  id="staff-remarks"
                  name="remarks"
                  type="text"
                  maxLength={240}
                  placeholder="Duty / arrival note"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                />
              </div>
            </div>
          </RegistryActionForm>
        </Card>
      ) : null}

      {view.capabilities.canCorrectSignedOff && signedOffRows.length > 0 ? (
        <Card
          title="Correct Signed-Off Staff Record"
          description="Mandatory post-sign-off correction reason with append-only correction event and audit log."
        >
          <RegistryActionForm
            action={boundCorrectStaff}
            submitLabel="Submit Audited Staff Correction"
            pendingLabel="Recording..."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="correct-staff-attendance-id"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Signed-Off Staff Record
                </label>
                <select
                  id="correct-staff-attendance-id"
                  name="attendanceId"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  {signedOffRows.map((row) => (
                    <option
                      key={row.attendanceId}
                      value={row.attendanceId ?? ""}
                    >
                      {row.fullName} ({row.employeeCode}) — current:{" "}
                      {row.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="correct-staff-new-status"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Corrected Status
                </label>
                <select
                  id="correct-staff-new-status"
                  name="newStatus"
                  defaultValue="present"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  {STAFF_ATTENDANCE_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="correct-staff-reason"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Mandatory Correction Reason (min 5 chars)
                </label>
                <input
                  id="correct-staff-reason"
                  name="correctionReason"
                  type="text"
                  required
                  minLength={5}
                  maxLength={500}
                  placeholder="Approved on-duty examination invigilation"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                />
              </div>

              <div>
                <label
                  htmlFor="correct-staff-remarks"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Optional Updated Remarks
                </label>
                <input
                  id="correct-staff-remarks"
                  name="remarks"
                  type="text"
                  maxLength={240}
                  placeholder="Optional remark"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                />
              </div>
            </div>
          </RegistryActionForm>
        </Card>
      ) : null}
    </div>
  );
}
