import Link from "next/link";
import { AttendanceSubNav } from "@/components/attendance/AttendanceSubNav";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import type { StudentVerificationStatus } from "@/lib/attendance/schemas";
import type { LeaveStatus } from "@/lib/leave/schemas";
import { getDailyClassSummary } from "@/server/leave/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface DailyClassSummaryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; section?: string }>;
}

function verificationTone(status: StudentVerificationStatus | null): BadgeTone {
  switch (status) {
    case "signed_off":
      return "success";
    case "class_teacher_verified":
      return "accent";
    case "draft":
      return "warning";
    default:
      return "neutral";
  }
}

function leaveTone(status: LeaveStatus): BadgeTone {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "danger";
    default:
      return "warning";
  }
}

export default async function DailyClassSummaryPage({
  params,
  searchParams,
}: DailyClassSummaryPageProps) {
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
  const summary = await getDailyClassSummary(context, {
    date: query.date,
    sectionId: query.section,
  });

  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/attendance/summary`;
  const leaveBasePath = `/t/${encodeURIComponent(context.institutionSlug)}/leave`;

  if (!summary.allowed) {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <AttendanceSubNav
          slug={context.institutionSlug}
          activeTab="summary"
          capabilities={summary.attendanceCapabilities}
          selectedDate={summary.selectedDate}
        />
        <StateNotice
          kind="permission-denied"
          title="Daily class summary restricted"
          description="Daily section board summaries are available strictly to assigned Class Teachers, Section Monitors, HODs, and institutional attendance readers."
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <AttendanceSubNav
        slug={context.institutionSlug}
        activeTab="summary"
        capabilities={summary.attendanceCapabilities}
        selectedDate={summary.selectedDate}
      />

      {summary.isMonitorReadOnly ? (
        <div
          role="status"
          className="rounded-lg border border-border-strong bg-surface p-[var(--density-pad)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-fg">
                Monitor / Monitress Read-Only Board Summary
              </h2>
              <p className="text-xs text-fg-muted">
                Displays strictly verified and signed-off board counts only.
                Unverified draft rolls, student leave reasons, parent notices,
                and editing controls are suppressed.
              </p>
            </div>
            <Badge tone="accent">Verified Board Only</Badge>
          </div>
        </div>
      ) : null}

      <Card
        title="Verified Daily Class & Board Summary"
        description={
          summary.activeSession
            ? `Active Session: ${summary.activeSession.name} (${summary.activeSession.code})`
            : "No active academic session configured."
        }
      >
        <div className="space-y-3">
          <form method="GET" className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <label
                htmlFor="summary-date"
                className="mb-1 block text-xs font-medium text-fg"
              >
                Date
              </label>
              <input
                id="summary-date"
                name="date"
                type="date"
                defaultValue={summary.selectedDate}
                className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
              />
            </div>

            <div>
              <label
                htmlFor="summary-section"
                className="mb-1 block text-xs font-medium text-fg"
              >
                Section
              </label>
              <select
                id="summary-section"
                name="section"
                defaultValue={summary.selectedSection?.id ?? ""}
                className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
              >
                {summary.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.gradeCode} {section.code} — {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button type="submit" variant="secondary" size="sm">
                Load Board Summary
              </Button>
            </div>
          </form>

          {summary.recentDates.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-fg-muted">Recent recorded dates:</span>
              {summary.recentDates.map((d) => (
                <Link
                  key={d}
                  href={`${basePath}?date=${encodeURIComponent(d)}${
                    summary.selectedSection
                      ? `&section=${encodeURIComponent(summary.selectedSection.id)}`
                      : ""
                  }`}
                  className={[
                    "inline-flex min-h-8 items-center rounded border px-2 py-0.5 font-mono text-[11px]",
                    d === summary.selectedDate
                      ? "border-accent bg-elevated font-semibold text-accent"
                      : "border-border-subtle bg-surface text-fg hover:bg-elevated",
                  ].join(" ")}
                >
                  {d}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <Card title="Present" className="text-center">
          <div className="text-2xl font-bold text-status-success">
            {summary.counts.presentCount}
          </div>
        </Card>
        <Card title="Absent" className="text-center">
          <div className="text-2xl font-bold text-status-danger">
            {summary.counts.absentCount}
          </div>
        </Card>
        <Card title="Late" className="text-center">
          <div className="text-2xl font-bold text-status-warning">
            {summary.counts.lateCount}
          </div>
        </Card>
        <Card title="Half-Day" className="text-center">
          <div className="text-2xl font-bold text-fg">
            {summary.counts.halfDayCount}
          </div>
        </Card>
        <Card title="Excused / Duty" className="text-center">
          <div className="text-2xl font-bold text-accent">
            {summary.counts.excusedLeaveCount + summary.counts.onDutyCount}
          </div>
        </Card>
        <Card title="Verification Coverage" className="text-center">
          <div className="space-y-1 text-xs">
            <div>
              <Badge tone="success">
                Signed Off: {summary.counts.signedOffCount}
              </Badge>
            </div>
            <div>
              <Badge tone="accent">
                Verified: {summary.counts.verifiedCount}
              </Badge>
            </div>
            {!summary.isMonitorReadOnly ? (
              <div>
                <Badge tone="warning">
                  Draft: {summary.counts.draftCount}
                </Badge>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card
        title={
          summary.selectedSection
            ? `${summary.selectedSection.gradeCode} ${summary.selectedSection.code} Board Roster — ${summary.selectedDate}`
            : "Section Board Roster"
        }
        description={
          summary.isMonitorReadOnly
            ? `Showing ${summary.rows.length} verified / signed-off record(s) only.`
            : `Showing ${summary.rows.length} active enrolled student(s) (${summary.counts.totalMarked} marked).`
        }
      >
        {summary.rows.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No verified attendance published for this date"
            description={
              summary.isMonitorReadOnly
                ? "Verified board summaries appear once the Class Teacher, HOD, or office signs off attendance."
                : "Mark daily attendance under Daily Student Roll for this section and date."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full min-w-[36rem] divide-y divide-border-subtle text-left text-xs">
              <thead className="bg-elevated text-fg-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Roll #</th>
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Verification</th>
                  {!summary.isMonitorReadOnly ? (
                    <th className="px-3 py-2 font-medium">Remarks</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface">
                {summary.rows.map((row) => (
                  <tr key={row.enrolmentId}>
                    <td className="px-3 py-2 font-mono text-fg-muted">
                      {row.rollNumber ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-fg">{row.fullName}</div>
                      <div className="font-mono text-[11px] text-fg-muted">
                        {row.admissionNumber}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone="neutral">{row.status ?? "unmarked"}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={verificationTone(row.verificationStatus)}>
                        {row.verificationStatus ?? "unmarked"}
                      </Badge>
                    </td>
                    {!summary.isMonitorReadOnly ? (
                      <td className="px-3 py-2 text-fg-muted">
                        {row.remarks ?? "—"}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {summary.canSeeOperationalDetails && !summary.isMonitorReadOnly ? (
        <div className="grid gap-[var(--density-gap)] lg:grid-cols-2">
          <Card
            title="Active & Pending Section Leaves"
            description={`Submitted or approved student leaves overlapping ${summary.selectedDate}.`}
          >
            <div className="space-y-3">
              {summary.sectionLeaves.length === 0 ? (
                <p className="text-xs text-fg-muted">
                  No submitted or approved student leaves overlap this date.
                </p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {summary.sectionLeaves.map((leave) => (
                    <li
                      key={leave.id}
                      className="rounded-md border border-border-subtle bg-elevated p-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-fg">
                          {leave.applicantLabel} ({leave.applicantSublabel})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge tone="accent">{leave.leaveType}</Badge>
                          <Badge tone={leaveTone(leave.status)}>
                            {leave.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-fg-muted">
                        {leave.startsOn} → {leave.endsOn} ({leave.inclusiveDays}{" "}
                        d)
                      </p>
                      <p className="mt-1 text-fg">{leave.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div>
                <Link
                  href={leaveBasePath}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Open Leave Applications to review →
                </Link>
              </div>
            </div>
          </Card>

          <Card
            title="Parent Attendance Notices"
            description={`Guardian absence/late-arrival/early-pickup notices for ${summary.selectedDate}.`}
          >
            <div className="space-y-3">
              {summary.sectionNotices.length === 0 ? (
                <p className="text-xs text-fg-muted">
                  No parent attendance notices recorded for this date.
                </p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {summary.sectionNotices.map((notice) => (
                    <li
                      key={notice.id}
                      className="rounded-md border border-border-subtle bg-elevated p-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-fg">
                          {notice.studentName} ({notice.admissionNumber})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge tone="accent">{notice.noticeKind}</Badge>
                          <Badge
                            tone={
                              notice.status === "acknowledged"
                                ? "success"
                                : "warning"
                            }
                          >
                            {notice.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-fg-muted">
                        Guardian: {notice.guardianName}
                      </p>
                      <p className="mt-1 text-fg">{notice.message}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div>
                <Link
                  href={`${leaveBasePath}/notices?date=${encodeURIComponent(summary.selectedDate)}`}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Open Parent Notices to acknowledge →
                </Link>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
