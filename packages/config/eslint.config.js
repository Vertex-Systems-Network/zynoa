// Shared flat ESLint config for every Zynoa workspace.
// Usage in a workspace eslint.config.js: `export { default } from "@zynoa/config/eslint";`
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/.next/**", "**/coverage/**", "**/storybook-static/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      // ENGINEERING-RULES §4: no `any` except at validated boundaries, with a comment.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    // Build and CLI scripts report progress on stdout.
    files: ["**/scripts/**"],
    rules: { "no-console": "off" },
  },
);
