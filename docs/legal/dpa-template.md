# Data Processing Addendum (template) — DRAFT (not legal advice; lawyer review required)

Between the customer identified in the order form ("Controller") and {{COMPANY_LEGAL_NAME}} ("Processor"). Forms part of the Terms of Service where the customer's use involves personal data of its own customers or staff.

## 1. Subject matter and duration

Processing of Controller Personal Data to provide Zynoa, for the term of the subscription plus the deletion window in §7.

## 2. Nature and purpose

Hosting, storage, transmission to AI model providers for requested generations, workflow execution (bookings, invoicing, messaging), backup, support. Categories of data subjects and data: as determined by Controller's use (typically staff, customers, prospects; contact data, booking/invoice data, content). **No special-category data unless separately agreed.**

## 3. Instructions

Processor processes only on documented instructions (the service configuration and support requests), unless law requires otherwise — in which case Processor informs Controller unless prohibited.

## 4. Confidentiality and personnel

Personnel with access are bound by confidentiality and limited to need-to-know.

## 5. Security (Annex II summary)

Row-level-security tenant isolation; TLS in transit; encryption at rest; envelope encryption for secrets (KMS); role-based access; audit logging; sandboxed code execution; vulnerability scanning in CI. Details: security page / spec 14.

## 6. Sub-processors

Controller gives general authorization for the published Sub-processor List (docs/legal/sub-processors.md, maintained at {{APP_DOMAIN}}). Processor gives `[LAWYER: 14/30]` days' notice of additions; Controller may object on reasonable data-protection grounds, in which case the parties seek a solution or Controller may terminate the affected service pro-rata.

## 7. Deletion and return

On termination or request, Controller data is deleted from live systems within 30 days and backups within `[LAWYER: 90 days?]`, export available beforehand in machine-readable form. Statutory retention excepted.

## 8. Assistance, audits, breaches

Processor assists with data-subject requests and DPIAs at reasonable cost; notifies Controller of personal-data breaches without undue delay with known details; makes available information to demonstrate compliance, and permits audits `[LAWYER: once/year, NDA, cost allocation]`.

## 9. International transfers

Sub-processors may process outside the Controller's jurisdiction; transfers rely on the sub-processors' standard contractual commitments. `[LAWYER: SCC module selection for EEA/UK controllers; Pakistan transfer rules]`

## 10. Liability and order of precedence

Liability per the Terms of Service cap. This DPA prevails over the Terms for personal-data processing conflicts.

Signatures: Controller ______ · {{COMPANY_LEGAL_NAME}} ______
