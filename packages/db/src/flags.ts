/**
 * Database-backed feature-flag source (US-004 AC2 "DB value"). Plug it in front of the
 * file source: `createFlags([dbFlagSource(db), fileFlagSource(path)])`.
 * Reads run outside tenantTransaction on purpose: the read policy on feature_flags
 * already limits rows to global ones plus the given workspace.
 */
import { and, eq, isNull, or } from "drizzle-orm";
import type { FlagRow, FlagSource } from "@zynoa/config";
import type { Db } from "./client.js";
import { featureFlags } from "./schema/index.js";

export function dbFlagSource(db: Db): FlagSource {
  return {
    async rows(key, workspaceId): Promise<FlagRow[]> {
      const where =
        workspaceId === null
          ? and(eq(featureFlags.key, key), isNull(featureFlags.workspaceId))
          : and(
              eq(featureFlags.key, key),
              or(isNull(featureFlags.workspaceId), eq(featureFlags.workspaceId, workspaceId)),
            );
      const rows = await db.select().from(featureFlags).where(where);
      return rows.map((row) => ({
        key: row.key,
        workspaceId: row.workspaceId,
        enabled: row.enabled,
        rolloutPct: row.rolloutPct,
      }));
    },
  };
}
