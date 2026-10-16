# Customer validation plan (WU-P0-15)

Goal (Gate A): evidence that the target users want Zynoa, and a recommendation for **OD-01 (beachhead segment)** — spec default: (a) freelancers/small agencies first, validate (b) SMEs in parallel. Assets: the live waitlist + micro-survey page (`apps/site` → `/early-access`, submissions via `NEXT_PUBLIC_WAITLIST_ENDPOINT`), the interview guides and outreach drafts below. Owner shares links and books interviews; AI analyses responses and writes the OD-01 recommendation.

## 1. Waitlist micro-survey (already on the page)

Name · Email* · Role (maps to PER-1..5) · "Biggest problem you'd want this to solve?" · updates opt-in (unchecked). Keep it this short — depth comes from interviews.

## 2. Extended survey (owner creates on a form tool; link from thank-you message)

1. Role + team size. 2. Which of these did you do last month? (built website/app for a client · designed visuals · produced social content · took customer bookings · sent invoices · chased payments) 3. Which tools do you pay for today, and roughly how much per month? 4. Where does the most time leak in a typical client project? 5. "An AI team plans the work, builds it, and shows evidence it works — every task, cost and approval in one place." — How valuable, 1–5? What would make it a 5? 6. Would you rather: AI builds it fully / AI drafts + you approve each step / you build with AI help? 7. What would make you NOT trust this? 8. Fair monthly price for your use (PKR or USD)? 9. May we interview you for 20 minutes? (contact)

## 3. Interview guides (20 min each; record with consent; Roman Urdu or English per participant)

**Shared opening (all personas):** current workflow walkthrough of the _last real project/booking/campaign_ — "walk me through it from the first client message to getting paid"; where did time/money leak; which tools, which spreadsheets/WhatsApp threads hold it together.

- **PER-1 freelancer:** How do you win work? What part of delivery do clients chase you about? Have you used AI coding tools on client work — what broke your trust? Would a client-visible preview link + evidence of testing change what you can charge? Price anchor: current tool spend.
- **PER-2 agency owner:** How do you assign and review work across staff? How do you know a project's real cost? What would "evidence instead of 'done!'" change in your review process? Who approves spend today? Would per-client cost tracking alone be worth paying for?
- **PER-3 creator/marketer:** Campaign anatomy — how many tools from idea to published post? Where does brand consistency break? What's your render/voiceover budget? Would one project producing all assets change your pricing or volume?
- **PER-4 SME owner (salon/clinic):** How do bookings arrive today, and how many no-show per week? What happens when you miss a WhatsApp? Have you tried any booking app — why did it stick or not? Would automatic WhatsApp reminders be worth PKR ___/month? (test 2–3 price points)
- **PER-5 org admin:** What's your policy on staff using AI today? What would you need to see before approving org-wide use (audit, budgets, approvals)? Who signs off, and what's that process?

**Close (all):** "If this existed next month, what's the first real thing you'd run through it?" + permission to follow up.

## 4. Outreach drafts

**WhatsApp (Roman Urdu, warm contacts):**

> Salam {{NAME}}! Ek software bana rahe hain — Zynoa — jisme AI agents aapke liye website/design/content banate hain aur booking/invoice jaise kaam sambhalte hain, sab kuch ek jagah, har kaam ke saboot ke saath. Aap jaise {{ROLE}} ki raye chahiye: 2 minute ka form ({{SURVEY_LINK}}) ya 20 minute ki call? Jawab me aap jo keh denge wohi product ka rukh tay karega.

**WhatsApp (English):**

> Hi {{NAME}} — building Zynoa: one workspace where supervised AI agents plan and build client work (sites, designs, content) and run business systems (bookings, invoices) with evidence for every task. Your take as a {{ROLE}} would genuinely shape it — 2-min survey ({{SURVEY_LINK}}) or a 20-min call?

**LinkedIn post:**

> We're building Zynoa — describe an outcome, and a supervised team of AI agents plans it, builds it, and shows its evidence: every task, cost and approval in one place. Built in Pakistan, for freelancers, agencies and SMEs first. If that's you, the waitlist + 2-minute survey is here: {{WAITLIST_LINK}} — every answer shapes what we build first.

**Email (communities/groups):** subject "Would you use an AI team that shows its work?" — 3 sentences: what it is, 2-min survey link, interview ask with calendar link.

## 5. Analysis → OD-01 recommendation (AI does this when responses arrive)

Inputs: waitlist rows + survey + interview notes. Method: per segment (a/b/c per OD-01) score — waitlist volume share, mean value rating (Q5), price signal vs provider costs (WU-P0-14), trust blockers count, time-to-value (how soon Phase 1–2 features serve them). Output: `docs/plans/od-01-recommendation.md` — recommended beachhead + runner-up to validate in parallel, with the raw numbers, and the consent gate: **owner approves the segment** (spec: human "approves segment"). Target sample before recommending: ≥30 survey responses or ≥8 interviews with ≥2 per candidate segment.

## 6. Owner checklist

- [ ] Connect a form backend (any webhook/form service) and set `NEXT_PUBLIC_WAITLIST_ENDPOINT`; until then the page shows a closed state and collects nothing. (Site deploy itself stays behind the no-deploy directive — enabling hosting is a separate owner-approved PR.)
- [ ] Create the extended survey from §2 on a form tool; link it in the thank-you flow.
- [ ] Send outreach (§4) to ≥30 contacts across PER-1..5; book ≥8 interviews.
- [ ] Hand responses/notes back → AI writes the OD-01 recommendation for your approval.
