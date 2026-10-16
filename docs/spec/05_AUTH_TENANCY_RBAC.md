# 05 — Authentication, Tenancy and Access Control

## 1. Requirements summary

| ID | Requirement | Phase |
|---|---|---|
| AUTH-001 | Sign up with email + password; email verification required before inviting others, connecting integrations or spending > free credits | P1 |
| AUTH-002 | Sign in with Google OAuth; link/unlink providers from profile | P1 |
| AUTH-003 | Password reset via single-use emailed link (expires 30 min) | P1 |
| AUTH-004 | TOTP MFA with backup codes; passkeys optional | P1 |
| AUTH-005 | Session management: list devices, revoke one/all; session idle timeout 7 days, absolute 30 days; re-auth for sensitive actions (≤ 10 min old) | P1 |
| AUTH-006 | Brute-force protection: 5 failed logins per account per 15 min → progressive delay + CAPTCHA; per-IP limits | P1 |
| AUTH-007 | Account data export (ZIP of user's personal workspace data) and account deletion with 14-day grace | P1 |
| AUTH-008 | Organisation-enforced MFA and session policy | P7 |
| AUTH-009 | SAML/OIDC SSO and SCIM provisioning (Enterprise) | P8 |
| AUTH-010 | Personal API keys / workspace API keys with scopes | P7 |
| WS-001 | Every new user gets exactly one personal workspace automatically | P1 |
| WS-002 | Users can create organization workspaces (verified email required) | P1 |
| WS-003 | Workspace switcher; last active workspace remembered | P1 |
| WS-004 | Personal workspace has exactly one human member, enforced in API and DB | P1 |
| WS-005 | Invite by email with role, optional teams and projects; invitation expires in 7 days; resend/revoke | P1 |
| WS-006 | Seat limits from plan; invitations blocked at seat limit with upgrade prompt | P1 |
| WS-007 | Teams: create, rename, delete, add/remove members, team lead | P1 |
| WS-008 | Project membership by user or team with project role | P1 |
| WS-009 | Ownership transfer (owner → another admin), with re-auth and email confirmation to both | P1 |
| WS-010 | Remove/deactivate member: revoke sessions in workspace, reassign or unassign their tasks, keep authored content | P1 |
| WS-011 | Move a project from personal workspace to an organization (journey J-05) | P2 |
| WS-012 | Custom roles (Enterprise) | P7 |
| WS-013 | Guest role: external collaborator limited to specific projects, no Library/workspace visibility | P2 |

## 2. Authentication implementation

- **Library:** Better Auth mounted in `apps/api` at `/api/auth/*`, with: email/password, Google OAuth, the two-factor plugin (TOTP + backup codes) and the passkey plugin. **The organization plugin is not used**: workspaces, memberships, roles and invitations live only in our own tables (file 04 §2). IDs via `advanced.database.generateId` → UUIDv7. Table/field mapping in file 04 §1.
- **Session cookie:** `__Secure-vsn_session` (ADR-025: Better Auth 1.7 prepends `__Secure-` itself and cannot emit a correct `__Host-` name; no `Domain` attribute is ever set), `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, rotated on privilege change (login, MFA verify, role change). Plain-http local/CI use `vsn_session` without `Secure`.
- **CSRF:** SameSite cookie + double-submit token for state-changing requests from the web app; API keys (Phase 7) are header-based and CSRF-exempt.
- **Password policy:** min 10 chars, checked against a breached-password k-anonymity API (e.g., HIBP range API) [VERIFY usage terms]; Argon2id hashing via custom `password.hash`/`password.verify` functions (Better Auth's default is scrypt).
- **Email sending** for auth uses `EmailProvider`; in local/CI all mail goes to Mailpit/capture.
- **Re-authentication** required (password or MFA within last 10 min) for: changing email/password, enabling/disabling MFA, transferring ownership, deleting workspace/account, creating API keys, viewing/rotating secrets, approving production deploys.

## 3. Workspace types and rules

| Rule | Personal workspace | Organization workspace |
|---|---|---|
| Created | Automatically at sign-up (`name = "<User name>'s Workspace"`, slug from email local-part + random suffix) | Explicitly by a verified user |
| Humans | Exactly 1 (owner) | 1..seat limit |
| Invitations, teams | ❌ API returns `409 PERSONAL_WORKSPACE_SINGLE_HUMAN` | ✅ |
| AI agents | ✅ unlimited (budget-bound) | ✅ |
| Guest share links (view/comment on a preview or asset) | ✅ (not membership; see 06 §9) | ✅ |
| Library scopes | personal, project | personal (private to user), workspace, project |
| Billing | Owner's plan | Org plan + seats |
| Can be deleted | Only with the account | By owner, after re-auth, with 14-day grace |
| Max per user | 1 | Owner of ≤ 5 orgs (configurable), member of any number |

**Upgrade path (J-05):** a personal user who wants collaborators creates an organization and **moves** selected projects into it (WS-011). The personal workspace never becomes multi-human.

### 3.1 Moving a project into an organization (WS-011)
1. User must be `owner` of source personal workspace and have `project.create` in target org.
2. Pre-flight report shows: tasks, assets, runs, connections, secrets, budget, linked Library items.
3. Execution (Temporal workflow `MoveProjectWorkflow`, platform DB role, single transaction per table group):
   - Update `workspace_id` on the project and all project-scoped rows.
   - Library items **linked** to the project but scoped `personal` are **copied** (new asset + versions) into the org project scope; originals stay personal.
   - **Connections are not moved.** Project loses grants to personal connections; user is prompted to connect org-level connections.
   - **Secrets are re-encrypted** with the org's data key.
   - Running agent runs are paused before move, resumed after.
   - Credits already spent stay in personal ledger; budgets reset under org.
4. Audit events in both workspaces; notification to the user.

## 4. Roles

### 4.1 Workspace roles (built-in)
| Role key | Who | Summary |
|---|---|---|
| `owner` | Exactly one per workspace | Everything, including delete workspace, transfer ownership, billing |
| `admin` | Org managers | Everything except delete workspace / transfer ownership |
| `billing_admin` | Finance | Billing, invoices, usage, budgets; read-only elsewhere (no project content) |
| `member` | Normal staff | Create projects, work in projects they belong to, use workspace Library |
| `guest` | External collaborator | Only projects explicitly granted; no workspace Library, no member list beyond project |

### 4.2 Project roles
| Role | Summary |
|---|---|
| `project_admin` | Manage project settings, members, budgets, environments, secrets, approve releases |
| `editor` | Create/edit tasks, run agents, generate assets, comment |
| `reviewer` | View everything, comment, decide review approvals (not production) |
| `viewer` | Read-only + comment |

Workspace `owner`/`admin` are implicitly `project_admin` on every project (visible as "Workspace admin" in member lists). Project creator becomes `project_admin`.

### 4.3 System roles (inside an installed System, Phase 6)
`system_manager` (configure System, manage staff, all records), `system_staff` (operate records, own calendar, assigned bookings), `system_viewer` (read reports). Assigned to workspace members via `system_roles`.

### 4.4 Platform (operator) roles
`operator_support`, `operator_moderator`, `operator_admin` — stored in the `operator_roles` table (file 04 §14); `users.is_operator` is a fast flag only. Operator tooling runs through `OpsService` on the `vsn_platform` DB role (file 04 §15). **Operators have no tenant data access by default**; access requires a time-boxed `operator_access_grants` row (break-glass) with reason and ticket, approved by a second operator for content access, and every query is audited.

## 5. Permission catalogue and matrix

Permissions are strings `resource.action`. The full list lives in `packages/authz/permissions.ts`.

| Permission | owner | admin | billing_admin | member | guest |
|---|:-:|:-:|:-:|:-:|:-:|
| `workspace.read` | ✅ | ✅ | ✅ | ✅ | ⚪ limited |
| `workspace.update` (name, settings) | ✅ | ✅ | ❌ | ❌ | ❌ |
| `workspace.delete`, `workspace.transfer` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `member.invite`, `member.remove`, `member.role.change` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `team.manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `billing.read` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `usage.read.own` (own usage only) | ✅ | ✅ | ✅ | ✅ | ❌ |
| `billing.manage` (plan, payment, credits purchase) | ✅ | ❌ | ✅ | ❌ | ❌ |
| `budget.manage` (workspace budgets) | ✅ | ✅ | ✅ | ❌ | ❌ |
| `policy.manage` (approval policies, routing, data policy) | ✅ | ✅ | ❌ | ❌ | ❌ |
| `audit.read` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `project.create` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `library.workspace.read` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `library.workspace.write` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `connection.create` (workspace-shared) | ✅ | ✅ | ❌ | ❌ | ❌ |
| `connection.create` (personal-owned) | ✅ | ✅ | ❌ | ✅ | ❌ |
| `package.install` (workspace scope) | ✅ | ✅ | ❌ | ❌ | ❌ |
| `system.install` | ✅ | ✅ | ❌ | ✅* | ❌ |
| `apikey.manage` | ✅ | ✅ | ❌ | ❌ | ❌ |

\* `member` can install Systems only if workspace setting `members_can_install_systems = true` (default true in Team plan, false in Enterprise).

**Project-scoped permissions**

| Permission | project_admin | editor | reviewer | viewer |
|---|:-:|:-:|:-:|:-:|
| `project.read`, `task.read`, `asset.read`, `run.read` | ✅ | ✅ | ✅ | ✅ |
| `comment.create` | ✅ | ✅ | ✅ | ✅ |
| `project.update` (settings, services, autonomy) | ✅ | ❌ | ❌ | ❌ |
| `project.member.manage` | ✅ | ❌ | ❌ | ❌ |
| `project.delete`, `project.archive` | ✅ | ❌ | ❌ | ❌ |
| `plan.generate`, `plan.edit` | ✅ | ✅ | ❌ | ❌ |
| `plan.approve` | ✅ | ❌ | ❌ | ❌ |
| `task.create`, `task.update`, `task.move` | ✅ | ✅ | ❌ | ❌ |
| `task.delete` | ✅ | ✅ (own) | ❌ | ❌ |
| `agent.run` (start/stop agent on a task) | ✅ | ✅ | ❌ | ❌ |
| `supervisor.control` (start/pause supervisor, autonomy) | ✅ | ❌ | ❌ | ❌ |
| `asset.write` (upload, generate, new version) | ✅ | ✅ | ❌ | ❌ |
| `asset.approve` | ✅ | ❌ | ✅ | ❌ |
| `approval.decide` (non-production) | ✅ | ❌ | ✅ | ❌ |
| `approval.decide.production` | ✅ | ❌ | ❌ | ❌ |
| `secret.manage` | ✅ | ❌ | ❌ | ❌ |
| `environment.manage`, `release.staging` | ✅ | ✅ (staging only) | ❌ | ❌ |
| `release.production` | ✅ | ❌ | ❌ | ❌ |
| `share_link.create` | ✅ | ✅ | ❌ | ❌ |
| `connection.grant` (grant a connection to this project) | ✅ | ❌ | ❌ | ❌ |
| `budget.manage` (project budget) | ✅ | ❌ | ❌ | ❌ |

Workspace approval policies (file 07 §8) can further restrict who may decide specific approvals (e.g., production deploy requires `owner`).

## 6. Enforcement design

### 6.1 `authorize()`

```ts
type Actor =
  | { type: 'user'; userId: string; workspaceId: string; workspaceRole: WorkspaceRole }
  | { type: 'agent'; runId: string; agentKey: string; workspaceId: string; projectId: string; onBehalfOfUserId: string }
  | { type: 'system'; workspaceId: string; reason: string }
  | { type: 'end_customer'; workspaceId: string; systemInstanceId: string; tokenScope: string[] }
  | { type: 'operator'; userId: string; grantId: string; workspaceId: string; scope: string[] };

function authorize(actor: Actor, permission: Permission, resource: ResourceRef): Promise<void>; // throws ForbiddenError
```

Algorithm:
1. `resource.workspaceId` must equal `actor.workspaceId` → else `404` (never reveal existence across tenants).
2. Resolve **workspace role** permissions.
3. If the permission is project-scoped: resolve **effective project role** = max(direct user grant, team grants, implicit admin). No project role → `404` for read, `403` for write on visible resources.
4. **Agent actors** get the intersection of: (a) permissions of the user on whose behalf the run started, (b) the agent definition's allowed tools mapped to permissions, (c) the project's autonomy and approval policies. Agents never hold `*.manage`, `member.*`, `billing.*`, `secret.manage`, `approval.decide*` permissions.
5. **End-customer actors** are limited to the public operations their token scope lists (e.g., `booking.create`, `booking.manage:<id>`, `invoice.view:<id>`).
6. **Operator actors** only with an active grant; every call audited with the grant ID.
7. Decision is cached per request (not across requests).

### 6.2 Tenant-scoped repositories

```ts
// packages/db/repository.ts
export abstract class TenantRepository<T> {
  constructor(protected readonly tx: Tx, protected readonly workspaceId: string) {
    if (!workspaceId) throw new Error('workspaceId required');
  }
  protected scoped() {                    // default: tenant + not deleted (deleted_at check only on ♻ tables)
    const tenant = eq(this.table.workspaceId, this.workspaceId);
    return this.softDelete ? and(tenant, isNull(this.table.deletedAt)) : tenant;
  }
  protected scopedIncludingDeleted() { return eq(this.table.workspaceId, this.workspaceId); } // restore & admin views only
  // every query method composes one of these; there is no method without the workspace filter
}

// Each request/activity runs inside:
await db.transaction(async (tx) => {
  await tx.execute(sql`select set_config('app.workspace_id', ${workspaceId}, true), set_config('app.user_id', ${userId}, true)`);
  // ... repositories created with (tx, workspaceId)
});
```

- A lint rule (`no-restricted-imports`) forbids importing Drizzle table objects for tenant tables outside `packages/db/repositories/*`.
- **Tenant-isolation test harness** (`packages/test-utils/isolation.ts`): for every repository and every API route, create resources in workspace A, then call as a user of workspace B → expect 404/empty; and attempt writes with A's IDs → expect 404. CI fails if a 🔒 table has no isolation test.

### 6.3 Project visibility in organizations
- `projects.visibility = 'members'` (default): only project members + workspace owner/admin see it.
- `projects.visibility = 'workspace'`: every `member` sees it as `viewer` unless granted higher.
- Guests never see workspace-visible projects unless explicitly added.

## 7. Invitation flow

1. Admin enters emails (max 50 per batch), workspace role, teams, and optional project grants (project + project role, e.g. `editor`, `viewer`) stored in `invitations.project_grants`.
2. Seat check (pending invitations count against seats).
3. Email with link `/{{APP_DOMAIN}}/invite/<token>` (token 32 bytes random, stored hashed).
4. Recipient: if signed in with a matching email → accept; if different email → explain mismatch, allow sign-in switch; if no account → sign up with email pre-filled (must verify same email).
5. On accept (token resolved via `resolve_invitation()`, file 04 §15): membership + team memberships + `project_members` rows (with the invited project roles) created in one transaction; audit `member.joined`; notify inviter.
6. Expired/revoked tokens show a friendly page with "ask for a new invitation".

## 8. Member removal and deactivation

- Remove: membership deleted; their sessions' `active_workspace_id` cleared; personal connections they owned and shared to projects are **disabled** with notification to project admins; tasks assigned to them become `unassigned` (or reassigned in the same dialog); content they authored remains with author shown as "Former member".
- Deactivate (keeps seat history): same as remove but reversible for 30 days; does not count against seats.
- The owner cannot be removed; must transfer ownership first.

## 9. Account deletion (AUTH-007)

1. User requests deletion → re-auth → list of blockers: organizations where they are the sole owner (must transfer or delete), active subscriptions (cancel).
2. 14-day grace: account `pending_deletion`, sign-in shows "Cancel deletion".
3. After grace: personal workspace hard-deleted (all data + objects), user removed from org memberships, authored content in orgs re-attributed to "Deleted user", auth records erased, audit records pseudonymised.
4. Confirmation email sent before erasure.
