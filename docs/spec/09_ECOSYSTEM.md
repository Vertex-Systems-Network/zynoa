# 09 — Ecosystem: Library, Skills, Plugins, Templates, Marketplace

## 1. User Library (Phase 1)

| ID | Requirement |
|---|---|
| LIB-001 | Upload files (drag/drop, multi-file, ≤ 500 MB per file in P1; resumable multipart for > 50 MB) to personal, workspace or project scope |
| LIB-002 | Folders, tags, rename, move, duplicate, soft delete/restore |
| LIB-003 | Versions: uploading a file with the same name into the same folder offers "new version"; version list with download/restore |
| LIB-004 | Previews: images, PDF (first pages), text/Markdown, code, audio/video players |
| LIB-005 | Text extraction (PDF, DOCX, PPTX, XLSX, TXT, MD, HTML) → chunks (≈ 800 tokens, 100 overlap) → embeddings; status shown ("Indexed ✓") |
| LIB-006 | Search: keyword + semantic hybrid with filters (type, tag, scope, project, date); results respect permissions |
| LIB-007 | Link assets to projects/tasks (asset_links) without copying |
| LIB-008 | Brand kit editor: logos, colours (with token names), fonts (Google Fonts list or upload with licence confirmation), tone of voice, do/don't examples; default brand kit per workspace |
| LIB-009 | Saved prompts library (personal/workspace) usable in chat and studios |
| LIB-010 | Storage quota per plan; usage shown; upload blocked at quota with upgrade prompt |
| LIB-011 | Malware scan on upload (ClamAV or provider) before the file is downloadable by others |

**Training rule (visible in UI):** "Files in your Library are used only to answer your requests and power your projects. They are never used to train shared AI models."

## 2. Package model (common to Skills, Plugins, Templates, Systems, Workflows)

Everything distributable is a **package** with a **manifest**, a **version** (semver) and a **bundle** (zip in object storage, sha256-pinned).

### 2.1 Visibility
| Visibility | Who publishes | Who can see/install | Phase |
|---|---|---|---|
| `official` | VSN | All workspaces | P5 |
| `private` | A user | Only that user (personal scope) | P5 |
| `organization` | Org admin | Members of that org | P5 |
| `community` | Verified external publisher, after review | All | P8 |

### 2.2 Install lifecycle
`browse → detail (permissions preview) → install (choose scope: workspace/project/user) → configure (settings schema form, connections) → active → update (changelog, migrations, re-consent if permissions grew) → disable → uninstall (data retention choice for Systems)`.

## 3. Skills (Phase 5)

| ID | Requirement |
|---|---|
| SKL-001 | Skill = folder with `SKILL.md` (YAML frontmatter `name`, `description`, optional `when_to_use`, `inputs`, `version`) + optional `resources/` (reference docs, examples) + optional `scripts/` |
| SKL-002 | Import: upload zip/folder or Git URL; validate structure; scan scripts (static checks, secrets, dangerous calls); scripts run only inside sandboxes |
| SKL-003 | Skill editor (EC-04): Markdown editor with frontmatter form, resource uploads, test panel (sample input → run agent with skill vs without → compare outputs) |
| SKL-004 | Scope: personal, workspace, project; enable/disable per project |
| SKL-005 | Selection: before an agent run, the skill router picks ≤ 3 relevant skills by matching task text against skill `description`/`when_to_use` (embedding similarity + LLM confirm); always-on skills configurable per project |
| SKL-006 | Loaded skills are included in agent context as `<skill name=…>` blocks; resources loaded on demand via `skill.read_resource` tool |
| SKL-007 | Versioning: pin per project; update prompts show diff |
| SKL-008 | Official skills at P5 launch (examples): `code-review-checklist`, `nextjs-conventions`, `seo-audit`, `accessibility-audit`, `brand-voice`, `research-methodology`, `landing-page-copy`, `test-writing`, `api-design`, `invoice-terms-pk` |

## 4. Plugins / Connections (Phase 2 for GitHub, Phase 5 framework-wide)

