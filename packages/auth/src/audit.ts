/**
 * Audit event hash chain (spec 04 §13): one chain per workspace plus one
 * global chain for user-level events (workspace_id NULL). Rows are append-only
 * (migration 0003 revokes UPDATE/DELETE from the app role); the chain makes
 * silent tampering by anything short of the platform role detectable.
 */
import { createHash } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { auditEvents } from "@zynoa/db/schema";
import type { Db } from "@zynoa/db";
import { uuidv7 } from "uuidv7";

export type ActorType = "user" | "agent" | "system" | "operator" | "end_customer" | "api_key";

export interface AuditHashInput {
  id: string;
  workspaceId: string | null;
  actorType: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  prevHash: string | null;
}

/**
 * Deterministic JSON: object keys sorted recursively. Postgres jsonb does NOT
 * preserve key order, so hashes must be insensitive to it or verification
 * breaks after a round-trip.
 */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/**
 * Canonical form: JSON array of the identifying fields in fixed order, with
 * metadata pre-serialized (sorted keys) so its own JSON stays one opaque
 * element. JSON encoding makes the fields self-delimiting (no
 * separator-injection collisions).
 */
export function computeAuditHash(input: AuditHashInput): string {
  const canonical = JSON.stringify([
    input.prevHash,
    input.id,
    input.workspaceId,
    input.actorType,
    input.actorId,
    input.action,
    input.targetType,
    input.targetId,
    canonicalJson(input.metadata),
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

export interface AuditEventInput {
  workspaceId?: string | null | undefined;
  actorType: ActorType;
  actorId?: string | null | undefined;
  action: string;
  targetType?: string | null | undefined;
  targetId?: string | null | undefined;
  ip?: string | null | undefined;
  userAgent?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Append one event to its chain. `executor` is a Db or transaction handle; the
 * caller decides the transaction boundary. Chain tip = highest id in the same
 * chain (ids are UUIDv7, so lexicographic order is creation order). Callers
 * that append concurrently to one chain must serialize at a higher level —
 * fine for sign-up, where each new workspace starts its own chain.
 */
export async function appendAuditEvent(executor: Db, event: AuditEventInput): Promise<string> {
  const workspaceId = event.workspaceId ?? null;
  const chain = workspaceId
    ? eq(auditEvents.workspaceId, workspaceId)
    : isNull(auditEvents.workspaceId);
  const [tip] = await executor
    .select({ hash: auditEvents.hash })
    .from(auditEvents)
    .where(and(chain))
    .orderBy(desc(auditEvents.id))
    .limit(1);

  const id = uuidv7();
  const metadata = event.metadata ?? {};
  const row = {
    id,
    workspaceId,
    actorType: event.actorType,
    actorId: event.actorId ?? null,
    action: event.action,
    targetType: event.targetType ?? null,
    targetId: event.targetId ?? null,
    ip: event.ip ?? null,
    userAgent: event.userAgent ?? null,
    metadata,
    prevHash: tip?.hash ?? null,
    hash: "",
  };
  row.hash = computeAuditHash({
    id,
    workspaceId,
    actorType: row.actorType,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    metadata,
    prevHash: row.prevHash,
  });
  await executor.insert(auditEvents).values(row);
  return id;
}
