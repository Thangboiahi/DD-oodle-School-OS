import Link from "next/link";
import {
  correctStudentAttendanceAction,
  saveStudentDailyRollAction,
  signOffSectionAttendanceAction,
  verifySectionAttendanceAction,
} from "@/app/t/[slug]/attendance/actions";
import { AttendanceSubNav } from "@/components/attendance/AttendanceSubNav";
import { OfflineQueuePanel } from "@/components/attendance/offline-queue-panel";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import type { AttendanceShortageStatus } from "@/lib/attendance/rules";
import {
  STUDENT_DAILY_ATTENDANCE_STATUSES,
  type StudentVerificationStatus,
} from "@/lib/attendance/schemas";
import { getAttendanceOverview } from "@/server/attendance/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface AttendancePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; section?: string }>;
}

function verificationTone(
  status: StudentVerificationStatus | "unmarked" | "mixed" | null,
): BadgeTone {
  switch (status) {
    case "signed_off":
      return "success";
    case "class_teacher_verified":
      return "accent";
    case "draft":
    case "mixed":
      return "warning";
    default:
      return "neutral";
  }
}

function verificationLabel(
  status: StudentVerificationStatus | "unmarked" | "mixed" | null,
): string {
  switch (status) {
    case "signed_off":
      return "Signed Off";
    case "class_teacher_verified":
      return "Class Teacher Verified";
    case "draft":
      return "Draft";
    case "mixed":
      return "Mixed States";
    default:
      return "Unmarked";
  }
}

function shortageTone(status: AttendanceShortageStatus): BadgeTone {
  switch (status) {
    case "healthy":
      return "success";
    case "warning":
      return "warning";
    case "shortage":
      return "danger";
    default:
      return "neutral";
  }
}

