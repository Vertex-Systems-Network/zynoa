# 02 — Scope and Phases

The system is built in **nine phases (0–8)**. Each phase ends in a working, tested, demonstrable product increment. A phase is not complete until every item in its **exit checklist** passes.

> **Why phases matter for an AI builder:** if you ask an AI agent to build "VSN AI", it will scaffold 80 screens that do nothing. If you ask it to build Phase 1, it can build a real, secure, tested product core. Always build one phase at a time.

---

## 1. Phase overview

| Phase | Name | Indicative duration | What the user can do at the end | Funding gate |
|---|---|---|---|---|
| **0** | Validation & Engineering Foundation | 4–6 weeks | Click through a prototype; engineers have a running empty platform | **Gate A** (end) |
| **1** | Platform Core | 10–12 weeks | Sign up, personal + organization workspaces, create projects, AI-generated plan, task board, Library, AI chat, credits | — |
| **2** | AI Supervisor + Coding Studio | 12–16 weeks | AI agents build/modify real code in sandboxes, run tests, open PRs, show live previews; approvals and releases | **Gate B** (end) |
| **3** | Design, Research & Images Studios | 10–14 weeks | Generate UI designs, cited research reports, images; design→code handoff; asset graph | — |
| **4** | Audio & Video Studios | 10–14 weeks | Voiceovers, transcription, dubbing, storyboard→video; full cross-modal campaign | — |
| **5** | Ecosystem & Marketplace | 8–10 weeks | Install/create Skills, connect Plugins (OAuth/API/MCP), use Templates, browse official/private marketplace | — |
| **6** | Business Systems & Workflow Engine | 14–18 weeks | Install Appointment/Invoice/To-do/Campaign Systems, public booking/payment/RSVP pages, WhatsApp/SMS/email automations, visual workflow builder | **Gate C** (end) |
| **7** | Pilot Hardening & Commercial Launch | 10–14 weeks | Pay by subscription/credits, operator console, moderation ops, security and load tested, DR drilled | **Gate D** (end) |
| **8** | Growth & Advanced | ongoing | System Creator, community marketplace, VSN Native models, SSO/SCIM, Urdu UI, mobile apps | — |

**Total:** ~80–100 weeks of sequential work; with 2 parallel streams from Phase 3 onward, **18–24 months** to full scope. **First sellable product: end of Phase 2 (~6–8 months)**, sold to 5–15 design partners with manual invoicing (online payments arrive in Phase 7).

**Parallel streams allowed:** from Phase 3, Stream A (studios) and Stream B (ecosystem/systems) can run in parallel if the team has ≥ 8 engineers. Phase 7 hardening work (security reviews, load tests) SHOULD start early in a light form.

---

## 2. Cross-cutting rules for every phase

- Tenant isolation, authorization, audit events, usage metering and the Definition of Done (`ENGINEERING-RULES.md §5`) apply from Phase 1 onward.
- Every user-visible feature ships behind a `phaseN.*` feature flag until its phase exit gate passes.
- Every phase updates: OpenAPI, seed data, E2E suite, tenant-isolation suite, runbooks.
- Every phase ends with a **phase report** (`/docs/plans/phase-N-report.md`) and a recorded **demo** of its demo script.

---

## 3. Phase 0 — Validation & Engineering Foundation (4–6 weeks)

### Goal
Prove the idea is wanted, the providers are accessible from Pakistan at acceptable cost, and give engineers a working skeleton so Phase 1 starts fast.

### Business track (humans)
- 15–25 customer interviews across PER-1…PER-5 (script in file 17 §4). Output: chosen first segment (OD-01).
- Clickable prototype (Figma or coded) of journey J-01 and J-04 (see `13_UI_UX_SPEC.md §4`). 5 usability sessions.
- Provider access check from a Pakistan-registered company: account creation, billing method, API access, terms for resale/embedding, data retention for OpenAI, Anthropic, Google (Gemini/Veo), ElevenLabs, one image provider, one search API, sandbox vendor, SMS/WhatsApp vendors, payment provider shortlist. **[VERIFY]** each.
- Cost measurement: run 20 representative tasks per studio through provider APIs; record tokens/seconds/cost; fill `11_BILLING_AND_USAGE.md §3` price sheet.
- Legal checklist (file 14 §10): company registration status, terms of service draft, privacy policy draft, PSEB/tax advice, consent language.
- Itemised budget for Phases 1–2 (people + infra + providers) → Gate A pack.

