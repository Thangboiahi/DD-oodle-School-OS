import Link from "next/link";
import {
  acknowledgeHandbookEntryAction,
  archiveHandbookEntryAction,
  createHandbookEntryAction,
  updateHandbookEntryAction,
} from "@/app/t/[slug]/handbook/actions";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import type { AttendanceShortageStatus } from "@/lib/attendance/rules";
import {
  HANDBOOK_CATEGORY_META,
  HANDBOOK_VISIBILITY_META,
} from "@/lib/handbook/rules";
import {
  HANDBOOK_CATEGORIES,
  type HandbookCategory,
  type HandbookVisibilityScope,
} from "@/lib/handbook/schemas";
import { getStudentHandbookDetail } from "@/server/handbook/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface StudentHandbookPageProps {
  params: Promise<{ slug: string; studentProfileId: string }>;
  searchParams: Promise<{ category?: string; archived?: string }>;
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

function categoryTone(category: HandbookCategory): BadgeTone {
  if (category === "disciplinary") return "danger";
  if (category === "student_support") return "warning";
  return "accent";
}

function visibilityTone(scope: HandbookVisibilityScope): BadgeTone {
  if (scope === "leadership_only") return "danger";
  if (scope === "class_teacher_and_leadership") return "warning";
  return "neutral";
}