export default async function AttendanceDailyPage({
  params,
  searchParams,
}: AttendancePageProps) {
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
  const overview = await getAttendanceOverview(context, {
    date: query.date,
    sectionId: query.section,
  });

  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/attendance`;
  const { capabilities, policy } = overview;

  if (capabilities.isMonitorReadOnly) {
    const presentCount = overview.rows.filter(
      (r) => r.status === "present" || r.status === "late" || r.status === "on_duty",
    ).length;
    const absentCount = overview.rows.filter((r) => r.status === "absent").length;

    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <AttendanceSubNav
          slug={context.institutionSlug}
          activeTab="daily"
          capabilities={capabilities}
          selectedDate={overview.selectedDate}
        />

        <div
          role="status"
          className="rounded-lg border border-border-strong bg-surface p-[var(--density-pad)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-fg">
                Monitor / Monitress Read-Only Verified Attendance View
              </h2>
              <p className="text-xs text-fg-muted">
                Monitors may review verified or signed-off section attendance
                summaries only. Unverified draft rolls, edit controls, staff
                attendance, and policy/ledger records are strictly hidden.
              </p>
            </div>
            <Badge tone="accent">Read-Only Verified</Badge>
          </div>
        </div>

        <Card
          title="Verified Section Roll Filter"
          description="Switch date or inspect verified daily counts for your assigned section."
        >
          <div className="space-y-3">
            <form method="GET" className="flex flex-wrap items-end gap-3">
              <div>
                <label
                  htmlFor="monitor-date"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Attendance Date
                </label>
                <input
                  id="monitor-date"
                  name="date"
                  type="date"
                  defaultValue={overview.selectedDate}
                  className="min-h-10 rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                />
              </div>
              {overview.selectedSection ? (
                <input
                  type="hidden"
                  name="section"
                  value={overview.selectedSection.id}
                />
              ) : null}
              <Button type="submit" variant="secondary" size="sm">
                Load Date
              </Button>
            </form>

            {overview.recentDates.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-fg-muted">Verified dates:</span>
                {overview.recentDates.map((d) => (
                  <Link
                    key={d}
                    href={`${basePath}?date=${encodeURIComponent(d)}${
                      overview.selectedSection
                        ? `&section=${encodeURIComponent(overview.selectedSection.id)}`
                        : ""
                    }`}
                    className={[
                      "inline-flex min-h-8 items-center rounded border px-2 py-0.5 font-mono text-[11px]",
                      d === overview.selectedDate
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

        <Card
          title={
            overview.selectedSection
              ? `${overview.selectedSection.gradeCode} ${overview.selectedSection.code} — Verified Roll (${overview.selectedDate})`
              : "Verified Section Attendance"
          }
          description={`Verified / signed-off records: ${overview.rows.length} | Present / On-Duty / Late: ${presentCount} | Absent: ${absentCount}`}
        >
          {overview.rows.length === 0 ? (
            <StateNotice
              kind="empty"
              title="No verified attendance published for this date"
              description="Draft records are hidden until verified by the Class Teacher, HOD, or institutional leadership."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-border-subtle">
              <table className="w-full min-w-[34rem] divide-y divide-border-subtle text-left text-xs">
                <thead className="bg-elevated text-fg-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Roll #</th>
                    <th className="px-3 py-2 font-medium">Student</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Sign-Off State</th>
                    <th className="px-3 py-2 font-medium">Session %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface">
                  {overview.rows.map((row) => (
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
                        <Badge tone="neutral">{row.status ?? "—"}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={verificationTone(row.verificationStatus)}>
                          {verificationLabel(row.verificationStatus)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={shortageTone(row.shortage.status)}>
                          {row.shortage.percentage === null
                            ? "No Data"
                            : `${row.shortage.percentage}%`}
                        </Badge>
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

  const editableRows = overview.rows.filter(
    (r) => r.verificationStatus !== "signed_off",
  );
  const signedOffRows = overview.rows.filter(
    (r) => r.verificationStatus === "signed_off" && r.attendanceId,
  );
  const hasDraftRows = overview.rows.some(
    (r) => r.verificationStatus === "draft",
  );
  const hasSignOffEligibleRows = overview.rows.some(
    (r) =>
      r.verificationStatus === "draft" ||
      r.verificationStatus === "class_teacher_verified",
  );

  const boundSaveRoll = overview.selectedSection
    ? saveStudentDailyRollAction.bind(
        null,
        context.institutionSlug,
        overview.selectedSection.id,
        overview.selectedDate,
      )
    : null;

  const boundVerifyRoll = overview.selectedSection
    ? verifySectionAttendanceAction.bind(
        null,
        context.institutionSlug,
        overview.selectedSection.id,
        overview.selectedDate,
      )
    : null;

  const boundSignOffRoll = overview.selectedSection
    ? signOffSectionAttendanceAction.bind(
        null,
        context.institutionSlug,
        overview.selectedSection.id,
        overview.selectedDate,
      )
    : null;

  const boundCorrectStudent = correctStudentAttendanceAction.bind(
    null,
    context.institutionSlug,
  );

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <AttendanceSubNav
        slug={context.institutionSlug}
        activeTab="daily"
        capabilities={capabilities}
        selectedDate={overview.selectedDate}
      />

      <Card
        title="Daily Student Attendance Register"
        description={
          overview.activeSession
            ? `Active Session: ${overview.activeSession.name} (${overview.activeSession.code})`
            : "No active academic session configured."
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge tone="accent">
              Policy Min: {policy.minimumAttendancePercent}% / Warning:{" "}
              {policy.warningThresholdPercent}%
            </Badge>
            <Badge tone={verificationTone(overview.sectionVerificationStatus)}>
              Section State:{" "}
              {verificationLabel(overview.sectionVerificationStatus)}
            </Badge>
            <Badge tone="neutral">
              Biometric: {policy.biometricEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>

          <form method="GET" className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <label
                htmlFor="attendance-date"
                className="mb-1 block text-xs font-medium text-fg"
              >
                Date
              </label>
              <input
                id="attendance-date"
                name="date"
                type="date"
                defaultValue={overview.selectedDate}
                className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
              />
            </div>

            <div>
              <label
                htmlFor="attendance-section"
                className="mb-1 block text-xs font-medium text-fg"
              >
                Section
              </label>
              <select
                id="attendance-section"
                name="section"
                defaultValue={overview.selectedSection?.id ?? ""}
                className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
              >
                {overview.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.gradeCode} {section.code} — {section.name}
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

          {overview.recentDates.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-fg-muted">Recent recorded dates:</span>
              {overview.recentDates.map((d) => (
                <Link
                  key={d}
                  href={`${basePath}?date=${encodeURIComponent(d)}${
                    overview.selectedSection
                      ? `&section=${encodeURIComponent(overview.selectedSection.id)}`
                      : ""
                  }`}
                  className={[
                    "inline-flex min-h-8 items-center rounded border px-2 py-0.5 font-mono text-[11px]",
                    d === overview.selectedDate
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

      {!overview.selectedSection || overview.rows.length === 0 ? (
        <StateNotice
          kind="empty"
          title="No enrolled students in selected scope"
          description="Select a section with active session enrolments or check your role access scope."
        />
      ) : (
        <Card
          title={`${overview.selectedSection.gradeCode} ${overview.selectedSection.code} Roll — ${overview.selectedDate}`}
          description="Weighted attendance basis: present, late, and on_duty = 1.0 day; half_day = 0.5 day; excused_leave counted in total marked days against policy thresholds."
        >
          <div className="space-y-4">
            {capabilities.canMarkDaily && boundSaveRoll && editableRows.length > 0 ? (
              <RegistryActionForm
                action={boundSaveRoll}
                submitLabel="Save Daily Roll"
                pendingLabel="Saving Roll..."
              >
                <div className="overflow-x-auto rounded-md border border-border-subtle">
                  <table className="w-full min-w-[46rem] divide-y divide-border-subtle text-left text-xs">
                    <thead className="bg-elevated text-fg-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">Roll #</th>
                        <th className="px-3 py-2 font-medium">Student</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Session %</th>
                        <th className="px-3 py-2 font-medium">State</th>
                        <th className="px-3 py-2 font-medium">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle bg-surface">
                      {overview.rows.map((row) => {
                        const isSignedOff = row.verificationStatus === "signed_off";
                        return (
                          <tr key={row.enrolmentId}>
                            <td className="px-3 py-2 font-mono text-fg-muted">
                              {row.rollNumber ?? "—"}
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium text-fg">
                                {row.fullName}
                              </div>
                              <div className="font-mono text-[11px] text-fg-muted">
                                {row.admissionNumber}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {isSignedOff ? (
                                <Badge tone="neutral">
                                  {row.status ?? "present"}
                                </Badge>
                              ) : (
                                <>
                                  <input
                                    type="hidden"
                                    name="enrolmentIds"
                                    value={row.enrolmentId}
                                  />
                                  <input
                                    type="hidden"
                                    name={`profile_${row.enrolmentId}`}
                                    value={row.studentProfileId}
                                  />
                                  <select
                                    aria-label={`Attendance status for ${row.fullName}`}
                                    name={`status_${row.enrolmentId}`}
                                    defaultValue={row.status ?? "present"}
                                    className="min-h-9 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg"
                                  >
                                    {STUDENT_DAILY_ATTENDANCE_STATUSES.map(
                                      (st) => (
                                        <option key={st} value={st}>
                                          {st}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                </>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <Badge tone={shortageTone(row.shortage.status)}>
                                {row.shortage.percentage === null
                                  ? "No Data"
                                  : `${row.shortage.percentage}% (${row.shortage.status})`}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-0.5">
                                <Badge
                                  tone={verificationTone(row.verificationStatus)}
                                >
                                  {verificationLabel(row.verificationStatus)}
                                </Badge>
                                {row.correctionCount > 0 ? (
                                  <span className="text-[11px] text-fg-muted">
                                    Corrected ×{row.correctionCount}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {isSignedOff ? (
                                <span className="text-fg-muted">
                                  {row.lastCorrectionReason
                                    ? `Correction: ${row.lastCorrectionReason}`
                                    : (row.remarks ?? "Locked")}
                                </span>
                              ) : (
                                <input
                                  aria-label={`Remarks for ${row.fullName}`}
                                  type="text"
                                  name={`remarks_${row.enrolmentId}`}
                                  defaultValue={row.remarks ?? ""}
                                  maxLength={240}
                                  placeholder="Optional note"
                                  className="min-h-9 w-full min-w-[8rem] rounded-md border border-border-strong bg-surface px-2 text-xs text-fg"
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </RegistryActionForm>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border-subtle">
                <table className="w-full min-w-[42rem] divide-y divide-border-subtle text-left text-xs">
                  <thead className="bg-elevated text-fg-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Roll #</th>
                      <th className="px-3 py-2 font-medium">Student</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Session %</th>
                      <th className="px-3 py-2 font-medium">State</th>
                      <th className="px-3 py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-surface">
                    {overview.rows.map((row) => (
                      <tr key={row.enrolmentId}>
                        <td className="px-3 py-2 font-mono text-fg-muted">
                          {row.rollNumber ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-fg">
                            {row.fullName}
                          </div>
                          <div className="font-mono text-[11px] text-fg-muted">
                            {row.admissionNumber}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone="neutral">
                            {row.status ?? "unmarked"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={shortageTone(row.shortage.status)}>
                            {row.shortage.percentage === null
                              ? "No Data"
                              : `${row.shortage.percentage}%`}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            tone={verificationTone(row.verificationStatus)}
                          >
                            {verificationLabel(row.verificationStatus)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-fg-muted">
                          {row.lastCorrectionReason
                            ? `Correction: ${row.lastCorrectionReason}`
                            : (row.remarks ?? "—")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(capabilities.canVerifySection && hasDraftRows && boundVerifyRoll) ||
            (capabilities.canSignOff &&
              hasSignOffEligibleRows &&
              boundSignOffRoll) ? (
              <div className="flex flex-wrap items-center gap-3 border-t border-border-subtle pt-3">
                {capabilities.canVerifySection &&
                hasDraftRows &&
                boundVerifyRoll ? (
                  <RegistryActionForm
                    action={boundVerifyRoll}
                    submitLabel="Verify Section Roll"
                    pendingLabel="Verifying..."
                    submitVariant="secondary"
                    className="inline-flex flex-col gap-2"
                  >
                    <span className="sr-only">
                      Verify draft rows for selected section
                    </span>
                  </RegistryActionForm>
                ) : null}

                {capabilities.canSignOff &&
                hasSignOffEligibleRows &&
                boundSignOffRoll ? (
                  <RegistryActionForm
                    action={boundSignOffRoll}
                    submitLabel="Sign Off Roll"
                    pendingLabel="Signing Off..."
                    submitVariant="primary"
                    className="inline-flex flex-col gap-2"
                  >
                    <span className="sr-only">
                      Authorise final sign-off for selected section
                    </span>
                  </RegistryActionForm>
                ) : null}
              </div>
            ) : null}
          </div>
        </Card>
      )}

      {capabilities.canCorrectSignedOff && signedOffRows.length > 0 ? (
        <Card
          title="Correct Signed-Off Record"
          description="Signed-off attendance rows are locked against silent overwrites. Every correction requires an explicit reason and writes both an append-only correction event and an immutable audit entry."
        >
          <RegistryActionForm
            action={boundCorrectStudent}
            submitLabel="Submit Audited Correction"
            pendingLabel="Recording Correction..."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="correct-student-attendance-id"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Signed-Off Attendance Row
                </label>
                <select
                  id="correct-student-attendance-id"
                  name="attendanceId"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  {signedOffRows.map((row) => (
                    <option
                      key={row.attendanceId}
                      value={row.attendanceId ?? ""}
                    >
                      {row.fullName} ({row.admissionNumber}) — current:{" "}
                      {row.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="correct-student-new-status"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Corrected Status
                </label>
                <select
                  id="correct-student-new-status"
                  name="newStatus"
                  defaultValue="present"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  {STUDENT_DAILY_ATTENDANCE_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="correct-student-reason"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Mandatory Correction Reason (min 5 chars)
                </label>
                <input
                  id="correct-student-reason"
                  name="correctionReason"
                  type="text"
                  required
                  minLength={5}
                  maxLength={500}
                  placeholder="Verified medical exemption slip received by office"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                />
              </div>

              <div>
                <label
                  htmlFor="correct-student-remarks"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Optional Updated Remarks
                </label>
                <input
                  id="correct-student-remarks"
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

      {capabilities.canMarkDaily && overview.selectedSection ? (
        <Card
          title="Offline Attendance Sync Queue"
          description="Queue roll-call events while offline and sync idempotently when connectivity resumes."
        >
          <OfflineQueuePanel
            slug={context.institutionSlug}
            institutionId={context.institutionId}
            sectionId={overview.selectedSection.id}
            sectionCode={overview.selectedSection.code}
            attendanceDate={overview.selectedDate}
            roster={overview.rows.map((r) => ({
              enrolmentId: r.enrolmentId,
              studentProfileId: r.studentProfileId,
              fullName: r.fullName,
              admissionNumber: r.admissionNumber,
              rollNumber: r.rollNumber,
            }))}
          />
        </Card>
      ) : null}
    </div>
  );
}
