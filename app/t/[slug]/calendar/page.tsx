import Link from "next/link";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { canTransitionCalendarEventStatus } from "@/lib/timetable/rules";
import {
  CALENDAR_EVENT_KINDS,
  CALENDAR_SCOPE_TYPES,
  type CalendarEventKind,
  type CalendarEventStatus,
  type CalendarScopeType,
} from "@/lib/timetable/schemas";
import { getAcademicCalendarWorkspace } from "@/server/timetable/service";
import {
  createCalendarEventAction,
  updateCalendarEventStatusAction,
} from "@/app/t/[slug]/timetable/actions";

export const dynamic = "force-dynamic";

interface AcademicCalendarPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    scope?: string;
    kind?: string;
  }>;
}

function eventStatusTone(status: CalendarEventStatus): BadgeTone {
  if (status === "published") return "success";
  if (status === "draft") return "accent";
  return "neutral";
}

function scopeTone(scope: CalendarScopeType): BadgeTone {
  if (scope === "institution") return "accent";
  if (scope === "department") return "success";
  return "neutral";
}

function formatKindLabel(kind: CalendarEventKind): string {
  return kind.replace(/_/g, " ");
}

const INPUT_CLASS =
  "w-full min-w-0 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

export default async function InstitutionAcademicCalendarPage({
  params,
  searchParams,
}: AcademicCalendarPageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const workspace = await getAcademicCalendarWorkspace(slug, {
    scopeFilter: query.scope,
    kindFilter: query.kind,
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

  const { context } = workspace;
  const calendarPath = `/t/${encodeURIComponent(context.institutionSlug)}/calendar`;
  const timetablePath = `/t/${encodeURIComponent(context.institutionSlug)}/timetable`;
  const boundCreateEvent = createCalendarEventAction.bind(
    null,
    context.institutionSlug,
  );

  const allowedScopeChoices: CalendarScopeType[] = [
    ...(workspace.canCreateInstitution ? (["institution"] as const) : []),
    ...(workspace.departmentOptions.length > 0 ? (["department"] as const) : []),
    ...(workspace.sectionOptions.length > 0 ? (["section"] as const) : []),
  ];

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <Card
        title="Scoped Academic Calendar"
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
                <Badge tone="neutral">Published institutional calendar</Badge>
              ) : null}
              <Badge tone="accent">{workspace.events.length} Event(s)</Badge>
            </div>
            <Link
              href={timetablePath}
              className="inline-flex items-center rounded-md border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:border-accent"
            >
              Back to Weekly Timetable
            </Link>
          </div>

          <form
            method="GET"
            action={calendarPath}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="min-w-[160px] space-y-1">
              <label
                htmlFor="calendar-scope-filter"
                className="block text-xs font-medium text-fg-muted"
              >
                Scope Filter
              </label>
              <select
                id="calendar-scope-filter"
                name="scope"
                defaultValue={workspace.scopeFilter}
                className={INPUT_CLASS}
              >
                <option value="all">All Scopes</option>
                {CALENDAR_SCOPE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[180px] space-y-1">
              <label
                htmlFor="calendar-kind-filter"
                className="block text-xs font-medium text-fg-muted"
              >
                Event Kind Filter
              </label>
              <select
                id="calendar-kind-filter"
                name="kind"
                defaultValue={workspace.kindFilter}
                className={INPUT_CLASS}
              >
                <option value="all">All Event Kinds</option>
                {CALENDAR_EVENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {formatKindLabel(k)}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" variant="secondary" size="sm">
              Filter Calendar
            </Button>
          </form>

          {workspace.events.length === 0 ? (
            <StateNotice
              kind="empty"
              title="No calendar events matched"
              description="Try clearing filters or add a scoped academic calendar event below."
            />
          ) : (
            <ol className="space-y-3">
              {workspace.events.map((ev) => (
                <li
                  key={ev.id}
                  className="rounded-lg border border-border bg-elevated/40 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-fg">
                          {ev.startsOn}
                          {ev.endsOn !== ev.startsOn ? ` → ${ev.endsOn}` : ""}
                        </span>
                        <Badge tone={scopeTone(ev.scopeType)}>
                          {ev.scopeType}: {ev.scopeLabel}
                        </Badge>
                        <Badge tone="neutral">
                          {formatKindLabel(ev.eventKind)}
                        </Badge>
                        {ev.isNonInstructional ? (
                          <Badge tone="danger">Non-instructional</Badge>
                        ) : null}
                        <Badge tone={eventStatusTone(ev.status)}>
                          {ev.status}
                        </Badge>
                        {ev.termCode ? (
                          <Badge tone="neutral">{ev.termCode}</Badge>
                        ) : null}
                      </div>
                      <h2 className="break-words text-sm font-semibold text-fg">
                        {ev.title}
                      </h2>
                      {ev.description ? (
                        <p className="break-words text-xs text-fg-muted">
                          {ev.description}
                        </p>
                      ) : null}
                      <p className="text-[11px] text-fg-muted">
                        Recorded by {ev.authoredByName}
                      </p>
                    </div>

                    {ev.canUpdateStatus ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {canTransitionCalendarEventStatus(
                          ev.status,
                          "published",
                        ) ? (
                          <RegistryActionForm
                            action={updateCalendarEventStatusAction.bind(
                              null,
                              context.institutionSlug,
                              ev.id,
                              "published",
                            )}
                            submitLabel="Publish Event"
                            pendingLabel="Publishing..."
                            submitVariant="secondary"
                            className="inline-flex flex-wrap items-center gap-1.5"
                          >
                            <span className="sr-only">
                              Publish calendar event {ev.title}
                            </span>
                          </RegistryActionForm>
                        ) : null}
                        {canTransitionCalendarEventStatus(
                          ev.status,
                          "cancelled",
                        ) ? (
                          <RegistryActionForm
                            action={updateCalendarEventStatusAction.bind(
                              null,
                              context.institutionSlug,
                              ev.id,
                              "cancelled",
                            )}
                            submitLabel="Cancel Event"
                            pendingLabel="Cancelling..."
                            submitVariant="secondary"
                            className="inline-flex flex-wrap items-center gap-1.5"
                          >
                            <span className="sr-only">
                              Cancel calendar event {ev.title}
                            </span>
                          </RegistryActionForm>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Card>

      {workspace.canCreateEvent && workspace.activeSession ? (
        <Card
          title="Add Calendar Event"
          description="Publish institution-wide holidays/events, department milestones, or section-level parent meetings within your authority."
        >
          <RegistryActionForm
            action={boundCreateEvent}
            submitLabel="Save Calendar Event"
            pendingLabel="Saving Event..."
          >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="cal-scope"
                  className="block text-xs font-medium text-fg-muted"
                >
                  Scope Type
                </label>
                <select
                  id="cal-scope"
                  name="scopeType"
                  defaultValue={allowedScopeChoices[0] ?? "institution"}
                  className={INPUT_CLASS}
                >
                  {allowedScopeChoices.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="cal-kind"
                  className="block text-xs font-medium text-fg-muted"
                >
                  Event Kind
                </label>
                <select
                  id="cal-kind"
                  name="eventKind"
                  defaultValue="event"
                  className={INPUT_CLASS}
                >
                  {CALENDAR_EVENT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {formatKindLabel(k)}
                    </option>
                  ))}
                </select>
              </div>

              {workspace.departmentOptions.length > 0 ? (
                <div className="space-y-1">
                  <label
                    htmlFor="cal-dept"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Department (only when scope = department)
                  </label>
                  <select
                    id="cal-dept"
                    name="departmentId"
                    defaultValue=""
                    className={INPUT_CLASS}
                  >
                    <option value="">None</option>
                    {workspace.departmentOptions.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.code} — {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {workspace.sectionOptions.length > 0 ? (
                <div className="space-y-1">
                  <label
                    htmlFor="cal-section"
                    className="block text-xs font-medium text-fg-muted"
                  >
                    Section (only when scope = section)
                  </label>
                  <select
                    id="cal-section"
                    name="sectionId"
                    defaultValue=""
                    className={INPUT_CLASS}
                  >
                    <option value="">None</option>
                    {workspace.sectionOptions.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="space-y-1">
                <label
                  htmlFor="cal-term"
                  className="block text-xs font-medium text-fg-muted"
                >
                  Academic Term (optional)
                </label>
                <select
                  id="cal-term"
                  name="termId"
                  defaultValue=""
                  className={INPUT_CLASS}
                >
                  <option value="">Session-wide</option>
                  {workspace.terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="cal-status"
                  className="block text-xs font-medium text-fg-muted"
                >
                  Publication Status
                </label>
                <select
                  id="cal-status"
                  name="status"
                  defaultValue="published"
                  className={INPUT_CLASS}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label
                  htmlFor="cal-title"
                  className="block text-xs font-medium text-fg-muted"
                >
                  Event Title
                </label>
                <input
                  id="cal-title"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g., Senior Secondary PTM & Progress Review"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="cal-starts-on"
                  className="block text-xs font-medium text-fg-muted"
                >
                  Starts On
                </label>
                <input
                  id="cal-starts-on"
                  name="startsOn"
                  type="date"
                  required
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="cal-ends-on"
                  className="block text-xs font-medium text-fg-muted"
                >
                  Ends On
                </label>
                <input
                  id="cal-ends-on"
                  name="endsOn"
                  type="date"
                  required
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label
                  htmlFor="cal-description"
                  className="block text-xs font-medium text-fg-muted"
                >
                  Description (optional)
                </label>
                <textarea
                  id="cal-description"
                  name="description"
                  rows={2}
                  maxLength={2000}
                  placeholder="Optional operational details for staff, students, and guardians."
                  className={INPUT_CLASS}
                />
              </div>

              <div className="flex items-center gap-2 pt-1 sm:col-span-2">
                <input
                  id="cal-non-instructional"
                  name="isNonInstructional"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                />
                <label
                  htmlFor="cal-non-instructional"
                  className="text-xs text-fg"
                >
                  Mark as non-instructional day (holiday / full break)
                </label>
              </div>
            </div>
          </RegistryActionForm>
        </Card>
      ) : null}
    </div>
  );
}
