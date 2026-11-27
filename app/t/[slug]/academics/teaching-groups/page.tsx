import {
  addStudentToTeachingGroupAction,
  createTeachingGroupAction,
} from "@/app/t/[slug]/academics/actions";
import { AcademicsSubNav } from "@/components/academics/AcademicsSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { evaluatePermission } from "@/lib/auth/permissions";
import { listTeachingGroups } from "@/server/academics/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface TeachingGroupsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}

export default async function TeachingGroupsPage({
  params,
  searchParams,
}: TeachingGroupsPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const resolution = await resolveVerifiedTenantContext(slug);

  if (resolution.status !== "ok") {
    return (
      <StateNotice
        kind="permission-denied"
        title="Workspace verification required"
        description="Server-side membership verification did not succeed."
      />
    );
  }

  const { context } = resolution;
  const canManageAcademics = evaluatePermission(context, {
    permission: "academics.manage",
  }).allowed;

  const data = await listTeachingGroups(context, query.session);
  const boundCreateGroup = data.selectedSession
    ? createTeachingGroupAction.bind(
        null,
        context.institutionSlug,
        data.selectedSession.id,
      )
    : null;
  const boundAddMember = addStudentToTeachingGroupAction.bind(
    null,
    context.institutionSlug,
  );

  return (
    <div className="space-y-[var(--density-gap)]">
      <AcademicsSubNav
        slug={context.institutionSlug}
        activeTab="teaching-groups"
        sessionId={data.selectedSession?.id}
      />

      <Card
        title="Teaching Groups (Including Cross-Section Electives)"
        description="Cross-section groups allow learners from XI-A, XI-B, and distinct streams to share subject instruction cleanly without duplicating person or section records."
      >
        {data.groups.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No teaching groups in this session"
            description="Create a teaching group below to start allocating students."
          />
        ) : (
          <div className="space-y-3">
            {data.groups.map((group) => (
              <div
                key={group.id}
                className="rounded-md border border-border-subtle bg-elevated p-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-fg">
                      {group.name}{" "}
                      <span className="font-mono text-fg-muted">
                        ({group.code})
                      </span>
                    </p>
                    <p className="text-fg-muted">
                      Subject: {group.subjectName} ({group.subjectCode}) •
                      Venue: {group.venueLabel ?? "TBD"} • Teacher:{" "}
                      {group.subjectTeachers.length > 0
                        ? group.subjectTeachers.join(", ")
                        : "Unassigned"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {group.isCrossSection ? (
                      <Badge tone="accent">Cross-Section</Badge>
                    ) : (
                      <Badge tone="neutral">Single-Section</Badge>
                    )}
                    {group.sectionBreakdown.map((sec) => (
                      <Badge key={sec.sectionCode} tone="success">
                        {sec.sectionCode}: {sec.count}
                      </Badge>
                    ))}
                  </div>
                </div>

                {group.members.length > 0 ? (
                  <ul className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border-subtle pt-2.5">
                    {group.members.map((member) => (
                      <li key={member.membershipId}>
                        <Badge tone="neutral">
                          {member.fullName} • {member.sectionCode} (
                          {member.admissionNumber})
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-fg-muted">
                    No visible members for your current access scope.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {canManageAcademics && boundCreateGroup ? (
        <div className="grid gap-[var(--density-gap)] lg:grid-cols-2">
          <Card title="Create Teaching Group">
            <RegistryActionForm
              action={boundCreateGroup}
              submitLabel="Create Teaching Group"
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="tg-offering"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Subject Offering *
                  </label>
                  <select
                    id="tg-offering"
                    name="subjectOfferingId"
                    required
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  >
                    {data.offerings.map((off) => (
                      <option key={off.id} value={off.id}>
                        Grade {off.gradeCode} • {off.subjectName} (
                        {off.subjectCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="tg-code"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Group Code *
                  </label>
                  <input
                    id="tg-code"
                    name="code"
                    required
                    placeholder="TG-XI-ECO-1"
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 font-mono text-xs text-fg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tg-name"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Group Name *
                  </label>
                  <input
                    id="tg-name"
                    name="name"
                    required
                    placeholder="Class XI Economics (Cross-Section)"
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tg-venue"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Venue
                  </label>
                  <input
                    id="tg-venue"
                    name="venueLabel"
                    placeholder="Seminar Hall 2"
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  />
                </div>
                <div className="flex items-center pt-5 text-xs">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" name="isCrossSection" defaultChecked />
                    <span>Cross-section teaching group</span>
                  </label>
                </div>
              </div>
            </RegistryActionForm>
          </Card>

          <Card
            title="Allocate Student to Teaching Group"
            description="Validates matching session AND active student subject enrolment prior to allocation."
          >
            <RegistryActionForm
              action={boundAddMember}
              submitLabel="Add Student to Group"
              submitVariant="secondary"
            >
              <div className="grid gap-2.5">
                <div>
                  <label
                    htmlFor="tg-member-group"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Teaching Group *
                  </label>
                  <select
                    id="tg-member-group"
                    name="teachingGroupId"
                    required
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  >
                    {data.groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.code} — {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="tg-member-enrol"
                    className="mb-1 block text-xs font-medium text-fg"
                  >
                    Enrolled Student *
                  </label>
                  <select
                    id="tg-member-enrol"
                    name="studentEnrolmentId"
                    required
                    className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  >
                    {data.activeEnrolments.map((enr) => (
                      <option key={enr.id} value={enr.id}>
                        {enr.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </RegistryActionForm>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
