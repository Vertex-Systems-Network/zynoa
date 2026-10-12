/**
 * Environment variables for every Zynoa process, defined once (docs/spec/03_ARCHITECTURE.md §8).
 *
 * Each process loads only the groups it needs: `loadEnv(["core", "database", "redis"])`.
 * Pass the groups as a literal list so the returned type contains exactly those groups.
 * Server-only (reads `process.env`, may call `process.exit`): import from `@zynoa/config/env`.
 * Missing or invalid values stop the process at startup with a message that names the
 * variable — never its value, because many of these are secrets.
 */
import { z } from "zod";

export const APP_ENVS = ["local", "ci", "preview", "staging", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

export const MODEL_PROVIDERS = ["mock", "openai", "anthropic", "google"] as const;
export type ModelProvider = (typeof MODEL_PROVIDERS)[number];

const MODEL_PROVIDER_KEYS: Record<Exclude<ModelProvider, "mock">, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_AI_API_KEY",
};

const optionalString = z.string().min(1).optional();
const url = (protocols: string[]) =>
  z
    .url()
    .refine(
      (value) => protocols.some((p) => value.startsWith(`${p}://`)),
      `must use ${protocols.join(" or ")}://`,
    );
const commaList = z.string().transform((value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);

/** Variable groups. `core` is always loaded because other groups' rules depend on APP_ENV. */
export const envGroups = {
  core: z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: z.enum(APP_ENVS),
    APP_URL: url(["http", "https"]),
    PREVIEW_DOMAIN: optionalString,
    RENDER_DOMAIN: optionalString,
    ASSET_DOMAIN: optionalString,
    /** Optional JSON file of feature-flag rows (see flags.ts). */
    FEATURE_FLAGS_FILE: optionalString,
  }),
  database: z.object({
    /** Application role: every tenant query goes through RLS. */
    DATABASE_URL: url(["postgres", "postgresql"]),
  }),
  databasePlatform: z.object({
    /** Platform role that may bypass tenant RLS. Load only in the migration runner and operator jobs. */
    DATABASE_PLATFORM_URL: url(["postgres", "postgresql"]),
  }),
  redis: z.object({
    REDIS_URL: url(["redis", "rediss"]),
  }),
  temporal: z.object({
    TEMPORAL_ADDRESS: z.string().regex(/^[^\s:]+:\d+$/, "must be host:port"),
    TEMPORAL_NAMESPACE: z.string().min(1).default("default"),
    TEMPORAL_TLS_CERT: optionalString,
    TEMPORAL_TLS_KEY: optionalString,
  }),
  storage: z.object({
    S3_ENDPOINT: url(["http", "https"]).optional(),
    S3_REGION: z.string().min(1).default("auto"),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    S3_BUCKET_PRIVATE: z.string().min(1),
    S3_BUCKET_PUBLIC: z.string().min(1),
  }),
  keys: z.object({
    KMS_KEY_ID: optionalString,
    /** 32-byte hex key for envelope encryption in local/ci only. */
    LOCAL_MASTER_KEY: z
      .string()
      .regex(/^[0-9a-fA-F]{64}$/, "must be 64 hex characters (32 bytes)")
      .optional(),
  }),
  auth: z.object({
    BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
  }),
  email: z.object({
    EMAIL_PROVIDER: z.enum(["mock", "resend", "postmark", "ses"]).default("mock"),
    EMAIL_API_KEY: optionalString,
    EMAIL_FROM: optionalString,
  }),
  models: z.object({
    MODEL_PROVIDERS_ENABLED: commaList
      .default(["mock"])
      .pipe(z.array(z.enum(MODEL_PROVIDERS)).min(1, "must list at least one provider")),
    OPENAI_API_KEY: optionalString,
    ANTHROPIC_API_KEY: optionalString,
    GOOGLE_AI_API_KEY: optionalString,
  }),
  sandbox: z.object({
    SANDBOX_PROVIDER: z.string().min(1).default("mock"),
    SANDBOX_API_KEY: optionalString,
  }),
  github: z.object({
    GITHUB_APP_ID: z.string().min(1),
    GITHUB_APP_PRIVATE_KEY: z.string().min(1),
    GITHUB_APP_CLIENT_ID: z.string().min(1),
    GITHUB_APP_CLIENT_SECRET: z.string().min(1),
    GITHUB_WEBHOOK_SECRET: z.string().min(1),
  }),
  deploy: z.object({
    DEPLOY_PROVIDER: z.string().min(1).default("mock"),
  }),
  modes: z.object({
    WORKER_QUEUES: commaList.optional(),
    MESSAGING_MODE: z.enum(["capture", "live"]).default("capture"),
    PAYMENTS_MODE: z.enum(["test", "live"]).default("test"),
  }),
  captcha: z.object({
    CAPTCHA_SITE_KEY: z.string().min(1),
    CAPTCHA_SECRET: z.string().min(1),
  }),
  observability: z.object({
    SENTRY_DSN: url(["https"]).optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: url(["http", "https"]).optional(),
  }),
} satisfies Record<string, z.ZodObject>;

