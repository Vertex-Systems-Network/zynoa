# Phase-0 decision briefs (WU-P0-18)

Four open decisions from `docs/spec/17_DECISIONS_AND_OPEN_QUESTIONS.md`, each with a comparison, a recommendation and a yes/no for the owner. Inputs: `docs/plans/provider-access-matrix.md` (WU-P0-13), EVID-000003…000007. Researched 2026-10-16.

---

## OD-07 — Cloud & hosting platform, region (EVID-000007)

**What's being hosted:** Fastify API + Temporal workers (containers), Postgres 16 + pgvector, Valkey, KMS for envelope encryption. Front-ends already go to Vercel/Cloudflare; object storage already decided (Cloudflare R2, ADR in spec).

| Option  | Nearest region                                 | Managed PG+pgvector         | KMS | Small setup/mo | Verdict                                     |
| ------- | ---------------------------------------------- | --------------------------- | --- | -------------- | ------------------------------------------- |
| **AWS** | Mumbai / UAE / Bahrain                         | ✅ RDS                      | ✅  | ~$150–170      | **Recommended**                             |
| GCP     | Mumbai / Delhi                                 | ✅ Cloud SQL                | ✅  | ~$250–280      | 1.5–2× AWS; PK not on billing-currency list |
| Render  | Singapore                                      | ✅                          | ❌  | ~$75–135       | **Runner-up** (pair with external KMS)      |
| Fly.io  | bom compute only; managed PG has **no Mumbai** | ⚠                           | ❌  | ~$65–80        | DB would sit in Singapore                   |
| Railway | Singapore                                      | ⚠ containerized, not mature | ❌  | ~$100–120      | Doesn't meet PG-maturity bar                |
| Hetzner | Singapore                                      | ❌ self-managed             | ❌  | ~€25–50        | Cost floor, zero managed services           |

**Recommendation:** **AWS, region ap-south-1 (Mumbai)** — only near-PK option with the spec's "one hyperscaler for Postgres/Redis/KMS maturity"; Temporal Cloud is co-located in ap-south-1 with a $0-floor Developer tier (self-host Temporal on Fargate first, Temporal Cloud as escape hatch). **Gate before locking the region:** Karachi→Mumbai latency reports conflict (~70ms direct vs ~200ms when PK–India transit routes via Europe) — run probes from PTCL/Transworld/Jazz; if Mumbai measures badly, take **me-central-1 (UAE)** (same services, similar cost, likely better PK routing).

> **Owner decision:** approve AWS as the hyperscaler (yes/no), and approve "Mumbai unless PK-ISP probes say UAE" (yes/no).

---

## OD-03 — Payment providers (shortlist of 2) (EVID-000006)

Constraint set: Pakistan-incorporated company, recurring billing, USD + PKR, payouts to a PK bank. **Stripe is not available to PK businesses** ([stripe.com/global](https://stripe.com/global)) — this removes the default answer and forces a merchant-of-record (MoR) for international sales.

| Candidate               | PK seller                                | Recurring | Payout            | Note                                            |
| ----------------------- | ---------------------------------------- | --------- | ----------------- | ----------------------------------------------- |
| **Lemon Squeezy (MoR)** | ✅ verified (PK on bank-payout list)     | ✅        | PK bank           | Platform risk post-Stripe-acquisition — monitor |
| Paddle (MoR)            | ⚠ markets to PK; eligibility unpublished | ✅        | bank/Payoneer     | Needs written confirmation                      |
| **Safepay (local)**     | ✅                                       | ⚠ verify  | PKR settlement    | 2.9%+Rs30 domestic; SBP space                   |
| PayFast (local)         | ⚠ unpublished terms                      | ⚠         | PKR               | Sales contact needed                            |
| Payoneer                | receiving only                           | ❌        | PK bank (~3% fee) | Not a checkout                                  |

**Recommendation (the shortlist of 2):** **Lemon Squeezy** for international USD subscriptions (the only _verified_ PK-eligible MoR) + **Safepay** for PKR/local checkout. Keep Paddle as the upgrade path if it confirms PK eligibility in writing (more mature MoR). Spec fallback stands: manual invoicing for design partners until Phase 7.

> **Owner decision:** approve the Lemon Squeezy + Safepay shortlist (yes/no).

---

## OD-10 — Sandbox vendor (EVID-000004)

Managed microVM vendor first (spec default), self-host later if volume justifies it.

| Candidate   | Billing                                                                     | Terms                                                         | Data                                          |
| ----------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------- |
| **Daytona** | per-second usage, no platform fee; $200 credits; up to $50k startup credits | ⚠ internal-use ToS — get written OK for serving third parties | ✅ explicitly no training on customer content |
| E2B         | $150/mo Pro + usage                                                         | ⚠ same written-OK need                                        | ⚠ broad license to submitted data             |

**Recommendation:** **Daytona** — cheaper structure (~$0.05/vCPU-h, no monthly fee), explicit no-training commitment, startup credits. Condition: request written confirmation that serving third-party end users through Zynoa is covered before production use (both vendors' standard ToS need this).

> **Owner decision:** approve Daytona as the Phase-0/1 sandbox vendor (yes/no).

---

## OD-02 — Product name & domains

Working name is **Zynoa** (repo, UI metadata). Spec requires **separate registrable domains** for user content/preview/render — same-registrable-domain hosting of user content is a cookie/XSS risk (the reason vercel.com serves apps from vercel.app, and Google uses googleusercontent.com).

**Recommended structure** (five placeholders from spec 17):

| Placeholder          | Suggestion                                      | Why                                                                          |
| -------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `{{APP_DOMAIN}}`     | `zynoa.com` (fallback `zynoa.ai` / `zynoa.app`) | Brand + dashboard + marketing                                                |
| `{{PREVIEW_DOMAIN}}` | `zynoa.dev`                                     | Build/preview links, dev connotation                                         |
| `{{RENDER_DOMAIN}}`  | `zynoarender.com`                               | User-generated published apps/pages — must be a different registrable domain |
| `{{ASSET_DOMAIN}}`   | `zynoausercontent.com`                          | User uploads via R2/CDN — isolate cookies entirely                           |
| `{{SYSTEMS_DOMAIN}}` | `zynoa.site` (or subdomain of render domain)    | Installed business-system public pages                                       |

Notes: availability/pricing not checked from here — registrars block automated lookups; checking takes the owner ~10 minutes at Namecheap/Cloudflare Registrar (Cloudflare Registrar sells at cost and the DNS will live on Cloudflare anyway). Submit `zynoarender.com` and `zynoausercontent.com` to the **Public Suffix List** once user content ships (Phase 2+). Spec asks for a trademark search on the old name "VSN AI"; the live name is Zynoa — run the (basic) search on **"Zynoa"** instead: WIPO Global Brand DB + IPO-Pakistan, plus a plain web/social-handle search.

> **Owner decision:** approve the five-domain structure (yes/no); buy `zynoa.com`/`.dev`/`.site` + `zynoarender.com` + `zynoausercontent.com` if available (~$60–100/yr total at cost-price registrars), or report which are taken so we pick alternates.

---

## Decision record

When the owner answers, each yes becomes an ADR (OD-07 → ADR-020 hosting, OD-03 → ADR-021 payments, OD-10 → ADR-022 sandbox, OD-02 → ADR-023 domains) and the env placeholders in `.env.example` get real values.
