-- Hand-written companion to 0002 (same pattern as 0001): updated_at triggers,
-- tenant RLS for the new 🔒 tables, and the audit_events policies.

-- updated_at is trigger-maintained (spec 04 §0).
CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER auth_accounts_updated_at BEFORE UPDATE ON "auth_accounts" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON "sessions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER verifications_updated_at BEFORE UPDATE ON "verifications" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON "workspaces" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER memberships_updated_at BEFORE UPDATE ON "memberships" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER roles_updated_at BEFORE UPDATE ON "roles" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER credit_accounts_updated_at BEFORE UPDATE ON "credit_accounts" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER audit_events_updated_at BEFORE UPDATE ON "audit_events" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
-- Tenant isolation (0001's enable_tenant_rls) for the new 🔒 tables.
SELECT enable_tenant_rls('memberships');
--> statement-breakpoint
SELECT enable_tenant_rls('roles');
--> statement-breakpoint
SELECT enable_tenant_rls('credit_accounts');
--> statement-breakpoint
-- Indexes leading with workspace_id (spec 04 §0) — the unique constraints on
-- memberships/roles/credit_accounts already provide them; audit needs its own.
CREATE INDEX audit_events_workspace_idx ON "audit_events" ("workspace_id", "created_at");
--> statement-breakpoint
-- audit_events: append-only hash chain; workspace rows tenant-scoped, user-level
-- rows (workspace_id NULL) writable during auth flows but readable only by the
-- platform role until the user-audit API lands (05 §9).
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY audit_events_read ON "audit_events" AS PERMISSIVE FOR SELECT
  USING (workspace_id = NULLIF(current_setting('app.workspace_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY audit_events_insert ON "audit_events" AS PERMISSIVE FOR INSERT
  WITH CHECK (
    workspace_id IS NULL
    OR workspace_id = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  );
--> statement-breakpoint
-- Append-only: nobody updates or deletes audit rows through the app role.
REVOKE UPDATE, DELETE ON "audit_events" FROM zynoa;
--> statement-breakpoint
-- Auth flows run before any workspace context exists: the identity tables are
-- global (no RLS), which matches spec 04 §1; access control there is the API's.
