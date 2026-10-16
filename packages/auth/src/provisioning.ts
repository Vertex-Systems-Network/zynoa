/**
 * Sign-up provisioning (US-101 AC1, spec 05 §3): personal workspace, built-in
 * roles, owner membership, the three credit accounts and audit events, all in
 * one transaction. Runs on the PLATFORM db role (BYPASSRLS): it happens before
 * any session or workspace context exists, and the global audit chain (NULL
 * workspace) is platform-only under RLS.
 *
 * The free-plan credit grant named in AC1 needs billing_plans + ledger_entries
 * (E1.7, spec 04 §13 / 11 §4) — balances change only via ledger inserts, so the
 * grant lands there; the `grant` account is created here with balance 0.
 */
import { randomInt } from "node:crypto";
import { creditAccounts, memberships, roles, workspaces } from "@zynoa/db/schema";
import type { Db } from "@zynoa/db";
import { uuidv7 } from "uuidv7";
import { appendAuditEvent } from "./audit.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const SLUG_SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const SLUG_BASE_MAX = 40;

/** Slug = sanitized email local-part + "-" + 6 random base36 chars (spec 05 §3). */
export function workspaceSlugFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const base =
    localPart
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, SLUG_BASE_MAX)
      .replace(/-+$/, "") || "workspace";
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += SLUG_SUFFIX_ALPHABET[randomInt(36)];
  return `${base}-${suffix}`;
}

/**
 * Workspace-level permission matrix (spec 05 §5). The authoritative catalogue
 * moves to packages/authz when enforcement lands (E1.2); seeded per workspace
 * so orgs can later add custom roles beside the built-ins.
 */
export const BUILTIN_ROLES: ReadonlyArray<{
  key: string;
  name: string;
  permissions: readonly string[];
}> = [
  {
    key: "owner",
    name: "Owner",
    permissions: [
      "workspace.read",
      "workspace.update",
      "workspace.delete",
      "workspace.transfer",
      "member.invite",
      "member.remove",
      "member.role.change",
      "team.manage",
      "billing.read",
      "usage.read.own",
      "billing.manage",
      "budget.manage",
      "policy.manage",
      "audit.read",
      "project.create",
      "library.workspace.read",
      "library.workspace.write",
      "connection.create.workspace",
      "connection.create.personal",
      "package.install",
      "system.install",
      "apikey.manage",
    ],
  },
  {
    key: "admin",
    name: "Admin",
    permissions: [
      "workspace.read",
      "workspace.update",
      "member.invite",
      "member.remove",
      "member.role.change",
      "team.manage",
      "billing.read",
      "usage.read.own",
      "budget.manage",
      "policy.manage",
      "audit.read",
      "project.create",
      "library.workspace.read",
      "library.workspace.write",
      "connection.create.workspace",
      "connection.create.personal",
      "package.install",
      "system.install",
      "apikey.manage",
    ],
  },
  {
    key: "billing_admin",
    name: "Billing admin",
    permissions: [
      "workspace.read",
      "billing.read",
      "usage.read.own",
      "billing.manage",
      "budget.manage",
    ],
  },
  {
    key: "member",
    name: "Member",
    permissions: [
      "workspace.read",
      "usage.read.own",
      "project.create",
      "library.workspace.read",
      "library.workspace.write",
      "connection.create.personal",
      "system.install",
    ],
  },
  // "⚪ limited" in the matrix: scoped read only; refined with packages/authz.
  { key: "guest", name: "Guest", permissions: ["workspace.read.limited"] },
] as const;

const CREDIT_ACCOUNT_KINDS = ["grant", "purchased", "promo"] as const;
/** Postgres unique_violation — retried only for slug collisions. */
const UNIQUE_VIOLATION = "23505";
const SLUG_ATTEMPTS = 3;

export interface SignupProvisionInput {
  userId: string;
  userName: string;
  email: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface SignupProvisionResult {
  workspaceId: string;
  slug: string;
}

function isSlugCollision(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string; constraint?: string } }).cause;
  const code = cause?.code ?? (error as { code?: string }).code;
  const constraint = cause?.constraint ?? (error as { constraint?: string }).constraint;
  return code === UNIQUE_VIOLATION && (constraint ?? "").includes("slug");
}

async function provisionOnce(
  tx: Tx,
  input: SignupProvisionInput,
  slug: string,
  workspaceId: string,
): Promise<void> {
  await tx.insert(workspaces).values({
    id: workspaceId,
    type: "personal",
    name: `${input.userName}'s Workspace`,
    slug,
    ownerUserId: input.userId,
    personalForUserId: input.userId,
    settings: {},
    status: "active",
  });
  await tx.insert(roles).values(
    BUILTIN_ROLES.map((role) => ({
      id: uuidv7(),
      workspaceId,
      key: role.key,
      name: role.name,
      isBuiltin: true,
      permissions: [...role.permissions],
    })),
  );
  await tx.insert(memberships).values({
    id: uuidv7(),
    workspaceId,
    userId: input.userId,
    roleKey: "owner",
    status: "active",
  });
  await tx
    .insert(creditAccounts)
    .values(CREDIT_ACCOUNT_KINDS.map((kind) => ({ id: uuidv7(), workspaceId, kind })));
  // Tx handles share the Db query API; audit helpers take the executor as Db.
  const executor = tx as unknown as Db;
  await appendAuditEvent(executor, {
    workspaceId: null, // user-level event → global chain
    actorType: "user",
    actorId: input.userId,
    action: "user.signed_up",
    targetType: "user",
    targetId: input.userId,
    ip: input.ip,
    userAgent: input.userAgent,
  });
  await appendAuditEvent(executor, {
    workspaceId,
    actorType: "system",
    actorId: null,
    action: "workspace.created",
    targetType: "workspace",
    targetId: workspaceId,
    metadata: { type: "personal", slug },
  });
}

/** Create everything US-101 AC1 requires, atomically. `db` MUST be the platform client. */
export async function provisionSignup(
  db: Db,
  input: SignupProvisionInput,
): Promise<SignupProvisionResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
    const slug = workspaceSlugFromEmail(input.email);
    const workspaceId = uuidv7();
    try {
      await db.transaction((tx) => provisionOnce(tx, input, slug, workspaceId));
      return { workspaceId, slug };
    } catch (error) {
      if (!isSlugCollision(error)) throw error;
      lastError = error; // 1-in-36^6 per attempt; regenerate and retry
    }
  }
  throw lastError;
}
