# 10 — Business Systems, Workflow Engine and End-Customer Pages (Phase 6)

## 1. Concept

A **System** is an installable business mini-application. It is **not** just a workflow. It contains:

| Part | Implemented by |
|---|---|
| Data | **Core modules** (typed tables with strong constraints: Contacts, Booking, Invoicing, Events/RSVP, Forms, Notifications) + **custom entities** (JSON-Schema-defined records in `system_records`) |
| Back-office UI | Declarative **views** (table, form, calendar, kanban, dashboard, detail) rendered by the Systems runtime in EC-08 |
| Public UI | Declarative **public pages** (booking, manage booking, invoice, RSVP, form) served on `{slug}.{{SYSTEMS_DOMAIN}}` |
| Logic | **Workflows** (this file §5) + core-module rules (e.g., no double booking) |
| AI | Optional AI nodes in workflows; AI assistant over the System's data (scoped) |
| Settings | Settings schema rendered as a configuration wizard |
| Messaging | Message templates per channel/locale |

**Why core modules are typed tables:** bookings need exclusion constraints, invoices need numbering and money integrity. Generic JSON records cannot guarantee these. Custom entities cover everything else.

## 2. Requirements

| ID | Requirement |
|---|---|
| SYS-001 | Install a System from marketplace/template with a configuration wizard generated from `settingsSchema` + template parameters |
| SYS-002 | Installed Systems dashboard (EC-07): cards with status, version, update available, today's metrics, open, settings, pause, archive |
| SYS-003 | System workspace (EC-08): left nav from the System's views; record CRUD with validation from JSON schema; search; filters; CSV import/export |
| SYS-004 | System roles (manager/staff/viewer) mapped to workspace members; staff see only their own calendar/records when the view is `scope: own` |
| SYS-005 | Public site toggle; slug `{slug}.{{SYSTEMS_DOMAIN}}`; custom domain (P7) with automatic TLS |
| SYS-006 | Upgrades: minor/patch auto per policy; major requires manager approval; migrations preserve data and customisations (§4) |
| SYS-007 | Customisation without code: add fields to entities, edit views (columns, filters), edit message templates, edit workflows, branding (logo, colours from brand kit) |
| SYS-008 | Uninstall with options: export all data (ZIP of JSON/CSV) then delete, or archive read-only |
| SYS-009 | Audit trail for every record change (`system_record_history`, audit events for core modules) |
| SYS-010 | AI assistant inside a System: answers questions about its data ("how many no-shows last week?") via read-only tools with the System's scope |
| WF-001 | Workflow DSL (JSON) validated by `WorkflowDefinitionSchema`; versioned; one active version |
| WF-002 | Visual builder (EC-09) with node palette, canvas (React Flow), node config side panel, validation errors inline |
| WF-003 | Triggers: record event, schedule (cron), webhook, form submission, booking event, invoice event, inbound message, manual, relative time ("24 h before booking.starts_at") |
| WF-004 | Nodes: condition, switch, filter, map/transform, delay, wait-until, loop (bounded), parallel, sub-workflow, approval, AI (classify/extract/generate), action (core module ops, message send, connector action, HTTP), set variable, end |
| WF-005 | Expressions: `{{ }}` templates using a safe expression language (JSONata subset) with access to `trigger`, `vars`, `steps.<id>.output`, `system.settings`, `now()` helpers; no arbitrary code in P6 |
| WF-006 | Test mode: run with sample trigger payload; connectors and messaging mocked (outputs from samples); shows path taken and each step's I/O |
| WF-007 | Activation requires passing validation + one successful test run; activation recorded (who/when) |
| WF-008 | Run history (EC-10): filter by status/date; step timeline; retry from failed step (if idempotent) or re-run; cancel waiting runs |
| WF-009 | Reliability: per-node retry policy (default 3 attempts, exponential backoff), timeout, error branch; idempotency key per side-effect node |
| WF-010 | Limits per plan: active workflows, runs/month, steps/run (≤ 200), loop iterations (≤ 1,000), delay ≤ 90 days |
| WF-011 | Workflow Creator: natural language → draft workflow (AI) → validator → human edits → test → activate. Never auto-activated |
| MSG-001 | Channels: email, SMS, WhatsApp (template messages + session messages within 24 h customer-care window [VERIFY current WhatsApp policy]) |
| MSG-002 | Consent: per contact, channel and purpose (transactional/marketing); marketing requires explicit opt-in evidence |
| MSG-003 | Opt-out keywords (STOP, UNSUBSCRIBE, and Urdu equivalents configurable) handled automatically; footer with opt-out for marketing email |
| MSG-004 | Quiet hours per System (default 21:00–09:00 local) → messages deferred, except explicitly urgent transactional |
| MSG-005 | Sending limits: per contact (≤ 5 messages/day default), per workspace (plan-based), bulk requires approval (file 07 §8) |
| MSG-006 | Delivery status webhooks update `messages.status`; failures visible per contact |
| MSG-007 | In non-production environments messages are captured, never delivered (except allow-listed test numbers on staging) |

