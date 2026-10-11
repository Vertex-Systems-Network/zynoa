# Zynoa — where to start (for every AI agent and human)

This is the single entry point for building Zynoa. Read it after the ANPOS protocol files and before touching code.

## Reading order

1. `AGENTS.md` → `.ai/manifest.json` — ANPOS protocol: roles, consent, Supervisor/Worker rules, quality gates. These win over everything below.
2. `PROJECT-IDEA.md` — normalized project intake (what Zynoa is, facts vs assumptions, open questions).
3. **This folder (`docs/plan/`)** — the current, decided plan:
   - [`BUILD-PLAN.md`](BUILD-PLAN.md) — final stack, phases 0–8, where website / dashboard / desktop / mobile land, team, timeline, AI build loop, pending decisions, risks.
   - [`REPOSITORY.md`](REPOSITORY.md) — monorepo layout, branches, CI, releases per app, secrets.
   - [`PHASE-0.md`](PHASE-0.md) — the current phase: every work unit, who does it (AI vs human), acceptance criteria, Gate A.
4. `docs/spec/` — the full product specification (written under the working name "VSN AI"). Start with `docs/spec/README.md`, then `docs/spec/ENGINEERING-RULES.md` (coding standards, tenant isolation, Definition of Done).
5. `docs/design/README.md` — Figma file, page and frame IDs, handoff pages, design decisions still open.
6. `packages/tokens/README.md` — design tokens (after PR #1 is merged).

## Precedence when documents disagree

1. Explicit current instruction from the project owner.
2. ANPOS protocol (`AGENTS.md`, `.ai/manifest.json`, `config/**`).
3. `docs/plan/*` — newer decisions; each difference from the spec is listed in `BUILD-PLAN.md` § "Changes from the spec".
4. Figma (`docs/design/README.md`) for anything visual.
5. `docs/spec/*`.

## Current state (12 Oct 2026)

| Item | State |
|---|---|
| Current phase | **Phase 0 — Validation & Engineering Foundation** |
| Design (Figma) | Complete for website, dashboard light + dark, handoff specs, overlays, accessibility audit. Not formally version-locked yet |
| Design tokens | `packages/tokens` — merged (PR #1) |
| ANPOS | Child bootstrap applied (PR #2). PM: GitHub Projects — org board "Zynoa" created by the owner (auto-add from this repo); milestone "Phase 0" + issues #7–#27. Secret scanning, push protection and Dependabot security updates enabled. GitHub Rules active and verified (rulesets `main-protection`, `main-review`, `coordination-refs`; repo is public). Development AI selection still open |
| Technology stack | **Approved** — `CONSENT-000001` |
| Application code | None yet |

**Next valid work unit:** `WU-P0-01` (monorepo scaffold, issue #8) in [`PHASE-0.md`](PHASE-0.md).

Work tracking: GitHub milestone **Phase 0** — one issue per work unit (`WU-P0-xx`). Close the issue from the PR that completes it (`Closes #N`).

## Non-negotiable working rules

- One phase at a time. `CURRENT_PHASE.md` (created in WU-P0-01) names it. Never start a later phase's stories.
- One story (work unit) per agent session; large phases go epic by epic.
- Tests first, then code. Every new table and route joins the tenant-isolation suite.
- Every PR is reviewed by a **different** agent session than the one that wrote it, then merged by a human.
- A phase ends only when its exit checklist passes with evidence (`docs/plans/phase-N-report.md`).
- Never build "everything at once"; never invent completion, approvals, accounts or credentials.
