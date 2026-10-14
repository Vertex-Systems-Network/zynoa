/** Health endpoints (spec US-006): /healthz is process-only, /readyz checks dependencies. */
import { z } from "zod";
import { successEnvelope } from "./errors.js";

export const dependencyCheck = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), latencyMs: z.number().nonnegative() }),
  z.object({ status: z.literal("failed"), error: z.string().min(1) }),
]);
export type DependencyCheck = z.output<typeof dependencyCheck>;

export const READINESS_DEPENDENCIES = ["database", "redis", "temporal"] as const;
export type ReadinessDependency = (typeof READINESS_DEPENDENCIES)[number];

export const healthResponse = successEnvelope(
  z.object({ status: z.literal("ok"), uptimeSeconds: z.number().nonnegative() }),
);

export const readyResponse = successEnvelope(
  z.object({
    status: z.enum(["ready", "unready"]),
    checks: z.object({
      database: dependencyCheck,
      redis: dependencyCheck,
      temporal: dependencyCheck,
    }),
  }),
);
