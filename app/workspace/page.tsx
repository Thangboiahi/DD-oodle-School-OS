import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AppShell } from "@/components/shell/AppShell";
import {
  WorkspaceSwitcher,
  type SwitcherMembershipOption,
} from "@/components/shell/WorkspaceSwitcher";
import type { ShellNavItem } from "@/components/shell/nav-config";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { getCurrentPersonWorkspace } from "@/server/auth/session";

export const dynamic = "force-dynamic";

function summarizeRoles(
  assignments: readonly { roleName: string; status: string }[],
): string {
  const activeNames = [
    ...new Set(
      assignments
        .filter((assignment) => assignment.status === "active")
        .map((assignment) => assignment.roleName),
    ),
  ];
  return activeNames.length > 0 ? activeNames.join(", ") : "Active Member";
}

export default async function WorkspacePage() {
  const { configured, workspace } = await getCurrentPersonWorkspace();

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12 text-fg">
        <main id="main-content" className="w-full max-w-lg">
          <StateNotice
            kind="empty"
            title="Supabase environment not configured"
            description="Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local to load your verified DD-oodle personal workspace."
            action={
              <Link
                href="/"
                className="inline-flex min-h-11 items-center rounded-md border border-border-strong bg-surface px-3.5 text-xs font-medium text-fg hover:bg-elevated"
              >
                Public Home
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  if (!workspace) {
    redirect("/sign-in?next=/workspace");
  }

  const hasPlatformAccess = workspace.platformOperator?.status === "active";

  const switcherOptions: SwitcherMembershipOption[] = workspace.memberships.map(
    (membership) => ({
      slug: membership.institution.slug,
      institutionName: membership.institution.name,
      roleSummary: summarizeRoles(membership.assignments),
    }),
  );

  const navItems: ShellNavItem[] = [
    {
      id: "workspace-overview",
      label: "Personal Workspace",
      href: "/workspace",
      icon: "workspace",
    },
    ...(hasPlatformAccess
      ? [
          {
            id: "platform-console",
            label: "Platform Console",
            href: "/platform",
            icon: "platform" as const,
          },
        ]
      : []),
  ];

  const secondaryNavItems: ShellNavItem[] = [
    {
      id: "public-home",
      label: "Public Home",
      href: "/",
      icon: "public",
    },
  ];

  return (
    <AppShell
      title="Personal Workspace"
      subtitle={workspace.person.fullName}
      badgeText="Global Identity"
      navItems={navItems}
      secondaryNavItems={secondaryNavItems}
      headerSlot={
        <WorkspaceSwitcher
          currentPath="/workspace"
          memberships={switcherOptions}
          hasPlatformAccess={hasPlatformAccess}
        />
      }
      headerAction={<SignOutButton />}
    >
      <div className="space-y-[var(--density-gap)]">
        <Card
          title="Verified Global Person Profile"
          description="Your personal DD-oodle identity stays continuous across all institutional memberships and academic sessions."
        >
          <dl className="grid gap-3 text-xs sm:grid-cols-3">
            <div>
              <dt className="font-medium text-fg-muted">Full Name</dt>
              <dd className="mt-0.5 font-semibold text-fg">
                {workspace.person.fullName}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-fg-muted">Display Name</dt>
              <dd className="mt-0.5 font-semibold text-fg">
                {workspace.person.displayName ?? "Not set"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-fg-muted">Primary Email</dt>
              <dd className="mt-0.5 font-semibold text-fg">
                {workspace.person.primaryEmail ?? "Not set"}
              </dd>
            </div>
          </dl>
        </Card>

        <section aria-labelledby="linked-institutions-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="linked-institutions-heading"
              className="text-sm font-semibold tracking-tight text-fg"
            >
              Verified Institution Memberships
            </h2>
            <Badge tone="neutral">
              {workspace.memberships.length} Active
            </Badge>
          </div>

          {workspace.memberships.length === 0 ? (
            <StateNotice
              kind="empty"
              title="No active school memberships linked"
              description="Your global DD-oodle identity has zero active institution memberships. Institutional access is granted only by an authorized school administrator."
            />
          ) : (
            <div className="grid gap-[var(--density-gap)] md:grid-cols-2">
              {workspace.memberships.map((membership) => (
                <Card
                  key={membership.membershipId}
                  title={membership.institution.name}
                  description={`${membership.institution.board} • ${membership.institution.timezone} • /t/${membership.institution.slug}`}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-fg-muted">
                        Active Concurrent Assignments
                      </p>
                      {membership.assignments.length === 0 ? (
                        <p className="text-xs text-fg-muted">
                          No active scoped role assignments.
                        </p>
                      ) : (
                        <ul className="flex flex-wrap gap-1.5">
                          {membership.assignments.map((assignment) => (
                            <li key={assignment.assignmentId}>
                              <Badge tone="accent">
                                {assignment.roleName} ({assignment.scopeType})
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
                      <Badge tone="success">{membership.membershipStatus}</Badge>
                      <Link
                        href={`/t/${encodeURIComponent(membership.institution.slug)}`}
                        className="inline-flex min-h-11 items-center rounded-md bg-accent px-3.5 text-xs font-medium text-accent-fg hover:bg-accent-hover"
                      >
                        Open Workspace
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {hasPlatformAccess && workspace.platformOperator ? (
          <Card
            title="DD-oodle Platform Operations Boundary"
            description="Strictly separated from institutional school consoles per Blueprint §2.4 & §4.3."
          >
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-fg-muted">
                Platform operator status grants zero automatic read or write
                access to institutional student, staff, academic, or audit
                records.
              </p>
              <div className="flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
                <Badge tone="warning">
                  Role: {workspace.platformOperator.operatorRole}
                </Badge>
                <Link
                  href="/platform"
                  className="inline-flex min-h-11 items-center rounded-md border border-border-strong bg-surface px-3.5 text-xs font-medium text-fg hover:bg-elevated"
                >
                  Open Platform Console
                </Link>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
