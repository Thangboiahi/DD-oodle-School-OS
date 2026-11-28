import Link from "next/link";
import {
  createAssignmentCommentAction,
  evaluateSubmissionAction,
  recordOfflineCompletionAction,
  submitStudentAssignmentAction,
  transitionAssignmentStatusAction,
} from "@/app/t/[slug]/assignments/actions";
import { OfflineDraftBox } from "@/components/assignments/OfflineDraftBox";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import type { AssignmentStatus, SubmissionStatus } from "@/lib/assignments/schemas";
import { getAssignmentDetail } from "@/server/assignments/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface AssignmentDetailPageProps {
  params: Promise<{ slug: string; assignmentId: string }>;
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

export default async function AssignmentDetailPage({
  params,
}: AssignmentDetailPageProps) {
  const { slug, assignmentId } = await params;
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
  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/assignments`;
  const detail = await getAssignmentDetail(context, assignmentId);

  if (detail.status === "not-found") {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <StateNotice
          kind="empty"
          title="Assignment not found"
          description="This assignment does not exist in your institution or is outside your current access scope."
          action={
            <Link
              href={basePath}
              className="inline-flex min-h-9 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
            >
              ← Back to Assignments
            </Link>
          }
        />
      </div>
    );
  }

  const { assignment } = detail;
  const boundSubmit = submitStudentAssignmentAction.bind(
    null,
    context.institutionSlug,
    assignment.id,
  );
  const boundComment = createAssignmentCommentAction.bind(
    null,
    context.institutionSlug,
    assignment.id,
  );
  const boundPublish = transitionAssignmentStatusAction.bind(
    null,
    context.institutionSlug,
    assignment.id,
    "published",
  );
  const boundClose = transitionAssignmentStatusAction.bind(
    null,
    context.institutionSlug,
    assignment.id,
    "closed",
  );
  const boundArchive = transitionAssignmentStatusAction.bind(
    null,
    context.institutionSlug,
    assignment.id,
    "archived",
  );

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={basePath}
          className="inline-flex min-h-9 items-center rounded-md border border-border-subtle bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
        >
          ← Back to Assignments
        </Link>
        {detail.isMonitorBoardOnly ? (
          <Badge tone="accent">Monitor Classroom Board View</Badge>
        ) : null}
      </div>

      <Card
        title={assignment.title}
        description={`${assignment.subjectLabel} • ${assignment.teachingGroupLabel}${
          assignment.syllabusItemLabel
            ? ` • Syllabus: ${assignment.syllabusItemLabel}`
            : ""
        } • Authored by ${assignment.authoredByName}`}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={assignmentStatusTone(assignment.status)}>
              {assignment.status}
            </Badge>
            <Badge tone="accent">{assignment.assignmentType}</Badge>
            <Badge tone="neutral">Mode: {assignment.submissionMode}</Badge>
            <Badge tone="neutral">Eval: {assignment.evaluationMode}</Badge>
            {assignment.maxMarks !== null ? (
              <Badge tone="neutral">Max Marks: {assignment.maxMarks}</Badge>
            ) : null}
            <Badge tone="neutral">Due: {formatDueAt(assignment.dueAt)}</Badge>
          </div>

          <p className="whitespace-pre-line rounded-md border border-border-subtle bg-elevated p-3 text-xs leading-relaxed text-fg">
            {assignment.instructions}
          </p>

          {detail.canManageAssignment && assignment.status !== "archived" ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {assignment.status === "draft" ? (
                <RegistryActionForm
                  action={boundPublish}
                  submitLabel="Publish Assignment"
                  submitVariant="primary"
                  className="inline-flex items-center gap-2"
                >
                  <input type="hidden" name="target" value="published" />
                </RegistryActionForm>
              ) : null}

              {assignment.status === "published" ? (
                <RegistryActionForm
                  action={boundClose}
                  submitLabel="Close Submissions"
                  submitVariant="secondary"
                  className="inline-flex items-center gap-2"
                >
                  <input type="hidden" name="target" value="closed" />
                </RegistryActionForm>
              ) : null}

              <RegistryActionForm
                action={boundArchive}
                submitLabel="Archive Assignment"
                submitVariant="secondary"
                className="inline-flex items-center gap-2"
              >
                <input type="hidden" name="target" value="archived" />
              </RegistryActionForm>
            </div>
          ) : null}
        </div>
      </Card>

      {detail.isMonitorBoardOnly ? null : detail.completionMetrics ? (
        <Card
          title={
            detail.canManageAssignment
              ? "Teaching Group Roster, Offline Completion & Evaluation"
              : "HOD / Class Teacher Oversight (Read-Only)"
          }
          description="Track online submissions, objective MCQ previews, and physical notebook completions across every enrolled student."
        >
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-6">
              <div className="rounded-md border border-border-subtle bg-elevated p-2">
                <dt className="text-fg-muted">Enrolled</dt>
                <dd className="text-base font-semibold text-fg">
                  {detail.completionMetrics.totalEnrolled}
                </dd>
              </div>
              <div className="rounded-md border border-border-subtle bg-elevated p-2">
                <dt className="text-fg-muted">Completion</dt>
                <dd className="text-base font-semibold text-accent">
                  {detail.completionMetrics.completionPercent}%
                </dd>
              </div>
              <div className="rounded-md border border-border-subtle bg-elevated p-2">
                <dt className="text-fg-muted">Evaluated</dt>
                <dd className="text-base font-semibold text-status-success">
                  {detail.completionMetrics.evaluatedCount}
                </dd>
              </div>
              <div className="rounded-md border border-border-subtle bg-elevated p-2">
                <dt className="text-fg-muted">Offline Done</dt>
                <dd className="text-base font-semibold text-fg">
                  {detail.completionMetrics.offlineCompletedCount}
                </dd>
              </div>
              <div className="rounded-md border border-border-subtle bg-elevated p-2">
                <dt className="text-fg-muted">Pending</dt>
                <dd className="text-base font-semibold text-status-warning">
                  {detail.completionMetrics.pendingCount}
                </dd>
              </div>
              <div className="rounded-md border border-border-subtle bg-elevated p-2">
                <dt className="text-fg-muted">Resubmit</dt>
                <dd className="text-base font-semibold text-fg">
                  {detail.completionMetrics.resubmitRequestedCount}
                </dd>
              </div>
            </dl>

            {detail.roster.length === 0 ? (
              <StateNotice
                kind="empty"
                title="No enrolled students in this teaching group"
                description="Enrol students in the teaching group to track submissions."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[46rem] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle text-fg-muted">
                      <th className="py-2 pr-3 font-medium">Student</th>
                      <th className="py-2 pr-3 font-medium">Section</th>
                      <th className="py-2 pr-3 font-medium">Channel</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Marks</th>
                      <th className="py-2 font-medium">
                        {detail.canManageAssignment ? "Actions" : "Remarks"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {detail.roster.map((entry) => {
                      const boundOffline = recordOfflineCompletionAction.bind(
                        null,
                        context.institutionSlug,
                        assignment.id,
                        entry.studentEnrolmentId,
                        entry.studentProfileId,
                      );
                      const boundEvaluate = entry.submissionId
                        ? evaluateSubmissionAction.bind(
                            null,
                            context.institutionSlug,
                            assignment.id,
                            entry.submissionId,
                          )
                        : null;

                      return (
                        <tr key={entry.studentEnrolmentId} className="align-top">
                          <td className="py-2 pr-3 font-medium text-fg">
                            {entry.studentName}
                            <p className="font-mono text-[11px] text-fg-muted">
                              {entry.admissionNumber}
                              {entry.rollNumber
                                ? ` • Roll #${entry.rollNumber}`
                                : ""}
                            </p>
                            {entry.responseText ? (
                              <p className="mt-1 max-w-sm rounded border border-border-subtle bg-elevated p-1.5 text-[11px] text-fg">
                                {entry.responseText}
                              </p>
                            ) : null}
                            {entry.attachmentStoragePath ? (
                              <p className="mt-1 font-mono text-[11px] text-fg-muted">
                                Attachment: {entry.attachmentStoragePath}
                              </p>
                            ) : null}
                          </td>
                          <td className="py-2 pr-3 text-fg-muted">
                            {entry.sectionLabel}
                          </td>
                          <td className="py-2 pr-3 text-fg-muted">
                            {entry.submissionChannel === "offline_recorded"
                              ? "Offline Notebook"
                              : entry.submissionChannel === "online"
                                ? "Online"
                                : "—"}
                          </td>
                          <td className="py-2 pr-3">
                            <Badge tone={submissionStatusTone(entry.status)}>
                              {entry.status.replace("_", " ")}
                            </Badge>
                            {entry.autoMcqPreview ? (
                              <p className="mt-1 font-mono text-[11px] text-accent">
                                MCQ: {entry.autoMcqPreview.marksAwarded}/
                                {entry.autoMcqPreview.totalMarks} (
                                {entry.autoMcqPreview.correctCount}/
                                {entry.autoMcqPreview.totalQuestions})
                              </p>
                            ) : null}
                          </td>
                          <td className="py-2 pr-3 font-mono text-fg">
                            {entry.marksAwarded !== null
                              ? `${entry.marksAwarded}${assignment.maxMarks !== null ? `/${assignment.maxMarks}` : ""}`
                              : "—"}
                          </td>
                          <td className="py-2 space-y-2">
                            {entry.teacherRemarks ? (
                              <p className="text-[11px] text-fg-muted">
                                {entry.teacherRemarks}
                              </p>
                            ) : null}

                            {detail.canManageAssignment ? (
                              <div className="space-y-1.5">
                                {boundEvaluate ? (
                                  <details className="rounded border border-border-subtle bg-elevated p-2">
                                    <summary className="cursor-pointer font-medium text-accent">
                                      Evaluate / Remarks
                                    </summary>
                                    <div className="mt-2 space-y-2">
                                      {entry.autoMcqPreview ? (
                                        <RegistryActionForm
                                          action={boundEvaluate}
                                          submitLabel={`Confirm Auto-MCQ Score (${entry.autoMcqPreview.marksAwarded}/${entry.autoMcqPreview.totalMarks})`}
                                          submitVariant="primary"
                                          className="space-y-1.5"
                                        >
                                          <input
                                            type="hidden"
                                            name="status"
                                            value="evaluated"
                                          />
                                          <input
                                            type="hidden"
                                            name="useAutoMcqScore"
                                            value="1"
                                          />
                                          <input
                                            type="text"
                                            name="teacherRemarks"
                                            defaultValue={
                                              entry.teacherRemarks ?? ""
                                            }
                                            aria-label={`Auto-MCQ remarks for ${entry.studentName}`}
                                            placeholder="Optional feedback"
                                            className="w-full rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                                          />
                                        </RegistryActionForm>
                                      ) : null}

                                      <RegistryActionForm
                                        action={boundEvaluate}
                                        submitLabel="Save Evaluation"
                                        submitVariant="secondary"
                                        className="space-y-1.5"
                                      >
                                        <select
                                          name="status"
                                          defaultValue="evaluated"
                                          aria-label={`Evaluation status for ${entry.studentName}`}
                                          className="w-full rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                                        >
                                          <option value="evaluated">
                                            evaluated
                                          </option>
                                          <option value="resubmit_requested">
                                            resubmit_requested
                                          </option>
                                        </select>
                                        <input
                                          type="number"
                                          step="0.5"
                                          min={0}
                                          max={assignment.maxMarks ?? 1000}
                                          name="marksAwarded"
                                          defaultValue={
                                            entry.marksAwarded ?? ""
                                          }
                                          aria-label={`Marks for ${entry.studentName}`}
                                          placeholder="Marks awarded"
                                          className="w-full rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                                        />
                                        <input
                                          type="text"
                                          name="teacherRemarks"
                                          defaultValue={
                                            entry.teacherRemarks ?? ""
                                          }
                                          aria-label={`Teacher remarks for ${entry.studentName}`}
                                          placeholder="Teacher remarks"
                                          className="w-full rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                                        />
                                      </RegistryActionForm>
                                    </div>
                                  </details>
                                ) : null}

                                {assignment.submissionMode !== "online" ? (
                                  <RegistryActionForm
                                    action={boundOffline}
                                    submitLabel="Mark Completed Offline"
                                    submitVariant="secondary"
                                    className="flex flex-wrap items-center gap-1.5"
                                  >
                                    <input
                                      type="hidden"
                                      name="status"
                                      value="completed_offline"
                                    />
                                    <input
                                      type="text"
                                      name="teacherRemarks"
                                      aria-label={`Offline notebook check remark for ${entry.studentName}`}
                                      placeholder="Notebook verified remark"
                                      className="min-w-32 flex-1 rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                                    />
                                  </RegistryActionForm>
                                ) : null}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-[var(--density-gap)]">
          {detail.learnerSubmissions.length > 0 ? (
            <Card
              title="Submission & Evaluation Status"
              description="Current status, awarded marks, and teacher feedback under strict student/guardian RLS."
            >
              <div className="space-y-3">
                {detail.learnerSubmissions.map((sub) => (
                  <div
                    key={sub.submissionId}
                    className="rounded-md border border-border-subtle bg-elevated p-3 text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-fg">
                        {sub.studentName} ({sub.admissionNumber})
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral">
                          {sub.submissionChannel === "offline_recorded"
                            ? "Offline"
                            : "Online"}
                        </Badge>
                        <Badge tone={submissionStatusTone(sub.status)}>
                          {sub.status.replace("_", " ")}
                        </Badge>
                        {sub.marksAwarded !== null ? (
                          <Badge tone="success">
                            Marks: {sub.marksAwarded}
                            {assignment.maxMarks !== null
                              ? ` / ${assignment.maxMarks}`
                              : ""}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    {sub.responseText ? (
                      <p className="rounded border border-border-subtle bg-surface p-2 text-fg">
                        {sub.responseText}
                      </p>
                    ) : null}

                    {sub.teacherRemarks ? (
                      <p className="text-fg-muted">
                        Teacher Remarks: {sub.teacherRemarks}
                      </p>
                    ) : null}

                    {sub.quizBreakdown ? (
                      <div className="space-y-1 pt-1">
                        <p className="font-medium text-fg">
                          Evaluated MCQ Breakdown:
                        </p>
                        <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-fg-muted">
                          {sub.quizBreakdown.map((item) => (
                            <li key={item.questionId}>
                              Question {item.questionId}:{" "}
                              {item.isCorrect ? "Correct" : "Incorrect"} (
                              {item.marksEarned}/{item.maxMarks} marks)
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : sub.quizSummary ? (
                      <p className="text-[11px] text-fg-muted">
                        Preliminary MCQ score ({sub.quizSummary.marksAwarded}/
                        {sub.quizSummary.totalMarks}) recorded pending final
                        teacher confirmation.
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {detail.canStudentSubmit ? (
            <Card
              title="Submit Assignment Online"
              description="Save local drafts offline while composing. Submissions lock evaluation columns per PostgreSQL RLS."
            >
              <RegistryActionForm
                action={boundSubmit}
                submitLabel="Submit Assignment"
              >
                {assignment.questions.length > 0 ? (
                  <div className="space-y-3">
                    {assignment.questions.map((question, qIdx) => (
                      <fieldset
                        key={question.id}
                        className="rounded-md border border-border-subtle bg-elevated p-3 space-y-2"
                      >
                        <legend className="px-1 text-xs font-semibold text-fg">
                          Q{qIdx + 1}. {question.prompt} ({question.marks}{" "}
                          marks)
                        </legend>
                        <div className="space-y-1.5">
                          {question.options.map((optText, optIdx) => (
                            <label
                              key={`${question.id}-${optIdx}`}
                              className="flex items-center gap-2 text-xs text-fg"
                            >
                              <input
                                type="radio"
                                name={`mcq_${question.id}`}
                                value={String(optIdx)}
                                required={
                                  assignment.evaluationMode === "auto_mcq"
                                }
                              />
                              <span>{optText}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                ) : null}

                <OfflineDraftBox
                  slug={context.institutionSlug}
                  assignmentId={assignment.id}
                  initialResponseText=""
                  inputId={`asg-response-${assignment.id}`}
                />

                <div className="space-y-1">
                  <label
                    htmlFor={`asg-attach-${assignment.id}`}
                    className="block text-xs font-medium text-fg"
                  >
                    Private Storage Attachment Key (Optional, under tenant
                    folder)
                  </label>
                  <input
                    id={`asg-attach-${assignment.id}`}
                    name="attachmentStoragePath"
                    type="text"
                    placeholder={`${context.institutionId}/submissions/${assignment.id}/work.pdf`}
                    className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 font-mono text-xs text-fg"
                  />
                </div>
              </RegistryActionForm>
            </Card>
          ) : detail.submitBlockReason ? (
            <div
              role="status"
              className="rounded-md border border-border-subtle bg-elevated p-3 text-xs text-fg-muted"
            >
              {detail.submitBlockReason}
            </div>
          ) : null}
        </div>
      )}

      <Card
        title="Contextual Assignment Comments"
        description="Record-bound discussion anchored strictly to this assignment. Staff-only internal notes are hidden from students, guardians, and monitors."
      >
        <div className="space-y-3">
          {detail.comments.length === 0 ? (
            <p className="text-xs text-fg-muted">No comments posted yet.</p>
          ) : (
            <div className="space-y-2">
              {detail.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-md border border-border-subtle bg-elevated p-2.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-fg">
                      {comment.authoredByName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {comment.isInternalStaffNote ? (
                        <Badge tone="warning">Internal Staff Note</Badge>
                      ) : null}
                      <span className="font-mono text-[11px] text-fg-muted">
                        {comment.createdAt.slice(0, 16).replace("T", " ")}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-fg">{comment.body}</p>
                </div>
              ))}
            </div>
          )}

          {detail.canComment ? (
            <RegistryActionForm
              action={boundComment}
              submitLabel="Post Comment"
              submitVariant="secondary"
            >
              <div className="space-y-1">
                <label
                  htmlFor={`asg-comment-${assignment.id}`}
                  className="block text-xs font-medium text-fg"
                >
                  Add Clarification or Feedback
                </label>
                <textarea
                  id={`asg-comment-${assignment.id}`}
                  name="body"
                  rows={2}
                  required
                  minLength={2}
                  maxLength={2000}
                  placeholder="Write a clarification, rubric note, or submission comment..."
                  className="w-full rounded-md border border-border-strong bg-surface p-2 text-xs text-fg"
                />
              </div>
              {detail.canPostInternalNote ? (
                <label className="inline-flex min-h-8 items-center gap-2 text-xs text-fg-muted">
                  <input type="checkbox" name="isInternalStaffNote" />
                  Internal staff note (hidden from students, guardians, and
                  monitors)
                </label>
              ) : null}
            </RegistryActionForm>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
