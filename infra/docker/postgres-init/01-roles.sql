-- Runs once on first start (empty data volume). Local development only — not production SQL.
-- Platform role: used by the migration runner and operator jobs; may bypass tenant RLS (BYPASSRLS
-- is granted here so packages/db can test both roles; production grants are managed in migrations).
CREATE ROLE zynoa_platform LOGIN PASSWORD 'zynoa' BYPASSRLS;
GRANT ALL PRIVILEGES ON DATABASE zynoa TO zynoa_platform;
GRANT ALL ON SCHEMA public TO zynoa_platform;

-- pgvector for embeddings (Library/RAG, Phase 1+).
CREATE EXTENSION IF NOT EXISTS vector;
