/** docs/spec/04_DATA_MODEL.md: feature_flags ( key, workspace_id, enabled, rollout_pct, unique nulls not distinct (key, workspace_id) ) */
import { boolean, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

export const featureFlags = pgTable(
  "feature_flags",
  {
    key: text("key").notNull(),
    workspaceId: uuid("workspace_id"),
    enabled: boolean("enabled").notNull(),
    rolloutPct: integer("rollout_pct"),
  },
  (table) => [
    unique("feature_flags_key_workspace").on(table.key, table.workspaceId).nullsNotDistinct(),
  ],
);
