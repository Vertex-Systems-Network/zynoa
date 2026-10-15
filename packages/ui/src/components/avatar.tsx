"use client";
import { Avatar as AvatarPrimitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/cn";

export const Avatar = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(function Avatar({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex size-9 shrink-0 overflow-hidden rounded-full bg-bg-subtle",
        className,
      )}
      {...props}
    />
  );
});

export const AvatarImage = forwardRef<
  HTMLImageElement,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(function AvatarImage({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Image
      ref={ref}
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
});

export const AvatarFallback = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(function AvatarFallback({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex size-full items-center justify-center text-xs font-medium text-text-secondary",
        className,
      )}
      {...props}
    />
  );
});
