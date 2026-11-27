import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { ThemeControls } from "@/components/theme/ThemeControls";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateNotice } from "@/components/ui/StateNotice";

export default function ShellPreviewPage() {
  return (
    <AppShell
      title="UI Shell Preview — No Tenant Data Loaded"
      subtitle="Design system tokens, 4-mode responsive layout, and baseline state patterns"
      headerAction={
        <Link
          href="/sign-in"
          className="inline-flex min-h-9 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
        >
          Sign In
        </Link>
      }
    >
      <div className="space-y-[var(--density-gap)]">
        <section id="overview" aria-labelledby="preview-overview-heading">
          <Card
            title="UI Shell Preview — No Tenant Data Loaded"
            description="Interactive verification surface for P1-M02. Switch Theme Family (Clarity, Calm, Focus), Color Mode (Light, Dark, System), and Density (Compact, Comfortable) below."
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="accent">Clarity / Calm / Focus</Badge>
              <Badge tone="success">WCAG AA Contrast</Badge>
              <Badge tone="neutral">No Tenant Data</Badge>
            </div>
            <h2 id="preview-overview-heading" className="sr-only">
              Appearance Controls
            </h2>
            <ThemeControls />
          </Card>
        </section>

        <section
          id="tokens"
          aria-labelledby="preview-tokens-heading"
          className="grid gap-[var(--density-gap)] md:grid-cols-2"
        >
          <Card
            title="Interactive Primitives & Touch Targets"
            description="Semantic buttons and status badges adapting to theme and density tokens."
          >
            <h2 id="preview-tokens-heading" className="sr-only">
              Interactive Primitives
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" size="sm">
                Small Action
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="neutral">Neutral</Badge>
              <Badge tone="accent">Accent</Badge>
              <Badge tone="success">Active</Badge>
              <Badge tone="warning">Pending</Badge>
              <Badge tone="danger">Blocked</Badge>
            </div>
          </Card>

          <Card
            title="Skeleton Loading Placeholders"
            description="Reduced-motion aware placeholders for content-heavy views."
          >
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-2/3" label="Loading primary title" />
              <Skeleton className="h-3 w-full" label="Loading body line 1" />
              <Skeleton className="h-3 w-5/6" label="Loading body line 2" />
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Skeleton className="h-10 w-full" label="Loading slot 1" />
                <Skeleton className="h-10 w-full" label="Loading slot 2" />
                <Skeleton className="h-10 w-full" label="Loading slot 3" />
              </div>
            </div>
          </Card>
        </section>

        <section
          id="states"
          aria-labelledby="preview-states-heading"
          className="space-y-2.5"
        >
          <h2
            id="preview-states-heading"
            className="text-sm font-semibold tracking-tight text-fg"
          >
            Required Application State Patterns
          </h2>
          <StateNotice
            kind="empty"
            action={
              <Button variant="secondary" size="sm">
                Refresh
              </Button>
            }
          />
          <StateNotice
            kind="error"
            action={
              <Button variant="danger" size="sm">
                Retry
              </Button>
            }
          />
          <StateNotice kind="permission-denied" />
          <StateNotice kind="offline" />
        </section>
      </div>
    </AppShell>
  );
}
