# 14 — Security, Privacy and Content Safety

## 1. What we protect, from whom

| Asset | Why it matters |
|---|---|
| Customer code, documents, designs, media | Confidential business data |
| Tenant secrets (OAuth tokens, API keys, env vars) | Access to customers' other systems |
| End-customer personal data (names, phones, bookings, invoices) | Privacy law, trust of the businesses using VSN |
| Credits / payment flows | Direct financial loss |
| Provider API keys (platform) | Unlimited spend, account bans |
| Platform integrity & reputation | Abuse (spam, deepfakes, malware hosting) can get VSN banned by providers/app stores/payment processors |

| Attacker | Example |
|---|---|
| Malicious tenant | Escapes sandbox, reads other tenants' data, mines crypto, hosts phishing on preview URLs, sends spam via Systems |
| Compromised/curious member | Accesses projects they're not a member of |
| External attacker | Credential stuffing, XSS, SSRF via fetchers, webhook forgery |
| Prompt injection | Untrusted web page/repo/email instructs an agent to exfiltrate secrets or push malicious code |
| Malicious package publisher (P8) | Skill/plugin with harmful scripts |
| Insider (operator) | Unjustified access to customer data |

## 2. Security requirements

| ID | Requirement | Phase |
|---|---|---|
| SEC-001 | Tenant isolation: service-layer scoping + RLS + isolation test suite (file 05 §6) | P1 |
| SEC-002 | AuthN hardening per file 05 §2; MFA available to all, enforceable by orgs (P7) | P1 |
| SEC-003 | Security headers: HSTS (preload), CSP (nonce-based, no `unsafe-inline` scripts), `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, frame-ancestors restrictions | P1 |
| SEC-004 | Output encoding everywhere; Markdown rendered with a sanitiser allow-list; no `dangerouslySetInnerHTML` outside the sanitiser component | P1 |
| SEC-005 | File uploads: type sniffing (not extension trust), size limits, malware scan, served from a separate **user-content domain** with `Content-Disposition` and no cookies | P1 |
| SEC-006 | SSRF protection for every server-side fetch (research fetcher, `http.request` node, webhooks tests, MCP URLs): resolve DNS, block private/link-local/metadata IP ranges, re-check after redirects, allow only http(s), max size/time | P3/P5/P6 |
| SEC-007 | Secrets envelope encryption (file 03 §7); secrets never returned after creation; access audited | P1 |
| SEC-008 | Sandbox isolation (§4) | P2 |
| SEC-009 | Preview & customer deploys isolated (§4.3) | P2 |
| SEC-010 | Webhook verification (HMAC/signatures, timestamp tolerance 5 min, replay cache) | P2 |
| SEC-011 | Rate limiting & abuse detection (per IP/user/workspace/endpoint class) | P1 |
| SEC-012 | Audit log with hash chain; tamper-evident; exportable | P1 |
| SEC-013 | Dependency scanning, SAST (Semgrep), secret scanning (gitleaks), container scanning (Trivy), SBOM per image | P0 |
| SEC-014 | Operator break-glass access with dual approval, time-box, audit, customer-visible access log (Enterprise) | P7 |
| SEC-015 | External penetration test before public launch and annually | P7 |
| SEC-016 | Incident response plan, on-call, breach notification procedure | P7 |
| SEC-017 | Backups encrypted; restore tested quarterly | P1/P7 |
| SEC-018 | Package (skill/plugin/system) scanning and signing | P5 |

## 3. Tenant isolation details
See file 05 §6. Additional rules:
- Object storage keys always prefixed by workspace; signed URLs scoped to one object, ≤ 15 min.
- Redis keys namespaced `ws:<id>:…`; SSE subscriptions validated per event.
- Vector search queries always include the `workspace_id` (and scope/owner) filter **inside** the SQL, never filtered in application code afterwards. Because HNSW applies such filters after the index scan, use pgvector iterative scans (≥ 0.8) or exact search for small workspaces (file 04 §16) so tenants don't get empty results.
- Caches never shared across workspaces for tenant data.
- Logs include workspaceId for investigation but never content.

## 4. Sandboxes, previews, deployments

### 4.1 Code sandboxes
- One microVM per agent run (or per user dev session), never reused across workspaces; destroyed after use.
- No access to VSN internal network, cloud metadata endpoints, or other sandboxes.
- Egress **deny-by-default** with allow-list (file 08 §2.4); DNS through filtering resolver; outbound SMTP blocked; bandwidth caps.
- CPU/memory/disk/process limits; wall-clock limits; crypto-mining detection (sustained CPU + known pool domains) → kill + flag.
- Secrets injected only from mapped project environment; sandbox logs scrubbed for known secret values before storage.

### 4.2 Design-frame and HTML rendering
- User/AI-generated frame code renders in `<iframe sandbox="allow-scripts">` on a **separate origin** (`{{RENDER_DOMAIN}}`), CSP `default-src 'none'; script-src 'self' blob:; style-src 'unsafe-inline' 'self'; img-src data: blob: {{ASSET_DOMAIN}}; connect-src 'none'`.
- No access to app cookies or storage; messages via `postMessage` with origin checks.

### 4.3 Previews and customer deployments
- Preview URLs on a **different registrable domain** from the app (e.g., `{{PREVIEW_DOMAIN}}` ≠ `{{APP_DOMAIN}}`) so cookies/storage can't be shared — mandatory.
- Previews require a signed token or share link by default (not publicly indexable); `X-Robots-Tag: noindex`.
- Phishing/abuse scanning of public deployments (Systems pages and VSN-hosted sites): URL reputation, brand-impersonation heuristics, reports → AD-11.
- Customer workloads run in an isolated cloud account/project with no network path to the control plane.

## 5. Agent-specific security
- Capability separation and taint tracking (file 07 §11).
- Agents never see raw secret values; tools return `[REDACTED]` where secrets would appear.
- Git pushes only to `vsn/*` branches; force-push disabled; commit signing with a VSN bot key (optional) for provenance.
- Generated code scanned (dependency audit, secret scan, SAST light) before PR; results become evidence.
- Agents cannot modify CI configuration or branch protection without approval (`.github/workflows/*` changes → `require_approval`).

## 6. Web & API hardening checklist
- Session fixation prevention; cookie flags (file 05 §2).
- CSRF protection; CORS allow-list (app domains only).
- Input size limits (JSON 1 MB default; specific endpoints larger).
- Uniform 404 for cross-tenant access.
- Timing-safe comparisons for tokens; tokens we issue (invitations, share links, public manage/view links, API keys) stored hashed (SHA-256) with high entropy; Better Auth session tokens follow its own storage model (opaque, cookie-signed; file 04 §1) [VERIFY hashing option].
- Account enumeration resistance on sign-in/reset ("If an account exists…").
- CAPTCHA (privacy-friendly, e.g., Cloudflare Turnstile) on sign-up, contact, public pages.
- Admin/ops endpoints on separate path with operator auth + MFA + IP allow-list (P7).

## 7. Content safety (SAFE)

### 7.1 Requirements
| ID | Requirement | Phase |
|---|---|---|
| SAFE-001 | Acceptable Use Policy published (PUB-07) and accepted at sign-up | P1 |
| SAFE-002 | Prompt pre-check for generation purposes (image, video, audio, design, text generation in Systems) via moderation classifier(s) [VERIFY provider moderation APIs] | P3 |
| SAFE-003 | Output post-check for images/video frames (sampled), audio transcripts, and public page content | P3/P4/P6 |
| SAFE-004 | **Hard blocks (no override, ever):** sexual content involving minors; non-consensual intimate imagery; content facilitating weapons of mass harm; malware creation. Blocked items are not stored in user-visible storage; minimal evidence retained in a restricted store for legal obligations | P3 |
| SAFE-005 | Restricted categories with policy-based handling: realistic depictions of real, identifiable people (no sexual/defamatory/deceptive content; politicians/elections extra caution), graphic violence, self-harm, hate/harassment, impersonation of brands/organizations (phishing) | P3 |
| SAFE-006 | Voice cloning only with verified consent (file 08 AUD-006); consent revocation disables the voice immediately | P4 |
| SAFE-007 | AI-generated media labelled in metadata (and C2PA manifest where feasible [VERIFY]); optional visible "AI-generated" badge on exports for free plan | P3/P4 |
| SAFE-008 | Messaging anti-spam: consent enforcement, sending limits, new-workspace warm-up limits, complaint/opt-out rate monitoring, automatic suspension above thresholds | P6 |
| SAFE-009 | Public pages anti-phishing: block login forms collecting third-party credentials, brand-impersonation detection, report link on every public page | P6 |
| SAFE-010 | Reporting & review: in-app "Report" on assets/pages; operator review queue (AD-11); actions: remove, restrict, warn, suspend; appeals | P7 |
| SAFE-011 | Legal escalation procedure for illegal content (preserve evidence, report to competent authorities per applicable law **[VERIFY obligations in Pakistan and any market served]**) | P7 |
| SAFE-012 | Abuse signals feed workspace risk score (new account + high spend + blocked prompts + spam complaints) → step-up verification or limits | P7 |

### 7.2 Pipeline
```
user/agent request → policy pre-check (fast classifier + rules)
   ├─ block  → 422 UNSAFE_CONTENT (category, guidance) + safety_checks row
   ├─ review → allow generation but hold output for review (Enterprise policy) or block
   └─ allow  → provider call (providers' own safety also applies)
provider output → post-check → asset stored with safety_status
   ├─ blocked → output discarded/quarantined; user sees neutral message
   └─ passed  → visible
```
False-positive handling: users can request review (P7); repeated blocks trigger rate limits, not silent retries.

## 8. Privacy

### 8.1 Roles
- For workspace content: **the customer is the controller, VSN is the processor** (Data Processing Agreement for Team/Enterprise).
- For end-customer data in Systems: the business is controller; VSN is processor; AI/messaging providers are sub-processors.
- For account data, billing, analytics: VSN is controller.

### 8.2 Requirements
| ID | Requirement |
|---|---|
| PRIV-001 | Data inventory (what personal data, where stored, purpose, retention) maintained in `/docs/privacy/data-inventory.md` |
| PRIV-002 | Sub-processor list public (PUB-07) and updated with notice |
| PRIV-003 | Provider data policy per model in registry; workspace setting to restrict to providers that don't train on API data and/or offer zero-retention [VERIFY each provider's terms] |
| PRIV-004 | No customer content used to train shared models; any future fine-tuning only with explicit, revocable opt-in (file 01 non-goals, Native AI Level 2) |
| PRIV-005 | Data subject requests: export & deletion for users (AUTH-007); businesses can export/delete end-customer contacts and their bookings/messages (Systems) |
| PRIV-006 | Consent records for end-customer messaging (contact_consents) with source and timestamp |
| PRIV-007 | Cross-border transfer disclosure (data hosted outside Pakistan; providers in US/EU) in privacy policy |
| PRIV-008 | Minimisation: model call bodies not stored by default; logs without content; analytics without content |

### 8.3 Laws to review with counsel **[VERIFY — not legal advice]**
- Pakistan: Prevention of Electronic Crimes Act (PECA) 2016 and amendments; status of the Personal Data Protection Bill; PTA rules for SMS/telecom marketing; SBP rules on receiving foreign payments; FBR/provincial sales tax on IT services; SECP company obligations; PSEB registration for IT export benefits.
- If serving EU/UK users: GDPR/UK GDPR (DPA, SCCs, Article 27 representative if applicable). US users: state privacy laws, CAN-SPAM, TCPA for SMS.
- Platform terms: each AI provider's terms on reselling/embedding, use-case restrictions, output ownership; WhatsApp Business and Meta commerce policies; GitHub App terms; app-store rules if mobile apps (P8).
- Open-source licences: do not copy code from source-available tools with restrictive licences (e.g., n8n's Sustainable Use License); check Remotion's company licence if used for video; check model licences for open-weight models (commercial use, attribution, acceptable use).

## 9. Supply chain
- Lockfiles committed; Renovate for updates with CI gating; no install scripts from unknown packages in the platform build (pnpm `onlyBuiltDependencies` allow-list).
- Container base images pinned by digest; SBOM (Syft) and signing (cosign) in CI.
- Official packages signed by VSN; installation verifies signature and sha256.

## 10. Phase 0 legal & compliance checklist (business track)
- [ ] Company legal status confirmed `{{COMPANY_LEGAL_NAME}}`, NTN, bank account able to receive foreign payments.
- [ ] Provider accounts opened in company name; terms reviewed for embedding/resale; data policies captured in `providers.data_policy`.
- [ ] Draft Terms of Service, Privacy Policy, Acceptable Use Policy, DPA template, Sub-processor list.
- [ ] Payment provider shortlist with confirmation they support the company's country of incorporation and recurring billing (OD-03).
- [ ] SMS/WhatsApp vendor confirmation (sender ID registration, template approval process).
- [ ] Tax advice on pricing currency, sales tax on services, export of services.
- [ ] Trademark search for "VSN AI".

## 11. Incident response (P7, draft earlier)
Severity levels S1–S4; on-call rotation; runbooks for: provider outage, credential leak, cross-tenant exposure, sandbox escape suspicion, spam incident, payment webhook failure, data deletion mistake. Breach notification decision tree with legal counsel. Post-incident review within 5 working days.
