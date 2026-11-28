import Link from "next/link";
import {
  createLessonPlanAction,
  updateLessonPlanStatusAction,
} from "@/app/t/[slug]/planning/actions";
import { PlanningSubNav } from "@/components/planning/PlanningSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import {
  LESSON_PLAN_STATUSES,
  type LessonPlanStatus,
} from "@/lib/planning/schemas";
import { getLessonPlansWorkspace } from "@/server/planning/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface LessonPlansPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    group?: string;
    status?: string;
  }>;
}

function lessonStatusTone(status: LessonPlanStatus): BadgeTone {
  if (status === "delivered" || status === "revised") return "success";
  if (status === "carried_forward") return "warning";
  return "accent";
}

export default async function AcademicPlanningLessonsPage({
  params,
  searchParams,
}: LessonPlansPageProps) {
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
  const workspace = await getLessonPlansWorkspace(context, {
    teachingGroupId: query.group,
    statusFilter: query.status,
  });

  if (workspace.accessDenied) {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <PlanningSubNav
          slug={context.institutionSlug}
          activeTab="lessons"
          canAccessLessonPlans={false}
          canAccessOversight={workspace.access.canAccessOversight}
        />
        <StateNotice
          kind="permission-denied"
          title="Staff Teaching & Oversight Workspace Only"
          description="Internal teacher lesson plans are strictly scoped to Subject Teachers, Class Teachers, HODs, and Academic Leadership under Phase 4 RLS."
        />
      </div>
    );
  }

  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/planning/lessons`;
  const boundCreateLesson = createLessonPlanAction.bind(
    null,
    context.institutionSlug,
  );

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <PlanningSubNav
        slug={context.institutionSlug}
        activeTab="lessons"
        canAccessLessonPlans={workspace.access.canAccessLessonPlans}
        canAccessOversight={workspace.access.canAccessOversight}
      />

      <Card
        title="Lesson Plans & Carry-Forward Schedule"
        description="Staff-internal teaching sequence linked to syllabus topics across CBSE Sections and Cross-Section Teaching Groups."
      >
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{workspace.lessonPlans.length} Plans</Badge>
        </div>
        <form
          method="get"
          action={basePath}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="space-y-1">
            <label
              htmlFor="lesson-filter-group"
              className="block text-xs font-medium text-fg"
            >
              Teaching Group
            </label>
            <select
              id="lesson-filter-group"
              name="group"
              defaultValue={workspace.selectedGroupId}
              className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
            >
              <option value="all">All scoped teaching groups</option>
              {workspace.teachingGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="lesson-filter-status"
              className="block text-xs font-medium text-fg"
            >
              Delivery Status
            </label>
            <select
              id="lesson-filter-status"
              name="status"
              defaultValue={workspace.statusFilter}
              className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
            >
              <option value="all">All statuses</option>
              {LESSON_PLAN_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st.replace("_", " ")}
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
      </Card>

      {workspace.writableTeachingGroups.length > 0 ? (
        <Card
          title="Create Lesson Plan"
          description="Plan daily or weekly classroom instruction tied optionally to a syllabus unit, chapter, or topic."
        >
          <RegistryActionForm
            action={boundCreateLesson}
            submitLabel="Create Lesson Plan"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label
                  htmlFor="lesson-group"
                  className="block text-xs font-medium text-fg"
                >
                  Teaching Group
                </label>
                <select
                  id="lesson-group"
                  name="teachingGroupId"
                  defaultValue={workspace.writableTeachingGroups[0]?.id ?? ""}
                  required
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  {workspace.writableTeachingGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="lesson-syllabus"
                  className="block text-xs font-medium text-fg"
                >
                  Linked Syllabus Item
                </label>
                <select
                  id="lesson-syllabus"
                  name="syllabusItemId"
                  defaultValue=""
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  <option value="">None (general lesson)</option>
                  {workspace.syllabusOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.code} — {opt.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="lesson-date"
                  className="block text-xs font-medium text-fg"
                >
                  Planned Date
                </label>
                <input
                  id="lesson-date"
                  type="date"
                  name="plannedForDate"
                  required
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="lesson-week"
                  className="block text-xs font-medium text-fg"
                >
                  Week Label
                </label>
                <input
                  id="lesson-week"
                  type="text"
                  name="weekLabel"
                  placeholder="Week 12"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                />
              </div>

              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label
                  htmlFor="lesson-title"
                  className="block text-xs font-medium text-fg"
                >
                  Lesson Title
                </label>
                <input
                  id="lesson-title"
                  type="text"
                  name="title"
                  required
                  placeholder="Enter lesson title"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="lesson-status"
                  className="block text-xs font-medium text-fg"
                >
                  Initial Status
                </label>
                <select
                  id="lesson-status"
                  name="status"
                  defaultValue="planned"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  {LESSON_PLAN_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="lesson-objectives"
                  className="block text-xs font-medium text-fg"
                >
                  Learning Objectives
                </label>
                <textarea
                  id="lesson-objectives"
                  name="learningObjectives"
                  rows={2}
                  required
                  placeholder="Describe student learning outcomes for this lesson"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="lesson-notes"
                  className="block text-xs font-medium text-fg"
                >
                  Teaching Notes (optional)
                </label>
                <textarea
                  id="lesson-notes"
                  name="teachingNotes"
                  rows={2}
                  placeholder="Activities, board examples, or lab prep"
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
                />
              </div>
            </div>
          </RegistryActionForm>
        </Card>
      ) : null}

      <Card
        title="Scheduled Lesson Plans"
        description="Teachers may mark delivery complete or record carry-forward notes; HODs and Class Teachers review alignment."
      >
        {workspace.lessonPlans.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No lesson plans recorded"
            description="No lesson plans matched the active teaching group or delivery status filter."
          />
        ) : (
          <div className="space-y-2.5">
            {workspace.lessonPlans.map((plan) => {
              const boundStatusUpdate = updateLessonPlanStatusAction.bind(
                null,
                context.institutionSlug,
                plan.id,
              );
              return (
                <div
                  key={plan.id}
                  className="rounded-md border border-border-subtle bg-elevated p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral">{plan.plannedForDate}</Badge>
                        {plan.weekLabel ? (
                          <Badge tone="neutral">{plan.weekLabel}</Badge>
                        ) : null}
                        <h3 className="text-sm font-semibold text-fg">
                          {plan.title}
                        </h3>
                      </div>
                      <p className="text-xs text-fg-muted">
                        {plan.teachingGroupLabel}
                        {plan.syllabusItemLabel
                          ? ` • Syllabus: ${plan.syllabusItemLabel}`
                          : ""}
                        {` • Author: ${plan.authoredByName}`}
                      </p>
                    </div>
                    <Badge tone={lessonStatusTone(plan.status)}>
                      {plan.status.replace("_", " ")}
                    </Badge>
                  </div>

                  <p className="text-xs text-fg">{plan.learningObjectives}</p>

                  {plan.teachingNotes ? (
                    <p className="text-xs text-fg-muted">
                      Notes: {plan.teachingNotes}
                    </p>
                  ) : null}

                  {plan.carryForwardNotes ? (
                    <p className="rounded border border-border-subtle bg-surface px-2.5 py-1.5 text-xs text-status-warning">
                      Carry-forward: {plan.carryForwardNotes}
                    </p>
                  ) : null}

                  {plan.canUpdate ? (
                    <details className="rounded border border-border-subtle bg-surface p-2.5">
                      <summary className="cursor-pointer text-xs font-medium text-accent">
                        Update Delivery Status
                      </summary>
                      <div className="mt-2.5">
                        <RegistryActionForm
                          action={boundStatusUpdate}
                          submitLabel="Update Lesson Plan"
                          submitVariant="secondary"
                        >
                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <div className="space-y-1">
                              <label
                                htmlFor={`lp-status-${plan.id}`}
                                className="block text-xs font-medium text-fg"
                              >
                                Status
                              </label>
                              <select
                                id={`lp-status-${plan.id}`}
                                name="status"
                                defaultValue={plan.status}
                                className="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-fg"
                              >
                                {LESSON_PLAN_STATUSES.map((st) => (
                                  <option key={st} value={st}>
                                    {st.replace("_", " ")}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label
                                htmlFor={`lp-carry-${plan.id}`}
                                className="block text-xs font-medium text-fg"
                              >
                                Carry-Forward Notes
                              </label>
                              <input
                                id={`lp-carry-${plan.id}`}
                                type="text"
                                name="carryForwardNotes"
                                defaultValue={plan.carryForwardNotes ?? ""}
                                placeholder="Reason or makeup session date"
                                className="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-fg"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label
                              htmlFor={`lp-notes-${plan.id}`}
                              className="block text-xs font-medium text-fg"
                            >
                              Teaching Notes
                            </label>
                            <textarea
                              id={`lp-notes-${plan.id}`}
                              name="teachingNotes"
                              rows={2}
                              defaultValue={plan.teachingNotes ?? ""}
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
    </div>
  );
}