export type EnvGroup = keyof typeof envGroups;

type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (
  arg: infer I,
) => void
  ? I
  : never;

export type Env<G extends EnvGroup> = z.output<(typeof envGroups)["core"]> &
  UnionToIntersection<{ [K in G]: z.output<(typeof envGroups)[K]> }[G]>;

export interface EnvIssue {
  variable: string;
  message: string;
}

export class EnvError extends Error {
  readonly issues: EnvIssue[];

  constructor(issues: EnvIssue[]) {
    super(
      `Invalid environment:\n${issues.map((i) => `  - ${i.variable}: ${i.message}`).join("\n")}`,
    );
    this.name = "EnvError";
    this.issues = issues;
  }
}

type Source = Record<string, string | undefined>;
type Parsed = Record<string, unknown>;

/** Cross-variable rules that a single field schema cannot express. */
const rules: Partial<Record<EnvGroup, (env: Parsed, appEnv: AppEnv) => EnvIssue[]>> = {
  core: () => [],
  temporal: (env) =>
    Boolean(env.TEMPORAL_TLS_CERT) === Boolean(env.TEMPORAL_TLS_KEY)
      ? []
      : [
          {
            variable: "TEMPORAL_TLS_KEY",
            message: "TEMPORAL_TLS_CERT and TEMPORAL_TLS_KEY go together",
          },
        ],
  keys: (env, appEnv) => {
    const devLike = appEnv === "local" || appEnv === "ci";
    const issues: EnvIssue[] = [];
    if (devLike && !env.KMS_KEY_ID && !env.LOCAL_MASTER_KEY) {
      issues.push({
        variable: "LOCAL_MASTER_KEY",
        message: "is required in local/ci when KMS_KEY_ID is not set",
      });
    }
    if (!devLike && !env.KMS_KEY_ID) {
      issues.push({ variable: "KMS_KEY_ID", message: `is required when APP_ENV=${appEnv}` });
    }
    if (!devLike && env.LOCAL_MASTER_KEY) {
      issues.push({
        variable: "LOCAL_MASTER_KEY",
        message: `is only allowed in local/ci, not ${appEnv}`,
      });
    }
    return issues;
  },
  auth: (env) =>
    Boolean(env.GOOGLE_CLIENT_ID) === Boolean(env.GOOGLE_CLIENT_SECRET)
      ? []
      : [
          {
            variable: "GOOGLE_CLIENT_SECRET",
            message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET go together",
          },
        ],
  email: (env, appEnv) => {
    const issues: EnvIssue[] = [];
    if (env.EMAIL_PROVIDER === "mock") {
      if (appEnv === "production")
        issues.push({ variable: "EMAIL_PROVIDER", message: "mock is not allowed in production" });
      return issues;
    }
    // SES authenticates with IAM credentials/role, not an API key.
    if (!env.EMAIL_API_KEY && env.EMAIL_PROVIDER !== "ses")
      issues.push({
        variable: "EMAIL_API_KEY",
        message: `is required for EMAIL_PROVIDER=${String(env.EMAIL_PROVIDER)}`,
      });
    if (!env.EMAIL_FROM)
      issues.push({
        variable: "EMAIL_FROM",
        message: `is required for EMAIL_PROVIDER=${String(env.EMAIL_PROVIDER)}`,
      });
    return issues;
  },
  models: (env, appEnv) => {
    const enabled = (env.MODEL_PROVIDERS_ENABLED as ModelProvider[] | undefined) ?? [];
    const issues: EnvIssue[] = [];
    if (appEnv === "production" && enabled.includes("mock")) {
      issues.push({
        variable: "MODEL_PROVIDERS_ENABLED",
        message: "mock is not allowed in production",
      });
    }
    for (const provider of enabled) {
      if (provider === "mock") continue;
      const variable = MODEL_PROVIDER_KEYS[provider];
      if (!env[variable])
        issues.push({
          variable,
          message: `is required because MODEL_PROVIDERS_ENABLED includes ${provider}`,
        });
    }
    return issues;
  },
  sandbox: (env, appEnv) => {
    if (env.SANDBOX_PROVIDER === "mock") {
      return appEnv === "production"
        ? [{ variable: "SANDBOX_PROVIDER", message: "mock is not allowed in production" }]
        : [];
    }
    return env.SANDBOX_API_KEY
      ? []
      : [
          {
            variable: "SANDBOX_API_KEY",
            message: `is required for SANDBOX_PROVIDER=${String(env.SANDBOX_PROVIDER)}`,
          },
        ];
  },
  deploy: (env, appEnv) =>
    appEnv === "production" && env.DEPLOY_PROVIDER === "mock"
      ? [{ variable: "DEPLOY_PROVIDER", message: "mock is not allowed in production" }]
      : [],
  modes: (env, appEnv) => {
    const issues: EnvIssue[] = [];
    if (appEnv === "production" && env.PAYMENTS_MODE === "test") {
      issues.push({ variable: "PAYMENTS_MODE", message: "test is not allowed in production" });
    }
    if (appEnv === "local" || appEnv === "ci") {
      for (const variable of ["PAYMENTS_MODE", "MESSAGING_MODE"] as const) {
        if (env[variable] === "live") {
          issues.push({ variable, message: `live is not allowed when APP_ENV=${appEnv}` });
        }
      }
    }
    return issues;
  },
};

