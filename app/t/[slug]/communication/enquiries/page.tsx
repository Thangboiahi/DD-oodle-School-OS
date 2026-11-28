import Link from "next/link";
import { createParentEnquiryAction } from "@/app/t/[slug]/communication/actions";
import { CommunicationSubNav } from "@/components/communication/CommunicationSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import {
  ENQUIRY_CATEGORIES,
  ENQUIRY_STATUSES,
  type EnquiryStatus,
} from "@/lib/communication/schemas";
import { getParentEnquiriesWorkspace } from "@/server/communication/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface ParentEnquiriesPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; category?: string }>;
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

export default async function ParentEnquiriesPage({
  params,
  searchParams,
}: ParentEnquiriesPageProps) {
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
  const workspace = await getParentEnquiriesWorkspace(context, {
    statusFilter: query.status,
    categoryFilter: query.category,
  });

  const noticesPath = `/t/${encodeURIComponent(context.institutionSlug)}/communication`;

  if (!workspace.allowed) {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <CommunicationSubNav
          slug={context.institutionSlug}
          activeTab="enquiries"
          canAccessEnquiries={false}
        />
        <StateNotice
          kind="permission-denied"
          title="Parent enquiry workflows restricted"
          description={
            workspace.isMonitorRestricted
              ? "Classroom monitors hold read-only access to published notices and verified attendance boards only and cannot access parent enquiries."
              : "Parent enquiries are accessible strictly to linked guardians, assigned academic staff, and authorized institutional leadership."
          }
          action={
            <Link
              href={noticesPath}
              className="inline-flex min-h-10 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
            >
              Open Official Notices
            </Link>
          }
        />
      </div>
    );
  }

  const boundCreateEnquiry = createParentEnquiryAction.bind(
    null,
    context.institutionSlug,
  );

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <CommunicationSubNav
        slug={context.institutionSlug}
        activeTab="enquiries"
        canAccessEnquiries={true}
      />

      <Card
        title="Formal Parent Enquiries Filter"
        description="Structured case tracking (open → in_review → resolved → closed) enforced via PostgreSQL RLS."
      >
        <form
          method="GET"
          className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4"
        >
          <div>
            <label
              htmlFor="enquiry-status-filter"
              className="mb-1 block text-xs font-medium text-fg"
            >
              Case Status
            </label>
            <select
              id="enquiry-status-filter"
              name="status"
              defaultValue={workspace.statusFilter}
              className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
            >
              <option value="all">All Statuses</option>
              {ENQUIRY_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="enquiry-category-filter"
              className="mb-1 block text-xs font-medium text-fg"
            >
              Category
            </label>
            <select
              id="enquiry-category-filter"
              name="category"
              defaultValue={workspace.categoryFilter}
              className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
            >
              <option value="all">All Categories</option>
              {ENQUIRY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button type="submit" variant="secondary" size="sm">
              Apply Filter
            </Button>
          </div>
        </form>
      </Card>

      {workspace.canSubmitEnquiry && workspace.guardianWards.length > 0 ? (
        <Card
          title="Submit Formal Enquiry"
          description="File an official enquiry strictly for your linked ward; internal school follow-up stays tracked on this case."
        >
          <RegistryActionForm
            action={boundCreateEnquiry}
            submitLabel="Submit Formal Enquiry"
            pendingLabel="Submitting..."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="enquiry-ward-select"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Student / Linked Ward
                </label>
                <select
                  id="enquiry-ward-select"
                  name="studentProfileId"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  {workspace.guardianWards.map((ward) => (
                    <option
                      key={ward.studentProfileId}
                      value={ward.studentProfileId}
                    >
                      {ward.fullName} ({ward.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="enquiry-category-select"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Category
                </label>
                <select
                  id="enquiry-category-select"
                  name="category"
                  defaultValue="academic"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  {ENQUIRY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {workspace.teachingGroups.length > 0 ? (
                <div>
                  <label
                    htmlFor="enquiry-tg-select"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Subject / Batch Context (Optional)
                  </label>
                  <select
                    id="enquiry-tg-select"
                    name="teachingGroupId"
                    defaultValue=""
                    className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                  >
                    <option value="">None (Section / General Office)</option>
                    {workspace.teachingGroups.map((tg) => (
                      <option key={tg.id} value={tg.id}>
                        {tg.code} — {tg.subjectName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="sm:col-span-2 lg:col-span-3">
                <label
                  htmlFor="enquiry-subject-input"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Subject (3–160 chars)
                </label>
                <input
                  id="enquiry-subject-input"
                  name="subject"
                  type="text"
                  required
                  minLength={3}
                  maxLength={160}
                  placeholder="Schedule clarification for practical lab timings"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label
                  htmlFor="enquiry-body-input"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Enquiry Details (5–4000 chars)
                </label>
                <textarea
                  id="enquiry-body-input"
                  name="body"
                  required
                  minLength={5}
                  maxLength={4000}
                  rows={3}
                  placeholder="Describe your formal request or question clearly..."
                  className="w-full rounded-md border border-border-strong bg-surface p-2.5 text-xs text-fg"
                />
              </div>
            </div>
          </RegistryActionForm>
        </Card>
      ) : null}

      <Card
        title="Formal Parent Enquiry Cases"
        description={`${workspace.enquiries.length} enquiry case(s) visible in your institutional and relationship scope.`}
      >
        {workspace.enquiries.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No parent enquiry cases found"
            description="Adjust status/category filters or file a formal enquiry for a linked ward above."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full min-w-[46rem] divide-y divide-border-subtle text-left text-xs">
              <thead className="bg-elevated text-fg-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Case &amp; Subject</th>
                  <th className="px-3 py-2 font-medium">Student / Guardian</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Assignee</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface">
                {workspace.enquiries.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-fg">
                        {enquiry.subject}
                      </div>
                      <div className="text-[11px] text-fg-muted">
                        {enquiry.sectionLabel ?? ""}
                        {enquiry.teachingGroupLabel
                          ? ` • ${enquiry.teachingGroupLabel}`
                          : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-fg">
                        {enquiry.studentName}
                      </div>
                      <div className="text-[11px] text-fg-muted">
                        By {enquiry.guardianName}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone="accent">{enquiry.category}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={enquiryStatusTone(enquiry.status)}>
                        {enquiry.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-fg-muted">
                      {enquiry.assignedToName ?? "Unassigned"}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`${noticesPath}/enquiries/${encodeURIComponent(enquiry.id)}`}
                        className="inline-flex min-h-9 items-center rounded-md border border-accent bg-surface px-3 text-xs font-medium text-accent hover:bg-elevated"
                      >
                        Open Case
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
