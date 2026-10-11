# 03 — Technical Architecture

## 1. Architecture at a glance

```
                ┌──────────────────────────────────────────────────────────────────┐
 Browsers ────► │  CDN / WAF / rate limit (Cloudflare)                              │
 End customers  └───────────────┬───────────────────────────────┬──────────────────┘
                                │                               │
                    ┌───────────▼───────────┐       ┌───────────▼────────────┐
                    │ apps/web (Next.js)    │       │ Public System pages     │
                    │ marketing + app UI    │       │ {slug}.{{SYSTEMS_DOMAIN}}│
                    └───────────┬───────────┘       └───────────┬────────────┘
                                │ HTTPS (JSON) + SSE            │
                    ┌───────────▼───────────────────────────────▼────────────┐
                    │ apps/api (Fastify)                                      │
                    │ authn · authz · REST · SSE · webhooks in · rate limits  │
                    └──┬──────────┬───────────┬──────────────┬───────────────┘
                       │          │           │              │
             ┌─────────▼──┐ ┌─────▼─────┐ ┌───▼──────┐ ┌─────▼────────────┐
             │ PostgreSQL │ │ Redis /   │ │ Object   │ │ Temporal cluster  │
             │ + pgvector │ │ Valkey    │ │ storage  │ │ (workflows, timers│
             │ (RLS)      │ │ cache/pub │ │ (R2/S3)  │ │  retries, state)  │
             └────────────┘ └───────────┘ └──────────┘ └─────┬─────────────┘
                                                             │ task queues
          ┌──────────────────────────┬───────────────────────┼─────────────────────────┐
  ┌───────▼────────┐      ┌──────────▼─────────┐   ┌─────────▼─────────┐    ┌──────────▼────────┐
  │ apps/worker     │      │ apps/worker         │   │ apps/media-worker │    │ apps/worker        │
  │ queue: agents   │      │ queue: workflows    │   │ (Python) queue:   │    │ queue: platform    │
  │ supervisor,     │      │ System workflows,   │   │ media — FFmpeg,   │    │ billing, emails,   │
  │ agent runs      │      │ schedules, messaging│   │ audio/video ops   │    │ indexing, cleanup  │
  └──┬───────┬──────┘      └──────────┬──────────┘   └─────────┬─────────┘    └───────────────────┘
     │       │                        │                        │
     │  ┌────▼──────────────┐   ┌─────▼──────────────┐   ┌─────▼──────────────┐
     │  │ Sandbox provider  │   │ Integrations       │   │ Media providers     │
     │  │ (microVMs)        │   │ GitHub, Calendar,  │   │ image/video/audio   │
     │  └───────────────────┘   │ SMS, WhatsApp, MCP │   │ generation APIs     │
     │                          └────────────────────┘   └─────────────────────┘
  ┌──▼───────────────────────┐
  │ packages/model-gateway   │──► LLM providers (OpenAI, Anthropic, Google, …) [VERIFY]
  │ routing · pricing · logs │──► VSN Native (vLLM, Phase 8)
  └──────────────────────────┘
```

**Style:** a modular monolith for HTTP (`apps/api`) + a set of Temporal worker processes. Modules communicate in-process inside the API and through Temporal/outbox events between processes. No microservice split until load data justifies it (ADR-002).

## 2. Processes and responsibilities

| Process | Responsibilities | Scales by |
|---|---|---|
| `apps/web` | Server-rendered marketing pages, authenticated SPA-like app (App Router), end-customer System pages. Talks only to `apps/api` (no direct DB access). **`apps/api` is served same-origin at `{{APP_DOMAIN}}/api/*`** (edge routing or Next.js rewrites), so the `__Host-` session cookie works; server-side rendering forwards the `Cookie` header to the API. | Requests |
| `apps/api` | Authentication (Better Auth mounted under `/api/auth`), authorization, REST endpoints, SSE streams, incoming webhooks (GitHub, payments, messaging), signed URL issuing, starting Temporal workflows, outbox relay. Stateless. | Requests |
| `apps/worker` (queue `agents`) | Supervisor workflows, agent-run workflows, tool activities (sandbox, git, model calls). | Concurrent runs |
| `apps/worker` (queue `workflows`) | Business-System workflow interpreter, schedules, reminders, messaging activities. | Workflow volume |
| `apps/worker` (queue `platform`) | Billing (reservations, settlement, monthly grants), email sending, document text extraction, embeddings indexing, retention/cleanup jobs, reconciliation. | Background volume |
| `apps/media-worker` (queue `media`) | FFmpeg assembly, transcoding, waveform/thumbnail generation, audio normalisation, subtitle burn-in. Python Temporal SDK activities. | CPU minutes |

