/** Credit accounts (docs/spec/04_DATA_MODEL.md §11 subset; ledger arrives with E1.7). */
import { sql } from "drizzle-orm";
import { bigint, check, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { baseColumns } from "./columns.js";
import { workspaces } from "./workspaces.js";

/** 🔒 tenant table. Balances change only via ledger inserts (file 11 §4; E1.7). */
export const creditAccounts = pgTable(
  "credit_accounts",
  {
    ...baseColumns,
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // 'grant' | 'purchased' | 'promo'
    // drizzle-kit cannot serialize 0n defaults; sql`0` emits the same DDL.
    balance: bigint("balance", { mode: "bigint" })
      .notNull()
      .default(sql`0`), // micro-credits
    reserved: bigint("reserved", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
  },
  (table) => [
    unique("credit_accounts_workspace_kind").on(table.workspaceId, table.kind),
    check("credit_accounts_kind_check", sql`${table.kind} in ('grant','purchased','promo')`),
  ],
);
