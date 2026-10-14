# 15 — Non-Functional Requirements, Testing, Operations, Success Metrics

## 1. Non-functional targets (provisional — confirm at Gate C)

| ID | Area | Target | Measured by | Phase enforced |
|---|---|---|---|---|
| NFR-001 | Availability (app + API) | 99.5% monthly (pilot), 99.9% (post-launch) | Uptime checks, SLO dashboard | P7 |
| NFR-002 | API latency (CRUD) | p95 < 300 ms, p99 < 800 ms at design load | APM traces, k6 | P1 |
| NFR-003 | Page performance (app) | LCP < 2.5 s, INP < 200 ms, CLS < 0.1 on mid-range laptop / 4G | Lighthouse CI, RUM | P1 |
| NFR-004 | Public System pages | LCP < 1.5 s on 4G mobile; JS < 100 KB gz | Lighthouse CI | P6 |
| NFR-005 | Chat first token | p50 < 2 s, p95 < 5 s (excluding provider incidents) | model_calls latency | P1 |
| NFR-006 | Job start latency | Queued → running < 10 s p95 (agents, studio jobs) | run timestamps | P2 |
| NFR-007 | Sandbox ready | < 20 s p95 from request to ready | sandbox metrics | P2 |
| NFR-008 | Realtime | Event published → visible in UI < 1 s p95 | synthetic test | P1 |
| NFR-009 | Durability | No accepted write lost; RPO ≤ 15 min (PITR), RTO ≤ 4 h | DR drill | P7 |
| NFR-010 | Agent reliability | 0 duplicate external side effects in chaos tests; run resume success ≥ 99% after worker loss | chaos suite | P2 |
| NFR-011 | Booking integrity | 0 double bookings under concurrency test (50 parallel same-slot) | load test | P6 |
| NFR-012 | Messaging | Reminder sent within ±2 min of scheduled time p95 (excluding quiet-hour deferral) | workflow metrics | P6 |
| NFR-013 | Scalability | Horizontal scale of API/workers with no code change to 10× pilot load | load test | P7 |
| NFR-014 | Accessibility | WCAG 2.2 AA; 0 critical axe violations on core screens | axe in Playwright | P1 |
| NFR-015 | Security | No open Critical/High findings at release | scans, pen-test | P1/P7 |
| NFR-016 | Cost efficiency | Failed-run cost < 20% of total agent spend; reconciliation variance ≤ 3% | billing analytics | P7 |
| NFR-017 | Browser support | Latest 2 versions of Chrome, Edge, Firefox, Safari; mobile Safari/Chrome for public pages | E2E matrix | P1 |
| NFR-018 | Data portability | Full workspace export (JSON + files) available within 24 h of request | job metrics | P7 |

## 2. SLOs and error budgets (Phase 7)

| SLO | Objective | Window |
|---|---|---|
| API availability (non-5xx for valid requests) | 99.9% | 28 days |
| Public System pages availability | 99.95% | 28 days |
| Agent run platform success (runs not failed due to platform errors) | 99% | 28 days |
| Workflow step execution on time | 99% within 2 min | 28 days |

Error budget burn alerts at 2% / 5% / 10% in 1 h / 6 h / 3 d windows. Feature freezes if budget exhausted.

## 3. Testing strategy

| Layer | Tool | What | Gate |
|---|---|---|---|
| Unit | Vitest / pytest | Domain logic: state machines, slot algorithm, ledger math, routing, validators, expression evaluator | Every PR |
| Contract | Zod + OpenAPI diff | Breaking API changes flagged | Every PR |
| Integration | Vitest + Testcontainers (Postgres, Redis, SeaweedFS, Temporal test server) | Repositories, services, API endpoints incl. authz and validation failures | Every PR |
| Tenant isolation | Custom harness | Every 🔒 table & route: cross-tenant read/write denied | Every PR (blocking) |
| Workflow/agent | Temporal TestWorkflowEnvironment with time-skipping | Durability, retries, signals (approvals), timers (reminders), idempotency | Every PR |
| Provider adapters | Recorded fixtures (VCR-style) + nightly live smoke on staging keys | Request/response mapping, error mapping | PR (fixtures), nightly (live) |
| E2E | Playwright | Journeys J-00…J-07 per phase; keyboard-only variants; mobile viewport for CX pages | PR (smoke), nightly (full) |
| Visual regression | Playwright screenshots / Storybook | Design system + key screens | PR on UI packages |
| Accessibility | axe-core in Playwright + Storybook a11y addon | Core screens | PR |
| Agent evals | Eval harness (file 07 §12) | Golden tasks, injection red-team | Nightly + on prompt/model change |
| Load | k6 | API CRUD, chat streaming, public booking, workflow throughput | Per phase exit |
| Chaos | Kill workers/sandboxes, inject provider errors/latency | Resume & idempotency | P2 exit, P7 |
| Security | Semgrep, gitleaks, Trivy, OSV, ZAP baseline; pen-test (P7) | | PR / nightly / pre-launch |

