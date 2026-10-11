# @zynoa/tokens

Zynoa's design tokens, exported from the Figma file **AI-UI** (variables collection `Color` with Light/Dark modes, primitives, spacing, radius, text styles, effect styles and breakpoints). One source, every platform:

| Platform | Import |
|---|---|
| Website + dashboard (Next.js, Tailwind v4) | `tokens.css` + `tailwind.css` (+ `shadcn.css`, `typography.css`) |
| Tailwind v3 projects | `tailwind.preset` |
| Desktop (Tauri) | Same as dashboard — the shell loads the hosted app |
| Mobile (Expo / React Native) | `@zynoa/tokens/native` |
| Scripts, charts, emails | `@zynoa/tokens` (typed JS object) or `tokens.json` |

## Edit → build

1. Change `src/tokens.json` (W3C Design Tokens format; dark values live in `$extensions["com.zynoa.modes"].dark`; semantic colours alias primitives like `{primitive.stone.900}`).
2. Run `pnpm --filter @zynoa/tokens build`.
3. Commit `src/` **and** `dist/`. CI runs `pnpm --filter @zynoa/tokens check`, which fails if `dist/` is stale.

Never edit `dist/` by hand. When a token changes in Figma, change it here in the same PR and note the Figma variable name.

## Web (Next.js + Tailwind v4)

```css
/* apps/web/app/globals.css */
@import "tailwindcss";
@import "@zynoa/tokens/tokens.css";
@import "@zynoa/tokens/tailwind.css";
@import "@zynoa/tokens/shadcn.css";     /* shadcn/ui components pick up Zynoa colours */
@import "@zynoa/tokens/typography.css"; /* .type-display-xl … .type-code-default */
```

Utilities follow the token path `group-name`:

```html
<div class="bg-bg-surface text-text-primary border border-border-default rounded-lg shadow-md">
  <p class="type-body-default text-text-muted">Updated 2 min ago</p>
  <span class="text-status-success-text bg-status-success-subtle">Done</span>
  <button class="bg-brand-primary text-text-on-brand focus-visible:outline-border-focus">Run</button>
</div>
```

Spacing uses Tailwind's 4px scale (`p-4` = 16px = `space/4`), so Figma `space/N` = Tailwind `N`.

### Dark mode

- Default: follows the OS (`prefers-color-scheme`).
- Force a theme: `<html data-theme="dark">` or `<html data-theme="light">` (a `.dark` / `.light` class also works, for next-themes with `attribute="class"`).
- Tailwind's `dark:` variant is wired to `data-theme="dark"` / `.dark`.

### Responsive sizes

`tokens.css` sets the layout grid (`--zy-grid-*`, `--zy-layout-*`) and the display/heading sizes per breakpoint, desktop-first: 1440 is the default, then 1920 (min-width), 1024, 768, 560, 480, 360 and 320 (max-width). The `.type-display-*` and `.type-heading-h1…h3` classes scale automatically.

## Mobile (Expo)

```tsx
import { useColorScheme, Text, View } from "react-native";
import { theme, getColors } from "@zynoa/tokens/native";

const c = getColors(useColorScheme());
<View style={{ backgroundColor: c.bgSurface, padding: theme.space["4"], borderRadius: theme.radius.lg, ...theme.shadow.md }}>
  <Text style={[theme.typography.headingH3, { color: c.textPrimary }]}>Approvals</Text>
</View>;
```

Load the fonts with `@expo-google-fonts/plus-jakarta-sans`, `@expo-google-fonts/inter` and `@expo-google-fonts/jetbrains-mono`; the `fontFamily` names (e.g. `Inter_500Medium`) match those packages.

## What's inside

| Group | Count | Notes |
|---|---|---|
| Primitives | 45 | stone, indigo, ai-violet, ai-pink, green2, amber2, red2 |
| Semantic colours | 43 | bg, text, border, brand, ai, status — light + dark |
| Space | 11 | 0–64px on a 4px grid |
| Radius | 5 | sm 6 · md 8 · lg 12 · xl 16 · full |
| Typography | 15 | Plus Jakarta Sans (display/headings), Inter (body/labels), JetBrains Mono (code) |
| Shadows | 3 | Elevation sm / md / lg |
| Responsive | 16 values × 8 breakpoints | grid, layout, display/heading sizes |

Contrast: every text/background pair used in the product passes WCAG 2.2 AA after the accessibility audit (Figma Handoff page, HO-10).

## Open item

`ai/gradient-end` is still `#F472B6`, which is 2.65:1 on white. That is fine for decoration but not for text. Recommended change (option A on HO-10): `#4F46E5 → #7C3AED → #DB2777`. When it is approved, update the three `ai/gradient-*` tokens here and in Figma.
