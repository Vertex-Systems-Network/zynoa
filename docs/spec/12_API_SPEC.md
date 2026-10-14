# 12 — API Specification

The REST API is the **only** way the web app reads or writes data. OpenAPI 3.1 is generated from Zod contracts in `packages/contracts` and published at `/api/v1/openapi.json` (staging) for tooling.

## 1. Conventions

- Base path: `/api/v1`. JSON only (`application/json; charset=utf-8`), except file uploads (presigned URLs) and SSE.
- Auth: session cookie (web) or `Authorization: Bearer <api_key>` (Phase 7).
- Workspace context: routes are nested under `/workspaces/{workspaceId}/…`. The server verifies membership on every request.
- IDs: UUIDv7 strings. Task references also accept keys (`WEB-142`) at `/projects/{projectId}/tasks/by-key/{key}`.
- Naming: plural nouns, kebab-case paths, camelCase JSON fields.
- Pagination: cursor-based. Request `?limit=50&cursor=<opaque>`; response `{ data: [...], nextCursor: string|null }`. Max limit 200.
- Filtering: `?filter[status]=ready,running&filter[ownerType]=agent`; sorting `?sort=-updatedAt`.
- Partial update: `PATCH` with only changed fields; optimistic concurrency via `If-Match: "<version>"` (integer row version, file 04 §0) → `412 PRECONDITION_FAILED` on mismatch. Responses include `ETag: "<version>"`.
- Idempotency: all `POST` that create resources or cause side effects accept `Idempotency-Key` header (required for billing, messaging, deploy, agent-run start); stored 24 h.
- Time: ISO 8601 UTC strings.
- Rate limits: headers `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`; `429` with `Retry-After`.

## 2. Response envelope

Success:
```json
{ "data": { ... }, "meta": { "requestId": "req_..." } }
```
List:
```json
{ "data": [ ... ], "nextCursor": "eyJ...", "meta": { "requestId": "req_..." } }
```

## 3. Errors

```json
{ "error": { "code": "BUDGET_EXCEEDED", "message": "Project budget reached (5,000 credits).",
             "details": { "budgetId": "…", "limit": 5000, "spent": 5000 }, "requestId": "req_..." } }
```

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Zod validation; `details.issues[]` with path/message |
| 401 | `UNAUTHENTICATED` | No/expired session |
| 403 | `EMAIL_NOT_VERIFIED` | Action requires a verified email (US-102) |
| 401 | `REAUTH_REQUIRED` | Sensitive action needs recent re-auth |
| 402 | `INSUFFICIENT_CREDITS`, `BUDGET_EXCEEDED`, `LIMIT_REACHED` | Billing/limits (`details.upgradeUrl`) |
| 403 | `FORBIDDEN` | Visible resource, missing permission |
| 403 | `POLICY_DENIED` | Approval policy denies action |
| 404 | `NOT_FOUND` | Missing or other tenant's resource |
| 409 | `CONFLICT`, `PERSONAL_WORKSPACE_SINGLE_HUMAN`, `SLOT_TAKEN`, `INVALID_STATE_TRANSITION`, `DEPENDENCY_CYCLE` | Domain conflicts |
| 412 | `PRECONDITION_FAILED` | `If-Match` mismatch |
| 413 | `PAYLOAD_TOO_LARGE` | |
| 422 | `UNSAFE_CONTENT` | Content safety block (`details.categories`) |
| 422 | `MODEL_NOT_ELIGIBLE`, `CAPABILITY_UNAVAILABLE` | Routing/provider capability |
| 429 | `RATE_LIMITED` | |
| 500 | `INTERNAL` | Unhandled server error (message never includes internals) |
| 502/503 | `PROVIDER_UNAVAILABLE`, `SERVICE_UNAVAILABLE` | Upstream failures after fallbacks |

## 4. Endpoint groups

Notation: `GET /path` — permission — phase. `{ws}` = `/workspaces/{workspaceId}`, `{p}` = `{ws}/projects/{projectId}`.

