# ADR-021: Multi-provider payments behind an admin-togglable abstraction

- Status: accepted (owner, 2026-10-16)
- Decides: OD-03
- Evidence: EVID-000006, docs/plans/decision-briefs.md

## Decision

The owner chose "add them all, with admin enable/disable": `packages/billing` implements a **provider-agnostic payment port** with adapters for Lemon Squeezy, Paddle, Safepay and PayFast (and Payoneer for payouts), each **toggled per-workspace/globally from the admin panel** (flag-driven, default off). Initial enabled set when billing ships (Phase 7): **Lemon Squeezy** (international, verified PK-eligible MoR) + **Safepay** (local PKR). Paddle/PayFast adapters stay disabled until their PK terms are confirmed in writing. Manual invoicing remains the fallback for design partners.

## Consequences

Billing engine must normalize subscriptions/webhooks/refunds across MoR and gateway models; provider toggles live beside the existing feature-flag system; adding an adapter never requires a schema change. Stripe is not an adapter candidate (unavailable to Pakistan businesses).
