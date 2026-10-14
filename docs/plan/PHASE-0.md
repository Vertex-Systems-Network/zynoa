# Phase 0 — Validation & Engineering Foundation (AI-first)

Goal: prove people want Zynoa and that AI providers will serve a Pakistan-registered company at an acceptable cost, and give engineers a running empty platform so Phase 1 starts with features. No user-facing features, no real auth, no real data.

Duration: spec 4–6 weeks; AI-first estimate 3–4 weeks. Machine-readable copy of these work units: `config/ai/execution-plan.json` (phase `PHASE-0`). Each work unit has a GitHub issue (#7–#27) in milestone **Phase 0**.

Every work unit follows the loop in `BUILD-PLAN.md` §3 and the Definition of Done in `docs/spec/ENGINEERING-RULES.md` §5.

## Engineering work units (AI does 100%; human merges)

| ID | Work unit | Depends on | Acceptance criteria |
|---|---|---|---|
| WU-P0-00 | Design tokens package | — | `packages/tokens` builds all outputs; CI fails on stale `dist/`. **Done — PR #1** |
| WU-P0-01 | Monorepo scaffold (**Done — PR #32**) | WU-P0-00 | Layout from `REPOSITORY.md`; pnpm + Turborepo; shared TS (strict), ESLint, Prettier; `CURRENT_PHASE.md` = "Phase 0"; CODEOWNERS extended for `packages/db`, `authz`, `billing`; `pnpm install && pnpm build` passes from a clean clone |
| WU-P0-02 | Local environment (**In review — needs an owner `docker compose up` run**) | WU-P0-01 | `infra/docker/docker-compose.yml`: Postgres 16 + pgvector, Valkey, Temporal dev server + UI, SeaweedFS (ADR-015), Mailpit; README steps start everything in < 15 min on a clean machine |
| WU-P0-03 | CI (**Done — PR #33**) | WU-P0-01 | GitHub Actions: install, lint, typecheck, unit tests, build, migration check, container build; a failing test blocks merge; turbo filters by changed packages |
| WU-P0-04 | `packages/config` env + flags (**Done — PR #37**) | WU-P0-01 | Zod env schema that fails fast on missing vars; per-workspace feature-flag helper (`phaseN.*`) |
| WU-P0-05 | `packages/db` | WU-P0-02, WU-P0-04 | Drizzle setup, migration runner, empty migration, seed script, repository base class with mandatory `workspaceId` |
| WU-P0-06 | `apps/api` skeleton (**In review**) | WU-P0-04 | Fastify, `/healthz`, `/readyz`, request-id + OpenTelemetry middleware, error envelope (`docs/spec/12_API_SPEC.md` §3), OpenAPI generation |
| WU-P0-07 | `apps/web` dashboard skeleton | WU-P0-00, WU-P0-01 | Next.js App Router; tokens + shadcn bridge; light/dark/system theme; app layout skeleton with collapsible sidebar (Figma GL-01); no features |
| WU-P0-08 | `apps/site` skeleton | WU-P0-00, WU-P0-01 | Next.js marketing app with placeholder home page using tokens and typography classes; deploy preview works |
| WU-P0-09 | `apps/worker` | WU-P0-02 | Temporal worker running a `HelloWorkflow` end to end locally and in CI |
| WU-P0-10 | `packages/ui` base components | WU-P0-00 | 15 components (Button, Input, Select, Dialog, Sheet, Tabs, Table, Badge, Toast, Tooltip, DropdownMenu, Avatar, Card, EmptyState, Skeleton) matching Figma, keyboard + focus visible, WCAG 2.2 AA, in Storybook |
| WU-P0-11 | `packages/model-gateway` | WU-P0-04 | Interface + one adapter (OpenAI or Anthropic) + smoke-test script that calls a real model and prints tokens + cost. Needs an API key in GitHub secrets (human) |
| WU-P0-12 | Decision records (**Done — PR #40**) | WU-P0-01 | ADR-001…014 from `docs/spec/17_DECISIONS_AND_OPEN_QUESTIONS.md` copied to `docs/decisions/`, plus ADRs for the changes in `BUILD-PLAN.md` §8 |

## Business work units (AI does the work; human only clicks, pays, signs, decides)

| ID | Work unit | AI does | Human does |
|---|---|---|---|
| WU-P0-13 | Provider access matrix | Researches terms, Pakistan availability, billing methods, resale/embedding terms and data retention for OpenAI, Anthropic, Google (Gemini/Veo), ElevenLabs, one image provider, one search API, sandbox vendors, SMS/WhatsApp vendors, payment providers; marks each ✅/❌/⚠ with sources | Creates accounts where a signup is required to confirm; adds a card |
| WU-P0-14 | Cost measurement | Runs 20 representative tasks per studio through provider APIs; records tokens/seconds/cost; fills `docs/spec/11_BILLING_AND_USAGE.md` §3 price sheet | Provides API keys via secrets |
| WU-P0-15 | Customer validation | Builds a waitlist + survey page, interview/survey questions for PER-1…PER-5, outreach drafts; analyses responses; recommends OD-01 segment | Shares links; approves segment |
| WU-P0-16 | Prototype usability test | Test script + feedback form for the Figma prototype (journeys J-01, J-04); summarises findings | Sends the link to ≥ 5 people |
| WU-P0-17 | Legal drafts | Terms of service, privacy policy, consent language drafts (`docs/spec/14_SECURITY_PRIVACY_SAFETY.md` §10) | Lawyer review (recommended); company registration status |
| WU-P0-18 | Decision briefs | Comparison + recommendation for OD-07 hosting/region, OD-03 payments shortlist, OD-10 sandbox, OD-02 domains | Yes/no on each |
| WU-P0-19 | Phase 1–2 budget | Itemised budget: people, infrastructure, AI providers, tools | Approves |
| WU-P0-20 | Gate A report | `docs/plans/phase-0-report.md`: every exit item PASS/FAIL with evidence | Accepts Gate A |

## Human-only checklist (~6–10 hours over the phase)

- [x] Give ANPOS `Approve Technology Stack` consent (`CONSENT-000001`).
- [x] Choose Project Management System — GitHub Projects; org board "Zynoa" created with auto-add.
- [x] GitHub Rules applied and verified (`.github/rulesets/`). Secret scanning, push protection and Dependabot security updates enabled.
- [ ] Cloud, AI provider, domain and developer accounts; payment cards.
- [ ] API keys into GitHub secrets (never paste them into chat).
- [ ] Share survey and prototype links.
- [ ] Merge PRs; answer decision briefs; approve the budget.

## Exit checklist — Gate A

- [ ] `docker compose up` + `pnpm dev` starts everything on a clean machine in < 15 minutes using README instructions.
- [ ] CI green on `main`; a failing test blocks merge.
- [ ] Smoke test calls a real model through the gateway and prints tokens + cost.
- [ ] Prototype tested with ≥ 5 target users; findings written.
- [ ] Provider access matrix complete with ✅/❌/⚠ per provider and capability.
- [ ] First segment chosen (OD-01) and Phase 1–2 budget approved.

Source: `docs/spec/02_SCOPE_AND_PHASES.md` §3.