### Engineering track
| Deliverable | Detail |
|---|---|
| Monorepo scaffold | Layout from `ENGINEERING-RULES.md §3`; pnpm + Turborepo; shared TS/ESLint/Prettier config |
| Local environment | `docker-compose.yml` with Postgres 16 + pgvector, Redis/Valkey, Temporal (dev server) + Temporal UI, MinIO (S3 emulator), Mailpit (email capture) |
| CI | GitHub Actions: install, lint, typecheck, unit tests, build, migration check, container build |
| `packages/config` | Env schema (Zod) that fails fast on missing vars; feature-flag helper |
| `packages/db` | Drizzle setup, migration runner, empty migration, seed script, repository base class with mandatory `workspaceId` |
| `apps/api` | Fastify server, `/healthz`, `/readyz`, request-id + OpenTelemetry middleware, error envelope, OpenAPI generation |
| `apps/web` | Next.js app shell with design-system tokens, light/dark theme, placeholder marketing page, app layout skeleton (no features) |
| `apps/worker` | Temporal worker that runs a `HelloWorkflow` |
| `packages/ui` | Design tokens + 15 base components (Button, Input, Select, Dialog, Sheet, Tabs, Table, Badge, Toast, Tooltip, DropdownMenu, Avatar, Card, EmptyState, Skeleton) with Storybook |
| `packages/model-gateway` | Interface + one adapter (OpenAI or Anthropic) + smoke-test script (no UI) |
| Docs | `CURRENT_PHASE.md`, ADR-001…ADR-014 copied from file 17 into `/docs/decisions/` |

### Out of scope
Any user-facing feature, real auth, real data.

### Exit checklist (Gate A)
- [ ] `docker compose up` + `pnpm dev` starts everything on a clean machine in < 15 minutes using README instructions.
- [ ] CI is green on main; a failing test blocks merge.
- [ ] Smoke test calls a real model through the gateway and prints tokens + cost.
- [ ] Prototype tested with ≥ 5 target users; findings written.
- [ ] Provider access matrix complete with ✅/❌/⚠ per provider and capability.
- [ ] First segment chosen (OD-01) and Phase 1–2 budget approved.

---

## 4. Phase 1 — Platform Core (10–12 weeks)

### Goal
A secure multi-tenant product where a user can sign up, work alone or in an organization, create projects, get an AI-generated plan, manage tasks, store files, chat with AI in project context, and see credit usage.

### In scope
| Area | Included | Spec |
|---|---|---|
| Accounts | Sign up/in (email+password, Google OAuth), email verification, password reset, TOTP MFA, sessions list/revoke, profile & preferences, account data export request + deletion request (ON-09) | 05 |
| Workspaces | Auto-created personal workspace; create organization; workspace switcher; invitations; members; teams; built-in roles; project membership; ownership transfer | 05 |
| Projects | Create/list/archive/delete; New Project wizard (goal, workspace, services, starter = Blank or AI plan, autonomy & budget); project settings | 06 |
| Planning | AI discovery questions (optional), AI plan generation (requirements, milestones, tasks with acceptance criteria and dependencies), human edit + approve plan | 06, 07 |
| Tasks | Backlog list, Kanban board, task detail, comments with mentions, checklists, attachments, state machine, manual evidence (human-attested), activity log | 06 |
| AI | Model gateway with 3 text providers [VERIFY], registry, VSN Auto/Fast/Pro routing, streaming chat (GL-03) with project/library context, usage metering | 07 |
| Library | Upload, folders, tags, versions, preview (image/PDF/text), project linking, text extraction + embeddings, semantic search | 09 |
| Notifications | In-app inbox, email for invitations/mentions/approvals, preferences | 06 |
| Billing (internal) | Credit accounts, ledger, plan definitions as data, monthly grants, operator manual grant, project budgets with soft/hard caps, usage page (AD-06 basic) | 11 |
| Admin (minimal) | Internal `/ops` page for VSN operators (an early, minimal form of AD-08/AD-10; full screens in Phase 7): list workspaces (metadata only), grant/adjust credits, view model registry and provider error rates. Protected by `operator_roles`; runs through `OpsService` | 05, 15 |
| Public site | Landing, Capabilities, Pricing (placeholder plans), Security & Legal pages, Contact form | 13 |
| Platform | Audit events, rate limiting, feature flags, OpenTelemetry tracing, Sentry | 14, 15 |

