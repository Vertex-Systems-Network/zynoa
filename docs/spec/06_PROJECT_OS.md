# 06 — Project OS (projects, plan, tasks, evidence, releases)

The Project OS is the heart of VSN AI. Every studio, agent, System and workflow writes into it.

## 1. Requirements

| ID | Requirement | Phase |
|---|---|---|
| PRJ-001 | Create a project via the New Project wizard; save draft and resume (wizard_state) | P1 |
| PRJ-002 | Project origins: Blank, AI plan, Template (P5), Import repo (P2), Install System (P6) | P1+ |
| PRJ-003 | Enable/disable any subset of the six services at creation or later; disabling hides studio tabs but keeps data | P1 |
| PRJ-004 | Project list with personal/org filter, status, search, sort, archive, restore, delete (14-day soft delete) | P1 |
| PRJ-005 | Project overview: goal, services, milestone progress (evidence-based), blockers, next work, spend vs budget, recent activity | P1 |
| PRJ-006 | Project settings: name, key, description, services, autonomy level, routing mode, budget, visibility, members, danger zone | P1 |
| PRJ-007 | AI discovery: up to 7 clarifying questions, all optional, skippable | P1 |
| PRJ-008 | AI plan generation: requirements, milestones, tasks with acceptance criteria, dependencies, estimates, assumptions, risks | P1 |
| PRJ-009 | Plan review: edit, regenerate a section, approve; approved plan materialises tasks; later plan versions show a diff | P1 |
| TSK-001 | Backlog list view with grouping (milestone/epic/status/owner), filters, bulk edit | P1 |
| TSK-002 | Kanban board with drag/drop, WIP limits (optional), swimlanes by owner type | P1 |
| TSK-003 | Task detail: description (Markdown), acceptance criteria, checklist, owner (user/agent), dependencies, linked assets, evidence, comments, activity | P1 |
| TSK-004 | Task state machine enforced server-side (§5) | P1 |
| TSK-005 | Evidence: manual attestation (P1); automated evidence from agents/tests (P2) | P1/P2 |
| TSK-006 | Progress = evidence-satisfied acceptance criteria / total, rolled up to milestones and project | P1 |
| TSK-007 | Comments with Markdown, mentions (@user, @agent), edit/delete own, threaded replies | P1 |
| TSK-008 | Project discussions (threads, decision records, questions) | P1 |
| TSK-009 | Timeline view (Gantt) with dependencies and critical path | P2 |
| TSK-010 | Notifications: assigned, mentioned, approval requested, run failed, budget threshold, plan ready | P1 |
| TSK-011 | Daily AI project summary (opt-in) in Inbox/email | P2 |
| REL-001 | Environments per project: preview (per branch), staging, production | P2 |
| REL-002 | Releases with version, notes, included assets/commit, approval, rollback | P2 |
| REL-003 | Reviews & Approvals screen listing pending/decided approvals | P2 |
| REL-004 | Guest share links for previews/assets with view/comment permission, expiry, optional password | P2 |

## 2. New Project wizard (ON-06 → ON-07 → ON-08)

Steps (each saves to `projects.wizard_state`; project row exists with `status='draft'` from step 1):

| Step | Fields | Rules |
|---|---|---|
| 1. Goal | Name (auto-suggested from goal), goal (free text, 10–4,000 chars), optional attachments (→ Library, project scope), project type hint (app, website, campaign, design, research, business system, other) | Goal required |
| 2. Workspace | Personal or an org where user has `project.create`; org: visibility + initial members/teams | Personal default |
| 3. Services | Toggle cards for six services with short description; AI pre-selects from goal (user can change). Services can be selected in **every** phase because they shape the plan. If a service's studio is not released yet (feature flag off), the card shows a "Studio coming soon" note, its tasks are planned with `suggested_owner=user`, and the project tab shows a "Studio coming soon" placeholder | ≥ 1 service, or "General/planning only" |
| 4. Starter | **Generate plan with AI** (default) · **Start blank** · **Use template** (P5) · **Import** (P2: repo; P3: Figma reference) | |
| 5. Connections (optional) | Phase 1: brand kit pick (Library) and files only. Phase 2+: GitHub (coding). Phase 3+: Figma reference (design). "Skip for now" always visible | Never blocking |
| 6. Preferences | Autonomy (`manual`: agents only on explicit request · `supervised` (default): supervisor proposes, user starts · `autonomous`: supervisor runs ready tasks within budget & policies), routing mode, project budget (default from plan), approval defaults summary | |
| 7. Discovery (AI) | Up to 7 clarifying questions generated from goal; answer, skip individually, or "skip all" | Only if starter = AI |
| 8. Plan review (ON-08) | See §3 | Approve → project `active` |

