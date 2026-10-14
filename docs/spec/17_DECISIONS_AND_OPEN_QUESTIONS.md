# 17 — Decisions, Open Questions and Traceability

## 1. Architecture Decision Records (taken — copy each into `/docs/decisions/ADR-xxx.md` in Phase 0)

| ADR | Decision | Why | Alternatives rejected |
|---|---|---|---|
| ADR-001 | TypeScript monorepo (pnpm + Turborepo); Python only for media workers | One language for web/API/agents; strong AI-agent familiarity; shared Zod contracts | Polyglot microservices (too much overhead for team size) |
| ADR-002 | Modular monolith API + Temporal workers, not microservices | Team of 8–12; clear module boundaries keep a later split possible | Microservices from day 1 |
| ADR-003 | Temporal for all durable execution (agents, workflows, schedules, billing jobs) | Durable state, retries, timers, signals for approvals, exactly-once workflow IDs | BullMQ/Celery (no durable workflow state), custom state machines, n8n embedding (licence + control) |
| ADR-004 | Better Auth for authentication; our own tables for memberships/roles | Self-hosted, TypeScript, MFA/passkeys/OAuth; no per-MAU vendor cost; data stays in our DB | Clerk/Auth0 (cost, data residency), NextAuth (less complete MFA/org support) |
| ADR-005 | PostgreSQL shared-schema multi-tenancy with `workspace_id` + RLS | Simplest at this scale; strong isolation with defence in depth | Schema-per-tenant (migration pain), DB-per-tenant (cost) |
| ADR-006 | pgvector inside Postgres for retrieval | One database, transactional consistency, permission filtering in SQL | Separate vector DB (extra ops, sync issues) |
| ADR-007 | Own `ModelGateway` over provider SDKs (Vercel AI SDK providers inside) with DB registry | Provider independence, metering, routing, idempotency under our control | Direct SDK calls in features; third-party gateway as hard dependency |
| ADR-008 | Design Studio frames are code (React + Tailwind), not vector graphics | Lossless design→code; reuses coding stack; avoids building Figma | Vector editor (huge scope); Figma-only (dependency, API limits) |
| ADR-009 | Systems = typed core modules + JSON-schema custom entities + declarative views | Integrity for bookings/invoices; flexibility for everything else | Pure JSON record store (no constraints); generated code per System (hard to upgrade) |
| ADR-010 | Workflow engine = our JSON DSL interpreted on Temporal; UX inspired by n8n, no n8n code | Licence safety, deep integration with Systems, approvals, credits | Embedding n8n (Sustainable Use License restrictions [VERIFY]), Zapier/Make (external dependency) |
| ADR-011 | Sandboxes via `SandboxProvider` with a managed microVM vendor first | Fast start, strong isolation; can self-host Firecracker later | Docker containers on shared hosts (weak isolation) |
| ADR-012 | Previews/user content on separate registrable domains | Prevents cookie/session theft and phishing on app domain | Subdomains of app domain |
| ADR-013 | Credits as internal currency with reservation protocol | Predictable margins over volatile provider prices; budgets | Pass-through provider billing; unlimited plans |
| ADR-014 | Evidence-based progress only | Core product promise; prevents "AI said done" failures | AI self-reported progress |
| ADR-015 | SeaweedFS as local/CI S3 emulator (production stays R2) | MinIO abandoned upstream late 2025; registry stopped serving images | Keep MinIO's last image (unmaintained), S3Proxy (dependency retired), RustFS (alpha), LocalStack (heavyweight) |
| ADR-016 | Marketing site (`apps/site`) and dashboard (`apps/web`) are separate apps | Release cadence, GSAP licence isolation, failure isolation | Single app with route groups |
| ADR-017 | Desktop v1 in Phase 3 (Tauri), mobile v1 in Phase 5 (Expo) | Both reuse hosted dashboard + shared packages; cheap after Gate B | Phase 8 as first specified; native per-platform apps |
| ADR-018 | Figma file AI-UI is the visual source of truth (fonts/colours supersede §13) | Finished, WCAG-audited design with exported tokens | Re-skin to the spec's placeholder identity |
| ADR-019 | ANPOS governs the repo; builder rules moved to `ENGINEERING-RULES.md` | AI-first build needs consent/coordination/governance machinery | Spec rules alone at root |

## 2. Open business decisions (owner must decide; agents MUST NOT guess)

