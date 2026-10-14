# ADR-017 — Desktop v1 in Phase 3 (Tauri), mobile v1 in Phase 5 (Expo)

Date: 2026-10-12 (plan) · Status: accepted · Decider: project owner via `docs/plan/BUILD-PLAN.md` §2/§8

## Decision

The spec put desktop and mobile apps in Phase 8. The plan pulls desktop v1 (Tauri 2 shell loading the
hosted dashboard + notifications, deep links, updater) into Phase 3, and mobile v1 (Expo: inbox,
approvals, notifications, chat) into Phase 5.

## Why

Both surfaces reuse the hosted dashboard and shared packages (`tokens`, `contracts`), so their marginal
cost after Gate B is small, and they widen the design-partner funnel long before Phase 8. Code signing
accounts are the long pole and are scheduled before Phase 3.

## Alternatives rejected

Phase 8 as specified (defers cheap, high-visibility surfaces); native Swift/Kotlin apps (duplicate
UI stacks the team cannot staff).
