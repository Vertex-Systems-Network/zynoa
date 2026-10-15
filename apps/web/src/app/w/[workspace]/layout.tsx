import type { ReactNode } from "react";
import { Sidebar } from "../../../components/sidebar";
import { ThemeToggle } from "../../../components/theme-toggle";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <div className="flex h-dvh">
      <Sidebar workspace={workspace} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-default bg-bg-surface px-4">
          <span className="text-sm text-text-secondary">
            Workspace&nbsp;
            <span className="font-medium text-text-primary">{workspace}</span>
          </span>
          <ThemeToggle />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
