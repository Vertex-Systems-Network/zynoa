# ADR-019 — ANPOS governs the repository; product engineering rules live in `docs/spec/ENGINEERING-RULES.md`

Date: 2026-10-12 (PR #2) · Status: accepted · Decider: project owner ("add the ANPOS blueprint")

## Decision

The repository adopts the ANPOS AI-native protocol (child bootstrap of
`Vertex-Systems-Network/ai-native-project-operating-system`): root `AGENTS.md`, `.ai/`, `config/**`,
`schemas/`, governance validators and CI check. The spec's builder rules file (originally named
`AGENTS.md`) is renamed `docs/spec/ENGINEERING-RULES.md`; agents read ANPOS first, then
`docs/plan/README.md`, then the spec.

## Why

The product is built primarily by AI agents; ANPOS supplies consent gates, state tracking, control-plane
protection and repository governance that the spec assumes but does not implement.

## Alternatives rejected

Spec rules at root without ANPOS (no consent/coordination machinery); running ANPOS unmodified with the
spec's file name clash unresolved.
