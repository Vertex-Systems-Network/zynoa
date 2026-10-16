/**
 * Audit events (docs/spec/04_DATA_MODEL.md §13): hash chain per workspace plus
 * one global chain for user-level events (workspace_id NULL). workspace_id is a
 * plain uuid — NO foreign key — so workspace deletion never cascades here (§0).
 */
import { sql } from "drizzle-orm";
import { check, inet, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { baseColumns } from "./columns.js";

export const auditEvents = pgTable(
  "audit_events",
  {
    ...baseColumns,
    workspaceId: uuid("workspace_id"), // nullable, no FK (survives workspace deletion)
    actorType: text("actor_type").notNull(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(), // e.g. 'user.signed_up', 'workspace.created'
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    projectId: uuid("project_id"),
    ip: inet("ip"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").notNull().default({}),
    prevHash: text("prev_hash"),
    hash: text("hash").notNull(),
  },
  (table) => [
    check(
      "audit_events_actor_type_check",
      sql`${table.actorType} in ('user','agent','system','operator','end_customer','api_key')`,
    ),
  ],
);
