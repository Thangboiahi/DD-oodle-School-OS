import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/app/sign-in/SignInForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { sanitizeNextPath } from "@/lib/auth/safe-redirect";
import { getVerifiedAuthIdentity } from "@/server/auth/session";

export const dynamic = "force-dynamic";

interface SignInPageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedParams = await searchParams;
  const rawNext = Array.isArray(resolvedParams.next)
    ? resolvedParams.next[0]
    : resolvedParams.next;
  const nextPath = sanitizeNextPath(rawNext, "/workspace");

  const auth = await getVerifiedAuthIdentity();
  if (auth.configured && auth.identity) {
    redirect(nextPath);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12 text-fg">
      <main id="main-content" tabIndex={-1} className="w-full max-w-md space-y-4">
        <Card
          title="DD-oodle Identity Sign-In"
          description="Sign in once with your global DD-oodle identity to access all verified institutional workspaces."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">Global Person Identity</Badge>
              <Badge tone="neutral">Server-Verified RLS</Badge>
            </div>

            {!auth.configured ? (
              <StateNotice
                kind="empty"
                title="Supabase authentication not configured"
                description="Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (never commit secrets) and start local Supabase to enable sign-in. No mock login bypass is permitted."
                action={
                  <Link
                    href="/shell-preview"
                    className="inline-flex min-h-11 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
                  >
                    Shell Preview
                  </Link>
                }
              />
            ) : (
              <SignInForm nextPath={nextPath} />
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3 text-xs text-fg-muted">
              <Link href="/" className="hover:text-fg hover:underline">
                Back to Public Home
              </Link>
              <Link href="/shell-preview" className="hover:text-fg hover:underline">
                UI Shell Preview
              </Link>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
