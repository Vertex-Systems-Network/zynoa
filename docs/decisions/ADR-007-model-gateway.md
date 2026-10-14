# ADR-007 — Own `ModelGateway` over provider SDKs (Vercel AI SDK providers inside) with DB registry

Date: decided in the build spec v2.0 (11 Oct 2026); recorded 2026-10-15 · Status: accepted · Source: `docs/spec/17_DECISIONS_AND_OPEN_QUESTIONS.md` §1

## Decision

Own `ModelGateway` over provider SDKs (Vercel AI SDK providers inside) with DB registry.

## Why

Provider independence, metering, routing, idempotency under our control.

## Alternatives rejected

Direct SDK calls in features; third-party gateway as hard dependency.
