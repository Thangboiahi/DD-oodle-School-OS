export interface SkeletonProps {
  className?: string;
  label?: string;
}

export function Skeleton({
  className = "h-4 w-full",
  label = "Loading content",
}: SkeletonProps) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <div
        aria-hidden="true"
        className={[
          "animate-pulse rounded bg-elevated",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
