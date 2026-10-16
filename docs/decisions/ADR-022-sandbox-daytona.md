# ADR-022: Daytona is the managed sandbox vendor

- Status: accepted (owner, 2026-10-16)
- Decides: OD-10
- Evidence: EVID-000004, docs/plans/decision-briefs.md

## Decision

AI-generated code executes in **Daytona** managed sandboxes (per-second billing, no platform fee, explicit no-training-on-customer-content commitment, startup credits). `packages/sandbox` keeps a vendor port (`SANDBOX_PROVIDER`) so E2B or self-hosted microVMs remain swap-ins.

## Conditions

Before production use: written confirmation from Daytona that serving third-party end users through Zynoa is covered by our agreement (their standard ToS reads internal-use).