| ID | Requirement |
|---|---|
| PLG-001 | Connector framework (`Connector` interface, file 03 §10): metadata, auth type, actions (input/output schemas, risk level), triggers (webhook/polling), health check |
| PLG-002 | OAuth 2.0 (Authorization Code + PKCE), token refresh, encrypted storage, scope display |
| PLG-003 | API-key connectors with test call before save |
| PLG-004 | **MCP**: connect remote MCP servers (Streamable HTTP transport) with auth headers/OAuth; list tools; admin selects allow-listed tools and classifies risk (default external_write) |
| PLG-005 | Connection ownership: personal (owner only) or workspace-shared (admin); **grants** per project/system/workflow with allowed actions (connection_grants) |
| PLG-006 | Health checks every 6 h + on failure; failing connections notify owner; dependent runs pause with clear message |
| PLG-007 | Revoke/disconnect: tokens revoked at provider where API allows, grants removed, dependent workflows paused within 60 s |
| PLG-008 | Incoming webhooks: unique URL per endpoint, HMAC verification, replay protection (timestamp + nonce), payload size ≤ 1 MB |
| PLG-009 | First-party connectors at P5: GitHub, GitLab, Google Drive, Google Calendar, Gmail/SMTP, Slack, Figma (read), Notion (read/write pages) [VERIFY], generic HTTP request, generic MCP |
| PLG-010 | Messaging connectors (P6): Twilio SMS, Pakistan SMS aggregator, WhatsApp Business Cloud API, email (Resend/SES) |
| PLG-011 | Deploy connectors (P2/P5): Vercel, Netlify, Cloudflare Pages, Fly.io [VERIFY APIs] |

## 5. Templates (Phase 5; System templates Phase 6)

| ID | Requirement |
|---|---|
| TPL-001 | Template types: `project` (services, plan skeleton, tasks, starter repo, skills), `studio` (e.g., image style preset, video format, report structure), `system` (a configured System preset, e.g., "Barber shop") |
| TPL-002 | Apply template in New Project wizard (step 4) or in a studio; preview shows what will be created |
| TPL-003 | Fork: "Save as my template" from any project/system (strips data, keeps structure); scope personal/org |
| TPL-004 | Template parameters (manifest `parameters` with JSON schema) asked at apply time (e.g., business name, currency, opening hours) |
| TPL-005 | Official templates at P5: SaaS landing page, Portfolio site, Product launch campaign, YouTube explainer video, Market research report, Mobile app UI kit, Restaurant website |

## 6. Package manifest (`vsn.package.json`)

```json
{
  "$schema": "https://{{APP_DOMAIN}}/schemas/package-manifest-v1.json",
  "manifestVersion": 1,
  "type": "system",                     // skill | plugin | template | system | workflow
  "slug": "appointments",
  "name": "Appointments",
  "version": "1.2.0",
  "publisher": { "name": "VSN", "verified": true },
  "summary": "Online booking, staff calendars and reminders.",
  "categories": ["scheduling"],
  "engines": { "vsn": ">=1.0.0 <2.0.0", "systemsRuntime": "^1.0.0" },
  "dependencies": { "core.booking": "^1.0.0", "core.contacts": "^1.0.0", "core.notifications": "^1.0.0" },
  "permissions": [
    "contacts.read", "contacts.write", "bookings.write", "messages.send.transactional", "public_pages.publish"
  ],
  "connections": [
    { "key": "messaging", "connectors": ["whatsapp_cloud", "sms_twilio", "sms_pk_aggregator"], "required": false },
    { "key": "calendar", "connectors": ["google_calendar"], "required": false }
  ],
  "settingsSchema": { "type": "object", "properties": { "businessName": { "type": "string" } }, "required": ["businessName"] },
  "parameters": {},                      // template-time parameters
  "contents": {
    "entities": "entities/*.json",       // System only
    "views": "views/*.json",
    "workflows": "workflows/*.json",
    "publicPages": "public/*.json",
    "messageTemplates": "messages/*.json",
    "skills": "skills/*",
    "seed": "seed/*.json"
  },
  "migrations": "migrations/*.json",     // System upgrades (file 10 §4)
  "changelog": "CHANGELOG.md",
  "pricing": { "model": "free" }         // free | one_time | subscription (P8 community)
}
```

Validation: Zod schema `PackageManifestSchema` in `packages/contracts`. Unknown permissions → reject. Requested permissions shown to installer in plain language ("Can send transactional WhatsApp/SMS messages to your customers").

## 7. Marketplace (Phase 5; community Phase 8)

| ID | Requirement |
|---|---|
| MKT-001 | Explore (EC-01): search, filters (type, category, publisher, verified, price), sort (popular, new, rating P8) |
| MKT-002 | Item detail (EC-02): description, screenshots, permissions in plain language, compatibility, versions & changelog, publisher, install button with scope selector |
| MKT-003 | Install analytics (installs count) for official packages |
| MKT-004 | Org catalog: admins publish org-private packages from their templates/skills/systems |
| MKT-005 | Update channel: notify installers of new versions; auto-update policy per installation (`none`/`patch`/`minor`) |
| MKT-006 | Moderation (AD-09, P7): review queue for org→community submissions (P8), automated scans (manifest lint, permission diff, malware/secret scan, script static analysis), suspend package |
| MKT-007 | Community publishing with publisher verification, revenue share, ratings and reviews (genuine installs only) — P8 |
