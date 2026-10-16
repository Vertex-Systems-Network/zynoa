# ADR-020: AWS is the hosting platform; Mumbai region pending latency probes

- Status: accepted (owner, 2026-10-16)
- Decides: OD-07
- Evidence: EVID-000007, docs/plans/decision-briefs.md

## Decision

The API, Temporal workers, Postgres (RDS + pgvector), Valkey (ElastiCache) and KMS run on **AWS**. Default region **ap-south-1 (Mumbai)**; before the first deployment the region is confirmed with latency probes from Pakistani ISPs (PTCL/Transworld/Jazz) — if Karachi→Mumbai routing measures poorly, **me-central-1 (UAE)** is used instead (same service set). Front-ends stay on Vercel/Cloudflare, objects on Cloudflare R2 (existing decisions). Temporal self-hosts on AWS first; Temporal Cloud (available in ap-south-1, $0-floor Developer tier) is the managed escape hatch.

## Alternatives rejected

GCP (~1.5–2× AWS in Mumbai; Pakistan not on its billing-currency list), Render Singapore (no KMS; runner-up), Fly.io (managed Postgres has no Mumbai region), Railway (Postgres maturity), Hetzner (no managed services near PK).

## Consequences

Small-setup cost ~$150–170/mo when deployed (nothing deploys yet — owner no-deploy directive stands); envelope encryption uses AWS KMS (`KMS_KEY_ID`); account signup needs a USD-capable card.
