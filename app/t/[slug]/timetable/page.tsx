import Link from "next/link";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { OfflineTimetableCachePanel } from "@/components/timetable/OfflineTimetableCachePanel";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import {
  DAY_OF_WEEK_LABELS,
  canTransitionTimetableStatus,
} from "@/lib/timetable/rules";
import {
  TIMETABLE_PERIOD_KINDS,
  VENUE_KINDS,
  type SubstitutionStatus,
  type TimetableStatus,
} from "@/lib/timetable/schemas";
import { getTimetableWorkspace } from "@/server/timetable/service";
import {
  createSubstitutionAction,
  createTimetableAction,
  createTimetablePeriodAction,
  createTimetableSlotAction,
  createVenueAction,
  deleteTimetableSlotAction,
  transitionSubstitutionStatusAction,
  transitionTimetableStatusAction,
} from "./actions";

export const dynamic = "force-dynamic";

interface TimetablePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    timetable?: string;
    day?: string;
  }>;
}

function timetableStatusTone(status: TimetableStatus): BadgeTone {
  if (status === "published") return "success";
  if (status === "draft") return "accent";
  return "neutral";
}

function substitutionStatusTone(status: SubstitutionStatus): BadgeTone {
  if (status === "completed") return "success";
  if (status === "assigned") return "accent";
  return "neutral";
}

const INPUT_CLASS =
  "w-full min-w-0 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

