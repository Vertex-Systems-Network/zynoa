/**
 * Better Auth instance factory (spec 05 §2). Mounted by apps/api at
 * /api/auth/*. Email/password only in this slice; Google OAuth (US-104),
 * email verification (US-102) and MFA/passkeys follow. The organization
 * plugin is NOT used — workspaces/memberships/roles are our own tables.
 */
import { betterAuth, APIError } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import type { AppEnv } from "@zynoa/config/env";
import type { Db } from "@zynoa/db";
import { authAccounts, sessions, users, verifications } from "@zynoa/db/schema";
import { uuidv7 } from "uuidv7";
import { hashPassword, verifyPassword } from "./password.js";
import { provisionSignup } from "./provisioning.js";

export interface CreateAuthOptions {
  /** App-role client for Better Auth's own tables (identity tables are global, no RLS). */
  db: Db;
  /** Platform-role client (BYPASSRLS) for sign-up provisioning — see provisioning.ts. */
  provisioningDb: Db;
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
  const { db, provisioningDb, secret, baseURL, appEnv } = options;
  const cookies = cookieConfig(appEnv);

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
      minPasswordLength: 10, // spec 05 §2 (breached-password check lands with US-102/SAFE work)
      maxPasswordLength: 128,
      autoSignIn: true,
      password: { hash: hashPassword, verify: verifyPassword },
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
