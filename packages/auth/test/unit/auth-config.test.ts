/** createAuth wiring (spec 05 §2 + spec 04 §1 table/field mapping). */
import { createDb, type DbHandle } from "@zynoa/db";
import { createCookieGetter } from "better-auth/cookies";
import { afterAll, describe, expect, it } from "vitest";
import { createAuth, EMAIL_VERIFICATION_TTL_SECONDS } from "../../src/auth.js";
import { createMockEmailProvider } from "../../src/email.js";

// Pools connect lazily, so a bogus URL is fine for config-level assertions.
const handles: DbHandle[] = [];
function makeAuth(appEnv: "local" | "ci" | "preview" | "staging" | "production" = "local") {
  const handle = createDb("postgres://unused:unused@localhost:9/unused");
  handles.push(handle);
  return createAuth({
    db: handle.db,
    provisioningDb: handle.db,
    email: createMockEmailProvider({ from: "no-reply@zynoa.test" }),
    secret: "test-secret-test-secret-test-secret!",
    baseURL: "http://localhost:4000",
    appEnv,
  });
}

afterAll(() => Promise.all(handles.map((h) => h.close())));

describe("createAuth", () => {
  const auth = makeAuth();

  it("maps models onto our tables (spec 04 §1)", () => {
    expect(auth.options.user?.modelName).toBe("users");
    expect(auth.options.user?.fields).toMatchObject({ image: "imageUrl" });
    expect(auth.options.account?.modelName).toBe("auth_accounts");
    expect(auth.options.session?.modelName).toBe("sessions");
    expect(auth.options.verification?.modelName).toBe("verifications");
  });

  it("declares the session additionalFields with input disabled", () => {
    const fields = auth.options.session?.additionalFields ?? {};
    expect(fields.activeWorkspaceId).toMatchObject({ type: "string", input: false });
    expect(fields.mfaVerifiedAt).toMatchObject({ type: "date", input: false });
  });

  it("generates UUIDv7 ids", () => {
    const generate = auth.options.advanced?.database?.generateId;
    expect(typeof generate).toBe("function");
    const id = (generate as (o: { model: string }) => string)({ model: "user" });
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("enforces the password policy floor of 10 chars (spec 05 §2)", () => {
    expect(auth.options.emailAndPassword?.enabled).toBe(true);
    expect(auth.options.emailAndPassword?.minPasswordLength).toBe(10);
  });

  it("uses Argon2id, not the scrypt default", async () => {
    const hash = await auth.options.emailAndPassword?.password?.hash?.("some password here");
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it("mounts under /api/auth", () => {
    expect(auth.options.basePath).toBe("/api/auth");
  });

  // Assert the cookie Better Auth actually EMITS (createCookieGetter), not the
  // config we passed in — the getter prepends __Secure- itself (ADR-025).
  it("emits __Secure-vsn_session with Secure on HTTPS environments", () => {
    const prod = makeAuth("production");
    const cookie = createCookieGetter(prod.options)("session_token");
    expect(cookie.name).toBe("__Secure-vsn_session");
    expect(cookie.attributes).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    expect(cookie.attributes.domain).toBeUndefined();
  });

  it("emits plain vsn_session without Secure locally (no HTTPS)", () => {
    const cookie = createCookieGetter(auth.options)("session_token");
    expect(cookie.name).toBe("vsn_session");
    expect(cookie.attributes).toMatchObject({
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("US-102: sends a 24-hour verification link on sign-up", () => {
    const verification = auth.options.emailVerification;
    expect(verification?.sendOnSignUp).toBe(true);
    expect(verification?.expiresIn).toBe(EMAIL_VERIFICATION_TTL_SECONDS);
    expect(EMAIL_VERIFICATION_TTL_SECONDS).toBe(86_400);
    expect(typeof verification?.sendVerificationEmail).toBe("function");
  });

  it("US-102: still lets unverified users sign in (AC2 gates actions, not sessions)", () => {
    expect("requireEmailVerification" in (auth.options.emailAndPassword ?? {})).toBe(false);
  });

  it("US-102: limits verification resends to 3 per hour in every environment", () => {
    expect(auth.options.rateLimit?.enabled).toBe(true);
    expect(auth.options.rateLimit?.customRules?.["/send-verification-email"]).toEqual({
      window: 3600,
      max: 3,
    });
  });
});
