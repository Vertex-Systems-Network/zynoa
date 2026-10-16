/**
 * PUB-01 Landing / Home — Phase-0 placeholder (WU-P0-08).
 * Content from docs/spec/01_PRODUCT_VISION.md §2; real visuals, outcomes media
 * and auth links arrive with Phase 1 (REQ-FR-01) and the design pass.
 */

const PILLARS = [
  {
    name: "AI Creation Studios",
    blurb: "Coding, Design, Images, Video, Audio and Research — every deliverable in one place.",
  },
  {
    name: "AI-supervised Project OS",
    blurb: "Plans, tasks, agents and QA evidence — work is verified, not just generated.",
  },
  {
    name: "Reusable Ecosystem",
    blurb: "Skills, plugins, templates and a marketplace, so nothing starts from zero.",
  },
  {
    name: "Business Systems + Workflows",
    blurb: "Appointments, invoices, CRM and more — installable mini-apps with no-code workflows.",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-20 px-6 py-20">
      <header className="flex flex-col items-start gap-6">
        <p className="type-overline text-brand-primary">Zynoa</p>
        <h1 className="type-display-l max-w-3xl text-balance">
          One workspace where AI agents plan, create and verify your deliverables.
        </h1>
        <p className="type-body-large max-w-2xl text-text-secondary">
          Describe an outcome. A supervised team of AI agents plans the work, produces the assets
          and shows its evidence — every task, cost and approval linked in one project.
        </p>
        <div className="flex items-center gap-3">
          <a
            href="/early-access"
            className="rounded-lg bg-brand-primary px-5 py-3 text-sm font-semibold text-text-on-brand hover:bg-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus"
          >
            Join the waitlist
          </a>
          <a
            href="#signin"
            className="rounded-lg border border-border-default px-5 py-3 text-sm font-semibold text-text-primary hover:bg-bg-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus"
          >
            Sign in
          </a>
        </div>
      </header>

      <section aria-label="Example outcomes" className="flex flex-col gap-4">
        <h2 className="type-heading-h2">See it in action</h2>
        <div className="grid aspect-video place-items-center rounded-xl border border-border-default bg-bg-surface">
          <p className="type-body-default text-text-muted">
            Example outcomes (video) will appear here.
          </p>
        </div>
      </section>

      <section aria-label="The four pillars" className="flex flex-col gap-6">
        <h2 className="type-heading-h2">Four pillars, one platform</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {PILLARS.map(({ name, blurb }) => (
            <article
              key={name}
              className="rounded-xl border border-border-default bg-bg-surface p-5"
            >
              <h3 className="type-heading-h4">{name}</h3>
              <p className="type-body-default mt-2 text-text-secondary">{blurb}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border-default pt-6">
        <p className="type-caption text-text-muted">
          © {new Date().getFullYear()} Zynoa. Built in the open — Phase 0 preview.
        </p>
      </footer>
    </main>
  );
}
