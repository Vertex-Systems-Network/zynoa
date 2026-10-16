# Privacy Policy — DRAFT (not legal advice; lawyer review required)

Last updated: {{DATE}} · {{COMPANY_LEGAL_NAME}} ("we") operates Zynoa at {{APP_DOMAIN}}. This policy explains what personal data we process, why, and your choices. `[LAWYER: align with Pakistan PDPB status, GDPR for EEA/UK users, and export-market rules]`

## 1. What we collect

- **Account data**: name, email, password hash, workspace membership, roles.
- **Content**: what you and your workspace members put into projects — prompts, files, generated outputs, comments, approvals.
- **Usage and device data**: logs, feature usage, approximate location from IP, cookies per the consent banner.
- **Billing data**: plan, invoices, and payment status. Card details go directly to the payment provider; we never store card numbers.
- **End-customer data** (when you install business systems such as bookings/invoicing): data about _your_ customers that you choose to process. For that data you are the controller and we are your processor under the DPA.

## 2. Why we process it (legal bases)

To provide the service (contract); to secure it, prevent abuse and account for AI usage (legitimate interests); to send service messages (contract) and marketing only with consent; to comply with law. AI features send relevant content to the model providers listed in the Sub-processor List solely to generate your requested output.

## 3. AI processing — the part most policies hide

- Your prompts and files are sent to third-party AI providers **only to produce the output you requested**.
- We choose providers whose API terms **do not train on customer content by default**; where a provider trains unless configured otherwise, we use the non-training configuration, do not use it for customer content, or offer it only behind an explicit per-workspace opt-in (off by default).
- Provider-side retention is typically up to 30 days for abuse monitoring (see Sub-processor List per provider).
- Generated outputs may be reviewed by our staff only for abuse investigation or with your support request.

## 4. Retention

Account data: life of the account + `[LAWYER: 90 days?]`. Content: until you delete it or your workspace is deleted, then removed from live systems within 30 days and from backups within `[LAWYER: 90 days?]`. Logs: 12 months. Billing records: as tax law requires. Deletion requests: {{SUPPORT_EMAIL}}.

## 5. Where data lives

Primary hosting: {{HOSTING_REGION}} (AWS; see ADR-020 — region disclosed here per OD-12). Object storage/CDN: Cloudflare. Some sub-processors operate globally; transfers are covered by their standard contractual terms. `[LAWYER: transfer mechanism wording]`

## 6. Sharing

Only with the Sub-processor List vendors (to run the service), payment providers (to bill), and authorities when legally required. We do not sell personal data.

## 7. Your rights

Access, correction, export, deletion, and objection/withdrawal of consent, via workspace settings or {{SUPPORT_EMAIL}}. If you are an end-customer of one of our customers (e.g., you booked an appointment with a business that uses Zynoa), contact that business first — we act on their instructions. `[LAWYER: EEA/UK rights wording + supervisory authority]`

## 8. Security

Tenant isolation enforced in the database (row-level security), encryption in transit and at rest, envelope encryption for secrets, least-privilege access, audit logging. No method is perfect; we notify affected customers of breaches as law requires.

## 9. Cookies

Essential cookies always; analytics/marketing cookies only after consent (see consent-language.md). We honor withdrawal at any time.

## 10. Children

The service is not for anyone under 18 (AI-provider terms also require this).

## 11. Changes and contact

Material changes notified 14 days ahead. Contact: {{SUPPORT_EMAIL}}, {{COMPANY_LEGAL_NAME}}, `[address]`, Pakistan.
