/**
 * US-101 sign-up end-to-end against real Postgres (AC1/AC2/AC3). Needs
 * DATABASE_URL (app role) and DATABASE_PLATFORM_URL (BYPASSRLS) — locally from
 * infra/docker, in CI from the db-integration job. Skipped without them,
 * never silently passed.
 */
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, runMigrations, type DbHandle } from "@zynoa/db";
import {
  auditEvents,
  creditAccounts,
  memberships,
  roles,
  sessions,
  users,
  workspaces,
} from "@zynoa/db/schema";
import { computeAuditHash } from "../../src/audit.js";
import { createAuth, type Auth } from "../../src/auth.js";

const appUrl = process.env.DATABASE_URL;
const platformUrl = process.env.DATABASE_PLATFORM_URL;

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PASSWORD = "a long enough password";

/** Narrow away undefined/null with a failure that names the missing thing. */
function must<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) throw new Error(`expected ${what} to exist`);
  return value;
}

describe.skipIf(!appUrl || !platformUrl)("US-101 sign-up (real Postgres)", () => {
  let app: DbHandle;
  let platform: DbHandle;
  let auth: Auth;

  async function wipeUser(email: string) {
    const rows = await platform.db.select().from(users).where(eq(users.email, email));
    for (const row of rows) {
      await platform.db.delete(workspaces).where(eq(workspaces.personalForUserId, row.id));
      await platform.db.delete(users).where(eq(users.id, row.id));
    }
  }

  beforeAll(async () => {
    platform = createDb(platformUrl as string, { max: 2 });
    app = createDb(appUrl as string, { max: 2 });
    await runMigrations(platformUrl as string);
    auth = createAuth({
      db: app.db,
      provisioningDb: platform.db,
      secret: "integration-test-secret-integration!",
      baseURL: "http://localhost:4000",
      appEnv: "ci",
    });
    await wipeUser("signup-ac1@example.com");
    await wipeUser("signup-dup@example.com");
    await wipeUser("signup-comp@example.com");
  });

  afterAll(async () => {
    await app?.close();
    await platform?.close();
  });

  it("AC1+AC3: creates user, personal workspace, owner membership, credit accounts and audit events", async () => {
    const result = await auth.api.signUpEmail({
      body: { name: "Signup Tester", email: "signup-ac1@example.com", password: PASSWORD },
    });
    expect(result.user.id).toMatch(UUID_V7);

    const user = must(
      (await platform.db.select().from(users).where(eq(users.email, "signup-ac1@example.com")))[0],
      "user row",
    );
    expect(user.name).toBe("Signup Tester");

    const workspace = must(
      (
        await platform.db.select().from(workspaces).where(eq(workspaces.personalForUserId, user.id))
      )[0],
      "personal workspace",
    );
    expect(workspace).toMatchObject({
      type: "personal",
      name: "Signup Tester's Workspace",
      ownerUserId: user.id,
      status: "active",
    });
    expect(workspace.id).toMatch(UUID_V7);
    expect(workspace.slug).toMatch(/^signup-ac1-[a-z0-9]{6}$/);

    const memberRows = await platform.db
      .select()
      .from(memberships)
      .where(eq(memberships.workspaceId, workspace.id));
    expect(memberRows).toHaveLength(1);
    expect(memberRows[0]).toMatchObject({ userId: user.id, roleKey: "owner", status: "active" });

    const roleRows = await platform.db
      .select()
      .from(roles)
      .where(eq(roles.workspaceId, workspace.id));
    expect(roleRows.map((r) => r.key).sort()).toEqual([
      "admin",
      "billing_admin",
      "guest",
      "member",
      "owner",
    ]);
    expect(roleRows.every((r) => r.isBuiltin)).toBe(true);

    const credits = await platform.db
      .select()
      .from(creditAccounts)
      .where(eq(creditAccounts.workspaceId, workspace.id));
    expect(credits.map((c) => c.kind).sort()).toEqual(["grant", "promo", "purchased"]);
    expect(credits.every((c) => c.balance === 0n && c.reserved === 0n)).toBe(true);

    // AC3: audit events on the right chains, with verifiable hashes.
    const signedUp = must(
      (
        await platform.db
          .select()
          .from(auditEvents)
          .where(and(eq(auditEvents.action, "user.signed_up"), eq(auditEvents.actorId, user.id)))
      )[0],
      "user.signed_up audit event",
    );
    expect(signedUp.workspaceId).toBeNull();
    const created = must(
      (
        await platform.db
          .select()
          .from(auditEvents)
          .where(
            and(
              eq(auditEvents.action, "workspace.created"),
              eq(auditEvents.workspaceId, workspace.id),
            ),
          )
      )[0],
      "workspace.created audit event",
    );
    expect(created.targetId).toBe(workspace.id);
    for (const event of [signedUp, created]) {
      expect(event.hash).toBe(
        computeAuditHash({
          id: event.id,
          workspaceId: event.workspaceId,
          actorType: event.actorType,
          actorId: event.actorId,
          action: event.action,
          targetType: event.targetType,
          targetId: event.targetId,
          metadata: event.metadata as Record<string, unknown>,
          prevHash: event.prevHash,
        }),
      );
    }
    // workspace.created starts this workspace's chain.
    expect(created.prevHash).toBeNull();

    // autoSignIn: a session exists for the new user.
    const sessionRows = await platform.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user.id));
    expect(sessionRows.length).toBeGreaterThanOrEqual(1);
  });

  it("AC2: duplicate email is rejected and provisions nothing extra", async () => {
    await auth.api.signUpEmail({
      body: { name: "First", email: "signup-dup@example.com", password: PASSWORD },
    });
    await expect(
      auth.api.signUpEmail({
        body: { name: "Second", email: "signup-dup@example.com", password: PASSWORD },
      }),
    ).rejects.toMatchObject({ statusCode: 422 });

    const userRows = await platform.db
      .select()
      .from(users)
      .where(eq(users.email, "signup-dup@example.com"));
    expect(userRows).toHaveLength(1);
    const wsRows = await platform.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.personalForUserId, must(userRows[0], "duplicate-test user").id));
    expect(wsRows).toHaveLength(1);
  });

  it("duplicate email check is case-insensitive (citext)", async () => {
    await expect(
      auth.api.signUpEmail({
        body: { name: "Shouty", email: "SIGNUP-DUP@EXAMPLE.COM", password: PASSWORD },
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("compensates: provisioning failure removes the orphaned user and fails sign-up", async () => {
    // App role cannot write RLS-fenced tenant tables without workspace context,
    // so provisioning on it must fail — exercising the compensation path.
    const broken = createAuth({
      db: app.db,
      provisioningDb: app.db,
      secret: "integration-test-secret-integration!",
      baseURL: "http://localhost:4000",
      appEnv: "ci",
    });
    await expect(
      broken.api.signUpEmail({
        body: { name: "Compensated", email: "signup-comp@example.com", password: PASSWORD },
      }),
    ).rejects.toMatchObject({ statusCode: 500 });

    const leftoverUsers = await platform.db
      .select()
      .from(users)
      .where(eq(users.email, "signup-comp@example.com"));
    expect(leftoverUsers).toHaveLength(0);
    const orphanWs = await platform.db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.type, "personal"), isNull(workspaces.personalForUserId)));
    expect(orphanWs).toHaveLength(0);
  });
});
