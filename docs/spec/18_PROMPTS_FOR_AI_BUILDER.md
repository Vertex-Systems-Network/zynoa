# 18 — Prompts for the AI Builder

Copy-paste these into your AI coding agent (Claude Code, Cursor, Codex, Windsurf, etc.). Replace `{{…}}`. Use **one phase at a time** and **one epic per session** for large phases.

---

## 0. One-time setup prompt

```
You are the lead engineer for VSN AI. The full specification is in /docs/spec/ and the working rules are in /docs/spec/ENGINEERING-RULES.md.

Before writing any code:
1. Read /docs/spec/ENGINEERING-RULES.md completely.
2. Read /docs/spec/README.md, 01_PRODUCT_VISION.md, 02_SCOPE_AND_PHASES.md, 03_ARCHITECTURE.md.
3. Summarise back to me in 15 bullet points: what VSN AI is, the phase rule, the tech stack, the tenant-isolation rule, and the Definition of Done.
4. List anything in the spec you find contradictory or unclear. Do not resolve business questions yourself — list them.

Do not create files yet.
```

## 1. Phase start prompt (use for every phase)

```
We are starting Phase {{N}} — {{PHASE NAME}}. /docs/spec/CURRENT_PHASE.md now says "Phase {{N}}".

1. Read: ENGINEERING-RULES.md; 02_SCOPE_AND_PHASES.md (Phase {{N}} section); 04_DATA_MODEL.md (tables marked [P{{N}}] and earlier); 05_AUTH_TENANCY_RBAC.md; 12_API_SPEC.md (endpoints for phase {{N}}); 13_UI_UX_SPEC.md (screens for phase {{N}}); 14 and 15 (requirements for phase {{N}}); 16_BACKLOG.md (Phase {{N}} stories); plus the module files relevant to this phase: {{e.g. 06, 07, 09, 11}}.
2. Write /docs/plans/phase-{{N}}.md containing:
   - stories in dependency order (data → authz → services → API → workers → UI → tests),
   - for Phases 3+: expanded acceptance criteria for every story (Given/When/Then),
   - new tables/columns/migrations needed,
   - risks and open questions (mark [DECISION NEEDED] items),
   - the exact demo script you will run at the end.
3. Stop and wait for my approval of the plan.
```

## 2. Story implementation prompt

```
Implement {{US-xxx}} from /docs/spec/16_BACKLOG.md following /docs/plans/phase-{{N}}.md.

Rules:
- Follow ENGINEERING-RULES.md (tenant-scoped repositories, authorize() on every handler, Zod at boundaries, idempotency for side effects, no secrets in code/logs).
- Write tests first for the acceptance criteria, then the implementation.
- Add the new tables/routes to the tenant-isolation suite.
- Implement loading/empty/error/permission states for any UI.
- Update OpenAPI/contracts and the spec if behaviour differs (and add /docs/decisions entry).

When done, report:
1. Files changed (grouped by package).
2. Each acceptance criterion → test name(s) that prove it.
3. Commands you ran and their results (lint, typecheck, unit, integration, e2e subset).
4. Anything you could not complete and why.
```

## 3. Review prompt (run with a fresh agent session for independence)

```
You are reviewing a pull request for VSN AI. Do not modify code. Read ENGINEERING-RULES.md and the story {{US-xxx}} in /docs/spec/16_BACKLOG.md.

Check and report findings with severity (Critical/High/Medium/Low) and file:line:
1. Tenant isolation: any query not going through a TenantRepository? Any route missing authorize()? Any cross-tenant ID accepted without workspace check?
2. Permissions match 05_AUTH_TENANCY_RBAC.md §5.
3. Idempotency and retries for side effects; Temporal determinism (no Date.now()/random in workflow code).
4. Billing: every paid call reserved/settled; budgets respected.
5. Security: input validation, output encoding, SSRF, secrets handling, logging of content.
6. Acceptance criteria actually tested (not just happy path).
7. UX states and accessibility.
8. Spec drift: behaviour that differs from the spec without a decision record.
```

## 4. Phase exit verification prompt

```
Phase {{N}} implementation is believed complete. Verify it against /docs/spec/02_SCOPE_AND_PHASES.md (Phase {{N}} exit checklist) and /docs/plans/phase-{{N}}.md.

For each checklist item:
- state PASS/FAIL,
- give the evidence (test name, command output, screenshot path, metric),
- for FAIL, give the smallest fix plan.

Then run the demo script from /docs/plans/phase-{{N}}.md on staging (or local if staging unavailable) and record each step's result.
Write the result to /docs/plans/phase-{{N}}-report.md. Do not start Phase {{N+1}}.
```

