# 16 — Backlog: Epics, User Stories, Acceptance Criteria

**Format:** `US-<phase><nn>` · title · (requirement IDs) · size (S ≤ 2 days, M ≤ 5 days, L ≤ 10 days for one engineer with AI assistance).
Acceptance criteria (AC) are written as testable statements; each AC should map to at least one automated test. All stories also inherit the Definition of Done in `ENGINEERING-RULES.md §5`.

Phases 1–2 are fully detailed. Phases 3–8 are detailed enough to plan; the team (or AI agent) MUST expand them into full ACs in `/docs/plans/phase-N.md` before starting the phase.

---

## Phase 0 — Validation & Engineering Foundation

**Epic E0.1 Repository & tooling**
- **US-001 Monorepo scaffold** (—) · M
  - AC1: Layout matches `ENGINEERING-RULES.md §3`; `pnpm install && pnpm build` succeeds from clean clone.
  - AC2: Shared TS config strict; ESLint + Prettier configured; `pnpm lint` and `pnpm typecheck` run across workspaces via Turborepo with caching.
- **US-002 Local environment** · M
  - AC1: `docker compose up` starts Postgres 16 + pgvector, Redis/Valkey, Temporal dev server + UI, SeaweedFS (was MinIO — ADR-015), Mailpit; health checks pass.
  - AC2: `pnpm dev` starts web (3000), api (4000), worker; README documents ports and first-run steps.
- **US-003 CI pipeline** (SEC-013) · M
  - AC1: PR workflow runs lint, typecheck, unit, build, migration check, gitleaks, Semgrep, Trivy; any failure blocks merge.
  - AC2: Caching keeps a no-change PR run under 8 minutes.
- **US-004 Env schema & feature flags** · S
  - AC1: Missing required env var → process exits with a clear message naming the variable.
  - AC2: `isEnabled(flag, workspaceId)` returns DB/flag-file value; default off.
- **US-005 DB package & repository base** · M
  - AC1: Drizzle configured; migration runner; `TenantRepository` base that throws without workspaceId; lint rule blocks direct tenant-table imports outside repositories.
  - AC2: RLS helper migration function `enable_tenant_rls(table)` exists and is tested on a sample table.
- **US-006 API skeleton** · M
  - AC1: Fastify with request-id, OTel, error envelope (file 12 §3), Zod validation plugin, OpenAPI generation at `/api/v1/openapi.json`.
  - AC2: `/healthz` (process) and `/readyz` (DB + Redis + Temporal reachable) endpoints.
- **US-007 Web shell & design tokens** · M
  - AC1: Next.js app with Tailwind preset from `packages/ui` tokens, light/dark toggle, AppShell placeholder, marketing placeholder page.
  - AC2: Storybook with 15 base components (file 02 §3), each with a11y addon passing.
- **US-008 Worker skeleton** · S
  - AC1: Temporal worker registers `HelloWorkflow`; integration test runs it with the test environment.
- **US-009 Model gateway smoke** (AI-001) · S
  - AC1: Gateway interface + one real adapter + mock adapter; CLI `pnpm smoke:model` prints text, tokens, cost estimate.

**Epic E0.2 Validation (business track)** — tracked outside code: interviews, prototype, provider matrix, cost sheet, legal checklist, budget (file 02 §3).

---

## Phase 1 — Platform Core

### Epic E1.1 Accounts & sessions
- **US-101 Sign up with email** (AUTH-001, WS-001, SAFE-001) · M
  - AC1: Valid name/email/password + accepted terms → user created, verification email sent (captured in Mailpit locally), personal workspace + membership(owner) + the `grant`/`purchased`/`promo` credit accounts + free plan grant created in one transaction, redirect to GL-01.
  - AC2: Duplicate email → generic message without confirming existence; weak/breached password → inline error.
  - AC3: Audit events `user.signed_up`, `workspace.created`.
- **US-102 Email verification** (AUTH-001) · S
  - AC1: Link verifies once, expires in 24 h; resend limited to 3/hour.
  - AC2: Unverified users see a banner; org creation, invitations, connections and spending beyond free credits return `403` with `EMAIL_NOT_VERIFIED`.
- **US-103 Sign in / out** (AUTH-005, AUTH-006) · S
  - AC1: Correct credentials → session cookie with required flags; wrong → generic error; 5 failures/15 min → CAPTCHA + delay.
  - AC2: Sign out revokes server session.
- **US-104 Google OAuth** (AUTH-002) · S
  - AC1: New Google user → account + personal workspace; existing email (verified) → linked after password confirmation.
