import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { evaluatePermission } from "@/lib/auth/permissions";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

const FOUNDATION_CAPABILITIES = [
  { permission: "institution.manage", label: "Institution Governance" },
  { permission: "people.read", label: "People & Registry Read" },
  { permission: "memberships.read", label: "Memberships Read" },
  { permission: "roles.read", label: "Roles & Assignments Read" },
  { permission: "audit.read", label: "Audit Log Read" },
  { permission: "files.write", label: "Private Storage Write" },
  { permission: "academics.teach", label: "Teaching Group Instruction" },
  { permission: "ward.read", label: "Guardian Ward Access" },
  { permission: "classroom.summary.read", label: "Classroom Summary Read" },
] as const;

interface TenantWorkspacePageProps {
  params: Promise<{ slug: string }>;
}

export default async function TenantWorkspacePage({
  params,
}: TenantWorkspacePageProps) {
  const { slug } = await params;
  const resolution = await resolveVerifiedTenantContext(slug);

  if (resolution.status !== "ok") {
    return (
      <StateNotice
        kind="permission-denied"
        title="Workspace verification required"
        description="Server-side membership verification did not succeed for this request."
      />
    );
  }

  const { context } = resolution;

  return (
    <div className="space-y-[var(--density-gap)]">
      <section id="overview" aria-labelledby="tenant-overview-heading">
        <Card
          title={context.institutionName}
          description="Server-verified multi-tenant institution context enforced by @supabase/ssr getClaims() and PostgreSQL RLS."
        >
          <h2 id="tenant-overview-heading" className="sr-only">
            Institution Metadata
          </h2>
          <dl className="grid gap-3 text-xs sm:grid-cols-4">
            <div>
              <dt className="font-medium text-fg-muted">Slug</dt>
              <dd className="mt-0.5 font-semibold text-fg">
                {context.institutionSlug}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-fg-muted">Board</dt>
              <dd className="mt-0.5 font-semibold text-fg">
                {context.institutionBoard}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-fg-muted">Timezone</dt>
              <dd className="mt-0.5 font-semibold text-fg">
                {context.institutionTimezone}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-fg-muted">Default Theme</dt>
              <dd className="mt-0.5 font-semibold capitalize text-fg">
                {context.defaultThemeFamily}
              </dd>
            </div>
          </dl>
        </Card>
      </section>

      <div className="grid gap-[var(--density-gap)] md:grid-cols-2">
        <section id="governance" aria-labelledby="tenant-assignments-heading">
          <Card
            title="Verified Role & Scope Assignments"
            description="Only active, time-valid role assignments attached to your verified institution membership are evaluated."
          >
            <h2 id="tenant-assignments-heading" className="sr-only">
              Verified Assignments
            </h2>
            {context.assignments.length === 0 ? (
              <p className="text-xs text-fg-muted">
                No active role assignments are currently attached to your membership.
              </p>
            ) : (
              <ul className="space-y-2">
                {context.assignments.map((assignment) => (
                  <li
                    key={assignment.assignmentId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-subtle bg-elevated px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-fg">
                        {assignment.roleName}
                      </span>
                      <span className="ml-2 text-fg-muted">
                        ({assignment.roleCode})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="accent">
                        Scope: {assignment.scopeType}
                      </Badge>
                      <Badge tone="success">{assignment.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section id="audit" aria-labelledby="tenant-capabilities-heading">
          <Card
            title="Evaluated Permission Capabilities"
            description="Real-time result of server-side evaluatePermission() across this institution context."
          >
            <h2 id="tenant-capabilities-heading" className="sr-only">
              Evaluated Permission Capabilities
            </h2>
            <ul className="space-y-1.5">
              {FOUNDATION_CAPABILITIES.map((item) => {
                const decision = evaluatePermission(context, {
                  permission: item.permission,
                });
                return (
                  <li
                    key={item.permission}
                    className="flex items-center justify-between gap-2 rounded border border-border-subtle px-2.5 py-1.5 text-xs"
                  >
                    <span className="text-fg">{item.label}</span>
                    <Badge tone={decision.allowed ? "success" : "neutral"}>
                      {decision.allowed ? "Allowed" : "Restricted"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      </div>

      <section id="people" aria-labelledby="phase-boundary-heading">
        <h2 id="phase-boundary-heading" className="sr-only">
          Phase 1 Workspace Boundary
        </h2>
        <StateNotice
          kind="empty"
          title="Phase 1 Foundation Workspace — Academic & Registry modules activate in Phase 2"
          description="Student, guardian, staff, class/section, and teaching group registries will appear here once Phase 2 migrations and verified domain services are implemented. No synthetic or placeholder student metrics are displayed."
        />
      </section>
    </div>
  );
}
