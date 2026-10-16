# Phase 0 report — Gate A (DRAFT, toward WU-P0-20)

**Status: draft.** Final version lands when the pending items close; the owner accepts Gate A on it. Exit checklist source: `docs/plan/PHASE-0.md` / `docs/spec/02_SCOPE_AND_PHASES.md` §3. Drafted 2026-10-16.

## Gate A exit items

| #   | Exit item                                                               | Verdict             | Evidence                                                                                                                                                                                                                                                                                                                                                       |
| --- | ----------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `docker compose up` + `pnpm dev` on a clean machine < 15 min            | **PARTIAL**         | Owner ran the stack on a clean Windows machine 2026-10-16: `docker compose up -d --wait` green, all five services healthy (`docker compose ps` in issue #9; two real defects found and fixed, PRs #56/#57). **Pending:** owner confirms `pnpm install && pnpm dev` brings up web :3000 / site :3001 and that the end-to-end time from clean clone is < 15 min. |
| 2   | CI green on `main`; a failing test blocks merge                         | **PASS**            | 5 required checks on `main` via ruleset (repository-integrity, build-test, secret-scan, sast, dependency-scan) plus 2 further CI jobs on every PR that are not merge-blocking (container-build, db-integration); every PR in Phase 0 merged only on green; blocking demonstrated in practice (e.g. PR #52's lockfile failure stopped the merge until fixed).   |
| 3   | Smoke test calls a real model through the gateway, prints tokens + cost | **PENDING (owner)** | Everything but the key is ready: `packages/model-gateway` merged (PR #52, 12 tests), manual `Model smoke` workflow merged (PRs #54/#55) and dispatch-tested end to end — it reaches the script and stops only at the missing `ANTHROPIC_API_KEY` secret. Owner adds the key → one dispatch completes this item (and unblocks WU-P0-14 cost measurement).       |
| 4   | Prototype tested with ≥ 5 target users; findings written                | **PENDING (owner)** | Test kit merged (PR #68): moderator script, 12 tasks over J-01/J-04, SEQ scoring, feedback form, findings template. Owner runs ≥ 5 sessions; AI then writes `usability-test-findings.md`.                                                                                                                                                                      |
| 5   | Provider access matrix complete (✅/❌/⚠ per provider, with sources)    | **PASS**            | `docs/plans/provider-access-matrix.md` (PR #64) across LLM/media/search/sandbox/messaging/payments for a Pakistan entity; EVID-000003..000006; independent review spot-checked 6 decision-critical sources. Human-half account signups waived by owner 2026-10-16.                                                                                             |
| 6   | First segment chosen (OD-01) + Phase 1–2 budget approved                | **PENDING (owner)** | OD-01 recommendation method ready (`docs/plans/customer-validation.md`, PR #69) — needs survey/interview responses. Budget drafted (`docs/plans/phase-1-2-budget.md`, PR #70; Lean ≈ $2,300–4,000 through Gate B) — finalises after WU-P0-14 measured costs, then owner approves.                                                                              |

**Draft verdict: 2 PASS · 1 PARTIAL · 3 PENDING — all pending items are owner-side inputs (API key, usability sessions, survey responses + approvals); no engineering work remains in Phase 0.**

## What Phase 0 delivered (engineering, all merged on `main`)

- Monorepo (pnpm + Turborepo, strict TS, shared lint/format/test config) — PR #32
- Design tokens package with CSS/Tailwind/shadcn/RN outputs — PR #1
- Local environment: Postgres+pgvector, Valkey, Temporal (+UI), SeaweedFS, Mailpit — owner-verified (issue #9)
- CI: 7 jobs incl. secret/SAST/dependency scanning, container build + image scan, real-Postgres RLS suite — PRs #33+
- `packages/config` (fail-fast env, feature flags) — PR #37 · `packages/db` (Drizzle, migrations, TenantRepository + RLS) — PR #42 · `packages/contracts` + `apps/api` (Fastify, error envelope, OTel, probes) — PR #41
- `apps/web` dashboard skeleton (theme, GL-01 sidebar) — PR #46 · `apps/site` marketing skeleton + early-access waitlist — PRs #48/#69
- `packages/ui`: 15 WCAG-minded components + Storybook — PR #50 · `packages/model-gateway` + smoke workflow — PRs #52/#54/#55 · `apps/worker` Temporal HelloWorkflow e2e — PR #59
- Governance: ANPOS machine-readable plan (57 WUs) approved by owner (CONSENT-000002); ADR-001..024; evidence registry EVID-000001..7; every PR: tests-first → CI → independent AI review → merge (reviews caught 10+ real defects)

## Business track delivered

Provider matrix (#64) · decision briefs + owner decisions ADR-020..023 (#65/#66) · legal drafts (#67) · usability kit (#68) · customer-validation kit + waitlist page (#69) · budget draft (#70) · AI-native staffing decision ADR-024 (#71).

## To close Gate A (owner checklist)

1. `ANTHROPIC_API_KEY` → GitHub secret → say "done" (AI dispatches smoke, runs WU-P0-14, finalises budget).
2. Run `pnpm install && pnpm dev` once on the clean machine; note rough minutes.
3. Share prototype with ≥ 5 people using the test kit; return forms.
4. Share waitlist/survey (endpoint or form link); AI analyses → OD-01 recommendation → owner approves segment + budget.
5. Owner accepts Gate A; this report flips to final and Phase 1 opens.
