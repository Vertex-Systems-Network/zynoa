# packages/

Shared libraries. Every package extends `@zynoa/config` for TypeScript (`tsconfig/base.json` or `tsconfig/library.json`) and ESLint (`eslint.config.js` → `export { default } from "@zynoa/config/eslint";`).

| Package                                                                                                                           | State                 | Purpose                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `config/`                                                                                                                         | ✅ WU-P0-01, WU-P0-04 | Shared TSConfig + ESLint; `loadEnv` (Zod env schema, fail-fast) and `createFlags` / `isEnabled` (per-workspace feature flags, default off) |
| `tokens/`                                                                                                                         | ✅ WU-P0-00           | Design tokens for web, desktop and mobile                                                                                                  |
| `ui/`                                                                                                                             | WU-P0-10              | Shared React components                                                                                                                    |
| `db/`                                                                                                                             | WU-P0-05              | Drizzle schema, migrations, tenant repositories                                                                                            |
| `model-gateway/`                                                                                                                  | WU-P0-11              | ModelGateway interface + adapters                                                                                                          |
| `contracts/`, `authz/`, `agents/`, `sandbox/`, `integrations/`, `workflow-engine/`, `systems-runtime/`, `billing/`, `test-utils/` | Later work units      | See `docs/spec/ENGINEERING-RULES.md` §3                                                                                                    |

Only create a package when the work unit that needs it starts.
