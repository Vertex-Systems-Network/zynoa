# Zynoa

AI workspace — website, dashboard, desktop (Tauri) and mobile (Expo) in one pnpm + Turborepo monorepo.

```
apps/        site, web, desktop, mobile, api, worker, media-worker
packages/    tokens, ui, contracts, db, authz, model-gateway, ...
docs/        spec, decisions (ADRs), runbooks
infra/       docker, terraform
```

Rules for humans and AI agents: every change goes through a pull request into `main`; CI must pass and a human approves the merge.
