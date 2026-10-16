# Phase 1–2 budget — DRAFT estimates (WU-P0-19)

**Status: pre-measurement draft.** AI-usage lines use list prices from the provider research (EVID-000003/004/007, 2026-10-16); WU-P0-14 (cost measurement, blocked on an API key) replaces them with measured numbers, after which this budget is finalised and the owner approves it (the Gate A item). The WU itself stays `not_started` until then — this draft exists so the owner sees the shape of the spend early.

**Covers:** Phase 1 (platform core, AI-first estimate 6–8 weeks) + Phase 2 (AI Supervisor + Coding Studio, 8–10 weeks) → **~4–4.5 months** combined (BUILD-PLAN §2). Currency: USD (≈ PKR at payment time); owner directive: nothing deploys until explicitly approved, so infra lines _start only at deployment_, not today.

## 1. People

**Owner decision (ADR-024): no developers are hired — all engineering is AI-native.** The owner is the only human (approvals, accounts, decisions); independent AI review sessions replace the second reviewer. The Lean scenario is therefore the **plan of record**; the Standard column stays only as a reference of what hiring would cost if the owner ever changed this decision.

| Item                                 | Lean (current reality)     | Standard (per BUILD-PLAN)              |
| ------------------------------------ | -------------------------- | -------------------------------------- |
| Tech lead / reviewer                 | owner's time ($0 cash)     | $1,500–3,000/mo (PK senior, part/full) |
| Full-stack engineer (2nd reviewer)   | — (AI review loop + owner) | $800–2,000/mo                          |
| Security/QA part-time (from Phase 2) | deferred to Phase 2 end    | $300–600/mo                            |
| **People subtotal / mo**             | **$0 cash**                | **$2,600–5,600**                       |

## 2. AI development tooling (the thing actually building the product)

| Item                                                  | Est./mo      | Note                                                              |
| ----------------------------------------------------- | ------------ | ----------------------------------------------------------------- |
| Claude subscription(s) for dev sessions               | $100–400     | 1–2 seats depending on parallel sessions `[OWNER: current plan?]` |
| Secondary dev AI (optional, per ANPOS multi-AI setup) | $0–200       | Codex/Gemini seat if parallel streams open                        |
| **Subtotal / mo**                                     | **$100–600** |                                                                   |

## 3. Infrastructure (starts at first deployment, est. mid-Phase 1)

| Item                                                                | Est./mo          | Source                                         |
| ------------------------------------------------------------------- | ---------------- | ---------------------------------------------- |
| AWS (Fargate API+workers, RDS db.t4g.medium, ElastiCache, KMS, NAT) | $150–210         | ADR-020 / EVID-000007                          |
| Cloudflare (R2 storage+egress, DNS, Turnstile)                      | $5–25            | R2 ~$0.015/GB-mo, no egress fee                |
| Vercel (site + dashboard previews)                                  | $0–40            | Hobby → Pro when team features needed          |
| Temporal                                                            | $0 (self-hosted) | Temporal Cloud fallback: usage-based, $0 floor |
| Domains (5, yearly ÷ 12)                                            | $5–9             | ADR-023 structure, ~$60–100/yr                 |
| Email (transactional, e.g. SES/Resend starter)                      | $0–20            | Provider TBD                                   |
| Monitoring (Sentry dev tier / OTel self-hosted)                     | $0–26            |                                                |
| **Subtotal / mo (post-deploy)**                                     | **$160–330**     | Pre-deploy: $5–9 (domains only)                |

## 4. AI providers (product usage — dev/testing + design partners)

List-price estimates; **WU-P0-14 measures real per-task costs** before Gate B pricing (OD-04/05).

| Item                                                    | Est./mo Phase 1 | Est./mo Phase 2 | Basis                                                               |
| ------------------------------------------------------- | --------------- | --------------- | ------------------------------------------------------------------- |
| Anthropic API (primary text; dev + flows testing)       | $30–100         | $150–500        | haiku $0.10/$0.50 per MTok, sonnet $2/$10 (EVID-000003 era pricing) |
| OpenAI API (second provider behind gateway)             | $10–30          | $30–100         | prepaid min $5                                                      |
| Image (BFL FLUX)                                        | $5–20           | $20–60          | ~cents/image, prepaid credits                                       |
| Audio (ElevenLabs Pro when audio studio testing starts) | $0              | $99             | paid plan = commercial license                                      |
| Search (Brave)                                          | $5–15           | $15–45          | $5/1k requests, postpaid                                            |
| Sandbox (Daytona — core of Phase 2 Coding Studio)       | $0–10           | $50–200         | ~$0.05/vCPU-h; $200 free credits first; startup credits applied for |
| Video (Gemini/Veo, paid tier only)                      | $0              | $20–80          | per-second pricing; testing only                                    |
| **Subtotal / mo**                                       | **$50–175**     | **$385–1,085**  |                                                                     |

## 5. Tools & services

| Item                                                                     | Est./mo                            | Note                                                                                |
| ------------------------------------------------------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------- |
| GitHub (free tier OK through Phase 2)                                    | $0                                 | Actions minutes within free/public repo                                             |
| Figma (1 editor)                                                         | $0–15                              | current plan `[OWNER]`                                                              |
| Design partners' usage credits (Phase 2, 5–15 partners — OD-13)          | —                                  | already inside §4's Phase-2 provider lines; fixed credit budget per partner (OD-13) |
| Legal (one-time: lawyer review of WU-P0-17 drafts + registration checks) | $300–800 one-time                  | PK counsel `[OWNER: quote]`                                                         |
| Trademark search/filing (one-time, final name)                           | $50–400 one-time                   | search vs filing                                                                    |
| **Subtotal**                                                             | **$0–15/mo + $350–1,200 one-time** |                                                                                     |

## 6. Totals

| Scenario                                           | Phase 1 (/mo) | Phase 2 (/mo) | 4.5-month total                |
| -------------------------------------------------- | ------------- | ------------- | ------------------------------ |
| **Lean** (owner-run, post-deploy infra, low usage) | ~$315         | ~$700         | **~$2,300 + $350 one-time**    |
| **Standard** (BUILD-PLAN team, high usage)         | ~$6,700       | ~$7,600       | **~$32,000 + $1,200 one-time** |

The honest planning number for the current owner-run model: **≈ $2,300–4,000 total through Gate B**, dominated by AI usage and AWS — both elastic (scale with actual use, prepaid where possible, admin-togglable providers per ADR-021 cap exposure).

## 7. Assumptions & refresh triggers

1. No salaries in Lean (owner's time); Standard shown for when hiring starts.
2. Infra starts at first deployment — **currently $0** under the no-deploy directive.
3. AI-usage lines are list-price guesses; **refresh after WU-P0-14** (20 tasks/studio measured) and at each phase gate.
4. No marketing spend included (waitlist outreach is organic per WU-P0-15 drafts).
5. FX/SBP card limits are the owner's banking reality — all providers bill USD.

> **Owner approval (Gate A item):** approve the Lean scenario as the working budget ceiling for Phases 1–2 (yes/no/adjust). Formal WU-P0-19 closure happens after WU-P0-14 replaces the estimates.
