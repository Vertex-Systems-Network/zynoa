/**
 * Route guards built on the Better Auth session (spec 05 §6 enforcement).
 * `requireVerifiedEmail` implements US-102 AC2: org creation, invitations,
 * connections and spending beyond free credits answer 403 EMAIL_NOT_VERIFIED
 * for unverified users — attach it to those routes as they land.
 */
import { apiError, ERROR_STATUS } from "@zynoa/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";

export interface AuthSession {
  user: { id: string; emailVerified: boolean };
}

/** Resolves the session for a request's headers (cookie), or null. */
export type GetSession = (headers: Headers) => Promise<AuthSession | null>;

declare module "fastify" {
  interface FastifyRequest {
    /** Set by requireSession / requireVerifiedEmail. */
    authSession: AuthSession | null;
  }
}

export function requestHeaders(request: FastifyRequest): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    headers.append(key, Array.isArray(value) ? value.join(",") : value);
  }
  return headers;
}

export function createSessionGuards(getSession: GetSession) {
  function unauthenticated(request: FastifyRequest, reply: FastifyReply) {
    return reply
      .status(ERROR_STATUS.UNAUTHENTICATED)
      .send(apiError("UNAUTHENTICATED", "Sign in to continue.", { requestId: request.id }));
  }

  // Every rejecting branch RETURNS the reply. Fastify 5 skips the handler when
  // an async hook returns the reply object; relying on `await reply.send()`
  // alone breaks as soon as someone drops the await and adds an async onSend
  // hook (the handler then runs unauthenticated). Tests assert the handler
  // never runs on rejection.
  return {
    async requireSession(request: FastifyRequest, reply: FastifyReply) {
      const session = await getSession(requestHeaders(request));
      if (!session) return unauthenticated(request, reply);
      request.authSession = session;
    },
    async requireVerifiedEmail(request: FastifyRequest, reply: FastifyReply) {
      const session = await getSession(requestHeaders(request));
      if (!session) return unauthenticated(request, reply);
      request.authSession = session;
      if (!session.user.emailVerified) {
        return reply.status(ERROR_STATUS.EMAIL_NOT_VERIFIED).send(
          apiError("EMAIL_NOT_VERIFIED", "Verify your email address to do this.", {
            requestId: request.id,
          }),
        );
      }
    },
  };
}
