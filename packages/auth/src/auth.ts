/**
 * Better Auth instance factory (spec 05 §2). Mounted by apps/api at
 * /api/auth/*. Email/password with email verification (US-101, US-102);
 * Google OAuth (US-104) and MFA/passkeys follow. The organization plugin is
 * NOT used — workspaces/memberships/roles are our own tables.
 */
import { betterAuth, APIError } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import type { AppEnv } from "@zynoa/config/env";
import type { Db } from "@zynoa/db";
import { authAccounts, sessions, users, verifications } from "@zynoa/db/schema";
import { uuidv7 } from "uuidv7";
import { appendAuditEvent } from "./audit.js";
import { verificationEmail, type EmailProvider } from "./email.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createThrottle } from "./throttle.js";
import { provisionSignup } from "./provisioning.js";

/** US-102 AC1: verification links expire after 24 hours. */
export const EMAIL_VERIFICATION_TTL_SECONDS = 24 * 60 * 60;
/** US-102 AC1: resending the verification email is limited to 3 per hour. */
export const VERIFICATION_RESEND_RULE = { window: 60 * 60, max: 3 } as const;

/** Per-email cap on verification mail: the sign-up send plus 3 resends per hour. */
export const VERIFICATION_MAIL_PER_EMAIL = { max: 4, windowMs: 60 * 60 * 1000 } as const;

export interface CreateAuthOptions {
  /** App-role client for Better Auth's own tables (identity tables are global, no RLS). */
  db: Db;
  /** Platform-role client (BYPASSRLS) for sign-up provisioning — see provisioning.ts. */
  provisioningDb: Db;
  /** Delivers auth email (verification links). Mock + Mailpit in local/CI. */
  email: EmailProvider;
  secret: string;
  baseURL: string;
  appEnv: AppEnv;
}

/**
 * Session cookie is `__Secure-vsn_session` on HTTPS environments (spec 05 §2,
 * amended by ADR-025): Better Auth's cookie getter unconditionally prepends
 * `__Secure-` to the configured name when useSecureCookies is on, so a
 * `__Host-` name cannot be emitted correctly — and disabling useSecureCookies
 * to fake it would force Secure off at the attribute level. Plain-http
 * local/CI get `vsn_session` without Secure.
 */
function cookieConfig(appEnv: AppEnv) {
  return { useSecureCookies: appEnv !== "local" && appEnv !== "ci", name: "vsn_session" };
}

