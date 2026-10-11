# 13 — UI / UX Specification

## 1. Design system

### 1.1 Foundations (tokens in `packages/ui/tokens.ts`, exposed as CSS variables and a Tailwind preset)
| Token group | Values |
|---|---|
| Colour roles | `bg`, `bg-subtle`, `surface`, `surface-raised`, `border`, `text`, `text-muted`, `primary` (brand blue `#2863DF`), `primary-fg`, `accent` (teal `#0C9F81`), `success`, `warning` (`#C3791E`), `danger`, `info`, plus status colours for task states and run states. Light and dark themes; all text/background pairs ≥ 4.5:1 |
| Typography | Inter (UI), JetBrains Mono (code); scale 12/13/14/16/18/20/24/30/36/48; line-height 1.5 body, 1.2 headings |
| Spacing | 4-px base: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24 (×4 px) |
| Radius | sm 6, md 8, lg 12, xl 16, full |
| Elevation | 3 levels of shadow; dark theme uses borders more than shadows |
| Motion | 150 ms (micro), 250 ms (panels); respect `prefers-reduced-motion` |
| Breakpoints | sm 640, md 768, lg 1024, xl 1280, 2xl 1536 |
| Z-index | dropdown 50, sticky 60, overlay 70, modal 80, toast 90 |

### 1.2 Component inventory (`packages/ui`)
Primitives: Button (primary/secondary/ghost/destructive; sizes sm/md/lg; loading state), IconButton, Input, Textarea, Select, Combobox, Checkbox, Radio, Switch, Slider, DatePicker, TimePicker, FileDrop, Tag/Badge, Avatar (+ agent avatar variant with robot glyph and role colour), Tooltip, Popover, DropdownMenu, ContextMenu, Dialog, Sheet (side panel), Tabs, Accordion, Breadcrumbs, Pagination, Table (sortable, selectable, virtualised), Toast, Alert/Callout, Progress, Skeleton, EmptyState, ErrorState, PermissionDenied, Kbd, CodeBlock, Markdown renderer (sanitised), CommandPalette (⌘K).
Composites: AppShell, WorkspaceSwitcher, ProjectSwitcher, ServiceChip, StatusPill (task/run/job), CostBadge (credits with tooltip USD-equivalent hidden by default), EvidenceList, AcceptanceCriteriaEditor, ApprovalCard, RunTimeline, JobQueueItem, AssetCard, AssetViewer, VersionHistory, CommentThread, MentionInput, KanbanBoard (dnd-kit), GanttChart, DiffViewer, FileTree, PreviewFrame (device toggles), Canvas (pan/zoom), WorkflowCanvas (React Flow), CalendarView, ChartCard.

### 1.3 Voice & tone
Plain, confident, short. Say what happened and what to do next. Never blame the user. Show costs honestly. Agents speak in first person in run logs ("I ran the tests; 2 failed.") but UI chrome never anthropomorphises beyond that.