### 4.1 Auth & profile (Better Auth handles `/api/auth/*`)
| Method & path | Permission | Phase |
|---|---|---|
| `GET /me` (user, memberships, active workspace, preferences) | authenticated | P1 |
| `PATCH /me` · `PATCH /me/preferences` | self | P1 |
| `GET /me/sessions` · `DELETE /me/sessions/{id}` · `DELETE /me/sessions` | self | P1 |
| `POST /me/data-exports` · `GET /me/data-exports/{id}` | self, re-auth | P1 |
| `POST /me/deletion` · `DELETE /me/deletion` (cancel) | self, re-auth | P1 |
| `GET /me/notifications` · `POST /me/notifications/read` | self | P1 |

### 4.2 Workspaces & members
| Method & path | Permission | Phase |
|---|---|---|
| `GET /workspaces` · `POST /workspaces` (organization) | authenticated, verified email | P1 |
| `GET {ws}` · `PATCH {ws}` · `DELETE {ws}` | workspace.read / update / delete | P1 |
| `POST {ws}/transfer-ownership` | workspace.transfer, re-auth | P1 |
| `GET {ws}/members` · `PATCH {ws}/members/{userId}` · `DELETE {ws}/members/{userId}` | workspace.read / member.role.change / member.remove | P1 |
| `GET {ws}/invitations` · `POST {ws}/invitations` (batch) · `POST {ws}/invitations/{id}/resend` · `DELETE {ws}/invitations/{id}` | member.invite | P1 |
| `POST /invitations/accept` `{token}` | authenticated | P1 |
| `GET/POST {ws}/teams` · `PATCH/DELETE {ws}/teams/{id}` · `PUT {ws}/teams/{id}/members` | team.manage | P1 |
| `GET/PUT {ws}/approval-policies` | policy.manage | P2 |
| `GET {ws}/audit-events` (filters, CSV export) | audit.read | P1 |

### 4.3 Projects, plans, tasks
| Method & path | Permission | Phase |
|---|---|---|
| `GET {ws}/projects` · `POST {ws}/projects` (creates draft) | project.read / project.create | P1 |
| `GET {p}` · `PATCH {p}` · `DELETE {p}` · `POST {p}/archive` · `POST {p}/restore` | project.* | P1 |
| `PUT {p}/wizard-state` · `POST {p}/wizard/complete` | project.update | P1 |
| `PUT {p}/services` | project.update | P1 |
| `GET {p}/members` | project.read | P1 |
| `PUT {p}/members` | project.member.manage | P1 |
| `POST {p}/discovery-questions` (AI) | plan.generate | P1 |
| `POST {p}/plans` (generate; returns job) · `GET {p}/plans` · `GET {p}/plans/{planId}` | plan.generate / project.read | P1 |
| `PATCH {p}/plans/{planId}/items` (bulk edit draft items) · `POST {p}/plans/{planId}/regenerate-section` | plan.edit | P1 |
| `POST {p}/plans/{planId}/approve` · `POST {p}/plans/{planId}/reject` | plan.approve | P1 |
| `GET/POST {p}/requirements` · `PATCH/DELETE {p}/requirements/{id}` | task.* | P1 |
| `GET/POST {p}/milestones` · `PATCH/DELETE {p}/milestones/{id}` | task.* | P1 |
| `GET {p}/tasks` (filters, view=list|board|tree) · `POST {p}/tasks` | task.read / task.create | P1 |
| `GET {p}/tasks/{taskId}` · `PATCH {p}/tasks/{taskId}` · `DELETE {p}/tasks/{taskId}` | task.* | P1 |
| `POST {p}/tasks/{taskId}/transition` `{to, reason?}` | task.update (+ guards) | P1 |
| `POST {p}/tasks/{taskId}/move` `{status, beforeId?, afterId?}` (board) | task.move | P1 |
| `PUT {p}/tasks/{taskId}/dependencies` | task.update | P1 |
| `GET/POST {p}/tasks/{taskId}/checklist` · `PATCH/DELETE …/{itemId}` | task.update | P1 |
| `GET/POST {p}/tasks/{taskId}/evidence` | task.read / task.update (human attestation) | P1 |
| `GET {p}/tasks/{taskId}/events` | task.read | P1 |
| `GET/POST {ws}/comments?targetType=&targetId=` · `PATCH/DELETE {ws}/comments/{id}` | comment.create (on target) | P1 |
| `GET/POST {p}/discussions` · `PATCH {p}/discussions/{id}` · `POST {p}/discussions/{id}/record-decision` | comment.create / project.update | P1 |
| `GET {p}/activity` | project.read | P1 |
| `GET {p}/memory` · `POST {p}/memory` · `DELETE {p}/memory/{id}` | project.read / project.update | P2 |

