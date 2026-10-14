/**
 * Real-Postgres tenant-isolation suite (ENGINEERING-RULES rule 3; US-005 AC2).
 * Needs DATABASE_URL (app role, NOSUPERUSER) and DATABASE_PLATFORM_URL (BYPASSRLS) —
 * locally from infra/docker, in CI from the db-integration job's service container.
 * Without them the suite is skipped, never silently passed.
 */
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createDb,
  dbFlagSource,
  runMigrations,
  seed,
  tenantTransaction,
  type DbHandle,
} from "../../src/index.js";
import { featureFlags } from "../../src/schema/index.js";
import { createFlags } from "@zynoa/config";

const appUrl = process.env.DATABASE_URL;
const platformUrl = process.env.DATABASE_PLATFORM_URL;
const WS_A = "0192f3a4-0000-7000-8000-00000000000a";
const WS_B = "0192f3a4-0000-7000-8000-00000000000b";

describe.skipIf(!appUrl || !platformUrl)("tenant isolation (real Postgres)", () => {
  let app: DbHandle;
  let platform: DbHandle;

  beforeAll(async () => {
    platform = createDb(platformUrl as string, { max: 2 });
    app = createDb(appUrl as string, { max: 2 });
    await runMigrations(platformUrl as string);
    await seed(platformUrl as string);
    await platform.db.execute(sql`drop table if exists tenant_notes`);
    await platform.db.execute(
      sql`create table tenant_notes (workspace_id uuid not null, body text not null)`,
    );
    await platform.db.execute(sql`grant select, insert, update, delete on tenant_notes to zynoa`);
    await platform.db.execute(sql`select enable_tenant_rls('tenant_notes')`);
    await platform.db.execute(
      sql`insert into tenant_notes (workspace_id, body) values (${WS_A}, 'a1'), (${WS_A}, 'a2'), (${WS_B}, 'b1')`,
    );
  });

  afterAll(async () => {
    await platform?.db.execute(sql`drop table if exists tenant_notes`);
    await platform?.db.execute(sql`delete from feature_flags where key like 'itest.%'`);
    await app?.close();
    await platform?.close();
  });

  it("migrations and seed are idempotent", async () => {
    await runMigrations(platformUrl as string);
    await seed(platformUrl as string);
    const rows = await platform.db
      .select()
      .from(featureFlags)
      .where(sql`key = 'phase0.seeded'`);
    expect(rows).toHaveLength(1);
  });

  it("a tenant transaction sees only its own rows", async () => {
    const a = await tenantTransaction(app.db, WS_A, async (tx) =>
      tx.execute(sql`select body from tenant_notes order by body`),
    );
    expect(a.rows.map((r) => r.body)).toEqual(["a1", "a2"]);
    const b = await tenantTransaction(app.db, WS_B, async (tx) =>
      tx.execute(sql`select body from tenant_notes`),
    );
    expect(b.rows.map((r) => r.body)).toEqual(["b1"]);
  });

  it("the app role without a workspace setting sees nothing — including on a pooled connection that served a tenant transaction (NULLIF guard)", async () => {
    await tenantTransaction(app.db, WS_A, async (tx) => tx.execute(sql`select 1`));
    const rows = await app.db.execute(sql`select * from tenant_notes`);
    expect(rows.rows).toHaveLength(0);
  });

  it("writing another workspace's row is rejected by WITH CHECK", async () => {
    await expect(
      tenantTransaction(app.db, WS_A, async (tx) =>
        tx.execute(sql`insert into tenant_notes (workspace_id, body) values (${WS_B}, 'smuggled')`),
      ),
    ).rejects.toThrow(/row-level security|policy/i);
  });

  it("the platform role bypasses RLS (BYPASSRLS)", async () => {
    const rows = await platform.db.execute(sql`select * from tenant_notes`);
    expect(rows.rows).toHaveLength(3);
  });

  it("dbFlagSource serves global rows to everyone and workspace rows to their tenant", async () => {
    await platform.db.insert(featureFlags).values([
      { key: "itest.global", workspaceId: null, enabled: true, rolloutPct: null },
      { key: "itest.override", workspaceId: null, enabled: true, rolloutPct: null },
      { key: "itest.override", workspaceId: WS_A, enabled: false, rolloutPct: null },
    ]);
    const flags = createFlags([dbFlagSource(app.db)]);
    expect(await flags.isEnabled("itest.global", WS_B)).toBe(true);
    expect(await flags.isEnabled("itest.override", WS_A)).toBe(false); // workspace row wins
    expect(await flags.isEnabled("itest.override", WS_B)).toBe(true);
    expect(await flags.isEnabled("itest.missing", WS_A)).toBe(false); // default off
  });

  it("the app role cannot change feature_flags", async () => {
    await expect(
      app.db.insert(featureFlags).values({ key: "itest.rogue", workspaceId: null, enabled: true }),
    ).rejects.toThrow(/row-level security|policy|permission/i);
    // UPDATE/DELETE are revoked (0001); privilege errors, not silent 0-row matches.
    await expect(
      app.db.execute(sql`update feature_flags set enabled = false where key = 'phase0.seeded'`),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      app.db.execute(sql`delete from feature_flags where key = 'phase0.seeded'`),
    ).rejects.toThrow(/permission denied/i);
  });
});
