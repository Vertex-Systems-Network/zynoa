/**
 * Error contract (docs/spec/12_API_SPEC.md §3). Every API error is this envelope;
 * `ERROR_STATUS` is the single map from code to HTTP status.
 */
import { z } from "zod";

export const ERROR_STATUS = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  REAUTH_REQUIRED: 401,
  INSUFFICIENT_CREDITS: 402,
  BUDGET_EXCEEDED: 402,
  LIMIT_REACHED: 402,
  EMAIL_NOT_VERIFIED: 403,
  FORBIDDEN: 403,
  POLICY_DENIED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PERSONAL_WORKSPACE_SINGLE_HUMAN: 409,
  SLOT_TAKEN: 409,
  INVALID_STATE_TRANSITION: 409,
  DEPENDENCY_CYCLE: 409,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  UNSAFE_CONTENT: 422,
  MODEL_NOT_ELIGIBLE: 422,
  CAPABILITY_UNAVAILABLE: 422,
  RATE_LIMITED: 429,
  /** Unhandled server error (spec §3 addition in the same PR as this file). */
  INTERNAL: 500,
  PROVIDER_UNAVAILABLE: 502,
  SERVICE_UNAVAILABLE: 503,
} as const satisfies Record<string, number>;

export type ErrorCode = keyof typeof ERROR_STATUS;
export const ERROR_CODES = Object.keys(ERROR_STATUS) as ErrorCode[];
export const errorCode = z.enum(ERROR_CODES as [ErrorCode, ...ErrorCode[]]);

export function isErrorCode(value: string): value is ErrorCode {
  return value in ERROR_STATUS;
}

export const errorEnvelope = z.object({
  error: z.object({
    code: errorCode,
    message: z.string().min(1),
    details: z.record(z.string(), z.unknown()).optional(),
    requestId: z.string().min(1),
  }),
});
export type ErrorEnvelope = z.output<typeof errorEnvelope>;

export function apiError(
  code: ErrorCode,
  message: string,
  options: { requestId: string; details?: Record<string, unknown> },
): ErrorEnvelope {
  return {
    error: {
      code,
      message,
      ...(options.details ? { details: options.details } : {}),
      requestId: options.requestId,
    },
  };
}

/** Success envelope (spec §2): `{ data, meta: { requestId } }`. */
export function successEnvelope<T extends z.ZodType>(data: T) {
  return z.object({ data, meta: z.object({ requestId: z.string().min(1) }) });
}
