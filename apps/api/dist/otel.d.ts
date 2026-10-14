/**
 * OpenTelemetry wiring. The app always creates spans through @opentelemetry/api;
 * they go nowhere until this registers an SDK, which happens only when
 * OTEL_EXPORTER_OTLP_ENDPOINT is configured (local default: off).
 */
export declare function startTelemetry(otlpEndpoint: string | undefined): Promise<() => Promise<void>>;
//# sourceMappingURL=otel.d.ts.map