# 01 — Product Vision

## 1. The problem

Today, a small business owner, freelancer or product team who wants to use AI to get real work done has to:

- jump between 6–10 separate tools (a chatbot, an AI app builder, a design tool, an image generator, a video tool, a voice tool, a task tracker, an automation tool);
- copy outputs manually from one tool into the next;
- keep track of which version of which asset is current;
- trust AI claims ("done!") without evidence;
- pay several subscriptions with no single view of cost;
- build business software (bookings, invoices, reminders) from scratch or buy rigid SaaS.

## 2. The product

**VSN AI is one workspace where a human describes an outcome and a supervised team of AI agents plans, creates, verifies and operates the deliverables, with every asset, task, cost and approval linked in one project.**

Four pillars:

| Pillar | Contains | Primary value |
|---|---|---|
| **AI Creation Studios** | Coding, Design, Images, Video, Audio, Research | Create any deliverable type in one place |
| **AI-supervised Project OS** | Projects, plan, tasks, board, agents, evidence, QA, releases | Work is planned, tracked and *verified*, not just generated |
| **Reusable Ecosystem** | Skills, Plugins, Templates, Library, Marketplace | Don't start from zero; reuse knowledge and connections |
| **Business Systems + Workflows** | Appointments, Invoices, Events, CRM, Marketing, To-do; no-code workflow engine | Run a business on installable, customisable mini-apps |

## 3. Who it is for (personas)

| ID | Persona | Situation | What success looks like |
|---|---|---|---|
| PER-1 | **Sana — solo developer / freelancer** (Lahore) | Builds websites and small apps for clients; uses ChatGPT + Cursor + Canva | Delivers a client site in 3 days instead of 3 weeks; shares a preview link with the client |
| PER-2 | **Bilal — agency owner** (Karachi, 12 staff) | Runs projects for many clients; needs team assignment, review and cost control | Every project has a plan, owners, evidence and per-client cost |
| PER-3 | **Ayesha — content creator / marketer** | Produces social campaigns: research, visuals, voiceovers, short videos | One campaign project produces all assets with consistent branding |
| PER-4 | **Usman — salon owner** (SME, non-technical) | Takes bookings on WhatsApp and paper; no-shows hurt revenue | Customers book online; automatic WhatsApp/SMS reminders; simple dashboard |
| PER-5 | **Fatima — organisation admin** (mid-size company) | Wants AI used safely with approvals, budgets and audit | Controls who can do what, sees spend, nothing leaves without approval |
| PER-6 | **End customer of a business** (e.g., salon client) | Never logs into VSN AI | Books, pays an invoice, or RSVPs through a public page in < 1 minute |
| PER-7 | **VSN operator** (internal staff) | Runs the platform | Sees provider health, investigates incidents, moderates content and marketplace |

## 4. Entry points

A user can start in five ways; all of them end up inside the same project model.

1. **New Project** — goal + choose any of the six studios → AI plan → execution.
2. **Import Existing** — connect a Git repo, Figma file or upload documents → AI audit → plan.
3. **Use a Template** — start from a pre-configured project/studio/system template.
4. **Install a System** — install a ready-made business application with guided setup.
5. **Ask VSN AI** — universal chat; AI suggests which of the four paths fits and pre-fills it.

Plus **Quick Create**: produce a standalone asset (an image, a voiceover, a report) without a project; it lands in the Library and can be attached to a project later.

## 5. Product principles (use these to resolve design questions)

1. **Outcome-first.** Accept natural-language goals. Never require a technical interview to start.
2. **Composable.** Any combination of the six studios in one project; services can be added or removed later.
3. **Evidence over claims.** Progress is computed from verified evidence (tests passed, reviewer approved, file exists, checks green), never from an agent saying "done".
4. **Human in control of risk.** Agents work freely inside sandboxes and budgets; anything public, costly, destructive, financial or production-facing needs a policy-approved approval.
5. **Provider-independent.** No business logic depends on a specific model vendor. Models are rows in a registry.
6. **Traceable.** Every asset knows where it came from (prompt, model, version, task, author, licence) and what depends on it.
7. **Progressive setup.** Ask for Git/Figma/calendar/payment connections only when a task needs them.
8. **Scope-aware collaboration.** Individual workspaces have exactly one human. Organization workspaces have many humans with roles. The engine is the same; policies differ.
9. **Cost-transparent.** Show estimated cost before expensive work, actual cost after, and enforce budgets.
10. **Safe by default.** Content safety, consent and privacy are platform features, not afterthoughts.

