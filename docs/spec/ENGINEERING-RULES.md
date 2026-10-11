# ENGINEERING-RULES.md — Rules for whoever builds VSN AI

> Place this file at the repository root. AI coding agents MUST read it before every session. Humans should read it too.

You are building **VSN AI**, a multi-tenant AI creation, project-management and business-automation platform. The full specification lives in `/docs/spec/`. This file tells you **how** to work. The spec files tell you **what** to build.

---

## 1. The ten non-negotiable rules

1. **Build only the current phase.** The current phase is recorded in `/docs/spec/CURRENT_PHASE.md` (create it in Phase 0 with the content `Phase 0`). Do not implement features from later phases, even "quickly", even as stubs with UI. You MAY create interfaces/types that later phases will implement, but nothing user-visible — except the "Studio coming soon" placeholders required by `13_UI_UX_SPEC.md §3`.
2. **Read before you write.** Before starting a module, read: `02_SCOPE_AND_PHASES.md` (your phase), `04_DATA_MODEL.md` (tables you touch), `05_AUTH_TENANCY_RBAC.md` (permissions), the module file, and the stories in `16_BACKLOG.md` for that module.
3. **Every query is tenant-scoped.** Every read and write of tenant data MUST go through the repository layer that requires a `workspaceId` (see `05_AUTH_TENANCY_RBAC.md §6`). Never write a raw query against a tenant table without it. Postgres Row-Level Security is a second line of defence, not a replacement.
4. **Never trust the client for permissions.** Every API handler calls `authorize(actor, action, resource)` on the server. Hiding a button is UX, not security.
5. **Side effects are idempotent.** Every action that sends a message, charges money, calls a paid AI API, deploys, or writes to an external system carries an idempotency key and is safe to retry (see `07_AI_ORCHESTRATION.md §7`).
6. **No secrets in code, logs, prompts or the database in plaintext.** Use the secrets service (`03_ARCHITECTURE.md §7`). Redact tokens in logs.
7. **Do not invent business answers.** If the spec says **[DECISION NEEDED]**, stop and ask the human, or implement behind a config flag with the safest default and record it in `/docs/decisions/`.
8. **Do not invent provider facts.** Model names, API endpoints, prices and limits change. Put them in the provider registry (database/config), never hard-code them in business logic. Check the provider's current official docs at implementation time. Anything marked **[VERIFY]** must be verified.
9. **A task is done only when its Definition of Done (§5) is met**, including tests. "It compiles" is not done.
10. **Keep the spec true.** If implementation forces a change to the spec, update the spec file in the same pull request and add an entry to `/docs/decisions/`.

---

## 2. Tech stack (fixed — do not substitute without a decision record)

| Concern | Choice |
|---|---|
| Language | TypeScript (strict) everywhere except media/ML workers (Python 3.12) |
| Monorepo | pnpm workspaces + Turborepo |
| Web app | Next.js (App Router) + React + Tailwind CSS + shadcn/ui + Radix |
| Client data | TanStack Query; Zustand for local UI state; react-hook-form + Zod for forms |
| API service | Fastify + Zod (shared schemas in `packages/contracts`) + OpenAPI generated from Zod |
| Database | PostgreSQL 16 + pgvector; Drizzle ORM + drizzle-kit migrations |
| Cache / pub-sub / rate limit | Redis-compatible (Valkey or Redis) |
| Durable workflows & agents | Temporal (TypeScript SDK); Python workers for media activities |
| Object storage | S3-compatible (Cloudflare R2 by default) |
| Auth | Better Auth (email+password, Google OAuth, two-factor/TOTP, passkeys; **not** its organization plugin) — see ADR-004 and file 04 §1 |
| LLM SDK inside the gateway | Vercel AI SDK provider packages behind our own `ModelGateway` interface |
| Code sandboxes | `SandboxProvider` interface; default implementation E2B-style managed microVM sandbox [VERIFY vendor terms]; self-hosted Firecracker later |
| Realtime | Server-Sent Events from API service, fan-out through Redis pub/sub |
| Email | `EmailProvider` interface (Resend/Postmark/SES) |
| SMS / WhatsApp | `MessagingProvider` interface (Twilio + a Pakistan PTA-compliant SMS aggregator + WhatsApp Business Cloud API) [VERIFY] |
| Payments | `PaymentProvider` interface — provider is **[DECISION NEEDED]** (see file 17, OD-03) |
| Observability | OpenTelemetry → Grafana stack (Tempo/Loki/Prometheus) or equivalent; Sentry for errors |
| Testing | Vitest (unit), Testcontainers (integration), Playwright (E2E), k6 (load) |
| Infra | Docker; docker-compose for local; Terraform; managed container platform for staging/prod |

---

## 3. Repository layout (create in Phase 0)