### Screens delivered
PUB-01, PUB-02, PUB-05, PUB-07, PUB-08 · ON-01…ON-06, ON-08, ON-09 · GL-01, GL-02, GL-03, GL-05, GL-07 (chat/plan jobs only) · PR-01…PR-06, PR-08, PR-10, PR-14 · EC-12 · AD-01…AD-03, AD-06 (basic)

### Out of scope
Code execution, Git, any studio output, Skills/Plugins/Systems, payments, previews.

### Exit checklist
- [ ] Demo script P1 (file 18) runs end-to-end on staging: sign up → personal project → AI plan → approve → tasks on board → comment → upload to Library → ask chat a question answered from the uploaded file with a citation → see credit usage.
- [ ] Organization demo: owner invites 2 members with different roles; member sees only projects they belong to; viewer cannot edit.
- [ ] Individual workspace rejects any attempt to add a second human (API + UI).
- [ ] Tenant-isolation suite: 100% of tenant tables covered; all pass.
- [ ] Budget hard cap stops AI calls with a clear UI message.
- [ ] p95 API latency < 300 ms for CRUD endpoints under 50 concurrent users (k6).
- [ ] Security review of auth, session and invitation flows completed; no open High findings.

---

## 5. Phase 2 — AI Supervisor + Coding Studio (12–16 weeks)

### Goal
The first *sellable* product: agents that do real software work safely, with evidence, previews and approvals.

### In scope
| Area | Included | Spec |
|---|---|---|
| Agent runtime | Agent definitions (roles), tool registry with risk levels, policies, durable agent runs on Temporal, checkpoints, pause/resume/cancel, loop & budget guards, run logs | 07 |
| Supervisor | Picks ready tasks, dispatches agent runs, verifies evidence, updates task states, escalates blockers, writes daily project summary | 07 |
| Approvals | Approval requests, approval policies per workspace/project, approve/reject with comment, expiry | 07 §8, 06 |
| Sandbox | SandboxProvider, per-run isolated sandbox, file ops, command exec with timeouts, network egress policy, port exposure for previews | 08 §2, 14 |
| Git | GitHub App integration (install, repo list, clone, branch, commit, push, PR, check status); GitLab later | 08 §2 |
| Coding Studio | New app from starter templates (Next.js, Node API, static site), import repo + AI audit, file tree, diff viewer, read-only editor with "ask AI to change", terminal log viewer, test console, preview iframe | 08 §2 |
| QA evidence | Test runs (lint/typecheck/unit/E2E) captured as evidence; screenshot capture of preview via headless browser | 06 §6 |
| Releases | Preview (per branch), staging (per project) deploy via DeployTarget adapter; release record; rollback to previous release | 06 §8 |
| Sharing | Share a preview with a guest via signed, expiring link (SH-01) | 06 §9 |
| Project secrets | Env vars/secrets per project & environment (PR-15), injected into sandboxes and deploys | 14 |
| Job Center | Full GL-07: all runs, queue, retry/stop, cost | 07 |

