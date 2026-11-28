import Link from "next/link";

export type LeaveTabKey = "applications" | "notices";

interface LeaveSubNavProps {
  slug: string;
  activeTab: LeaveTabKey;
}

export function LeaveSubNav({ slug, activeTab }: LeaveSubNavProps) {
  const basePath = `/t/${encodeURIComponent(slug)}/leave`;
  const tabs: { key: LeaveTabKey; label: string; href: string }[] = [
    {
      key: "applications",
      label: "Leave Applications",
      href: basePath,
    },
    {
      key: "notices",
      label: "Parent Notices",
      href: `${basePath}/notices`,
    },
  ];

  return (
    <nav
      aria-label="Leave and attendance notices navigation"
      className="flex flex-wrap items-center gap-1.5 border-b border-border-subtle pb-2.5"
    >
      {tabs.map((tab) => {
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
