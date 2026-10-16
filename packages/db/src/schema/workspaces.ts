/** Workspaces & access (docs/spec/04_DATA_MODEL.md §2, roles per spec 05 §4). */
import { sql } from "drizzle-orm";
import { boolean, check, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { baseColumns, citext } from "./columns.js";
import { users } from "./identity.js";

export const workspaces = pgTable(
  "workspaces",
  {
    ...baseColumns,
    type: text("type").notNull(), // 'personal' | 'organization'
    name: text("name").notNull(),
    slug: citext("slug").notNull().unique(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id),
    billingPlanId: uuid("billing_plan_id"), // FK arrives with billing_plans (E1.7)
    settings: jsonb("settings").notNull().default({}), // WorkspaceSettingsSchema
    status: text("status").notNull().default("active"),
    personalForUserId: uuid("personal_for_user_id")
      .unique()
      .references(() => users.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // ♻ soft delete
  },
  (table) => [
    check("workspaces_type_check", sql`${table.type} in ('personal','organization')`),
    check(
      "workspaces_status_check",
      sql`${table.status} in ('active','suspended','read_only','deleted')`,
    ),
    check(
      "workspaces_personal_check",
      sql`(${table.type} = 'personal') = (${table.personalForUserId} is not null)`,
    ),
  ],
);

/** 🔒 tenant table (RLS via enable_tenant_rls in migration 0002). */
export const memberships = pgTable(
  "memberships",
  {
    ...baseColumns,
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    roleKey: text("role_key").notNull(), // spec 05 §4.1
    status: text("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("memberships_workspace_user").on(table.workspaceId, table.userId),
    check("memberships_status_check", sql`${table.status} in ('active','deactivated')`),
  ],
);

/** 🔒 tenant table; built-in roles seeded per workspace at provisioning. */
export const roles = pgTable(
  "roles",
  {
    ...baseColumns,
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    isBuiltin: boolean("is_builtin").notNull(),
    permissions: text("permissions").array().notNull(),
  },
  (table) => [unique("roles_workspace_key").on(table.workspaceId, table.key)],
);