## 5. Bug-fix prompt

```
Bug: {{description, steps to reproduce, expected vs actual, logs/trace id}}.
1. Reproduce with a failing automated test first.
2. Find the root cause; explain it in 3–5 sentences.
3. Fix with the smallest change; ensure the test passes and no other tests break.
4. Check whether the same bug pattern exists elsewhere (search) and list those places.
```

## 6. Spec change prompt

```
I want to change the spec: {{change}}.
1. List every spec file, table, endpoint, screen, story and test affected.
2. Propose the exact edits (diff-style) to the spec files.
3. Propose an ADR or decision note if architecture changes.
4. Estimate impact on the current phase plan.
Do not change code until I approve.
```

---

## 7. Demo scripts

### Demo P1 (Phase 1 exit)
1. Open marketing site → Pricing page shows plans from the database.
2. Sign up as `sana@example.com` → verify email from Mailpit → land on Workspace Home.
3. Upload `brief.pdf` to Library → status reaches "Indexed".
4. Ask chat (scope: Selected files → brief.pdf) "What is the project budget in the brief?" → answer with citation chip opening the PDF page.
5. New Project: goal "Website for my bakery with online orders", services Coding + Design (both selectable; each card shows "Studio coming soon" because those studios ship in Phases 2–3) → AI plan → discovery questions (skip 2, answer 1) → plan generated with streaming progress; tasks for these services are suggested for human owners.
6. Edit one requirement, delete one task, approve plan → board shows tasks.
7. Try to move a task whose dependency is not done from Backlog to Ready → blocked with a reason toast.
8. Add human attestation evidence to a criterion → task progress updates; milestone % updates.
9. Usage page shows credits used for plan + chat.
10. Create organization "Bilal Agency" → create project "Website" in it (Blank starter) and a second project "Internal" → invite `ali@example.com` (workspace `member`, project "Website" as `editor`) and `zara@example.com` (workspace `member`, project "Website" as `viewer`) → both accept → Zara cannot edit tasks; Ali can; neither sees "Internal".
11. Try to invite someone in personal workspace via API → `409 PERSONAL_WORKSPACE_SINGLE_HUMAN`.
12. Set project budget low → generate plan again → `402 BUDGET_EXCEEDED` callout.

### Demo P2 (Phase 2 exit / Gate B)
1. In "Bilal Agency", project "Bakery site": connect GitHub (test org) → create repo from `nextjs-app` template.
2. Approve plan with 5 coding tasks; set autonomy Supervised → supervisor proposes 2 tasks → Start all.
3. Watch run console: sandbox created, files changed, tests run, screenshot attached, PR opened; reviewer comments appear.
4. Verifier moves first task to Done (all automated criteria passed).
5. Second task's merge into `main` (protected) → approval request → approve in PR-11 → merged.
6. Kill the worker process during a third run → run resumes; only one PR exists.
7. Staging deploy → URL works; create share link → open in incognito → guest comments.
8. Production deploy request → requires project_admin approval → reject with comment → run reports blocked.
9. Import an existing repo with a failing test → audit report → accept suggested fix task → agent fixes → evidence → PR.
10. Exhaust project budget during a run → run pauses with `budget_exceeded`; owner notified.

### Demo P6 (Gate C) — Salon
1. Install "Appointments — Salon" template → setup wizard: business name "Usman Salon", hours, 2 staff, 4 services (PKR prices), WhatsApp + SMS connections (test mode).
2. Open public booking page on mobile viewport → book "Haircut" tomorrow 4 pm with consent checkbox → confirmation captured (WhatsApp template).
3. Second browser tries the same slot simultaneously → gets "slot just taken" with alternatives.
4. Reminder workflow scheduled (time-skip in test env) → reminder captured at T−24 h.
5. Customer replies "STOP" → consent revoked → next marketing message blocked (`blocked_consent`).
6. Customer cancels via manage link → staff calendar updates live; cancellation message sent.
7. Manager edits reminder workflow to 3 h before, tests, activates new version.
8. Upgrade Appointments package 1.0 → 1.1 → custom field "Preferred stylist" preserved.
