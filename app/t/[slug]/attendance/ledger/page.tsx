import { updateAttendancePolicyAction } from "@/app/t/[slug]/attendance/actions";
import { AttendanceSubNav } from "@/components/attendance/AttendanceSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import type { AttendanceSource } from "@/lib/attendance/schemas";
import { getAttendanceLedgerAndPolicy } from "@/server/attendance/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface LedgerPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; subjectKind?: string }>;
}

function sourceTone(source: AttendanceSource): BadgeTone {
  switch (source) {
    case "offline_queue":
      return "warning";
    case "device_gateway":
      return "accent";
    default:
      return "neutral";
  }
}

export default async function AttendanceLedgerAndPolicyPage({
  params,
  searchParams,
}: LedgerPageProps) {
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
  const view = await getAttendanceLedgerAndPolicy(context, {
    date: query.date,
    subjectKind: query.subjectKind,
  });

  if (!view.allowed) {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <AttendanceSubNav
          slug={context.institutionSlug}
          activeTab="ledger"
          capabilities={view.capabilities}
        />
        <StateNotice
          kind="permission-denied"
          title="Attendance ledger access restricted"
          description="Append-only attendance event history is restricted to authorized teachers, attendance managers, and staff members viewing own events."
        />
      </div>
    );
  }

  const boundUpdatePolicy = updateAttendancePolicyAction.bind(
    null,
    context.institutionSlug,
  );

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <AttendanceSubNav
        slug={context.institutionSlug}
        activeTab="ledger"
        capabilities={view.capabilities}
        selectedDate={view.selectedDate || undefined}
      />

      <Card
        title="Institution Attendance Policy"
        description="All attendance shortage and warning indicators across DD-oodle derive strictly from this per-institution configuration."
      >
        <div className="space-y-4">
          <div className="rounded-md border border-border-subtle bg-elevated px-3 py-2 text-xs text-fg">
            <strong>Biometric Hardware Capture:</strong>{" "}
            {view.policy.biometricEnabled ? "Enabled" : "Disabled by default"}{" "}
            — Phase 8 campus gateway approval is required before device gateway
            activation, and zero raw biometric templates are stored in DD-oodle
            cloud PostgreSQL.
          </div>

          {view.capabilities.canManagePolicy ? (
            <RegistryActionForm
              action={boundUpdatePolicy}
              submitLabel="Save Policy Thresholds"
              pendingLabel="Updating Policy..."
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label
                    htmlFor="policy-min-percent"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Minimum Attendance (%)
                  </label>
                  <input
                    id="policy-min-percent"
                    name="minimumAttendancePercent"
                    type="number"
                    min={1}
                    max={100}
                    step="0.01"
                    required
                    defaultValue={view.policy.minimumAttendancePercent}
                    className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                  />
                </div>

                <div>
                  <label
                    htmlFor="policy-warning-percent"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Warning Threshold (%)
                  </label>
                  <input
                    id="policy-warning-percent"
                    name="warningThresholdPercent"
                    type="number"
                    min={1}
                    max={100}
                    step="0.01"
                    required
                    defaultValue={view.policy.warningThresholdPercent}
                    className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    id="policy-period-enabled"
                    name="periodAttendanceEnabled"
                    type="checkbox"
                    defaultChecked={view.policy.periodAttendanceEnabled}
                    className="h-4 w-4 rounded border-border-strong"
                  />
                  <label
                    htmlFor="policy-period-enabled"
                    className="text-xs font-medium text-fg"
                  >
                    Enable Period-Wise Roll by Default
                  </label>
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label
                    htmlFor="policy-notes"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Policy Notes
                  </label>
                  <input
                    id="policy-notes"
                    name="policyNotes"
                    type="text"
                    maxLength={500}
                    defaultValue={view.policy.policyNotes ?? ""}
                    placeholder="Board/institution notes (e.g. minimum eligibility thresholds)"
                    className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                  />
                </div>
              </div>
            </RegistryActionForm>
          ) : (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge tone="accent">
                Min Threshold: {view.policy.minimumAttendancePercent}%
              </Badge>
              <Badge tone="warning">
                Warning Threshold: {view.policy.warningThresholdPercent}%
              </Badge>
              <Badge tone="neutral">
                Period Roll:{" "}
                {view.policy.periodAttendanceEnabled ? "Enabled" : "Optional"}
              </Badge>
            </div>
          )}
        </div>
      </Card>

      <Card
        title="Append-Only Attendance Event Ledger"
        description="Chronological immutable events from attendance_events (statement-level trigger blocks all UPDATE/DELETE mutations; deduplicated by idempotency_key)."
      >
        <div className="space-y-3">
          <form method="GET" className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <label
                htmlFor="ledger-date"
                className="mb-1 block text-xs font-medium text-fg"
              >
                Filter Date (Optional)
              </label>
              <input
                id="ledger-date"
                name="date"
                type="date"
                defaultValue={view.selectedDate}
                className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
              />
            </div>

            <div>
              <label
                htmlFor="ledger-subject-kind"
                className="mb-1 block text-xs font-medium text-fg"
              >
                Subject Kind
              </label>
              <select
                id="ledger-subject-kind"
                name="subjectKind"
                defaultValue={view.selectedSubjectKind}
                className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
              >
                <option value="all">All Subjects</option>
                <option value="student">Students Only</option>
                <option value="staff">Staff Only</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button type="submit" variant="secondary" size="sm">
                Filter Ledger
              </Button>
            </div>
          </form>

          {view.events.length === 0 ? (
            <StateNotice
              kind="empty"
              title="No attendance events match filter"
              description="Clear the date filter or record roll-call events to inspect the append-only ledger."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-border-subtle">
              <table className="w-full min-w-[54rem] divide-y divide-border-subtle text-left text-xs">
                <thead className="bg-elevated text-fg-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date &amp; Time</th>
                    <th className="px-3 py-2 font-medium">Subject</th>
                    <th className="px-3 py-2 font-medium">Event / Status</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">Actor</th>
                    <th className="px-3 py-2 font-medium">Reason / Note</th>
                    <th className="px-3 py-2 font-medium">Idempotency Key</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface">
                  {view.events.map((ev) => (
                    <tr key={ev.id}>
                      <td className="px-3 py-2 font-mono text-[11px] text-fg-muted">
                        <div>{ev.attendanceDate}</div>
                        <div>{ev.occurredAt.slice(11, 19)}Z</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-fg">
                          {ev.subjectLabel}
                        </div>
                        <div className="text-[11px] text-fg-muted">
                          {ev.subjectKind}
                          {ev.sectionLabel ? ` • ${ev.sectionLabel}` : ""}
                          {ev.teachingGroupLabel
                            ? ` • ${ev.teachingGroupLabel}`
                            : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Badge
                            tone={
                              ev.eventType === "correction"
                                ? "warning"
                                : "neutral"
                            }
                          >
                            {ev.eventType}
                          </Badge>
                          <Badge tone="neutral">{ev.attendanceStatus}</Badge>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={sourceTone(ev.source)}>{ev.source}</Badge>
                      </td>
                      <td className="px-3 py-2 text-fg-muted">
                        {ev.recordedByName ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-fg-muted">
                        {ev.reason ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-fg-muted">
                        {ev.idempotencyKey}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