### 4.4 AI: chat, models
| Method & path | Permission | Phase |
|---|---|---|
| `GET {ws}/models` (eligible models + modes for this workspace) | workspace.read | P1 |
| `GET/POST {ws}/chat/threads` · `GET/PATCH/DELETE {ws}/chat/threads/{id}` | self | P1 |
| `POST {ws}/chat/threads/{id}/messages` → returns `{messageId, streamUrl}`; tokens streamed via SSE `chat.delta` | self (+ scope perms) | P1 |
| `POST {ws}/chat/messages/{id}/actions/{actionId}/execute` | permission of the action | P1 |
| `POST {ws}/estimates` (any billable request → credits estimate) | workspace.read | P1 |

### 4.5 Agents, runs, approvals
| Method & path | Permission | Phase |
|---|---|---|
| `GET {ws}/agents` (definitions available) | workspace.read | P2 |
| `POST {p}/tasks/{taskId}/runs` `{agentKey, instructions?}` | agent.run (Idempotency-Key required) | P2 |
| `GET {ws}/runs` (Job Center: P1 lists `job_runs`; P2 adds `agent_runs`; filters project/status/type) · `GET {ws}/runs/{runId}` · `GET {ws}/runs/{runId}/steps` | run.read | P1/P2 |
| `POST {ws}/runs/{runId}/pause|resume|cancel|retry` | agent.run | P2 |
| `POST {ws}/runs/{runId}/messages` (answer `ask_user`) | agent.run | P2 |
| `GET/PATCH {p}/supervisor` · `POST {p}/supervisor/start|pause|stop` | supervisor.control | P2 |
| `GET {p}/supervisor/proposals` · `POST …/proposals/{id}/accept|dismiss` | agent.run | P2 |
| `GET {ws}/approvals?status=pending&projectId=` · `GET {ws}/approvals/{id}` | approval visibility | P2 |
| `POST {ws}/approvals/{id}/decide` `{decision: approve|reject, comment?, trust?: boolean}` | approval.decide(.production) | P2 |

### 4.6 Library & assets
| Method & path | Permission | Phase |
|---|---|---|
| `POST {ws}/uploads` → presigned PUT URL(s) (multipart for large) · `POST {ws}/uploads/{id}/complete` | asset.write / library.*.write | P1 |
| `GET {ws}/assets` (scope, folder, type, tag, project, q) · `POST {ws}/assets` (from completed upload) | per scope | P1 |
| `GET/PATCH/DELETE {ws}/assets/{id}` · `POST {ws}/assets/{id}/restore` | per scope | P1 |
| `GET {ws}/assets/{id}/versions` · `POST {ws}/assets/{id}/versions` · `POST …/versions/{vid}/restore` | per scope | P1 |
| `GET {ws}/assets/{id}/versions/{vid}/download` → 302 to signed URL (≤ 15 min) | asset.read | P1 |
| `PUT {ws}/assets/{id}/links` · `PUT {ws}/assets/{id}/tags` | asset.write | P1 |
| `POST {ws}/assets/{id}/approve|reject` | asset.approve | P1 |
| `GET {ws}/assets/{id}/graph` (dependencies/dependants) | asset.read | P3 |
| `GET/POST {ws}/folders` · `PATCH/DELETE {ws}/folders/{id}` | per scope | P1 |
| `GET {ws}/search?q=&types=&scope=` (global search, hybrid) | filtered by permissions | P1 (assets), P3 (global) |
| `GET/POST {ws}/brand-kits` · `PATCH/DELETE {ws}/brand-kits/{id}` | library.workspace.write | P1 |
| `GET/POST {ws}/prompts` · `PATCH/DELETE {ws}/prompts/{id}` | per scope | P1 |

