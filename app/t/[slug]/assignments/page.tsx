import Link from "next/link";
import { createAssignmentAction } from "@/app/t/[slug]/assignments/actions";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_TYPES,
  EVALUATION_MODES,
  SUBMISSION_MODES,
  type AssignmentStatus,
  type SubmissionStatus,
} from "@/lib/assignments/schemas";
import { getAssignmentsWorkspace } from "@/server/assignments/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface AssignmentsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    group?: string;
    status?: string;
    type?: string;
  }>;
}

function assignmentStatusTone(status: AssignmentStatus): BadgeTone {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  return "neutral";
}

function submissionStatusTone(status: SubmissionStatus): BadgeTone {
  if (status === "evaluated" || status === "completed_offline") {
    return "success";
  }
  if (status === "submitted") return "accent";
  if (status === "late_submitted" || status === "resubmit_requested") {
    return "warning";
  }
  return "neutral";
}

function formatDueAt(dueAt: string | null): string {
  if (!dueAt) return "No fixed due date";
  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) return dueAt;
  return parsed.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

const SAMPLE_MCQ_PLACEHOLDER = `[
  {
    "id": "q1",
    "prompt": "Which CBSE document controls annual internal assessment weightage?",
    "options": ["Board Circular", "Cafeteria Menu"],
    "correctOptionIndex": 0,
    "marks": 2
  }
]`;

