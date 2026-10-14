# ADR-004 — Better Auth for authentication; our own tables for memberships/roles

Date: decided in the build spec v2.0 (11 Oct 2026); recorded 2026-10-15 · Status: accepted · Source: `docs/spec/17_DECISIONS_AND_OPEN_QUESTIONS.md` §1

## Decision

Better Auth for authentication; our own tables for memberships/roles.

## Why

Self-hosted, TypeScript, MFA/passkeys/OAuth; no per-MAU vendor cost; data stays in our DB.

## Alternatives rejected

Clerk/Auth0 (cost, data residency), NextAuth (less complete MFA/org support).
