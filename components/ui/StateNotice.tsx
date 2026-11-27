import type { ReactNode } from "react";

export type StateNoticeKind =
  | "empty"
  | "error"
  | "permission-denied"
  | "offline";

export interface StateNoticeProps {
  kind: StateNoticeKind;
  title?: string;
  description?: string;
  action?: ReactNode;
}

const DEFAULT_COPY: Record<
  StateNoticeKind,
  { title: string; description: string; borderClass: string; badgeText: string }
> = {
  empty: {
    title: "Nothing here yet",
    description:
      "No matching records or module items are currently loaded for this view.",
    borderClass: "border-border-subtle",
    badgeText: "Empty",
  },
  error: {
    title: "Unable to load view",
    description:
      "An unexpected error occurred while preparing this request. Try again or inspect connectivity.",
    borderClass: "border-status-danger",
    badgeText: "Error",
  },
  "permission-denied": {
    title: "Access restricted",
    description:
      "Your active membership or role does not permit access to this institution operation.",
    borderClass: "border-status-warning",
    badgeText: "Restricted",
  },
  offline: {
    title: "Connection required",
    description:
      "You are offline. Sensitive and authoritative school operations require an active network connection.",
    borderClass: "border-border-strong",
    badgeText: "Offline",
  },
};

export function StateNotice({
  kind,
  title,
  description,
  action,
}: StateNoticeProps) {
  const defaults = DEFAULT_COPY[kind];
  const role = kind === "error" || kind === "permission-denied" ? "alert" : "status";

  return (
    <div
      role={role}
      className={[
        "flex flex-col justify-between gap-3 rounded-lg border bg-surface p-[var(--density-pad)] sm:flex-row sm:items-center",
        defaults.borderClass,
      ].join(" ")}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded border border-border-subtle bg-elevated px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
            {defaults.badgeText}
          </span>
          <h3 className="text-sm font-semibold text-fg">
            {title ?? defaults.title}
          </h3>
        </div>
        <p className="text-xs leading-relaxed text-fg-muted">
          {description ?? defaults.description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