export default async function AssignmentsWorkspacePage({
  params,
  searchParams,
}: AssignmentsPageProps) {
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
  const workspace = await getAssignmentsWorkspace(context, {
    teachingGroupId: query.group,
    statusFilter: query.status,
    typeFilter: query.type,
  });

  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/assignments`;
  const boundCreate = createAssignmentAction.bind(null, context.institutionSlug);

  if (workspace.isMonitorBoardOnly) {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <div
          role="status"
          className="rounded-lg border border-border-strong bg-surface p-[var(--density-pad)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-fg">
                Monitor / Monitress Read-Only Classroom Assignment Board
              </h2>
              <p className="text-xs text-fg-muted">
                Displays only published classroom assignments for board
                announcements. Drafts, peer submissions, and answer keys are
                strictly hidden.
              </p>
            </div>
            <Badge tone="accent">Classroom Board Only</Badge>
          </div>
        </div>

        <Card
          title="Published Classroom Assignments"
          description={
            workspace.activeSession
              ? `Active Session: ${workspace.activeSession.name} (${workspace.activeSession.code})`
              : "Published coursework summary"
          }
        >
          {workspace.monitorBoardAssignments.length === 0 ? (
            <StateNotice
              kind="empty"
              title="No published classroom assignments"
              description="Published section teaching-group assignments will appear here for board announcements."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[38rem] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-fg-muted">
                    <th className="py-2 pr-3 font-medium">Title</th>
                    <th className="py-2 pr-3 font-medium">Subject / Group</th>
                    <th className="py-2 pr-3 font-medium">Type &amp; Mode</th>
                    <th className="py-2 pr-3 font-medium">Due Date</th>
                    <th className="py-2 font-medium">Board View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {workspace.monitorBoardAssignments.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-3 font-medium text-fg">
                        {item.title}
                      </td>
                      <td className="py-2 pr-3 text-fg-muted">
                        {item.subjectLabel} ({item.teachingGroupLabel})
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone="accent">{item.assignmentType}</Badge>
                          <Badge tone="neutral">{item.submissionMode}</Badge>
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-mono text-fg-muted">
                        {formatDueAt(item.dueAt)}
                      </td>
                      <td className="py-2">
                        <Link
                          href={`${basePath}/${encodeURIComponent(item.id)}`}
                          className="font-medium text-accent hover:underline"
                        >
                          Open
                        </Link>
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

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <Card
        title="Unified Hybrid Assignments & Coursework"
        description={
          workspace.activeSession
            ? `Active Session: ${workspace.activeSession.name} (${workspace.activeSession.code}) — online responses, objective MCQ quizzes, and offline notebook completion.`
            : "Online responses, objective MCQ quizzes, and offline notebook completion."
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">
              {workspace.assignments.length} Assignment(s)
            </Badge>
            {workspace.isOversightReadOnly ? (
              <Badge tone="accent">HOD / Class Teacher Oversight (Read-Only)</Badge>
            ) : null}
          </div>

          <form
            method="get"
            action={basePath}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-1">
              <label
                htmlFor="asg-filter-group"
                className="block text-xs font-medium text-fg"
              >
                Teaching Group
              </label>
              <select
                id="asg-filter-group"
                name="group"
                defaultValue={workspace.selectedGroupId}
                className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
              >
                <option value="all">All scoped teaching groups</option>
                {workspace.teachingGroups.map((tg) => (
                  <option key={tg.id} value={tg.id}>
                    {tg.code} — {tg.subjectLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="asg-filter-type"
                className="block text-xs font-medium text-fg"
              >
                Assignment Type
              </label>
              <select
                id="asg-filter-type"
                name="type"
                defaultValue={workspace.typeFilter}
                className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
              >
                <option value="all">All types</option>
                {ASSIGNMENT_TYPES.map((typeOption) => (
                  <option key={typeOption} value={typeOption}>
                    {typeOption}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="asg-filter-status"
                className="block text-xs font-medium text-fg"
              >
                Status
              </label>
              <select
                id="asg-filter-status"
                name="status"
                defaultValue={workspace.statusFilter}
                className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
              >
                <option value="all">All visible statuses</option>
                {ASSIGNMENT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
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
        </div>
      </Card>

      {workspace.canCreateAssignment ? (
        <Card
          title="Create Assignment (Online, Offline Notebook, Both, or Auto-MCQ)"
          description="Assignments publish to enrolled teaching group students and their linked guardians without forcing offline notebook tasks online."
        >
          <RegistryActionForm
            action={boundCreate}
            submitLabel="Create Assignment"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label
                  htmlFor="create-asg-tg"
                  className="block text-xs font-medium text-fg"
                >
                  Teaching Group
                </label>
                <select
                  id="create-asg-tg"
                  name="teachingGroupId"
                  required
                  defaultValue={workspace.writableTeachingGroups[0]?.id ?? ""}
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  {workspace.writableTeachingGroups.map((tg) => (
                    <option key={tg.id} value={tg.id}>
                      {tg.code} — {tg.subjectLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="create-asg-syllabus"
                  className="block text-xs font-medium text-fg"
                >
                  Syllabus Item (Optional)
                </label>
                <select
                  id="create-asg-syllabus"
                  name="syllabusItemId"
                  defaultValue=""
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  <option value="">None (general coursework)</option>
                  {workspace.syllabusOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="create-asg-type"
                  className="block text-xs font-medium text-fg"
                >
                  Type
                </label>
                <select
                  id="create-asg-type"
                  name="assignmentType"
                  defaultValue="homework"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  {ASSIGNMENT_TYPES.map((typeOption) => (
                    <option key={typeOption} value={typeOption}>
                      {typeOption}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="create-asg-submode"
                  className="block text-xs font-medium text-fg"
                >
                  Submission Mode
                </label>
                <select
                  id="create-asg-submode"
                  name="submissionMode"
                  defaultValue="both"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  {SUBMISSION_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="create-asg-eval"
                  className="block text-xs font-medium text-fg"
                >
                  Evaluation Mode
                </label>
                <select
                  id="create-asg-eval"
                  name="evaluationMode"
                  defaultValue="manual"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  {EVALUATION_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="create-asg-marks"
                  className="block text-xs font-medium text-fg"
                >
                  Max Marks (Optional)
                </label>
                <input
                  id="create-asg-marks"
                  name="maxMarks"
                  type="number"
                  step="0.5"
                  min={0}
                  max={1000}
                  placeholder="20"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="create-asg-due"
                  className="block text-xs font-medium text-fg"
                >
                  Due Date / Time (Optional)
                </label>
                <input
                  id="create-asg-due"
                  name="dueAt"
                  type="datetime-local"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="create-asg-status"
                  className="block text-xs font-medium text-fg"
                >
                  Initial Status
                </label>
                <select
                  id="create-asg-status"
                  name="initialStatus"
                  defaultValue="published"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label
                  htmlFor="create-asg-title"
                  className="block text-xs font-medium text-fg"
                >
                  Title (3–160 chars)
                </label>
                <input
                  id="create-asg-title"
                  name="title"
                  type="text"
                  required
                  minLength={3}
                  maxLength={160}
                  placeholder="NCERT Chapter 2 Matrices Problem Set"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                />
              </div>

              <div className="flex items-end pb-1">
                <label className="inline-flex min-h-9 items-center gap-2 text-xs text-fg">
                  <input
                    type="checkbox"
                    name="allowLateSubmission"
                    defaultChecked
                  />
                  Allow late submissions
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="create-asg-instructions"
                className="block text-xs font-medium text-fg"
              >
                Instructions (5–5000 chars)
              </label>
              <textarea
                id="create-asg-instructions"
                name="instructions"
                rows={2}
                required
                minLength={5}
                maxLength={5000}
                placeholder="Complete exercises 1 to 6 in notebook or submit concise written steps online."
                className="w-full rounded-md border border-border-strong bg-surface p-2.5 text-xs text-fg"
              />
            </div>

            <details className="rounded-md border border-border-subtle bg-elevated p-2.5">
              <summary className="cursor-pointer text-xs font-medium text-accent">
                Objective MCQ Questions JSON (Required when Evaluation Mode =
                auto_mcq)
              </summary>
              <div className="mt-2 space-y-1">
                <label
                  htmlFor="create-asg-mcq-json"
                  className="block text-xs font-medium text-fg"
                >
                  Questions Array (`id`, `prompt`, `options`,
                  `correctOptionIndex`, `marks`)
                </label>
                <textarea
                  id="create-asg-mcq-json"
                  name="objectiveQuestionsJson"
                  rows={5}
                  placeholder={SAMPLE_MCQ_PLACEHOLDER}
                  className="w-full rounded-md border border-border-strong bg-surface p-2 font-mono text-[11px] text-fg"
                />
              </div>
            </details>
          </RegistryActionForm>
        </Card>
      ) : null}

      <Card
        title="Assignments Directory"
        description="Select any assignment to review details, submit responses, mark offline notebook completion, or evaluate coursework."
      >
        {workspace.assignments.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No assignments matched"
            description="No assignments exist in your active role scope for the current filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-fg-muted">
                  <th className="py-2 pr-3 font-medium">Title</th>
                  <th className="py-2 pr-3 font-medium">Subject / Group</th>
                  <th className="py-2 pr-3 font-medium">Type &amp; Mode</th>
                  <th className="py-2 pr-3 font-medium">Due Date</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">
                    {workspace.isStudentOrGuardian
                      ? "Your / Ward Progress"
                      : "Completion"}
                  </th>
                  <th className="py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {workspace.assignments.map((asg) => (
                  <tr key={asg.id}>
                    <td className="py-2 pr-3 font-medium text-fg">
                      <Link
                        href={`${basePath}/${encodeURIComponent(asg.id)}`}
                        className="text-accent hover:underline"
                      >
                        {asg.title}
                      </Link>
                      {asg.syllabusItemLabel ? (
                        <p className="text-[11px] text-fg-muted">
                          {asg.syllabusItemLabel}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-fg-muted">
                      <span className="font-medium text-fg">
                        {asg.subjectLabel}
                      </span>
                      <p className="text-[11px]">{asg.teachingGroupLabel}</p>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone="accent">{asg.assignmentType}</Badge>
                        <Badge tone="neutral">{asg.submissionMode}</Badge>
                        {asg.evaluationMode === "auto_mcq" ? (
                          <Badge tone="accent">auto_mcq</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-fg-muted">
                      {formatDueAt(asg.dueAt)}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge tone={assignmentStatusTone(asg.status)}>
                        {asg.status}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3">
                      {asg.completionMetrics ? (
                        <span className="font-mono text-fg">
                          {asg.completionMetrics.completionPercent}% (
                          {asg.completionMetrics.totalEnrolled -
                            asg.completionMetrics.pendingCount}
                          /{asg.completionMetrics.totalEnrolled})
                        </span>
                      ) : asg.learnerSubmissionStatus ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            tone={submissionStatusTone(
                              asg.learnerSubmissionStatus,
                            )}
                          >
                            {asg.learnerSubmissionStatus.replace("_", " ")}
                          </Badge>
                          {asg.learnerMarksAwarded !== null ? (
                            <span className="font-mono text-fg">
                              {asg.learnerMarksAwarded}
                              {asg.maxMarks !== null ? `/${asg.maxMarks}` : ""}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2">
                      <Link
                        href={`${basePath}/${encodeURIComponent(asg.id)}`}
                        className="inline-flex min-h-8 items-center rounded border border-border-subtle px-2.5 text-xs font-medium text-accent hover:bg-elevated"
                      >
                        Open
                      </Link>
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