### Screens delivered
PR-07, PR-09, PR-11, PR-12, PR-13, PR-15 · ST-01, ST-02 · GL-07 (full) · SH-01 · ON-07 (Git only)

### Exit checklist (Gate B)
- [ ] Demo J-01 (coding part): user describes a small web app → plan → agents scaffold app in sandbox → tests pass → PR opened on the user's GitHub repo → live preview URL → user approves → staging deploy.
- [ ] Demo: import an existing repo with a failing test → agent diagnoses → fixes → test evidence → PR.
- [ ] Kill a worker mid-run → run resumes from checkpoint; no duplicate commits/PRs (idempotency).
- [ ] Agent cannot merge to a protected branch or deploy to production without approval (test).
- [ ] Budget exhaustion pauses runs and notifies owner.
- [ ] Sandbox escape and egress tests pass (file 14 §4).
- [ ] Golden-task eval: ≥ 70% of the 30 golden coding tasks pass acceptance automatically (file 07 §12). [Target adjustable after baseline]
- [ ] 5 design-partner users onboarded and active weekly.

---

## 6. Phase 3 — Design, Research & Images Studios (10–14 weeks)

### In scope
- **Design Studio**: AI-generated UI screens as code-based frames (React + Tailwind) on a canvas of frames; design tokens from brand kit; property panel for text/colour/spacing; variants; comments; prototype mode (click-through links); handoff = the same components exported to the coding project. Figma: import frames as reference (read), export PNG/SVG. (ST-03, ST-04)
- **Research Studio**: research runs (plan → search → fetch → extract → synthesise), cited report editor, claim→source map, confidence labels, export (MD/PDF/DOCX), reuse as project knowledge. (ST-11, ST-12)
- **Images Studio**: text-to-image, reference images, aspect ratios, batch, edit with mask, variations, upscale, background removal, gallery, brand-kit styling, project linking. (ST-05, ST-06)
- **Asset graph**: dependencies between assets; impact suggestions when a source asset changes.
- **Quick Create** (GL-04), **Global Search** (GL-06), brand-kit **application** in studios (IMG-005, DES-006) — the brand-kit editor itself ships in Phase 1.
- **Content safety v1** for prompts and image outputs (file 14 §7).

### Exit checklist
- [ ] Demo J-02: Design-only project → approved screens → later enable Coding → agent implements screens from design frames → visual diff evidence.
- [ ] Research report with ≥ 10 sources where every factual claim has a citation link; broken-link check passes.
- [ ] Images: generate, edit, upscale, attach to project; usage metered; unsafe prompt blocked with explanation.
- [ ] Changing the brand kit logo creates impact suggestions for linked assets.

---

## 7. Phase 4 — Audio & Video Studios (10–14 weeks)

### In scope
- **Audio Studio**: TTS with voice library, transcription with speaker labels and timestamps, subtitle export (SRT/VTT), dubbing (transcribe → translate → TTS), audio cleanup, **voice cloning only with verified consent** (file 08 AUD-006, file 14 SAFE-006). (ST-09, ST-10)
- **Video Studio**: brief → script → storyboard (shots) → per-shot generation (text/image-to-video) → voiceover + music bed → captions → assembly (FFmpeg) → export presets (9:16, 1:1, 16:9). Simple timeline (reorder, trim, replace shot, caption edit). (ST-07, ST-08)
- **Media worker** (Python), GPU-free (provider APIs do generation; worker does assembly).
- AI-content labelling and provenance metadata (C2PA where feasible [VERIFY]).

### Exit checklist
- [ ] Demo J-03: campaign project → research brief → design + images → narration → 30-second video in 3 aspect ratios with captions; every output linked in asset graph with provenance.
- [ ] Voice cloning blocked without a consent recording matching the consent script.
- [ ] Media cost estimate shown before render; actual within ±25% of estimate on test set.

---

## 8. Phase 5 — Ecosystem & Marketplace (8–10 weeks)