## 3. Runtime: declarative schemas

### 3.1 Custom entity definition (`entities/*.json`)
```json
{
  "key": "service_note",
  "name": "Service note",
  "jsonSchema": {
    "type": "object",
    "properties": {
      "bookingId": { "type": "string", "format": "uuid", "x-ref": "core.booking" },
      "note": { "type": "string", "maxLength": 2000 },
      "products_used": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["bookingId", "note"]
  },
  "uiHints": { "titleField": "note", "searchFields": ["note"] }
}
```
User-added fields are stored as an **overlay** (`customisations.entities.<key>.addedProperties`) so upgrades can merge them (§4).

### 3.2 View definition (`views/*.json`)
```json
{
  "key": "calendar",
  "type": "calendar",                       // table | form | calendar | kanban | dashboard | detail
  "title": "Calendar",
  "source": { "module": "core.booking", "entity": "bookings" },
  "scope": "all",                           // all | own (staff see own resource)
  "calendar": { "start": "starts_at", "end": "ends_at", "groupBy": "resource_id", "colorBy": "status" },
  "actions": ["create", "reschedule", "cancel", "mark_completed", "mark_no_show"],
  "roles": ["system_manager", "system_staff"]
}
```
Dashboard views use widget definitions (`metric`, `chart`, `list`) with **predefined, parameterised queries** exposed by core modules (no free SQL).

### 3.3 Public page definition (`public/*.json`)
```json
{
  "key": "book",
  "path": "/book",
  "type": "booking_flow",                   // booking_flow | manage_booking | invoice_view | rsvp | form | info
  "steps": ["service", "staff", "time", "details", "confirm"],
  "fields": { "details": ["name", "phone", "email?", "notes?"] },
  "consentCheckboxes": [{ "channel": "whatsapp", "purpose": "transactional", "default": true, "label": "Send me booking reminders on WhatsApp" }],
  "branding": "brand_kit",
  "captcha": true,
  "locales": ["en", "ur"]
}
```

## 4. Install, configure, upgrade

**Install (Temporal `InstallSystemWorkflow`):** validate manifest & compatibility → check permissions consent → create `package_installations` + `system_instances` (status `configuring`) → create entity defs, views, forms, message templates, workflows (draft) from package → seed data (optional demo data flag) → configuration wizard (EC-08 "Setup" tab): business info, hours, staff, services, channels, branding, public slug → activation checklist (each item ✓) → `active`.

**Upgrade:** package versions carry `migrations/*.json` with ordered operations:
`addEntity`, `addProperty`, `renameProperty`, `changePropertyType (with transform)`, `addView`, `updateView (merge)`, `addWorkflow`, `updateWorkflow (only if not customised; else create new draft version + notify)`, `addMessageTemplate`, `runDataTransform (JSONata over records, batched)`.
Rules:
- Three-way merge: base (installed version) / theirs (new version) / ours (customisations). Conflicts → keep customer's version, show "Review changes" list.
- Data migrations run in batches with progress; automatic backup snapshot of the System's records before upgrade; one-click rollback to snapshot within 7 days.
- Upgrade never deletes customer data; removed fields are hidden, not dropped, until the customer confirms cleanup.

## 5. Workflow DSL (`WorkflowDefinitionSchema`)

```json
{
  "schemaVersion": 1,
  "name": "Booking reminders",
  "trigger": { "type": "booking.event", "events": ["confirmed"] },
  "variables": { "reminderHoursBefore": 24 },
  "nodes": [
    { "id": "wait1", "type": "wait_until",
      "config": { "at": "{{ $toMillis(trigger.booking.starts_at) - vars.reminderHoursBefore * 3600000 }}",
                  "cancelIf": { "event": "booking.cancelled", "match": "{{ trigger.booking.id }}" } } },
    { "id": "check", "type": "condition",
      "config": { "if": "{{ steps.wait1.output.cancelled = false and trigger.booking.status = 'confirmed' }}" } },
    { "id": "send", "type": "message.send",
      "config": { "channel": "auto",          // whatsapp → sms → email by contact consent and availability
                  "to": "{{ trigger.booking.contact_id }}",
                  "template": "booking_reminder",
                  "params": { "name": "{{ trigger.contact.name }}", "time": "{{ $formatLocal(trigger.booking.starts_at, system.timezone, 'EEE d MMM, h:mm a') }}",
                              "manageUrl": "{{ trigger.booking.manage_url }}" },
                  "purpose": "transactional" },
      "retry": { "maxAttempts": 3, "backoff": "exponential", "initialSeconds": 30 },
      "onError": "notify_staff" },
    { "id": "notify_staff", "type": "notification.internal",
      "config": { "toRole": "system_manager", "text": "Reminder failed for booking {{ trigger.booking.id }}" } }
  ],
  "edges": [
    { "from": "wait1", "to": "check" },
    { "from": "check", "to": "send", "when": "true" }
  ]
}
```

