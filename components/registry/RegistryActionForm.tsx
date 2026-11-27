"use client";

import { useActionState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export interface RegistryActionState {
  status: "idle" | "success" | "error";
  message: string | null;
}

const INITIAL_ACTION_STATE: RegistryActionState = {
  status: "idle",
  message: null,
};

interface RegistryActionFormProps {
  action: (
    prevState: RegistryActionState,
    formData: FormData,
  ) => Promise<RegistryActionState>;
  submitLabel: string;
  pendingLabel?: string;
  submitVariant?: "primary" | "secondary";
  className?: string;
  children: ReactNode;
}

export function RegistryActionForm({
  action,
  submitLabel,
  pendingLabel = "Saving...",
  submitVariant = "primary",
  className = "space-y-3",
  children,
}: RegistryActionFormProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className={className}>
      {children}

      {state.message ? (
        <div
          role={state.status === "error" ? "alert" : "status"}
          aria-live="polite"
          className={[
            "rounded-md border px-3 py-2 text-xs font-medium",
            state.status === "error"
              ? "border-status-danger bg-elevated text-status-danger"
              : "border-status-success bg-elevated text-status-success",
          ].join(" ")}
        >
          {state.message}
        </div>
      ) : null}

      <div className="pt-1">
        <Button
          type="submit"
          variant={submitVariant}
          size="sm"
          disabled={isPending}
        >
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
