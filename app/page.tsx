import Link from "next/link";
import { ThemeControls } from "@/components/theme/ThemeControls";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const ARCHITECTURE_PILLARS = [
  {
    title: "Multi-Tenant Isolation",
    summary:
      "Server-verified memberships and PostgreSQL Row Level Security keep every school strictly isolated on shared infrastructure.",
  },
  {
    title: "CBSE Senior Secondary Model",
    summary:
      "Separates academic sessions, classes, sections, streams, teaching groups, and time-bound staff assignments.",
  },
  {
    title: "Structured Operations",
    summary:
      "Official workflows, approvals, notices, and registers live in DD-oodle — WhatsApp remains for casual chat.",
  },
  {
    title: "Verifiable Credentials",
    summary:
      "Immutable issuance audit trails and a credential exchange foundation for bonafide and transfer records.",
  },
  {
    title: "Independent Study Buddy",
    summary:
      "Clean API boundaries keep personalized learning companions modular without compromising institutional governance.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas text-fg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-accent-fg"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight text-fg"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-fg">
              D
            </span>
            <span>DD-oodle</span>
          </Link>

          <nav
            aria-label="Public navigation"
            className="flex items-center gap-2 sm:gap-3"
          >
            <a
              href="#capabilities"
              className="hidden rounded px-2 py-1.5 text-xs font-medium text-fg-muted hover:bg-elevated hover:text-fg sm:inline-flex"
            >
              Capabilities
            </a>
            <Link
              href="/shell-preview"
              className="inline-flex min-h-9 items-center rounded-md px-2.5 text-xs font-medium text-fg-muted hover:bg-elevated hover:text-fg"
            >
              Shell Preview
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex min-h-9 items-center rounded-md bg-accent px-3 text-xs font-medium text-accent-fg hover:bg-accent-hover"
            >
              Sign In
            </Link>

            <details className="relative">
              <summary className="inline-flex min-h-9 cursor-pointer list-none items-center rounded-md border border-border-subtle bg-surface px-2.5 text-xs font-medium text-fg hover:bg-elevated">
                Theme
              </summary>
              <div className="absolute right-0 mt-2 w-64 rounded-lg border border-border-strong bg-surface p-3 shadow-sm">
                <ThemeControls compact />
              </div>
            </details>
          </nav>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:py-12"
      >
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">Indian CBSE &amp; Multi-Board Schools</Badge>
            <Badge tone="neutral">Phase 1 Foundation</Badge>
          </div>
          <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-fg sm:text-4xl">
            Structured school operations and lifelong academic continuity.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
            DD-oodle gives Indian institutions a compact, keyboard-accessible
            operating system for registries, session enrolments, attendance,
            approvals, and verifiable records — while keeping personal identity
            continuous across school transitions.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/shell-preview"
              className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-accent-hover"
            >
              Explore UI Shell Preview
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex min-h-11 items-center rounded-md border border-border-strong bg-surface px-4 text-sm font-medium text-fg hover:bg-elevated"
            >
              Account Sign-In Status
            </Link>
          </div>
        </section>

        <section id="capabilities" aria-labelledby="capabilities-heading">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2
              id="capabilities-heading"
              className="text-sm font-semibold uppercase tracking-wider text-fg-muted"
            >
              Core Architecture Pillars
            </h2>
          </div>
          <div className="grid gap-[var(--density-gap)] sm:grid-cols-2 lg:grid-cols-5">
            {ARCHITECTURE_PILLARS.map((pillar) => (
              <Card key={pillar.title} title={pillar.title}>
                <p className="text-xs leading-relaxed text-fg-muted">
                  {pillar.summary}
                </p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Privacy by design: public landing exposes zero tenant data or
            private institutional routes.
          </p>
          <p>
            PWA baseline: installable web shell with online-required guardrails
            for sensitive school records.
          </p>
        </div>
      </footer>
    </div>
  );
}
