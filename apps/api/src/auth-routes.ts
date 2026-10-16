/**
 * Better Auth mount (spec 05 §2): everything under /api/auth/* is handled by
 * the Better Auth fetch handler. The scope uses a raw-buffer content-type
 * parser so bodies reach Better Auth exactly as sent (it does its own parsing
 * and CSRF/origin checks).
 */
import { apiError, ERROR_STATUS } from "@zynoa/contracts";
import { hashPassword } from "@zynoa/auth";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { requestHeaders } from "./session-guards.js";
import type { SignInGuard } from "./sign-in-guard.js";

export interface AuthHandler {
  handler: (request: Request) => Promise<Response>;
}

const SIGN_UP_PATH = "/api/auth/sign-up/email";
const SIGN_IN_PATH = "/api/auth/sign-in/email";
/** Header carrying the Turnstile token once the sign-in guard asks for one. */
export const CAPTCHA_HEADER = "x-captcha-token";

/** RFC 5321 caps a forward-path at 254 characters; longer is never a real address. */
const MAX_EMAIL_LENGTH = 254;

/**
 * Read the submitted email exactly as Better Auth will: via Request.json() on
 * a clone of the bridged request (same decoder, so e.g. a UTF-8 BOM that
 * JSON.parse would choke on cannot make the two sides disagree). Returns null
 * when there is no usable email — the caller then rejects the request rather
 * than forwarding it unguarded.
 */
async function submittedEmail(fetchRequest: Request): Promise<string | null> {
  try {
    const parsed = (await fetchRequest.clone().json()) as { email?: unknown };
    const email = typeof parsed?.email === "string" ? parsed.email.trim() : "";
    return email && email.length <= MAX_EMAIL_LENGTH ? email : null;
  } catch {
    return null;
  }
}

function toFetchRequest(request: FastifyRequest): Request | null {
  let url: URL;
  try {
    url = new URL(request.url, `${request.protocol}://${request.headers.host ?? "localhost"}`);
  } catch {
    return null; // malformed Host header
  }
  const headers = requestHeaders(request);
  // Better Auth keys its rate limits on x-forwarded-for. Never pass the
  // client's own value through (spoofable, or multi-hop → one shared bucket):
  // replace it with the single address Fastify resolved. request.ip is the
  // socket peer unless Fastify's trustProxy is configured for the deployment's
  // proxy hops (set when a deployment exists — none yet, per the no-deploy
  // directive).
  // An empty ip would serialise to a bogus value; drop the header instead
  // (Better Auth then uses its explicit no-IP fallback).
  if (request.ip) headers.set("x-forwarded-for", request.ip);
  else headers.delete("x-forwarded-for");
  const body = request.body as Buffer | undefined;
  return new Request(url.toString(), {
    method: request.method,
    headers,
    ...(body && body.length > 0 ? { body: new Uint8Array(body) } : {}),
  });
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  auth: AuthHandler,
  options: { signInGuard?: SignInGuard } = {},
): Promise<void> {
  const { signInGuard } = options;
  await app.register(async (scope) => {
    // Hand bodies to Better Auth untouched; its endpoints validate themselves.
    scope.removeAllContentTypeParsers();
    scope.addContentTypeParser("*", { parseAs: "buffer" }, (_request, payload, done) =>
      done(null, payload),
    );
    scope.route({
      method: ["GET", "POST"],
      url: "/api/auth/*",
      handler: async (request, reply) => {
        const fetchRequest = toFetchRequest(request);
        if (!fetchRequest) {
          return reply
            .status(ERROR_STATUS.VALIDATION_FAILED)
            .send(apiError("VALIDATION_FAILED", "Malformed request.", { requestId: request.id }));
        }
        // Route decisions use the pathname Better Auth itself will route on
        // (WHATWG-normalised: dot segments resolved, fragment dropped), never
        // the raw request.url — otherwise `/api/auth/./sign-in/email` reaches
        // the sign-in endpoint while skipping these checks.
        const pathname = new URL(fetchRequest.url).pathname.replace(/\/+$/, "");
        const isSignIn = request.method === "POST" && pathname === SIGN_IN_PATH;

        // US-103 AC1 / AUTH-006: per-account brute-force guard on email sign-in.
        let signInEmail: string | null = null;
        if (signInGuard && isSignIn) {
          signInEmail = await submittedEmail(fetchRequest);
          if (!signInEmail) {
            // Fail closed: never forward a sign-in we could not attribute to an account.
            return reply.status(ERROR_STATUS.VALIDATION_FAILED).send(
              apiError("VALIDATION_FAILED", "Enter a valid email address.", {
                requestId: request.id,
              }),
            );
          }
          const token = request.headers[CAPTCHA_HEADER];
          const decision = await signInGuard.check(
            signInEmail,
            Array.isArray(token) ? token[0] : token,
          );
          if (!decision.allowed) {
            return reply.status(ERROR_STATUS.RATE_LIMITED).send(
              apiError("RATE_LIMITED", "Too many attempts. Complete the CAPTCHA to continue.", {
                requestId: request.id,
                details: { captchaRequired: true },
              }),
            );
          }
        }

        let response: Response;
        try {
          response = await auth.handler(fetchRequest);
        } catch (error) {
          // Release the attempt slot the guard reserved; a crash is not a guess.
          if (signInGuard && signInEmail) signInGuard.record(signInEmail, "neutral");
          throw error;
        }

        if (signInGuard && signInEmail) {
          // Only real credential checks count: Better Auth's own per-IP 429s
          // and malformed-request 400s say nothing about the password.
          if (response.status === 401) signInGuard.record(signInEmail, "failure");
          else if (response.ok) signInGuard.record(signInEmail, "success");
          else signInGuard.record(signInEmail, "neutral");
        }

        // US-101 AC2: a duplicate email must not be distinguishable from other
        // sign-up rejections, so the 422 USER_ALREADY_EXISTS shape is flattened
        // into one generic envelope. Field-validation 400s pass through for
        // inline display. The original body is logged server-side so a genuine
        // 422 fault (FAILED_TO_CREATE_USER) stays visible.
        if (request.method === "POST" && pathname === SIGN_UP_PATH && response.status === 422) {
          const original = await response.text();
          request.log.warn({ status: 422, body: original }, "sign-up rejected (flattened)");
          // Better Auth rejects duplicates BEFORE hashing, so without this a
          // duplicate answers ~50-100 ms faster than a fresh sign-up — a timing
          // oracle. Burn an equivalent Argon2id hash. The 400-vs-200 status
          // stays observable: Better Auth only returns its synthetic duplicate
          // 200 under requireEmailVerification, which US-102 deliberately does
          // not enable (unverified users may sign in; AC2 gates actions).
          await hashPassword(`anti-enumeration-${Date.now()}`);
          return reply.status(ERROR_STATUS.VALIDATION_FAILED).send(
            apiError("VALIDATION_FAILED", "Sign-up could not be completed with those details.", {
              requestId: request.id,
            }),
          );
        }

        reply.status(response.status);
        response.headers.forEach((value, key) => {
          // Set-Cookie must stay one header per cookie.
          if (key.toLowerCase() === "set-cookie") return;
          reply.header(key, value);
        });
        const cookies = response.headers.getSetCookie();
        if (cookies.length > 0) reply.header("set-cookie", cookies);
        const text = await response.text();
        return reply.send(text.length > 0 ? text : undefined);
      },
    });
  });
}
