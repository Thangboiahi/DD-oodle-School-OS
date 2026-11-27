import Link from "next/link";

export type AcademicsTabKey = "overview" | "teaching-groups" | "allocations";

interface AcademicsSubNavProps {
  slug: string;
  activeTab: AcademicsTabKey;
  sessionId?: string;
}

export function AcademicsSubNav({
  slug,
  activeTab,
  sessionId,
}: AcademicsSubNavProps) {
  const basePath = `/t/${encodeURIComponent(slug)}/academics`;
  const sessionSuffix = sessionId
    ? `?session=${encodeURIComponent(sessionId)}`
    : "";

  const tabs: { key: AcademicsTabKey; label: string; href: string }[] = [
    {
      key: "overview",
      label: "Structure & Sections",
      href: `${basePath}${sessionSuffix}`,
    },
    {
      key: "teaching-groups",
      label: "Teaching Groups",
      href: `${basePath}/teaching-groups${sessionSuffix}`,
    },
    {
      key: "allocations",
      label: "Time-Bound Allocations",
      href: `${basePath}/allocations${sessionSuffix}`,
    },
  ];

  return (
    <nav
      aria-label="Academics module sections"
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
