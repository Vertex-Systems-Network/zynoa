-- Tenant isolation plumbing (ADR-005, spec 05 §6).
--
-- enable_tenant_rls(tbl): switches a tenant table (one with a workspace_id uuid column)
-- to forced row-level security with one policy: a session sees exactly the rows of the
-- workspace in the app.workspace_id setting (set per transaction by TenantRepository).
-- current_setting(..., true) yields NULL when unset, so a session without a workspace
-- sees nothing. The platform role (BYPASSRLS) is unaffected; FORCE covers table owners.
CREATE FUNCTION enable_tenant_rls(tbl regclass) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %s AS PERMISSIVE FOR ALL '
    || 'USING (workspace_id = current_setting(''app.workspace_id'', true)::uuid) '
    || 'WITH CHECK (workspace_id = current_setting(''app.workspace_id'', true)::uuid)',
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
    OR workspace_id = current_setting('app.workspace_id', true)::uuid
  );
