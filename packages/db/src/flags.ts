/**
 * Database-backed feature-flag source (US-004 AC2 "DB value"). Plug it in front of the
 * file source: `createFlags([dbFlagSource(db), fileFlagSource(path)])`.
 *
 * Workspace reads run inside tenantTransaction: the feature_flags read policy only
 * exposes a workspace's rows when `app.workspace_id` is set, so a plain read would
 * silently return global rows alone and per-workspace overrides would never apply.
 */
import { and, eq, isNull, or } from "drizzle-orm";
import type { FlagRow, FlagSource } from "@zynoa/config";
import type { Db } from "./client.js";
import { featureFlags } from "./schema/index.js";
import { tenantTransaction } from "./tenant.js";

export function dbFlagSource(db: Db): FlagSource {
  return {
    async rows(key, workspaceId): Promise<FlagRow[]> {
      const rows =
        workspaceId === null
          ? await db
              .select()
              .from(featureFlags)
              .where(and(eq(featureFlags.key, key), isNull(featureFlags.workspaceId)))
          : await tenantTransaction(db, workspaceId, (tx) =>
              tx
                .select()
                .from(featureFlags)
                .where(
                  and(
                    eq(featureFlags.key, key),
                    or(isNull(featureFlags.workspaceId), eq(featureFlags.workspaceId, workspaceId)),
                  ),
                ),
            );
      return rows.map((row) => ({
        key: row.key,
        workspaceId: row.workspaceId,
        enabled: row.enabled,
        rolloutPct: row.rolloutPct,
      }));
    },
  };
}
