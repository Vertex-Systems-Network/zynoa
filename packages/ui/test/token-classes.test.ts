/**
 * Guard (PR #50 review): the tokens Tailwind preset emits colors as raw CSS
 * variables without <alpha-value>, so an opacity modifier on a token color
 * (e.g. `bg-bg-inverse/50`) generates NO utility at all — the class silently
 * does nothing. Forbid that pattern in component sources.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENTS_DIR = join(import.meta.dirname, "../src/components");
const TOKEN_ALPHA = /\b[\w-]*(?:bg|text|border|brand|ai|status)-[\w-]+\/\d+/g;

describe("token class usage", () => {
  it("never uses Tailwind alpha modifiers on token colors", () => {
    const offenders: string[] = [];
    for (const file of readdirSync(COMPONENTS_DIR)) {
      const source = readFileSync(join(COMPONENTS_DIR, file), "utf8");
      for (const match of source.match(TOKEN_ALPHA) ?? []) {
        offenders.push(`${file}: ${match}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
