"use client";
/**
 * Waitlist + micro-survey (WU-P0-15). Posts JSON to the endpoint configured via
 * NEXT_PUBLIC_WAITLIST_ENDPOINT (an owner-connected form backend); until one is
 * configured it shows a friendly closed state — nothing is collected.
 */
import { useState } from "react";
import type { FormEvent } from "react";

export const ROLES = [
  { value: "freelancer", label: "Freelance developer / builder" }, // PER-1
  { value: "agency", label: "Agency or studio owner" }, // PER-2
  { value: "creator", label: "Content creator / marketer" }, // PER-3
  { value: "sme", label: "Small business owner (salon, clinic, shop…)" }, // PER-4
  { value: "org", label: "Team / organisation admin" }, // PER-5
  { value: "other", label: "Something else" },
] as const;

type Status = "idle" | "sending" | "done" | "error";

export function WaitlistForm({ endpoint }: { endpoint: string | undefined }) {
  const [status, setStatus] = useState<Status>("idle");

  if (!endpoint) {
    return (
      <p className="rounded-lg border border-border-default bg-bg-surface p-4 text-sm text-text-secondary">
        The waitlist is not open yet — check back soon.
      </p>
    );
  }

  if (status === "done") {
    return (
      <p
        role="status"
        className="rounded-lg border border-status-success bg-status-success-subtle p-4 text-sm text-status-success-text"
      >
        You&apos;re on the list — thank you! We&apos;ll be in touch.
      </p>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    try {
      const response = await fetch(endpoint as string, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          role: String(data.get("role") ?? ""),
          pain: String(data.get("pain") ?? ""),
          updatesConsent: data.get("updatesConsent") === "on",
          source: "site-early-access",
        }),
      });
      setStatus(response.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  const field =
    "w-full rounded-md border border-border-control bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-text-secondary">
        Name
        <input name="name" type="text" autoComplete="name" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-text-secondary">
        Email (required)
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-text-secondary">
        What best describes you?
        <select name="role" className={field} defaultValue="freelancer">
          {ROLES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-text-secondary">
        What&apos;s the biggest problem you&apos;d want this to solve?
        <textarea name="pain" rows={3} className={field} />
      </label>
      <label className="flex items-start gap-2 text-sm text-text-secondary">
        <input name="updatesConsent" type="checkbox" className="mt-1" />
        <span>Send me product updates. Unsubscribe anytime. (optional)</span>
      </label>
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-lg bg-brand-primary px-5 py-3 text-sm font-semibold text-text-on-brand hover:bg-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus disabled:opacity-60"
      >
        {status === "sending" ? "Joining…" : "Join the waitlist"}
      </button>
      {status === "error" ? (
        <p role="alert" className="text-sm text-status-danger-text">
          Something went wrong — please try again.
        </p>
      ) : null}
    </form>
  );
}
