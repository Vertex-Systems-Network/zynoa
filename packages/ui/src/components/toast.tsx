"use client";
import { X } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";
import { useSyncExternalStore } from "react";
import { cn } from "../lib/cn";

export type ToastVariant = "neutral" | "success" | "danger";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Milliseconds before auto-dismiss. */
  duration?: number;
}

interface ToastRecord extends ToastOptions {
  id: number;
}

// Minimal module-level store so any code can call toast() while <Toaster /> renders.
let nextId = 1;
let toasts: readonly ToastRecord[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Show a toast. Returns the toast id. */
export function toast(options: ToastOptions): number {
  const id = nextId++;
  toasts = [...toasts, { id, ...options }];
  emit();
  return id;
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const VARIANTS: Record<ToastVariant, string> = {
  neutral: "border-border-default bg-bg-raised",
  success: "border-status-success bg-status-success-subtle",
  danger: "border-status-danger bg-status-danger-subtle",
};

/** Mount once near the app root; announces toasts politely (role=status). */
export function Toaster() {
  const items = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => toasts,
  );
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {items.map(({ id, title, description, variant = "neutral", duration }) => (
        <ToastPrimitive.Root
          key={id}
          // Radix announces "foreground" toasts assertively; keep routine toasts
          // polite ("background") and reserve assertive for failures.
          type={variant === "danger" ? "foreground" : "background"}
          duration={duration ?? 5000}
          onOpenChange={(open) => {
            if (!open) dismissToast(id);
          }}
          className={cn(
            "relative flex flex-col gap-1 rounded-lg border p-4 pr-10 shadow-md",
            VARIANTS[variant],
          )}
        >
          <ToastPrimitive.Title className="text-sm font-semibold text-text-primary">
            {title}
          </ToastPrimitive.Title>
          {description ? (
            <ToastPrimitive.Description className="text-sm text-text-secondary">
              {description}
            </ToastPrimitive.Description>
          ) : null}
          <ToastPrimitive.Close
            aria-label="Dismiss"
            className="absolute right-3 top-3 rounded-sm text-text-muted hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus"
          >
            <X aria-hidden="true" className="size-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport
        label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none"
      />
    </ToastPrimitive.Provider>
  );
}
