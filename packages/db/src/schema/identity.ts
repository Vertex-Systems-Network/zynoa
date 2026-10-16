/**
 * Identity tables (docs/spec/04_DATA_MODEL.md §1). Better Auth owns users,
 * auth_accounts, sessions and verifications — the names below are what its
 * schema config maps onto (packages/auth). Global tables: no workspace_id.
 */
import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { baseColumns, citext } from "./columns.js";

export const users = pgTable(
  "users",
  {
    ...baseColumns,
    email: citext("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    locale: text("locale").notNull().default("en"),
    timezone: text("timezone").notNull().default("Asia/Karachi"),
    status: text("status").notNull().default("active"),
    isOperator: boolean("is_operator").notNull().default(false),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "users_status_check",
      sql`${table.status} in ('active','suspended','pending_deletion','deleted')`,
    ),
  ],
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    ...baseColumns,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(), // 'credential' | 'google'
    accountId: text("account_id").notNull(),
    password: text("password"), // Argon2id hash (custom hash/verify in packages/auth)
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    // Not in spec 04 §1 (predates the pinned version): Better Auth 1.7.10's base
    // account model requires it and the adapter refuses to start without it.
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
  },
  (table) => [unique("auth_accounts_provider_account").on(table.providerId, table.accountId)],
);

export const sessions = pgTable("sessions", {
  ...baseColumns,
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  // additionalFields (spec 04 §1)
  activeWorkspaceId: uuid("active_workspace_id"),
  mfaVerifiedAt: timestamp("mfa_verified_at", { withTimezone: true }),
});

export const verifications = pgTable("verifications", {
  ...baseColumns,
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