### 4.7 Coding & delivery
| Method & path | Permission | Phase |
|---|---|---|
| `GET {ws}/git/connections` · `POST {ws}/git/github/install-url` · `GET /git/github/callback` | connection.create | P2 |
| `GET {ws}/git/connections/{id}/repositories` | connection owner | P2 |
| `POST {p}/repositories` `{source: connected|vsn_managed|template, …}` · `GET {p}/repositories` · `DELETE …/{id}` | project.update | P2 |
| `POST {p}/repositories/{id}/audit` (AI audit job) | agent.run | P2 |
| `GET {p}/repositories/{id}/tree?ref=` · `GET …/file?path=&ref=` · `GET …/diff?base=&head=` | project.read | P2 |
| `GET {p}/pull-requests` · `GET {p}/pull-requests/{id}` | project.read | P2 |
| `GET {p}/test-runs` · `GET {p}/test-runs/{id}` | project.read | P2 |
| `GET/PUT {p}/environments` · `GET/PUT/DELETE {p}/environments/{env}/secrets/{name}` (values write-only) | environment.manage / secret.manage | P2 |
| `POST {p}/deployments` `{environment, ref}` · `GET {p}/deployments` · `POST {p}/deployments/{id}/rollback` | release.staging / release.production (approval) | P2 |
| `GET/POST {p}/releases` · `PATCH {p}/releases/{id}` | release.* | P2 |
| `POST {ws}/share-links` · `GET {ws}/share-links?targetType=&targetId=` · `DELETE {ws}/share-links/{id}` | share_link.create | P2 |
| `GET /shared/{token}` (+ `POST /shared/{token}/comments`) — public, rate-limited | token | P2 |

### 4.8 Studios
| Method & path | Permission | Phase |
|---|---|---|
| `POST {ws}/studio-jobs` `{studio, jobType, projectId?, taskId?, params}` (Idempotency-Key) | asset.write (+ project) | P3–P4 |
| `GET {ws}/studio-jobs` · `GET/DELETE {ws}/studio-jobs/{id}` (cancel) | self / project.read | P3 |
| `GET/POST {p}/design-documents` · `GET/PATCH {ws}/design-documents/{id}` | project.read / asset.write | P3 |
| `POST {ws}/design-documents/{id}/frames` (AI generate) · `PATCH {ws}/design-frames/{id}` (deterministic edits) · `POST {ws}/design-frames/{id}/ai-edit` | asset.write | P3 |
| `POST {ws}/design-frames/{id}/handoff` (create coding tasks) | task.create | P3 |
| `POST {ws}/research-runs` · `GET {ws}/research-runs/{id}` (+ sources, claims) | asset.write | P3 |
| `GET/POST {ws}/voice-profiles` · `POST {ws}/voice-consents` · `POST {ws}/voice-consents/{id}/revoke` | asset.write, re-auth for clone | P4 |
| `GET/PATCH {ws}/video-compositions/{id}` · `POST …/{id}/render` | asset.write | P4 |