### In scope
- **Skills**: install, create (editor), import `SKILL.md` folders, test with sample inputs, version, scope (personal/org/project), enable/disable; agents load relevant skills. (EC-03, EC-04)
- **Plugins**: connector framework; OAuth 2.0 / API key / MCP (remote servers) / incoming webhooks; per-project scopes; health checks; revoke. First-party plugins: GitHub, GitLab, Google Drive, Google Calendar, Figma (read), Slack, Gmail/SMTP, generic HTTP, generic MCP. (EC-05, EC-06)
- **Templates**: project templates, studio templates (e.g., "Instagram carousel"), apply and fork. (EC-11)
- **Marketplace**: catalog of Official + Private + Organization packages, item detail, permissions preview, install/uninstall, updates with changelog. No community publishing yet. (EC-01, EC-02, PUB-03)

### Exit checklist
- [ ] Import a `SKILL.md` folder; agent uses it on a matching task; output differs measurably (eval).
- [ ] Connect Google Calendar plugin to one project only; another project cannot use it (test).
- [ ] Revoking a plugin stops all dependent runs/workflows within 60 seconds.
- [ ] Remote MCP server connected with tool allow-list; disallowed tool calls are blocked.

---

## 9. Phase 6 — Business Systems & Workflow Engine (14–18 weeks)

### In scope
- **Systems runtime**: package format, install/configure/upgrade/uninstall, record store, declarative views (table, form, calendar, kanban, dashboard), roles inside a System, public pages, settings, data export. (EC-07, EC-08)
- **Workflow engine**: JSON DSL, visual builder (React Flow), node library, expressions, test mode with mocked connectors, run history and step logs, retries, approvals, schedules, versioning and activation. Natural-language "Workflow Creator" generates a draft workflow for human review. (EC-09, EC-10)
- **Messaging**: email, SMS, WhatsApp Business templates; consent & opt-out; quiet hours; sending limits.
- **Reference Systems**: Appointments (barber/salon/clinic templates), Invoices & Quotations, To-do & Team Tasks, Marketing Campaign Planner, Event RSVP.
- **End-customer pages**: booking, manage booking, invoice view/pay (pay = "mark paid"/payment link stub until Phase 7), RSVP, public form. (CX-01…CX-05)
- **Industry pages** (PUB-04).

### Exit checklist (Gate C)
- [ ] Demo J-04: install Salon System from template → configure staff, services, hours → public booking page live on a VSN subdomain → test booking → WhatsApp/SMS reminder scheduled (captured in test mode) → cancellation via link → audit and run logs visible.
- [ ] Double-booking impossible under 50 concurrent booking attempts for the same slot (load test).
- [ ] Upgrade Appointments System v1.0 → v1.1 preserves customer customisations and data.
- [ ] Workflow with a failing step retries with backoff, then escalates; no duplicate SMS.
- [ ] Opt-out ("STOP") respected across all workflows.

---

## 10. Phase 7 — Pilot Hardening & Commercial Launch (10–14 weeks)

### In scope
- **Payments**: subscriptions, credit packs, invoices/receipts, tax fields, dunning, plan change/cancel (AD-05 full) via chosen PaymentProvider (OD-03). Business Systems' invoice payment links.
- **Operator console**: provider/model registry & health (AD-08), marketplace moderation (AD-09), support & audit investigation with break-glass access (AD-10), content-safety review queue (AD-11), workspace management.
- **BYOK** (bring your own provider key) for org workspaces (AD-07).
- **Org security** (AD-04): enforce MFA, session policies, IP allow-list (optional), audit log export.
- **Hardening**: external penetration test, load test to target (file 15), DR drill (restore from backup in a fresh region), chaos test of workers, SLO dashboards, status page, on-call runbooks.
- **Docs & support**: Documentation hub (PUB-06), in-app help, support ticket intake.
- **Pilot**: 30–100 paying users; weekly metrics review.