- **US-105 Password reset** (AUTH-003) · S
  - AC1: Request always returns the same message; link valid 30 min, single-use; all sessions revoked after reset.
- **US-106 TOTP MFA & backup codes** (AUTH-004, SEC-002) · M
  - AC1: Enable MFA requires re-auth and a valid TOTP; 10 backup codes shown once.
  - AC2: Sign-in with MFA requires second step; backup code single-use.
- **US-107 Sessions management** (AUTH-005) · S
  - AC1: ON-03 lists sessions (device, IP city if available, last active); revoke one / all others.
- **US-108 Profile & preferences** (ON-03) · S
  - AC1: Edit name, avatar (upload ≤ 2 MB, cropped), timezone, language (en only), default routing mode, theme, notification matrix (file 06 §10).
- **US-109 Account data export** (AUTH-007) · M
  - AC1: Request (re-auth) creates job; ZIP with JSON (profile, personal workspace projects/tasks/comments/chat) + files; download link emailed, valid 7 days.
- **US-110 Account deletion** (AUTH-007, PRIV-005) · M
  - AC1: Blockers listed (sole-owned orgs); with none, account enters `pending_deletion` 14 days; sign-in offers cancel.
  - AC2: After grace, erasure job removes personal workspace data and objects; org-authored content shows "Deleted user"; verified by integration test.

### Epic E1.2 Workspaces, members, teams
- **US-111 Workspace switcher** (WS-003, ON-04) · S
  - AC1: Lists personal + org workspaces with role; switching updates URL `/w/{slug}` and remembers last used.
- **US-112 Create organization** (WS-002, ON-05) · M
  - AC1: Verified user enters name; slug auto-generated & editable (unique); creator is owner; org gets trial/manual plan (P1) with credits; built-in roles seeded.
- **US-113 Personal single-human enforcement** (WS-004) · S
  - AC1: Any invitation/team/project-member API call on a personal workspace → `409 PERSONAL_WORKSPACE_SINGLE_HUMAN`; DB trigger rejects a second membership row (tested directly).
  - AC2: UI hides member management in personal workspaces and shows "Create an organization to collaborate".
- **US-114 Invite members** (WS-005, WS-006, AD-02) · M
  - AC1: Admin invites up to 50 emails with role/teams/projects; seat limit enforced including pending invites.
  - AC2: Email contains link; accept flow per file 05 §7 including email mismatch handling; expired/revoked token pages.
  - AC3: Resend and revoke work; audit events.
- **US-115 Members management** (WS-010, AD-02) · M
  - AC1: Change role (cannot demote/remove owner); remove member → sessions' active workspace cleared, tasks unassigned or reassigned via dialog; connections they own and shared are disabled (Phase 2+: git connections; Phase 5+: plugin connections).
- **US-116 Teams** (WS-007, AD-03) · S
  - AC1: CRUD teams, add/remove members, set lead; deleting a team removes its project grants (with confirmation listing affected projects).
- **US-117 Ownership transfer** (WS-009) · S
  - AC1: Owner selects an admin, re-auths; both receive email; roles swap atomically.
- **US-118 Organization overview** (AD-01) · S
  - AC1: Shows seats used/available, projects count, pending approvals (P2: placeholder), spend this period, last 10 audit events.
- **US-119 Audit log viewer** (SEC-012) · S
  - AC1: Owner/admin can filter by actor/action/date and export CSV; hash chain verification job reports integrity.

### Epic E1.3 Projects & wizard
- **US-120 Project list** (PRJ-004, GL-02) · S
  - AC1: Cards/list toggle; filters status/service/owner/team; search by name/key; only visible projects listed (membership rules).
- **US-121 New Project wizard — goal, workspace, services** (PRJ-001, PRJ-003, ON-06) · L
  - AC1: Step 1 creates a draft project; every step autosaves `wizard_state`; leaving and returning resumes at the same step.
  - AC2: AI pre-selects services from goal (purpose `classify`); user can change; services whose studio is not released stay selectable with a "Studio coming soon" note, and their planned tasks get `suggested_owner=user`.
  - AC3: Project key auto-generated from name (2–5 uppercase letters, unique per workspace, editable).
- **US-122 Wizard — starter & preferences** (PRJ-002, PRJ-006) · M
  - AC1: Starter options Blank / AI plan (Template, Import hidden by flags); autonomy, routing mode and budget defaults shown with explanations.
  - AC2: Blank → project active with milestone "Getting started" and empty backlog.
- **US-123 Discovery questions** (PRJ-007) · M
  - AC1: ≤ 7 questions generated; each skippable; "Skip all" proceeds; answers stored in wizard_state and passed to plan generation.