**Test data:** factories in `packages/test-utils`; seed scripts produce demo workspaces (personal user "Sana", org "Bilal Agency" with 3 members, salon System "Usman Salon").

**Coverage targets:** domain packages ≥ 85% lines; API ≥ 75%; UI components ≥ 60% (behaviour tests preferred over snapshot tests).

## 4. CI/CD pipeline

```
PR:   install (cache) → lint → typecheck → unit → contract diff → integration + isolation → build → e2e smoke → security scans → preview deploy (optional)
main: all of the above → build & sign images → deploy staging → migrations → e2e full on staging → (manual approval) → deploy production (rolling) → post-deploy smoke → auto-rollback on failure
nightly: full E2E matrix, agent evals, provider live smoke, load smoke, dependency audit
```
- Migrations: expand/contract; destructive migrations need a separate PR after code no longer uses the column.
- Versioning: trunk-based; release tags `vYYYY.MM.DD-N`; changelog generated from Conventional Commits.

## 5. Observability

- **Tracing:** OpenTelemetry auto-instrumentation (HTTP, Postgres, Redis, fetch) + manual spans for model calls, tool calls, workflow nodes; trace ID propagated into Temporal workflow headers.
- **Metrics (Prometheus naming):** `http_requests_total`, `http_request_duration_seconds`, `model_calls_total{provider,model,purpose,status}`, `model_call_duration_seconds`, `model_cost_usd_total`, `agent_runs_total{agent,status}`, `agent_run_steps`, `sandbox_ready_seconds`, `temporal_task_queue_backlog`, `workflow_runs_total{status}`, `messages_total{channel,status}`, `credits_reserved`, `ledger_entries_total{type}`, `bookings_created_total`, `safety_blocks_total{category}`.
- **Logs:** JSON, correlated by traceId; PII/content redaction middleware.
- **Dashboards:** API health, provider health, agent runs, sandbox fleet, Temporal queues, billing/credits, messaging, Systems public pages, safety.
- **Alerts (page on-call):** API 5xx > 2% for 5 min; provider error rate > 20% for 5 min (and auto-degrade in routing); Temporal backlog > threshold for 10 min; ledger trigger errors; reconciliation variance; public pages down; spam complaint spike; sandbox escape indicators.

## 6. Backups & disaster recovery
- Postgres: PITR (35 days) + daily logical backup to a separate account/region; quarterly restore drill into a fresh environment, verified by automated checks (row counts, sample queries, ledger balance integrity).
- Object storage: versioning enabled; cross-region replication for production buckets (P7).
- Temporal: managed service backups or Temporal Cloud; workflows are re-creatable from DB state for critical ones (supervisors, schedules) via a "rehydrate" job.
- Secrets/KMS: key backups per provider guidance.
- DR runbook: declare → freeze writes → restore DB to timestamp → restore object metadata → re-point DNS → rehydrate schedules → verify → communicate.

## 7. Operational runbooks (create in `/docs/runbooks/`)
Provider outage & manual routing override · Rotate platform provider keys · Credential leak response · Cross-tenant exposure response · Stuck Temporal workflows · Sandbox fleet exhaustion · Messaging spam incident · Payment webhook backlog · Restore deleted project (within 30 days) · DR failover · Operator break-glass procedure · Model deprecation migration.

## 8. Product success metrics and pilot criteria

### 8.1 North-star and supporting metrics
| Metric | Definition | Pilot target (set at Gate C, values provisional) |
|---|---|---|
| **North star: Verified deliverables / active workspace / week** | Tasks reaching `done` with automated or human-approved evidence | ≥ 5 |
| Activation | % of sign-ups who approve a plan and complete ≥ 1 task within 7 days | ≥ 35% |
| Time to first value | Median time from sign-up to first verified deliverable | < 30 min |
| Week-4 retention | % of activated workspaces active in week 4 | ≥ 40% |
| Agent success rate | Agent runs leading to accepted evidence / runs started | ≥ 70% |
| Human-intervention rate | Runs needing ask_user or manual fix / runs | ≤ 30% |
| Cost per verified deliverable | Credits consumed / verified tasks | Within plan economics (OD-05) |
| Systems: weekly bookings per active salon | | ≥ 20 |
| Systems: no-show reduction (self-reported or measured vs baseline) | | ≥ 20% |
| Paid conversion (pilot) | Free → paid within 30 days | ≥ 5% |
| Gross margin | (Revenue − provider − infra) / revenue | ≥ OD-05 target |
| NPS / CSAT | Quarterly survey | NPS ≥ 30 |

### 8.2 Go / no-go for public launch (end of Phase 7)
- All Gate D checklist items (file 02 §10) pass.
- 4 consecutive weeks meeting SLOs.
- ≥ 30 paying workspaces with ≥ 40% week-4 retention.
- No unresolved S1/S2 incidents; safety queue SLA met (review within 24 h).
