import Link from "next/link";

export type PeopleTabKey = "students" | "staff" | "admissions" | "custom-fields";

interface PeopleSubNavProps {
  slug: string;
  activeTab: PeopleTabKey;
  canViewStaff: boolean;
  canViewAdmissions: boolean;
  canManageCustomFields: boolean;
}

export function PeopleSubNav({
  slug,
  activeTab,
  canViewStaff,
  canViewAdmissions,
  canManageCustomFields,
}: PeopleSubNavProps) {
  const basePath = `/t/${encodeURIComponent(slug)}/people`;

  const tabs: {
    key: PeopleTabKey;
    label: string;
    href: string;
    visible: boolean;
  }[] = [
    {
      key: "students",
      label: "Students",
      href: basePath,
      visible: true,
    },
    {
      key: "staff",
      label: "Staff Directory",
      href: `${basePath}/staff`,
      visible: canViewStaff,
    },
    {
      key: "admissions",
      label: "Admissions",
      href: `${basePath}/admissions`,
      visible: canViewAdmissions,
    },
    {
      key: "custom-fields",
      label: "Custom Fields",
      href: `${basePath}/custom-fields`,
      visible: canManageCustomFields,
    },
  ];

  return (
    <nav
      aria-label="People & Registry sections"
      className="flex flex-wrap items-center gap-1.5 border-b border-border-subtle pb-2.5"
    >
      {tabs
        .filter((tab) => tab.visible)
        .map((tab) => {
          const isCurrent = tab.key === activeTab;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isCurrent ? "page" : undefined}
              className={[
                "inline-flex min-h-9 items-center rounded-md border px-3 text-xs font-medium transition-colors",
                isCurrent
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border-subtle bg-surface text-fg hover:bg-elevated",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
    </nav>
  );
}
