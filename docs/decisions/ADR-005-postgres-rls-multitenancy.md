# ADR-005 — PostgreSQL shared-schema multi-tenancy with `workspace_id` + RLS

Date: decided in the build spec v2.0 (11 Oct 2026); recorded 2026-10-15 · Status: accepted · Source: `docs/spec/17_DECISIONS_AND_OPEN_QUESTIONS.md` §1

## Decision

PostgreSQL shared-schema multi-tenancy with `workspace_id` + RLS.

## Why

Simplest at this scale; strong isolation with defence in depth.

## Alternatives rejected

Schema-per-tenant (migration pain), DB-per-tenant (cost).
