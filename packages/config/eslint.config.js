// Shared flat ESLint config for every Zynoa workspace.
// Usage in a workspace eslint.config.js: `export { default } from "@zynoa/config/eslint";`
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["**/dist/**", "**/.next/**", "**/coverage/**", "**/storybook-static/**"],
  },
  js.configs.recommended,
  tseslint.configs.strict,
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
      // ENGINEERING-RULES rule 3: tenant tables are reached only through the repository
      // layer in @zynoa/db. The db package itself switches this rule off locally.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@zynoa/db/schema", "@zynoa/db/schema/*"],
              message:
                "Import repositories from @zynoa/db instead; raw tenant tables bypass TenantRepository and RLS scoping (ENGINEERING-RULES §1 rule 3).",
            },
          ],
        },
      ],
    },
  },
  {
    // Build and CLI scripts report progress on stdout.
    files: ["**/scripts/**"],
    rules: { "no-console": "off" },
  },
);
