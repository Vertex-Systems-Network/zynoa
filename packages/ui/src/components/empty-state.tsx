import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/** Placeholder for sections with no data yet (used across GL-01 and list screens). */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-default bg-bg-surface px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div aria-hidden="true" className="text-text-muted">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-text-muted">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
