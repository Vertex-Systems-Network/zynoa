# ADR-011 — Sandboxes via `SandboxProvider` with a managed microVM vendor first

Date: decided in the build spec v2.0 (11 Oct 2026); recorded 2026-10-15 · Status: accepted · Source: `docs/spec/17_DECISIONS_AND_OPEN_QUESTIONS.md` §1

## Decision

Sandboxes via `SandboxProvider` with a managed microVM vendor first.

## Why

Fast start, strong isolation; can self-host Firecracker later.

## Alternatives rejected

Docker containers on shared hosts (weak isolation).
