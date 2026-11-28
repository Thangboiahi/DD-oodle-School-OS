import Link from "next/link";
import type { AttendanceCapabilitiesDto } from "@/server/attendance/service";

export type AttendanceTabKey =
  | "daily"
  | "summary"
  | "periods"
  | "staff"
  | "ledger";

interface AttendanceSubNavProps {
  slug: string;
  activeTab: AttendanceTabKey;
  capabilities: Pick<
    AttendanceCapabilitiesDto,
    | "canAccessPeriodRoll"
    | "canAccessStaffAttendance"
    | "canViewLedger"
    | "canAccessDailySummary"
  >;
  selectedDate?: string;
}

export function AttendanceSubNav({
  slug,
  activeTab,
  capabilities,
  selectedDate,
}: AttendanceSubNavProps) {
  const basePath = `/t/${encodeURIComponent(slug)}/attendance`;
  const dateSuffix = selectedDate
    ? `?date=${encodeURIComponent(selectedDate)}`
    : "";

  const tabs: { key: AttendanceTabKey; label: string; href: string }[] = [
    {
      key: "daily",
      label: "Daily Student Roll",
      href: `${basePath}${dateSuffix}`,
    },
  ];

  if (capabilities.canAccessDailySummary) {
    tabs.push({
      key: "summary",
      label: "Daily Summary",
      href: `${basePath}/summary${dateSuffix}`,
    });
  }

  if (capabilities.canAccessPeriodRoll) {
    tabs.push({
      key: "periods",
      label: "Period Roll",
      href: `${basePath}/periods${dateSuffix}`,
    });
  }

  if (capabilities.canAccessStaffAttendance) {
    tabs.push({
      key: "staff",
      label: "Staff Attendance",
      href: `${basePath}/staff${dateSuffix}`,
    });
  }

  if (capabilities.canViewLedger) {
    tabs.push({
      key: "ledger",
      label: "Event Ledger & Policy",
      href: `${basePath}/ledger${dateSuffix}`,
    });
  }

  return (
    <nav
      aria-label="Attendance module sections"
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
