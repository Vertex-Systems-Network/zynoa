# 08 — The Six AI Studios

All studios share these rules:
- A studio can be used **inside a project** (outputs linked to project/task, agents can use it) or via **Quick Create** (standalone; output goes to the user's Library; can be attached to a project later).
- Every generation is a `studio_jobs` row with estimate → reservation → execution → settlement.
- Every output is an `asset` + `asset_version` with full `provenance` and `rights.ai_generated=true`.
- Every output passes **content safety** (file 14 §7) before it is shown.
- Long jobs are asynchronous; the UI shows queued/running/succeeded/failed with progress, cost and retry.

---

## 1. Shared studio UI frame

```
┌ Studio header: name · project/quick-create context · model mode selector · credits estimate ┐
├ Left: inputs panel (prompt, references, parameters)   ┤ Center: canvas/preview/editor ┤ Right: versions, assets, comments ┤
└ Bottom: job queue for this studio (status, cost, retry, cancel) ┘
```
Keyboard: `Ctrl/Cmd+Enter` generate, `Esc` cancel focus, `[`/`]` previous/next version.

---

## 2. Coding Studio (Phase 2)

### 2.1 Requirements
| ID | Requirement |
|---|---|
| COD-001 | Connect GitHub via GitHub App (install on org/user, select repos); store installation only, never personal tokens. **Installation ownership must be verified:** enable "Request user authorization (OAuth) during installation"; on callback verify `state`, exchange the code for a user token, call `GET /user/installations`, accept the `installation_id` only if it is listed, then discard the user token. (The `installation_id` query parameter alone is attacker-controllable.) One installation may link to only one workspace unless the installing user is a member of both |
| COD-002 | Create a new app from starter templates: `nextjs-app` (Next.js + Tailwind + Vitest + Playwright), `node-api` (Fastify + Vitest), `static-site` (Astro or plain HTML), `python-api` (FastAPI + pytest) |
| COD-003 | For users without GitHub, a **VSN-managed internal Git repository** (bare repos in object storage via a git server such as Gitea/Forgejo in the coding plane) [DECISION NEEDED — OD-09]; export to GitHub later |
| COD-004 | Import existing repo → AI audit: stack detection, build/test commands, health report (builds? tests pass? lint?), risks, suggested backlog |
| COD-005 | Repository map: file tree + language stats + key files + symbol index (ctags/tree-sitter) refreshed per commit, used as agent context |
| COD-006 | Per-run sandbox from template image with toolchains (Node LTS, pnpm, Python 3.12, git, ripgrep, Playwright browsers) |
| COD-007 | Agent edits via patches; runs project commands from `vsn.json` (`install`, `dev`, `build`, `lint`, `typecheck`, `test`, `e2e`) auto-detected then user-confirmable |
| COD-008 | Branch per task `vsn/<TASK-KEY>-<slug>`; commits with conventional messages and `VSN-Task: <KEY>` trailer |
| COD-009 | Open PR with description: task link, acceptance criteria checklist, evidence summary, screenshots, risk notes |
| COD-010 | Preview: dev server in sandbox exposed via signed URL (short-lived) and/or preview deployment via DeployTarget |
| COD-011 | Coding Studio UI (ST-01): file tree, read-only code viewer with syntax highlight (Monaco read-only), diff viewer (side-by-side/inline), "Ask AI to change…" on selection, run timeline, terminal log viewer |
| COD-012 | Preview & Test Console (ST-02): iframe preview with device sizes, test results by suite with failing test details, screenshots, PR status/checks |
| COD-013 | Direct human editing in the browser editor (Monaco editable) with commit from UI — P2 stretch, else P3 |
| COD-014 | Review agent comments on PR (inline) and blocks verification on critical findings |
| COD-015 | Dependency and secret scanning in the sandbox before PR (e.g., `npm audit`/OSV, gitleaks) as evidence |

### 2.2 `vsn.json` (project coding config, committed to the user repo)
```json
{
  "version": 1,
  "packageManager": "pnpm",
  "commands": { "install": "pnpm install --frozen-lockfile", "dev": "pnpm dev --port 3000",
                "build": "pnpm build", "lint": "pnpm lint", "typecheck": "pnpm typecheck",
                "test": "pnpm test", "e2e": "pnpm exec playwright test" },
  "devPort": 3000,
  "requiredChecks": ["lint", "typecheck", "test", "build"],
  "env": { "staging": ["DATABASE_URL", "NEXT_PUBLIC_API_URL"] },
  "egressAllow": ["registry.npmjs.org", "api.example.com"]
}
```

### 2.3 Flow: "build me a web app" (J-01, coding part)
1. Plan approved with tasks like "Scaffold app", "Landing page", "Booking form", "E2E tests".
2. Supervisor dispatches `coder` on "Scaffold app": sandbox from `nextjs-app` template → repo created (GitHub or internal) → initial commit → CI-like checks in sandbox → evidence (build passed) → PR → verifier → done (auto-merge allowed for first scaffold into empty repo if policy allows).
3. Next tasks run in parallel up to concurrency; each on its own branch; `tester` adds E2E; `reviewer` reviews; previews exposed; screenshots attached.
4. Human reviews PR-11 approvals for protected merges; staging deploy by `release_manager`.

### 2.4 Sandbox specification
| Setting | Default |
|---|---|
| CPU / RAM / disk | 2 vCPU / 4 GB / 10 GB (plan-dependent max 8 vCPU / 16 GB / 50 GB) |
| Max lifetime | 2 hours of active run time; idle stop after 15 min; snapshotted and destroyed while a run waits for approval/input, restored on resume; destroyed ≤ 1 h after run end |
| Network egress | Deny-all except allow-list: package registries, Git host, VSN preview relay, project `egressAllow` |
| Ingress | Only via exposed ports through authenticated preview relay |
| Secrets | Only project-environment secrets explicitly mapped; injected as env vars |
| Filesystem | Ephemeral; snapshot on checkpoint (optional) |
| Isolation | microVM per run (Firecracker-class); never shared between workspaces |

---

## 3. Design Studio (Phase 3)

**Key decision (ADR-008):** VSN does **not** build a vector design editor. Design frames are **code-based** (React + Tailwind components rendered in an isolated iframe). This makes design-to-code lossless and reuses the coding stack.

| ID | Requirement |
|---|---|
| DES-001 | Design document per project (or standalone) containing frames on an infinite canvas (pan/zoom), grouped by flow |
| DES-002 | Generate screens from a brief (+ brand kit + optional reference images/URLs/Figma frame image); output N variants |
| DES-003 | Frame = component source code + device size; rendered in a sandboxed iframe (`sandbox="allow-scripts"`, no network, CSP) via an in-browser bundler (e.g., esbuild-wasm) or server-side render worker |
| DES-004 | Edit by prompt ("make the CTA larger, use secondary color") on whole frame or selected element (element picker maps DOM node → source location via data attributes) |
| DES-005 | Property panel for selected element: text content, color token, spacing, font size, radius, visibility — edits patch the source deterministically (AST transform), not via AI |
| DES-006 | Design tokens from brand kit → Tailwind theme preset; changing tokens re-renders all frames |
| DES-007 | Responsive preview: desktop/tablet/mobile toggles |
| DES-008 | Prototype mode (ST-04): link hotspots between frames; click-through preview; share link (SH-01) |
| DES-009 | Comments pinned to frame coordinates; review status per frame (draft/in review/approved) |
| DES-010 | Version history per frame; compare two versions side by side |
| DES-011 | Accessibility check per frame (axe-core in render worker): contrast, labels, landmarks → evidence |
| DES-012 | Handoff: "Send to Coding" creates coding tasks with frame code as starting component, plus token preset; design→code visual diff evidence (screenshot of implemented page vs frame, pixel-diff score) |
| DES-013 | Figma: import frame images as references (Figma REST API, read scope) and export frames as PNG/SVG; full Figma write via Figma plugin is P8 [VERIFY API capabilities] |
| DES-014 | Export: PNG, SVG (via render), PDF of flow, React component zip |

---

## 4. Research Studio (Phase 3)

| ID | Requirement |
|---|---|
| RES-001 | Research run from a question with depth: quick (≤ 5 sources, ≤ 2 min), standard (≤ 15 sources), deep (≤ 40 sources, multi-step) |
| RES-002 | Planner step produces sub-questions and search queries; user can edit before run (optional "review plan" toggle) |
| RES-003 | Search via `SearchProvider` adapters (provider-native web search, Brave, Tavily) [VERIFY terms incl. storage & display of results]; fetch via fetcher service (robots.txt respected, 5 MB cap, HTML→text, PDF text extraction) |
| RES-004 | Extraction: per-source notes with quotes and locations; source reliability heuristic (domain type, date, author presence) |
| RES-005 | Synthesis into an editable report (Markdown document asset) with inline citations `[n]`; every factual sentence must map to ≥ 1 `research_claims` row with sources |
| RES-006 | Citation check: automated verification that quoted text exists in the source snapshot; unsupported claims flagged in red |
| RES-007 | Confidence labels per section; "Limitations" section auto-generated |
| RES-008 | Include user documents (Library) as sources alongside web |
| RES-009 | Export MD, PDF, DOCX; save findings as project memory facts |
| RES-010 | Monitored topics (re-run weekly with diff) — P8 |

Copyright rule: reports quote briefly and summarise; source snapshots are stored privately only for verification and expire after 180 days.

---

## 5. Images Studio (Phase 3)

| ID | Requirement |
|---|---|
| IMG-001 | Text-to-image with model mode, aspect ratio presets (1:1, 4:5, 9:16, 16:9, 3:2), count (1–4), style presets, negative prompt where supported, seed where supported |
| IMG-002 | Reference images (style/subject) where provider supports |
| IMG-003 | Edit: inpainting with brush mask, outpainting/expand, instruction edit ("remove the background person") |
| IMG-004 | Variations, upscale (2×/4×), background removal |
| IMG-005 | Brand kit application: palette and style prompt prefix; logo overlay as deterministic composition (not generated) |
| IMG-006 | Gallery with filters (project, tag, model, date), compare up to 4, favourite, version history |
| IMG-007 | Batch generation from a CSV/list of prompts (≤ 50) with cost estimate and approval if over threshold |
| IMG-008 | Export PNG/JPG/WebP, sizes; social presets (Instagram post/story, Facebook, LinkedIn, YouTube thumbnail) via deterministic resize/crop |
| IMG-009 | Safety: prompt pre-check + output classifier; blocked outputs never stored in user-visible storage; real-person likeness policy (file 14 §7) |

---

## 6. Audio Studio (Phase 4)

| ID | Requirement |
|---|---|
| AUD-001 | Text-to-speech: voice library (stock voices per provider), language, speed, style; SSML-lite markup (pauses, emphasis) |
| AUD-002 | Long-form TTS: split script by paragraphs, generate in parallel, stitch with crossfade (media-worker) |
| AUD-003 | Transcription: language auto-detect (incl. Urdu where supported [VERIFY]), speaker diarisation, timestamps, edit transcript, export TXT/SRT/VTT/DOCX |
| AUD-004 | Dubbing: transcript → translation (LLM) → TTS per segment aligned to timestamps → mix with original background (if separated) |
| AUD-005 | Cleanup: noise reduction, loudness normalisation (EBU R128 −16 LUFS for web), silence trim (FFmpeg filters) |
| AUD-006 | **Voice cloning only with verified consent**: subject records the consent script (displayed text with workspace name and date) → STT verifies spoken text matches (≥ 90% word match) → voice profile created; consent revocable; cloned voice usable only in the workspace that holds the consent |
| AUD-007 | Waveform editor (ST-10): trim, split, segment re-generate, speaker labels |
| AUD-008 | Music beds: royalty-safe library or licensed generator [VERIFY licence] — optional |

---

## 7. Video Studio (Phase 4)

| ID | Requirement |
|---|---|
| VID-001 | Brief (goal, audience, duration 6–90 s, aspect ratios, tone, brand kit, references) → script (LLM) with scene list |
| VID-002 | Storyboard (ST-07): shots with description, duration, camera notes, on-screen text, voiceover lines; thumbnail per shot (image generation) |
| VID-003 | Per-shot generation: text-to-video or image-to-video via provider adapters (Veo/Runway/Luma etc. [VERIFY availability/pricing]); stock footage upload alternative |
| VID-004 | Voiceover from Audio Studio; captions from script/transcript with styling presets |
| VID-005 | Assembly in media-worker: concat, trims, transitions (cut/fade), audio mix (VO + music ducking), caption burn-in or sidecar, logo bumper; output H.264/AAC MP4 |
| VID-006 | Timeline (ST-08): reorder shots, trim in/out, replace shot (regenerate/upload), edit captions, change music volume; timeline stored as `video_compositions.timeline` JSON |
| VID-007 | Export presets 9:16 (1080×1920), 1:1 (1080×1080), 16:9 (1920×1080); reframing per aspect via per-shot crop focus |
| VID-008 | Cost estimate per shot and total before generation; approval above threshold |
| VID-009 | Provenance + AI-generated label embedded in metadata; C2PA manifest where tooling allows [VERIFY] |

---

## 8. Cross-studio asset graph (Phase 3)

- `asset_dependencies` record `derived_from`, `uses`, `embeds` between versions (e.g., video v3 uses voiceover v2 and images v1, v4).
- **Impact analysis:** when an asset gets a new approved version, find dependants (transitively, depth ≤ 5) whose latest version uses an older version → create "Update suggested" items on the project (and optional tasks), never auto-overwrite approved assets.
- Asset panel shows "Used in" and "Built from" graph (simple list in P3, graph view P8).

---

## 9. Quick Create (GL-04)

- Launcher with six tiles; opens the studio in standalone mode with personal Library scope.
- "Attach to project" action on any output: choose project → copies/links asset into project scope (respecting workspace boundaries; cross-workspace attach = copy with confirmation).
