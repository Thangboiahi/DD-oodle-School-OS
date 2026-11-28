import Link from "next/link";
import { createNoticeAction } from "@/app/t/[slug]/communication/actions";
import { CommunicationSubNav } from "@/components/communication/CommunicationSubNav";
import { OfflineNoticesCachePanel } from "@/components/communication/OfflineNoticesCachePanel";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import {
  NOTICE_CATEGORIES,
  NOTICE_SCOPE_TYPES,
  type NoticeCategory,
  type NoticeStatus,
} from "@/lib/communication/schemas";
import { getNoticesWorkspace } from "@/server/communication/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface CommunicationNoticesPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    scope?: string;
    category?: string;
    drafts?: string;
  }>;
}

function noticeCategoryTone(category: NoticeCategory): BadgeTone {
  if (category === "urgent") return "danger";
  if (category === "exam") return "warning";
  return "accent";
}

function noticeStatusTone(status: NoticeStatus): BadgeTone {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  return "neutral";
}

export default async function CommunicationNoticesPage({
  params,
  searchParams,
}: CommunicationNoticesPageProps) {
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
  const workspace = await getNoticesWorkspace(context, {
    scopeFilter: query.scope,
    categoryFilter: query.category,
    includeDrafts: query.drafts === "1",
  });

  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/communication`;
  const boundCreateNotice = createNoticeAction.bind(
    null,
    context.institutionSlug,
  );
  const defaultScope = workspace.authoringPolicy.allowedScopes[0] ?? "teaching_group";

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <CommunicationSubNav
        slug={context.institutionSlug}
        activeTab="notices"
        canAccessEnquiries={workspace.canAccessEnquiries}
      />

      {workspace.isMonitorRestricted ? (
        <div
          role="status"
          className="rounded-lg border border-border-strong bg-surface p-[var(--density-pad)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-fg">
                Monitor / Monitress Read-Only Notice Board View
              </h2>
              <p className="text-xs text-fg-muted">
                Classroom monitors may inspect published institution and section
                notices for classroom coordination only. Drafts, parent enquiries,
                and staff internal notes remain strictly hidden.
              </p>
            </div>
            <Badge tone="accent">Published Board Only</Badge>
          </div>
        </div>
      ) : (
        <div
          role="status"
          className="rounded-lg border border-border-subtle bg-elevated px-3 py-2 text-xs text-fg-muted"
        >
          <strong>Structured Operational Communication:</strong> Official school
          circulars, acknowledgements, formal parent enquiries, and record-bound
          notes stay inside DD-oodle; casual day-to-day chatting remains outside on
          WhatsApp.
        </div>
      )}

      <Card
        title="Controlled Offline Notice Cache"
        description="Client-side cache restricted strictly to published official notices explicitly marked offline-cacheable."
      >
        <OfflineNoticesCachePanel
          slug={context.institutionSlug}
          cacheableNotices={workspace.cacheableNotices}
        />
      </Card>

      <Card
        title="Official Notices Filter"
        description={
          workspace.activeSession
            ? `Active Session: ${workspace.activeSession.name} (${workspace.activeSession.code})`
            : "No active academic session configured."
        }
      >
        <form
          method="GET"
          className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label
              htmlFor="notice-scope-filter"
              className="mb-1 block text-xs font-medium text-fg"
            >
              Scope
            </label>
            <select
              id="notice-scope-filter"
              name="scope"
              defaultValue={workspace.scopeFilter}
              className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
            >
              <option value="all">All Visible Scopes</option>
              {NOTICE_SCOPE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="notice-category-filter"
              className="mb-1 block text-xs font-medium text-fg"
            >
              Category
            </label>
            <select
              id="notice-category-filter"
              name="category"
              defaultValue={workspace.categoryFilter}
              className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
            >
              <option value="all">All Categories</option>
              {NOTICE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {!workspace.isMonitorRestricted ? (
            <div className="flex items-center gap-2 pt-5">
              <input
                id="notice-include-drafts"
                name="drafts"
                type="checkbox"
                value="1"
                defaultChecked={workspace.includeDrafts}
                className="h-4 w-4 rounded border-border-strong"
              />
              <label
                htmlFor="notice-include-drafts"
                className="text-xs font-medium text-fg"
              >
                Include Permitted Drafts
              </label>
            </div>
          ) : null}

          <div className="flex items-end">
            <Button type="submit" variant="secondary" size="sm">
              Apply Filter
            </Button>
          </div>
        </form>
      </Card>

      {workspace.authoringPolicy.canCreateNotice ? (
        <Card
          title="Issue Scoped Official Notice"
          description="Scope options are enforced by your active institutional & teaching assignments under PostgreSQL RLS."
        >
          <RegistryActionForm
            action={boundCreateNotice}
            submitLabel="Save Official Notice"
            pendingLabel="Saving Notice..."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="create-notice-scope"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Target Scope
                </label>
                <select
                  id="create-notice-scope"
                  name="scopeType"
                  defaultValue={defaultScope}
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  {workspace.authoringPolicy.allowedScopes.map((sc) => (
                    <option key={sc} value={sc}>
                      {sc}
                    </option>
                  ))}
                </select>
              </div>

              {workspace.authoringPolicy.allowedScopes.includes("department") ? (
                <div>
                  <label
                    htmlFor="create-notice-dept"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Department Target (if scope = department)
                  </label>
                  <select
                    id="create-notice-dept"
                    name="departmentId"
                    defaultValue={
                      defaultScope === "department"
                        ? (workspace.departments[0]?.id ?? "")
                        : ""
                    }
                    className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                  >
                    <option value="">— Select Department —</option>
                    {workspace.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {workspace.authoringPolicy.allowedScopes.includes("section") ? (
                <div>
                  <label
                    htmlFor="create-notice-section"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Section Target (if scope = section)
                  </label>
                  <select
                    id="create-notice-section"
                    name="sectionId"
                    defaultValue={
                      defaultScope === "section"
                        ? (workspace.sections[0]?.id ?? "")
                        : ""
                    }
                    className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                  >
                    <option value="">— Select Section —</option>
                    {workspace.sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.gradeCode} {sec.code} — {sec.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {workspace.authoringPolicy.allowedScopes.includes(
                "teaching_group",
              ) ? (
                <div>
                  <label
                    htmlFor="create-notice-tg"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Teaching Group (if scope = teaching_group)
                  </label>
                  <select
                    id="create-notice-tg"
                    name="teachingGroupId"
                    defaultValue={
                      defaultScope === "teaching_group"
                        ? (workspace.teachingGroups[0]?.id ?? "")
                        : ""
                    }
                    className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                  >
                    <option value="">— Select Teaching Group —</option>
                    {workspace.teachingGroups.map((tg) => (
                      <option key={tg.id} value={tg.id}>
                        {tg.code} — {tg.subjectName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="create-notice-category"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Category
                </label>
                <select
                  id="create-notice-category"
                  name="category"
                  defaultValue="academic"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  {NOTICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="create-notice-status"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Initial Status
                </label>
                <select
                  id="create-notice-status"
                  name="initialStatus"
                  defaultValue="published"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                >
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label
                  htmlFor="create-notice-title"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Notice Title (3–160 chars)
                </label>
                <input
                  id="create-notice-title"
                  name="title"
                  type="text"
                  required
                  minLength={3}
                  maxLength={160}
                  placeholder="Term 2 Seminar Schedule Update"
                  className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label
                  htmlFor="create-notice-body"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Notice Body (5–5000 chars)
                </label>
                <textarea
                  id="create-notice-body"
                  name="body"
                  required
                  minLength={5}
                  maxLength={5000}
                  rows={3}
                  placeholder="Provide structured details, timings, and actionable instructions..."
                  className="w-full rounded-md border border-border-strong bg-surface p-2.5 text-xs text-fg"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="create-notice-ack"
                  name="requiresAcknowledgement"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border-strong"
                />
                <label
                  htmlFor="create-notice-ack"
                  className="text-xs font-medium text-fg"
                >
                  Require Acknowledgement
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="create-notice-offline"
                  name="isOfflineCacheable"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border-strong"
                />
                <label
                  htmlFor="create-notice-offline"
                  className="text-xs font-medium text-fg"
                >
                  Allow Controlled Offline Notice Cache (§12.5)
                </label>
              </div>
            </div>
          </RegistryActionForm>
        </Card>
      ) : null}

      <Card
        title="Visible Official Notices"
        description={`${workspace.notices.length} notice(s) matching current filter and RLS visibility scope.`}
      >
        {workspace.notices.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No official notices match filter"
            description="Adjust scope or category filters, or check back when leadership or subject teachers publish notices."
          />
        ) : (
          <div className="space-y-3">
            {workspace.notices.map((notice) => (
              <article
                key={notice.id}
                className="rounded-lg border border-border-subtle bg-elevated p-3 text-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-fg">
                      {notice.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={noticeCategoryTone(notice.category)}>
                        {notice.category}
                      </Badge>
                      <Badge tone="neutral">{notice.targetLabel}</Badge>
                      <Badge tone={noticeStatusTone(notice.status)}>
                        {notice.status}
                      </Badge>
                      {notice.isOfflineCacheable ? (
                        <Badge tone="success">Offline Cacheable</Badge>
                      ) : null}
                      {notice.requiresAcknowledgement ? (
                        <Badge
                          tone={
                            notice.callerHasAcknowledged ? "success" : "warning"
                          }
                        >
                          {notice.callerHasAcknowledged
                            ? `Acknowledged (${notice.acknowledgementCount})`
                            : `Ack Required (${notice.acknowledgementCount})`}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right text-[11px] text-fg-muted">
                      <div>By {notice.authoredByName}</div>
                      <div className="font-mono">
                        {(notice.publishedAt ?? notice.createdAt).slice(0, 10)}
                      </div>
                    </div>
                    <Link
                      href={`${basePath}/notices/${encodeURIComponent(notice.id)}`}
                      className="inline-flex min-h-9 items-center rounded-md border border-accent bg-surface px-3 text-xs font-medium text-accent hover:bg-elevated"
                    >
                      Open Notice
                    </Link>
                  </div>
                </div>

                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-fg">
                  {notice.body}
                </p>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
