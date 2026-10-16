# ADR-023: Domains are admin-configurable; five-domain structure is the default

- Status: accepted (owner, 2026-10-16)
- Decides: OD-02
- Evidence: docs/plans/decision-briefs.md

## Decision

The owner requires that the **product name and all domains stay changeable by an admin** — nothing hardcodes "Zynoa" or any domain. Concretely: every app reads `APP_URL`/`PREVIEW_DOMAIN`/`RENDER_DOMAIN`/`ASSET_DOMAIN` (+ a systems domain) from `@zynoa/config` env, and the product display name becomes a platform setting (env default, later editable in the admin panel, WU-P1+). The five-domain structure from docs/plans/decision-briefs.md (separate registrable domains for render/user content — cookie/XSS isolation) is the default recommendation; actual purchase waits until the owner checks availability and settles the final name.

## Consequences

UI metadata, emails and public pages must consume the configurable name/domains, never literals (lint/review point); the Public-Suffix-List submission happens for whichever render/usercontent domains are finally bought.
