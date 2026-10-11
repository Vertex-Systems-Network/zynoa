# 11 — Billing, Credits and Usage

## 1. Requirements

| ID | Requirement | Phase |
|---|---|---|
| BIL-001 | Plans defined as data (`billing_plans` table), not code | P1 |
| BIL-002 | Credit accounts per workspace; append-only ledger; balance derived and cached | P1 |
| BIL-003 | Monthly credit grant on plan renewal; unused grant credits expire at period end. Purchased credits: each `purchase` ledger entry carries `expires_at` (12 months) and is expired per entry by the expiry job (Phase 7, when packs can be bought) | P1 |
| BIL-004 | Every billable operation: estimate → reserve → execute → settle (capture actual, release remainder) | P1 |
| BIL-005 | Budgets at workspace/project/user/system level with soft threshold notification and hard stop | P1 |
| BIL-006 | Usage page (AD-06): by day, project, studio, model, user; CSV export | P1 |
| BIL-007 | Operator manual grants and adjustments with reason (audited) | P1 |
| BIL-008 | Cost shown before expensive actions (> 5 credits) and after every job | P1 |
| BIL-009 | Payments: subscription checkout, credit packs, receipts/invoices, plan change with proration, cancel, dunning | P7 |
| BIL-010 | Seats for organisations; seat changes prorated | P7 |
| BIL-011 | Provider reconciliation monthly; variance alerts | P7 |
| BIL-012 | BYOK pricing: platform fee only for calls on customer keys | P7 |
| BIL-013 | Tax handling on VSN invoices per jurisdiction **[VERIFY with tax advisor]** | P7 |
| BIL-014 | Abuse controls: free-tier limits, velocity limits, card-testing protection, disposable-email blocking for free credits | P1/P7 |

## 2. Plans (`billing_plans`; structure fixed, values are placeholders)

| Plan key | Workspace | Price / month | Monthly credits | Seats | Key limits |
|---|---|---|---|---|---|
| `free` | personal | 0 | `{{FREE_CREDITS}}` (e.g., small trial) | 1 | 2 projects, 1 GB storage, no production deploys, watermark on video exports, 1 System, 50 messages/month |
| `pro` | personal | `{{PRO_PRICE}}` | `{{PRO_CREDITS}}` | 1 | 20 projects, 50 GB, 3 Systems, 2 parallel agent runs |
| `creator` | personal | `{{CREATOR_PRICE}}` | `{{CREATOR_CREDITS}}` (media-heavy) | 1 | 100 GB, 4K export, priority media queue |
| `team` | organization | `{{TEAM_PRICE_PER_SEAT}}` per seat | `{{TEAM_CREDITS_PER_SEAT}}` pooled | 3+ | Unlimited projects, 500 GB, 10 Systems, 5 parallel runs, approvals & audit |
| `enterprise` | organization | Custom | Custom | Custom | SSO, BYOK, custom retention, SLA, dedicated support |
| Add-ons | any | Credit packs `{{PACK_SIZES}}`, extra storage, extra parallel runs, messaging bundles | | | |

**[DECISION NEEDED — OD-04]** Prices in PKR and/or USD; whether PK customers pay in PKR. Fill after Phase 0 cost measurements.

`PlanLimitsSchema` keys: `max_projects`, `storage_gb`, `max_systems`, `parallel_agent_runs`, `max_sandbox_cpu`, `video_max_resolution`, `messages_per_month`, `workflow_runs_per_month`, `active_workflows`, `production_deploys`, `custom_domains`, `byok`, `sso`, `audit_retention_days`.

Limits are enforced in services via `PlanLimits.check(workspace, key, increment)` returning `ok` or `LIMIT_REACHED` (HTTP 402 with upgrade info).

## 3. Credits and price sheet

- **1 credit** = a fixed internal value (e.g., USD 0.01 equivalent of *price to customer*) **[DECISION NEEDED — OD-05: credit value and target gross margin]**.
- **Price sheet** (`pricing` JSON on `provider_models` + `platform_prices` table, file 04 §13):

| Usage type | Unit | Credits formula |
|---|---|---|
| LLM tokens | per 1M input / output / cached tokens | `ceil((in × p_in + out × p_out + cached × p_cached) × markup / credit_value)` |
| Image generation | per image (by size/quality) | provider price × markup |
| Video generation | per second of output (by resolution/model) | provider price × markup |
| TTS | per 1k characters | provider price × markup |
| STT | per minute | provider price × markup |
| Sandbox compute | per vCPU-minute + GB-minute | infra cost × markup |
| Media assembly | per output minute | infra cost × markup |
| Storage | per GB-month above plan quota | |
| Messages | per SMS segment / WhatsApp conversation / email | provider price × markup |
| Deployments | per preview/staging deployment-hour (if VSN-hosted) | |

