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
import { requirePlatformOperator } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function PlatformConsolePage() {
  const guard = await requirePlatformOperator();

  if (!guard.ok) {
    if (guard.status === 503) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12 text-fg">
          <main id="main-content" className="w-full max-w-lg">
            <StateNotice
              kind="empty"
              title="Supabase environment not configured"
              description="Configure public Supabase environment variables before accessing the DD-oodle platform console."
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

    if (guard.status === 401) {
      redirect("/sign-in?next=/platform");
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12 text-fg">
        <main id="main-content" className="w-full max-w-lg">
          <StateNotice
            kind="permission-denied"
            title="Platform operations access restricted"
            description="Platform operations are strictly separated from institutional leadership (including school Principals) per Blueprint Part A §2.4 & §4.3. Only verified active platform operators may enter /platform."
            action={
              <Link
                href="/workspace"
                className="inline-flex min-h-11 items-center rounded-md bg-accent px-3.5 text-xs font-medium text-accent-fg hover:bg-accent-hover"
              >
                Return to Personal Workspace
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  const { workspace, operator } = guard;

  const switcherOptions: SwitcherMembershipOption[] = workspace.memberships.map(
    (membership) => {
      const roleNames = [
        ...new Set(membership.assignments.map((item) => item.roleName)),
      ];
      return {
        slug: membership.institution.slug,
        institutionName: membership.institution.name,
        roleSummary:
          roleNames.length > 0 ? roleNames.join(", ") : "Active Member",
      };
    },
  );

  const navItems: ShellNavItem[] = [
    {
      id: "platform-overview",
      label: "Platform Console",
      href: "/platform",
      icon: "platform",
    },
    {
      id: "personal-workspace",
      label: "Personal Workspace",
      href: "/workspace",
      icon: "workspace",
    },
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
      title="DD-oodle Platform Console"
      subtitle={`Verified operator: ${workspace.person.fullName}`}
      badgeText={`Role: ${operator.operatorRole}`}
      navItems={navItems}
      secondaryNavItems={secondaryNavItems}
      headerSlot={
        <WorkspaceSwitcher
          currentPath="/platform"
          memberships={switcherOptions}
          hasPlatformAccess={true}
        />
      }
      headerAction={<SignOutButton />}
    >
      <div className="space-y-[var(--density-gap)]">
        <StateNotice
          kind="permission-denied"
          title="Tenant Isolation Policy: Zero Automatic Access to School Records"
          description="Platform operator status (super_admin, support_agent, or auditor) grants zero automatic access to institutional student, staff, academic, financial, or audit data. Any future support access requires explicit consent, time-bounded scope, and immutable audit logging."
        />

        <Card
          title="Operator Identity Summary"
          description="Verified against public.platform_operators under strict PostgreSQL RLS."
        >
          <dl className="grid gap-3 text-xs sm:grid-cols-3">
            <div>
              <dt className="font-medium text-fg-muted">Operator Name</dt>
              <dd className="mt-0.5 font-semibold text-fg">
                {workspace.person.fullName}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-fg-muted">Operator Role</dt>
              <dd className="mt-0.5">
                <Badge tone="warning">{operator.operatorRole}</Badge>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-fg-muted">Status</dt>
              <dd className="mt-0.5">
                <Badge tone="success">{operator.status}</Badge>
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </AppShell>
  );
}