- **US-124 Plan generation** (PRJ-008) · L
  - AC1: Estimate shown before start; credits reserved; progress streamed (`plan.progress`); result stored as plan v1 `proposed`.
  - AC2: Deterministic validator enforces rules in file 06 §3 step 3; one repair attempt; failures surfaced as warnings.
  - AC3: Generation runs as a `job_runs` row + Temporal workflow; it is idempotent per (project, plan version request) and resumes after worker restart (test).
- **US-125 Plan review & approval** (PRJ-009, ON-08) · L
  - AC1: Tabs for requirements/milestones/tasks; inline edit, add, delete, reorder; regenerate a section with instruction.
  - AC2: Approve requires `plan.approve`; materialises tasks with numbers; project → active; plan → approved; notification to members.
  - AC3: Reject with comment keeps project in `planning`.
- **US-126 Re-plan with diff** (PRJ-009) · M
  - AC1: "Update plan" with instruction produces v2; diff view shows added/removed/changed; running/done tasks are never deleted; approval applies changes.
- **US-127 Project overview** (PRJ-005, PR-01) · M
  - AC1: Shows goal, services, milestone progress computed from evidence (file 06 §6), blockers (blocked/failed tasks), next ready tasks, budget meter, recent activity.
- **US-128 Project settings** (PRJ-006, PR-14, WS-008) · M
  - AC1: Edit general fields, services (disable hides tabs; data kept), autonomy, routing, budget, visibility (org), members (users/teams with project roles); archive/delete with typed confirmation.

### Epic E1.4 Tasks & collaboration
- **US-129 Backlog list** (TSK-001, PR-04) · M
  - AC1: Tree (epic → story → task) and grouped views; filters; bulk set status/owner/milestone/priority with permission checks; quick add inline.
- **US-130 Kanban board** (TSK-002, PR-05) · L
  - AC1: Columns per state; drag/drop calls transition API; invalid transitions snap back with reason toast; keyboard "Move to…" menu.
  - AC2: Live updates via SSE when another user moves a card; fractional ordering preserved.
- **US-131 Task detail** (TSK-003, PR-06) · L
  - AC1: Drawer and full page; edit title/description (Markdown with preview), criteria editor, checklist, owner (user/agent/unassigned), priority, milestone, dependencies (cycle detection → `409 DEPENDENCY_CYCLE`), linked assets, activity.
  - AC2: Concurrent description edit → `412` handled with merge dialog.
- **US-132 Task state machine** (TSK-004) · M
  - AC1: All transitions and guards in file 06 §5 enforced server-side with unit tests for every allowed and a sample of disallowed transitions.
  - AC2: Every transition writes `task_events` and emits `task.updated`.
- **US-133 Manual evidence & progress** (TSK-005, TSK-006) · M
  - AC1: User with `task.update` attaches human attestation (text + optional file) to a criterion; verifier marks criterion passed; progress recalculates for task/milestone/project.
  - AC2: Criteria requiring `human` verification cannot be satisfied by automated evidence alone (test).
- **US-134 Comments & mentions** (TSK-007) · M
  - AC1: Markdown comments (sanitised), threaded replies, edit/delete own, mentions autocomplete project members; mention creates notification + email per preference.
- **US-135 Discussions & decisions** (TSK-008, PR-08) · M
  - AC1: Create thread (thread/decision/question); "Record decision" stores summary and links; decisions listed on PR-02.
- **US-136 Notifications inbox** (TSK-010, GL-05) · M
  - AC1: Inbox tabs; unread count badge live; mark read/all; email delivery per preferences with hourly digest for non-urgent.
- **US-137 Workspace home** (GL-01) · M
  - AC1: Ask bar opens chat with scope; "My work" lists tasks assigned to me and approvals pending (P2); active projects; running jobs; recent assets; spend this month.

### Epic E1.5 AI core
- **US-138 Provider & model registry** (AI-002) · M
  - AC1: Seed loads providers/models from JSON; operator `/ops` page lists models with status and pricing; status changes take effect without deploy.
- **US-139 Gateway with 3 adapters** (AI-001, AI-004–007) · L
  - AC1: OpenAI, Anthropic, Google adapters [VERIFY current SDKs] implement generate/stream/embed with normalised usage.
  - AC2: Each call writes `model_calls` + `usage_events` and settles credits; idempotency key replay returns stored result.
  - AC3: Structured output validation + one repair; retryable errors fall back to next candidate; non-retryable errors surface correct codes.
