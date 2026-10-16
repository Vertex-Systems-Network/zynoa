/** Process entry: validate env (fail fast), optionally start OTel, listen on :4000. */
import { createAuth, createMockEmailProvider, type EmailProvider } from "@zynoa/auth";
import { loadEnv } from "@zynoa/config/env";
import { createDb } from "@zynoa/db";
import { buildApp } from "./app.js";
import { startTelemetry } from "./otel.js";
import { createProbes } from "./probes.js";

const env = loadEnv([
  "core",
  "database",
  "databasePlatform", // sign-up provisioning runs on the platform role (packages/auth)
  "redis",
  "temporal",
  "auth",
  "email",
  "observability",
]);
const stopTelemetry = await startTelemetry(env.OTEL_EXPORTER_OTLP_ENDPOINT);

const { probes, close } = createProbes({
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  temporalAddress: env.TEMPORAL_ADDRESS,
  timeoutMs: 2000,
});

// Only the mock provider exists so far (local/ci, Mailpit relay). Real
// providers land with packages/integrations; until then a non-mock setting
// fails fast instead of silently dropping auth email.
function createEmailProvider(): EmailProvider {
  if (env.EMAIL_PROVIDER !== "mock") {
    throw new Error(`EMAIL_PROVIDER=${env.EMAIL_PROVIDER} is not implemented yet; use mock.`);
  }
  return createMockEmailProvider({
    from: env.EMAIL_FROM ?? "Zynoa <no-reply@localhost>",
    mailpitUrl: env.MAILPIT_URL,
  });
}

const appDb = createDb(env.DATABASE_URL);
const platformDb = createDb(env.DATABASE_PLATFORM_URL, { max: 2 });
const auth = createAuth({
  db: appDb.db,
  provisioningDb: platformDb.db,
  email: createEmailProvider(),
  secret: env.BETTER_AUTH_SECRET,
  // Auth endpoints are served behind the app origin (web proxies /api/*).
  baseURL: env.APP_URL,
  appEnv: env.APP_ENV,
});

const app = await buildApp({ probes, auth, logger: true });
// PORT is the platform-standard injected variable; 4000 is the documented local port (US-002).
const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    // In-flight keep-alive connections get 10 s; a hung cleanup exits non-zero.
    setTimeout(() => process.exit(1), 10_000).unref();
    void app
      .close()
      .then(close)
      .then(() => Promise.all([appDb.close(), platformDb.close()]))
      .then(() => stopTelemetry())
      .then(
        () => process.exit(0),
        () => process.exit(1),
      );
  });
}
