/**
 * US-102 email verification end-to-end against real Postgres. Same env
 * contract as signup.test.ts (DATABASE_URL + DATABASE_PLATFORM_URL); skipped
 * without them, never silently passed.
 */
import { and, eq } from "drizzle-orm";
import { createEmailVerificationToken } from "better-auth/api";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, runMigrations, type DbHandle } from "@zynoa/db";
import { auditEvents, users, workspaces } from "@zynoa/db/schema";
import { createAuth, EMAIL_VERIFICATION_TTL_SECONDS, type Auth } from "../../src/auth.js";
import { createMockEmailProvider, type MockEmailProvider } from "../../src/email.js";

const appUrl = process.env.DATABASE_URL;
const platformUrl = process.env.DATABASE_PLATFORM_URL;
const SECRET = "integration-test-secret-integration!";
const BASE_URL = "http://localhost:4000";
const PASSWORD = "a long enough password";

function must<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) throw new Error(`expected ${what} to exist`);
  return value;
}

/** Decode a JWT payload without verifying (test-only inspection). */
function jwtPayload(token: string): { exp: number; iat: number; email: string } {
  const part = must(token.split(".")[1], "JWT payload segment");
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

describe.skipIf(!appUrl || !platformUrl)("US-102 email verification (real Postgres)", () => {
  let app: DbHandle;
  let platform: DbHandle;
  let auth: Auth;
  let mail: MockEmailProvider;

  async function wipeUser(email: string) {
    const rows = await platform.db.select().from(users).where(eq(users.email, email));
    for (const row of rows) {
      await platform.db.delete(workspaces).where(eq(workspaces.personalForUserId, row.id));
      await platform.db.delete(users).where(eq(users.id, row.id));
    }
  }

  async function signUp(email: string) {
    await wipeUser(email);
    await auth.api.signUpEmail({ body: { name: "Verify Tester", email, password: PASSWORD } });
    return must(
      (await platform.db.select().from(users).where(eq(users.email, email)))[0],
      "user row",
    );
  }

  function lastLinkFor(email: string): URL {
    const message = must(
      [...mail.sent].reverse().find((m) => m.to === email),
      `verification email to ${email}`,
    );
    const link = must(/https?:\/\/\S+/.exec(message.text)?.[0], "link in email body");
    return new URL(link);
  }

  async function verifyEvents(userId: string) {
    return platform.db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.action, "user.email_verified"), eq(auditEvents.actorId, userId)));
  }

  beforeAll(async () => {
    platform = createDb(platformUrl as string, { max: 2 });
    app = createDb(appUrl as string, { max: 2 });
    await runMigrations(platformUrl as string);
  });

  beforeEach(() => {
    // Fresh instance per test: fresh mailbox and fresh in-memory rate limits.
    mail = createMockEmailProvider({ from: "Zynoa <no-reply@zynoa.test>" });
    auth = createAuth({
      db: app.db,
      provisioningDb: platform.db,
      email: mail,
      secret: SECRET,
      baseURL: BASE_URL,
      appEnv: "ci",
    });
  });

  afterAll(async () => {
    await app?.close();
    await platform?.close();
  });

  it("sign-up sends one verification email with a 24-hour link; user starts unverified", async () => {
    const user = await signUp("verify-send@example.com");
    expect(user.emailVerified).toBe(false);

    const toUser = mail.sent.filter((m) => m.to === "verify-send@example.com");
    expect(toUser).toHaveLength(1);
    const link = lastLinkFor("verify-send@example.com");
    expect(link.origin + link.pathname).toBe(`${BASE_URL}/api/auth/verify-email`);

    const payload = jwtPayload(must(link.searchParams.get("token"), "token param"));
    expect(payload.email).toBe("verify-send@example.com");
    expect(payload.exp - payload.iat).toBe(EMAIL_VERIFICATION_TTL_SECONDS);
  });

  it("AC1: the link verifies the email once; re-opening it changes and records nothing", async () => {
    const user = await signUp("verify-once@example.com");
    const token = must(lastLinkFor("verify-once@example.com").searchParams.get("token"), "token");

    await auth.api.verifyEmail({ query: { token } });
    const [after] = await platform.db.select().from(users).where(eq(users.id, user.id));
    expect(after?.emailVerified).toBe(true);
    expect(await verifyEvents(user.id)).toHaveLength(1);

    // Second use: no error, no second audit event, still verified.
    await auth.api.verifyEmail({ query: { token } });
    expect(await verifyEvents(user.id)).toHaveLength(1);
  });

  it("AC1: an expired link is rejected and leaves the user unverified", async () => {
    const user = await signUp("verify-expired@example.com");
    const expired = await createEmailVerificationToken(SECRET, user.email, undefined, -60);
    await expect(auth.api.verifyEmail({ query: { token: expired } })).rejects.toMatchObject({
      body: { code: "TOKEN_EXPIRED" },
    });
    const [after] = await platform.db.select().from(users).where(eq(users.id, user.id));
    expect(after?.emailVerified).toBe(false);
    expect(await verifyEvents(user.id)).toHaveLength(0);
  });

  it("a tampered link is rejected", async () => {
    await signUp("verify-tamper@example.com");
    const token = must(lastLinkFor("verify-tamper@example.com").searchParams.get("token"), "token");
    const forged = `${token.slice(0, -4)}AAAA`;
    await expect(auth.api.verifyEmail({ query: { token: forged } })).rejects.toMatchObject({
      body: { code: "INVALID_TOKEN" },
    });
  });

  it("AC1: resending the verification email is limited to 3 per hour", async () => {
    await signUp("verify-resend@example.com");
    const resend = () =>
      auth.handler(
        new Request(`${BASE_URL}/api/auth/send-verification-email`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: BASE_URL,
            "x-forwarded-for": "203.0.113.7",
          },
          body: JSON.stringify({ email: "verify-resend@example.com" }),
        }),
      );

    const sentTo = () => mail.sent.filter((m) => m.to === "verify-resend@example.com").length;
    const statuses: number[] = [];
    for (let i = 0; i < 3; i++) statuses.push((await resend()).status);
    const afterAllowed = sentTo();
    statuses.push((await resend()).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
    // The rejected 4th request never reached the mailer. (Links issued in the
    // same second are byte-identical JWTs and deduplicate on the idempotency
    // key, so only the "no new mail on 429" invariant is asserted here.)
    expect(afterAllowed).toBeGreaterThanOrEqual(2);
    expect(sentTo()).toBe(afterAllowed);
  });
});
