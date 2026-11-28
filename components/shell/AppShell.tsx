"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  SHELL_PRIMARY_NAV,
  SHELL_SECONDARY_NAV,
  type ShellNavIcon,
  type ShellNavItem,
} from "@/components/shell/nav-config";
import { Badge } from "@/components/ui/Badge";

interface AppShellProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  navItems?: readonly ShellNavItem[];
  secondaryNavItems?: readonly ShellNavItem[];
  headerSlot?: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
}

function NavIconSvg({ icon }: { icon: ShellNavIcon }) {
  switch (icon) {
    case "overview":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4 shrink-0"
        >
          <rect x="3" y="3" width="6" height="6" rx="1" />
          <rect x="11" y="3" width="6" height="6" rx="1" />
          <rect x="3" y="11" width="6" height="6" rx="1" />
          <rect x="11" y="11" width="6" height="6" rx="1" />
        </svg>
      );
    case "tokens":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4 shrink-0"
        >
          <circle cx="10" cy="10" r="6.5" />
          <path d="M10 3.5v13M3.5 10h13" />
        </svg>
      );
    case "states":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4 shrink-0"
        >
          <path d="M4 6h12M4 10h8M4 14h10" strokeLinecap="round" />
        </svg>
      );
    case "public":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4 shrink-0"
        >
          <path
            d="M4 10.5 10 4l6 6.5M5.5 9v6.5h9V9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "people":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4 shrink-0"
        >
          <circle cx="8" cy="7" r="3" />
          <path
            d="M3 16c0-2.5 2.2-4 5-4s5 1.5 5 4M14 9.5a2.2 2.2 0 1 0 0-4.4M17 16c0-1.9-1.2-3.2-3-3.7"
            strokeLinecap="round"
          />
        </svg>
      );
    case "academics":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4 shrink-0"
        >
          <path
            d="M3.5 5.5 10 3l6.5 2.5L10 8 3.5 5.5Z"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 7.5v5c0 1.4 2 2.5 4.5 2.5s4.5-1.1 4.5-2.5v-5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "attendance":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4 shrink-0"
        >
          <rect x="3.5" y="4.5" width="13" height="12" rx="1.5" />
          <path
            d="M6.5 3v3M13.5 3v3M7 11.5l2 2 4-4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "leave":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4 shrink-0"
        >
          <rect x="3" y="4.5" width="14" height="11" rx="1.5" />
          <path
            d="M3.8 5.5 10 10.5l6.2-5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "imports":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4 shrink-0"
        >
          <path
            d="M10 3.5v8.5m0 0-3-3m3 3 3-3M4 13.5v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "governance":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4 shrink-0"
        >
          <path
            d="M10 3 4.5 5.5v4.8c0 3.2 2.3 5.7 5.5 6.7 3.2-1 5.5-3.5 5.5-6.7V5.5L10 3Z"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "audit":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4 shrink-0"
        >
          <rect x="4" y="3.5" width="12" height="13" rx="1.5" />
          <path d="M7 7.5h6M7 10.5h6M7 13.5h4" strokeLinecap="round" />
        </svg>
      );
    case "files":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4 shrink-0"
        >
          <path
            d="M3.5 5.5h5l1.5 1.5h6.5v8.5h-13v-10Z"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "platform":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4 shrink-0"
        >
          <rect x="3" y="4" width="14" height="5" rx="1" />
          <rect x="3" y="11" width="14" height="5" rx="1" />
        </svg>
      );
    case "workspace":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4 shrink-0"
        >
          <circle cx="10" cy="6.5" r="3" />
          <path
            d="M4.5 16c0-2.7 2.5-4.5 5.5-4.5s5.5 1.8 5.5 4.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

