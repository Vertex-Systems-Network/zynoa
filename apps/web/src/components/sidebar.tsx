"use client";
/**
 * Collapsible workspace sidebar — the GL-01 shell (Figma GL-01c `257:162971`).
 * Navigation only; every destination is a Phase-0 placeholder route.
 */
import { Bell, FolderKanban, Home, ListChecks, MessageSquare, PanelLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export const SIDEBAR_STORAGE_KEY = "zynoa.sidebar.collapsed";

const NAV = [
  { label: "Home", segment: "", icon: Home }, // GL-01
  { label: "Projects", segment: "/projects", icon: FolderKanban }, // GL-02
  { label: "Chat", segment: "/chat", icon: MessageSquare }, // GL-03
  { label: "Inbox", segment: "/inbox", icon: Bell }, // GL-05
  { label: "Jobs", segment: "/jobs", icon: ListChecks }, // GL-07
] as const;

function readStoredCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function Sidebar({ workspace }: { workspace: string }) {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window === "undefined" ? false : readStoredCollapsed(),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // Storage unavailable: the state still works for this page view.
    }
  }, [collapsed]);

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={
        "flex h-full shrink-0 flex-col border-r border-border-default bg-bg-sidebar " +
        "text-text-on-sidebar transition-[width] " +
        (collapsed ? "w-14" : "w-60")
      }
    >
      <div className={"flex h-14 items-center px-3 " + (collapsed ? "justify-center" : "gap-2")}>
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-md bg-brand-primary text-sm font-bold text-text-on-brand"
        >
          Z
        </span>
        {!collapsed && <span className="truncate text-sm font-semibold">Zynoa</span>}
      </div>

      <nav aria-label="Workspace" className="flex-1 space-y-1 px-2 py-2">
        {NAV.map(({ label, segment, icon: Icon }) => (
          <Link
            key={label}
            href={`/w/${workspace}${segment}`}
            title={label}
            className={
              "flex items-center gap-3 rounded-md px-2 py-2 text-sm " +
              "hover:bg-bg-sidebar-active hover:text-text-on-sidebar-active " +
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus " +
              (collapsed ? "justify-center" : "")
            }
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className={collapsed ? "sr-only" : "truncate"}>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-border-default/40 p-2">
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((value) => !value)}
          className={
            "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm " +
            "hover:bg-bg-sidebar-active hover:text-text-on-sidebar-active " +
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus " +
            (collapsed ? "justify-center" : "")
          }
        >
          <PanelLeft aria-hidden="true" className="size-4 shrink-0" />
          <span className={collapsed ? "sr-only" : ""}>Collapse</span>
        </button>
      </div>
    </aside>
  );
}
