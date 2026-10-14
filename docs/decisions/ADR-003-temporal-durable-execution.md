# ADR-003 — Temporal for all durable execution (agents, workflows, schedules, billing jobs)

Date: decided in the build spec v2.0 (11 Oct 2026); recorded 2026-10-15 · Status: accepted · Source: `docs/spec/17_DECISIONS_AND_OPEN_QUESTIONS.md` §1

## Decision

Temporal for all durable execution (agents, workflows, schedules, billing jobs).

## Why

Durable state, retries, timers, signals for approvals, exactly-once workflow IDs.

## Alternatives rejected

BullMQ/Celery (no durable workflow state), custom state machines, n8n embedding (licence + control).
