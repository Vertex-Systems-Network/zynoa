-- Tenant isolation plumbing (ADR-005, spec 05 §6).
--
-- enable_tenant_rls(tbl): switches a tenant table (one with a workspace_id uuid column)
-- to forced row-level security with one policy: a session sees exactly the rows of the
-- workspace in the app.workspace_id setting (set per transaction by TenantRepository).
-- NULLIF(current_setting(..., true), '') yields NULL both on a pristine session and on a
-- pooled connection where a previous transaction's set_config left the empty string behind,
-- so a session without a workspace sees nothing instead of erroring on ''::uuid. The
-- platform role (BYPASSRLS) is unaffected; FORCE covers owners without BYPASSRLS.
CREATE FUNCTION enable_tenant_rls(tbl regclass) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %s AS PERMISSIVE FOR ALL '
    || 'USING (workspace_id = NULLIF(current_setting(''app.workspace_id'', true), '''')::uuid) '
    || 'WITH CHECK (workspace_id = NULLIF(current_setting(''app.workspace_id'', true), '''')::uuid)',
    tbl
  );
END;
$$;
--> statement-breakpoint
-- feature_flags is not a plain tenant table: global rows (workspace_id IS NULL) are
-- readable by every workspace, so it gets its own read policy instead of the helper.
-- Writes come only from the platform role (no write policy for the app role).
ALTER TABLE "feature_flags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "feature_flags" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY feature_flags_read ON "feature_flags" AS PERMISSIVE FOR SELECT
  USING (
    workspace_id IS NULL
    OR workspace_id = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  );
--> statement-breakpoint
-- Least privilege: flags are written only by the platform role (local compose default
-- privileges otherwise grant the app role full DML on platform-created tables).
REVOKE INSERT, UPDATE, DELETE ON "feature_flags" FROM zynoa;
