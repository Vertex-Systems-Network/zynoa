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
    const result = () =>
      parseEnv(["core", "database", "databasePlatform", "redis"], { NODE_ENV: "development" });
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

  it.each([
    ["core", { APP_ENV: "sk-leak-1" }],
    ["core", { APP_URL: "sk-leak-1" }],
    ["redis", { REDIS_URL: "http://sk-leak-1" }],
    ["keys", { LOCAL_MASTER_KEY: "sk-leak-1" }],
    ["auth", { BETTER_AUTH_SECRET: "sk-leak-1" }],
    ["models", { MODEL_PROVIDERS_ENABLED: "sk-leak-1" }],
    ["temporal", { TEMPORAL_ADDRESS: "sk-leak-1" }],
  ] as const)("never echoes the value of an invalid %s variable", (group, overrides) => {
    expect.assertions(3);
    const variable = Object.keys(overrides)[0] as string;
    try {
      parseEnv([group], { ...base, ...overrides });
    } catch (error) {
      expect(error).toBeInstanceOf(EnvError);
      expect((error as Error).message).toContain(variable);
      expect((error as Error).message).not.toContain("sk-leak-1");
    }
  });

  it("keeps the RLS-bypass database URL out of the application database group", () => {
    const env = parseEnv(["database"], { ...base, DATABASE_URL: fullLocal.DATABASE_URL }) as Record<
      string,
      unknown
    >;
    expect(env.DATABASE_PLATFORM_URL).toBeUndefined();
    expect(() => parseEnv(["databasePlatform"], base)).toThrow(/DATABASE_PLATFORM_URL/);
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

  it("accepts an optional http(s) MAILPIT_URL for the mock email relay", () => {
    expect(parseEnv(["email"], base).MAILPIT_URL).toBeUndefined();
    expect(parseEnv(["email"], { ...base, MAILPIT_URL: "http://localhost:8025" }).MAILPIT_URL).toBe(
      "http://localhost:8025",
    );
    expect(() => parseEnv(["email"], { ...base, MAILPIT_URL: "smtp://localhost:1025" })).toThrow(
      /MAILPIT_URL/,
    );
  });

  it("makes CAPTCHA keys optional in local/ci only", () => {
    expect(parseEnv(["captcha"], base).CAPTCHA_SECRET).toBeUndefined();
    const staging = { ...base, APP_ENV: "staging" };
    expect(() => parseEnv(["captcha"], staging)).toThrow(/CAPTCHA_SECRET/);
    expect(
      parseEnv(["captcha"], { ...staging, CAPTCHA_SITE_KEY: "site", CAPTCHA_SECRET: "secret" })
        .CAPTCHA_SECRET,
    ).toBe("secret");
  });

  it("refuses mock providers and capture-free test payments in production", () => {
    const prod = { ...base, APP_ENV: "production", NODE_ENV: "production" };
    expect(() => parseEnv(["email"], prod)).toThrow(/EMAIL_PROVIDER/);
    expect(() => parseEnv(["models"], prod)).toThrow(/MODEL_PROVIDERS_ENABLED/);
    expect(() => parseEnv(["modes"], { ...prod, PAYMENTS_MODE: "test" })).toThrow(/PAYMENTS_MODE/);
  });

  it("refuses live payments and messaging in local and ci", () => {
    expect(() => parseEnv(["modes"], { ...base, PAYMENTS_MODE: "live" })).toThrow(/PAYMENTS_MODE/);
    expect(() => parseEnv(["modes"], { ...base, APP_ENV: "ci", MESSAGING_MODE: "live" })).toThrow(
      /MESSAGING_MODE/,
    );
    expect(parseEnv(["modes"], base).MESSAGING_MODE).toBe("capture");
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
    expect(exit).toHaveBeenCalledWith(1);
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
