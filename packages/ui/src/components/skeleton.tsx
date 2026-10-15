import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

/** Loading placeholder; hidden from assistive technology. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-bg-subtle motion-reduce:animate-none", className)}
      {...props}
    />
  );
}