Blank starter skips 7–8: project becomes `active` with an empty backlog and a suggested first milestone "Getting started".

## 3. AI plan generation (PRJ-008)

**Input:** goal, services, answers to discovery, attachments (extracted text summaries), selected template (if any), workspace brand kit summary, plan limits.

**Process (Temporal workflow `GeneratePlanWorkflow`, purpose `plan.generate`):**
1. Reserve credits for estimate (shown in UI before start).
2. Model call with structured output → `PlanDraftSchema`:
```ts
PlanDraft = {
  summary: string; assumptions: string[]; risks: {text, mitigation}[]; open_questions: string[];
  requirements: { key: 'REQ-001', type, title, description, priority: 'must'|'should'|'could'|'wont',
                  acceptance_criteria: { id: 'AC-1', text, verification: 'automated'|'human'|'either' }[] }[];
  milestones: { name, description, exit_criteria: string[], order }[];
  tasks: { ref: 'T1', parent_ref?: string, type, title, description, service, milestone_order,
           requirement_keys: string[], acceptance_criteria: {...}[], estimate_points: 1|2|3|5|8|13,
           suggested_owner: 'agent'|'user', agent_key?: string, depends_on_refs: string[] }[];
}
```
3. **Validation (deterministic code, not AI):** schema valid; every task has ≥ 1 acceptance criterion; no dependency cycles; every `must` requirement is covered by ≥ 1 task; tasks for disabled services removed; total tasks ≤ 150 (else ask AI to consolidate epics); estimate credits computed from task types × price sheet.
4. If validation fails → one automatic repair call with the validation errors; if still failing → show partial plan with warnings.
5. Store as `plans` (status `proposed`) + draft requirements/milestones/tasks linked to the plan (`tasks.plan_id` set, `tasks.is_draft = true`, status `backlog`, no task number yet). Draft tasks are excluded from board/backlog queries; approval assigns numbers and sets `is_draft = false` in one transaction; rejection deletes the drafts.
6. Stream progress events ("Analysing goal…", "Drafting requirements…") to the UI.

**Plan review UI:** three tabs — Requirements, Milestones, Tasks (tree). Each item editable inline. Actions: regenerate section with instruction, add/remove, reorder milestones. Footer: estimated credits & duration range, assumptions, risks, open questions. **Approve plan** (needs `plan.approve`) → tasks become visible, `projects.status='active'`, supervisor created (P2).

**Re-planning:** "Update plan" creates plan version N+1 from current state + new instruction. Proposed additions are draft rows (`is_draft=true`); proposed changes to existing items are draft rows with `supersedes_id` pointing at the item; removals are listed in `plans.changes`. UI shows a diff (added/removed/changed items); approval applies changes in one transaction (drafts become live, superseded rows are updated, removed items cancelled); rejection deletes the drafts. Tasks already `running`/`done` are never deleted by re-planning; they can only be marked `cancelled` with confirmation.

## 4. Task model essentials

- Key: `<PROJECT_KEY>-<number>` (e.g., `WEB-142`), number allocated from `projects.next_task_number` (`select … for update` on the project row, then increment).
- Hierarchy: epic → story/task → (subtask as task with parent). Max depth 3.
- Owner: one human or one agent (or unassigned). Additional humans can be "watchers" (notification only) — stored in `task_watchers`.
- Acceptance criteria are the contract between humans and agents. **An agent cannot mark a task done; only the Evidence Verifier (§6) or a human with `task.update` can.**

## 5. Task state machine (TSK-004)

```
backlog ──► ready ──► running ──► verification ──► done
   ▲          │          │  │           │   │
   │          ▼          │  ▼           │   └─► needs_review ──► done
   │       blocked ◄─────┘ failed       │              │
   │          │              │          ▼              ▼
   └──────────┴──────────────┴──── reopened ◄─────────┘
   (any non-terminal) ──► cancelled
```

| From → To | Who/what may trigger | Guard |
|---|---|---|
| backlog → ready | user (`task.update`), supervisor | All `depends_on` tasks are `done` or `cancelled`; acceptance criteria non-empty |
| ready → running | agent run start; user "Start" | Owner set |
| running → verification | agent run finishes successfully; user "Submit for verification" | |
| verification → done | Evidence Verifier when all criteria have `passed` evidence; or human attestation | |
| verification → needs_review | Verifier when any criterion requires `human` verification | |
| verification → reopened | Evidence Verifier | Automated evidence failed or is stale; verifier notes stored as `task_events` + an agent comment |
| needs_review → done | user with `asset.approve` / `approval.decide` | Approval recorded as evidence |
| any active → blocked | agent (with reason), user | `blocked_reason` required |
| blocked → ready | user, supervisor when blocker resolved | |
| running → failed | agent run fails after retries | Error summary stored |
| failed/done/needs_review → reopened | user | Comment required |
| reopened → ready | automatic | |
| any non-terminal → cancelled | user with `task.update` | Confirmation; children cancelled too |

