# ADR-006 — pgvector inside Postgres for retrieval

Date: decided in the build spec v2.0 (11 Oct 2026); recorded 2026-10-15 · Status: accepted · Source: `docs/spec/17_DECISIONS_AND_OPEN_QUESTIONS.md` §1

## Decision

pgvector inside Postgres for retrieval.

## Why

One database, transactional consistency, permission filtering in SQL.

## Alternatives rejected

Separate vector DB (extra ops, sync issues).