export default async function StudentHandbookDetailPage({
  params,
  searchParams,
}: StudentHandbookPageProps) {
  const { slug, studentProfileId } = await params;
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
  const directoryHref = `/t/${encodeURIComponent(context.institutionSlug)}/handbook`;
  const detail = await getStudentHandbookDetail(context, studentProfileId, {
    categoryFilter: query.category,
    includeArchived: query.archived === "1",
  });

  if (detail.status === "denied") {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <StateNotice
          kind="permission-denied"
          title="Student handbook access denied"
          description={detail.reason}
          action={
            <Link
              href={directoryHref}
              className="inline-flex min-h-10 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
            >
              ← Back to Handbook Directory
            </Link>
          }
        />
      </div>
    );
  }

  if (detail.status === "not-found") {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <StateNotice
          kind="empty"
          title="Student handbook not found"
          description="The requested student profile does not exist in this institution or is outside your access scope."
          action={
            <Link
              href={directoryHref}
              className="inline-flex min-h-10 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
            >
              ← Back to Handbook Directory
            </Link>
          }
        />
      </div>
    );
  }

  const detailPath = `${directoryHref}/${encodeURIComponent(detail.student.id)}`;
  const boundCreateEntry = createHandbookEntryAction.bind(
    null,
    context.institutionSlug,
    detail.student.id,
  );

  // Only show sensitive category tabs when matching entries are visible or caller can author them
  const visibleCategoriesInEntries = new Set(
    detail.entries.map((e) => e.category),
  );
  const filterCategories = HANDBOOK_CATEGORIES.filter((cat) => {
    if (!HANDBOOK_CATEGORY_META[cat].isSensitive) return true;
    return (
      visibleCategoriesInEntries.has(cat) ||
      detail.authoringPolicy.allowedCategories.includes(cat)
    );
  });

  const buildFilterHref = (nextCategory: string, nextArchived: boolean) => {
    const paramsObj = new URLSearchParams();
    if (nextCategory !== "all") paramsObj.set("category", nextCategory);
    if (nextArchived) paramsObj.set("archived", "1");
    const qs = paramsObj.toString();
    return qs ? `${detailPath}?${qs}` : detailPath;
  };

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={directoryHref}
          className="inline-flex min-h-9 items-center rounded-md border border-border-subtle bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
        >
          ← Back to Handbook Directory
        </Link>
        {detail.isMonitorSelfView ? (
          <Badge tone="accent">Self Student Handbook</Badge>
        ) : null}
      </div>

      <Card
        title={`${detail.student.fullName} — Digital Student Handbook`}
        description={`${detail.student.admissionNumber}${
          detail.student.gradeCode || detail.student.sectionCode
            ? ` • ${detail.student.gradeCode ?? ""} ${detail.student.sectionCode ?? ""}`.trim()
            : ""
        }${detail.student.streamName ? ` • ${detail.student.streamName}` : ""}${
          detail.student.rollNumber ? ` • Roll #${detail.student.rollNumber}` : ""
        }${detail.student.sessionName ? ` • ${detail.student.sessionName}` : ""}`}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border-subtle bg-elevated p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-fg">
                Live Attendance Summary
              </span>
              <Badge tone={shortageTone(detail.attendance.summary.status)}>
                {detail.attendance.summary.percentage === null
                  ? "No Data"
                  : `${detail.attendance.summary.percentage}% (${detail.attendance.summary.status})`}
              </Badge>
            </div>
            <p className="mt-1 text-fg-muted">
              Policy: Min {detail.attendance.policyMinimumPercent}% / Warning{" "}
              {detail.attendance.policyWarningPercent}%
            </p>
            <p className="mt-1 font-mono text-[11px] text-fg">
              Present: {detail.attendance.summary.presentCount} • Late:{" "}
              {detail.attendance.summary.lateCount} • Half-Day:{" "}
              {detail.attendance.summary.halfDayCount} • Absent:{" "}
              {detail.attendance.summary.absentCount} (Total:{" "}
              {detail.attendance.summary.totalMarked})
            </p>
          </div>

          <div className="rounded-md border border-border-subtle bg-elevated p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-fg">
                Live Leave &amp; Parent Notices
              </span>
              <Badge tone="neutral">
                {detail.leaves.length} leave(s) • {detail.parentNotices.length}{" "}
                notice(s)
              </Badge>
            </div>
            <p className="mt-1 text-fg-muted">
              Assembled live from authoritative leave and guardian notice tables
              under caller PostgreSQL RLS.
            </p>
          </div>
        </div>
      </Card>

      {detail.authoringPolicy.canCreateEntry ? (
        <Card
          title="Record Handbook Entry"
          description="Entries are partitioned cleanly by category and visibility_scope. Sensitive categories never default to student/guardian visibility unless explicitly selected by authorized staff."
        >
          <RegistryActionForm
            action={boundCreateEntry}
            submitLabel="Record Handbook Entry"
            pendingLabel="Recording..."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="handbook-entry-category"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Category
                </label>
                <select
                  id="handbook-entry-category"
                  name="category"
                  defaultValue={detail.authoringPolicy.allowedCategories[0]}
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  {detail.authoringPolicy.allowedCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {HANDBOOK_CATEGORY_META[cat].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="handbook-entry-visibility"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Visibility Scope
                </label>
                <select
                  id="handbook-entry-visibility"
                  name="visibilityScope"
                  defaultValue={
                    detail.authoringPolicy.allowedVisibilityScopes[0]
                  }
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  {detail.authoringPolicy.allowedVisibilityScopes.map(
                    (scope) => (
                      <option key={scope} value={scope}>
                        {HANDBOOK_VISIBILITY_META[scope].shortLabel}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {detail.assignedTeachingGroups.length > 0 ? (
                <div>
                  <label
                    htmlFor="handbook-entry-tg"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Teaching Group{" "}
                    {detail.authoringPolicy.requiresTeachingGroupSelection
                      ? "(Required)"
                      : "(Optional)"}
                  </label>
                  <select
                    id="handbook-entry-tg"
                    name="teachingGroupId"
                    required={
                      detail.authoringPolicy.requiresTeachingGroupSelection
                    }
                    defaultValue={
                      detail.authoringPolicy.requiresTeachingGroupSelection
                        ? (detail.assignedTeachingGroups[0]?.id ?? "")
                        : ""
                    }
                    className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                  >
                    {!detail.authoringPolicy.requiresTeachingGroupSelection ? (
                      <option value="">None (Section / General)</option>
                    ) : null}
                    {detail.assignedTeachingGroups.map((tg) => (
                      <option key={tg.id} value={tg.id}>
                        {tg.code} — {tg.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="sm:col-span-2 lg:col-span-3">
                <label
                  htmlFor="handbook-entry-title"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Entry Title (3–160 chars)
                </label>
                <input
                  id="handbook-entry-title"
                  name="title"
                  type="text"
                  required
                  minLength={3}
                  maxLength={160}
                  placeholder="Unit 2 applied math problem-solving feedback"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label
                  htmlFor="handbook-entry-body"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Observation / Note Body (5–4000 chars)
                </label>
                <textarea
                  id="handbook-entry-body"
                  name="body"
                  required
                  minLength={5}
                  maxLength={4000}
                  rows={3}
                  placeholder="Structured classroom observation, support action plan, or notice summary..."
                  className="w-full rounded-md border border-border-strong bg-surface p-2.5 text-xs text-fg"
                />
              </div>
            </div>
          </RegistryActionForm>
        </Card>
      ) : null}

      <Card
        title="Category-Partitioned Handbook Entries"
        description="Entries visible strictly for your active role and relationship under PostgreSQL RLS."
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2.5">
            <nav
              aria-label="Handbook category filter"
              className="flex flex-wrap items-center gap-1.5"
            >
              <Link
                href={buildFilterHref("all", detail.includeArchived)}
                aria-current={detail.categoryFilter === "all" ? "page" : undefined}
                className={[
                  "inline-flex min-h-8 items-center rounded border px-2.5 text-xs font-medium",
                  detail.categoryFilter === "all"
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border-subtle bg-surface text-fg hover:bg-elevated",
                ].join(" ")}
              >
                All
              </Link>
              {filterCategories.map((cat) => {
                const isCurrent = detail.categoryFilter === cat;
                return (
                  <Link
                    key={cat}
                    href={buildFilterHref(cat, detail.includeArchived)}
                    aria-current={isCurrent ? "page" : undefined}
                    className={[
                      "inline-flex min-h-8 items-center rounded border px-2.5 text-xs font-medium",
                      isCurrent
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-border-subtle bg-surface text-fg hover:bg-elevated",
                    ].join(" ")}
                  >
                    {HANDBOOK_CATEGORY_META[cat].label}
                  </Link>
                );
              })}
            </nav>

            <Link
              href={buildFilterHref(
                detail.categoryFilter,
                !detail.includeArchived,
              )}
              className="text-xs font-medium text-accent hover:underline"
            >
              {detail.includeArchived ? "Hide Archived" : "Include Archived"}
            </Link>
          </div>

          {detail.entries.length === 0 ? (
            <StateNotice
              kind="empty"
              title="No visible handbook entries"
              description="No active handbook entries match this category filter within your role visibility scope."
            />
          ) : (
            <div className="space-y-3">
              {detail.entries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-lg border border-border-subtle bg-elevated p-3 text-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-fg">
                        {entry.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={categoryTone(entry.category)}>
                          {HANDBOOK_CATEGORY_META[entry.category].label}
                        </Badge>
                        <Badge tone={visibilityTone(entry.visibilityScope)}>
                          {
                            HANDBOOK_VISIBILITY_META[entry.visibilityScope]
                              .shortLabel
                          }
                        </Badge>
                        {entry.teachingGroupLabel ? (
                          <Badge tone="neutral">
                            {entry.teachingGroupLabel}
                          </Badge>
                        ) : null}
                        {entry.status === "archived" ? (
                          <Badge tone="neutral">Archived</Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-fg-muted">
                      <div>By {entry.authoredByName}</div>
                      <div className="font-mono">
                        {entry.createdAt.slice(0, 10)}
                      </div>
                    </div>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap leading-relaxed text-fg">
                    {entry.body}
                  </p>

                  {entry.acknowledgedByGuardianAt ? (
                    <div className="mt-2 text-[11px] font-medium text-status-success">
                      Guardian acknowledged
                      {entry.acknowledgedByGuardianName
                        ? ` by ${entry.acknowledgedByGuardianName}`
                        : ""}{" "}
                      ({entry.acknowledgedByGuardianAt.slice(0, 10)})
                    </div>
                  ) : null}

                  {entry.canAcknowledge || entry.canEdit || entry.canArchive ? (
                    <div className="mt-3 flex flex-wrap items-start gap-3 border-t border-border-subtle pt-2.5">
                      {entry.canAcknowledge ? (
                        <RegistryActionForm
                          action={acknowledgeHandbookEntryAction.bind(
                            null,
                            context.institutionSlug,
                            detail.student.id,
                            entry.id,
                          )}
                          submitLabel="Acknowledge as Guardian"
                          pendingLabel="Acknowledging..."
                          submitVariant="primary"
                          className="inline-flex flex-col gap-1"
                        >
                          <span className="sr-only">
                            Acknowledge handbook entry {entry.title}
                          </span>
                        </RegistryActionForm>
                      ) : null}

                      {entry.canArchive ? (
                        <RegistryActionForm
                          action={archiveHandbookEntryAction.bind(
                            null,
                            context.institutionSlug,
                            detail.student.id,
                            entry.id,
                          )}
                          submitLabel="Archive Entry"
                          pendingLabel="Archiving..."
                          submitVariant="secondary"
                          className="inline-flex flex-col gap-1"
                        >
                          <span className="sr-only">
                            Archive handbook entry {entry.title}
                          </span>
                        </RegistryActionForm>
                      ) : null}

                      {entry.canEdit ? (
                        <details className="w-full rounded-md border border-border-subtle bg-surface p-2.5">
                          <summary className="cursor-pointer font-medium text-fg">
                            Edit Entry
                          </summary>
                          <div className="mt-2">
                            <RegistryActionForm
                              action={updateHandbookEntryAction.bind(
                                null,
                                context.institutionSlug,
                                detail.student.id,
                                entry.id,
                              )}
                              submitLabel="Save Changes"
                              pendingLabel="Updating..."
                            >
                              <div className="grid gap-2.5 sm:grid-cols-2">
                                <div>
                                  <label
                                    htmlFor={`edit-title-${entry.id}`}
                                    className="mb-1 block text-xs font-medium text-fg"
                                  >
                                    Title
                                  </label>
                                  <input
                                    id={`edit-title-${entry.id}`}
                                    name="title"
                                    type="text"
                                    required
                                    minLength={3}
                                    maxLength={160}
                                    defaultValue={entry.title}
                                    className="min-h-9 w-full rounded border border-border-strong bg-surface px-2 text-xs text-fg"
                                  />
                                </div>

                                {detail.authoringPolicy.allowedVisibilityScopes
                                  .length > 0 ? (
                                  <div>
                                    <label
                                      htmlFor={`edit-scope-${entry.id}`}
                                      className="mb-1 block text-xs font-medium text-fg"
                                    >
                                      Visibility Scope
                                    </label>
                                    <select
                                      id={`edit-scope-${entry.id}`}
                                      name="visibilityScope"
                                      defaultValue={entry.visibilityScope}
                                      className="min-h-9 w-full rounded border border-border-strong bg-surface px-2 text-xs text-fg"
                                    >
                                      {detail.authoringPolicy.allowedVisibilityScopes.map(
                                        (scope) => (
                                          <option key={scope} value={scope}>
                                            {
                                              HANDBOOK_VISIBILITY_META[scope]
                                                .shortLabel
                                            }
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  </div>
                                ) : null}

                                <div className="sm:col-span-2">
                                  <label
                                    htmlFor={`edit-body-${entry.id}`}
                                    className="mb-1 block text-xs font-medium text-fg"
                                  >
                                    Body
                                  </label>
                                  <textarea
                                    id={`edit-body-${entry.id}`}
                                    name="body"
                                    required
                                    minLength={5}
                                    maxLength={4000}
                                    rows={3}
                                    defaultValue={entry.body}
                                    className="w-full rounded border border-border-strong bg-surface p-2 text-xs text-fg"
                                  />
                                </div>
                              </div>
                            </RegistryActionForm>
                          </div>
                        </details>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-[var(--density-gap)] lg:grid-cols-2">
        <Card
          title="Recent Daily Attendance Log"
          description="Latest 10 authoritative daily attendance records visible in your scope."
        >
          {detail.attendance.recentRecords.length === 0 ? (
            <p className="text-xs text-fg-muted">
              No daily attendance records recorded for the active session yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border-subtle">
              <table className="w-full min-w-[26rem] divide-y divide-border-subtle text-left text-xs">
                <thead className="bg-elevated text-fg-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface">
                  {detail.attendance.recentRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td className="px-3 py-2 font-mono text-[11px] text-fg-muted">
                        {rec.attendanceDate}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone="neutral">{rec.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-fg-muted">
                        {rec.verificationStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Leave & Parent Notice Timeline"
          description="Visible leave requests and guardian notices for this student."
        >
          {detail.leaves.length === 0 && detail.parentNotices.length === 0 ? (
            <p className="text-xs text-fg-muted">
              No leave requests or parent notices visible in your current role
              scope.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              {detail.leaves.map((l) => (
                <div
                  key={l.id}
                  className="rounded-md border border-border-subtle bg-elevated p-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-fg-muted">
                      {l.startsOn} → {l.endsOn} ({l.inclusiveDays} d)
                    </span>
                    <div className="flex gap-1">
                      <Badge tone="accent">{l.leaveType}</Badge>
                      <Badge tone="neutral">{l.status}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-fg">{l.reason}</p>
                </div>
              ))}
              {detail.parentNotices.map((n) => (
                <div
                  key={n.id}
                  className="rounded-md border border-border-subtle bg-elevated p-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-fg-muted">
                      {n.attendanceDate} • {n.guardianName}
                    </span>
                    <div className="flex gap-1">
                      <Badge tone="accent">{n.noticeKind}</Badge>
                      <Badge tone="neutral">{n.status}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-fg">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card
        title="Upcoming Handbook Sections (ADR-0006 Extension Seams)"
        description="Authoritative Phase 4 & Phase 6 module sections integrate live at read time without schema duplication."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {detail.extensionSeams.map((seam) => (
            <div
              key={seam.id}
              className="rounded-md border border-border-subtle bg-elevated p-3 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-fg">{seam.title}</span>
                <Badge tone="neutral">{seam.phase}</Badge>
              </div>
              <p className="mt-1 text-fg-muted">{seam.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
