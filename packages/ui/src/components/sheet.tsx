"use client";
import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/cn";

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

export type SheetSide = "left" | "right" | "top" | "bottom";

const SIDES: Record<SheetSide, string> = {
  left: "inset-y-0 left-0 h-full w-80 border-r",
  right: "inset-y-0 right-0 h-full w-80 border-l",
  top: "inset-x-0 top-0 w-full border-b",
  bottom: "inset-x-0 bottom-0 w-full border-t",
};

export interface SheetContentProps extends ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  side?: SheetSide;
}

export const SheetContent = forwardRef<HTMLDivElement, SheetContentProps>(function SheetContent(
  { className, children, side = "right", ...props },
  ref,
) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-bg-inverse/50" />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 flex flex-col gap-3 border-border-default bg-bg-raised p-6 shadow-lg",
          SIDES[side],
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          aria-label="Close"
          className="absolute right-4 top-4 rounded-sm text-text-muted hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus"
        >
          <X aria-hidden="true" className="size-4" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
});

export const SheetTitle = forwardRef<
  HTMLHeadingElement,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(function SheetTitle({ className, ...props }, ref) {
  return (
    <SheetPrimitive.Title
      ref={ref}
      className={cn("text-base font-semibold text-text-primary", className)}
      {...props}
    />
  );
});

export const SheetDescription = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(function SheetDescription({ className, ...props }, ref) {
  return (
    <SheetPrimitive.Description
      ref={ref}
      className={cn("text-sm text-text-secondary", className)}
      {...props}
    />
  );
});
