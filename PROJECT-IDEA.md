# Project Idea

> This file is the repository's persistent intake record. The AI keeps it current from the project owner's input. Detailed, decided plan: `docs/plan/README.md`.

## Intake Status

`COMPLETE` (12 Oct 2026)

## Raw User Input

Collected from the project owner across the design and planning sessions (original language Roman Urdu; key statements preserved):

- Build **Zynoa**, an AI workspace (product spec written as "VSN AI"): website + dashboard + apps, and also a desktop app ("abhi hamari es me desktop app bhi banni ha").
- Owner's proposed stack: Next.js + React, TypeScript, Tailwind CSS, shadcn/ui + custom VSN design system, Motion + GSAP where needed, Better Auth, PostgreSQL on Neon, transactional email for verification, Cloudflare WAF + Turnstile, Cloudflare Workers or Vercel, Cloudflare R2. Considering Tauri + React + Next for desktop on Windows/Mac.
- "Ye total system AI se banana ha" — the whole system is to be built by AI; humans only where unavoidable.
- "Git pr es ko kase manage krringe" — one place for website, dashboard, apps and desktop software.
- Add the ANPOS AI-native development blueprint to this repository and put the full plan here "take koi cheez miss na ho jaye" and so any AI knows what to do and where to start.
- Design work happens in Figma file AI-UI; design tokens must be exported for code.

## Normalized Understanding

### Explicit Requirements

- Multi-tenant AI workspace: AI Studios, AI-supervised Project OS, ecosystem (Skills, Plugins, Templates, Library, Marketplace), installable Business Systems with a workflow engine — full definition in `docs/spec/01_PRODUCT_VISION.md`.
- Surfaces: marketing website, web dashboard, desktop app (Windows/macOS), mobile app (iOS/Android).
- Built primarily by AI agents under ANPOS governance; humans approve plans, merges, money, accounts, security.
- Single monorepo for all surfaces (`docs/plan/REPOSITORY.md`).
- Light + dark themes; WCAG 2.2 AA; Urdu RTL later.

### Facts

- Full build specification exists: `docs/spec/` (18 files, phases 0–8, data model, API, UI/UX, security, backlog).
- Figma design is complete for website and dashboard (light + dark), with developer handoff and an accessibility audit (`docs/design/README.md`).
- Design tokens are exported (`packages/tokens`, PR #1).
- Repository was empty before 12 Oct 2026; no application code exists yet.
- Owner organisation: Vertex Systems Network (Pvt.) Ltd., Pakistan.

### Assumptions

- AI providers (OpenAI, Anthropic, Google, ElevenLabs, etc.) will serve a Pakistan-registered company — **to verify in WU-P0-13**.
- First segment is developers / small agencies (Coding-first) — **to validate in WU-P0-15**.
- AI-first delivery reaches first sale in ~4–6 months and full scope in ~12–16 months — estimate only.
- Singapore is the nearest acceptable database region — **latency to measure**.

### Preferences

- Stack as listed in `docs/plan/BUILD-PLAN.md` §1 (owner's list, refined: Expo for mobile, Tauri for desktop, Fastify API, Temporal workers).
- Project management: **GitHub Projects** (selected 2026-10-12).
- Communication with the owner in Roman Urdu; UI copy in English.

### Constraints

- Pakistan-registered company: payment providers and AI provider billing are uncertain (OD-03, WU-P0-13).
- GSAP licence: not allowed inside a no-code visual animation builder → never in Design Studio animation tooling.
- Never store or request credentials in chat; secrets only in GitHub Environments / secret manager.
- The owner's email must not be sent to unrelated services.

### Existing Research / Search / References

- `docs/spec/*` (Sponsor SRS v1.1, UI/UX blueprint and master blueprint consolidated into the build pack).
- Tauri Next.js guide, Neon regions, GSAP licence — cited in the planning doc ("Zynoa — Total Build Plan").
- Figma file `rTRJFBfNUHHCCzkcReZuJH`.

### Open Questions

- GitHub Team plan (needed for branch rules); GitHub Project board creation.
- OD-07 hosting/region, OD-03 payments, OD-10 sandbox, OD-02 domains, OD-04 pricing.
- AI gradient colour decision; desktop and mobile frames; RTL scope.
- Company legal name and press email for launch assets.

### Risks / Unknowns

See `docs/plan/BUILD-PLAN.md` §7.

## Research Status

`PARTIAL` — product spec and stack research done; market validation and provider access are Phase 0 work units (WU-P0-13, WU-P0-15).

## Planning Status

`PLAN_AND_STACK_APPROVED` — phases, apps per phase and Phase 0 work units are in `docs/plan/`; current phase is Phase 0; next work unit is `WU-P0-01`.
