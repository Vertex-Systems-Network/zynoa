# syntax=docker/dockerfile:1
# Build with the repo root as context:  docker build -f apps/api/Dockerfile .
FROM node:22.21.1-slim@sha256:25b3eb23a00590b7499f2a2ce939322727fcce1b15fdd69754fcd09536a3ae2c AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/config ./packages/config
COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @zynoa/api... \
 && pnpm --filter @zynoa/contracts build \
 && pnpm --filter @zynoa/api build \
 && pnpm --filter @zynoa/api --prod deploy /out

FROM node:22.21.1-slim@sha256:25b3eb23a00590b7499f2a2ce939322727fcce1b15fdd69754fcd09536a3ae2c AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
COPY --from=build /repo/apps/api/dist ./dist
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
