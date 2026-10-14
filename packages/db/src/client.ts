/** Database clients. App code uses the RLS-bound app client; migrations/seed use the platform client. */
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

export type Db = NodePgDatabase<typeof schema>;

export interface DbHandle {
  db: Db;
  pool: Pool;
  close(): Promise<void>;
}

export function createDb(connectionString: string, options: { max?: number } = {}): DbHandle {
  const pool = new Pool({ connectionString, max: options.max ?? 10 });
  pool.on("error", () => {
    /* an idle client dropping must not crash the process; queries surface their own errors */
  });
  const db = drizzle(pool, { schema, casing: "snake_case" });
  return { db, pool, close: () => pool.end() };
}
