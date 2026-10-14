/**
 * Fastify app factory (spec US-006). Pure of I/O: readiness probes are injected,
 * so tests run without Postgres/Valkey/Temporal.
 */
import { randomUUID } from "node:crypto";
import {
  ERROR_STATUS,
  apiError,
  type ErrorCode,
  healthResponse,
  readyResponse,
  type DependencyCheck,
  type ReadinessDependency,
} from "@zynoa/contracts";
import fastify, { type FastifyError, type FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { context, trace } from "@opentelemetry/api";

export type Probe = () => Promise<void>;
export type Probes = Record<ReadinessDependency, Probe>;

export interface AppOptions {
  probes: Probes;
  /** Per-probe timeout; a probe slower than this counts as failed. */
  probeTimeoutMs?: number;
  logger?: boolean;
}

const REQUEST_ID_HEADER = "x-request-id";
const SAFE_REQUEST_ID = /^[\w.:-]{1,128}$/;

async function runCheck(probe: Probe, timeoutMs: number): Promise<DependencyCheck> {
  const started = performance.now();
  try {
    await Promise.race([
      probe(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs).unref(),
      ),
    ]);
    return { status: "ok", latencyMs: Math.round(performance.now() - started) };
  } catch (error) {
    return { status: "failed", error: (error as Error).message };
  }
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const { probes, probeTimeoutMs = 2000 } = options;
  const startedAt = Date.now();

  const app = fastify({
    logger: options.logger ?? false,
    // Reuse a well-formed inbound X-Request-Id (gateway-assigned); never trust arbitrary bytes.
    genReqId: (req) => {
      const inbound = req.headers[REQUEST_ID_HEADER];
      const value = Array.isArray(inbound) ? inbound[0] : inbound;
      return value && SAFE_REQUEST_ID.test(value) ? value : `req_${randomUUID()}`;
    },
    requestIdHeader: false,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Request-id on every response + one OTel span per request (no-op without a registered SDK).
  app.addHook("onRequest", (request, reply, done) => {
    reply.header(REQUEST_ID_HEADER, request.id);
    const span = trace
      .getTracer("zynoa-api")
      .startSpan(`${request.method} ${request.url.split("?")[0]}`, undefined, context.active());
    span.setAttribute("http.request_id", request.id);
    request.raw.on("close", () => {
      span.setAttribute("http.status_code", reply.statusCode);
      span.end();
    });
    done();
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(ERROR_STATUS.NOT_FOUND).send(
      apiError("NOT_FOUND", `Route ${request.method} ${request.url} does not exist.`, {
        requestId: request.id,
      }),
    );
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(ERROR_STATUS.VALIDATION_FAILED).send(
        apiError("VALIDATION_FAILED", "Request validation failed.", {
          requestId: request.id,
          details: {
            issues: error.validation.map((issue) => ({
              path: issue.instancePath,
              message: issue.message,
            })),
          },
        }),
      );
    }
    if (error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500) {
      // Client errors raised by Fastify itself (body parsing, payload size, …) keep their
      // status class instead of masquerading as server errors.
      const codeByStatus: Partial<Record<number, ErrorCode>> = {
        400: "VALIDATION_FAILED",
        401: "UNAUTHENTICATED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        413: "PAYLOAD_TOO_LARGE",
        429: "RATE_LIMITED",
      };
      const code = codeByStatus[error.statusCode] ?? "VALIDATION_FAILED";
      const message = error.code?.startsWith("FST_ERR_CTP_")
        ? "Request body could not be parsed."
        : error.message;
      return reply
        .status(error.statusCode)
        .send(apiError(code, message, { requestId: request.id }));
    }
    request.log.error({ err: error }, "unhandled error");
    // Never leak internals: envelope only, details stay in the log.
    return reply
      .status(ERROR_STATUS.INTERNAL)
      .send(apiError("INTERNAL", "Unexpected server error.", { requestId: request.id }));
  });

  // Await so the routes below register after the plugin's onRoute hook exists.
  await app.register(swagger, {
    openapi: {
      openapi: "3.1.1",
      info: {
        title: "Zynoa API",
        version: "0.1.0",
        description:
          "Generated from Zod contracts (packages/contracts). Conventions: docs/spec/12_API_SPEC.md.",
      },
    },
    transform: jsonSchemaTransform,
  });

  app.get("/healthz", { schema: { response: { 200: healthResponse } } }, async (request) => ({
    data: { status: "ok" as const, uptimeSeconds: (Date.now() - startedAt) / 1000 },
    meta: { requestId: request.id },
  }));

  app.get(
    "/readyz",
    { schema: { response: { 200: readyResponse, 503: readyResponse } } },
    async (request, reply) => {
      const [database, redis, temporal] = await Promise.all([
        runCheck(probes.database, probeTimeoutMs),
        runCheck(probes.redis, probeTimeoutMs),
        runCheck(probes.temporal, probeTimeoutMs),
      ]);
      const checks = { database, redis, temporal };
      const ready = Object.values(checks).every((check) => check.status === "ok");
      return reply.status(ready ? 200 : 503).send({
        data: { status: ready ? ("ready" as const) : ("unready" as const), checks },
        meta: { requestId: request.id },
      });
    },
  );

  app.get("/api/v1/openapi.json", { schema: { hide: true } }, async () => app.swagger());

  return app;
}
