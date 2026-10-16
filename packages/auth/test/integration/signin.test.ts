/**
 * US-103 sign-in / sign-out end-to-end against real Postgres, driven through
 * Better Auth's HTTP handler so cookies are real. Same env contract as the
 * other integration suites; skipped without a database, never silently passed.
 */
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, runMigrations, type DbHandle } from "@zynoa/db";
import { sessions, users, workspaces } from "@zynoa/db/schema";
import { createAuth, type Auth } from "../../src/auth.js";
import { createMockEmailProvider } from "../../src/email.js";

const appUrl = process.env.DATABASE_URL;
const platformUrl = process.env.DATABASE_PLATFORM_URL;
const BASE_URL = "http://localhost:4000";
const PASSWORD = "a long enough password";
const EMAIL = "signin-tester@example.com";

describe.skipIf(!appUrl || !platformUrl)("US-103 sign-in / sign-out (real Postgres)", () => {
  let app: DbHandle;
  let platform: DbHandle;
  let auth: Auth;
  let ipCounter = 0;

  /** Each request gets its own client IP so Better Auth's per-IP limits stay out of the way. */
  function post(path: string, body: unknown, cookie?: string) {
    ipCounter++;
    return auth.handler(
      new Request(`${BASE_URL}/api/auth${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: BASE_URL,
          "x-forwarded-for": `198.51.100.${ipCounter}`,
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify(body),
      }),
    );
  }

  function sessionCookie(response: Response): string {
    const raw = response.headers.getSetCookie().find((c) => c.startsWith("vsn_session"));
    if (!raw) throw new Error("expected a vsn_session cookie");
    return raw;
  }

  beforeAll(async () => {
    platform = createDb(platformUrl as string, { max: 2 });
    app = createDb(appUrl as string, { max: 2 });
    await runMigrations(platformUrl as string);
  });

  beforeEach(async () => {
    auth = createAuth({
      db: app.db,
      provisioningDb: platform.db,
      email: createMockEmailProvider({ from: "no-reply@zynoa.test" }),
      secret: "integration-test-secret-integration!",
      baseURL: BASE_URL,
      appEnv: "ci",
    });
    const rows = await platform.db.select().from(users).where(eq(users.email, EMAIL));
    for (const row of rows) {
      await platform.db.delete(workspaces).where(eq(workspaces.personalForUserId, row.id));
      await platform.db.delete(users).where(eq(users.id, row.id));
    }
    await auth.api.signUpEmail({ body: { name: "Sign In", email: EMAIL, password: PASSWORD } });
  });

  afterAll(async () => {
    await app?.close();
    await platform?.close();
  });

  it("AC1: correct credentials set the session cookie with the required flags", async () => {
    const response = await post("/sign-in/email", { email: EMAIL, password: PASSWORD });
    expect(response.status).toBe(200);
    const cookie = sessionCookie(response);
    expect(cookie).toMatch(/^vsn_session\.session_token=|^vsn_session=/);
    expect(cookie).toMatch(/;\s*HttpOnly/i);
    expect(cookie).toMatch(/;\s*SameSite=Lax/i);
    expect(cookie).toMatch(/;\s*Path=\//i);
    expect(cookie).not.toMatch(/;\s*Domain=/i);
    // ci is plain http: no Secure here; HTTPS envs emit __Secure-vsn_session (ADR-025).
    expect(cookie).not.toMatch(/;\s*Secure/i);
  });

  it("AC1: wrong password and unknown email get the same generic error", async () => {
    const wrongPassword = await post("/sign-in/email", {
      email: EMAIL,
      password: "definitely the wrong one",
    });
    const unknownEmail = await post("/sign-in/email", {
      email: "nobody-here@example.com",
      password: PASSWORD,
    });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    const a = (await wrongPassword.json()) as { code?: string; message?: string };
    const b = (await unknownEmail.json()) as { code?: string; message?: string };
    expect(a).toEqual(b);
    expect(a.code).toBe("INVALID_EMAIL_OR_PASSWORD");
    expect(wrongPassword.headers.getSetCookie()).toEqual([]);
  });

  it("AC2: sign-out revokes the server session, not just the cookie", async () => {
    const signedIn = await post("/sign-in/email", { email: EMAIL, password: PASSWORD });
    const cookie = sessionCookie(signedIn).split(";")[0] as string;
    const [user] = await platform.db.select().from(users).where(eq(users.email, EMAIL));
    const before = await platform.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user?.id as string));
    expect(before.length).toBeGreaterThanOrEqual(1);
    const token = decodeURIComponent(cookie.split("=")[1] as string).split(".")[0];

    const signedOut = await post("/sign-out", {}, cookie);
    expect(signedOut.status).toBe(200);

    // The session row is gone…
    const remaining = await platform.db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token as string));
    expect(remaining).toHaveLength(0);
    // …so replaying the old cookie no longer authenticates.
    const replay = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(replay).toBeNull();
  });
});
