# Zynoa — Total Build Plan

Status: agreed plan, 12 Oct 2026. Technology stack is **proposed** until the project owner gives the ANPOS `Approve Technology Stack` consent.

Zynoa is built in nine phases (0–8). The first sellable product arrives at the end of Phase 2 (Gate B); the full scope follows. One TypeScript monorepo produces the website, the web dashboard, the desktop app (Tauri) and the mobile app (Expo). The code is written by AI agents; humans approve plans, merges, accounts, money and security.

## 1. Final stack

| Part | Choice | Notes |
|---|---|---|
| Website (marketing) | Next.js App Router + React + Tailwind + shadcn/ui; Motion + GSAP for animation | GSAP only on the marketing site — its licence forbids use inside a no-code visual animation builder, so never in the Design Studio animation tooling |
| Web dashboard | Next.js + shadcn/ui + Radix, TanStack Query, Zustand, react-hook-form + Zod | Shared UI in `packages/ui`, tokens in `packages/tokens` |
| Desktop (Windows / macOS) | Tauri 2 shell that loads the hosted dashboard, plus official plugins (notifications, deep links, updater, file access) | Remote-loaded, so no Next.js static export needed |
| Mobile (iOS / Android) | React Native + Expo | Shares tokens, Zod schemas and API client with the web |
| API | Fastify + Zod, OpenAPI | Server-Sent Events for live updates |
| Background jobs | Temporal (TypeScript) + Python media worker (FFmpeg) | Long AI and media work |
| Database | Postgres 16 + pgvector (Drizzle), Redis/Valkey | Neon has no India / Middle East region; nearest is Singapore — measure latency from Pakistan |
| Auth | Better Auth | Email verification via a transactional email provider |
| AI | Vercel AI SDK behind the ModelGateway; E2B-style sandboxes | Providers swappable |
| Storage | Cloudflare R2 | |
| Security edge | Cloudflare WAF + Turnstile | |
| Hosting | Front-ends: Vercel or Cloudflare Workers (OpenNext). API + workers: containers (Fly / Railway / Render / Cloud Run) | Region pending (OD-07) |
| Testing | Vitest, Playwright, k6 | |
| Monorepo | pnpm + Turborepo | See `REPOSITORY.md` |

## 2. Roadmap

| Phase | Duration (spec) | AI-first estimate | Delivers | Apps |
|---|---|---|---|---|
| 0 — Validation & foundation | 4–6 wk | 3–4 wk | Interviews/validation, provider access matrix, cost sheet, monorepo + CI + local env, tokens + 15 base components | Figma prototype (done) |
| 1 — Platform core | 10–12 wk | 6–8 wk | Sign-up, personal + org workspaces, projects, AI plan, task board, Library, AI chat, credits — 32 screens | **Website live** (PUB-01/02/05/07/08) + dashboard v1 |
| 2 — AI Supervisor + Coding Studio | 12–16 wk | 8–10 wk | Agents write code in sandboxes, run tests, open PRs, live previews; approvals and releases — 10 screens | Dashboard — **first sellable product**, 5–15 design partners · **Gate B** |
| 3 — Design, Research, Images | 10–14 wk | 12–16 wk (3+4) | UI design, cited research, images, design→code handoff, asset graph — 8 screens | **Desktop v1** (Tauri: notifications, deep links, auto-update) |
| 4 — Audio & Video | 10–14 wk | (with 3) | Voiceover, transcription, dubbing, storyboard→video — 4 screens | Desktop: local file drag-and-drop for media |
| 5 — Ecosystem & Marketplace | 8–10 wk | 14–18 wk (5+6) | Skills, Plugins (OAuth/API/MCP), Templates, marketplace — 8 screens | **Mobile v1** (Expo): inbox, approvals, notifications, chat |
| 6 — Business Systems & Workflows | 14–18 wk | (with 5) | Appointment/Invoice/To-do/Campaign systems, public booking/payment pages, WhatsApp/SMS/email automation, workflow builder — 10 screens · **Gate C** | Mobile: system alerts + bookings |
| 7 — Hardening & commercial launch | 10–14 wk | 8–10 wk | Online payments, operator console, moderation, security + load tests, DR drill — 8 screens · **Gate D** | All apps public, signed, in stores |
| 8 — Growth | ongoing | ongoing | System Creator, community marketplace, enterprise SSO, Urdu RTL, Digital Employees | Mobile full, RTL everywhere |

Gates: **A** after Phase 0 (skeleton runs, prototype tested, budget approved) · **B** after Phase 2 (first sale) · **C** after Phase 6 (systems pilot) · **D** after Phase 7 (public launch). Exit checklists: `docs/spec/02_SCOPE_AND_PHASES.md`.

Totals: spec says ~80–100 weeks sequential, 18–24 months with two streams from Phase 3; first sale ~6–8 months. AI-first estimate: first sale ~4–6 months, full scope ~12–16 months. These are estimates, not commitments — speed is limited by human review, not by how fast agents write code.

## 3. How AI builds it (loop per work unit)

