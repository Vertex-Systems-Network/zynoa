# VSN AI — Build Specification Pack

> **Zynoa note:** this pack was written under the working name **VSN AI**. The product is now called **Zynoa** (domains still pending, OD-02). Treat every "VSN AI" as Zynoa. Where `docs/plan/` and this pack disagree, `docs/plan/` records the newer decision and says why.

**Version:** 2.0 (build edition) · **Date:** 11 October 2026 · **Owner:** Vertex Systems Network (Pvt.) Ltd.
**Status:** Planning specification. Nothing described here is implemented yet.

This pack turns the VSN AI product concept (Sponsor SRS v1.1, UI/UX Screen Blueprint, Master Blueprint DOCX v1.0) into a **buildable specification** that a human team or an AI coding agent can follow phase by phase.

Where this pack and the earlier documents disagree, **this pack wins**. Section 17 lists every inconsistency that was resolved and how.

---

## What VSN AI is (one paragraph)

VSN AI is a multi-tenant web platform where a user describes an outcome ("build a booking app for my salon and a 30-second promo video"), and a team of AI agents plans the work, creates the deliverables (code, designs, images, audio, video, research), verifies them with evidence, and asks the human for approval before anything risky. It combines six **AI Studios**, an **AI-supervised Project OS** (tasks, board, evidence, releases), a **reusable ecosystem** (Skills, Plugins, Templates, Library, Marketplace) and installable **Business Systems** (appointments, invoices, events, CRM) driven by a **no-code workflow engine**.

---

## Files in this pack — reading order

| # | File | What it defines | Read when |
|---|------|-----------------|-----------|
| — | `ENGINEERING-RULES.md` | **Rules for the AI (or human) builder.** Phase discipline, coding standards, definition of done | Always first |
| 01 | `01_PRODUCT_VISION.md` | Problem, users, principles, glossary, non-goals | Always |
| 02 | `02_SCOPE_AND_PHASES.md` | Phases 0–8, exact scope in/out per phase, exit gates | Always |
| 03 | `03_ARCHITECTURE.md` | Tech stack, services, monorepo layout, environments, deployment | Always |
| 04 | `04_DATA_MODEL.md` | Every database table, column, relation, index, isolation rule | Before any backend work |
| 05 | `05_AUTH_TENANCY_RBAC.md` | Accounts, workspaces, Individual vs Organization, roles, permission matrix | Phase 1 |
| 06 | `06_PROJECT_OS.md` | Projects, New Project wizard, tasks, evidence, board, discussions, releases | Phase 1–2 |
| 07 | `07_AI_ORCHESTRATION.md` | Model gateway, routing, agents, supervisor, tools, approvals, budgets, evals | Phase 1–2 |
| 08 | `08_STUDIOS.md` | The six studios: features, flows, providers, job types, outputs | Phase 2–4 |
| 09 | `09_ECOSYSTEM.md` | Skills, Plugins, Templates, Library, Marketplace, package manifest | Phase 1, 5 |
| 10 | `10_SYSTEMS_AND_WORKFLOWS.md` | Systems runtime, workflow DSL, reference Systems, end-customer pages | Phase 6 |
| 11 | `11_BILLING_AND_USAGE.md` | Plans, credits ledger, reservations, budgets, payments, reconciliation | Phase 1, 7 |
| 12 | `12_API_SPEC.md` | REST conventions, errors, every endpoint group, realtime events, webhooks | Each phase |
| 13 | `13_UI_UX_SPEC.md` | Design system, navigation, all 80 screens with phase, states, flows | Each phase |
| 14 | `14_SECURITY_PRIVACY_SAFETY.md` | Threat model, sandboxing, secrets, content safety, privacy, Pakistan-specific | Each phase |
| 15 | `15_NFR_TESTING_OPS.md` | Performance/availability targets, testing strategy, CI/CD, observability, DR | Each phase |
| 16 | `16_BACKLOG.md` | Epics → user stories → acceptance criteria, per phase | Each phase |
| 17 | `17_DECISIONS_AND_OPEN_QUESTIONS.md` | Architecture decisions taken, open business decisions, traceability to old docs | When blocked |
| 18 | `18_PROMPTS_FOR_AI_BUILDER.md` | Copy-paste prompts to start and verify each phase with an AI agent | When starting a phase |

---

## How to use this pack with an AI coding agent

1. Create an empty Git repository.
2. In the Zynoa repository this pack already lives in `/docs/spec/`. The root `AGENTS.md` is the ANPOS protocol; the product engineering rules are in `/docs/spec/ENGINEERING-RULES.md`. Agents start at `AGENTS.md` → `.ai/manifest.json` → `PROJECT-IDEA.md` → `docs/plan/README.md`.
3. Open `18_PROMPTS_FOR_AI_BUILDER.md` and paste the **Phase 0 prompt**.
4. Let the agent finish the phase. Run the **phase exit checklist** from `02_SCOPE_AND_PHASES.md` yourself, or with the verification prompt in file 18.
5. Only then paste the next phase prompt. **Never ask the agent to "build everything".** The system is too large to build in one pass; agents that try will produce a broad, broken skeleton.

### How to use it with a human team

- Product owner owns files 01, 02, 16, 17.
- Tech lead owns 03, 04, 05, 07, 12, 15.
- Designer owns 13.
- Security/QA owns 14, 15.
- Each phase starts with a planning session that expands the phase's stories in `16_BACKLOG.md` into tickets.

---

## Conventions used in every file

- **MUST / MUST NOT / SHOULD / MAY** follow RFC 2119 meaning.
- **Requirement IDs** use module prefixes: `AUTH-`, `WS-`, `PRJ-`, `TSK-`, `AI-`, `AGT-`, `COD-`, `DES-`, `IMG-`, `AUD-`, `VID-`, `RES-`, `LIB-`, `SKL-`, `PLG-`, `TPL-`, `MKT-`, `SYS-`, `WF-`, `BIL-`, `SEC-`, `SAFE-`, `PRIV-`, `MSG-`, `REL-`, `NFR-`. Each requirement belongs to a **phase** (`P0`–`P8` = phase number, *not* the old P0/P1/P2 priority labels), given either in its table or by the phase of the module section it sits in (see `02_SCOPE_AND_PHASES.md`).
- **Screen IDs** keep the original blueprint IDs (`PUB-`, `ON-`, `GL-`, `PR-`, `ST-`, `EC-`, `AD-`) and add `CX-` (end-customer pages) and `SH-` (shared/guest pages).
- `{{PLACEHOLDER}}` marks a value a human must supply (domain, prices, company details).
- **[DECISION NEEDED]** marks something the business owner must decide; agents MUST NOT invent an answer. See file 17.
- **[VERIFY]** marks an external fact (provider availability, legal rule, pricing) that must be checked at implementation time.

---

## Size of the whole system (for planning)

| Measure | Count |
|---|---|
| Phases | 9 (Phase 0 to Phase 8) |
| Logical screens | 80 (71 original + 9 added) |
| Database tables | 128 |
| Requirement IDs | 277 |
| Backlog user stories | 221 |
| Indicative calendar time | 18–24 months for full scope with a team of 8–12; first sellable product (end of Phase 2) in ~6–8 months |

These are planning estimates, not commitments.