Every worker process is the same container image with a `WORKER_QUEUES` env var, except media-worker (separate Python image).

## 3. Request lifecycle (HTTP)

1. Cloudflare → `apps/api`. Middleware order: request-id → OpenTelemetry span → CORS → body size limit → rate limit per IP → session resolution (Better Auth) → **workspace context** resolution from the route param, verifying membership → rate limits per user and per workspace (Redis token buckets) → handler.
2. Handler validates input with the Zod contract, calls a **service** (domain logic), which calls `authorize(actor, action, resource)` and then **repositories** (tenant-scoped).
3. Database transaction calls `select set_config('app.workspace_id', $1, true), set_config('app.user_id', $2, true)` with bind parameters (never string interpolation) so RLS policies apply (file 05 §6.2).
4. Writes that must trigger async work insert an **outbox** row in the same transaction; the outbox relay starts Temporal workflows / publishes SSE events (exactly-once delivery from the DB's perspective; consumers are idempotent).
5. Response uses the envelope in file 12.

## 4. Async lifecycle (agents, media, workflows)

1. API creates a `job_runs` (P1) / `agent_runs` (P2) / `studio_jobs` (P3) row (status `queued`) and an outbox event.
2. Relay starts a Temporal workflow with `workflowId = <run id>` and `workflowIdReusePolicy: REJECT_DUPLICATE`; `WorkflowExecutionAlreadyStarted` is treated as success. (Temporal only rejects duplicate IDs while a run is open; the reuse policy prevents a re-delivered outbox row from starting a second run after the first closed.)
3. Workflow executes activities (model calls, sandbox commands, provider calls). Each activity: has a timeout, a retry policy, and an idempotency key = `<runId>:<stepId>:<attempt-independent key>`.
4. Progress events are written to `run_events` (with an `audience`, §11) and published to Redis → SSE to browsers.
5. Before any paid call: **credit reservation** (file 11 §5). After: settlement with actual usage.
6. Gated actions create an `approval_requests` row and the workflow waits on a Temporal **signal** (`approvalDecided`) with a timeout.

## 5. Module boundaries inside `apps/api` and `packages/*`

| Module | Owns tables (file 04) | Public interface |
|---|---|---|
| identity | users, auth_accounts, sessions, verifications, two_factors, passkeys, user_preferences, data_requests | `IdentityService` |
| workspaces | workspaces, memberships, invitations, teams, team_members, roles, project_members | `WorkspaceService`, `authorize()` |
| projects | projects, project_services, plans, requirements, milestones, project_memory | `ProjectService`, `PlanService`, `MemoryService` |
| tasks | tasks, task_dependencies, task_checklist_items, task_watchers, evidence, task_events, discussions, comments, mentions | `TaskService`, `EvidenceService` |
| notifications | notifications | `NotificationService` |
| ai | providers, provider_models, model_routes, model_calls, chat_threads, chat_messages, prompt_templates, job_runs, run_events | `ModelGateway`, `ChatService`, `JobService` |
| agents | agent_definitions, tool_definitions, project_supervisors, agent_runs, run_steps, approval_policies, approval_requests | `AgentRuntime`, `ApprovalService` |
| assets | library_folders, assets, asset_versions, asset_links, asset_dependencies, tags, asset_tags, document_chunks, brand_kits | `AssetService`, `LibraryService` |
| coding | git_connections, repositories, sandboxes, pull_requests, test_runs, environments, deployments, releases, share_links, guest_identities | `CodingService`, `ReleaseService`, `ShareService` |
| secrets | secrets | `SecretService` |
| studios | studio_jobs, design_documents, design_frames, research_runs, research_sources, research_claims, voice_profiles, voice_consents, video_compositions | per-studio services |
| ecosystem | packages, package_versions, package_installations, connections, connection_grants, webhook_endpoints | `PackageService`, `ConnectorService` |
| systems | system_instances, system_entity_defs, system_records, system_record_history, system_roles, contacts, contact_consents, bookable_resources, services_catalog, availability_rules, bookings, biz_invoices, biz_invoice_lines, biz_payments, events, event_guests, forms, form_submissions | `SystemsRuntime`, core-module services |
| workflows | workflows, workflow_versions, workflow_runs, workflow_step_runs, schedules, message_templates, messages | `WorkflowEngine`, `MessagingService` |
| billing | billing_plans, subscriptions, credit_accounts, ledger_entries, credit_reservations, budgets, usage_events, billing_invoices, payments, platform_prices, provider_reconciliations | `BillingService` |
| platform | audit_events, outbox, idempotency_keys, feature_flags, safety_checks, safety_reports, api_keys | shared |
| ops | operator_roles, operator_access_grants, support_tickets | `OpsService` (runs on `vsn_platform` role) |

**Rule:** a module never queries another module's tables directly; it calls that module's service. This keeps a future split possible.

## 6. Data storage

| Data | Store | Notes |
|---|---|---|
| Relational, tenant data | PostgreSQL 16 | Single cluster, shared schema, `workspace_id` on every tenant row, RLS. Read replica from Phase 7. |
| Vectors | pgvector in same Postgres | HNSW indexes; embeddings table partitioned by workspace hash when > 50M rows |
| Files / media / snapshots | Object storage | Key layout: `ws/<workspaceId>/<module>/<assetId>/<versionId>/<filename>`. Private buckets; access only via short-lived signed URLs (≤ 15 min). Public System assets in a separate public bucket with no tenant secrets. |
| Cache, rate limits, pub/sub, presence | Redis/Valkey | Nothing authoritative; can be flushed safely |
| Workflow state | Temporal (its own Postgres/Cassandra or Temporal Cloud) | ADR-003 |
| Logs / traces / metrics | Observability stack | Retention: logs 30 days, traces 7 days, metrics 13 months |
| Search (Phase 1–6) | Postgres full-text (`tsvector`) + pgvector hybrid | OpenSearch only if needed (Phase 8) |

## 7. Secrets management

- Platform secrets (provider keys, DB passwords): cloud secret manager, injected as env vars at runtime; never in images.
- **Tenant secrets** (plugin OAuth tokens, BYOK keys, project env vars): stored in `secrets` table encrypted with **envelope encryption**: per-workspace data key (AES-256-GCM) encrypted by a KMS master key. Decrypted only inside workers/API at use time; never returned to the browser after creation (show last 4 chars only).
- Sandboxes receive only the secrets explicitly mapped to that project environment, as env vars, for the run's duration.
- Rotation: master key rotation yearly; data keys re-wrapped without re-encrypting data.

## 8. Environments

| Env | Purpose | Data | Providers |
|---|---|---|---|
| `local` | Developer machines | Seed data | Mock providers by default; real keys optional |
| `ci` | Automated tests | Ephemeral | Mocks + recorded fixtures only |
| `preview` | Per-PR deploys of VSN itself (optional) | Seed | Mocks |
| `staging` | Integration, demos, design partners' trial | Synthetic + opt-in partner data | Real providers, low quotas; messaging in capture mode except allow-listed numbers |
| `production` | Customers | Real | Real |

Environment variables are defined once in `packages/config/env.ts` (Zod). Missing or invalid → process exits at startup.

**Phase 0–2 variables:** `NODE_ENV`, `APP_ENV` (local|ci|staging|production), `APP_URL`, `PREVIEW_DOMAIN`, `RENDER_DOMAIN`, `ASSET_DOMAIN`, `DATABASE_URL`, `DATABASE_PLATFORM_URL` (vsn_platform role), `REDIS_URL`, `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`, `TEMPORAL_TLS_*` (cloud), `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_PRIVATE`, `S3_BUCKET_PUBLIC`, `KMS_KEY_ID` (or `LOCAL_MASTER_KEY` in local/ci only), `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `EMAIL_PROVIDER` (mock|resend|postmark|ses) + its key, `EMAIL_FROM`, `MODEL_PROVIDERS_ENABLED`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, `SANDBOX_PROVIDER` (mock|<vendor>) + key, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`, `DEPLOY_PROVIDER` (mock|<target>), `WORKER_QUEUES`, `MESSAGING_MODE` (capture|live), `PAYMENTS_MODE` (test|live), `CAPTCHA_SITE_KEY`, `CAPTCHA_SECRET`, `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT`. Later phases add their own in the same file.

## 9. Deployment

- **Containers** for every app; images built in CI, tagged by git SHA, scanned (Trivy) before push.
- **Phase 1–6 hosting**: a managed container platform (e.g., AWS ECS Fargate, Google Cloud Run, Fly.io, or Render) **[DECISION NEEDED — OD-07]**, managed Postgres with PITR, managed Redis, Temporal Cloud or self-hosted Temporal on the same platform.
- **Region**: closest viable region to Pakistan users with all needed managed services (e.g., Middle East or Europe) **[VERIFY latency & compliance]**.
- **Infrastructure as code**: Terraform for all cloud resources. No click-ops in production.
- **Migrations**: run as a one-off job before rollout; must be backwards compatible with the previous app version (expand → migrate → contract).
- **Rollout**: rolling deploy with health checks; automatic rollback on failed readiness; feature flags for risky features.
- **Customer previews/staging** (deploys of *user* projects) go to a separate isolated account/project with its own network, never the VSN control-plane network (file 14 §4).

## 10. Key interfaces (implement exactly these seams)

```ts
// packages/model-gateway
interface ModelGateway {
  generate(req: GenerateRequest, ctx: CallContext): Promise<GenerateResult>;          // text / structured
  stream(req: GenerateRequest, ctx: CallContext): AsyncIterable<StreamChunk>;
  embed(req: EmbedRequest, ctx: CallContext): Promise<EmbedResult>;
  generateMedia(req: MediaRequest, ctx: CallContext): Promise<MediaJobHandle>;       // image/audio/video
  pollMedia(handle: MediaJobHandle, ctx: CallContext): Promise<MediaJobStatus>;
  estimate(req: GenerateRequest | MediaRequest, ctx: CallContext): Promise<CostEstimate>;
}
interface CallContext { workspaceId: string; projectId?: string; actor: ActorRef; runId?: string;
  purpose: CallPurpose; routingMode: 'auto'|'fast'|'pro'|'native'|'manual'; idempotencyKey: string;
  dataPolicy: DataPolicy; }   // applicable budgets are resolved by BillingService from workspace/project/user

// packages/sandbox
interface SandboxProvider {
  create(spec: SandboxSpec): Promise<SandboxHandle>;               // image, cpu, memory, disk, ttl, egress policy
  exec(h: SandboxHandle, cmd: ExecSpec): Promise<ExecResult>;       // stdout/stderr streamed, exit code, timeout
  readFile(h, path): Promise<Uint8Array>; writeFile(h, path, data): Promise<void>;
  listFiles(h, path, opts): Promise<FileEntry[]>;
  exposePort(h, port): Promise<{ url: string; expiresAt: Date }>;
  snapshot(h): Promise<SnapshotRef>; restore(ref): Promise<SandboxHandle>;
  destroy(h): Promise<void>;
}

// packages/integrations
interface Connector { key: string; authType: 'oauth2'|'api_key'|'mcp'|'webhook'|'none';
  capabilities: Capability[]; test(conn): Promise<HealthResult>; actions: Record<string, ActionDef>;
  triggers?: Record<string, TriggerDef>; }

// delivery
interface DeployTarget { deploy(spec: DeploySpec): Promise<Deployment>; status(id): Promise<DeployStatus>;
  rollback(id): Promise<void>; destroy(id): Promise<void>; }

interface EmailProvider { send(msg: EmailMessage, key: IdempotencyKey): Promise<SendResult>; }
interface MessagingProvider { sendSms(...): Promise<SendResult>; sendWhatsAppTemplate(...): Promise<SendResult>;
  parseInbound(req): InboundMessage; }
interface PaymentProvider { createCheckout(...); createSubscription(...); cancelSubscription(...);
  createPaymentLink(...); handleWebhook(req): PaymentEvent[]; refund(...); }
```

All providers have a **mock implementation** used in `local` and `ci`, selected by env (`*_PROVIDER=mock`).

## 11. Realtime

- SSE endpoint `GET /api/v1/stream?workspaceId=…` authenticated by session. **Every event carries an `audience`:** `user:<id>` (delivered only to that user), `project:<id>` (members with `project.read`), or `perm:<permission>` (workspace members holding that permission). `chat.*`, `notification.*`, `upload.processed` for personal-scope assets and `plan.progress` for the requesting user are `user:` events; `budget.threshold` is `perm:budget.manage`. The server re-checks the audience against the connected user for each event before writing it to the stream.
- **Persisted for replay:** `run_events` (job/agent/workflow progress). Notifications are stored in their own table and refetched by the client on reconnect. Ephemeral events (`chat.delta`, `task.updated`, `comment.created`) are not persisted; on reconnect the client refetches affected queries (TanStack Query invalidation).
- Event types are defined in `packages/contracts/events.ts` (file 12 §6).
- Client reconnects with `Last-Event-ID`; server replays persisted events for up to 10 minutes, filtered by audience.
- Presence (who is viewing a task) is Phase 3+ and uses Redis with 30-second TTL.

## 12. Scalability assumptions (design for, don't pre-optimise)

| Metric | Pilot (Phase 7) | Year 2 design target |
|---|---|---|
| Workspaces | 2,000 | 50,000 |
| Monthly active users | 1,000 | 25,000 |
| Concurrent agent runs | 100 | 2,000 |
| Model calls / day | 200k | 5M |
| Stored assets | 2 TB | 100 TB |
| System public page views / day | 50k | 2M |