export default async function InstitutionTimetablePage({
  params,
  searchParams,
}: TimetablePageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const workspace = await getTimetableWorkspace(slug, {
    timetableId: query.timetable,
    dayOfWeek: query.day,
  });

  if (workspace.accessDenied || !workspace.context) {
    return (
      <StateNotice
        kind="permission-denied"
        title="Workspace verification required"
        description="Server-side membership verification did not succeed for this institution."
      />
    );
  }

  const { context, selectedTimetable } = workspace;
  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/timetable`;
  const calendarPath = `/t/${encodeURIComponent(context.institutionSlug)}/calendar`;

  const buildFilterHref = (timetableId?: string, day?: number | null) => {
    const sp = new URLSearchParams();
    if (timetableId) sp.set("timetable", timetableId);
    if (day) sp.set("day", String(day));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const boundCreateVenue = createVenueAction.bind(null, context.institutionSlug);
  const boundCreatePeriod = createTimetablePeriodAction.bind(
    null,
    context.institutionSlug,
  );
  const boundCreateTimetable = createTimetableAction.bind(
    null,
    context.institutionSlug,
  );
  const boundCreateSlot = createTimetableSlotAction.bind(
    null,
    context.institutionSlug,
  );
  const boundCreateSub = createSubstitutionAction.bind(
    null,
    context.institutionSlug,
  );

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <Card
        title="Weekly Timetables & Schedule Board"
        description={
          workspace.activeSession
            ? `Active Session: ${workspace.activeSession.name} (${workspace.activeSession.code})`
            : "No active academic session configured for this institution."
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {workspace.isReadOnlyBoard ? (
                <Badge tone="neutral">Read-only published schedule</Badge>
              ) : (
                <>
                  {workspace.canManageTimetable ? (
                    <Badge tone="accent">Timetable Manager</Badge>
                  ) : null}
                  {workspace.canWriteSubstitution ? (
                    <Badge tone="success">Substitution Authority</Badge>
                  ) : null}
                </>
              )}
              <Badge tone="neutral">{workspace.venues.length} Venue(s)</Badge>
              <Badge tone="neutral">{workspace.periods.length} Period(s)</Badge>
            </div>
            <Link
              href={calendarPath}
              className="inline-flex items-center rounded-md border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:border-accent"
            >
              Open Academic Calendar
            </Link>
          </div>

          {!workspace.activeSession ? (
            <StateNotice
              kind="empty"
              title="No active academic session"
              description="Activate an academic session before publishing or scheduling weekly timetables."
            />
          ) : workspace.timetables.length === 0 ? (
            <StateNotice
              kind="empty"
              title="No timetables available"
              description={
                workspace.isReadOnlyBoard
                  ? "No published weekly timetable is currently available for this institution."
                  : "Create a draft or published weekly timetable version below to begin scheduling periods."
              }
            />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-fg-muted">
                  Timetable Version:
                </span>
                {workspace.timetables.map((tt) => {
                  const isActive = selectedTimetable?.id === tt.id;
                  return (
                    <Link
                      key={tt.id}
                      href={buildFilterHref(tt.id, workspace.dayOfWeekFilter)}
                      aria-current={isActive ? "page" : undefined}
                      className={[
                        "inline-flex min-w-0 flex-wrap items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                        isActive
                          ? "border-accent bg-accent text-accent-fg"
                          : "border-border bg-elevated text-fg hover:border-accent",
                      ].join(" ")}
                    >
                      <span className="break-words">
                        {tt.code} v{tt.versionNo}
                      </span>
                      <Badge tone={timetableStatusTone(tt.status)}>
                        {tt.status}
                      </Badge>
                    </Link>
                  );
                })}
              </div>

              {selectedTimetable ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-elevated/40 p-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-sm font-semibold text-fg">
                        {selectedTimetable.name}
                      </h2>
                      <Badge
                        tone={timetableStatusTone(selectedTimetable.status)}
                      >
                        {selectedTimetable.status}
                      </Badge>
                      {selectedTimetable.termCode ? (
                        <Badge tone="neutral">
                          {selectedTimetable.termCode}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-fg-muted">
                      Effective {selectedTimetable.effectiveFrom}
                      {selectedTimetable.effectiveTo
                        ? ` to ${selectedTimetable.effectiveTo}`
                        : " onwards"}
                      {!workspace.isReadOnlyBoard
                        ? ` · Authored by ${selectedTimetable.authoredByName}`
                        : ""}
                    </p>
                  </div>

                  {workspace.canManageTimetable ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {canTransitionTimetableStatus(
                        selectedTimetable.status,
                        "published",
                      ) ? (
                        <RegistryActionForm
                          action={transitionTimetableStatusAction.bind(
                            null,
                            context.institutionSlug,
                            selectedTimetable.id,
                            "published",
                          )}
                          submitLabel="Publish Timetable"
                          pendingLabel="Publishing..."
                          className="inline-flex flex-wrap items-center gap-2"
                        >
                          <span className="sr-only">
                            Publish {selectedTimetable.name}
                          </span>
                        </RegistryActionForm>
                      ) : null}
                      {canTransitionTimetableStatus(
                        selectedTimetable.status,
                        "archived",
                      ) ? (
                        <RegistryActionForm
                          action={transitionTimetableStatusAction.bind(
                            null,
                            context.institutionSlug,
                            selectedTimetable.id,
                            "archived",
                          )}
                          submitLabel="Archive Timetable"
                          pendingLabel="Archiving..."
                          submitVariant="secondary"
                          className="inline-flex flex-wrap items-center gap-2"
                        >
                          <span className="sr-only">
                            Archive {selectedTimetable.name}
                          </span>
                        </RegistryActionForm>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <form
                method="GET"
                action={basePath}
                className="flex flex-wrap items-end gap-3"
              >
                {selectedTimetable ? (
                  <input
                    type="hidden"
                    name="timetable"
                    value={selectedTimetable.id}
                  />
                ) : null}
                <div className="min-w-[180px] space-y-1">
                  <label
                    htmlFor="timetable-day-filter"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Filter Day of Week
                  </label>
                  <select
                    id="timetable-day-filter"
                    name="day"
                    defaultValue={
                      workspace.dayOfWeekFilter
                        ? String(workspace.dayOfWeekFilter)
                        : ""
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="">All Days (Mon–Sun)</option>
                    {Object.entries(DAY_OF_WEEK_LABELS).map(([dayNum, name]) => (
                      <option key={dayNum} value={dayNum}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" variant="secondary" size="sm">
                  Apply Day Filter
                </Button>
              </form>
            </div>
          )}

          <OfflineTimetableCachePanel
            slug={context.institutionSlug}
            snapshot={workspace.offlineCacheablePayload}
          />
        </div>
      </Card>

      {selectedTimetable ? (
        <Card
          title="Weekly Schedule Slots"
          description={
            workspace.dayOfWeekFilter
              ? `Showing ${DAY_OF_WEEK_LABELS[workspace.dayOfWeekFilter] ?? "selected day"} entries for ${selectedTimetable.code} v${selectedTimetable.versionNo}.`
              : `Showing ${workspace.slots.length} scheduled slot(s) across the week for ${selectedTimetable.code} v${selectedTimetable.versionNo}.`
          }
        >
          {workspace.slots.length === 0 ? (
            <StateNotice
              kind="empty"
              title="No schedule slots matched"
              description="Adjust the day-of-week filter or add slots to a draft timetable version."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <caption className="sr-only">
                  Weekly timetable slots for {selectedTimetable.name}
                </caption>
                <thead>
                  <tr className="border-b border-border text-fg-muted">
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Day
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Period & Time
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Teaching Group / Section
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Teacher
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Venue
                    </th>
                    {!workspace.isReadOnlyBoard ? (
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Substitution / Actions
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {workspace.slots.map((slot) => {
                    const activeSubs = workspace.substitutions.filter(
                      (sub) =>
                        sub.timetableSlotId === slot.id &&
                        sub.status !== "cancelled",
                    );
                    return (
                      <tr key={slot.id} className="align-top">
                        <td className="py-2.5 pr-3 font-medium text-fg">
                          {slot.dayLabel}
                        </td>
                        <td className="py-2.5 pr-3 text-fg">
                          <div className="font-medium">
                            {slot.periodCode} · {slot.periodLabel}
                          </div>
                          <div className="font-mono text-[11px] text-fg-muted">
                            {slot.startTime}–{slot.endTime} ({slot.periodKind})
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 text-fg">
                          <div className="font-medium break-words">
                            {slot.groupLabel}
                          </div>
                          {slot.notes ? (
                            <div className="text-[11px] text-fg-muted break-words">
                              {slot.notes}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-3 text-fg">
                          {slot.teacherName ?? "Unassigned"}
                        </td>
                        <td className="py-2.5 pr-3 text-fg">
                          {slot.venueLabel ?? "Unassigned"}
                        </td>
                        {!workspace.isReadOnlyBoard ? (
                          <td className="py-2.5 pr-3">
                            <div className="space-y-1.5">
                              {activeSubs.map((sub) => (
                                <div
                                  key={sub.id}
                                  className="flex flex-wrap items-center gap-1"
                                >
                                  <Badge
                                    tone={substitutionStatusTone(sub.status)}
                                  >
                                    {sub.status}
                                  </Badge>
                                  <span className="text-[11px] text-fg-muted">
                                    {sub.substitutionDate}:{" "}
                                    {sub.substituteTeacherName}
                                  </span>
                                </div>
                              ))}
                              {workspace.canManageTimetable &&
                              selectedTimetable.status === "draft" ? (
                                <RegistryActionForm
                                  action={deleteTimetableSlotAction.bind(
                                    null,
                                    context.institutionSlug,
                                    slot.id,
                                  )}
                                  submitLabel="Remove Slot"
                                  pendingLabel="Removing..."
                                  submitVariant="secondary"
                                  className="inline-flex flex-wrap items-center gap-1.5"
                                >
                                  <span className="sr-only">
                                    Remove {slot.dayLabel} {slot.periodCode}{" "}
                                    slot
                                  </span>
                                </RegistryActionForm>
                              ) : activeSubs.length === 0 ? (
                                <span className="text-[11px] text-fg-muted">
                                  Regular template
                                </span>
                              ) : null}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {!workspace.isReadOnlyBoard ? (
        <div className="grid grid-cols-1 gap-[var(--density-gap)] lg:grid-cols-2">
          <Card
            title="Date-Scoped Teacher Substitutions"
            description="Daily cover stays strictly separated from published weekly templates (ADR-0009)."
          >
            <div className="space-y-4">
              {workspace.substitutions.length === 0 ? (
                <p className="text-xs text-fg-muted">
                  No recent or upcoming substitutions recorded for this
                  timetable version.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {workspace.substitutions.map((sub) => (
                    <li
                      key={sub.id}
                      className="rounded-md border border-border bg-elevated/40 p-2.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium text-fg">
                          {sub.substitutionDate} · {sub.dayLabel}{" "}
                          {sub.periodLabel}
                        </div>
                        <Badge tone={substitutionStatusTone(sub.status)}>
                          {sub.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-fg-muted break-words">
                        {sub.groupLabel} — Cover:{" "}
                        <span className="font-medium text-fg">
                          {sub.substituteTeacherName}
                        </span>
                        {sub.originalTeacherName
                          ? ` (for ${sub.originalTeacherName})`
                          : ""}
                      </p>
                      <p className="mt-0.5 text-[11px] text-fg-muted break-words">
                        Reason: {sub.reason}
                      </p>
                      {sub.canTransition ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <RegistryActionForm
                            action={transitionSubstitutionStatusAction.bind(
                              null,
                              context.institutionSlug,
                              sub.id,
                              "completed",
                            )}
                            submitLabel="Mark Completed"
                            pendingLabel="Updating..."
                            submitVariant="secondary"
                            className="inline-flex flex-wrap items-center gap-1.5"
                          >
                            <span className="sr-only">
                              Mark substitution {sub.id} completed
                            </span>
                          </RegistryActionForm>
                          <RegistryActionForm
                            action={transitionSubstitutionStatusAction.bind(
                              null,
                              context.institutionSlug,
                              sub.id,
                              "cancelled",
                            )}
                            submitLabel="Cancel Cover"
                            pendingLabel="Cancelling..."
                            submitVariant="secondary"
                            className="inline-flex flex-wrap items-center gap-1.5"
                          >
                            <span className="sr-only">
                              Cancel substitution {sub.id}
                            </span>
                          </RegistryActionForm>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              {workspace.canWriteSubstitution &&
              selectedTimetable?.status === "published" &&
              workspace.slots.length > 0 ? (
                <RegistryActionForm
                  action={boundCreateSub}
                  submitLabel="Assign Date-Scoped Substitution"
                  pendingLabel="Assigning..."
                  className="space-y-2.5 border-t border-border pt-3"
                >
                  <h3 className="text-xs font-semibold text-fg">
                    Assign Cover Teacher
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <label
                        htmlFor="sub-slot-id"
                        className="block text-xs font-medium text-fg-muted"
                      >
                        Published Timetable Slot
                      </label>
                      <select
                        id="sub-slot-id"
                        name="timetableSlotId"
                        required
                        className={INPUT_CLASS}
                      >
                        {workspace.slots.map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {slot.dayLabel} {slot.periodCode} —{" "}
                            {slot.groupLabel} (
                            {slot.teacherName ?? "Unassigned"})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor="sub-date"
                        className="block text-xs font-medium text-fg-muted"
                      >
                        Substitution Date
                      </label>
                      <input
                        id="sub-date"
                        name="substitutionDate"
                        type="date"
                        required
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor="sub-teacher"
                        className="block text-xs font-medium text-fg-muted"
                      >
                        Substitute Teacher
                      </label>
                      <select
                        id="sub-teacher"
                        name="substituteTeacherPersonId"
                        required
                        className={INPUT_CLASS}
                      >
                        <option value="">Select substitute staff...</option>
                        {workspace.staffOptions.map((st) => (
                          <option key={st.personId} value={st.personId}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label
                        htmlFor="sub-reason"
                        className="block text-xs font-medium text-fg-muted"
                      >
                        Substitution Reason
                      </label>
                      <input
                        id="sub-reason"
                        name="reason"
                        type="text"
                        required
                        placeholder="e.g., Official CBSE evaluation duty"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                </RegistryActionForm>
              ) : null}
            </div>
          </Card>

          <Card
            title="Teacher Weekly Workload Summary"
            description="Derived from scheduled slots in the selected timetable version."
          >
            {workspace.workload.length === 0 ? (
              <p className="text-xs text-fg-muted">
                No teacher-assigned slots found in this timetable version.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] border-collapse text-left text-xs">
                  <caption className="sr-only">
                    Teacher weekly slot workload summary
                  </caption>
                  <thead>
                    <tr className="border-b border-border text-fg-muted">
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Teacher
                      </th>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Total Slots
                      </th>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Instructional
                      </th>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Days Taught
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {workspace.workload.map((row) => (
                      <tr key={row.teacherPersonId}>
                        <td className="py-2 pr-3 font-medium text-fg">
                          {row.teacherName}
                        </td>
                        <td className="py-2 pr-3 font-mono text-fg">
                          {row.totalSlots}
                        </td>
                        <td className="py-2 pr-3 font-mono text-fg">
                          {row.instructionalSlots}
                        </td>
                        <td className="py-2 pr-3 font-mono text-fg">
                          {row.distinctDays}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {workspace.canManageTimetable ? (
        <div className="grid grid-cols-1 gap-[var(--density-gap)] lg:grid-cols-2">
          {selectedTimetable && selectedTimetable.status === "draft" ? (
            <Card
              title="Add Draft Timetable Slot"
              description="Conflict detection blocks double-booked teachers, venues, teaching groups, and instructional section overlaps."
            >
              <RegistryActionForm
                action={boundCreateSlot}
                submitLabel="Add Slot to Draft"
                pendingLabel="Scheduling..."
              >
                <input
                  type="hidden"
                  name="timetableId"
                  value={selectedTimetable.id}
                />
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label
                      htmlFor="slot-day"
                      className="block text-xs font-medium text-fg-muted"
                    >
                      Day of Week
                    </label>
                    <select
                      id="slot-day"
                      name="dayOfWeek"
                      defaultValue="1"
                      className={INPUT_CLASS}
                    >
                      {Object.entries(DAY_OF_WEEK_LABELS).map(([num, label]) => (
                        <option key={num} value={num}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="slot-period"
                      className="block text-xs font-medium text-fg-muted"
                    >
                      Bell Period
                    </label>
                    <select
                      id="slot-period"
                      name="periodId"
                      required
                      className={INPUT_CLASS}
                    >
                      {workspace.periods.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} · {p.label} ({p.startTime.slice(0, 5)}–
                          {p.endTime.slice(0, 5)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="slot-tg"
                      className="block text-xs font-medium text-fg-muted"
                    >
                      Teaching Group (optional)
                    </label>
                    <select
                      id="slot-tg"
                      name="teachingGroupId"
                      defaultValue=""
                      className={INPUT_CLASS}
                    >
                      <option value="">None (use section)</option>
                      {workspace.teachingGroupOptions.map((tg) => (
                        <option key={tg.id} value={tg.id}>
                          {tg.code} · {tg.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="slot-section"
                      className="block text-xs font-medium text-fg-muted"
                    >
                      Section (optional)
                    </label>
                    <select
                      id="slot-section"
                      name="sectionId"
                      defaultValue=""
                      className={INPUT_CLASS}
                    >
                      <option value="">None (cross-section TG)</option>
                      {workspace.sectionOptions.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="slot-teacher"
                      className="block text-xs font-medium text-fg-muted"
                    >
                      Assigned Teacher (optional)
                    </label>
                    <select
                      id="slot-teacher"
                      name="teacherPersonId"
                      defaultValue=""
                      className={INPUT_CLASS}
                    >
                      <option value="">Unassigned</option>
                      {workspace.staffOptions.map((st) => (
                        <option key={st.personId} value={st.personId}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="slot-venue"
                      className="block text-xs font-medium text-fg-muted"
                    >
                      Venue / Room (optional)
                    </label>
                    <select
                      id="slot-venue"
                      name="venueId"
                      defaultValue=""
                      className={INPUT_CLASS}
                    >
                      <option value="">Unassigned</option>
                      {workspace.venues
                        .filter((v) => v.isActive)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.code} — {v.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label
                      htmlFor="slot-notes"
                      className="block text-xs font-medium text-fg-muted"
                    >
                      Slot Notes (optional)
                    </label>
                    <input
                      id="slot-notes"
                      name="notes"
                      type="text"
                      maxLength={500}
                      placeholder="e.g., Practical split batch A"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
              </RegistryActionForm>
            </Card>
          ) : null}

          <Card
            title="Create New Weekly Timetable Version"
            description="Author a new draft or published timetable version cleanly per session and term."
          >
            <RegistryActionForm
              action={boundCreateTimetable}
              submitLabel="Create Timetable Version"
              pendingLabel="Creating..."
            >
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="tt-code"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Code
                  </label>
                  <input
                    id="tt-code"
                    name="code"
                    type="text"
                    required
                    placeholder="e.g., TT-AY26-T2"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="tt-version"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Version No.
                  </label>
                  <input
                    id="tt-version"
                    name="versionNo"
                    type="number"
                    min={1}
                    defaultValue={1}
                    required
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label
                    htmlFor="tt-name"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Timetable Name
                  </label>
                  <input
                    id="tt-name"
                    name="name"
                    type="text"
                    required
                    placeholder="e.g., Term 2 Senior Secondary Schedule"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="tt-term"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Academic Term (optional)
                  </label>
                  <select
                    id="tt-term"
                    name="termId"
                    defaultValue=""
                    className={INPUT_CLASS}
                  >
                    <option value="">All terms in session</option>
                    {workspace.terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} — {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="tt-status"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Initial Status
                  </label>
                  <select
                    id="tt-status"
                    name="initialStatus"
                    defaultValue="draft"
                    className={INPUT_CLASS}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="tt-from"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Effective From
                  </label>
                  <input
                    id="tt-from"
                    name="effectiveFrom"
                    type="date"
                    required
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="tt-to"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Effective To (optional)
                  </label>
                  <input
                    id="tt-to"
                    name="effectiveTo"
                    type="date"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="flex items-center gap-2 pt-1 sm:col-span-2">
                  <input
                    id="tt-offline"
                    name="isOfflineCacheable"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="tt-offline" className="text-xs text-fg">
                    Allow offline client caching once published (§12.5)
                  </label>
                </div>
              </div>
            </RegistryActionForm>
          </Card>

          <Card
            title="Configure Institutional Venues"
            description="Shared rooms and labs used across weekly timetables and exam seating."
          >
            <RegistryActionForm
              action={boundCreateVenue}
              submitLabel="Add Venue"
              pendingLabel="Saving Venue..."
            >
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="venue-code"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Venue Code
                  </label>
                  <input
                    id="venue-code"
                    name="code"
                    type="text"
                    required
                    placeholder="e.g., LAB-BIO-1"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="venue-kind"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Venue Kind
                  </label>
                  <select
                    id="venue-kind"
                    name="venueKind"
                    defaultValue="classroom"
                    className={INPUT_CLASS}
                  >
                    {VENUE_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label
                    htmlFor="venue-name"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Venue Name
                  </label>
                  <input
                    id="venue-name"
                    name="name"
                    type="text"
                    required
                    placeholder="e.g., Senior Biology Lab"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="venue-capacity"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Capacity (optional)
                  </label>
                  <input
                    id="venue-capacity"
                    name="capacity"
                    type="number"
                    min={1}
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="venue-building"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Building / Floor (optional)
                  </label>
                  <input
                    id="venue-building"
                    name="building"
                    type="text"
                    placeholder="e.g., Science Block"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="flex items-center gap-2 pt-1 sm:col-span-2">
                  <input
                    id="venue-active"
                    name="isActive"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="venue-active" className="text-xs text-fg">
                    Venue is active for scheduling
                  </label>
                </div>
              </div>
            </RegistryActionForm>
          </Card>

          <Card
            title="Configure Bell-Schedule Periods"
            description="Ordered instructional, break, assembly, and activity time blocks."
          >
            <RegistryActionForm
              action={boundCreatePeriod}
              submitLabel="Add Bell Period"
              pendingLabel="Saving Period..."
            >
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="period-code"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Period Code
                  </label>
                  <input
                    id="period-code"
                    name="code"
                    type="text"
                    required
                    placeholder="e.g., P3"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="period-kind"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Period Kind
                  </label>
                  <select
                    id="period-kind"
                    name="periodKind"
                    defaultValue="instructional"
                    className={INPUT_CLASS}
                  >
                    {TIMETABLE_PERIOD_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="period-label"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Display Label
                  </label>
                  <input
                    id="period-label"
                    name="label"
                    type="text"
                    required
                    placeholder="e.g., Period 3"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="period-seq"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Sequence No.
                  </label>
                  <input
                    id="period-seq"
                    name="sequenceNo"
                    type="number"
                    min={1}
                    defaultValue={workspace.periods.length + 1}
                    required
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="period-start"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Start Time (24h)
                  </label>
                  <input
                    id="period-start"
                    name="startTime"
                    type="time"
                    required
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="period-end"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    End Time (24h)
                  </label>
                  <input
                    id="period-end"
                    name="endTime"
                    type="time"
                    required
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </RegistryActionForm>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