Every transition writes `task_events` and an SSE event `task.updated`.

## 6. Evidence and verification (TSK-005, TSK-006)

**Evidence types:** test_run, check_run, build, screenshot, visual_diff, approval, human_attestation, artifact, citation_check, metric, log_excerpt, deployment (see `evidence` table).

**Evidence Verifier** (deterministic service + optional AI judge):
- For each acceptance criterion with `verification='automated'`, the agent must attach evidence referencing `criterion_id`. The verifier checks evidence **status** and **freshness** (evidence must reference the latest commit/asset version for that task).
- An **AI judge** (separate model call, different model family from the producing agent where possible) MAY be used for criteria like "page shows pricing table" against a screenshot; its verdict is stored as evidence type `check_run` with `data.judge=true` and never alone satisfies a criterion marked `human`.
- Progress % for task = criteria with `passed` evidence / total criteria. Milestone % = weighted by task estimate points. Project % = milestones weighted equally. **No AI-reported percentage is ever shown.**

## 7. Collaboration

- **Comments** (TSK-007): Markdown (GFM subset, sanitised), mentions trigger notifications; `@agent-name` mention on a task asks that agent to respond (creates a lightweight agent run with read-only tools) — P2.
- **Discussions** (TSK-008): project-level threads; `kind='decision'` threads have a "Record decision" action producing `decision_summary`, linked to requirements/tasks; decisions are included in agent context.
- **Activity feed**: union of task_events, run summaries, approvals, releases, asset versions for the project.
- **Realtime**: board and task detail update live via SSE; optimistic UI with server reconciliation; conflicting edits on the same field → last-write-wins with "Edited by X just now" toast; description edits use the row `version` (`If-Match: "<version>"`) and show a merge dialog on conflict.

## 8. Releases and environments (REL-001…003)

- **Preview**: auto-created per PR/branch by the coding agent; URL `https://<deployment-id-base32>.{{PREVIEW_DOMAIN}}` (globally unique label ≤ 63 chars; project keys are only unique per workspace, so they must not form hostnames); destroyed when PR closes or after 7 days idle.
- **Staging**: one per project; deploy requires `release.staging` and passing required checks (lint/typecheck/unit at minimum; configurable).
- **Production**: optional; target is user-owned infrastructure via a deploy plugin (e.g., Vercel/Netlify/Cloudflare/Fly connection) or VSN-managed hosting (**[DECISION NEEDED — OD-08]**). Always requires an approval request with `approval.decide.production`.
- **Release record**: version (semver or date-based), notes (AI-drafted from merged PRs and completed tasks, human-editable), included commit and asset versions, evidence summary, approver.
- **Rollback**: redeploy previous release's commit; creates new deployment row with `triggered_by_type='user'`, `status` updates; audit event.

## 9. Guest share links (REL-004, screen SH-01)

- Create from a deployment, asset version, design document or report: permissions `view` or `view+comment`, expiry (1–30 days, default 7), optional password, optional "require name + email" for comments.
- Guest comments are stored as `comments` with `author_type='user'` and a synthetic guest identity (`guest_identities` table).
- Guests never see other project data, never become members, never count as seats. Works in personal workspaces (this solves the freelancer-client review need without breaking the one-human rule).
- Revocation is immediate; access logged (`view_count`, audit).

## 10. Notifications (TSK-010)

| Event | In-app | Email default | Recipients |
|---|:-:|:-:|---|
| Task assigned to you | ✅ | ✅ | assignee |
| Mentioned | ✅ | ✅ | mentioned user |
| Approval requested | ✅ | ✅ | eligible approvers |
| Agent run failed / blocked | ✅ | ⬜ (digest) | task owner, project admins |
| Budget 80% / 100% | ✅ | ✅ | project admins, billing admins |
| Plan ready for review | ✅ | ✅ | project creator |
| Release deployed | ✅ | ⬜ | project members |
| Invitation accepted | ✅ | ⬜ | inviter |
| Daily summary (P2) | ✅ | opt-in | project members who opted in |

Users configure per-event channel in profile (ON-03). Email digests batch non-urgent notifications hourly.