- **US-140 Routing modes** (AI-003, AI-011) · M
  - AC1: Auto/Fast/Pro/Manual selection follows file 07 §3 with unit tests over a fixture registry; workspace data policy filters providers.
  - AC2: Routing decision logged in `model_calls.units.routing`.
- **US-141 Universal chat** (AI-008, GL-03) · L
  - AC1: Threads CRUD; scope selector; streaming answer via SSE with stop button; cost per message shown.
  - AC2: Attach images/documents; documents chunked temporarily for the message.
  - AC3: Proposed actions (create task(s), start plan) render as buttons and execute with the user's permissions only on click.
- **US-142 RAG with citations** (AI-009) · M
  - AC1: Hybrid retrieval (BM25 + vector, RRF) limited to permitted scopes; answers cite `[n]` chips linking to asset version/page.
  - AC2: Isolation test: content from another workspace or another user's personal scope never retrieved.
- **US-143 Prompt templates & versioning** (AI-010) · S
  - AC1: Prompts loaded by key/version from DB; changing active version requires an eval run record (stubbed in P1 with planning evals).
- **US-144 Job Center (P1 scope)** (GL-07) · M
  - AC1: Lists plan generation, chat, indexing jobs with status, duration, credits; live updates; retry failed plan generation.

### Epic E1.6 Library
- **US-145 Upload & storage** (LIB-001, LIB-011, LIB-010, SEC-005) · L
  - AC1: Presigned single/multipart uploads; quota checks; malware scan before availability; asset + version created.
- **US-146 Folders, tags, versions** (LIB-002, LIB-003) · M
  - AC1: CRUD folders/tags; new version on same-name upload (with choice); restore older version creates new version.
- **US-147 Previews** (LIB-004) · M
  - AC1: Image thumbnails, PDF first pages, text/Markdown/code viewer, audio/video players; served via signed URLs from user-content domain.
- **US-148 Extraction & indexing** (LIB-005) · M
  - AC1: Supported formats extracted to chunks with embeddings; status visible; re-index on new version.
- **US-149 Library search** (LIB-006) · M
  - AC1: Hybrid search with filters; permission-filtered; results show snippet highlights.
