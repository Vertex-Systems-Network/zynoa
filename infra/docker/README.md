# Local development infrastructure

Everything the Zynoa apps need locally, in one `docker compose` project (spec US-002).

## First run

1. Install Docker Desktop (or Docker Engine ≥ 24 with the compose plugin) and Node 22 + pnpm 9 (`corepack enable`).
2. From the repo root:

   ```bash
   cp .env.example .env            # then fill LOCAL_MASTER_KEY and BETTER_AUTH_SECRET:
   #   LOCAL_MASTER_KEY:   openssl rand -hex 32
   #   BETTER_AUTH_SECRET: openssl rand -base64 48
   docker compose up -d --wait     # starts everything below; --wait blocks until healthy
   pnpm install
   pnpm dev                        # starts the apps as they land (web :3000, api :4000, worker)
   ```

3. Stop with `docker compose down` (add `-v` to wipe data).

## Services and ports

| Service | Image | Port(s) | Notes |
|---|---|---|---|
| Postgres 16 + pgvector | `pgvector/pgvector:0.8.7-pg16-trixie` | 5432 | DB `zynoa`; roles `zynoa` (app) and `zynoa_platform` (migrations, BYPASSRLS) — password `zynoa` locally |
| Valkey (Redis-compatible) | `valkey/valkey:9.0.6-alpine` | 6379 | Cache, pub/sub, rate limits |
| Temporal dev server + UI | `temporalio/temporal:1.9.1` | 7233 gRPC · **8233 Web UI** | Namespace `default`; state persisted to a volume |
| SeaweedFS (S3) | `chrislusf/seaweedfs:4.12` | 9000 | Buckets `zynoa-private`, `zynoa-public` auto-created; credentials `zynoa` / `zynoa-local-only` (see ADR-015 — replaces MinIO) |
| Mailpit (email capture) | `axllent/mailpit:v1.31.5` | **8025 Web UI** · 1025 SMTP | Every local email lands here, nothing leaves the machine |

All values match `.env.example`; the apps read them through `@zynoa/config/env`.

## Troubleshooting

- `docker compose ps` shows health; a service stuck in `starting` → `docker compose logs <service>`.
- Port already in use → stop the clashing local service or edit the left-hand port in `infra/docker/docker-compose.yml`.
- Reset one service's data: `docker compose down && docker volume rm zynoa_<name>-data`.
- S3 smoke test: `aws --endpoint-url http://localhost:9000 s3 ls` with the credentials above.
