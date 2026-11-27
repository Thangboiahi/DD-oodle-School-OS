"use client";

import { useActionState } from "react";
import { signInAction, type SignInActionState } from "@/app/sign-in/actions";
import { Button } from "@/components/ui/Button";

const INITIAL_STATE: SignInActionState = { error: null };

export function SignInForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, isPending] = useActionState(
    signInAction,
    INITIAL_STATE,
  );
  const hasError = Boolean(state.error);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={nextPath} />

      <div className="space-y-1.5">
        <label
          htmlFor="sign-in-email"
          className="block text-xs font-semibold text-fg"
        >
          Email Address
        </label>
        <input
          id="sign-in-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={hasError}
          aria-describedby={hasError ? "sign-in-error" : undefined}
          placeholder="person@institution.example"
          className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="sign-in-password"
          className="block text-xs font-semibold text-fg"
        >
          Password
        </label>
        <input
          id="sign-in-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={hasError}
          aria-describedby={hasError ? "sign-in-error" : undefined}
          className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {state.error ? (
        <div
          id="sign-in-error"
          role="alert"
          aria-live="polite"
          className="rounded-md border border-status-danger bg-elevated px-3 py-2.5 text-xs font-medium text-status-danger"
        >
          {state.error}
        </div>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={isPending}
        className="w-full"
      >
        {isPending ? "Signing In..." : "Sign In to DD-oodle"}
      </Button>
    </form>
  );
}