### 4.9 Ecosystem
| Method & path | Permission | Phase |
|---|---|---|
| `GET /marketplace/packages?type=&q=&category=` · `GET /marketplace/packages/{slug}` | authenticated (+ visibility) | P5 |
| `POST {ws}/installations` `{packageVersionId, scope, config}` · `GET {ws}/installations` · `PATCH/DELETE {ws}/installations/{id}` · `POST …/{id}/upgrade` | package.install / system.install | P5/P6 |
| `GET/POST {ws}/skills` (create/import) · `PATCH {ws}/skills/{id}` · `POST {ws}/skills/{id}/test` | per scope | P5 |
| `GET {ws}/connectors` (catalog) · `GET/POST {ws}/connections` · `DELETE …/{id}` · `POST …/{id}/test` | connection.create | P5 |
| `GET /connections/oauth/callback` | state-bound | P5 |
| `PUT {ws}/connections/{id}/grants` | connection.grant | P5 |
| `POST {ws}/packages` (publish private/org) · `POST {ws}/packages/{id}/versions` | package publish | P5 |
| `POST /hooks/{pathToken}` (incoming webhooks; HMAC) | signature | P5 |

### 4.10 Systems & workflows
| Method & path | Permission | Phase |
|---|---|---|
| `GET {ws}/systems` · `GET/PATCH {ws}/systems/{id}` · `POST {ws}/systems/{id}/activate|pause|archive` · `POST {ws}/systems/{id}/export` | system.* | P6 |
| `GET {ws}/systems/{id}/entities` · `PATCH {ws}/systems/{id}/entities/{key}` (add fields) | system_manager | P6 |
| `GET/POST {ws}/systems/{id}/records/{entityKey}` · `GET/PATCH/DELETE …/{recordId}` · `POST …/import` · `GET …/export` | system role | P6 |
| `GET/POST {ws}/systems/{id}/contacts` · `PATCH/DELETE …/{id}` · `PUT …/{id}/consents` | system role | P6 |
| `GET/POST {ws}/systems/{id}/resources` · `…/services` · `…/availability` | system_manager | P6 |
| `GET {ws}/systems/{id}/bookings?from=&to=&resourceId=` · `POST` · `PATCH {…}/bookings/{bid}` · `POST …/{bid}/cancel|complete|no-show` | system role | P6 |
| `GET/POST {ws}/systems/{id}/invoices` · `PATCH …/{iid}` · `POST …/{iid}/send|void|payments` | system role | P6 |
| `GET/POST {ws}/systems/{id}/events` · `…/events/{eid}/guests` (CSV import) | system role | P6 |
| `GET/POST {ws}/workflows` · `GET/PATCH/DELETE {ws}/workflows/{id}` | system_manager / project.update | P6 |
| `POST {ws}/workflows/{id}/versions` (save draft) · `POST {ws}/workflows/{id}/validate` · `POST {ws}/workflows/{id}/test` · `POST {ws}/workflows/{id}/activate` · `POST …/pause` | same | P6 |
| `POST {ws}/workflows/generate` `{systemInstanceId, description}` (Workflow Creator) | same | P6 |
| `GET {ws}/workflow-runs` · `GET {ws}/workflow-runs/{id}` (+ steps) · `POST …/{id}/retry|cancel` | same | P6 |
| `GET/POST/PATCH {ws}/systems/{id}/message-templates` · `POST …/{tid}/submit-whatsapp` | system_manager | P6 |
| `GET {ws}/systems/{id}/messages?contactId=` | system role | P6 |
| `POST /messaging/webhooks/{provider}` (delivery + inbound) | provider signature | P6 |

**Public marketing API:** `POST /api/v1/public/contact` `{name, email, type: sales|partnership|sponsor|support, message, captchaToken}` — rate-limited, emails `{{SALES_INBOX}}` (P1).

**Public (end-customer) API** — served under `/api/v1/public/sites/{slug}/…`, no session, CAPTCHA token on writes, strict rate limits:
| Method & path | Phase |
|---|---|
| `GET …/info` (branding, services, staff public names, policies) | P6 |
| `GET …/availability?serviceId=&resourceId=&date=` | P6 |
| `POST …/bookings` (Idempotency-Key) → `{bookingId, manageUrl}` | P6 |
| `GET/PATCH …/bookings/manage/{token}` · `POST …/bookings/manage/{token}/cancel` | P6 |
| `GET …/invoices/{token}` · `GET …/invoices/{token}/pdf` · `POST …/invoices/{token}/payment-intent` (P7) | P6/P7 |
| `GET/POST …/rsvp/{token}` | P6 |
| `POST …/forms/{key}` | P6 |

