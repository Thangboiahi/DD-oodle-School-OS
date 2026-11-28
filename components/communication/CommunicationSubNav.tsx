import Link from "next/link";

export type CommunicationTabKey = "notices" | "enquiries";

interface CommunicationSubNavProps {
  slug: string;
  activeTab: CommunicationTabKey;
  canAccessEnquiries: boolean;
}

export function CommunicationSubNav({
  slug,
  activeTab,
  canAccessEnquiries,
}: CommunicationSubNavProps) {
  const basePath = `/t/${encodeURIComponent(slug)}/communication`;
  const tabs: { key: CommunicationTabKey; label: string; href: string }[] = [
    {
      key: "notices",
      label: "Official Notices",
      href: basePath,
    },
  ];

  if (canAccessEnquiries) {
    tabs.push({
      key: "enquiries",
      label: "Parent Enquiries",
      href: `${basePath}/enquiries`,
    });
  }

  return (
    <nav
      aria-label="Structured communication navigation"
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
