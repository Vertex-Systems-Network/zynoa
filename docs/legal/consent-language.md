# Consent & disclosure language — DRAFT in-product strings (lawyer review required)

String keys for `apps/web`/`apps/site`; English first, Urdu translations at implementation. Sources of obligation: provider terms (AI disclosure, 18+), privacy policy (cookies, marketing), spec 14.

## AI disclosure (required by model-provider terms)

- `ai.disclosure.chat` — "You're chatting with AI. Review important results before relying on them."
- `ai.disclosure.output_badge` — "AI-generated"
- `ai.disclosure.enduser` — shown in customer-facing systems (bookings etc.): "This assistant is powered by AI on behalf of {{BUSINESS_NAME}}."
- `ai.disclosure.accuracy` — "AI can make mistakes. Verify facts, figures and code before use."

## Sign-up

- `signup.age` — checkbox, blocking: "I am 18 or older." (provider terms require 18+)
- `signup.terms` — checkbox, blocking: "I agree to the Terms of Service and Privacy Policy." (links)
- `signup.marketing` — checkbox, **unchecked by default**, optional: "Send me product updates. Unsubscribe anytime."

## Cookies (site + app)

- `cookies.banner` — "We use essential cookies to run Zynoa. With your OK, we also use analytics cookies to improve it." Buttons: `cookies.accept_all` "Accept all" · `cookies.essential_only` "Essential only" · `cookies.settings` "Settings". No analytics before consent; equal-prominence buttons `[LAWYER: EEA standard]`.

## Data-to-AI consent (workspace setting)

- `aiproviders.notice` — "To generate content, Zynoa sends the relevant parts of your project to the AI providers listed in our Sub-processor List. They don't train on your content — except any opt-in provider you separately enable below." Workspace toggle per optional provider where a provider's terms are weaker (e.g. image provider that may train): `aiproviders.optin.training_provider` — "Allow {{PROVIDER}} (may use inputs/outputs to improve its models)" — **off by default**.

## Messaging end-customers (systems: bookings/invoices)

- `messaging.consent_hint` — shown to the business user: "Only message customers who agreed to receive messages from you. You are responsible for consent." (carrier/Meta rules)
- `messaging.optout_footer` — appended to SMS/WhatsApp templates where channel rules require: "Reply STOP to opt out."

## Deletion

- `account.delete.confirm` — "This deletes your workspace, projects and files for all members within 30 days (backups within {{BACKUP_WINDOW}} days). This cannot be undone."