1. **Phase plan** — AI reads the spec and writes `docs/plans/phase-N.md` (stories in dependency order, migrations, risks, demo script). Human approves.
2. **Tests first** — AI writes tests for the acceptance criteria.
3. **Code** — AI implements until tests pass.
4. **CI** — lint, typecheck, unit/integration/e2e subset. Failure → back to 3.
5. **Review agent** — a different, fresh agent session reviews (prompt in `docs/spec/18_PROMPTS_FOR_AI_BUILDER.md` §3). Findings → back to 3.
6. **Human merge** — PR approved and merged by a human.
7. **Staging + demo** — AI deploys; human looks.
8. Next work unit. After the last one: phase exit checklist + demo script → next phase.

| Work | AI agent | Human |
|---|---|---|
| Phase plan | Writes it | Approves |
| DB, API, workers, UI | Tests then code; migrations; OpenAPI | PR review/merge |
| UI from design | Figma MCP + Code Connect → React | Visual check |
| Code review | Second agent, fresh session | Merge decision |
| Infra / CI | Docker, GitHub Actions, IaC | Cloud accounts, billing, secrets, domains |
| Security | Checklists, dependency scanning | Sign-off; external pentest in Phase 7 |
| Business | Research, drafts, analysis, cost sheets | Accounts, cards, signatures, final decisions |
| Desktop / mobile release | Tauri + Expo code, build configs | Apple / Google / Windows developer accounts, code signing, store submission |

## 4. Team

Minimum for Phases 0–2: 1 tech lead (runs agents, reviews every PR), 1 full-stack engineer (second reviewer, infra, debugging), product + design (project owner), part-time security/QA and DevOps from Phase 2. From Phase 3, two parallel streams each need a reviewer → 5–6 people. Spec's full human-team table: `docs/spec/02_SCOPE_AND_PHASES.md` §13.

Tools: one AI coding agent seat per engineer plus API credits for parallel agents; GitHub (repo + Actions); Figma Dev Mode + MCP; staging, sandbox vendor, error tracking. Prices not yet checked — record real rates in the Phase 0 budget.

## 5. Design status

Done in Figma (`docs/design/README.md`): website, dashboard light + dark, developer handoff (HO-00…HO-10), launch assets, interactive components, prototype overlays, accessibility audit (23 failing contrast pairs → 0). Tokens exported to `packages/tokens`.

Still open:

- [ ] AI gradient decision — end stop `#F472B6` is 2.65:1; recommended option A `#4F46E5 → #7C3AED → #DB2777`.
- [ ] Desktop frames (title bar, tray, offline) — before Phase 3.
- [ ] Mobile frames (inbox, approvals, chat) — before Phase 5.
- [ ] Urdu RTL — scope option B (~12% extra design work) recommended; build in Phase 8.
- [ ] Figma version lock (ANPOS design intake) before design approval.

## 6. Pending decisions

| Decision | Needed by | Recommendation |
|---|---|---|
| OD-07 Hosting + region | Phase 0 | Front-ends on Vercel/Cloudflare; API + DB on one hyperscaler; test latency from Pakistan |
| OD-03 Payment provider | Shortlist in Phase 0, live in Phase 7 | Must support a Pakistan company + recurring billing; manual invoicing until then |
| OD-01 First segment | End of Phase 0 | Developers / small agencies (Coding-first) |
| OD-04 Pricing (PKR / USD) | Gate B | Fix the website-vs-spec pricing mismatch first |
| OD-10 Sandbox vendor | Phase 0 | Managed vendor first |
| OD-02 Name + domains | Phase 0 | Product name is Zynoa; domains not yet bought |
| Desktop code signing | Before Phase 3 | Apple Developer account + Windows code-signing certificate |
| Company name + press email | Before launch | For press kit and footer |
| Technology stack consent | Before WU-P0-01 merges | ANPOS `Approve Technology Stack` |

## 7. Risks

| Risk | Impact | Fallback |
|---|---|---|
| AI providers refuse access/billing to a Pakistan company | Phase 2 blocked | Access matrix in Phase 0; two providers per capability behind ModelGateway |
| No payment provider | Online revenue late | Manual invoicing / bank transfer until OD-03 resolves |
| AI cost above credit price | Margin gone | Phase 0 cost sheet, credit value fixed at Gate A/B, per-workspace limits |
| Singapore DB latency | Slow dashboard | Redis cache, edge front-end, revisit region |
| Scope creep | Beyond 24 months | Phase exit checklists; no new studios before Gate B |
| Store review and signing | Launch delay | Certificates before Phase 3; TestFlight / internal tracks early |
| ANPOS child validators fail after bootstrap | CI red on the governance check | Upstream fix in ANPOS (see PR description); do not weaken validators locally |

## 8. Changes from the spec

| Spec says | Plan says | Why |
|---|---|---|
| Product name "VSN AI" | **Zynoa** | Rename |
| One `apps/web` for marketing + app | `apps/site` (marketing) + `apps/web` (dashboard) | Different release cadence; GSAP only on site; a site bug cannot block an app release |
| Desktop and mobile in Phase 8 | Desktop v1 in Phase 3, mobile v1 in Phase 5 | Both reuse the hosted dashboard / shared packages, so they are cheap once the dashboard is stable |
| Inter only; blue `#2863DF` / teal `#0C9F81` | Plus Jakarta Sans + Inter + JetBrains Mono; stone neutrals, indigo accent, violet→pink AI gradient | Final Figma design (`docs/design/README.md`) |
| Root `AGENTS.md` = product rules | Root `AGENTS.md` = ANPOS; product rules in `docs/spec/ENGINEERING-RULES.md` | ANPOS governance adopted |
