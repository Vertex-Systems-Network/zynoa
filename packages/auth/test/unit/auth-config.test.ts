/** createAuth wiring (spec 05 §2 + spec 04 §1 table/field mapping). */
import { createDb, type DbHandle } from "@zynoa/db";
import { afterAll, describe, expect, it } from "vitest";
import { createAuth } from "../../src/auth.js";

// Pools connect lazily, so a bogus URL is fine for config-level assertions.
const handles: DbHandle[] = [];
function makeAuth(appEnv: "local" | "ci" | "preview" | "staging" | "production" = "local") {
  const handle = createDb("postgres://unused:unused@localhost:9/unused");
  handles.push(handle);
  return createAuth({
    db: handle.db,
    provisioningDb: handle.db,
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

  it("names the session cookie __Host-vsn_session on HTTPS environments", () => {
    const prod = makeAuth("production");
    expect(prod.options.advanced?.cookies?.session_token?.name).toBe("__Host-vsn_session");
    expect(prod.options.advanced?.useSecureCookies).toBe(true);
  });

  it("drops the __Host- prefix locally (no Secure over http)", () => {
    expect(auth.options.advanced?.cookies?.session_token?.name).toBe("vsn_session");
    expect(auth.options.advanced?.useSecureCookies).toBe(false);
  });

  it("keeps cookies HttpOnly + SameSite=Lax everywhere", () => {
    const attributes = auth.options.advanced?.cookies?.session_token?.attributes;
    expect(attributes).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });
});
