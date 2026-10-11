# Design — Figma references

Figma is the source of truth for anything visual. Where `docs/spec/13_UI_UX_SPEC.md` differs, build what Figma shows and update the spec in the same PR.

**File:** AI-UI · file key `rTRJFBfNUHHCCzkcReZuJH` · https://www.figma.com/design/rTRJFBfNUHHCCzkcReZuJH

ANPOS design intake: provided, **not yet version-locked or approved** (`config/design/design-intake.json`). Capture a Figma version before approval; never mix revisions.

## Pages

| Page | Node | Contents |
|---|---|---|
| Website — Marketing & Auth | `33:5523` | Marketing pages at 1920/1440/1024/768/560/480/360/320, auth, 2FA |
| Dashboard — App screens (light) | `2:4` | Sections 1–15 below |
| Dashboard — App screens (Dark) | `151:23115` | Dark twins of every section |
| Dashboard Toolkit | `146:10` | Components, interactive playground (light `249:1347`, dark `249:1742`) |
| Handoff — Developer specs | `237:10` | HO-00…HO-10 — read these before building UI |
| Launch assets | (page "Launch assets") | OG, social, Product Hunt, banners, email header, press kit |

## Dashboard sections (light page `2:4`; full list with routes on HO-09)

| # | Section | Screens |
|---|---|---|
| 1 | Workspace & global | GL-01…GL-07 (GL-01c sidebar collapsed demo `257:162971`) |
| 2 | Account, onboarding & new project | ON-03…ON-09 |
| 3 | Project workspace | PR-01…PR-15 (PR-14 split into settings screens) |
| 4 | Studios | ST-01…ST-12 |
| 5 | Ecosystem — Marketplace, Library, Plugins & Systems | EC-01…EC-12 |
| 6 | Admin, billing & VSN Ops | AD-01…AD-13 |
| 7 | Shared & end-customer pages | SH-01, CX-01…CX-05 |
| 8 | States | STATE-01…16 (empty, error, 404, 500, maintenance, session) |
| 9 | Overlays | OV-01…OV-13 |
| 12 | Developer settings | DV-01…DV-08 (section `220:37201`) |
| 13 | Agent memory & project knowledge | MK-01…MK-11 (section `226:38857`) |
| 14 | Help, What's new, feedback | HP-01…HP-13 (section `233:42053`) |
| 15 | Prototype overlays | OL-01…OL-27 |

## Handoff pages (`237:10`)

| Frame | Node | Topic |
|---|---|---|
| HO-00 | `237:11` | Index |
| HO-01 | `237:150` | Colours |
| HO-02 | `237:745` | Foundations (type, spacing, radius, elevation) |
| HO-03 | `240:16` | Components (one per Figma component set) |
| HO-04 | `240:785` | App shell + marketing breakpoints |
| HO-05 | `240:1452` | Screen spec example (PR-05 Kanban board) |
| HO-06 | `241:1399` | Interactions |
| HO-07 | `241:1579` | Content & formatting |
| HO-08 | `241:1736` | Accessibility |
| HO-09 | `241:1846` | Screen inventory (routes, phases, light/dark frame IDs) |
| HO-10 | `260:1302` | Accessibility audit results + AI gradient options |

## Components worth knowing

- `App/Sidebar` variant set `257:505` (Expanded / Collapsed) — collapse toggle, smart-animate 250 ms.
- `Card/Task` `248:158773` and `Card/Project` `248:158799` — Default + Hover variants.

## Tokens

Exported to `packages/tokens` (PR #1). Accessibility changes already applied there: `text/muted` → stone/550 `#6F6862`; status `*-text` tokens → 700 shades; `ai/agent(-text)` → violet/600 `#7C3AED`; `brand/accent` + `border/focus` → indigo/600 `#4F46E5`; new `border/control` (light `#8F8882`, dark stone/500). Targets: checkbox/radio/toggle 24 px, close buttons 28 px.

## Open design items

- AI gradient end stop (`#F472B6`, 2.65:1) — option A recommended on HO-10.
- Desktop frames (before Phase 3), mobile frames (before Phase 5).
- Urdu RTL scope (Phase 8).
- Pricing mismatch between website pricing page and spec; tax 16% and bank placeholders; footer company name; PUB-04 ID clash.
