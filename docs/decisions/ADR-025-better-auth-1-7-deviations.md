# ADR-025: Spec deviations forced by Better Auth 1.7 (cookie name, account columns)

- Status: accepted (2026-10-16)
- Amends: docs/spec/05_AUTH_TENANCY_RBAC.md §2 (session cookie); docs/spec/04_DATA_MODEL.md §1 (`auth_accounts`)
- Related: ADR-004 (Better Auth)

## Context

Implementing US-101 against the pinned Better Auth 1.7.10 surfaced two places
where the spec (written earlier against the 1.x docs) cannot be satisfied
literally:

1. **Session cookie `__Host-vsn_session`.** Better Auth's cookie getter
   unconditionally prepends `__Secure-` to the configured cookie name whenever
   `useSecureCookies` is on, so the emitted name would be
   `__Secure-__Host-vsn_session` — and a name that does not *start with*
   `__Host-` gets none of the prefix's protections. Turning `useSecureCookies`
   off to avoid the prefix also forces `Secure` off at the attribute level,
   which browsers then reject for a `__Host-` name.
2. **`auth_accounts` columns.** The 1.7 base account model requires
   `refresh_token_expires_at`; the drizzle adapter refuses to initialize
   without it. Spec 04 §1 listed only `access_token_expires_at`.

## Decision

- The session cookie is **`__Secure-vsn_session`** on HTTPS environments
  (HttpOnly, Secure, SameSite=Lax, Path=/, no Domain) and `vsn_session` on
  plain-http local/CI. `__Secure-` keeps the only guarantee `__Host-` would
  have added that matters to us (cannot be set over plain HTTP); host-locking
  via no-Domain is preserved by never setting a Domain attribute.
- `auth_accounts` carries **both** `access_token_expires_at` and
  `refresh_token_expires_at`.

Both spec files are amended in the same PR (ENGINEERING-RULES rule 10).

## Consequences

- Tests assert the cookie Better Auth actually emits (`createCookieGetter`),
  not the configured option, so a future Better Auth upgrade that changes
  prefix behavior fails loudly. If a later version allows true `__Host-`
  names, revisit (reversibility: high — one config value + spec line).
