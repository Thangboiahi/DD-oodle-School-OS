import Link from "next/link";
import {
  createRecordCommentAction,
  updateParentEnquiryAction,
} from "@/app/t/[slug]/communication/actions";
import { CommunicationSubNav } from "@/components/communication/CommunicationSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import type { EnquiryStatus } from "@/lib/communication/schemas";
import { getParentEnquiryDetail } from "@/server/communication/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface ParentEnquiryDetailPageProps {
  params: Promise<{ slug: string; enquiryId: string }>;
}

function enquiryStatusTone(status: EnquiryStatus): BadgeTone {
  switch (status) {
    case "resolved":
      return "success";
    case "in_review":
      return "accent";
    case "closed":
      return "neutral";
    default:
      return "warning";
  }
}

export default async function ParentEnquiryDetailPage({
  params,
}: ParentEnquiryDetailPageProps) {
  const { slug, enquiryId } = await params;
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
  const baseNoticesPath = `/t/${encodeURIComponent(context.institutionSlug)}/communication`;
  const enquiriesHref = `${baseNoticesPath}/enquiries`;
  const detail = await getParentEnquiryDetail(context, enquiryId);

  if (detail.status === "denied") {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <CommunicationSubNav
          slug={context.institutionSlug}
          activeTab="enquiries"
          canAccessEnquiries={false}
        />
        <StateNotice
          kind="permission-denied"
          title="Parent enquiry access denied"
          description={detail.reason}
          action={
            <Link
              href={baseNoticesPath}
              className="inline-flex min-h-10 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
            >
              Open Official Notices
            </Link>
          }
        />
      </div>
    );
  }

  if (detail.status === "not-found") {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <CommunicationSubNav
          slug={context.institutionSlug}
          activeTab="enquiries"
          canAccessEnquiries={true}
        />
        <StateNotice
          kind="empty"
          title="Enquiry case not found"
          description="The requested parent enquiry case does not exist in this institution or is outside your access scope."
          action={
            <Link
              href={enquiriesHref}
              className="inline-flex min-h-10 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
            >
              ← Back to Parent Enquiries
            </Link>
          }
        />
      </div>
    );
  }

  const { enquiry } = detail;
  const boundUpdateEnquiry = updateParentEnquiryAction.bind(
    null,
    context.institutionSlug,
    enquiry.id,
  );
  const boundComment = createRecordCommentAction.bind(
    null,
    context.institutionSlug,
    "parent_enquiry",
    enquiry.id,
  );

  const staffTargetOptions: ("in_review" | "resolved" | "closed")[] =
    enquiry.status === "open"
      ? ["in_review", "resolved", "closed"]
      : enquiry.status === "in_review"
        ? ["resolved", "closed"]
        : enquiry.status === "resolved"
          ? ["closed"]
          : [];

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <CommunicationSubNav
        slug={context.institutionSlug}
        activeTab="enquiries"
        canAccessEnquiries={true}
      />

      <div>
        <Link
          href={enquiriesHref}
          className="inline-flex min-h-9 items-center rounded-md border border-border-subtle bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
        >
          ← Back to Parent Enquiries
        </Link>
      </div>

      <Card
        title={enquiry.subject}
        description={`Student: ${enquiry.studentName} (${enquiry.admissionNumber}) • Guardian: ${enquiry.guardianName}`}
      >
        <div className="space-y-4 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">{enquiry.category}</Badge>
            <Badge tone={enquiryStatusTone(enquiry.status)}>
              {enquiry.status}
            </Badge>
            {enquiry.sectionLabel ? (
              <Badge tone="neutral">{enquiry.sectionLabel}</Badge>
            ) : null}
            {enquiry.teachingGroupLabel ? (
              <Badge tone="neutral">{enquiry.teachingGroupLabel}</Badge>
            ) : null}
            <Badge tone="neutral">
              Assignee: {enquiry.assignedToName ?? "Unassigned"}
            </Badge>
          </div>

          <div className="rounded-md border border-border-subtle bg-elevated p-3 text-sm leading-relaxed text-fg whitespace-pre-wrap">
            {enquiry.body}
          </div>

          {enquiry.resolutionSummary ? (
            <div className="rounded-md border border-status-success bg-surface p-3">
              <div className="font-semibold text-status-success">
                Official Resolution Summary
              </div>
              <p className="mt-1 whitespace-pre-wrap text-fg">
                {enquiry.resolutionSummary}
              </p>
            </div>
          ) : null}

          {detail.whatsAppUrl ? (
            <div className="rounded-md border border-border-strong bg-elevated p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-fg">
                    Informal WhatsApp Coordination
                  </div>
                  <p className="text-[11px] text-fg-muted">
                    Informal chat only — official decisions and records must
                    stay in DD-oodle
                  </p>
                </div>
                <a
                  href={detail.whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center rounded-md border border-accent bg-surface px-3 text-xs font-medium text-accent hover:bg-elevated"
                >
                  Open WhatsApp Chat ↗
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      {detail.canManageEnquiry && staffTargetOptions.length > 0 ? (
        <Card
          title="Case Triage & Resolution"
          description="Assign staff owner, transition case status, and record a mandatory official resolution summary when marking resolved."
        >
          <RegistryActionForm
            action={boundUpdateEnquiry}
            submitLabel="Update Case Status"
            pendingLabel="Updating..."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="triage-target-status"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Next Status
                </label>
                <select
                  id="triage-target-status"
                  name="targetStatus"
                  defaultValue={staffTargetOptions[0]}
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  {staffTargetOptions.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="triage-assignee"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Assign Staff Owner (Optional)
                </label>
                <select
                  id="triage-assignee"
                  name="assignedToPersonId"
                  defaultValue={enquiry.assignedToPersonId ?? ""}
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  <option value="">Unassigned</option>
                  {detail.staffAssignees.map((st) => (
                    <option key={st.personId} value={st.personId}>
                      {st.fullName}
                      {st.designation ? ` (${st.designation})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="triage-resolution-summary"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Resolution Summary (required min 5 chars when status =
                  resolved)
                </label>
                <textarea
                  id="triage-resolution-summary"
                  name="resolutionSummary"
                  rows={2}
                  maxLength={2000}
                  defaultValue={enquiry.resolutionSummary ?? ""}
                  placeholder="Record verified official resolution details..."
                  className="w-full rounded-md border border-border-strong bg-surface p-2 text-xs text-fg"
                />
              </div>
            </div>
          </RegistryActionForm>
        </Card>
      ) : detail.canGuardianClose ? (
        <Card
          title="Guardian Case Action"
          description="Close this enquiry case once your question has been resolved."
        >
          <RegistryActionForm
            action={boundUpdateEnquiry}
            submitLabel="Close Enquiry Case"
            pendingLabel="Closing..."
            submitVariant="secondary"
          >
            <input type="hidden" name="targetStatus" value="closed" />
          </RegistryActionForm>
        </Card>
      ) : null}

      <Card
        title="Contextual Enquiry Thread"
        description="Structured updates bound strictly to this enquiry case (internal staff notes are isolated from guardians and students)."
      >
        <div className="space-y-4">
          {detail.comments.length === 0 ? (
            <p className="text-xs text-fg-muted">
              No case notes recorded yet.
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

          {enquiry.status !== "closed" ? (
            <RegistryActionForm
              action={boundComment}
              submitLabel="Post Case Update"
              pendingLabel="Posting..."
            >
              <div className="space-y-2.5">
                <div>
                  <label
                    htmlFor="enquiry-comment-body"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Contextual Case Note (2–2000 chars)
                  </label>
                  <textarea
                    id="enquiry-comment-body"
                    name="body"
                    required
                    minLength={2}
                    maxLength={2000}
                    rows={2}
                    placeholder="Add a structured follow-up bound to this enquiry..."
                    className="w-full rounded-md border border-border-strong bg-surface p-2 text-xs text-fg"
                  />
                </div>

                {detail.canPostInternalNote ? (
                  <div className="flex items-center gap-2">
                    <input
                      id="enquiry-comment-internal"
                      name="isInternalStaffNote"
                      type="checkbox"
                      className="h-4 w-4 rounded border-border-strong"
                    />
                    <label
                      htmlFor="enquiry-comment-internal"
                      className="text-xs font-medium text-fg"
                    >
                      Internal Staff Note (hidden from guardian &amp; student)
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
