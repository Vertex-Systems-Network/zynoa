/**
 * Better Auth mount (spec 05 §2): everything under /api/auth/* is handled by
 * the Better Auth fetch handler. The scope uses a raw-buffer content-type
 * parser so bodies reach Better Auth exactly as sent (it does its own parsing
 * and CSRF/origin checks).
 */
import { apiError, ERROR_STATUS } from "@zynoa/contracts";
import type { FastifyInstance, FastifyRequest } from "fastify";

export interface AuthHandler {
  handler: (request: Request) => Promise<Response>;
}

const SIGN_UP_PATH = "/api/auth/sign-up/email";

function toFetchRequest(request: FastifyRequest): Request {
  const url = new URL(
    request.url,
    `${request.protocol}://${request.headers.host ?? "localhost"}`,
  );
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    headers.append(key, Array.isArray(value) ? value.join(",") : value);
  }
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
        const response = await auth.handler(toFetchRequest(request));

        // US-101 AC2: a duplicate email must not be distinguishable from other
        // sign-up rejections, so the 422 USER_ALREADY_EXISTS shape is flattened
        // into one generic envelope. Field-validation 400s pass through for
        // inline display.
        const pathname = request.url.split("?")[0];
        if (request.method === "POST" && pathname === SIGN_UP_PATH && response.status === 422) {
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
