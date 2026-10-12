import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { EnvError, envGroups, loadEnv, parseEnv } from "../src/env.js";

const base = {
  NODE_ENV: "development",
  APP_ENV: "local",
  APP_URL: "http://localhost:3000",
};

const fullLocal = {
  ...base,
  DATABASE_URL: "postgres://zynoa:zynoa@localhost:5432/zynoa",
  DATABASE_PLATFORM_URL: "postgres://zynoa_platform:zynoa@localhost:5432/zynoa",
  REDIS_URL: "redis://localhost:6379",
  TEMPORAL_ADDRESS: "localhost:7233",
  TEMPORAL_NAMESPACE: "default",
  LOCAL_MASTER_KEY: "a".repeat(64),
};

describe("parseEnv", () => {
  it("parses the core group and applies defaults", () => {
    const env = parseEnv(["core"], base);
    expect(env.APP_ENV).toBe("local");
    expect(env.APP_URL).toBe("http://localhost:3000");
  });

  it("names every missing required variable", () => {
    const result = () => parseEnv(["core", "database", "redis"], { NODE_ENV: "development" });
    expect(result).toThrow(EnvError);
    try {
      result();
    } catch (error) {
      const names = (error as EnvError).issues.map((i) => i.variable);
      expect(names).toEqual(
        expect.arrayContaining([
          "APP_ENV",
          "APP_URL",
          "DATABASE_URL",
          "DATABASE_PLATFORM_URL",
          "REDIS_URL",
        ]),
      );
      expect((error as Error).message).toContain("DATABASE_URL");
    }
  });

  it("rejects invalid values with the variable name", () => {
    expect(() => parseEnv(["core"], { ...base, APP_ENV: "prod" })).toThrow(/APP_ENV/);
    expect(() => parseEnv(["core"], { ...base, APP_URL: "not a url" })).toThrow(/APP_URL/);
    expect(() => parseEnv(["redis"], { ...base, REDIS_URL: "http://x" })).toThrow(/REDIS_URL/);
  });

  it("never echoes secret values in error messages", () => {
    const secret = "sk-live-should-not-leak";
    try {
      parseEnv(["auth"], { ...base, BETTER_AUTH_SECRET: secret.slice(0, 5) });
    } catch (error) {
      expect((error as Error).message).not.toContain(secret.slice(0, 5));
      expect((error as Error).message).toContain("BETTER_AUTH_SECRET");
    }
  });

  it("allows LOCAL_MASTER_KEY only in local and ci; requires KMS_KEY_ID elsewhere", () => {
    expect(parseEnv(["keys"], fullLocal).LOCAL_MASTER_KEY).toHaveLength(64);
    expect(() => parseEnv(["keys"], { ...fullLocal, APP_ENV: "production" })).toThrow(/KMS_KEY_ID/);
    expect(() =>
      parseEnv(["keys"], { ...fullLocal, APP_ENV: "staging", KMS_KEY_ID: "arn:aws:kms:x" }),
    ).toThrow(/LOCAL_MASTER_KEY/);
    expect(
      parseEnv(["keys"], { ...base, APP_ENV: "staging", KMS_KEY_ID: "arn:aws:kms:x" }).KMS_KEY_ID,
    ).toBe("arn:aws:kms:x");
  });

  it("requires an API key for every enabled model provider", () => {
    expect(parseEnv(["models"], { ...base }).MODEL_PROVIDERS_ENABLED).toEqual(["mock"]);
    expect(() =>
      parseEnv(["models"], { ...base, MODEL_PROVIDERS_ENABLED: "openai,anthropic" }),
    ).toThrow(/OPENAI_API_KEY[\s\S]*ANTHROPIC_API_KEY|ANTHROPIC_API_KEY[\s\S]*OPENAI_API_KEY/);
    const env = parseEnv(["models"], {
      ...base,
      MODEL_PROVIDERS_ENABLED: "anthropic",
      ANTHROPIC_API_KEY: "key",
    });
    expect(env.MODEL_PROVIDERS_ENABLED).toEqual(["anthropic"]);
    expect(() =>
      parseEnv(["models"], { ...base, MODEL_PROVIDERS_ENABLED: "openai,unknown" }),
    ).toThrow(/MODEL_PROVIDERS_ENABLED/);
  });

  it("requires a provider key when email or sandbox provider is not mock", () => {
    expect(parseEnv(["email"], base).EMAIL_PROVIDER).toBe("mock");
    expect(() => parseEnv(["email"], { ...base, EMAIL_PROVIDER: "resend" })).toThrow(
      /EMAIL_API_KEY/,
    );
    expect(() => parseEnv(["sandbox"], { ...base, SANDBOX_PROVIDER: "e2b" })).toThrow(
      /SANDBOX_API_KEY/,
    );
  });

  it("refuses mock providers and capture-free test payments in production", () => {
    const prod = { ...base, APP_ENV: "production", NODE_ENV: "production" };
    expect(() => parseEnv(["email"], prod)).toThrow(/EMAIL_PROVIDER/);
    expect(() => parseEnv(["models"], prod)).toThrow(/MODEL_PROVIDERS_ENABLED/);
    expect(() => parseEnv(["modes"], { ...prod, PAYMENTS_MODE: "test" })).toThrow(/PAYMENTS_MODE/);
  });

  it("returns only the requested groups", () => {
    const env = parseEnv(["core", "redis"], fullLocal) as Record<string, unknown>;
    expect(env.REDIS_URL).toBe("redis://localhost:6379");
    expect(env.DATABASE_URL).toBeUndefined();
  });
});

describe("loadEnv", () => {
  it("exits the process with a clear message naming the variable", () => {
    const exit = vi.fn((code?: number) => {
      throw new Error(`exit ${code}`);
    }) as unknown as (code?: number) => never;
    const log = vi.fn();
    expect(() => loadEnv(["core", "database"], { source: base, exit, log })).toThrow("exit 1");
    expect(log).toHaveBeenCalledOnce();
    const message = String(log.mock.calls[0]?.[0]);
    expect(message).toContain("DATABASE_URL");
    expect(message).toContain("Invalid environment");
  });

  it("returns the parsed env when valid", () => {
    const env = loadEnv(["core", "database", "redis", "temporal"], { source: fullLocal });
    expect(env.TEMPORAL_NAMESPACE).toBe("default");
  });
});

describe(".env.example", () => {
  it("lists exactly the variables the schema defines", () => {
    const text = readFileSync(new URL("../../../.env.example", import.meta.url), "utf8");
    const documented = [...text.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]).sort();
    const defined = Object.values(envGroups)
      .flatMap((group) => Object.keys(group.shape))
      .sort();
    expect(documented).toEqual(defined);
  });
});