export function createAuth(options: CreateAuthOptions) {
  const { db, provisioningDb, email, secret, baseURL, appEnv } = options;
  const cookies = cookieConfig(appEnv);
  const allowVerificationMail = createThrottle(VERIFICATION_MAIL_PER_EMAIL);

  return betterAuth({
    appName: "Zynoa",
    secret,
    baseURL,
    basePath: "/api/auth",
    telemetry: { enabled: false },
    database: drizzleAdapter(db, {
      provider: "pg",
      // Keys match the renamed modelNames below (adapter looks models up by name).
      schema: {
        users,
        auth_accounts: authAccounts,
        sessions,
        verifications,
      },
      // User + credential account + session inserts share one transaction.
      transaction: true,
    }),
    advanced: {
      database: {
        // UUIDv7 primary keys, app-generated (spec 04 §0).
        generateId: () => uuidv7(),
      },
      useSecureCookies: cookies.useSecureCookies,
      cookiePrefix: "vsn",
      cookies: {
        session_token: {
          name: cookies.name,
          attributes: { httpOnly: true, sameSite: "lax", path: "/" },
        },
      },
    },
    // Table/field mapping per spec 04 §1. Fields map Better Auth names to our
    // Drizzle property names; columns whose property equals the default need no entry.
    user: {
      modelName: "users",
      fields: { image: "imageUrl" },
    },
    account: { modelName: "auth_accounts" },
    verification: { modelName: "verifications" },
    session: {
      modelName: "sessions",
      additionalFields: {
        activeWorkspaceId: { type: "string", required: false, input: false },
        mfaVerifiedAt: { type: "date", required: false, input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10, // spec 05 §2 (breached-password check lands with SAFE work)
      maxPasswordLength: 128,
      // Unverified users may sign in (US-102 AC2: they see a banner and get
      // EMAIL_NOT_VERIFIED on gated actions), so verification is not required
      // for a session.
      autoSignIn: true,
      password: { hash: hashPassword, verify: verifyPassword },
    },
    emailVerification: {
      sendOnSignUp: true,
      expiresIn: EMAIL_VERIFICATION_TTL_SECONDS,
      // Off on purpose: with it off, a verification link is not a login
      // credential (re-opening a link creates no session).
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url, token }) => {
        // Per-email cap on top of Better Auth's per-IP rule, so rotating IPs
        // cannot flood one inbox. Over the cap we skip silently: the endpoint
        // answers the same either way, so the response reveals nothing.
        if (!allowVerificationMail(user.email.toLowerCase())) return;
        try {
          // Idempotency key = the link's token. Tokens are stateless JWTs, so
          // two links issued for the same user in the same second are
          // byte-identical — sending that identical link once is correct.
          await email.send(
            verificationEmail({ to: user.email, name: user.name, url }),
            `verify-email:${user.id}:${token}`,
          );
        } catch (error) {
          // Swallowed so delivery failures don't turn into a 500 that only
          // existing, unverified accounts can trigger (an enumeration signal).
          console.error("verification email delivery failed", { userId: user.id, error });
        }
      },
      // Runs only on the FIRST successful verification: Better Auth returns
      // early for an already-verified user, so re-opening the link changes
      // nothing and records nothing (US-102 AC1 "verifies once").
      afterEmailVerification: async (user, request) => {
        // Fail-open: the verification itself has already committed, and a
        // failure here could never be retried (the next attempt takes the
        // already-verified early return). Log loudly instead of 500-ing a
        // user whose email IS verified. A transactional outbox replaces this
        // when the audit pipeline gets one.
        try {
          await provisioningDb.transaction((tx) =>
            appendAuditEvent(tx as unknown as Db, {
              workspaceId: null, // user-level event → global chain
              actorType: "user",
              actorId: user.id,
              action: "user.email_verified",
              targetType: "user",
              targetId: user.id,
              // x-forwarded-for is pinned to the resolved client IP by the API bridge.
              ip: request?.headers.get("x-forwarded-for") ?? null,
              userAgent: request?.headers.get("user-agent") ?? null,
            }),
          );
        } catch (error) {
          console.error("audit append failed for user.email_verified", { userId: user.id, error });
        }
      },
    },
    rateLimit: {
      // On in every environment (Better Auth's default is production-only),
      // so the limits are exercised by tests. Memory storage = per instance;
      // moves to Valkey secondary storage when the API runs more than one
      // instance.
      enabled: true,
      customRules: { "/send-verification-email": VERIFICATION_RESEND_RULE },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              await provisionSignup(provisioningDb, {
                userId: user.id,
                userName: user.name,
                email: user.email,
              });
            } catch (error) {
              // US-101 AC1 atomicity: a user without workspace/credits must not
              // survive. Remove the just-created row (cascades auth_accounts/
              // sessions) and fail the sign-up. The compensating delete can
              // itself fail (likely the same outage that broke provisioning);
              // it must not mask the root cause. A user row that survives both
              // failures blocks that email until the orphan sweep lands
              // (tracked for a later E1.1 slice alongside US-103).
              let compensationError: unknown;
              try {
                await provisioningDb.delete(users).where(eq(users.id, user.id));
              } catch (deleteError) {
                compensationError = deleteError;
              }
              throw new APIError("INTERNAL_SERVER_ERROR", {
                message: "Sign-up could not be completed. Please try again.",
                cause: compensationError ? new AggregateError([error, compensationError]) : error,
              });
            }
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