## 2. App shell & navigation

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [VSN] Workspace ▾ │ ⌘K Search / Ask VSN AI…              │ Jobs ● │ Inbox 3 │ ⚪ │
├───────────────┬──────────────────────────────────────────────────────────────┤
│ Home          │                                                              │
│ Projects      │   Page content                                               │
│ Chat          │                                                              │
│ Studios ▸     │                                                              │
│ Systems       │                                                              │
│ Marketplace   │                                                              │
│ Library       │                                                              │
│ ───────────   │                                                              │
│ Usage         │                                                              │
│ Admin (org)   │                                                              │
└───────────────┴──────────────────────────────────────────────────────────────┘
```
- **Navigation is permission- and phase-driven**: items appear only if the feature flag is on and the user has permission (FR "dynamic navigation").
- Inside a project, a **project sub-nav** replaces the main content's top: Overview · Plan (Discovery/Roadmap) · Backlog · Board · Timeline · Discussions · Agents · Assets · [enabled studio tabs] · Approvals · QA · Releases · Settings.
- Command palette (⌘K / Ctrl K): navigate, search, "Ask VSN AI", create task/project, switch workspace.
- Mobile (< 768 px): bottom nav (Home, Projects, Chat, Inbox, More); studios that need large canvases (Design canvas, Video timeline, Workflow builder) show a read-only/review mode with "Open on desktop to edit".

**URL scheme:** `/w/{workspaceSlug}/…`, projects by key `/w/{ws}/p/{PROJECT_KEY}/…`, tasks `/w/{ws}/p/{KEY}/t/{KEY-123}`.

## 3. Standard states (every screen MUST implement)

| State | Pattern |
|---|---|
| Loading | Skeletons matching layout (no spinners for > 300 ms content); streaming content shows progressive text |
| Empty | EmptyState with illustration-free icon, one sentence, one primary action, optional "Learn more" |
| Error (recoverable) | Inline ErrorState with retry; keep user input |
| Error (fatal/page) | Error page with request ID and "Report problem" |
| Permission denied | PermissionDenied with who can grant access ("Ask a project admin") — never reveal resources of other tenants (404 page instead) |
| Offline | Top banner; queue edits where safe (comments drafts), disable risky actions |
| Async job | Status pill (queued/running/succeeded/failed/cancelled), progress, elapsed, cost so far, logs link, retry if eligible |
| Budget/limit reached | Callout explaining limit, current usage, actions (raise budget / upgrade / contact admin) |
| Unsafe content blocked | Neutral message with category, guidance, appeal link (P7) |
| Coming soon (future phase) | Studio tabs and Quick Create tiles of unreleased studios show a "Studio coming soon" placeholder. Service cards in the New Project wizard stay selectable (they shape the plan) with a "Studio coming soon" note. Navigation items for unreleased modules are hidden, not shown as disabled |

## 4. Priority user journeys

| ID | Journey | Phase | Steps (screens) |
|---|---|---|---|
| J-00 | First run | P1 | PUB-01 → ON-01 → ON-02 → ON-03 (light) → GL-01 with "Start your first project" |
| J-01 | Idea → Coding + Design build | P1–P3 | GL-01 → ON-06 → ON-07 → ON-08 → PR-01 → PR-05 → PR-09 → ST-01/ST-02 → PR-11 → PR-13 (+ ST-03 in P3) |
| J-02 | Design-only, add Coding later | P3 | ON-06 (Design) → ST-03 → ST-04 → SH-01 (client review) → PR-14 enable Coding → DES-012 handoff → ST-02 |
| J-03 | Multi-service media campaign | P4 | ON-06 (Research, Images, Audio, Video) → ST-11/12 → ST-05/06 → ST-09 → ST-07/08 → PR-10 → SH-01 |
| J-04 | Install and customise a System | P6 | PUB-03/EC-01 → EC-02 → install → EC-08 setup → EC-09 tweak workflow → CX-01 test booking → EC-10 run log |
| J-05 | Personal project → team collaboration | P2 | ON-05 create org → PR-14 "Move to organization" → AD-02 invite → PR-05 assignment |
| J-06 | Review AI error / permission escalation | P2 | GL-05 notification → PR-09 run detail → PR-11 approval decide / answer question → run resumes |
| J-07 | End customer books an appointment | P6 | CX-01 → WhatsApp confirmation → CX-02 reschedule |

Prototype (Phase 0) must cover J-00, J-01 (planning part), J-04.

## 5. Screen catalogue (80 views)

Columns: **ID · Name · Route · Access · Phase · Key content & actions**. Detailed per-screen specs (layout regions, components, interactions, states, analytics events) are written by the designer per phase into `/docs/design/screens/<ID>.md` using the template in §7.

### 5.1 Public website & acquisition (PUB) — `apps/web` marketing routes
| ID | Name | Route | Access | Phase | Key content & actions |
|---|---|---|---|---|---|
| PUB-01 | Landing / Home | `/` | Public | P1 | Value proposition, example outcomes (video/gif), the 4 pillars, CTA "Start free", sign-in |
| PUB-02 | AI Studios / Capabilities | `/studios` | Public | P1 | Six studios with sample outputs; "available now / coming soon" badges driven by flags |
| PUB-03 | Systems & Templates Catalog | `/systems` | Public | P5 | Browse official Systems/Templates, industry filter, preview, "Install" → sign-up |
| PUB-04 | Industry Solutions | `/solutions/{industry}` | Public | P6 | Salon, clinic, agency, events, retail pages with a demo booking page |
| PUB-05 | Pricing & Plans | `/pricing` | Public | P1 | Plan comparison from `billing_plans` table, credit explainer, estimator, FAQ |
| PUB-06 | Documentation / API Hub | `/docs` | Public | P7 | Guides, tutorials, API reference (OpenAPI), changelog |
| PUB-07 | Trust, Security & Legal | `/trust`, `/legal/*` | Public | P1 | Security overview, sub-processors list, privacy policy, terms, AI usage policy, acceptable use |
| PUB-08 | Contact / Sales / Sponsor | `/contact` | Public | P1 | Form (CAPTCHA), partnership/sponsor inquiry type, email confirmation |

### 5.2 Authentication & onboarding (ON)
| ID | Name | Route | Access | Phase | Key content & actions |
|---|---|---|---|---|---|
| ON-01 | Sign up / Sign in | `/sign-up`, `/sign-in` | Guest | P1 | Email+password, Google, terms checkbox, error states, rate-limit/CAPTCHA |
| ON-02 | Verification / MFA / Recovery | `/verify`, `/mfa`, `/reset-password` | Guest/Member | P1 | Email code/link, TOTP challenge, backup codes, reset flow |
| ON-03 | Profile & Preferences | `/settings/profile` | Member | P1 | Name, avatar, timezone, language, default routing mode, notification matrix, theme, MFA setup, sessions |
| ON-04 | Choose / Create Workspace | `/workspaces` | Member | P1 | List personal + orgs with roles; create org button; last-used |
| ON-05 | Create Organization / Invite | `/workspaces/new` | Member (verified) | P1 | Org name, slug, plan selection (P7 payments; P1 manual/trial), invite emails with roles |
| ON-06 | New Project Wizard | `/w/{ws}/projects/new` | project.create | P1 | Steps 1–7 of file 06 §2; draft autosave; progress stepper |
| ON-07 | Connect Sources & Providers | (wizard step / `/w/{ws}/p/{KEY}/connect`) | project_admin | P2 | GitHub App install/select repo; later Figma, Drive; brand kit pick; skip |
| ON-08 | AI Plan Review / Start | `/w/{ws}/p/{KEY}/plan/review` | plan.approve | P1 | Requirements/Milestones/Tasks tabs, inline edit, regenerate section, estimates, assumptions/risks, Approve |
| ON-09 | Account, Security & Data | `/settings/account` | Self | P1 | Email/password change, linked logins, data export request & download, delete account (grace, blockers) |

### 5.3 Global authenticated workspace (GL)
| ID | Name | Route | Access | Phase | Key content & actions |
|---|---|---|---|---|---|
| GL-01 | Workspace Home | `/w/{ws}` | Member | P1 | Ask bar, "My work" (assigned tasks, approvals waiting on me), active projects, running jobs, recent assets, spend this month |
| GL-02 | All Projects | `/w/{ws}/projects` | Member | P1 | Cards/list toggle, filters (status, service, owner, team), search, create, archive/restore |
| GL-03 | Universal AI Chat | `/w/{ws}/chat/{threadId?}` | Member | P1 | Thread list, scope selector, model mode, attachments, streaming answer, citations, proposed actions, cost per message |
| GL-04 | Studio Launcher / Quick Create | `/w/{ws}/create` | Member | P3 | Six tiles, recent creations, "attach to project" |
| GL-05 | Notifications / Inbox | `/w/{ws}/inbox` | Member | P1 | Tabs: All, Mentions, Approvals, Failures, Billing; mark read; deep links |
| GL-06 | Global Search | `/w/{ws}/search?q=` | Member | P3 | Results grouped: projects, tasks, assets, discussions, runs, systems; filters; permission-filtered |
| GL-07 | Activity & Job Center | `/w/{ws}/jobs` | Member | P1 (P2 full) | All AI jobs/runs: status, project, type, started by, duration, credits; retry/stop; filters; live updates |

### 5.4 Project planning & delivery (PR) — `/w/{ws}/p/{KEY}/…`
| ID | Name | Route | Access | Phase | Key content & actions |
|---|---|---|---|---|---|
| PR-01 | Project Overview | `/overview` | project.read | P1 | Goal, services chips, milestone progress (evidence-based), blockers, next work/proposals, budget meter, activity |
| PR-02 | Discovery / Requirements | `/requirements` | project.read | P1 | Requirements list (MoSCoW), acceptance criteria, linked tasks coverage, attachments, re-plan |
| PR-03 | Roadmap & Milestones | `/roadmap` | project.read | P1 | Milestones with exit criteria and % ; drag to reorder; target dates |
| PR-04 | Backlog List | `/backlog` | project.read | P1 | Tree/grouped list, filters, bulk actions, quick add, AI "split this task" |
| PR-05 | Kanban Board | `/board` | project.read | P1 | Columns = states; cards show key, title, owner (human/agent avatar), evidence %, cost; drag with guard feedback |
| PR-06 | Task Detail | `/t/{TASK-KEY}` (drawer + full page) | project.read | P1 | Description, criteria with evidence status, checklist, owner, dependencies, assets, PRs/tests (P2), runs (P2), comments, activity, "Start agent" (P2) |
| PR-07 | Timeline & Dependencies | `/timeline` | project.read | P2 | Gantt with dependencies, critical path highlight, milestone markers |
| PR-08 | Project Discussions | `/discussions` | project.read | P1 | Threads list, decision records, question threads, link to tasks |
| PR-09 | AI Supervisor / Agent Runs | `/agents` | project.read | P2 | Supervisor status & controls, proposals, runs list, run detail (RunTimeline: steps, tool I/O summaries, approvals, cost, logs), ask_user answers |
| PR-10 | Project Asset Library | `/assets` | project.read | P1 | Project-scoped assets, filters by type/studio, versions, approvals, "used in" (P3) |
| PR-11 | Reviews & Approvals | `/approvals` | project.read | P2 | Pending/decided approvals: detail (diff, cost, recipients, deploy target), approve/reject/trust |
| PR-12 | QA / Test Evidence | `/qa` | project.read | P2 | Test runs by suite, trends, failing tests, screenshots, accessibility results, evidence coverage per requirement |
| PR-13 | Preview / Staging / Releases | `/releases` | project.read | P2 | Environments with URLs/status, deployments history, releases with notes, deploy/rollback, share link |
| PR-14 | Project Settings & Budgets | `/settings` | project_admin | P1 | General, services, members, autonomy, routing, budget, approval overrides, danger zone (archive, delete, move to org P2) |
| PR-15 | Project Secrets & Environments | `/settings/environments` | project_admin | P2 | Env vars per environment (write-only values, last4), deploy targets, egress allow-list |

### 5.5 Six AI studios (ST) — inside project `/w/{ws}/p/{KEY}/{studio}` or standalone `/w/{ws}/create/{studio}`
| ID | Name | Route suffix | Phase | Key content & actions |
|---|---|---|---|---|
| ST-01 | Coding Studio / Editor | `/code` | P2 | File tree, code viewer/editor, diff, branch/PR selector, "Ask AI to change", run timeline, terminal log |
| ST-02 | Coding Preview / Test Console | `/code/preview` | P2 | Preview iframe with device sizes, test suites, failing details, screenshots, PR checks |
| ST-03 | Design Canvas | `/design/{docId}` | P3 | Frames canvas, generate panel, element picker, property panel, tokens, variants, comments |
| ST-04 | Prototype / Design Review | `/design/{docId}/prototype` | P3 | Click-through, hotspots, review status per frame, comments, share link, handoff |
| ST-05 | Image Generate / Gallery | `/images` | P3 | Prompt, references, ratio, count, model mode, style, results grid, gallery filters |
| ST-06 | Image Editor / Variants | `/images/{assetId}` | P3 | Mask brush, instruction edit, expand, upscale, bg removal, compare, export presets |
| ST-07 | Video Brief / Storyboard | `/video/{compId}/storyboard` | P4 | Brief form, script editor, shot cards (thumb, text, duration, VO line), generate shots |
| ST-08 | Video Timeline / Export | `/video/{compId}/timeline` | P4 | Tracks (video/VO/music/captions), trim/reorder/replace, caption styling, render & export presets |
| ST-09 | Audio Generate / Voices | `/audio` | P4 | Script, voice picker (stock/cloned with consent badge), language, style, generate, history |
| ST-10 | Audio Edit / Transcribe / Dub | `/audio/{assetId}` | P4 | Waveform, segments, speaker labels, transcript editor, subtitles export, dub target language |
| ST-11 | Research Workbench | `/research` | P3 | Question, depth, plan review, live progress (sources found/read), source list with reliability |
| ST-12 | Research Report / Sources | `/research/{runId}` | P3 | Report editor with citations, claim map, unsupported-claim flags, confidence, export, save to memory |

### 5.6 Ecosystem (EC) — `/w/{ws}/…`
| ID | Name | Route | Phase | Key content & actions |
|---|---|---|---|---|
| EC-01 | Marketplace Explore | `/marketplace` | P5 | Search, type tabs (Skills, Plugins, Templates, Systems, Workflows), filters, verified badges |
| EC-02 | Marketplace Item Detail | `/marketplace/{slug}` | P5 | Overview, screenshots, plain-language permissions, versions/changelog, compatibility, install with scope |
| EC-03 | My Skills | `/skills` | P5 | Installed/private/org skills, versions, scope, enable/disable per project, update available |
| EC-04 | Skill Builder / Tester | `/skills/{id}/edit` | P5 | SKILL.md editor with frontmatter form, resources, test panel (with vs without), publish to private/org |
| EC-05 | Installed Plugins & Connections | `/connections` | P5 | Connections list: health, owner, shared, grants, last used, disconnect |
| EC-06 | Plugin Authorization Setup | `/connections/new/{connector}` | P5 | Auth step (OAuth/API key/MCP URL), scopes explanation, test, MCP tool allow-list & risk classification |
| EC-07 | Installed Systems Dashboard | `/systems` | P6 | System cards with status, version, update, today's metrics, open/settings |
| EC-08 | System Operational Workspace | `/systems/{slug}/…` | P6 | System's own nav (views), setup checklist, records, calendar, dashboards, settings, staff roles, public site toggle |
| EC-09 | Visual Workflow Builder | `/systems/{slug}/workflows/{id}` (also project workflows) | P6 | Canvas, palette, node config, validation, test, versions, activate; "Describe workflow" (AI) |
| EC-10 | Workflow Runs / Debugging | `/systems/{slug}/workflows/{id}/runs` | P6 | Runs table, step timeline with I/O, retry/re-run/cancel, messages sent |
| EC-11 | Templates Explorer / Preview | `/templates` | P5 | Project/studio/system templates, preview of what gets created, apply, fork |
| EC-12 | My Library / Knowledge Hub | `/library` | P1 | Folders, scopes tabs (Personal / Workspace), upload, search, tags, brand kits, prompts, indexing status |

### 5.7 Organization, commercial & platform operations (AD)
| ID | Name | Route | Access | Phase | Key content & actions |
|---|---|---|---|---|---|
| AD-01 | Organization Overview | `/w/{ws}/admin` | owner/admin | P1 | Members/seats, projects, pending approvals, spend this period, recent audit events |
| AD-02 | Members & Invitations | `/w/{ws}/admin/members` | admin | P1 | Members table (role, teams, last active), invite dialog, pending invites, deactivate/remove |
| AD-03 | Teams & Role Assignment | `/w/{ws}/admin/teams` | admin | P1 | Teams, members, project access by team, role reference matrix |
| AD-04 | Workspace Security & Access | `/w/{ws}/admin/security` | admin | P7 | Enforce MFA, session lifetime, approval policies (P2 basic in PR-14), data policy (allowed providers), audit log viewer & export |
| AD-05 | Subscription & Plans | `/w/{ws}/admin/billing` | owner/billing_admin | P7 | Current plan, seats, change plan, payment method (provider portal), invoices |
| AD-06 | Usage, Credits & Budgets | `/w/{ws}/usage` | billing.read; members via usage.read.own (own usage only) | P1 | Balance, period chart, breakdowns, budgets, CSV export, top consumers |
| AD-07 | AI Providers & BYOK | `/w/{ws}/admin/ai` | admin | P7 | Allowed providers/models, routing overrides, BYOK keys (write-only), data policy summary |
| AD-08 | VSN Ops: Models & Routing | `/ops/models` | operator_admin | P7 (minimal P1) | Provider health, model registry, pricing, certification status & eval scores, route table |
| AD-09 | VSN Ops: Marketplace Moderation | `/ops/marketplace` | operator_moderator | P7 | Review queue, scan results, permission diffs, approve/suspend |
| AD-10 | VSN Ops: Support / Audit | `/ops/support` | operator_support | P7 | Workspace lookup (metadata only), tickets, break-glass request/approval, audited access viewer |
| AD-11 | VSN Ops: Content Safety Review | `/ops/safety` | operator_moderator | P7 | Flagged items queue, reports, actions (remove, warn, suspend, report to authorities where legally required), appeals |

### 5.8 End-customer & shared pages (CX, SH)
| ID | Name | Route | Access | Phase | Key content & actions |
|---|---|---|---|---|---|
| SH-01 | Shared Preview / Review (guest) | `/s/{token}` | Token | P2 | Preview iframe or asset viewer, comment (if allowed, name/email), expiry notice, VSN badge |
| CX-01 | Public Booking | `{slug}.{{SYSTEMS_DOMAIN}}/book` | Public | P6 | Service → staff → time → details → consent → confirm |
| CX-02 | Manage Booking | `…/booking/{token}` | Token | P6 | View, reschedule, cancel |
| CX-03 | Invoice View & Pay | `…/invoice/{token}` | Token | P6 (pay P7) | Invoice, PDF, pay/instructions |
| CX-04 | Event RSVP | `…/rsvp/{token}` | Token | P6 | RSVP, party size, custom fields |
| CX-05 | Public Form | `…/f/{formKey}` | Public | P6 | Schema-driven form with consent |

**Count check:** PUB 8 + ON 9 + GL 7 + PR 15 + ST 12 + EC 12 + AD 11 + SH 1 + CX 5 = **80**.

## 6. Key interaction specs (high-risk UX)

- **Agent vs human ownership** is always visible: agent avatars have a distinct shape (rounded square) and label "AI · Coder".
- **Cost before action:** any action estimated > 5 credits shows the estimate inline on the button ("Generate · ~12 credits"); > approval threshold opens confirmation.
- **Approval card:** title, who/what requested, why, exact effect (diff summary / recipients count + 3 samples / deploy target + commit), cost, risk badge, expiry, Approve (primary) / Reject (requires comment) / Trust (secondary, only where allowed).
- **Evidence display:** each acceptance criterion row shows ✅/❌/⏳, evidence type icon, timestamp, link; "verified by" (CI/agent/human).
- **Destructive actions:** typed confirmation (project key) for project/workspace deletion; undo toast (10 s) for task/comment deletion.
- **Streaming:** chat and plan generation stream; "Stop generating" button; partial results kept.
- **Unsaved changes:** studio editors autosave drafts every 5 s; navigation away with unsaved changes prompts.

## 7. Per-screen spec template (`/docs/design/screens/<ID>.md`)
```
# <ID> — <Name>
Route · Access · Phase · Feature flag
Purpose (1 sentence) · Primary user goal · Entry points · Exit points
Layout regions (desktop / tablet / mobile)
Components used (from packages/ui)
Data: API calls (method + path), SSE events subscribed
Interactions (numbered)
States: loading / empty / error / permission / async / limit
Validation & copy (all strings)
Accessibility notes (focus order, keyboard shortcuts, ARIA)
Analytics events (name, properties)
Acceptance tests (Playwright scenario names)
```

## 8. Accessibility & internationalisation

- WCAG 2.2 AA; keyboard-only completion of journeys J-00, J-01, J-04, J-07 is an acceptance test.
- Focus visible (2 px ring, offset), skip-to-content link, landmarks, live regions for streaming text and job status.
- Drag-and-drop always has a keyboard/menu alternative ("Move to…").
- All strings via `next-intl`; date/number/currency formatting via `Intl` with user locale and workspace currency; PKR formatting `Rs 1,500` / `PKR 1,500` configurable.
- RTL-safe layout (logical CSS properties) for future Urdu.
- End-customer pages ship English + Urdu from P6 (business can edit Urdu strings).

## 9. Product analytics (privacy-respecting)
Self-hosted product analytics (e.g., PostHog self-hosted [VERIFY licence]) with events: `signup_completed`, `workspace_created`, `project_created{origin,services}`, `plan_generated{duration,credits}`, `plan_approved{edits_count}`, `task_moved`, `agent_run_started{agent}`, `agent_run_finished{status,credits}`, `approval_decided{action,decision}`, `asset_generated{studio}`, `system_installed{slug}`, `public_booking_created`, `upgrade_clicked`. No content (prompts, file text) in analytics. Cookie consent on marketing site.