- **US-150 Brand kit & prompts** (LIB-008, LIB-009) · M
  - AC1: Brand kit editor (logos, colours with token names, fonts, voice, do/don't); one default per workspace; saved prompts usable in chat via `/` menu.
- **US-151 Project assets view** (PR-10, LIB-007) · S
  - AC1: Project-scoped list; link existing Library assets; approve/reject asset versions (`asset.approve`).

### Epic E1.7 Billing (internal) & limits
- **US-152 Plans, credit accounts, ledger** (BIL-001, BIL-002, BIL-003) · L
  - AC1: Billing plans seeded; `grant`/`purchased`/`promo` accounts per workspace; ledger append-only with idempotency; property-based tests ensure `balance = Σ amount` over non-reservation entries and `reserved = −Σ amount` over reservation/reservation_release entries (file 11 §4).
  - AC2: Monthly grant job grants on period start and expires unused grant credits.
- **US-153 Reservation protocol** (BIL-004, BIL-008) · M
  - AC1: Reserve/settle/release per file 11 §5; sweeper releases expired reservations; concurrent reservations cannot overspend (test with 50 parallel).
- **US-154 Budgets** (BIL-005) · M
  - AC1: Workspace/project/user budgets; 80% notification once per period; 100% hard stop returns `402 BUDGET_EXCEEDED` with UI callout.
- **US-155 Usage page** (BIL-006, AD-06) · M
  - AC1: Charts by day; breakdown tables by project/studio/model/user; members see only their own usage; CSV export.
- **US-156 Plan limits enforcement** (BIL-001, BIL-014) · S
  - AC1: `PlanLimits.check` used for projects, storage, members/seats; returns `402 LIMIT_REACHED` with upgrade info.
- **US-157 Operator grants & minimal ops** (BIL-007) · S
  - AC1: Operator can search workspaces (metadata only), grant/adjust credits with reason (audited), view provider error rates.

### Epic E1.8 Public site & platform
- **US-158 Marketing pages** (PUB-01, 02, 05, 07, 08, NFR-014, NFR-017) · M
  - AC1: Pages render server-side with Lighthouse ≥ 90 performance/accessibility; pricing reads plans API; contact form with CAPTCHA emails sales inbox.
- **US-159 Security baseline** (SEC-003, SEC-004, SEC-011) · M
  - AC1: Headers and CSP verified by automated test; rate limits per endpoint class; sanitiser component is the only HTML injection point (lint rule).
- **US-160 Tenant-isolation harness** (SEC-001) · M
  - AC1: Harness auto-discovers 🔒 tables and routes; CI fails if any lacks a cross-tenant test.
- **US-161 Observability baseline** · S
  - AC1: Traces span web→api→db→temporal; Sentry captures errors with release tags; dashboards for API and model calls.
- **US-162 Privacy baseline** (PRIV-001, PRIV-002, PRIV-003, PRIV-004, PRIV-007, PRIV-008) · M
  - AC1: `/docs/privacy/data-inventory.md` lists every personal-data field with purpose, store and retention; sub-processor list rendered on PUB-07 from a config file.
  - AC2: Workspace data-policy setting restricts routing to providers flagged `trains_on_api_data=false` (and `zdr_available=true` if chosen); routing tests prove excluded providers are never called.
  - AC3: Model call bodies are not persisted by default (test inspects DB rows); logs and analytics contain no prompt/file content (log redaction test).

---

## Phase 2 — AI Supervisor + Coding Studio

### Epic E2.1 Agent runtime
- **US-201 Agent & tool registries** (AGT-001, AGT-003) · M
  - AC1: Seeded agent definitions and tool definitions per file 07 §5–6; tool input validated with JSON schema before execution.
- **US-202 AgentRunWorkflow** (AGT-002, AGT-005) · L
  - AC1: Run loop per file 07 §5.2 with signals pause/resume/cancel/userMessage; status transitions persisted; run events streamed.
  - AC2: Guards: max steps, max credits, wall time, loop detection, repeated failure — each covered by a test with the mock model.
  - AC3: Worker killed mid-run → resumes; no duplicate side effects (test with mock git provider counting calls).
- **US-203 Policy engine & approvals** (AGT-004, REL-003) · L
  - AC1: Action rules per file 07 §8.1 with workspace/project overrides (project cannot loosen); evaluation unit-tested.
  - AC2: `require_approval` creates request, notifies approvers, run waits; approve/reject/expire paths tested; "trust" applies only to allowed actions.
  - AC3: PR-11 lists approvals with details; decision requires correct permission (`approval.decide.production` for production).
- **US-204 Ask user** (AGT-005) · S
  - AC1: `ask_user` sets run `waiting_input`; question appears in task comments + inbox; reply resumes run with the answer in context.
- **US-205 Run console** (AGT-008, PR-09) · L
  - AC1: Runs list with filters; run detail shows step timeline (model/tool calls with summaries), cost, approvals, logs download; live updates; pause/resume/cancel/retry.
- **US-206 Evidence verifier (automated)** (AGT-007, TSK-005) · M
  - AC1: Verifier checks evidence freshness (latest commit/asset version) and status; moves task to done/needs_review/reopened; optional AI judge recorded as check_run.
- **US-207 Project supervisor** (AGT-006) · L
  - AC1: Tick logic per file 07 §9; respects autonomy modes, concurrency, budgets; proposals UI in supervised mode; stop condition summary posted.
  - AC2: Supervisor never starts tasks outside the approved plan (test with injected proposal).
- **US-208 Project memory** (AGT-011) · M
  - AC1: Memory items created from decisions/approved assumptions/"Remember this"; included in agent/chat context; editable by project admins.
- **US-209 Eval harness v1** (AGT-009) · L
  - AC1: Runner executes golden tasks in sandboxes with mock or live models; produces report (pass rate, credits, time); CI nightly; PR smoke subset blocks on regression.
  - AC2: 30 coding + 10 planning + 15 injection golden tasks committed.
- **US-210 Injection defences** (AGT-010) · M
  - AC1: Untrusted wrapping, taint flag forcing approval on high-risk tools after untrusted ingestion; red-team tasks show 0 policy violations.

### Epic E2.2 Sandbox & Git
- **US-211 SandboxProvider** (COD-006, SEC-008) · L
  - AC1: Implementation for chosen vendor + mock; create/exec/files/exposePort/destroy; limits and egress allow-list enforced (tests: blocked egress to non-allowed host and metadata IP).
- **US-212 GitHub App integration** (COD-001) · L
  - AC1: Install flow from ON-07; installation stored; repo list; clone into sandbox with installation token (short-lived); webhooks for PR/check events verified.
  - AC2: Callback rejects an `installation_id` not returned by `GET /user/installations` for the authorising user, and rejects invalid `state` (tests).
- **US-213 VSN-managed repositories** (COD-003) · M — **only if OD-09 = yes**
  - AC1: Create internal repo; agents push/pull; export to GitHub later.
- **US-214 Starter templates** (COD-002) · M
  - AC1: Four templates scaffold, install, build, test green in sandbox; each includes `vsn.json`.
- **US-215 Repo import & AI audit** (COD-004, COD-005) · L
  - AC1: Detect stack and commands; run install/build/test; health report asset; suggested backlog tasks (user accepts to add); repo map indexed.
- **US-216 Coding agent tools** (COD-007, COD-008) · L
  - AC1: fs/shell/test/git tools work in sandbox; branch naming and commit trailers enforced; patches applied atomically.
- **US-217 Pull requests** (COD-009, COD-014) · M
  - AC1: PR opened/updated idempotently with description template; reviewer agent posts inline comments; critical findings block verification.
- **US-218 Test evidence & scans** (COD-015, PR-12) · M
  - AC1: Test runs parsed (JUnit/Vitest/Jest/pytest formats) into `test_runs`; scan results (audit, gitleaks) as evidence; QA page shows suites, trends, failures.
- **US-219 Preview & screenshots** (COD-010) · M
  - AC1: Dev server exposed via authenticated relay URL; headless browser screenshots attached as evidence; preview iframe in ST-02 with device sizes.

### Epic E2.3 Coding Studio UI
- **US-220 Coding Studio (ST-01)** (COD-011, COD-013) · L
  - AC1: File tree (lazy), code viewer with syntax highlight, diff viewer for PR/branch, "Ask AI to change" on selection creates a task + run, terminal log viewer from run steps.
- **US-221 Preview & Test Console (ST-02)** (COD-012) · M
  - AC1: Preview iframe, device toggles, test suites with failing test details & stack traces, PR checks status.

### Epic E2.4 Delivery
- **US-222 Environments & secrets** (REL-001, PR-15, SEC-007) · M
  - AC1: Environments per project; secrets write-only with last4; injected into sandbox/deploy for that environment only; access audited.
- **US-223 Deploy targets** (REL-001, PLG-011, SEC-009) · L
  - AC1: DeployTarget adapter for chosen preview/staging host (OD-08) + mock; deploy, status, rollback; deployments page live.
- **US-224 Releases** (REL-002, PR-13) · M
  - AC1: Release record with AI-drafted notes (editable), included commit/assets, evidence summary; production release requires approval; rollback creates new deployment.
- **US-225 Share links (SH-01)** (REL-004) · M
  - AC1: Create/revoke links with permissions, expiry, optional password; guest page shows only target; guest comments with name/email; works in personal workspaces; view counts.
- **US-226 Timeline view (PR-07)** (TSK-009) · M
  - AC1: Gantt from estimates/dates and dependencies; critical path computed; drag to change dates.
- **US-227 Move project to organization** (WS-011) · L
  - AC1: Pre-flight report; MoveProjectWorkflow per file 05 §3.1; integration test verifies data moved, personal library items copied, secrets re-encrypted, connections not moved.
- **US-228 Guest role** (WS-013) · S
  - AC1: Guest sees only granted projects; no Library/members; cannot be added in personal workspaces.
- **US-229 Daily summary** (TSK-011) · S
  - AC1: Opt-in daily summary per project at 09:00 user timezone with progress delta, spend, blockers.
- **US-230 Chaos & load for P2** (NFR-006, NFR-007, NFR-010) · M
  - AC1: Chaos script kills workers/sandboxes during 20 concurrent runs; all resume or fail cleanly; zero duplicate PRs.

---

## Phase 3 — Design, Research & Images (expand before starting)

- **US-301** Design document & canvas (DES-001) · L — pan/zoom canvas of frames, flows grouping.
- **US-302** Frame rendering sandbox (DES-003, §4.2 of file 14) · L — isolated origin, CSP, render worker for thumbnails.
- **US-303** Generate frames from brief + brand kit (DES-002) · L — N variants; tokens applied.
- **US-304** Element picker & deterministic property edits via AST (DES-004, DES-005) · L.
- **US-305** Prompt edits on frame/element (DES-004) · M.
- **US-306** Tokens & responsive preview (DES-006, DES-007) · M.
- **US-307** Prototype mode & share (DES-008, ST-04) · M.
- **US-308** Frame comments, review status, versions/compare (DES-009, DES-010) · M.
- **US-309** Accessibility checks as evidence (DES-011) · S.
- **US-310** Handoff to coding + visual diff evidence (DES-012) · L.
- **US-311** Figma reference import & exports (DES-013, DES-014) · M.
- **US-312** Search provider & fetcher with SSRF protection (RES-003, SEC-006) · L.
- **US-313** Research run workflow (plan → search → fetch → extract → synthesise) (RES-001, RES-002, RES-004) · L.
- **US-314** Report editor with claims map & citation check (RES-005, RES-006, RES-007) · L.
- **US-315** Library documents as sources; exports; save to memory (RES-008, RES-009) · M.
- **US-316** Image adapters (2 providers) + generate UI (IMG-001, IMG-002) · L.
- **US-317** Image edit, variations, upscale, bg removal (IMG-003, IMG-004) · L.
- **US-318** Brand kit application & logo overlay (IMG-005) · M.
- **US-319** Gallery, compare, export presets, batch (IMG-006–008) · M.
- **US-320** Content safety v1 pipeline (SAFE-002–005, SAFE-007, IMG-009) · L.
- **US-321** Asset graph & impact suggestions (file 08 §8) · M.
- **US-322** Quick Create launcher & attach to project (GL-04, file 08 §9) · M.
- **US-323** Global search (GL-06) · M.
- **US-324** Golden evals for designer/researcher agents · M.

## Phase 4 — Audio & Video

- **US-401** Media worker (Python) with FFmpeg activities & tests · L.
- **US-402** TTS adapters, voice library, long-form stitching (AUD-001, AUD-002, AUD-008) · L.
- **US-403** Transcription with diarisation & subtitle export (AUD-003) · M.
- **US-404** Dubbing pipeline (AUD-004) · L.
- **US-405** Cleanup & loudness normalisation (AUD-005) · S.
- **US-406** Voice consent capture & verification; cloned voices (AUD-006, SAFE-006) · L.
- **US-407** Waveform editor (AUD-007, ST-10) · L.
- **US-408** Video brief → script → storyboard (VID-001, VID-002, ST-07) · L.
- **US-409** Shot generation adapters & stock upload (VID-003) · L.
- **US-410** Captions & voiceover integration (VID-004) · M.
- **US-411** Assembly & export presets (VID-005, VID-007) · L.
- **US-412** Timeline editor (VID-006, ST-08) · L.
- **US-413** Cost estimates & approvals for media (VID-008) · M.
- **US-414** Provenance & AI labels (VID-009, SAFE-007) · M.
- **US-415** J-03 campaign E2E & evals · M.

## Phase 5 — Ecosystem & Marketplace

- **US-501** Package model, manifest schema & validator (file 09 §2, §6) · L.
- **US-502** Package bundles, signing, sha256 verification (SEC-018) · M.
- **US-503** Install/configure/update/uninstall lifecycle · L.
- **US-504** Skills import (SKILL.md), editor & tester (SKL-001–003, EC-04, SKL-004, SKL-007) · L.
- **US-505** Skill router & context loading in agents (SKL-005, SKL-006, AGT-012) · M.
- **US-506** Connector framework, OAuth 2.0 + PKCE, API-key connectors (PLG-001–003) · L.
- **US-507** MCP remote servers with tool allow-list (PLG-004) · L.
- **US-508** Connection grants per project/system/workflow (PLG-005) · M.
- **US-509** Health checks & revoke propagation (PLG-006, PLG-007) · M.
- **US-510** Incoming webhooks (PLG-008, SEC-010) · M.
- **US-511** First-party connectors batch (PLG-009) · L.
- **US-512** Templates: apply, parameters, fork (TPL-001–004, EC-11) · L.
- **US-513** Marketplace explore/detail/install (MKT-001–005, EC-01, EC-02, PUB-03) · L.
- **US-514** Org catalog publishing (MKT-004) · M.
- **US-515** Official skills & templates content (SKL-008, TPL-005) · M.

## Phase 6 — Business Systems & Workflows

- **US-601** Systems runtime: instances, entity defs, record store, history (SYS-003, SYS-009) · L.
- **US-602** Declarative views renderer: table, form, detail (SYS-003) · L.
- **US-603** Calendar, kanban, dashboard views (SYS-003) · L.
- **US-604** System roles & scoping (SYS-004) · M.
- **US-605** Install wizard from settings schema & activation checklist (SYS-001, SYS-002) · L.
- **US-606** Customisation overlays (fields, views, templates, branding) (SYS-007) · L.
- **US-607** Upgrades with migrations, 3-way merge, snapshot & rollback (SYS-006) · L.
- **US-608** Export/uninstall (SYS-008) · M.
- **US-609** Core module: contacts & consents (MSG-002, PRIV-006) · M.
- **US-610** Core module: booking (resources, services, availability, slot algorithm, exclusion constraint) · L.
- **US-611** Core module: invoicing (numbering, PDF, payments record) · L.
- **US-612** Core module: events & RSVP · M.
- **US-613** Core module: forms · M.
- **US-614** Workflow DSL schema, validator, expression evaluator (WF-001, WF-005, WF-010) · L.
- **US-615** WorkflowInterpreter on Temporal with node library (WF-003, WF-004, WF-009) · L.
- **US-616** Test mode with mocks (WF-006) & activation gate (WF-007) · M.
- **US-617** Workflow builder canvas (WF-002, EC-09) · L.
- **US-618** Run history & debugging (WF-008, EC-10) · M.
- **US-619** Schedules & relative-time triggers · M.
- **US-620** Workflow Creator (WF-011) · L.
- **US-621** Messaging providers: email, SMS (intl + PK aggregator), WhatsApp templates (MSG-001, PLG-010, MSG-007) · L.
- **US-622** Consent, opt-out keywords, quiet hours, sending limits (MSG-002–005, SAFE-008) · L.
- **US-623** Delivery status & inbound messages (MSG-006) · M.
- **US-624** Public site infrastructure (slug domains, SSR, CAPTCHA, CSP) (SYS-005, SAFE-009) · L.
- **US-625** CX-01 booking flow & CX-02 manage booking · L.
- **US-626** CX-03 invoice view, CX-04 RSVP, CX-05 forms · L.
- **US-627** Reference System packages: Appointments + 4 templates · L.
- **US-628** Reference System packages: Invoices, To-do, Campaigns, Events · L.
- **US-629** System AI assistant (read-only tools) (SYS-010) · M.
- **US-630** Industry pages (PUB-04) · S.
- **US-631** Booking concurrency & reminder timing load tests (NFR-011, NFR-012) · M.

## Phase 7 — Pilot Hardening & Commercial Launch

- **US-701** PaymentProvider implementation (OD-03): checkout, subscriptions, webhooks (BIL-009) · L.
- **US-702** Seats & proration, plan change, cancel, dunning (BIL-009, BIL-010, AD-05) · L.
- **US-703** VSN invoices & receipts, tax fields (BIL-013) · M.
- **US-704** Credit packs & add-ons · M.
- **US-705** Business invoice payment links for CX-03 · M.
- **US-706** Provider reconciliation & anomaly alerts (BIL-011) · M.
- **US-707** BYOK (AI-012, AD-07, BIL-012) · L.
- **US-708** Org security policies: enforce MFA, session policy, audit export (AUTH-008, AD-04) · M.
- **US-709** API keys & outgoing webhooks (AUTH-010, file 12 §7) · L.
- **US-710** Operator console: models & routing, certification workflow (AD-08) · L.
- **US-711** Marketplace moderation queue (AD-09, MKT-006) · M.
- **US-712** Support & break-glass access (AD-10, SEC-014) · L.
- **US-713** Content safety review queue, reports, appeals (AD-11, SAFE-010–012) · L.
- **US-714** Custom domains for System sites with automatic TLS · M.
- **US-715** Docs hub (PUB-06) & in-app help · M.
- **US-716** Load tests to design targets; performance fixes (NFR-002–013) · L.
- **US-717** DR drill & backup restore automation (NFR-009, SEC-017) · M.
- **US-718** Pen-test remediation (SEC-015, NFR-015) · L.
- **US-719** SLO dashboards, alerts, on-call, status page (file 15 §2, §5, NFR-001, SEC-016) · M.
- **US-720** Unit-economics dashboards (file 11 §9, NFR-016) · M.
- **US-721** Partitioning of high-volume tables & read replica · M.
- **US-722** Custom roles (WS-012) · M.
- **US-723** Full workspace export (JSON + files) within 24 h (NFR-018) · M.

## Phase 8 — Growth (candidates, prioritise with pilot data)

- **US-801** System Creator · XL · **US-802** Community marketplace & publisher verification (MKT-007) · XL · **US-803** VSN Native models via vLLM (AI-013) · XL · **US-804** SSO/SCIM (AUTH-009) · L · **US-805** Urdu locale (RTL) · L · **US-806** AI Receptionist (WhatsApp/voice booking agent) · XL · **US-807** Digital Employees (scheduled role agents) · XL · **US-808** Monitored research topics (RES-010) · L · **US-809** Figma write via plugin · L · **US-810** Mobile apps · XL · **US-811** Social publishing connectors · L · **US-812** Data residency options · L.

---

## Story count
Phase 0: 9 · Phase 1: 62 · Phase 2: 30 · Phase 3: 24 · Phase 4: 15 · Phase 5: 15 · Phase 6: 31 · Phase 7: 23 · Phase 8: 12 → **221 stories**.