- `markup` per usage type stored in `platform_prices`; target margins set by OD-05.
- Phase 0 produces the first real price sheet from measured provider costs.

## 4. Ledger rules

- `ledger_entries` is **append-only**; corrections are new `adjustment` entries.
- Accounts per workspace: `promo` (promotional, expires), `grant` (plan's monthly grant, expires at period end), `purchased` (credit packs, 12-month expiry).
- Ledger entry types `reservation` and `reservation_release` change **only `reserved`** (`reserved −= amount`, so a −100 reservation raises `reserved` by 100 and a +100 release lowers it). **All other types change only `balance`** (`balance += amount`). Both are maintained in the same transaction as the insert, with `select … for update` on the account row (or an equivalent trigger).
- **Spendable** = `balance − reserved`. Invariants (property-tested): `balance = Σ amount` over non-reservation entries; `reserved = −Σ amount` over reservation + reservation_release entries.
- Order of consumption: `promo` first (expires soonest), then `grant`, then `purchased`. A reservation records its per-account split in `credit_reservations.allocations`.
- Every entry has `idempotency_key` unique per workspace → replays are no-ops.
- Negative spendable is not allowed except by operator adjustment; settlement that exceeds reservation by small amounts (≤ 10%) is allowed and may drive balance negative to at most −(10% of reservation); next operations then fail until topped up.

## 5. Reservation protocol (BIL-004)

```
estimate = gateway.estimate(req)                         // or studio/job estimator
reserve(workspace, budgetScopes, amount = ceil(estimate × 1.2), ttl = job timeout + 10 min)
  ├─ check spendable ≥ amount            else → 402 INSUFFICIENT_CREDITS
  ├─ lock every applicable budget row (project, user, system, workspace) for update;
  │   check limit − spent − reserved_credits ≥ amount; then reserved_credits += amount
  │      hard_stop → 402 BUDGET_EXCEEDED ; soft → allow + notify at threshold
  └─ insert credit_reservations(held) + ledger(reservation, −amount)   // reserved += amount
execute(...)
settle(reservationId, actualCredits)
  ├─ ledger(usage, −actual) ; ledger(reservation_release, +amount)
  ├─ budgets: spent_credits += actual; reserved_credits −= amount (all scopes in budget_ids)
  └─ reservation.status = captured
on failure/cancel before any provider cost → release only
expired reservations → released by sweeper every 5 min (sweeper also decrements reserved_credits on every budget in budget_ids)
```

Long agent runs reserve **per step** (each model call / tool call), not the whole run up front; the run has a `max_credits_per_run` guard.

## 6. Budgets (BIL-005)

- Scopes: workspace (monthly), project (monthly or total), user within org (monthly), system instance (monthly; for messaging/AI usage of Systems).
- Default project budget = plan-specific default (e.g., 30% of monthly grant) editable by project admin.
- At soft threshold (default 80%): notification + banner. At 100% with `hard_stop`: new reservations rejected; running agent runs pause at next step with status `budget_exceeded`; Systems' transactional messages are **exempt** from project budgets but count toward the system-instance budget (businesses must not silently stop sending booking confirmations — instead warn the manager at 80% and 100%, and only hard-stop marketing messages).

## 7. Payments (Phase 7)

`PaymentProvider` is chosen in OD-03. Requirements regardless of provider:
- Hosted checkout or tokenised payment fields (VSN never touches raw card data → minimal PCI scope).
- Webhooks verified, idempotent, processed via outbox; events: `checkout.completed`, `subscription.created/updated/cancelled`, `invoice.paid/payment_failed`, `refund.created`, `dispute.created`.
- Dunning: retry schedule (day 1, 3, 7), emails, then plan downgrade to `free` limits (data retained, workspace `read_only` for paid features after 14 days).
- Receipts/invoices with company details `{{COMPANY_LEGAL_NAME}}`, `{{NTN}}`, address, tax lines.
- Local options for Pakistan (cards, bank transfer, mobile wallets such as JazzCash/Easypaisa through a local gateway) **[VERIFY availability for recurring billing]**; manual bank-transfer invoices for Team/Enterprise with operator confirmation.

## 8. Reconciliation (BIL-011)

Monthly job: sum `model_calls.cost_usd_micros` per provider vs provider invoice/usage export → `provider_reconciliations`; variance > 3% → alert + investigation runbook. Also daily anomaly detection: workspace spend > 5× its 7-day average → alert operator and the workspace owner.

## 9. Unit economics instrumentation

Dashboards (operator): revenue per workspace vs cost per workspace (provider + infra allocation), gross margin by plan/studio/model, credits granted vs consumed, top 20 costly workspaces, failed-run cost (cost of work that produced no accepted evidence — key efficiency metric).
