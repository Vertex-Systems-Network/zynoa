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
COPY packages/db ./packages/db
COPY packages/auth ./packages/auth
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @zynoa/api... \
 && pnpm --filter @zynoa/config build \
 && pnpm --filter @zynoa/contracts build \
 && pnpm --filter @zynoa/db build \
 && pnpm --filter @zynoa/auth build \
 && pnpm --filter @zynoa/api build \
 && pnpm --filter @zynoa/api --prod deploy /out \
 # pnpm 9's legacy deploy copies a few ORPHANED dev-tool store entries that no
 # package links (vite/vitest/esbuild — peer-resolution noise). Nothing imports
 # them at runtime; esbuild's Go binary alone trips the image vulnerability scan.
 && rm -rf /out/node_modules/.pnpm/vite@* /out/node_modules/.pnpm/@vitest+* \
           /out/node_modules/.pnpm/esbuild@* /out/node_modules/.pnpm/@esbuild+*

FROM node:22.21.1-slim@sha256:25b3eb23a00590b7499f2a2ce939322727fcce1b15fdd69754fcd09536a3ae2c AS runtime
ENV NODE_ENV=production
# Patch OS packages newer than the pinned base, and drop npm/corepack — the runtime
# needs only the node binary, and their bundled deps carry scanner findings.
RUN apt-get update \
 && apt-get upgrade -y \
 && rm -rf /var/lib/apt/lists/* \
 && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
WORKDIR /app
COPY --from=build /out .
COPY --from=build /repo/apps/api/dist ./dist
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
