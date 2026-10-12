import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import tokens, { cssVar } from "../dist/index.js";
import theme, { getColors } from "../dist/native.js";

const source = JSON.parse(readFileSync(new URL("../src/tokens.json", import.meta.url), "utf8")) as {
  color: Record<string, Record<string, unknown>>;
};
const css = readFileSync(new URL("../dist/tokens.css", import.meta.url), "utf8");

const semanticNames = Object.entries(source.color).flatMap(([group, items]) =>
  Object.keys(items).map((name) => ({ group, name })),
);
const camel = (s: string) => s.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

// WCAG 2.2 relative luminance / contrast ratio.
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe("@zynoa/tokens", () => {
  it("exports every semantic colour in light and dark as a hex value", () => {
    expect(semanticNames.length).toBe(43);
    for (const { group, name } of semanticNames) {
      for (const scheme of ["light", "dark"] as const) {
        const value = (tokens.color[scheme] as Record<string, Record<string, string>>)[
          camel(group)
        ]?.[camel(name)];
        expect(value, `${scheme} ${group}/${name}`).toMatch(/^#[0-9A-F]{6}$/i);
      }
    }
  });

  it("writes a CSS custom property for every semantic colour, light and dark", () => {
    for (const { group, name } of semanticNames) {
      const decl = `--zy-color-${group}-${name}:`;
      expect(css.split(decl).length - 1, decl).toBeGreaterThanOrEqual(3); // :root, [data-theme=dark], prefers-color-scheme
    }
    expect(cssVar("text", "primary")).toBe("var(--zy-color-text-primary)");
  });

  it("keeps the React Native theme in step with the web tokens", () => {
    const light = getColors("light");
    const dark = getColors("dark");
    expect(Object.keys(light)).toHaveLength(semanticNames.length);
    expect(light.textPrimary).toBe(tokens.color.light.text.primary);
    expect(dark.textPrimary).toBe(tokens.color.dark.text.primary);
    expect(getColors(null)).toBe(theme.light);
    expect(theme.typography.bodyDefault.fontFamily).toBe("Inter_400Regular");
    expect(theme.typography.displayXl.fontFamily).toBe("PlusJakartaSans_800ExtraBold");
  });

  // Regression guard for the Figma accessibility audit (HO-10): 23 failing pairs were fixed.
  describe.each(["light", "dark"] as const)("WCAG 2.2 AA contrast — %s", (scheme) => {
    const c = tokens.color[scheme];
    const backgrounds = { surface: c.bg.surface, canvas: c.bg.canvas };

    it.each([
      ["text/primary", c.text.primary],
      ["text/secondary", c.text.secondary],
      ["text/muted", c.text.muted],
      ["text/link", c.text.link],
      ["status/success-text", c.status.successText],
      ["status/warning-text", c.status.warningText],
      ["status/danger-text", c.status.dangerText],
      ["ai/agent-text", c.ai.agentText],
    ])("%s is >= 4.5:1 on surface and canvas", (_label, fg) => {
      for (const bg of Object.values(backgrounds))
        expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });

    it("text/on-brand is >= 4.5:1 on brand/primary", () => {
      expect(contrast(c.text.onBrand, c.brand.primary)).toBeGreaterThanOrEqual(4.5);
    });

    it("border/control and border/focus are >= 3:1 on surface (non-text contrast)", () => {
      expect(contrast(c.border.control, c.bg.surface)).toBeGreaterThanOrEqual(3);
      expect(contrast(c.border.focus, c.bg.surface)).toBeGreaterThanOrEqual(3);
    });
  });
});
