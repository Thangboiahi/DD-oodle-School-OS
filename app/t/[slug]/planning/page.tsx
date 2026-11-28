import Link from "next/link";
import {
  createSyllabusItemAction,
  updateSyllabusProgressAction,
  updateTermStatusAction,
} from "@/app/t/[slug]/planning/actions";
import { PlanningSubNav } from "@/components/planning/PlanningSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import {
  ACADEMIC_TERM_STATUSES,
  SYLLABUS_ITEM_KINDS,
  SYLLABUS_PROGRESS_STATUSES,
  type AcademicTermStatus,
  type SyllabusProgressStatus,
} from "@/lib/planning/schemas";
import {
  getSyllabusWorkspace,
  type SyllabusTreeItemDto,
} from "@/server/planning/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface SyllabusPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    offering?: string;
    term?: string;
    status?: string;
  }>;
}

function progressTone(status: SyllabusProgressStatus): BadgeTone {
  if (status === "completed" || status === "revised") return "success";
  if (status === "in_progress") return "accent";
  if (status === "delayed") return "danger";
  return "neutral";
}

function termTone(status: AcademicTermStatus): BadgeTone {
  if (status === "active") return "success";
  if (status === "completed") return "neutral";
  return "accent";
}

function flattenTreeWithDepth(
  nodes: readonly SyllabusTreeItemDto[],
  depth = 0,
): { node: SyllabusTreeItemDto; depth: number }[] {
  const rows: { node: SyllabusTreeItemDto; depth: number }[] = [];
  for (const node of nodes) {
    rows.push({ node, depth });
    if (node.children.length > 0) {
      rows.push(...flattenTreeWithDepth(node.children, depth + 1));
    }
  }
  return rows;
}

