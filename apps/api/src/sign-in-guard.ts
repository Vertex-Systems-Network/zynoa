/**
 * Brute-force protection for email sign-in (spec 05 AUTH-006, US-103 AC1):
 * 5 failed sign-ins per ACCOUNT within 15 minutes → every further attempt
 * needs a valid CAPTCHA and is slowed by a progressive delay. Keyed on the
 * submitted email whether or not the account exists, so the guard reveals
 * nothing about which emails are registered. Per-IP limits come from Better
 * Auth's own /sign-in/email rule.
 *
 * - Concurrency: an allowed attempt RESERVES a slot that counts like a
 *   failure until record() settles it, so a burst of parallel requests cannot
 *   squeeze in more than 5 unguarded guesses.
 * - At most one delayed (post-CAPTCHA) attempt per account is in flight;
 *   others are refused, so sleepers cannot pile up.
 * - Memory: keys are SHA-256 of the normalised email (bounded size), expired
 *   keys are swept, and the map is hard-capped (oldest evicted).
 *
 * In-memory per instance, like the other auth limits; moves to Valkey when
 * the API runs more than one instance.
 */
import { createHash } from "node:crypto";
import type { CaptchaVerifier } from "./captcha.js";

export const SIGN_IN_POLICY = {
  maxFailures: 5,
  windowMs: 15 * 60 * 1000,
  baseDelayMs: 1000,
  maxDelayMs: 10_000,
  maxTrackedAccounts: 50_000,
  sweepEveryMs: 60_000,
} as const;

export type GuardDecision = { allowed: true } | { allowed: false };
export type AttemptOutcome = "success" | "failure" | "neutral";

export interface SignInGuard {
  /** Call before attempting sign-in. An allowed attempt reserves a slot until record(). */
  check(email: string, captchaToken: string | undefined): Promise<GuardDecision>;
  /**
   * Settle a reserved attempt: "failure" for a real credential rejection (401),
   * "success" clears the account, "neutral" (rate-limited, malformed, crashed)
   * just releases the reservation.
   */
  record(email: string, outcome: AttemptOutcome): void;
  /** Accounts currently tracked (tests / memory bounds). */
  size(): number;
}

interface Entry {
  failures: number[];
  pending: number;
  sleeping: boolean;
}

export function createSignInGuard(options: {
  captcha: CaptchaVerifier;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  maxTrackedAccounts?: number;
}): SignInGuard {
  const now = options.now ?? Date.now;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const cap = options.maxTrackedAccounts ?? SIGN_IN_POLICY.maxTrackedAccounts;
  const entries = new Map<string, Entry>();
  let lastSweep = now();

  const key = (email: string) =>
    createHash("sha256").update(email.trim().toLowerCase()).digest("base64url");

  function prune(entry: Entry, t: number) {
    entry.failures = entry.failures.filter((at) => t - at < SIGN_IN_POLICY.windowMs);
  }

  function isIdle(entry: Entry) {
    return entry.failures.length === 0 && entry.pending === 0 && !entry.sleeping;
  }

  function sweep(t: number) {
    if (t - lastSweep < SIGN_IN_POLICY.sweepEveryMs) return;
    lastSweep = t;
    for (const [k, entry] of entries) {
      prune(entry, t);
      if (isIdle(entry)) entries.delete(k);
    }
  }

  function entryFor(k: string): Entry {
    let entry = entries.get(k);
    if (!entry) {
      if (entries.size >= cap) {
        // Prefer evicting an account with no recent failures, so flooding the
        // map with throwaway emails can't reset a targeted account's count;
        // fall back to the oldest-inserted (Map preserves insertion order).
        const t = now();
        let victim: string | undefined;
        for (const [k2, e] of entries) {
          prune(e, t);
          if (e.failures.length === 0 && e.pending === 0 && !e.sleeping) {
            victim = k2;
            break;
          }
        }
        victim ??= entries.keys().next().value;
        if (victim !== undefined) entries.delete(victim);
      }
      entry = { failures: [], pending: 0, sleeping: false };
      entries.set(k, entry);
    }
    return entry;
  }

  return {
    async check(email, captchaToken) {
      const t = now();
      sweep(t);
      const k = key(email);
      const entry = entryFor(k);
      prune(entry, t);
      const count = entry.failures.length + entry.pending;

      if (count < SIGN_IN_POLICY.maxFailures) {
        entry.pending++;
        return { allowed: true };
      }
      if (entry.sleeping || !captchaToken) return { allowed: false };
      // Claim the account's single delayed slot BEFORE awaiting the CAPTCHA
      // check, so parallel requests can't all pass the `sleeping` test while
      // verification is in flight.
      entry.sleeping = true;
      try {
        if (!(await options.captcha.verify(captchaToken))) return { allowed: false };
        const over = count - SIGN_IN_POLICY.maxFailures; // 0 at the threshold
        await sleep(Math.min(SIGN_IN_POLICY.baseDelayMs * 2 ** over, SIGN_IN_POLICY.maxDelayMs));
      } finally {
        entry.sleeping = false;
      }
      entry.pending++;
      return { allowed: true };
    },

    record(email, outcome) {
      const k = key(email);
      const entry = outcome === "failure" ? entryFor(k) : entries.get(k);
      if (!entry) return;
      entry.pending = Math.max(0, entry.pending - 1);
      if (outcome === "success") {
        entries.delete(k);
        return;
      }
      if (outcome === "failure") entry.failures.push(now());
      if (isIdle(entry)) entries.delete(k);
    },

    size: () => entries.size,
  };
}