### 4.11 Billing & usage
| Method & path | Permission | Phase |
|---|---|---|
| `GET {ws}/billing/summary` (plan, credits, period, limits usage) | billing.read, or usage.read.own (response limited to the actor's own usage) | P1 |
| `GET {ws}/usage?groupBy=day|project|studio|model|user&from=&to=` · `GET {ws}/usage/export.csv` | billing.read, or usage.read.own (filtered to the actor) | P1 |
| `GET/PUT {ws}/budgets` · `PUT {p}/budget` | budget.manage | P1 |
| `GET /plans` (public) | public | P1 |
| `POST {ws}/billing/checkout` · `POST {ws}/billing/portal` · `POST {ws}/billing/credit-packs` | billing.manage | P7 |
| `GET {ws}/billing/invoices` · `GET …/{id}/pdf` | billing.read | P7 |
| `POST /billing/webhooks/{provider}` | provider signature | P7 |

### 4.12 Operator (`/api/v1/ops/*`, operator roles only, separate auth check + MFA required)
`GET /ops/workspaces` · `POST /ops/workspaces/{id}/credit-adjustments` · `POST /ops/workspaces/{id}/suspend` · `GET/PUT /ops/providers` · `GET/PUT /ops/models` · `POST /ops/models/{id}/certify` · `GET /ops/safety/queue` · `POST /ops/safety/{id}/action` · `GET /ops/packages/review-queue` · `POST /ops/access-grants` (break-glass) · `GET /ops/metrics/unit-economics` · `GET /ops/reconciliations` — P1 (minimal: workspaces, credits, provider health) → P7 (full).

## 5. File uploads

1. `POST {ws}/uploads` `{filename, mimeType, size, scope, projectId?, folderId?}` → server validates type/size/quota → returns `{uploadId, parts:[{partNumber, url}] | url, expiresAt}` (presigned to `ws/<id>/uploads/<uploadId>`).
2. Browser PUTs directly to object storage.
3. `POST {ws}/uploads/{id}/complete` → server verifies object size/sha256 (client-computed, re-checked by worker), malware scan job, creates asset + version, starts extraction/indexing job.

## 6. Realtime events (SSE)

`GET /api/v1/stream?workspaceId=…` → `text/event-stream`. Event envelope: `id: <run_events.seq>` (only persisted events have ids), `event: <type>`, `data: {workspaceId, projectId?, audience, payload}`. On reconnect the server replays persisted `run_events` by seq; notifications and ephemeral events are refetched by the client (file 03 §11).

| Event type | Payload | Phase |
|---|---|---|
| `notification.created` | notification | P1 |
| `task.created` / `task.updated` / `task.deleted` | task summary + changed fields | P1 |
| `comment.created` | comment | P1 |
| `plan.progress` / `plan.ready` | step text / planId | P1 |
| `chat.delta` / `chat.completed` | messageId, text delta / final message + citations | P1 |
| `job.updated` | job/run status, progress %, credits | P1 |
| `upload.processed` | assetId, indexing status | P1 |
| `run.step` | runId, step summary | P2 |
| `run.status` | runId, status | P2 |
| `approval.requested` / `approval.decided` | approval summary | P2 |
| `deployment.updated` | deployment status/url | P2 |
| `studio.job.updated` | job status, output asset ids | P3 |
| `workflow.run.updated` | run status | P6 |
| `booking.created` / `booking.updated` | booking summary (system staff only) | P6 |
| `budget.threshold` | scope, pct | P1 |

## 7. Outgoing webhooks (Phase 7, for customers)

Workspace admins can register endpoints for events: `task.*`, `run.*`, `approval.*`, `deployment.*`, `booking.*`, `invoice.*`, `workflow.run.*`. Signed with HMAC-SHA256 (`VSN-Signature: t=<ts>,v1=<sig>`), retries with exponential backoff for 24 h, delivery log in UI.
