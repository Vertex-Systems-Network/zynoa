/** Process entry: validate env (fail fast), optionally start OTel, listen on :4000. */
import { createAuth } from "@zynoa/auth";
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
  "observability",
]);
const stopTelemetry = await startTelemetry(env.OTEL_EXPORTER_OTLP_ENDPOINT);

const { probes, close } = createProbes({
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  temporalAddress: env.TEMPORAL_ADDRESS,
  timeoutMs: 2000,
});

const appDb = createDb(env.DATABASE_URL);
const platformDb = createDb(env.DATABASE_PLATFORM_URL, { max: 2 });
const auth = createAuth({
  db: appDb.db,
  provisioningDb: platformDb.db,
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