**Validation (deterministic):** graph is a DAG except explicit `loop` nodes; every node reachable from trigger; node configs match node-type schemas; expressions parse and reference existing variables/steps (static check); required connections granted; message templates exist and (for WhatsApp) are approved; limits respected.

**Execution:** a generic Temporal workflow `WorkflowInterpreter(definitionVersionId, triggerPayload, mode)` walks the graph. Each node executes as an activity (or Temporal timer for waits). Step I/O stored in `workflow_step_runs` (truncated to 64 KB, larger payloads to object storage). Side-effect nodes compute `idempotencyKey = hash(workflowRunId, nodeId, iterationIndex)`.

**Node catalogue (P6):**
| Category | Nodes |
|---|---|
| Triggers | `record.event`, `booking.event`, `invoice.event`, `rsvp.event`, `form.submitted`, `schedule.cron`, `webhook.received`, `message.inbound`, `manual`, `time.relative` |
| Logic | `condition`, `switch`, `filter`, `loop` (max iterations), `parallel` (max 10 branches), `merge`, `delay`, `wait_until`, `wait_for_event` (with timeout), `set_variables`, `end` |
| Data | `record.create`, `record.update`, `record.find`, `record.delete` (destructive → approval when bulk), `contact.upsert`, `booking.create/update/cancel`, `invoice.create/send/mark_paid`, `transform` (JSONata) |
| Communication | `message.send` (email/sms/whatsapp/auto), `notification.internal` |
| AI | `ai.classify` (labels), `ai.extract` (JSON schema), `ai.generate_text` (with template), `ai.summarize`, `ai.agent_task` (create a project task for an agent — P6 stretch) |
| Integration | `connector.action` (granted plugin actions), `http.request` (allow-listed domains, secrets by reference), `mcp.tool` (allow-listed) |
| Human | `approval.request` (wait for decision), `task.create` (assign to staff) |
| Composition | `subworkflow.call` |

## 6. Workflow builder UX (EC-09) and debugging (EC-10)

- Canvas with auto-layout (top-to-bottom), minimap, zoom; node palette search; drag to connect; right panel with node form generated from node config schema (expression fields have autocomplete of available variables).
- Inline validation badges on nodes; "Test" button opens sample trigger editor (prefilled from last real event or schema example); test run animates the path.
- Version bar: draft vs active; "Activate" (requires test pass) → confirmation showing what the workflow can do (permissions, channels, estimated monthly messages/cost).
- Run history: table with status, trigger, start, duration, cost; detail view = step timeline with I/O (secrets redacted), retry/re-run buttons, link to messages sent.

## 7. Workflow Creator (WF-011)

1. User describes: "When someone books, send WhatsApp confirmation; remind them a day before; if they don't confirm within 2 hours of reminder, alert me."
2. `workflow_builder` agent receives: System's entities, events, available nodes and connections, message templates.
3. Output: `WorkflowDefinitionSchema` JSON + list of missing prerequisites (e.g., "WhatsApp template `booking_confirm` not approved", "No WhatsApp connection").
4. Validator runs; errors fed back once for repair.
5. Draft opens in the builder with an explanation panel; user tests and activates.

## 8. Messaging details

- **Channel `auto` resolution:** WhatsApp if contact has `whatsapp_e164` + consent + approved template; else SMS if phone + consent; else email if email + consent; else skip with `blocked_consent`.
- **WhatsApp:** business-initiated messages require pre-approved templates; templates are submitted from VSN to the WhatsApp Business account via the Cloud API; status synced [VERIFY current Meta rules, pricing per conversation category].
- **SMS in Pakistan:** use a PTA-compliant aggregator with registered sender ID/mask; promotional SMS rules and DND registry compliance [VERIFY current PTA regulations]. International numbers via Twilio or equivalent.
- **Inbound:** replies to WhatsApp/SMS are stored as `messages` (inbound) on the contact timeline; keyword handling (STOP, CONFIRM, CANCEL) configurable; can trigger `message.inbound` workflows.
- **Costs:** each message priced in credits (provider cost + margin) and shown in System usage.

