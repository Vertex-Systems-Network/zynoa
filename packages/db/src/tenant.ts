/**
 * Tenant scoping (ENGINEERING-RULES rule 3): every read/write of tenant data goes through
 * a repository that requires a workspaceId. RLS (enable_tenant_rls) is the second line of
 * defence; this layer is the first.
 */
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "./client.js";

export const workspaceId = z.uuid();

export class MissingWorkspaceIdError extends Error {
  constructor(got: unknown) {
    super(
      `TenantRepository requires a workspaceId UUID; got ${got === undefined ? "undefined" : JSON.stringify(got)}.`,
    );
    this.name = "MissingWorkspaceIdError";
  }
}

export function assertWorkspaceId(value: unknown): string {
  const parsed = workspaceId.safeParse(value);
  if (!parsed.success) throw new MissingWorkspaceIdError(value);
  return parsed.data;
}

/** One transaction whose queries run under `app.workspace_id = workspaceId` (RLS scope). */
export async function tenantTransaction<T>(
  db: Db,
  id: string,
  fn: (tx: Parameters<Parameters<Db["transaction"]>[0]>[0]) => Promise<T>,
): Promise<T> {
  const ws = assertWorkspaceId(id);
  return db.transaction(async (tx) => {
    // set_config(..., true) is transaction-local: nothing leaks to the pooled connection.
    await tx.execute(sql`select set_config('app.workspace_id', ${ws}, true)`);
    return fn(tx);
  });
}

/**
 * Base class for every tenant repository. Constructing one without a valid workspaceId
 * throws, so a query path without a tenant cannot exist.
 */
export abstract class TenantRepository {
  readonly workspaceId: string;
  readonly #db: Db;

  constructor(db: Db, id: string) {
    this.#db = db;
    this.workspaceId = assertWorkspaceId(id);
  }

  /**
   * Run queries inside the tenant's RLS scope. The raw Db is deliberately unreachable
   * from subclasses: a query outside this scope would silently see zero rows.
   */
  protected tenant<T>(fn: Parameters<typeof tenantTransaction<T>>[2]): Promise<T> {
    return tenantTransaction(this.#db, this.workspaceId, fn);
  }
}
