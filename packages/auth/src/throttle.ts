/**
 * In-memory sliding-window throttle keyed by an arbitrary string. Used for the
 * per-email cap on verification mail (US-102 AC1): Better Auth's rate limiter
 * keys on client IP only, so rotating IPs could still flood a victim's inbox.
 * Per instance, like Better Auth's memory storage; both move to Valkey when
 * the API scales out.
 */
export interface Throttle {
  /** Records a hit and returns true if it is within the limit. Refused hits are not recorded. */
  (key: string): boolean;
  /** Number of keys currently tracked (for tests / memory bounds). */
  size(): number;
}

export function createThrottle(options: {
  max: number;
  windowMs: number;
  now?: () => number;
}): Throttle {
  const { max, windowMs } = options;
  const now = options.now ?? Date.now;
  const hits = new Map<string, number[]>();

  function sweep(t: number) {
    for (const [key, times] of hits) {
      if (times.every((h) => t - h >= windowMs)) hits.delete(key);
    }
  }

  const throttle = ((key: string) => {
    const t = now();
    sweep(t);
    const recent = (hits.get(key) ?? []).filter((h) => t - h < windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }
    recent.push(t);
    hits.set(key, recent);
    return true;
  }) as Throttle;
  throttle.size = () => hits.size;
  return throttle;
}
