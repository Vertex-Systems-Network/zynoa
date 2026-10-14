/**
 * OpenTelemetry wiring. The app always creates spans through @opentelemetry/api;
 * they go nowhere until this registers an SDK, which happens only when
 * OTEL_EXPORTER_OTLP_ENDPOINT is configured (local default: off).
 */
export async function startTelemetry(
  otlpEndpoint: string | undefined,
): Promise<() => Promise<void>> {
  if (!otlpEndpoint) return async () => {};
  const [{ NodeSDK }, { OTLPTraceExporter }] = await Promise.all([
    import("@opentelemetry/sdk-node"),
    import("@opentelemetry/exporter-trace-otlp-http"),
  ]);
  const sdk = new NodeSDK({
    serviceName: "zynoa-api",
    traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint.replace(/\/$/, "")}/v1/traces` }),
  });
  sdk.start();
  return () => sdk.shutdown();
}
