# GitHub rulesets (ANPOS `config/github/ruleset-policy.json`)

Import each file in **Settings → Rules → Rulesets → New ruleset → Import a ruleset**:

| File | Applies to | What it enforces | Bypass |
|---|---|---|---|
| `main-protection.json` | default branch | PR required, conversations resolved, `repository-integrity` check passing on an up-to-date branch, linear history, no force push, no deletion | none |
| `main-review.json` | default branch | 1 approval, Code Owner review, stale reviews dismissed, most recent push approved | repository admins, pull requests only — lets the single owner merge AI-authored PRs after checks pass |
| `coordination-refs.json` | `claims/**`, `supervisor/**` | no create / update / delete / force push | repository admins |

Rulesets cannot be written from the AI session's GitHub proxy, so a repository admin imports them. After import, the AI re-reads `GET /repos/{owner}/{repo}/rulesets` and records verification in `config/github/ruleset-policy.json` → `setup_state`.

When a stack-specific check becomes stable (after WU-P0-03), add it to `main-protection.json` and re-import.