## 6. What makes it different (positioning)

| Competitor type | Examples | What they do well | VSN AI difference |
|---|---|---|---|
| AI app builders | Lovable, Bolt, Replit Agent, v0 | Fast code generation and preview | VSN adds multi-studio assets, team project management, evidence-based progress, business Systems |
| AI creative suites | Canva AI, Adobe Firefly, Runway | High-quality media creation | VSN links media to projects, tasks, code and campaigns; multi-provider |
| Project tools with AI | Jira, ClickUp, Asana, Linear | Task management | VSN's agents *do* the tasks and attach evidence |
| Automation tools | Zapier, Make, n8n | Integrations and workflows | VSN ships complete Systems (data + UI + workflows), installable by non-technical users |
| Chat assistants | ChatGPT, Claude, Gemini apps | General intelligence | VSN is a structured workspace with durable, auditable, multi-step execution |

**[VERIFY]** Competitor features change quickly; refresh this table before any sponsor meeting.

**Honest risk:** each competitor is strong in its own lane. VSN AI wins only if the *combination* (one project graph, verified progress, ready Systems, local market fit such as WhatsApp reminders and PKR billing) is meaningfully better for a specific first customer segment. The first segment is **[DECISION NEEDED]** (file 17, OD-01).

## 7. Non-goals (explicitly out of scope for the first 24 months)

- Training a foundation model from scratch.
- A full Figma replacement (vector editor with pen tool, boolean ops, multiplayer cursors).
- A full non-linear video editor comparable to Premiere/DaVinci.
- Unrestricted autonomous production actions without approval policies.
- An open public marketplace with unreviewed third-party code (community packages only after review, Phase 8).
- Native mobile apps (responsive web first; mobile apps Phase 8+).
- Crypto payments, financial advice, medical/legal decision automation.

## 8. Glossary

| Term | Meaning in this spec |
|---|---|
| **User** | A human with a VSN AI account. |
| **End customer** | A person who interacts with a business's installed System through public pages, without a VSN AI account. |
| **Workspace** | The tenant boundary. Type `personal` (exactly one human member) or `organization` (many). All data belongs to one workspace. |
| **Organization** | A workspace of type `organization`, with seats, teams, roles and policies. |
| **Team** | A group of members inside an organization, used for project access and assignment. |
| **Project** | A container for a goal, enabled services, plan, tasks, assets, agents, discussions, releases and budget. |
| **Service / Studio** | One of: `coding`, `design`, `images`, `video`, `audio`, `research`. A project enables a subset. |
| **Plan** | The AI-proposed, human-approved set of requirements, milestones and tasks. |
| **Task** | A unit of work with acceptance criteria, owner (human or agent), state and evidence. |
| **Evidence** | A machine- or human-verifiable record proving an acceptance criterion: test result, check result, approval, artifact hash, screenshot, citation. |
| **Agent** | An AI worker with a role, a toolset, a policy and a budget. |
| **Agent Run** | One durable execution of an agent on a task (a Temporal workflow). |
| **Supervisor** | The orchestrating agent for a project; schedules runs, verifies evidence, escalates. |
| **Model / Provider** | An AI model offered by a provider (OpenAI, Anthropic, Google, etc.), registered in the provider registry. |
| **VSN Auto / Fast / Pro / Native** | Routing modes: best-fit, cheapest-fast, highest-quality, VSN-hosted open-weight. |
| **Asset** | A versioned file or document (code snapshot, design, image, audio, video, report). |
| **Library** | Workspace-level store of reusable assets and knowledge (brand kits, docs, prompts). |
| **Skill** | Versioned instructions (+ optional resources/scripts) that shape how an agent performs a type of task. Compatible with the `SKILL.md` folder convention. |
| **Plugin** | A permissioned connector to an external service (OAuth/API key/MCP/webhook). |
| **Template** | A pre-configured starting point for a project, studio output or System. |
| **System** | An installable business mini-application: data entities + views + workflows + public pages + settings. |
| **System Instance** | One installation of a System in a workspace. |
| **Workflow** | A versioned automation graph (triggers, conditions, actions, AI nodes, approvals). |
| **Package** | The distributable unit for Skills, Plugins, Templates and Systems, described by a manifest. |
| **Credits** | The internal usage currency; AI and compute usage is priced in credits. |
| **Approval** | A recorded human decision allowing a gated action. |
| **Release** | A versioned promotion of a deliverable to preview, staging or production. |
