/** US-101: Argon2id hashing replaces Better Auth's scrypt default (spec 05 §2). */
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/password.js";

describe("password hashing", () => {
  it("produces an Argon2id PHC string with the OWASP parameters", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).toContain("m=19456,t=2,p=1");
  });

  it("verifies the original password and rejects others", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword({ hash, password: "correct horse battery staple" })).resolves.toBe(
      true,
    );
    await expect(verifyPassword({ hash, password: "wrong password here" })).resolves.toBe(false);
  });

  it("salts hashes (same password, different hashes)", async () => {
    const [a, b] = await Promise.all([hashPassword("repeatable"), hashPassword("repeatable")]);
    expect(a).not.toBe(b);
  });
});
