/**
 * GL-01 Workspace Home — Phase-0 skeleton (WU-P0-07).
 * Layout and empty states only; every section fills in with its own work unit.
 */

const SECTIONS = [
  { title: "My work", hint: "Assigned tasks and approvals waiting on you will appear here." },
  { title: "Active projects", hint: "Projects you can open will appear here." },
  { title: "Running jobs", hint: "Live AI jobs and runs will appear here." },
  { title: "Recent assets", hint: "Files and creations from your projects will appear here." },
  { title: "Spend this month", hint: "Workspace AI spend will appear here." },
] as const;

export default async function WorkspaceHome({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  await params; // Route param reserved for data fetching in later work units.
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="type-heading-h2">Home</h1>

      <label className="block">
        <span className="sr-only">Ask Zynoa</span>
        <input
          type="text"
          disabled
          placeholder="Ask Zynoa anything… (coming with chat)"
          className="w-full rounded-lg border border-border-control bg-bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-70"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map(({ title, hint }) => (
          <section
            key={title}
            aria-label={title}
            className="rounded-lg border border-border-default bg-bg-surface p-4"
          >
            <h2 className="type-label-strong text-text-primary">{title}</h2>
            <p className="mt-2 text-sm text-text-muted">{hint}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
