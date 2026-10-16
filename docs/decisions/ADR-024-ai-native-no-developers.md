# ADR-024: AI-native development — no human developers at any phase

- Status: accepted (owner, 2026-10-16)
- Supersedes (for staffing): BUILD-PLAN §4 team minimums; spec 02 §13 human-team table
- Related: ADR-019 (ANPOS governance)

## Context

The owner has no developers and will not hire any: "jo bhi kaam karna hai AI-Native development hai." The build plan previously assumed 1 tech lead + 1 full-stack engineer for Phases 0–2 and 5–6 people from Phase 3.

## Decision

All engineering — planning, code, tests, docs, infra config — is done by AI sessions following the ANPOS flow already in use: branch per work unit → tests first → 7 required CI checks → **independent AI review session** (REQUEST_CHANGES authority; a session that did not write the code) → merge. The **owner is the only human**: approves plans and gates (typed consent phrases), owns accounts/cards/secrets/signatures, decides releases. Phase 3+ parallel streams run through the ANPOS Supervisor/Worker team mode (AI workers in isolated git worktrees), not hired reviewers.

## Consequences

- The Lean budget scenario (docs/plans/phase-1-2-budget.md) is the plan of record; the Standard scenario is reference-only.
- Quality depends on the rails that already exist: tests-first, required checks, independent AI review, consent gates, the no-deploy directive. Track defect escapes; if they rise, the owner may revisit (reversibility: high).
- Key-person dependency on the owner stands (risk register) — mitigated by the machine-readable plan: any AI can resume from `AGENTS.md` → `config/ai/execution-plan.json`.
