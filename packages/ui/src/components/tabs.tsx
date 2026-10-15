"use client";
import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/cn";

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-md bg-bg-subtle p-1 text-text-secondary",
        className,
      )}
      {...props}
    />
  );
});

export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center rounded px-3 py-1 text-sm font-medium transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus",
        "data-[state=active]:bg-bg-surface data-[state=active]:text-text-primary data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
});

export const TabsContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        "mt-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus",
        className,
      )}
      {...props}
    />
  );
});
