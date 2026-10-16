# Prototype usability test plan (WU-P0-16)

Tests the **Figma prototype** ("AI-UI", `docs/design/README.md`) for journeys **J-01** (idea → Coding + Design build) and **J-04** (install and customise a System), per `docs/spec/13_UI_UX_SPEC.md` §journeys. Target: **≥ 5 participants** matching PER-1 (solo developer/freelancer) and PER-2 (agency owner) — ideally 3 + 2. Remote (screen-share) or in person, 30–40 minutes each. The owner sends the prototype link; findings land in `docs/plans/usability-test-findings.md` (template below, summarised by AI from the filled forms).

## 1. Session script (moderator reads)

**Intro (3 min).** "Thanks for helping. You'll use a _clickable design_ of Zynoa, a workspace where AI agents build things for you. Nothing is real — nothing you do can break anything. We're testing the design, not you; there are no wrong answers. Please think aloud: say what you see, what you expect, what confuses you. May I record the session for note-taking only? You can stop anytime." _(Record consent verbally; no personal data beyond first name and role.)_

**Background (3 min).**

1. What do you do, and who are your clients?
2. Which AI tools do you use today for building/designing? What annoys you about them?
3. How do you currently keep track of client work (tasks, files, payments)?

## 2. Tasks — Journey J-01 (idea → build): GL-01 → ON-06 → ON-08 → PR-01 → PR-05 → PR-09 → PR-11

Scenario read to participant: _"A client wants a simple website for their bakery, with a booking form. Use Zynoa to get it built."_

| #   | Task (what we ask)                                                                             | Screens       | Success = participant…                                                    | Watch for                                                |
| --- | ---------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | "You've just logged in. Start this project."                                                   | GL-01 → ON-06 | finds the new-project path from Home without help                         | Do they use the ask bar or the Projects nav?             |
| 2   | "Finish describing the project in the wizard."                                                 | ON-06 (steps) | completes the wizard; understands services selection (Coding + Design)    | Step where they hesitate longest                         |
| 3   | "The AI made a plan. Check it and start the work — but first change one thing you don't like." | ON-08         | finds inline edit/regenerate, then Approve                                | Do they trust 'Approve'? Do they read assumptions/risks? |
| 4   | "A day later you come back. How far along is the work? What's blocking it?"                    | PR-01, PR-05  | reads milestone progress + blockers; explains "evidence %" in own words   | Is evidence-based progress legible or jargon?            |
| 5   | "Find out what the AI actually did in its last run, and what it cost."                         | PR-09         | opens a run detail, points at steps and cost                              | Can they find cost without prompting?                    |
| 6   | "The AI wants permission to deploy a preview. Decide."                                         | PR-11         | locates pending approval, reads the detail, approves/rejects deliberately | Do they understand what they're approving?               |

## 3. Tasks — Journey J-04 (install a System): EC-01 → EC-02 → EC-08 → EC-09 → CX-01 → EC-10

Scenario: _"Your bakery client also wants online appointment booking. Zynoa has installable mini-apps."_

| #   | Task                                                                        | Screens       | Success = participant…                                                                       | Watch for                                      |
| --- | --------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 7   | "Find something ready-made for appointment booking."                        | EC-01 → EC-02 | finds the Systems tab/filters, opens the booking system detail                               | Do 'Systems' vs 'Templates' labels make sense? |
| 8   | "Before installing: what will this thing be allowed to do?"                 | EC-02         | finds and paraphrases the plain-language permissions                                         | Trust reaction to permissions list             |
| 9   | "Install it and set it up for the bakery."                                  | EC-08         | follows the setup checklist; finds where services/staff/hours live                           | Checklist clarity                              |
| 10  | "Make it send a WhatsApp reminder 24h before each appointment."             | EC-09         | opens the workflow builder and modifies/adds the reminder step (or uses 'Describe workflow') | Do they try AI-describe or drag nodes first?   |
| 11  | "Book a test appointment the way a customer would."                         | CX-01         | completes the public booking flow                                                            | Consent step friction                          |
| 12  | "Check whether your test booking actually triggered the reminder workflow." | EC-10         | finds the run log and reads the step timeline                                                | Can they connect booking → run?                |

**After each task** (SEQ): "How difficult was that, 1 = very difficult … 7 = very easy?" + "What did you expect to happen?"

## 4. Wrap-up questions (5 min)

1. In one sentence, what is this product? _(comprehension check)_
2. Which part felt most valuable? Most confusing?
3. Would you trust it with a real client project? What would it take?
4. What would you expect this to cost per month? _(pricing signal for OD-04)_
5. If this existed today, what's the first real thing you'd use it for?

## 5. Feedback form (fields — owner creates it on any form tool, or WU-P0-15's survey page hosts it)

Name (first) · Role (PER-1/PER-2/other) · Date · Moderator — then per task 1–12: SEQ score (1–7), completed (yes/with help/no), observations (free text), participant quote — then wrap-up answers 1–5, overall severity flags (blocking / major / minor / cosmetic) with screen IDs, and "would use? (yes/maybe/no) + why".

## 6. Findings summary template (`usability-test-findings.md`)

Per spec Gate A exit item "prototype tested with ≥ 5 target users; findings written":

```markdown
# Usability test findings — {{DATE}}

Participants: N (PER-1 ×a, PER-2 ×b) · Prototype version: Figma {{VERSION/DATE}}

## Scores

| Task | Mean SEQ | Completion | Worst quote |

## Top issues (ranked: frequency × severity)

| # | Screen(s) | Issue | Severity | Evidence (who/quote) | Proposed fix |

## What worked

## Comprehension & trust (wrap-up 1,3)

## Pricing signals (wrap-up 4)

## Decisions needed (feed into Gate A report / design backlog)
```

## 7. Logistics checklist (owner)

- [ ] Figma prototype link set to "anyone with link can view" prototype mode; lock the version (docs/design: Figma version lock still open).
- [ ] Recruit ≥ 5 participants (3 × PER-1, 2 × PER-2); WhatsApp/LinkedIn outreach drafts come with WU-P0-15.
- [ ] 30–40 min slots; screen-share with recording consent.
- [ ] After sessions: hand filled forms/notes back to the AI → findings summary + Gate A input.
