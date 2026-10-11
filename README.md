# Zynoa

AI workspace — marketing website, web dashboard, desktop app (Tauri) and mobile app (Expo) in one pnpm + Turborepo monorepo, built by AI agents under the [ANPOS](https://github.com/Vertex-Systems-Network/ai-native-project-operating-system) AI-native development protocol.

## Start here

| You are | Read |
|---|---|
| Any AI agent | `AGENTS.md` → `.ai/manifest.json` → `PROJECT-IDEA.md` → [`docs/plan/README.md`](docs/plan/README.md) |
| A human | [`docs/plan/README.md`](docs/plan/README.md) |

- Plan: [`docs/plan/`](docs/plan/) — stack, phases, repository rules, current phase (Phase 0).
- Product specification: [`docs/spec/`](docs/spec/) (written under the working name "VSN AI").
- Design: [`docs/design/README.md`](docs/design/README.md) (Figma file AI-UI).
- ANPOS protocol overview: [`docs/anpos/ANPOS-README.md`](docs/anpos/ANPOS-README.md).

## Layout

```
apps/        site, web, desktop, mobile, api, worker, media-worker   (created in Phase 0)
packages/    tokens, ui, contracts, db, authz, model-gateway, ...
docs/        plan, spec, design, decisions, plans
infra/       docker, terraform
AGENTS.md, .ai/, config/, schemas/, scripts/, tests/   ANPOS governance
```

Every change goes through a pull request into `main`; CI must pass, a separate review agent checks it, and a human approves the merge.
