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
              <span className="truncate">{item.label}</span>
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
            desktopCollapsed ? "w-16" : "w-56",
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
            <SidebarNavList
              items={SHELL_PRIMARY_NAV}
              collapsed={desktopCollapsed}
            />
            <div className="border-t border-border-subtle pt-2">
              <SidebarNavList
                items={SHELL_SECONDARY_NAV}
                collapsed={desktopCollapsed}
              />
            </div>
          </nav>
        </aside>

        {/* Mobile Landscape compact left rail (< 1024px wide and <= 500px tall) */}
        <nav
          aria-label="Compact landscape navigation"
          className="shell-landscape-rail w-14 shrink-0 flex-col items-center justify-between border-r border-border-subtle bg-surface py-2"
        >
          <div className="flex flex-col items-center gap-1">
            {SHELL_PRIMARY_NAV.map((item) => (
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
          <Link
            href="/sign-in"
            title="Sign In"
            aria-label="Sign In"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-fg-muted hover:bg-elevated hover:text-fg"
          >
            <NavIconSvg icon="public" />
          </Link>
        </nav>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
          <header className="sticky top-0 z-30 flex h-12 items-center justify-between gap-3 border-b border-border-subtle bg-surface px-3 sm:px-4">
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
                  <Badge tone="neutral" className="hidden sm:inline-flex">
                    Shell Preview
                  </Badge>
                </div>
                {subtitle ? (
                  <p className="hidden truncate text-[11px] text-fg-muted sm:block">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>

            {headerAction ? (
              <div className="flex shrink-0 items-center gap-2">
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
              <span className="text-sm font-semibold text-fg">
                DD-oodle Shell
              </span>
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
                items={SHELL_PRIMARY_NAV}
                collapsed={false}
                onNavigate={() => setTabletDrawerOpen(false)}
              />
              <div className="border-t border-border-subtle pt-2">
                <SidebarNavList
                  items={SHELL_SECONDARY_NAV}
                  collapsed={false}
                  onNavigate={() => setTabletDrawerOpen(false)}
                />
              </div>
            </nav>
          </aside>
        </div>
      ) : null}

      {/* Mobile Portrait bottom navigation bar (< 768px portrait) */}
      <nav
        aria-label="Primary mobile navigation"
        className="shell-portrait-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-4">
          {SHELL_PRIMARY_NAV.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium text-fg hover:bg-elevated"
              >
                <NavIconSvg icon={item.icon} />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
