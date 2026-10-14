CREATE TABLE "feature_flags" (
	"key" text NOT NULL,
	"workspace_id" uuid,
	"enabled" boolean NOT NULL,
	"rollout_pct" integer,
	CONSTRAINT "feature_flags_key_workspace" UNIQUE NULLS NOT DISTINCT("key","workspace_id")
);