| ID | Decision | Needed by | Options / notes | Recommendation |
|---|---|---|---|---|
| OD-01 | **First target segment (beachhead)** | End of Phase 0 | (a) Freelance developers & small agencies (Coding-first) · (b) SMEs like salons/clinics (Systems-first) · (c) Creators/marketing teams (Media-first) | (a) for Phases 1–2 as built; validate (b) in parallel through interviews because Systems are the strongest local differentiator |
| OD-02 | Product name & domains | Phase 0 | `{{APP_DOMAIN}}`, `{{PREVIEW_DOMAIN}}`, `{{SYSTEMS_DOMAIN}}`, `{{RENDER_DOMAIN}}`, `{{ASSET_DOMAIN}}` (separate registrable domains for preview/render/user content) | Run trademark search on "VSN AI" |
| OD-03 | Payment provider(s) | Before Phase 7 (decide in Phase 0) | Must support a Pakistan-incorporated company, recurring billing, USD and/or PKR, payouts to PK bank [VERIFY each: merchant-of-record services, international gateways, local PK gateways, manual bank transfer] | Shortlist 2 in Phase 0; manual invoicing for design partners until Phase 7 |
| OD-04 | Pricing currency & price points | Gate B | PKR for local, USD for international; plan prices | From Phase 0 cost sheet + interviews |
| OD-05 | Credit value & target gross margin | Gate A/B | e.g., 1 credit = USD 0.01; margin target 50–70% on AI usage [business decision] | Decide with measured costs |
| OD-06 | Free tier size and abuse tolerance | Phase 1 | Small trial credits vs time-limited trial | Small monthly credits + verified email + phone verification for more |
| OD-07 | Cloud & hosting platform, region | Phase 0 | AWS / GCP / Azure / Fly / Render; region nearest PK with needed managed services | Pick one hyperscaler for Postgres/Redis/KMS maturity |
| OD-08 | Hosting of users' staging/production apps | Phase 2 | (a) VSN-managed hosting · (b) only user-connected targets (Vercel/Netlify/Cloudflare) · (c) both | (b) first; (a) later as paid add-on |
| OD-09 | VSN-managed Git for users without GitHub | Phase 2 | Yes (Gitea/Forgejo-based internal Git) / No (require GitHub) | Yes if OD-01 = SME or non-technical users; else No initially |
| OD-10 | Sandbox vendor | Phase 0 | Managed microVM vendors vs self-host [VERIFY pricing, region, terms] | Managed vendor first |
| OD-11 | Which AI providers at launch | Phase 0 | Based on access matrix from Pakistan entity and terms | 2–3 text providers, 1–2 image, 1 audio, 1 video |
| OD-12 | Data hosting location statement for customers | Phase 1 | Disclose region; enterprise residency later | Disclose clearly on PUB-07 |
| OD-13 | Who funds design partners' usage | Phase 2 | Free credits budget for 5–15 partners | Fixed credit budget per partner |
| OD-14 | Brand identity (logo, colours) | Phase 0 | Current mock uses blue `#2863DF` / teal `#0C9F81` | Keep unless brand work says otherwise |

## 3. Traceability to earlier documents

### 3.1 Requirement mapping

| Sponsor SRS v1.1 (HTML) | Master DOCX v1.0 | This pack |
|---|---|---|
| FR-01 Sign up / personal workspace | FR-19 (onboarding) | AUTH-001…007, WS-001 |
| FR-02 Team orgs, seats, RBAC | FR-02, FR-20 | WS-002…013, file 05 §5 |
| FR-03 New Project any combination of 6 services | FR-01 | PRJ-001…003 |
| FR-04 AI discovery, planning, decomposition | FR-03 | PRJ-007…009 |
| FR-05 Backlog, board, progress, comments, agent activity | FR-14 | TSK-001…011, AGT-008 |
| FR-06 Provider registry & Auto routing | FR-09 | AI-001…007 |
| FR-07 Coding repo, sandbox, tests, PR | FR-04, FR-05 | COD-001…015 |
| FR-08 Basic image/audio/video/design/research | FR-06, FR-07, FR-08 | DES-*, IMG-*, AUD-*, VID-*, RES-* |
| FR-09 Library, versions, reuse | FR-13 | LIB-001…011 |
| FR-10 Skills | FR-10 | SKL-001…008 |
| FR-11 Plugins / OAuth / MCP | FR-10 | PLG-001…011 |
| FR-12 Systems marketplace & templates | FR-11 | SYS-*, TPL-*, MKT-* |
| FR-13 Visual workflow builder | FR-12 | WF-001…011 |
| FR-14 Durable agents, retries, resume | FR-18 | AGT-002, AGT-005, NFR-010 |
| FR-15 Cross-service asset handoff | (section 11.2) | file 08 §8, DES-012 |
| FR-16 Preview, staging, QA, approvals | FR-15 | REL-001…004, AGT-004 |
| FR-17 Subscription, credits, budgets, ledger | FR-16 | BIL-001…014 |
| FR-18 AI-created Systems & public marketplace | (9.1 System Creator) | Phase 8: US-801, US-802 |
| FR-19 App shell, dynamic navigation | FR-20 | file 13 §2 |
| FR-20 New Project wizard | FR-01 | PRJ-001, file 06 §2 |
| FR-21 UX states | (12.3) | file 13 §3 |
| — | FR-17 Operator/admin console | AD-08…AD-11, file 12 §4.12 |
| — | FR-18 DR, interruption/resume, rollback | NFR-009, file 15 §6 |
| — | FR-21 Import/export & data controls | AUTH-007, SYS-008, NFR-018 |
| — (missing before) | — | SAFE-* content safety, MSG-* messaging, CX-* end-customer pages, SH-01 sharing, PR-15 secrets |

