# AI-Native Pre-Plan — Zynoa

Living pre-implementation decomposition. Detailed sources are linked rather than copied; keep this file in step with `docs/plan/`.

## 1. Product Objective

Zynoa is a multi-tenant AI workspace: a user describes an outcome and a team of AI agents plans the work, creates deliverables (code, designs, images, audio, video, research), verifies them with evidence and asks the human before anything risky. For freelancers, agencies, SMEs and creators, first in Pakistan. Full vision: `docs/spec/01_PRODUCT_VISION.md`.

## 2. Scope

### In scope

Website, web dashboard, desktop (Tauri), mobile (Expo); six AI Studios; Project OS; ecosystem; Business Systems + workflow engine; billing and operator console — phased 0–8 (`docs/plan/BUILD-PLAN.md` §2).

### Out of scope / non-goals

`docs/spec/01_PRODUCT_VISION.md` non-goals; anything not in the current phase.

## 3. Current Repository Reality

- Existing implementation: none (12 Oct 2026). `packages/tokens` in PR #1.
- Existing architecture: specified only (`docs/spec/03_ARCHITECTURE.md`, `docs/plan/REPOSITORY.md`).
- Existing tests/build status: ANPOS governance tests only; child validators currently fail on vendor-stripped paths (upstream ANPOS issue).
- Existing deployments/environments: none.
- Known incomplete or temporary work: PR #1 not merged; GitHub Rules not applied.

## 4. Primary Actors and Workflows

Personas PER-1…PER-5 and journeys J-01…: `docs/spec/01_PRODUCT_VISION.md`, `docs/spec/13_UI_UX_SPEC.md` §4.

## 5. Validated Requirements

Specification requirements FR-*/NFR-* in `docs/spec/` are accepted by the owner as the build baseline. Market validation of the first segment is pending (WU-P0-15).

## 6. Assumptions Still Requiring Validation

`PROJECT-IDEA.md` → Assumptions.

## 7. Constraints and Risks

`PROJECT-IDEA.md` → Constraints; `docs/plan/BUILD-PLAN.md` §7.

## 8. Approved Technology Decisions

- Frontend: Next.js + React + Tailwind + shadcn/ui (site, dashboard); Tauri 2 (desktop); Expo (mobile)
- Backend: Fastify + Zod; Temporal (TS) + Python media worker
- Data: Postgres 16 + pgvector (Drizzle), Redis/Valkey, Cloudflare R2
- Infrastructure: Vercel or Cloudflare for front-ends; containers for API/workers; region pending (OD-07)
- Consent status: **pending** — owner proposed and discussed this stack; formal `Approve Technology Stack` not yet recorded

## 9. Options Bank Summary

Not yet recorded in `config/ai/options-bank.json`; record on stack consent.

## 10. Proposed Modules

Packages and apps in `docs/plan/REPOSITORY.md`; domain modules in `docs/spec/04`–`11`.

## 11. Phase / Milestone Strategy

Phases 0–8 with Gates A–D: `docs/plan/BUILD-PLAN.md` §2, `config/ai/execution-plan.json`.

## 12. Dependency and Critical-Path Notes

Provider access (WU-P0-13) gates Phase 2. Tokens → UI components → every UI work unit. Dashboard stability → desktop v1 (Phase 3) and mobile v1 (Phase 5).

## 13. QA Strategy

Tests-first per work unit; Vitest, Playwright, k6; tenant-isolation suite; `docs/spec/15_NFR_TESTING_OPS.md`.

## 14. Security Strategy

`docs/spec/14_SECURITY_PRIVACY_SAFETY.md`, `docs/spec/05_AUTH_TENANCY_RBAC.md`, ANPOS control-plane policies under `config/security/`.

## 15. Deployment / Operations Implications

Per-app releases (`docs/plan/REPOSITORY.md` § Releases); SLOs and DR in Phase 7.

## 16. Unresolved Human Decisions

`config/ai/project-state.json` → `unresolved_decisions`; `docs/plan/BUILD-PLAN.md` §6.

## 17. Execution Readiness

Ready for `WU-P0-01` once PR #1 is merged and stack consent is recorded.
