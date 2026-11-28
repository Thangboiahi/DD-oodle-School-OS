import { savePeriodAttendanceAction } from "@/app/t/[slug]/attendance/actions";
import { AttendanceSubNav } from "@/components/attendance/AttendanceSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { STUDENT_PERIOD_ATTENDANCE_STATUSES } from "@/lib/attendance/schemas";
import { getPeriodAttendanceView } from "@/server/attendance/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface PeriodAttendancePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    date?: string;
    teachingGroupId?: string;
    periodCode?: string;
  }>;
}

export default async function PeriodAttendancePage({
  params,
  searchParams,
}: PeriodAttendancePageProps) {
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
  const view = await getPeriodAttendanceView(context, {
    date: query.date,
    teachingGroupId: query.teachingGroupId,
    periodCode: query.periodCode,
  });

  if (!view.allowed) {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <AttendanceSubNav
          slug={context.institutionSlug}
          activeTab="periods"
          capabilities={view.capabilities}
          selectedDate={view.selectedDate}
        />
        <StateNotice
          kind="permission-denied"
          title="Period roll access restricted"
          description="Only assigned Subject Teachers, Class Teachers, HODs, or institutional attendance managers may mark teaching-group period attendance."
        />
      </div>
    );
  }

  const boundSavePeriod = view.selectedGroup
    ? savePeriodAttendanceAction.bind(
        null,
        context.institutionSlug,
        view.selectedGroup.id,
        view.selectedDate,
        view.selectedPeriodCode,
      )
    : null;

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <AttendanceSubNav
        slug={context.institutionSlug}
        activeTab="periods"
        capabilities={view.capabilities}
        selectedDate={view.selectedDate}
      />

      {!view.policy.periodAttendanceEnabled ? (
        <div
          role="status"
          className="rounded-lg border border-status-warning bg-surface p-[var(--density-pad)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className="text-fg">
              <strong>Policy Notice:</strong> Optional period-wise roll is
              currently disabled in institutional attendance policy (
              <span className="font-mono">period_attendance_enabled=false</span>
              ). Daily section roll remains primary; authorized staff can still
              stage period rolls or toggle policy under Event Ledger &amp; Policy.
            </p>
            <Badge tone="warning">Period Roll Optional</Badge>
          </div>
        </div>
      ) : null}

      <Card
        title="Teaching-Group Period Roll Filter"
        description={
          view.activeSession
            ? `Active Session: ${view.activeSession.name} (${view.activeSession.code})`
            : "No active academic session configured."
        }
      >
        <form method="GET" className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="period-group"
              className="mb-1 block text-xs font-medium text-fg"
            >
              Teaching Group
            </label>
            <select
              id="period-group"
              name="teachingGroupId"
              defaultValue={view.selectedGroup?.id ?? ""}
              className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
            >
              {view.teachingGroups.map((tg) => (
                <option key={tg.id} value={tg.id}>
                  {tg.code} — {tg.name} ({tg.subjectName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="period-date"
              className="mb-1 block text-xs font-medium text-fg"
            >
              Date
            </label>
            <input
              id="period-date"
              name="date"
              type="date"
              defaultValue={view.selectedDate}
              className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
            />
          </div>

          <div>
            <label
              htmlFor="period-code"
              className="mb-1 block text-xs font-medium text-fg"
            >
              Period Code
            </label>
            <input
              id="period-code"
              name="periodCode"
              type="text"
              maxLength={20}
              defaultValue={view.selectedPeriodCode}
              placeholder="P1"
              className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
            />
          </div>

          <div className="flex items-end">
            <Button type="submit" variant="secondary" size="sm">
              Load Period Roll
            </Button>
          </div>
        </form>
      </Card>

      {!view.selectedGroup || view.members.length === 0 ? (
        <StateNotice
          kind="empty"
          title="No teaching-group members available"
          description="Select an assigned teaching group with active student memberships."
        />
      ) : (
        <Card
          title={`${view.selectedGroup.code} — Period ${view.selectedPeriodCode} (${view.selectedDate})`}
          description={`${view.selectedGroup.name} • ${view.selectedGroup.subjectName}${
            view.selectedGroup.isCrossSection ? " • Cross-Section Batch" : ""
          }`}
        >
          {view.canMarkSelectedGroup && boundSavePeriod ? (
            <RegistryActionForm
              action={boundSavePeriod}
              submitLabel="Save Period Roll"
              pendingLabel="Saving Period Roll..."
            >
              <div className="overflow-x-auto rounded-md border border-border-subtle">
                <table className="w-full min-w-[40rem] divide-y divide-border-subtle text-left text-xs">
                  <thead className="bg-elevated text-fg-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Section / Roll</th>
                      <th className="px-3 py-2 font-medium">Student</th>
                      <th className="px-3 py-2 font-medium">Period Status</th>
                      <th className="px-3 py-2 font-medium">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-surface">
                    {view.members.map((member) => (
                      <tr key={member.enrolmentId}>
                        <td className="px-3 py-2 font-mono text-fg-muted">
                          {member.sectionCode}
                          {member.rollNumber ? ` #${member.rollNumber}` : ""}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-fg">
                            {member.fullName}
                          </div>
                          <div className="font-mono text-[11px] text-fg-muted">
                            {member.admissionNumber}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="hidden"
                            name="enrolmentIds"
                            value={member.enrolmentId}
                          />
                          <input
                            type="hidden"
                            name={`profile_${member.enrolmentId}`}
                            value={member.studentProfileId}
                          />
                          <select
                            aria-label={`Period status for ${member.fullName}`}
                            name={`status_${member.enrolmentId}`}
                            defaultValue={member.status ?? "present"}
                            className="min-h-9 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg"
                          >
                            {STUDENT_PERIOD_ATTENDANCE_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            aria-label={`Period remarks for ${member.fullName}`}
                            type="text"
                            name={`remarks_${member.enrolmentId}`}
                            defaultValue={member.remarks ?? ""}
                            maxLength={240}
                            placeholder="Optional note"
                            className="min-h-9 w-full min-w-[8rem] rounded-md border border-border-strong bg-surface px-2 text-xs text-fg"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </RegistryActionForm>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border-subtle">
              <table className="w-full min-w-[36rem] divide-y divide-border-subtle text-left text-xs">
                <thead className="bg-elevated text-fg-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Section / Roll</th>
                    <th className="px-3 py-2 font-medium">Student</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface">
                  {view.members.map((member) => (
                    <tr key={member.enrolmentId}>
                      <td className="px-3 py-2 font-mono text-fg-muted">
                        {member.sectionCode}
                      </td>
                      <td className="px-3 py-2 font-medium text-fg">
                        {member.fullName}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone="neutral">
                          {member.status ?? "unmarked"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-fg-muted">
                        {member.remarks ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
