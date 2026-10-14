/**
 * Fastify app factory (spec US-006). Pure of I/O: readiness probes are injected,
 * so tests run without Postgres/Valkey/Temporal.
 */
import { randomUUID } from "node:crypto";
import { ERROR_STATUS, apiError, healthResponse, readyResponse, } from "@zynoa/contracts";
import fastify, {} from "fastify";
import swagger from "@fastify/swagger";
import { hasZodFastifySchemaValidationErrors, jsonSchemaTransform, serializerCompiler, validatorCompiler, } from "fastify-type-provider-zod";
import { context, trace } from "@opentelemetry/api";
const REQUEST_ID_HEADER = "x-request-id";
const SAFE_REQUEST_ID = /^[\w.:-]{1,128}$/;
async function runCheck(probe, timeoutMs) {
    const started = performance.now();
    try {
        await Promise.race([
            probe(),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs).unref()),
        ]);
        return { status: "ok", latencyMs: Math.round(performance.now() - started) };
    }
    catch (error) {
        return { status: "failed", error: error.message };
    }
}
export async function buildApp(options) {
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
        requestIdLogLabel: "requestId",
    }).withTypeProvider();
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
        reply.status(ERROR_STATUS.NOT_FOUND).send(apiError("NOT_FOUND", `Route ${request.method} ${request.url} does not exist.`, {
            requestId: request.id,
        }));
    });
    app.setErrorHandler((error, request, reply) => {
        if (hasZodFastifySchemaValidationErrors(error)) {
            return reply.status(ERROR_STATUS.VALIDATION_FAILED).send(apiError("VALIDATION_FAILED", "Request validation failed.", {
                requestId: request.id,
                details: {
                    issues: error.validation.map((issue) => ({
                        path: issue.instancePath,
                        message: issue.message,
                    })),
                },
            }));
        }
        if (error.statusCode === 413) {
            return reply
                .status(413)
                .send(apiError("PAYLOAD_TOO_LARGE", "Request body too large.", { requestId: request.id }));
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
                description: "Generated from Zod contracts (packages/contracts). Conventions: docs/spec/12_API_SPEC.md.",
            },
        },
        transform: jsonSchemaTransform,
    });
    app.get("/healthz", { schema: { response: { 200: healthResponse } } }, async (request) => ({
        data: { status: "ok", uptimeSeconds: (Date.now() - startedAt) / 1000 },
        meta: { requestId: request.id },
    }));
    app.get("/readyz", { schema: { response: { 200: readyResponse, 503: readyResponse } } }, async (request, reply) => {
        const [database, redis, temporal] = await Promise.all([
            runCheck(probes.database, probeTimeoutMs),
            runCheck(probes.redis, probeTimeoutMs),
            runCheck(probes.temporal, probeTimeoutMs),
        ]);
        const checks = { database, redis, temporal };
        const ready = Object.values(checks).every((check) => check.status === "ok");
        return reply.status(ready ? 200 : 503).send({
            data: { status: ready ? "ready" : "unready", checks },
            meta: { requestId: request.id },
        });
    });
    app.get("/api/v1/openapi.json", { schema: { hide: true } }, async () => app.swagger());
    return app;
}
//# sourceMappingURL=app.js.map