/** Parse the given groups (plus `core`) from `source`. Throws EnvError listing every problem. */
export function parseEnv<const G extends EnvGroup>(
  groups: readonly G[],
  source: Source = process.env,
): Env<G> {
  // Treat empty strings as unset, as `.env` files commonly leave `KEY=`.
  const raw: Source = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, value === "" ? undefined : value]),
  );
  const selected = [...new Set<EnvGroup>(["core", ...groups])];
  const issues: EnvIssue[] = [];
  const result: Parsed = {};

  const parsedGroups: [EnvGroup, Parsed][] = [];
  for (const group of selected) {
    const parsed = envGroups[group].safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const variable = String(issue.path[0] ?? group);
        // Messages are static (zod 4 issues omit the input), so no value is ever echoed.
        issues.push({
          variable,
          message: raw[variable] === undefined ? "is required" : issue.message,
        });
      }
      continue;
    }
    parsedGroups.push([group, parsed.data as Parsed]);
    Object.assign(result, parsed.data);
  }

  const appEnv = result.APP_ENV as AppEnv | undefined;
  if (appEnv) {
    for (const [group, data] of parsedGroups) {
      issues.push(...(rules[group]?.(data, appEnv) ?? []));
    }
  }

  if (issues.length > 0) throw new EnvError(issues);
  return result as Env<G>;
}

export interface LoadEnvOptions {
  source?: Source;
  exit?: (code?: number) => never;
  log?: (message: string) => void;
}

/** Parse the env at process start; on failure print the problems and exit with code 1. */
export function loadEnv<const G extends EnvGroup>(
  groups: readonly G[],
  options: LoadEnvOptions = {},
): Env<G> {
  const {
    source = process.env,
    exit = (code) => process.exit(code),
    log = (m) => console.error(m),
  } = options;
  try {
    return parseEnv(groups, source);
  } catch (error) {
    if (error instanceof EnvError) {
      log(
        `${error.message}\nSee .env.example for every variable and docs/spec/03_ARCHITECTURE.md §8.`,
      );
      return exit(1);
    }
    throw error;
  }
}
