import type { ShellNavIcon, ShellNavItem } from "@/components/shell/nav-config";
import {
  evaluatePermission,
  type VerifiedTenantContext,
} from "@/lib/auth/permissions";

export interface NavItem extends ShellNavItem {
  icon: ShellNavIcon;
}

/**
 * Assembles permission-filtered navigation links for an institutional workspace
 * strictly from `evaluatePermission()`.
 *
 * SECURITY BOUNDARY (Blueprint Part A §11.5):
 * Navigation filtering is for UX clarity and code-splitting ONLY. It is NOT a
 * security boundary; every route, Server Action, API handler, and PostgreSQL query
 * must still enforce server-side guards and PostgreSQL RLS.
 */
export function buildInstitutionNav(
  context: VerifiedTenantContext,
  now: Date = new Date(),
): NavItem[] {
  if (context.membershipStatus !== "active") {
    return [];
  }

  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}`;
  const items: NavItem[] = [
    {
      id: "overview",
      label: "Overview",
      href: `${basePath}#overview`,
      icon: "overview",
    },
  ];

  const canAccessPeopleOrTeaching =
    evaluatePermission(context, { permission: "people.read" }, now).allowed ||
    evaluatePermission(context, { permission: "people.manage" }, now).allowed ||
    evaluatePermission(context, { permission: "admissions.read" }, now)
      .allowed ||
    evaluatePermission(context, { permission: "admissions.manage" }, now)
      .allowed ||
    evaluatePermission(context, { permission: "academics.manage" }, now)
      .allowed ||
    evaluatePermission(context, { permission: "academics.teach" }, now)
      .allowed ||
    evaluatePermission(context, { permission: "section.coordinate" }, now)
      .allowed ||
    evaluatePermission(context, { permission: "attendance.read" }, now)
      .allowed ||
    evaluatePermission(context, { permission: "attendance.manage" }, now)
      .allowed ||
    evaluatePermission(context, { permission: "ward.read" }, now).allowed ||
    evaluatePermission(context, { permission: "classroom.summary.read" }, now)
      .allowed ||
    evaluatePermission(context, { permission: "self.read" }, now).allowed;

  if (canAccessPeopleOrTeaching) {
    items.push(
      {
        id: "people",
        label: "People & Registry",
        href: `${basePath}/people`,
        icon: "people",
      },
      {
        id: "academics",
        label: "Academics",
        href: `${basePath}/academics`,
        icon: "academics",
      },
      {
        id: "attendance",
        label: "Attendance",
        href: `${basePath}/attendance`,
        icon: "attendance",
      },
    );
  }

  const canAccessLeaveAndNotices =
    evaluatePermission(context, { permission: "people.read" }, now).allowed ||
    evaluatePermission(context, { permission: "people.manage" }, now).allowed ||
    evaluatePermission(context, { permission: "academics.manage" }, now)
      .allowed ||
    evaluatePermission(context, { permission: "academics.teach" }, now)
      .allowed ||
    evaluatePermission(context, { permission: "section.coordinate" }, now)
      .allowed ||
    evaluatePermission(context, { permission: "attendance.read" }, now)
      .allowed ||
    evaluatePermission(context, { permission: "attendance.manage" }, now)
      .allowed ||
    evaluatePermission(context, { permission: "ward.read" }, now).allowed ||
    evaluatePermission(context, { permission: "self.read" }, now).allowed;

  if (canAccessLeaveAndNotices) {
    items.push({
      id: "leave",
      label: "Leave & Notices",
      href: `${basePath}/leave`,
      icon: "leave",
    });
  }

  if (canAccessPeopleOrTeaching) {
    items.push(
      {
        id: "handbook",
        label: "Handbook",
        href: `${basePath}/handbook`,
        icon: "handbook",
      },
      {
        id: "communication",
        label: "Communication",
        href: `${basePath}/communication`,
        icon: "communication",
      },
      {
        id: "planning",
        label: "Planning",
        href: `${basePath}/planning`,
        icon: "planning",
      },
      {
        id: "assignments",
        label: "Assignments",
        href: `${basePath}/assignments`,
        icon: "assignments",
      },
    );
  }

  const canManageImports =
    evaluatePermission(context, { permission: "imports.manage" }, now).allowed ||
    evaluatePermission(context, { permission: "people.manage" }, now).allowed;

  if (canManageImports) {
    items.push({
      id: "imports",
      label: "Bulk Imports",
      href: `${basePath}/imports`,
      icon: "imports",
    });
  }

  const canViewGovernance =
    evaluatePermission(context, { permission: "roles.read" }, now).allowed ||
    evaluatePermission(context, { permission: "memberships.read" }, now)
      .allowed;

  if (canViewGovernance) {
    items.push({
      id: "governance",
      label: "Governance & Roles",
      href: `${basePath}#governance`,
      icon: "governance",
    });
  }

  if (evaluatePermission(context, { permission: "audit.read" }, now).allowed) {
    items.push({
      id: "audit",
      label: "Audit & Security",
      href: `${basePath}#audit`,
      icon: "audit",
    });
  }

  if (
    evaluatePermission(context, { permission: "files.write" }, now).allowed
  ) {
    items.push({
      id: "files",
      label: "Files & Policies",
      href: `${basePath}#files`,
      icon: "files",
    });
  }

  return items;
}