function SidebarNavList({
  items,
  collapsed,
  onNavigate,
}: {
  items: readonly ShellNavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={[
              "flex min-h-11 items-center gap-2.5 rounded-md px-2.5 text-xs font-medium text-fg transition-colors hover:bg-elevated",
              collapsed ? "justify-center px-0" : "",
            ].join(" ")}
          >
            <NavIconSvg icon={item.icon} />
            {collapsed ? (
              <span className="sr-only">{item.label}</span>
            ) : (
              <span className="flex min-w-0 flex-1 items-center justify-between gap-1.5">
                <span className="truncate">{item.label}</span>
                {item.badge ? (
                  <span className="shrink-0 rounded border border-border-subtle bg-elevated px-1 py-0.5 text-[10px] font-medium text-fg-muted">
                    {item.badge}
                  </span>
                ) : null}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function AppShell({
  title,
  subtitle,
  badgeText = "Shell Preview",
  navItems = SHELL_PRIMARY_NAV,
  secondaryNavItems = SHELL_SECONDARY_NAV,
  headerSlot,
  headerAction,
  children,
}: AppShellProps) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [tabletDrawerOpen, setTabletDrawerOpen] = useState(false);

  useEffect(() => {
    if (!tabletDrawerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTabletDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tabletDrawerOpen]);

  const compactSecondaryItem = secondaryNavItems[0];

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-accent-fg"
      >
        Skip to main content
      </a>

      <div className="flex min-h-screen">
        {/* Desktop collapsible sidebar (>= 1024px) */}
        <aside
          aria-label="Workspace navigation"
          className={[
            "hidden shrink-0 flex-col border-r border-border-subtle bg-surface transition-[width] duration-150 lg:flex",
            desktopCollapsed ? "w-16" : "w-60",
          ].join(" ")}
        >
          <div className="flex h-12 items-center justify-between border-b border-border-subtle px-3">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight text-fg"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-accent text-xs font-bold text-accent-fg">
                D
              </span>
              {!desktopCollapsed ? (
                <span className="truncate">DD-oodle</span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={() => setDesktopCollapsed((prev) => !prev)}
              aria-label={
                desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              aria-expanded={!desktopCollapsed}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-border-subtle text-xs text-fg-muted hover:bg-elevated hover:text-fg"
            >
              {desktopCollapsed ? ">" : "<"}
            </button>
          </div>

          <nav className="flex flex-1 flex-col justify-between p-2">
            <SidebarNavList items={navItems} collapsed={desktopCollapsed} />
            {secondaryNavItems.length > 0 ? (
              <div className="border-t border-border-subtle pt-2">
                <SidebarNavList
                  items={secondaryNavItems}
                  collapsed={desktopCollapsed}
                />
              </div>
            ) : null}
          </nav>
        </aside>

        {/* Mobile Landscape compact left rail (< 1024px wide and <= 500px tall) */}
        <nav
          aria-label="Compact landscape navigation"
          className="shell-landscape-rail w-14 shrink-0 flex-col items-center justify-between border-r border-border-subtle bg-surface py-2"
        >
          <div className="flex flex-col items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-fg hover:bg-elevated"
              >
                <NavIconSvg icon={item.icon} />
              </Link>
            ))}
          </div>
          {compactSecondaryItem ? (
            <Link
              href={compactSecondaryItem.href}
              title={compactSecondaryItem.label}
              aria-label={compactSecondaryItem.label}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-fg-muted hover:bg-elevated hover:text-fg"
            >
              <NavIconSvg icon={compactSecondaryItem.icon} />
            </Link>
          ) : null}
        </nav>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
          <header className="sticky top-0 z-30 flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-surface px-3 py-1.5 sm:flex-nowrap sm:gap-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              {/* Tablet drawer trigger (768px - 1023px) */}
              <button
                type="button"
                onClick={() => setTabletDrawerOpen(true)}
                aria-label="Open navigation drawer"
                aria-expanded={tabletDrawerOpen}
                aria-controls="tablet-nav-drawer"
                className="hidden min-h-9 min-w-9 items-center justify-center rounded-md border border-border-subtle bg-surface px-2 text-xs font-medium text-fg hover:bg-elevated md:inline-flex lg:hidden"
              >
                Menu
              </button>

              <Link
                href="/"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-accent text-xs font-bold text-accent-fg lg:hidden"
                aria-label="DD-oodle home"
              >
                D
              </Link>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-semibold tracking-tight text-fg">
                    {title}
                  </h1>
                  {badgeText ? (
                    <Badge tone="neutral" className="hidden sm:inline-flex">
                      {badgeText}
                    </Badge>
                  ) : null}
                </div>
                {subtitle ? (
                  <p className="hidden truncate text-[11px] text-fg-muted sm:block">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>

            {headerSlot || headerAction ? (
              <div className="flex shrink-0 items-center gap-2">
                {headerSlot}
                {headerAction}
              </div>
            ) : null}
          </header>

          <main
            id="main-content"
            tabIndex={-1}
            className="shell-main-region mx-auto w-full max-w-6xl flex-1 p-[var(--density-pad)] pb-24 md:pb-6"
          >
            {children}
          </main>
        </div>
      </div>

      {/* Tablet slide-over drawer */}
      {tabletDrawerOpen ? (
        <div
          className="fixed inset-0 z-40 hidden md:block lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          id="tablet-nav-drawer"
        >
          <button
            type="button"
            aria-label="Close navigation drawer"
            onClick={() => setTabletDrawerOpen(false)}
            className="fixed inset-0 bg-canvas/75"
          />
          <aside className="relative z-50 flex h-full w-64 flex-col border-r border-border-subtle bg-surface p-3">
            <div className="mb-3 flex items-center justify-between border-b border-border-subtle pb-2">
              <span className="text-sm font-semibold text-fg">DD-oodle</span>
              <button
                type="button"
                onClick={() => setTabletDrawerOpen(false)}
                className="inline-flex min-h-9 items-center rounded border border-border-subtle px-2.5 text-xs font-medium text-fg hover:bg-elevated"
              >
                Close
              </button>
            </div>
            <nav className="flex flex-1 flex-col justify-between">
              <SidebarNavList
                items={navItems}
                collapsed={false}
                onNavigate={() => setTabletDrawerOpen(false)}
              />
              {secondaryNavItems.length > 0 ? (
                <div className="border-t border-border-subtle pt-2">
                  <SidebarNavList
                    items={secondaryNavItems}
                    collapsed={false}
                    onNavigate={() => setTabletDrawerOpen(false)}
                  />
                </div>
              ) : null}
            </nav>
          </aside>
        </div>
      ) : null}

      {/* Mobile Portrait bottom navigation bar (< 768px portrait) */}
      {navItems.length > 0 ? (
        <nav
          aria-label="Primary mobile navigation"
          className="shell-portrait-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <ul className="flex items-stretch justify-around">
            {navItems.slice(0, 5).map((item) => (
              <li key={item.id} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  className="flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium text-fg hover:bg-elevated"
                >
                  <NavIconSvg icon={item.icon} />
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
