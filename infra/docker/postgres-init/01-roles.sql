-- Runs once on first start (empty data volume). Local development only — not production SQL.
-- The bootstrap superuser is `postgres`; the application role must NOT be a superuser,
-- otherwise RLS is silently bypassed and the tenant-isolation tests prove nothing.

-- Application role (DATABASE_URL): subject to RLS.
CREATE ROLE zynoa LOGIN PASSWORD 'zynoa' NOSUPERUSER;

-- Platform role (DATABASE_PLATFORM_URL): migrations and operator jobs; may bypass tenant RLS.
CREATE ROLE zynoa_platform LOGIN PASSWORD 'zynoa' NOSUPERUSER BYPASSRLS;

GRANT ALL PRIVILEGES ON DATABASE zynoa TO zynoa, zynoa_platform;
GRANT ALL ON SCHEMA public TO zynoa, zynoa_platform;

-- Tables are created by migrations running as zynoa_platform; the app role gets DML on them.
ALTER DEFAULT PRIVILEGES FOR ROLE zynoa_platform IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO zynoa;
ALTER DEFAULT PRIVILEGES FOR ROLE zynoa_platform IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO zynoa;

-- pgvector for embeddings (Library/RAG, Phase 1+).
CREATE EXTENSION IF NOT EXISTS vector;