export default async function AcademicPlanningSyllabusPage({
  params,
  searchParams,
}: SyllabusPageProps) {
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
  const workspace = await getSyllabusWorkspace(context, {
    subjectOfferingId: query.offering,
    termId: query.term,
    statusFilter: query.status,
  });

  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/planning`;
  const boundCreateItem = createSyllabusItemAction.bind(
    null,
    context.institutionSlug,
  );
  const flatTreeRows = flattenTreeWithDepth(workspace.tree);
  const parentCandidates = workspace.flatItems.filter(
    (item) => item.itemKind === "unit" || item.itemKind === "chapter",
  );

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <PlanningSubNav
        slug={context.institutionSlug}
        activeTab="syllabus"
        canAccessLessonPlans={workspace.access.canAccessLessonPlans}
        canAccessOversight={workspace.access.canAccessOversight}
      />

      <Card
        title="Academic Planning & CBSE Syllabus Tracker"
        description={
          workspace.activeSession
            ? `Active Session: ${workspace.activeSession.name} (${workspace.activeSession.code})`
            : "No active academic session configured for this institution."
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">
              {workspace.rollup.completionPercent}% Complete
            </Badge>
            <Badge tone={workspace.rollup.delayed > 0 ? "danger" : "neutral"}>
              {workspace.rollup.delayed} Delayed
            </Badge>
          </div>
          <div
            role="note"
            className="rounded-md border border-border-subtle bg-elevated px-3 py-2 text-xs text-fg-muted"
          >
            NCERT / CBSE syllabus units below support institutional pacing and
            carry-forward tracking. Verify official current-year board
            circulars at{" "}
            <span className="font-mono text-fg">cbseacademic.nic.in</span> before
            finalizing board assessments.
          </div>

          <form
            method="get"
            action={basePath}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-1">
              <label
                htmlFor="filter-offering"
                className="block text-xs font-medium text-fg"
              >
                Subject Offering
              </label>
              <select
                id="filter-offering"
                name="offering"
                defaultValue={workspace.selectedOfferingId}
                className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg focus-visible:outline-2 focus-visible:outline-accent"
              >
                {workspace.offerings.map((offering) => (
                  <option key={offering.id} value={offering.id}>
                    {offering.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="filter-term"
                className="block text-xs font-medium text-fg"
              >
                Term
              </label>
              <select
                id="filter-term"
                name="term"
                defaultValue={workspace.selectedTermId}
                className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg focus-visible:outline-2 focus-visible:outline-accent"
              >
                <option value="all">All terms</option>
                {workspace.terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} ({term.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="filter-status"
                className="block text-xs font-medium text-fg"
              >
                Progress Filter
              </label>
              <select
                id="filter-status"
                name="status"
                defaultValue={workspace.statusFilter}
                className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg focus-visible:outline-2 focus-visible:outline-accent"
              >
                <option value="all">All statuses</option>
                {SYLLABUS_PROGRESS_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" size="sm" variant="primary">
                Apply Filter
              </Button>
              <Link
                href={basePath}
                className="inline-flex min-h-9 items-center rounded-md border border-border-subtle px-3 text-xs font-medium text-fg hover:bg-elevated"
              >
                Reset
              </Link>
            </div>
          </form>

          <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
            <div className="rounded-md border border-border-subtle bg-elevated p-2">
              <dt className="text-fg-muted">Total Items</dt>
              <dd className="text-base font-semibold text-fg">
                {workspace.rollup.total}
              </dd>
            </div>
            <div className="rounded-md border border-border-subtle bg-elevated p-2">
              <dt className="text-fg-muted">Completed / Revised</dt>
              <dd className="text-base font-semibold text-status-success">
                {workspace.rollup.completed + workspace.rollup.revised}
              </dd>
            </div>
            <div className="rounded-md border border-border-subtle bg-elevated p-2">
              <dt className="text-fg-muted">In Progress</dt>
              <dd className="text-base font-semibold text-accent">
                {workspace.rollup.inProgress}
              </dd>
            </div>
            <div className="rounded-md border border-border-subtle bg-elevated p-2">
              <dt className="text-fg-muted">Not Started</dt>
              <dd className="text-base font-semibold text-fg">
                {workspace.rollup.notStarted}
              </dd>
            </div>
            <div className="rounded-md border border-border-subtle bg-elevated p-2">
              <dt className="text-fg-muted">Delayed</dt>
              <dd className="text-base font-semibold text-status-danger">
                {workspace.rollup.delayed}
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      {workspace.terms.length > 0 ? (
        <Card
          title="Academic Terms & Lifecycle"
          description="Terms anchor syllabus pacing windows for the active academic session."
        >
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {workspace.terms.map((term) => {
              const boundTermAction = updateTermStatusAction.bind(
                null,
                context.institutionSlug,
                term.id,
              );
              return (
                <div
                  key={term.id}
                  className="rounded-md border border-border-subtle bg-elevated p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-fg">
                        {term.name} ({term.code})
                      </p>
                      <p className="text-[11px] text-fg-muted">
                        {term.startsOn} to {term.endsOn}
                      </p>
                    </div>
                    <Badge tone={termTone(term.status)}>{term.status}</Badge>
                  </div>
                  {workspace.access.canManageTerms ? (
                    <RegistryActionForm
                      action={boundTermAction}
                      submitLabel="Update Term"
                      submitVariant="secondary"
                      className="flex flex-wrap items-end gap-2"
                    >
                      <div className="min-w-28 flex-1 space-y-1">
                        <label
                          htmlFor={`term-status-${term.id}`}
                          className="block text-[11px] font-medium text-fg-muted"
                        >
                          Term Lifecycle Status
                        </label>
                        <select
                          id={`term-status-${term.id}`}
                          name="status"
                          defaultValue={term.status}
                          className="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-fg"
                        >
                          {ACADEMIC_TERM_STATUSES.map((statusOption) => (
                            <option key={statusOption} value={statusOption}>
                              {statusOption}
                            </option>
                          ))}
                        </select>
                      </div>
                    </RegistryActionForm>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Card
        title="Syllabus Hierarchy (Unit → Chapter → Topic)"
        description="Structured syllabus sequence with inline teacher progress tracking and delay carry-forward notes."
      >
        {flatTreeRows.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No syllabus items found"
            description="Adjust filters or add a syllabus Unit, Chapter, or Topic for this subject offering."
          />
        ) : (
          <div className="space-y-2.5">
            {flatTreeRows.map(({ node, depth }) => {
              const boundUpdate = updateSyllabusProgressAction.bind(
                null,
                context.institutionSlug,
                node.id,
              );
              const indentClass =
                depth === 0 ? "" : depth === 1 ? "sm:ml-4" : "sm:ml-8";

              return (
                <div
                  key={node.id}
                  className={[
                    "rounded-md border border-border-subtle bg-elevated p-3 space-y-2",
                    indentClass,
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral">{node.itemKind}</Badge>
                        <span className="font-mono text-xs text-fg-muted">
                          {node.code}
                        </span>
                        <h3 className="text-sm font-semibold text-fg">
                          {node.title}
                        </h3>
                      </div>
                      {node.description ? (
                        <p className="text-xs text-fg-muted">
                          {node.description}
                        </p>
                      ) : null}
                      <p className="text-[11px] text-fg-muted">
                        Seq {node.sequenceNo}
                        {node.termCode ? ` • Term ${node.termCode}` : ""}
                        {node.targetDate ? ` • Target ${node.targetDate}` : ""}
                        {node.updatedByName
                          ? ` • Updated by ${node.updatedByName}`
                          : ""}
                      </p>
                    </div>
                    <Badge tone={progressTone(node.progressStatus)}>
                      {node.progressStatus.replace("_", " ")}
                    </Badge>
                  </div>

                  {node.delayReason ? (
                    <p className="rounded border border-status-danger bg-surface px-2.5 py-1.5 text-xs text-status-danger">
                      Delay reason: {node.delayReason}
                    </p>
                  ) : null}

                  {node.carryForwardNotes ? (
                    <p className="rounded border border-border-subtle bg-surface px-2.5 py-1.5 text-xs text-fg-muted">
                      Carry-forward: {node.carryForwardNotes}
                    </p>
                  ) : null}

                  {node.canUpdate ? (
                    <details className="rounded border border-border-subtle bg-surface p-2.5">
                      <summary className="cursor-pointer text-xs font-medium text-accent">
                        Update Progress / Target Date
                      </summary>
                      <div className="mt-2.5">
                        <RegistryActionForm
                          action={boundUpdate}
                          submitLabel="Save Progress"
                          submitVariant="secondary"
                        >
                          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1">
                              <label
                                htmlFor={`prog-status-${node.id}`}
                                className="block text-xs font-medium text-fg"
                              >
                                Progress Status
                              </label>
                              <select
                                id={`prog-status-${node.id}`}
                                name="progressStatus"
                                defaultValue={node.progressStatus}
                                className="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-fg"
                              >
                                {SYLLABUS_PROGRESS_STATUSES.map((st) => (
                                  <option key={st} value={st}>
                                    {st.replace("_", " ")}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label
                                htmlFor={`prog-target-${node.id}`}
                                className="block text-xs font-medium text-fg"
                              >
                                Target Date
                              </label>
                              <input
                                id={`prog-target-${node.id}`}
                                type="date"
                                name="targetDate"
                                defaultValue={node.targetDate ?? ""}
                                className="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-fg"
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                              <label
                                htmlFor={`prog-delay-${node.id}`}
                                className="block text-xs font-medium text-fg"
                              >
                                Delay Reason (if delayed)
                              </label>
                              <input
                                id={`prog-delay-${node.id}`}
                                type="text"
                                name="delayReason"
                                defaultValue={node.delayReason ?? ""}
                                placeholder="Min 5 chars when marked delayed"
                                className="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-fg"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label
                              htmlFor={`prog-carry-${node.id}`}
                              className="block text-xs font-medium text-fg"
                            >
                              Carry-Forward Notes
                            </label>
                            <input
                              id={`prog-carry-${node.id}`}
                              type="text"
                              name="carryForwardNotes"
                              defaultValue={node.carryForwardNotes ?? ""}
                              placeholder="Optional pacing adjustment or revision plan"
                              className="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-fg"
                            />
                          </div>
                        </RegistryActionForm>
                      </div>
                    </details>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {workspace.canManageSelectedOffering && workspace.selectedOfferingId ? (
        <Card
          title="Add Syllabus Unit, Chapter, or Topic"
          description="Attach new structured items to the selected subject offering while preserving hierarchy rules."
        >
          <RegistryActionForm
            action={boundCreateItem}
            submitLabel="Add Syllabus Item"
          >
            <input
              type="hidden"
              name="subjectOfferingId"
              value={workspace.selectedOfferingId}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label
                  htmlFor="item-kind"
                  className="block text-xs font-medium text-fg"
                >
                  Item Kind
                </label>
                <select
                  id="item-kind"
                  name="itemKind"
                  defaultValue="chapter"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  {SYLLABUS_ITEM_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="item-parent"
                  className="block text-xs font-medium text-fg"
                >
                  Parent Item
                </label>
                <select
                  id="item-parent"
                  name="parentItemId"
                  defaultValue=""
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  <option value="">None (top-level)</option>
                  {parentCandidates.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.itemKind}] {item.code} — {item.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="item-term"
                  className="block text-xs font-medium text-fg"
                >
                  Academic Term
                </label>
                <select
                  id="item-term"
                  name="termId"
                  defaultValue={
                    workspace.selectedTermId !== "all"
                      ? workspace.selectedTermId
                      : ""
                  }
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  <option value="">Year-long / Unassigned</option>
                  {workspace.terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="item-seq"
                  className="block text-xs font-medium text-fg"
                >
                  Sequence No.
                </label>
                <input
                  id="item-seq"
                  name="sequenceNo"
                  type="number"
                  min={1}
                  max={999}
                  defaultValue={workspace.flatItems.length + 1}
                  required
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="item-code"
                  className="block text-xs font-medium text-fg"
                >
                  Code
                </label>
                <input
                  id="item-code"
                  name="code"
                  type="text"
                  required
                  placeholder="CH-04"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label
                  htmlFor="item-title"
                  className="block text-xs font-medium text-fg"
                >
                  Title
                </label>
                <input
                  id="item-title"
                  name="title"
                  type="text"
                  required
                  placeholder="Enter unit, chapter, or topic title"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="item-target"
                  className="block text-xs font-medium text-fg"
                >
                  Target Date
                </label>
                <input
                  id="item-target"
                  name="targetDate"
                  type="date"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="item-desc"
                className="block text-xs font-medium text-fg"
              >
                Description (optional)
              </label>
              <textarea
                id="item-desc"
                name="description"
                rows={2}
                placeholder="Key subtopics, practical lab alignment, or assessment notes"
                className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
              />
            </div>
          </RegistryActionForm>
        </Card>
      ) : null}
    </div>
  );
}