### Exit checklist (Gate D)
- [ ] A real customer can subscribe, pay, receive a receipt, upgrade, downgrade, cancel.
- [ ] Monthly reconciliation: internal usage vs provider invoices within ±3%.
- [ ] Pen-test: no open Critical/High findings.
- [ ] DR drill: RPO ≤ 15 min, RTO ≤ 4 h achieved.
- [ ] SLOs met for 4 consecutive weeks (file 15 §2).
- [ ] Gross margin per plan measured and ≥ target set in OD-05.

---

## 11. Phase 8 — Growth & Advanced (ongoing)

Candidates, prioritised by pilot data:
- **System Creator**: describe a business process → assemble a new System from core modules (Booking, Customer, Invoice, Notification, Calendar, Form, Approval, File, Analytics) → custom code only where needed → tests → publish privately.
- **Community marketplace** with publisher verification, automated package scanning, revenue share.
- **VSN Native models**: self-hosted licensed open-weight models via vLLM for cost/privacy tiers; later fine-tuned adapters with opt-in data.
- **Enterprise**: SAML/OIDC SSO, SCIM, data-residency options, custom contracts, private deployment.
- **Digital Employees** (scheduled role-based agents), **AI Receptionist** (voice/WhatsApp agent for bookings), **Intelligence Center** (monitored research topics).
- **Urdu locale** (RTL), **mobile apps**, **desktop app**.

---

## 12. Screen-to-phase summary

| Phase | Screens (new in that phase) | Count |
|---|---|---|
| 1 | PUB-01, PUB-02, PUB-05, PUB-07, PUB-08, ON-01, ON-02, ON-03, ON-04, ON-05, ON-06, ON-08, ON-09, GL-01, GL-02, GL-03, GL-05, GL-07, PR-01, PR-02, PR-03, PR-04, PR-05, PR-06, PR-08, PR-10, PR-14, EC-12, AD-01, AD-02, AD-03, AD-06 | 32 |
| 2 | ON-07, PR-07, PR-09, PR-11, PR-12, PR-13, PR-15, ST-01, ST-02, SH-01 | 10 |
| 3 | GL-04, GL-06, ST-03, ST-04, ST-05, ST-06, ST-11, ST-12 | 8 |
| 4 | ST-07, ST-08, ST-09, ST-10 | 4 |
| 5 | PUB-03, EC-01, EC-02, EC-03, EC-04, EC-05, EC-06, EC-11 | 8 |
| 6 | PUB-04, EC-07, EC-08, EC-09, EC-10, CX-01, CX-02, CX-03, CX-04, CX-05 | 10 |
| 7 | PUB-06, AD-04, AD-05, AD-07, AD-08, AD-09, AD-10, AD-11 | 8 |
| **Total** | | **80** |

(GL-07 is introduced in Phase 1 for chat/plan jobs and completed in Phase 2; it is counted once, in Phase 1.)

---

## 13. Team per phase (indicative)

| Role | P0 | P1 | P2 | P3–P4 | P5–P6 | P7 |
|---|---|---|---|---|---|---|
| Product owner / BA | 1 | 1 | 1 | 1 | 1 | 1 |
| Tech lead / architect | 1 | 1 | 1 | 1 | 1 | 1 |
| Full-stack engineers | 1 | 3 | 3 | 4 | 4 | 3 |
| AI / agent engineer | 0.5 | 1 | 2 | 2 | 1 | 1 |
| Infra / DevOps / SRE | 0.5 | 1 | 1 | 1 | 1 | 2 |
| UX/UI designer | 1 | 1 | 1 | 1.5 | 1 | 0.5 |
| QA / security | 0 | 0.5 | 1 | 1 | 1 | 2 |
| Media engineer (Python) | 0 | 0 | 0 | 1 | 0 | 0 |
| Customer success / support | 0 | 0 | 0.5 | 0.5 | 1 | 2 |
| **Total FTE** | **5** | **8.5** | **10.5** | **13** | **11** | **12.5** |

AI coding agents can raise individual engineer throughput, but they do not remove the need for review, security and QA roles.
