import { defineConfig } from "eslint/config";
import globals from "globals";
import shared from "@zynoa/config/eslint";

export default defineConfig(
  shared,
  {
    ignores: ["storybook-static/**"],
  },
  {
    // Components, stories and tests run in the browser.
    files: ["src/**/*.{ts,tsx}", "test/**/*.tsx", "stories/**/*.tsx"],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // Tailwind v3 and PostCSS read CommonJS configs.
    files: ["*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
