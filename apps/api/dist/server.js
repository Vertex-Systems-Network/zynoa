/** Process entry: validate env (fail fast), optionally start OTel, listen on :4000. */
import { loadEnv } from "@zynoa/config/env";
import { buildApp } from "./app.js";
import { startTelemetry } from "./otel.js";
import { createProbes } from "./probes.js";
const env = loadEnv(["core", "database", "redis", "temporal", "observability"]);
const stopTelemetry = await startTelemetry(env.OTEL_EXPORTER_OTLP_ENDPOINT);
const { probes, close } = createProbes({
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    temporalAddress: env.TEMPORAL_ADDRESS,
});
const app = await buildApp({ probes, logger: true });
// PORT is the platform-standard injected variable; 4000 is the documented local port (US-002).
const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });
for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, () => {
        void app
            .close()
            .then(close)
            .then(() => stopTelemetry())
            .finally(() => process.exit(0));
    });
}
//# sourceMappingURL=server.js.map