/**
 * CAPTCHA verification (spec 14: privacy-friendly, Cloudflare Turnstile).
 * local/ci use a mock that accepts one documented test token, so nothing
 * calls out; every other environment must configure CAPTCHA_SECRET
 * (enforced by @zynoa/config).
 */
export interface CaptchaVerifier {
  verify(token: string, remoteIp?: string): Promise<boolean>;
}

/** The only token the mock verifier accepts (tests and local dev). */
export const MOCK_CAPTCHA_PASS = "mock-captcha-pass";

export function createMockCaptcha(): CaptchaVerifier {
  return { verify: async (token) => token === MOCK_CAPTCHA_PASS };
}

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Fails closed: any error, timeout or non-`success: true` answer is a rejection. */
export function createTurnstileCaptcha(secret: string): CaptchaVerifier {
  return {
    async verify(token, remoteIp) {
      if (!token) return false;
      const form = new URLSearchParams({ secret, response: token });
      if (remoteIp) form.set("remoteip", remoteIp);
      try {
        const response = await fetch(TURNSTILE_VERIFY_URL, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: form.toString(),
          signal: AbortSignal.timeout(5000),
          redirect: "error",
        });
        if (!response.ok) return false;
        const body = (await response.json()) as { success?: unknown };
        return body.success === true;
      } catch {
        return false;
      }
    },
  };
}
