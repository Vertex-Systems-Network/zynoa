/** Idempotent local seed: `pnpm --filter @zynoa/db seed`. Runs as the platform role. */
import { fileURLToPath } from "node:url";
import { loadEnv } from "@zynoa/config/env";
import { createDb } from "./client.js";
import { featureFlags } from "./schema/index.js";

export async function seed(connectionString: string): Promise<void> {
  const { db, close } = createDb(connectionString, { max: 1 });
  try {
    // Marker row proving seed + flag plumbing end to end; harmless if it stays.
    await db
      .insert(featureFlags)
      .values({ key: "phase0.seeded", workspaceId: null, enabled: true, rolloutPct: null })
      .onConflictDoNothing();
  } finally {
    await close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const env = loadEnv(["databasePlatform"]);
  await seed(env.DATABASE_PLATFORM_URL);
  process.stdout.write("seed applied\n");
}
