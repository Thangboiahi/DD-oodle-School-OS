import type { HTMLAttributes } from "react";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-border-subtle bg-elevated text-fg-muted",
  accent: "border-accent bg-elevated text-accent",
  success: "border-status-success bg-elevated text-status-success",
  warning: "border-status-warning bg-elevated text-status-warning",
  danger: "border-status-danger bg-elevated text-status-danger",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium leading-tight",
        TONE_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
