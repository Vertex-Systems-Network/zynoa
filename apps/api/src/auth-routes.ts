/**
 * Better Auth mount (spec 05 §2): everything under /api/auth/* is handled by
 * the Better Auth fetch handler. The scope uses a raw-buffer content-type
 * parser so bodies reach Better Auth exactly as sent (it does its own parsing
 * and CSRF/origin checks).
 */
import { apiError, ERROR_STATUS } from "@zynoa/contracts";
import { hashPassword } from "@zynoa/auth";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { requestHeaders } from "./session-guards.js";

export interface AuthHandler {
  handler: (request: Request) => Promise<Response>;
}

const SIGN_UP_PATH = "/api/auth/sign-up/email";

function toFetchRequest(request: FastifyRequest): Request | null {
  let url: URL;
  try {
    url = new URL(request.url, `${request.protocol}://${request.headers.host ?? "localhost"}`);
  } catch {
    return null; // malformed Host header
  }
  const headers = requestHeaders(request);
  const body = request.body as Buffer | undefined;
  return new Request(url.toString(), {
    method: request.method,
    headers,
    ...(body && body.length > 0 ? { body: new Uint8Array(body) } : {}),
  });
}

export async function registerAuthRoutes(app: FastifyInstance, auth: AuthHandler): Promise<void> {
  await app.register(async (scope) => {
    // Hand bodies to Better Auth untouched; its endpoints validate themselves.
    scope.removeAllContentTypeParsers();
    scope.addContentTypeParser("*", { parseAs: "buffer" }, (_request, payload, done) =>
      done(null, payload),
    );
    scope.route({
      method: ["GET", "POST"],
      url: "/api/auth/*",
      handler: async (request, reply) => {
        const fetchRequest = toFetchRequest(request);
        if (!fetchRequest) {
          return reply
            .status(ERROR_STATUS.VALIDATION_FAILED)
            .send(apiError("VALIDATION_FAILED", "Malformed request.", { requestId: request.id }));
        }
        const response = await auth.handler(fetchRequest);

        // US-101 AC2: a duplicate email must not be distinguishable from other
        // sign-up rejections, so the 422 USER_ALREADY_EXISTS shape is flattened
        // into one generic envelope. Field-validation 400s pass through for
        // inline display. The original body is logged server-side so a genuine
        // 422 fault (FAILED_TO_CREATE_USER) stays visible.
        const pathname = (request.url.split("?")[0] ?? "").replace(/\/+$/, "");
        if (request.method === "POST" && pathname === SIGN_UP_PATH && response.status === 422) {
          const original = await response.text();
          request.log.warn({ status: 422, body: original }, "sign-up rejected (flattened)");
          // Better Auth rejects duplicates BEFORE hashing, so without this a
          // duplicate answers ~50-100 ms faster than a fresh sign-up — a timing
          // oracle. Burn an equivalent Argon2id hash. The 400-vs-200 status
          // remains observable until US-102's requireEmailVerification flow
          // replaces this flatten with Better Auth's synthetic duplicate 200.
          await hashPassword(`anti-enumeration-${Date.now()}`);
          return reply.status(ERROR_STATUS.VALIDATION_FAILED).send(
            apiError("VALIDATION_FAILED", "Sign-up could not be completed with those details.", {
              requestId: request.id,
            }),
          );
        }

        reply.status(response.status);
        response.headers.forEach((value, key) => {
          // Set-Cookie must stay one header per cookie.
          if (key.toLowerCase() === "set-cookie") return;
          reply.header(key, value);
        });
        const cookies = response.headers.getSetCookie();
        if (cookies.length > 0) reply.header("set-cookie", cookies);
        const text = await response.text();
        return reply.send(text.length > 0 ? text : undefined);
      },
    });
  });
}
