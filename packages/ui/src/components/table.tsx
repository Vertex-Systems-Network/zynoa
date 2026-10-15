import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** Accessible name of the scrollable wrapper (WCAG: scrollable region must be focusable and named). */
  containerLabel?: string;
}

export function Table({ className, containerLabel = "Table", ...props }: TableProps) {
  return (
    // A wide table scrolls horizontally; the region is focusable so keyboard
    // users can reach clipped columns with the arrow keys.
    <div
      role="region"
      aria-label={containerLabel}
      tabIndex={0}
      className="w-full overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus"
    >
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-b border-border-default", className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border-default", className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-bg-subtle", className)} {...props} />;
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn("h-10 px-3 text-left align-middle font-medium text-text-secondary", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2.5 align-middle text-text-primary", className)} {...props} />;
}

export function TableCaption({ className, ...props }: HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={cn("mt-3 text-sm text-text-muted", className)} {...props} />;
}
