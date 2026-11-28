import Link from "next/link";

export type PlanningTabKey = "syllabus" | "lessons" | "resources" | "oversight";

interface PlanningSubNavProps {
  slug: string;
  activeTab: PlanningTabKey;
  canAccessLessonPlans: boolean;
  canAccessOversight: boolean;
}

export function PlanningSubNav({
  slug,
  activeTab,
  canAccessLessonPlans,
  canAccessOversight,
}: PlanningSubNavProps) {
  const basePath = `/t/${encodeURIComponent(slug)}/planning`;
  const tabs: { key: PlanningTabKey; label: string; href: string }[] = [
    {
      key: "syllabus",
      label: "Syllabus & Progress",
      href: basePath,
    },
    {
      key: "resources",
      label: "Learning Resources",
      href: `${basePath}/resources`,
    },
  ];

  if (canAccessLessonPlans) {
    tabs.splice(1, 0, {
      key: "lessons",
      label: "Lesson Plans",
      href: `${basePath}/lessons`,
    });
  }

  if (canAccessOversight) {
    tabs.push({
      key: "oversight",
      label: "HOD & Class Oversight",
      href: `${basePath}/oversight`,
    });
  }

  return (
    <nav
      aria-label="Academic planning navigation"
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
              "inline-flex min-h-9 items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              isCurrent
                ? "border border-accent bg-accent text-accent-fg"
                : "border border-border-subtle bg-surface text-fg hover:bg-elevated",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
