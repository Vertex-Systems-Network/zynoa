import { defineConfig } from "eslint/config";
import globals from "globals";
import shared from "@zynoa/config/eslint";

export default defineConfig(
  shared,
  {
    // Client components and tests run in the browser.
    files: ["src/**/*.tsx", "src/**/*.ts", "test/**/*.tsx"],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // Tailwind v3 and PostCSS read CommonJS configs.
    files: ["*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
