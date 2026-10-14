# ADR-018 — Figma file AI-UI is the visual source of truth (supersedes spec §13 identity)

Date: 2026-10-12 (design handoff) · Status: accepted · Decider: project owner (design sessions)

## Decision

Typography is Plus Jakarta Sans (display/headings) + Inter (body/labels) + JetBrains Mono (code);
colours are stone neutrals with indigo accent `#4F46E5` and a violet→pink AI gradient — as designed in
Figma (`docs/design/README.md`) and exported to `packages/tokens`. The spec's Inter-only, blue
`#2863DF` / teal `#0C9F81` identity is superseded. Where Figma and `docs/spec/13_UI_UX_SPEC.md`
disagree, build Figma and update the spec in the same PR.

## Why

The full design (website + dashboard, light + dark, accessibility-audited to WCAG 2.2 AA) was executed
and approved in Figma after the spec was written; tokens are already exported and tested.

## Alternatives rejected

Re-skinning the finished design back to the spec's placeholder palette (no user value, loses the
completed contrast audit).
