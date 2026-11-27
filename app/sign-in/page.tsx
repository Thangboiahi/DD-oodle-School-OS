import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default function SignInPlaceholderPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12 text-fg">
      <main id="main-content" className="w-full max-w-md">
        <Card
          title="DD-oodle Identity Sign-In"
          description="Global personal account authentication and verified institution membership resolution."
        >
          <div className="space-y-4">
            <Badge tone="accent">Scheduled for Milestone P1-M03</Badge>
            <p className="text-xs leading-relaxed text-fg-muted">
              Authentication flows, multi-tenant PostgreSQL Row Level Security
              (RLS), and server-side membership verification activate in
              Milestone P1-M03. No credential forms or mock sessions are exposed
              on this placeholder route.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center rounded-md border border-border-strong bg-surface px-3.5 text-xs font-medium text-fg hover:bg-elevated"
              >
                Back to Public Home
              </Link>
              <Link
                href="/shell-preview"
                className="inline-flex min-h-11 items-center rounded-md bg-accent px-3.5 text-xs font-medium text-accent-fg hover:bg-accent-hover"
              >
                Open UI Shell Preview
              </Link>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
