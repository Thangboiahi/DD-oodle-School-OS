import Link from "next/link";
import {
  acknowledgeNoticeAction,
  createRecordCommentAction,
  transitionNoticeStatusAction,
} from "@/app/t/[slug]/communication/actions";
import { CommunicationSubNav } from "@/components/communication/CommunicationSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import type { NoticeStatus } from "@/lib/communication/schemas";
import { getNoticeDetail } from "@/server/communication/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface NoticeDetailPageProps {
  params: Promise<{ slug: string; noticeId: string }>;
}

function noticeStatusTone(status: NoticeStatus): BadgeTone {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  return "neutral";
}

export default async function OfficialNoticeDetailPage({
  params,
}: NoticeDetailPageProps) {
  const { slug, noticeId } = await params;
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
  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/communication`;
  const detail = await getNoticeDetail(context, noticeId);

  if (detail.status === "not-found") {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <StateNotice
          kind="empty"
          title="Official notice not found"
          description="This notice does not exist in this institution or is outside your active role/scope visibility."
          action={
            <Link
              href={basePath}
              className="inline-flex min-h-10 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
            >
              ← Back to Official Notices
            </Link>
          }
        />
      </div>
    );
  }

  const { notice } = detail;
  const boundAck = acknowledgeNoticeAction.bind(
    null,
    context.institutionSlug,
    notice.id,
  );
  const boundComment = createRecordCommentAction.bind(
    null,
    context.institutionSlug,
    "notice",
    notice.id,
  );

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <CommunicationSubNav
        slug={context.institutionSlug}
        activeTab="notices"
        canAccessEnquiries={detail.canAccessEnquiries}
      />

      <div>
        <Link
          href={basePath}
          className="inline-flex min-h-9 items-center rounded-md border border-border-subtle bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
        >
          ← Back to Official Notices
        </Link>
      </div>

      <Card
        title={notice.title}
        description={`Issued by ${notice.authoredByName} • Scope: ${notice.targetLabel}`}
      >
        <div className="space-y-4 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">{notice.category}</Badge>
            <Badge tone="neutral">{notice.scopeType}</Badge>
            <Badge tone={noticeStatusTone(notice.status)}>
              {notice.status}
            </Badge>
            {notice.isOfflineCacheable ? (
              <Badge tone="success">Offline Cacheable</Badge>
            ) : null}
            {notice.requiresAcknowledgement ? (
              <Badge
                tone={notice.callerHasAcknowledged ? "success" : "warning"}
              >
                {notice.callerHasAcknowledged
                  ? "Acknowledged"
                  : "Acknowledgement Requested"}
              </Badge>
            ) : null}
          </div>

          <div className="rounded-md border border-border-subtle bg-elevated p-3 text-sm leading-relaxed text-fg whitespace-pre-wrap">
            {notice.body}
          </div>

          {detail.canPublish || detail.canArchive ? (
            <div className="flex flex-wrap items-center gap-3 border-t border-border-subtle pt-3">
              {detail.canPublish ? (
                <RegistryActionForm
                  action={transitionNoticeStatusAction.bind(
                    null,
                    context.institutionSlug,
                    notice.id,
                    "published",
                  )}
                  submitLabel="Publish Notice"
                  pendingLabel="Publishing..."
                  submitVariant="primary"
                  className="inline-flex flex-col gap-1"
                >
                  <span className="sr-only">Publish notice {notice.title}</span>
                </RegistryActionForm>
              ) : null}

              {detail.canArchive ? (
                <RegistryActionForm
                  action={transitionNoticeStatusAction.bind(
                    null,
                    context.institutionSlug,
                    notice.id,
                    "archived",
                  )}
                  submitLabel="Archive Notice"
                  pendingLabel="Archiving..."
                  submitVariant="secondary"
                  className="inline-flex flex-col gap-1"
                >
                  <span className="sr-only">Archive notice {notice.title}</span>
                </RegistryActionForm>
              ) : null}
            </div>
          ) : null}

          {detail.canAcknowledge ? (
            <div className="rounded-md border border-border-strong bg-surface p-3">
              <h3 className="mb-2 text-xs font-semibold text-fg">
                Confirm Notice Receipt
              </h3>
              <RegistryActionForm
                action={boundAck}
                submitLabel="Acknowledge Notice"
                pendingLabel="Recording..."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {detail.guardianWards.length > 0 ? (
                    <div>
                      <label
                        htmlFor="ack-notice-ward"
                        className="mb-1 block text-xs font-medium text-fg"
                      >
                        Ward Reference (Optional)
                      </label>
                      <select
                        id="ack-notice-ward"
                        name="studentProfileId"
                        defaultValue={
                          detail.guardianWards[0]?.studentProfileId ?? ""
                        }
                        className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                      >
                        {detail.guardianWards.map((w) => (
                          <option
                            key={w.studentProfileId}
                            value={w.studentProfileId}
                          >
                            {w.fullName} ({w.admissionNumber})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div
                    className={
                      detail.guardianWards.length > 0 ? "" : "sm:col-span-2"
                    }
                  >
                    <label
                      htmlFor="ack-notice-note"
                      className="mb-1 block text-xs font-medium text-fg"
                    >
                      Optional Acknowledgement Note
                    </label>
                    <input
                      id="ack-notice-note"
                      name="note"
                      type="text"
                      maxLength={500}
                      placeholder="Noted schedule and requirements."
                      className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                    />
                  </div>
                </div>
              </RegistryActionForm>
            </div>
          ) : null}
        </div>
      </Card>

      {detail.acknowledgements.length > 0 ? (
        <Card
          title="Recorded Notice Acknowledgements"
          description={`${detail.acknowledgements.length} acknowledgement(s) recorded under PostgreSQL RLS.`}
        >
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full min-w-[34rem] divide-y divide-border-subtle text-left text-xs">
              <thead className="bg-elevated text-fg-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Acknowledged By</th>
                  <th className="px-3 py-2 font-medium">Ward</th>
                  <th className="px-3 py-2 font-medium">Timestamp</th>
                  <th className="px-3 py-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface">
                {detail.acknowledgements.map((ack) => (
                  <tr key={ack.id}>
                    <td className="px-3 py-2 font-medium text-fg">
                      {ack.personName}
                    </td>
                    <td className="px-3 py-2 text-fg-muted">
                      {ack.studentName ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-fg-muted">
                      {ack.acknowledgedAt.slice(0, 19).replace("T", " ")}Z
                    </td>
                    <td className="px-3 py-2 text-fg-muted">
                      {ack.note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card
        title="Contextual Notice Notes"
        description="Record-bound comments linked strictly to this official notice (internal staff notes stay hidden from students, guardians, and monitors)."
      >
        <div className="space-y-4">
          {detail.comments.length === 0 ? (
            <p className="text-xs text-fg-muted">
              No contextual notes recorded on this notice yet.
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {detail.comments.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-md border border-border-subtle bg-elevated p-2.5"
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
                        {comment.createdAt.slice(0, 16).replace("T", " ")}Z
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-fg">
                    {comment.body}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {detail.canComment ? (
            <RegistryActionForm
              action={boundComment}
              submitLabel="Post Contextual Note"
              pendingLabel="Posting..."
            >
              <div className="space-y-2.5">
                <div>
                  <label
                    htmlFor="notice-comment-body"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Record-Bound Note (2–2000 chars)
                  </label>
                  <textarea
                    id="notice-comment-body"
                    name="body"
                    required
                    minLength={2}
                    maxLength={2000}
                    rows={2}
                    placeholder="Operational clarification or staff coordination note..."
                    className="w-full rounded-md border border-border-strong bg-surface p-2 text-xs text-fg"
                  />
                </div>

                {detail.canPostInternalNote ? (
                  <div className="flex items-center gap-2">
                    <input
                      id="notice-comment-internal"
                      name="isInternalStaffNote"
                      type="checkbox"
                      className="h-4 w-4 rounded border-border-strong"
                    />
                    <label
                      htmlFor="notice-comment-internal"
                      className="text-xs font-medium text-fg"
                    >
                      Internal staff note (hidden from students &amp; guardians)
                    </label>
                  </div>
                ) : null}
              </div>
            </RegistryActionForm>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
