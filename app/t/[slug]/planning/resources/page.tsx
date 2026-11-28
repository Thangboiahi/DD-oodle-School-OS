import Link from "next/link";
import {
  createLearningResourceAction,
  transitionResourceStatusAction,
} from "@/app/t/[slug]/planning/actions";
import { PlanningSubNav } from "@/components/planning/PlanningSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import {
  LEARNING_RESOURCE_KINDS,
  LEARNING_RESOURCE_STATUSES,
  LEARNING_RESOURCE_VISIBILITIES,
  type LearningResourceKind,
  type LearningResourceStatus,
} from "@/lib/planning/schemas";
import { getLearningResourcesWorkspace } from "@/server/planning/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface LearningResourcesPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    offering?: string;
    group?: string;
    kind?: string;
    drafts?: string;
  }>;
}

function resourceStatusTone(status: LearningResourceStatus): BadgeTone {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  return "neutral";
}

function formatKindLabel(kind: LearningResourceKind): string {
  return kind.replace("_", " ");
}

export default async function AcademicPlanningResourcesPage({
  params,
  searchParams,
}: LearningResourcesPageProps) {
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
  const workspace = await getLearningResourcesWorkspace(context, {
    subjectOfferingId: query.offering,
    teachingGroupId: query.group,
    kindFilter: query.kind,
    includeDrafts: query.drafts === "1",
  });

  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/planning/resources`;
  const boundCreateResource = createLearningResourceAction.bind(
    null,
    context.institutionSlug,
  );

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <PlanningSubNav
        slug={context.institutionSlug}
        activeTab="resources"
        canAccessLessonPlans={workspace.access.canAccessLessonPlans}
        canAccessOversight={workspace.access.canAccessOversight}
      />

      <Card
        title="Subject Learning Resources"
        description="Structured links, study notes, and private document references scoped cleanly to Subject Offerings or Teaching Groups."
      >
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{workspace.resources.length} Resources</Badge>
        </div>
        <form
          method="get"
          action={basePath}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="space-y-1">
            <label
              htmlFor="res-filter-offering"
              className="block text-xs font-medium text-fg"
            >
              Subject Offering
            </label>
            <select
              id="res-filter-offering"
              name="offering"
              defaultValue={workspace.selectedOfferingId}
              className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
            >
              <option value="all">All offerings</option>
              {workspace.offerings.map((offering) => (
                <option key={offering.id} value={offering.id}>
                  {offering.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="res-filter-group"
              className="block text-xs font-medium text-fg"
            >
              Teaching Group
            </label>
            <select
              id="res-filter-group"
              name="group"
              defaultValue={workspace.selectedGroupId}
              className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
            >
              <option value="all">All teaching groups</option>
              {workspace.teachingGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="res-filter-kind"
              className="block text-xs font-medium text-fg"
            >
              Resource Kind
            </label>
            <select
              id="res-filter-kind"
              name="kind"
              defaultValue={workspace.kindFilter}
              className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
            >
              <option value="all">All kinds</option>
              {LEARNING_RESOURCE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {formatKindLabel(kind)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            {workspace.access.canManageResources ? (
              <label className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border-subtle bg-elevated px-2.5 text-xs text-fg">
                <input
                  type="checkbox"
                  name="drafts"
                  value="1"
                  defaultChecked={workspace.includeDrafts}
                />
                Include drafts
              </label>
            ) : null}
            <Button type="submit" size="sm" variant="primary">
              Apply
            </Button>
            <Link
              href={basePath}
              className="inline-flex min-h-9 items-center rounded-md border border-border-subtle px-3 text-xs font-medium text-fg hover:bg-elevated"
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>

      {workspace.access.canManageResources &&
      workspace.manageableOfferings.length > 0 ? (
        <Card
          title="Publish or Draft Learning Resource"
          description="Attach an HTTP(S) reference link or a private Supabase storage path inside institution-private."
        >
          <RegistryActionForm
            action={boundCreateResource}
            submitLabel="Save Learning Resource"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label
                  htmlFor="res-offering"
                  className="block text-xs font-medium text-fg"
                >
                  Subject Offering
                </label>
                <select
                  id="res-offering"
                  name="subjectOfferingId"
                  defaultValue={workspace.manageableOfferings[0]?.id ?? ""}
                  required
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  {workspace.manageableOfferings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {offering.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="res-visibility"
                  className="block text-xs font-medium text-fg"
                >
                  Visibility Scope
                </label>
                <select
                  id="res-visibility"
                  name="visibility"
                  defaultValue="subject_offering"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  {LEARNING_RESOURCE_VISIBILITIES.map((vis) => (
                    <option key={vis} value={vis}>
                      {vis.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="res-group"
                  className="block text-xs font-medium text-fg"
                >
                  Teaching Group (when scoped)
                </label>
                <select
                  id="res-group"
                  name="teachingGroupId"
                  defaultValue=""
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  <option value="">Not scoped to one group</option>
                  {workspace.manageableTeachingGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="res-syllabus"
                  className="block text-xs font-medium text-fg"
                >
                  Linked Syllabus Item
                </label>
                <select
                  id="res-syllabus"
                  name="syllabusItemId"
                  defaultValue=""
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  <option value="">General offering resource</option>
                  {workspace.syllabusOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.code} — {opt.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label
                  htmlFor="res-title"
                  className="block text-xs font-medium text-fg"
                >
                  Resource Title
                </label>
                <input
                  id="res-title"
                  type="text"
                  name="title"
                  required
                  placeholder="NCERT Chapter 2 Summary & Problem Set"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="res-kind"
                  className="block text-xs font-medium text-fg"
                >
                  Resource Kind
                </label>
                <select
                  id="res-kind"
                  name="resourceKind"
                  defaultValue="link"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  {LEARNING_RESOURCE_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {formatKindLabel(kind)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="res-status"
                  className="block text-xs font-medium text-fg"
                >
                  Initial Status
                </label>
                <select
                  id="res-status"
                  name="status"
                  defaultValue="published"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  {LEARNING_RESOURCE_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label
                  htmlFor="res-url"
                  className="block text-xs font-medium text-fg"
                >
                  External HTTPS/HTTP URL (for link resources)
                </label>
                <input
                  id="res-url"
                  type="url"
                  name="externalUrl"
                  placeholder="https://ncert.nic.in/..."
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label
                  htmlFor="res-storage-path"
                  className="block text-xs font-medium text-fg"
                >
                  Private Storage Object Key (optional for document/worksheet)
                </label>
                <input
                  id="res-storage-path"
                  type="text"
                  name="storagePath"
                  placeholder="institution-id/resources/worksheet-1.pdf"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                />
                <input
                  type="hidden"
                  name="storageBucket"
                  value="institution-private"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="res-desc"
                className="block text-xs font-medium text-fg"
              >
                Description
              </label>
              <textarea
                id="res-desc"
                name="description"
                rows={2}
                placeholder="Instructions for students or revision guidance"
                className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
              />
            </div>
          </RegistryActionForm>
        </Card>
      ) : null}

      <Card
        title="Available Resources"
        description="Published materials visible to enrolled students, parents, and scoped subject teachers."
      >
        {workspace.resources.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No learning resources found"
            description="No resources matched the current filters or visibility scope."
          />
        ) : (
          <div className="space-y-2.5">
            {workspace.resources.map((resource) => {
              const boundPublish = transitionResourceStatusAction.bind(
                null,
                context.institutionSlug,
                resource.id,
                "published",
              );
              const boundArchive = transitionResourceStatusAction.bind(
                null,
                context.institutionSlug,
                resource.id,
                "archived",
              );

              return (
                <div
                  key={resource.id}
                  className="rounded-md border border-border-subtle bg-elevated p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral">
                          {formatKindLabel(resource.resourceKind)}
                        </Badge>
                        <Badge tone="neutral">
                          {resource.visibility.replace("_", " ")}
                        </Badge>
                        <h3 className="text-sm font-semibold text-fg">
                          {resource.title}
                        </h3>
                      </div>
                      <p className="text-xs text-fg-muted">
                        {resource.offeringLabel}
                        {resource.teachingGroupLabel
                          ? ` • ${resource.teachingGroupLabel}`
                          : ""}
                        {resource.syllabusItemLabel
                          ? ` • ${resource.syllabusItemLabel}`
                          : ""}
                        {` • By ${resource.authoredByName}`}
                      </p>
                    </div>
                    <Badge tone={resourceStatusTone(resource.status)}>
                      {resource.status}
                    </Badge>
                  </div>

                  {resource.description ? (
                    <p className="text-xs text-fg">{resource.description}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    {resource.externalUrl ? (
                      <a
                        href={resource.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-accent hover:bg-elevated"
                      >
                        Open External Resource ↗
                      </a>
                    ) : null}

                    {resource.signedStorageUrl ? (
                      <a
                        href={resource.signedStorageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-accent hover:bg-elevated"
                      >
                        Open Private File ({resource.storageRefLabel})
                      </a>
                    ) : resource.storageRefLabel ? (
                      <span className="rounded border border-border-subtle bg-surface px-2.5 py-1.5 font-mono text-[11px] text-fg-muted">
                        Ref: {resource.storageRefLabel}
                      </span>
                    ) : null}

                    {resource.canPublish ? (
                      <RegistryActionForm
                        action={boundPublish}
                        submitLabel="Publish"
                        submitVariant="primary"
                        className="inline-flex items-center gap-2"
                      >
                        <input type="hidden" name="target" value="published" />
                      </RegistryActionForm>
                    ) : null}

                    {resource.canArchive ? (
                      <RegistryActionForm
                        action={boundArchive}
                        submitLabel="Archive"
                        submitVariant="secondary"
                        className="inline-flex items-center gap-2"
                      >
                        <input type="hidden" name="target" value="archived" />
                      </RegistryActionForm>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
