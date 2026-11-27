import type { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export function Card({
  title,
  description,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-lg border border-border-subtle bg-surface p-[var(--density-pad)] text-fg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {title || description ? (
        <div className="mb-3 space-y-1">
          {title ? (
            <h2 className="text-sm font-semibold tracking-tight text-fg">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="text-xs leading-relaxed text-fg-muted">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
