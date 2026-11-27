import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AppShell } from "@/components/shell/AppShell";
import {
  WorkspaceSwitcher,
  type SwitcherMembershipOption,
} from "@/components/shell/WorkspaceSwitcher";
import type { ShellNavItem } from "@/components/shell/nav-config";
import { StateNotice } from "@/components/ui/StateNotice";
import { buildInstitutionNav } from "@/lib/auth/navigation";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface TenantLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function TenantWorkspaceLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { slug } = await params;
  const resolution = await resolveVerifiedTenantContext(slug);

  if (resolution.status === "unconfigured") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12 text-fg">
        <main id="main-content" className="w-full max-w-lg">
          <StateNotice
            kind="empty"
            title="Supabase environment not configured"
            description="Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local before accessing institutional workspaces."
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

  if (resolution.status === "unauthenticated") {
    redirect(`/sign-in?next=${encodeURIComponent(`/t/${slug}`)}`);
  }

  if (resolution.status === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12 text-fg">
        <main id="main-content" className="w-full max-w-lg">
          <StateNotice
            kind="permission-denied"
            title="Institution access denied"
            description="You do not hold an active membership for this workspace, or the requested workspace is unavailable."
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

  const { context, workspace } = resolution;
  const navItems = buildInstitutionNav(context);
  const secondaryNavItems: ShellNavItem[] = [
    {
      id: "personal-workspace",
      label: "Personal Workspace",
      href: "/workspace",
      icon: "workspace",
    },
    {
      id: "public-home",
      label: "Public Home",
      href: "/",
      icon: "public",
    },
  ];

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

  return (
    <AppShell
      title={context.institutionName}
      subtitle={`${context.institutionBoard} • ${context.institutionTimezone} • /t/${context.institutionSlug}`}
      badgeText={`Theme: ${context.defaultThemeFamily}`}
      navItems={navItems}
      secondaryNavItems={secondaryNavItems}
      headerSlot={
        <WorkspaceSwitcher
          currentPath={`/t/${context.institutionSlug}`}
          memberships={switcherOptions}
          hasPlatformAccess={workspace.platformOperator?.status === "active"}
        />
      }
      headerAction={<SignOutButton />}
    >
      {children}
    </AppShell>
  );
}