### 3.2 Phase and gate mapping

| This pack | Sponsor SRS v1.1 | Master DOCX v1.0 | Funding gate (this pack) | Old gates |
|---|---|---|---|---|
| Phase 0 | Phase 0 | M0 | **Gate A** at end | HTML A · DOCX A |
| Phase 1 | Phase 1 | M1 + M2 (+ part of M3) | — | DOCX B |
| Phase 2 | part of Phase 2 (Coding) | M3 + coding part of M4 | **Gate B** at end | HTML B · DOCX C |
| Phase 3–4 | rest of Phase 2 | M4 + M5 | — | — |
| Phase 5–6 | Phase 3 | M5 (Systems) | **Gate C** at end | HTML C · DOCX D (partly) |
| Phase 7 | Phase 4 (pilot/hardening) | M6 | **Gate D** at end | HTML D · DOCX D/E |
| Phase 8 | Phase 4 (System Creator R&D) | M7 | — | DOCX E |

### 3.3 Screen changes vs the 71-view blueprint
- Kept all 71 IDs. Replaced P0/P1/P2 priority labels with **delivery phase** (file 02 §12).
- Added 9: ON-09 (account & data), PR-15 (secrets & environments), SH-01 (guest share), CX-01…CX-05 (end-customer pages), AD-11 (content safety review). Total **80**.
- Resolved priority conflicts from the audit: team/RBAC screens (ON-05, AD-01…03) moved into Phase 1 to match the requirement; approvals/QA/releases screens (PR-11…13) delivered with the coding studio in Phase 2; model routing admin has a minimal Phase 1 ops page and full AD-08 in Phase 7; workflow builder/runs (EC-09/10) delivered with Systems in Phase 6; video timeline and audio editing (ST-08/10) delivered in Phase 4 where the campaign journey needs them.

## 4. Phase 0 customer interview guide (summary)

For each persona (file 01 §3), 30–45 minutes:
1. Walk me through the last time you [built a website for a client / ran a campaign / handled bookings]. Which tools? How long? What went wrong?
2. Where do you lose the most time? What did it cost you?
3. Have you tried AI tools for this? What happened? What would make you trust an AI to do part of it?
4. Show prototype J-01 or J-04: think aloud. What's confusing? What's missing?
5. Who else is involved (clients, staff, approvers)? How do you share work today?
6. What do you pay today for these tools? What would you pay for this, monthly? In PKR or USD?
7. For SMEs: how do customers book today (WhatsApp, calls)? No-show rate? Would customers use a booking link? Which language?
8. What would make you stop using it after a week?
Record findings in `/docs/research/interviews/` and synthesise into OD-01 recommendation.

## 5. Known risks (top 10) and mitigations

| Risk | Mitigation in this spec |
|---|---|
| Scope far exceeds team capacity | Phase gates; build-one-phase rule; first sellable product at Phase 2 |
| Provider access/billing from Pakistan entity blocked | Phase 0 access matrix; multi-provider gateway; BYOK option |
| Agent quality insufficient for paying users | Eval harness, evidence verifier, human approvals, design-partner feedback loop |
| Media costs exceed revenue | Reservations, budgets, estimates, credit pricing from measured costs |
| Cross-tenant data leak | Repository scoping + RLS + isolation suite in CI |
| Abuse (spam, deepfakes, phishing) leads to provider/payment bans | Content safety pipeline, messaging consent/limits, public page scanning, AUP |
| Payment provider unavailable for PK company | OD-03 early; manual invoicing fallback |
| Systems upgrades break customer data | Migrations with 3-way merge, snapshots, rollback |
| Competitors move faster | Focus on beachhead + local fit (WhatsApp, PKR, Urdu public pages) |
| Key-person dependency | Spec + ADRs + runbooks in repo; AI-readable documentation |
