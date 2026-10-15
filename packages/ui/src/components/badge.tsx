import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export type BadgeVariant = "neutral" | "brand" | "success" | "warning" | "danger";

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: "bg-bg-subtle text-text-secondary",
  brand: "bg-brand-primary-subtle text-brand-primary-text",
  success: "bg-status-success-subtle text-status-success-text",
  warning: "bg-status-warning-subtle text-status-warning-text",
  danger: "bg-status-danger-subtle text-status-danger-text",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