```
/apps
  /web               Next.js app: marketing site, authenticated app, end-customer pages
  /api               Fastify HTTP API + SSE
  /worker            Temporal workers (TypeScript): agents, workflows, billing jobs
  /media-worker      Python Temporal activity worker: FFmpeg, audio/video processing
  /admin             (Phase 7) VSN operator console — may live inside /web under /ops with separate auth
/packages
  /contracts         Zod schemas, DTOs, error codes, event types — shared by web/api/worker
  /db                Drizzle schema, migrations, seed scripts, repository layer, RLS policies
  /authz             Permission definitions, role matrix, authorize() implementation
  /model-gateway     ModelGateway interface, provider adapters, routing, pricing, token accounting
  /agents            Agent runtime: tool registry, policies, prompts, evidence, supervisor logic
  /sandbox           SandboxProvider interface + implementations
  /integrations      Plugin/connector framework, OAuth helpers, provider clients
  /workflow-engine   Workflow DSL types, validator, expression evaluator, node library
  /systems-runtime   (Phase 6) System package loader, record store, declarative UI schema
  /billing           Credits ledger, pricing, budgets, PaymentProvider
  /ui                Shared React components (design system), icons, tokens
  /config            ESLint, TSConfig, Tailwind preset, env schema
  /test-utils        Factories, fixtures, tenant-isolation test harness
/docs
  /spec              This specification pack
  /decisions         ADR-xxx.md files (architecture decision records)
  /runbooks          Operational runbooks
/infra
  /docker            Dockerfiles, docker-compose.yml
  /terraform         Cloud infrastructure
```

---

## 4. Coding standards

- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`. No `any` except at validated boundaries with a comment.
- **Validate at every boundary** with Zod: HTTP input, webhook input, provider responses, LLM structured outputs, workflow definitions, package manifests.
- IDs: UUIDv7 strings, generated in the application. Public-facing short IDs (e.g., task keys `WEB-142`) are separate columns.
- Timestamps: `timestamptz`, stored in UTC; display in the user's timezone (default `Asia/Karachi` for PK users, from profile).
- Money: integer minor units + ISO currency (`amount_minor`, `currency`). Credits: integer "credit micro-units" (1 credit = 1,000,000 units) to avoid floats.
- Errors: use the error envelope and codes in `12_API_SPEC.md §3`. Never leak stack traces to clients.
- Logging: structured JSON with `traceId`, `workspaceId`, `actorId`; never log prompt content or file content at INFO level (DEBUG only, and redacted in production).
- Feature flags: `packages/config/flags.ts`, read per workspace; every Phase N feature is behind `phaseN.*` flags until its exit gate passes.
- Accessibility: every interactive element keyboard-reachable, labelled, with visible focus. WCAG 2.2 AA target.
- Internationalisation: all UI strings through `next-intl` message files; English is the only shipped locale until Phase 8, but no hard-coded user-facing strings in components. Layout must not break in RTL (Urdu is a future locale).
- Commits: Conventional Commits (`feat(tasks): …`). One logical change per PR.

---

## 5. Definition of Done (every story)

A story is done only when **all** are true:

1. Acceptance criteria in `16_BACKLOG.md` pass.
2. Unit tests for domain logic; integration test for each new API endpoint (happy path + authz failure + validation failure).
3. If it touches tenant data: added to the **tenant-isolation suite** (a second workspace cannot read/write it).
4. If it has UI: loading, empty, error, permission-denied states exist (see `13_UI_UX_SPEC.md §3`) and a Playwright test covers the main path.
5. If it calls a paid provider: usage is metered into the ledger and the call is mocked in tests.
6. If it performs a side effect: idempotency key + retry test.
7. OpenAPI regenerated; contracts package updated.
8. Lint, typecheck, tests green in CI.
9. Spec updated if behaviour differs; decision recorded if a choice was made.
10. Audit event emitted for security-relevant actions (see `04_DATA_MODEL.md` `audit_events`).

---

## 6. How to work through a phase

1. Read the phase section in `02_SCOPE_AND_PHASES.md`.
2. List the stories for the phase from `16_BACKLOG.md`. Order them by dependency (data model → authz → API → worker → UI → tests).
3. Write a short plan to `/docs/plans/phase-N.md` before coding: stories, order, risks, questions.
4. Implement story by story. After each story, run the full test suite.
5. At the end, run the **phase exit checklist** and write `/docs/plans/phase-N-report.md` with: what was built, test evidence, known gaps, decisions taken.
6. Stop. Do not begin the next phase until a human updates `CURRENT_PHASE.md`.

---

## 7. When you are unsure

- Spec is ambiguous but low-risk → choose the simplest reasonable option, note it in the phase report.
- Spec is ambiguous and the choice affects security, money, data deletion, external messaging, or legal exposure → **stop and ask**.
- Spec contradicts itself → the more restrictive / safer reading wins until a human resolves it.
- A provider doesn't support something the spec assumes → implement the interface, mark the adapter `unsupported` for that capability, surface it in the UI as unavailable, and report it.

---

## 8. Things you must never do

- Never disable tenant isolation, RLS, auth checks or tests to "make it work".
- Never send real emails/SMS/WhatsApp or make real charges from development or test environments (use sandbox providers and the `MESSAGING_MODE=capture` / `PAYMENTS_MODE=test` settings).
- Never let an AI agent merge to a protected branch, deploy to production, spend beyond budget, send bulk messages, or delete data without the approval policy in `07_AI_ORCHESTRATION.md §8`.
- Never store end-user content in shared training datasets.
- Never commit `.env` files, keys, or customer data fixtures.
- Never copy code from n8n, Figma, or other products whose licences forbid it. "Inspired by" means the UX idea, not the code.
