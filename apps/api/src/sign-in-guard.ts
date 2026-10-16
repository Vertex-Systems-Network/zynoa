/**
 * Brute-force protection for email sign-in (spec 05 AUTH-006, US-103 AC1):
 * 5 failed sign-ins per ACCOUNT within 15 minutes → every further attempt
 * needs a valid CAPTCHA and is slowed by a progressive delay. Keyed on the
 * submitted email whether or not the account exists, so the guard reveals
 * nothing about which emails are registered. Per-IP limits come from Better
 * Auth's own /sign-in/email rule.
 *
 * In-memory per instance, like the other auth limits; moves to Valkey when
 * the API runs more than one instance.
 */
import type { CaptchaVerifier } from "./captcha.js";

export const SIGN_IN_POLICY = {
  maxFailures: 5,
  windowMs: 15 * 60 * 1000,
  baseDelayMs: 1000,
  maxDelayMs: 10_000,
} as const;

export type GuardDecision = { allowed: true } | { allowed: false };

export interface SignInGuard {
  /** Call before attempting sign-in. */
  check(email: string, captchaToken: string | undefined, remoteIp?: string): Promise<GuardDecision>;
  /** Call with the attempt's outcome (only real credential checks, not rate-limit rejections). */
  record(email: string, outcome: "success" | "failure"): void;
}

export function createSignInGuard(options: {
  captcha: CaptchaVerifier;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}): SignInGuard {
  const now = options.now ?? Date.now;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const failures = new Map<string, number[]>();
  const key = (email: string) => email.trim().toLowerCase();

  function recent(k: string): number[] {
    const t = now();
    const kept = (failures.get(k) ?? []).filter((at) => t - at < SIGN_IN_POLICY.windowMs);
    if (kept.length === 0) failures.delete(k);
    else failures.set(k, kept);
    return kept;
  }

  return {
    async check(email, captchaToken, remoteIp) {
      const count = recent(key(email)).length;
      if (count < SIGN_IN_POLICY.maxFailures) return { allowed: true };
      if (!captchaToken || !(await options.captcha.verify(captchaToken, remoteIp))) {
        return { allowed: false };
      }
      const over = count - SIGN_IN_POLICY.maxFailures; // 0 at the threshold
      const delay = Math.min(SIGN_IN_POLICY.baseDelayMs * 2 ** over, SIGN_IN_POLICY.maxDelayMs);
      await sleep(delay);
      return { allowed: true };
    },
    record(email, outcome) {
      const k = key(email);
      if (outcome === "success") {
        failures.delete(k);
        return;
      }
      const list = recent(k);
      list.push(now());
      failures.set(k, list);
    },
  };
}