## 9. Reference Systems (shipped as official packages)

### 9.1 Appointments (`appointments`) — templates: Barber, Salon, Clinic, Consultant
- **Core modules:** contacts, booking, notifications, forms (intake).
- **Settings:** business name, address, timezone, currency (PKR default for PK), booking window (e.g., 30 days ahead), minimum notice (e.g., 2 h), slot granularity (15 min), cancellation policy (free until X hours), deposit (P7, needs payments), staff selection (customer chooses / any available), confirmation mode (auto-confirm / manual approval).
- **Slot algorithm:** for date D and service S: for each resource in S.resource_ids → weekly rules for weekday(D) minus closed exceptions plus open exceptions → subtract existing bookings (pending/confirmed) expanded by buffers → generate start times at granularity where `[start, start+duration+buffers)` fits → filter by minimum notice and booking window → merge across resources if "any available". Computed server-side in the System's timezone; DST-safe (use `Temporal`/`date-fns-tz`).
- **Booking creation:** transaction with `insert into bookings …`; exclusion constraint guarantees no overlap → on conflict return `409 SLOT_TAKEN` and fresh slots.
- **Views:** Calendar (day/week by staff), Bookings table, Customers, Services, Staff & hours, Dashboard (today's bookings, no-show rate, revenue estimate, busiest hours).
- **Public pages:** Book (CX-01), Manage booking — reschedule/cancel via tokenised link (CX-02).
- **Workflows:** confirmation on booking, reminder 24 h before (and optional 2 h), cancellation notice, no-show follow-up, review request after completion (marketing → consent), daily schedule summary to staff at 08:00.
- **AI options:** AI receptionist (P8) answers WhatsApp questions and books slots via the same booking API.

### 9.2 Invoices & Quotations (`invoices`)
- Numbering per System: prefix + year + sequence (`INV-2026-0001`), gap-free via sequence table locked per System.
- Quotation → convert to invoice; line items; tax rates (configurable; PK sales tax handling **[VERIFY with tax advisor]**); discounts; notes/terms; due dates.
- PDF generation (server-side HTML→PDF) with brand kit; public invoice page (CX-03) with "Pay" (P7 payment link) or bank transfer instructions + "I've paid" notification.
- Workflows: send invoice, reminders before/after due date, overdue escalation, receipt on payment, monthly recurring invoices.
- Views: invoices table, aging report dashboard, customers.

### 9.3 To-do & Team Tasks (`todo`)
- Lightweight lists for a business (separate from Project OS): tasks, assignees (staff), due dates, recurring tasks, checklists; daily digest via email/WhatsApp to staff.

### 9.4 Marketing Campaign Planner (`campaigns`)
- Custom entities: campaign, content item (channel, date, status, asset links), audience segment.
- Calendar view of content; AI generation of copy/images through studios (asset links); approval step before "scheduled"; publishing via connectors (P8 for social publishing APIs [VERIFY]); in P6 exports a schedule + assets.

### 9.5 Event RSVP (`events`) — templates: Wedding, Conference
- Events, guests (import CSV), invitation messages with personal RSVP links (CX-04), party size, meal choice fields, reminders, live headcount dashboard, check-in list export.

## 10. End-customer pages (CX-01 … CX-05)

| Screen | Purpose | Key rules |
|---|---|---|
| CX-01 Public booking | Choose service → staff (optional) → date/time → details → consent → confirm | Mobile-first; < 1.5 s LCP on 4G; no login; CAPTCHA (invisible) on submit; rate-limit per IP/phone; shows business branding; English + Urdu labels toggle |
| CX-02 Manage booking | View, reschedule, cancel via token link | Token single-purpose, expires after booking end + 7 days; cancellation policy shown |
| CX-03 Invoice view & pay | View invoice, download PDF, pay (P7) or see payment instructions | Token link; marks `viewed`; no other data exposed |
| CX-04 RSVP | Respond yes/no/maybe, party size, custom fields | Token per guest; editable until deadline |
| CX-05 Public form | Generic form (lead capture, intake) | Schema-driven; CAPTCHA; consent checkboxes |

All public pages: served by `apps/web` under the Systems domain; server-rendered; strict CSP; no third-party trackers by default (business can add analytics in P7 with consent banner); accessible (WCAG 2.2 AA); privacy notice link to the business's privacy text + VSN processor notice.

## 11. System Creator (Phase 8 — outline only)

Input: business description and processes → `system_architect` agent proposes: entities (reusing core modules first), views, public pages, workflows, message templates → validator + simulated test data run → human review screens → package created as **private** System → install. Custom code (only if modules can't express it) runs as sandboxed "code nodes" (isolated V8/WASM with time/memory limits) — not before P8.
