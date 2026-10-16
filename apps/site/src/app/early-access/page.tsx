import type { Metadata } from "next";
import { WaitlistForm } from "../../components/waitlist-form";

export const metadata: Metadata = {
  title: "Early access",
  description: "Join the Zynoa waitlist and tell us what you'd build first.",
};

export default function EarlyAccess() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-20">
      <header className="flex flex-col gap-3">
        <p className="type-overline text-brand-primary">Early access</p>
        <h1 className="type-heading-h1 text-balance">Be first in line.</h1>
        <p className="type-body-large text-text-secondary">
          Zynoa is being built in the open. Join the waitlist, tell us what you&apos;d use it for,
          and help decide what we build first.
        </p>
      </header>
      <WaitlistForm endpoint={process.env.NEXT_PUBLIC_WAITLIST_ENDPOINT} />
      <p className="type-caption text-text-muted">
        We only use your answers to shape the product and (if you opt in) send updates. No spam.
      </p>
    </main>
  );
}
