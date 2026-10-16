/**
 * Argon2id password hashing (spec 05 §2 — Better Auth's default is scrypt, we
 * supply our own). Parameters follow the OWASP password-storage cheat sheet:
 * m=19 MiB, t=2, p=1 (also @node-rs/argon2's defaults, pinned here on purpose).
 */
import { hash as argon2Hash, verify as argon2Verify, type Algorithm } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  // `Algorithm` is an ambient const enum (unusable with verbatimModuleSyntax);
  // 2 === Algorithm.Argon2id.
  algorithm: 2 as Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2Hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(data: { hash: string; password: string }): Promise<boolean> {
  try {
    return await argon2Verify(data.hash, data.password);
  } catch {
    // Malformed/legacy hash strings verify as "no match", never as a 500.
    return false;
  }
}
