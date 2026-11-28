import Link from "next/link";
import { PlanningSubNav } from "@/components/planning/PlanningSubNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { getAcademicOversightWorkspace } from "@/server/planning/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface PlanningOversightPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    department?: string;
    section?: string;
  }>;
}

export default async function AcademicPlanningOversightPage({
  params,
  searchParams,
}: PlanningOversightPageProps) {
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
  const workspace = await getAcademicOversightWorkspace(context, {
    departmentId: query.department,
    sectionId: query.section,
  });

  if (workspace.accessDenied) {
    return (
      <div className="min-w-0 space-y-[var(--density-gap)]">
        <PlanningSubNav
          slug={context.institutionSlug}
          activeTab="oversight"
          canAccessLessonPlans={workspace.access.canAccessLessonPlans}
          canAccessOversight={false}
        />
        <StateNotice
          kind="permission-denied"
          title="HOD, Class Teacher & Leadership Oversight Only"
          description="Academic pacing oversight is scoped strictly to Academic Leadership, Heads of Department (HOD), and Class Teachers."
        />
      </div>
    );
  }

  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/planning/oversight`;

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      <PlanningSubNav
        slug={context.institutionSlug}
        activeTab="oversight"
        canAccessLessonPlans={workspace.access.canAccessLessonPlans}
        canAccessOversight={workspace.access.canAccessOversight}
      />

      <Card
        title="HOD & Class Teacher Pacing Oversight"
        description={
          workspace.activeSession
            ? `Aggregated syllabus completion, delayed items, lesson delivery, and resource readiness for ${workspace.activeSession.name}.`
            : "Aggregated syllabus completion and instructional readiness."
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">
              Avg {workspace.averageCompletionPercent}% Complete
            </Badge>
          </div>
          <form
            method="get"
            action={basePath}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-1">
              <label
                htmlFor="oversight-dept"
                className="block text-xs font-medium text-fg"
              >
                Department
              </label>
              <select
                id="oversight-dept"
                name="department"
                defaultValue={workspace.selectedDepartmentId}
                className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
              >
                <option value="all">All scoped departments</option>
                {workspace.departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="oversight-section"
                className="block text-xs font-medium text-fg"
              >
                CBSE Section (Class)
              </label>
              <select
                id="oversight-section"
                name="section"
                defaultValue={workspace.selectedSectionId}
                className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-xs text-fg"
              >
                <option value="all">All scoped sections</option>
                {workspace.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.gradeCode} {section.code} — {section.name}
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

          <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-md border border-border-subtle bg-elevated p-2">
              <dt className="text-fg-muted">Scoped Offerings</dt>
              <dd className="text-base font-semibold text-fg">
                {workspace.subjectRollups.length}
              </dd>
            </div>
            <div className="rounded-md border border-border-subtle bg-elevated p-2">
              <dt className="text-fg-muted">Avg Completion</dt>
              <dd className="text-base font-semibold text-accent">
                {workspace.averageCompletionPercent}%
              </dd>
            </div>
            <div className="rounded-md border border-border-subtle bg-elevated p-2">
              <dt className="text-fg-muted">Lesson Plans</dt>
              <dd className="text-base font-semibold text-fg">
                {workspace.totalLessonPlans}
              </dd>
            </div>
            <div className="rounded-md border border-border-subtle bg-elevated p-2">
              <dt className="text-fg-muted">Published Resources</dt>
              <dd className="text-base font-semibold text-status-success">
                {workspace.totalPublishedResources}
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      <Card
        title="Subject Progress Rollup"
        description="Completion percentages and instructional readiness per scoped subject offering."
      >
        {workspace.subjectRollups.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No offerings in current oversight filter"
            description="Adjust department or section filters to inspect syllabus progress."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-fg-muted">
                  <th className="py-2 pr-3 font-medium">Subject Offering</th>
                  <th className="py-2 pr-3 font-medium">Department</th>
                  <th className="py-2 pr-3 font-medium">Completion</th>
                  <th className="py-2 pr-3 font-medium">Delayed</th>
                  <th className="py-2 pr-3 font-medium">Lessons</th>
                  <th className="py-2 font-medium">Resources</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {workspace.subjectRollups.map((row) => (
                  <tr key={row.offeringId}>
                    <td className="py-2 pr-3 font-medium text-fg">
                      <Link
                        href={`/t/${encodeURIComponent(context.institutionSlug)}/planning?offering=${encodeURIComponent(row.offeringId)}`}
                        className="text-accent hover:underline"
                      >
                        {row.offeringLabel}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-fg-muted">
                      {row.departmentName}
                    </td>
                    <td className="py-2 pr-3 text-fg">
                      {row.rollup.completionPercent}% (
                      {row.rollup.completed + row.rollup.revised}/
                      {row.rollup.total})
                    </td>
                    <td className="py-2 pr-3">
                      <Badge
                        tone={row.rollup.delayed > 0 ? "danger" : "neutral"}
                      >
                        {row.rollup.delayed}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-fg">
                      {row.deliveredOrRevisedLessons}/{row.lessonPlanCount}
                    </td>
                    <td className="py-2 text-fg">
                      {row.publishedResourceCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Delayed Items & Carry-Forward Watchlist"
        description="Syllabus topics flagged as delayed with required explanations for HOD/Class Teacher follow-up."
      >
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Badge tone={workspace.delayedItems.length > 0 ? "danger" : "success"}>
            {workspace.delayedItems.length} Flagged
          </Badge>
        </div>
        {workspace.delayedItems.length === 0 ? (
          <StateNotice
            kind="empty"
            title="Zero delayed syllabus items"
            description="All tracked syllabus units, chapters, and topics in scope are on schedule."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-fg-muted">
                  <th className="py-2 pr-3 font-medium">Offering</th>
                  <th className="py-2 pr-3 font-medium">Item</th>
                  <th className="py-2 pr-3 font-medium">Target</th>
                  <th className="py-2 pr-3 font-medium">Delay Reason</th>
                  <th className="py-2 font-medium">Carry-Forward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {workspace.delayedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 pr-3 font-medium text-fg">
                      {item.offeringLabel}
                    </td>
                    <td className="py-2 pr-3 text-fg">
                      <span className="font-mono text-fg-muted">
                        {item.code}
                      </span>{" "}
                      {item.title}
                    </td>
                    <td className="py-2 pr-3 text-fg-muted">
                      {item.targetDate ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-status-danger">
                      {item.delayReason}
                    </td>
                    <td className="py-2 text-fg-muted">
                      {item.carryForwardNotes ?? "—"}
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
