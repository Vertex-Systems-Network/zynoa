/** Migration runner: `pnpm --filter @zynoa/db migrate`. Runs as the platform role. */
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { loadEnv } from "@zynoa/config/env";
import { createDb } from "./client.js";

export async function runMigrations(connectionString: string): Promise<void> {
  const { db, close } = createDb(connectionString, { max: 1 });
  try {
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)),
    });
  } finally {
    await close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const env = loadEnv(["databasePlatform"]);
  await runMigrations(env.DATABASE_PLATFORM_URL);
  process.stdout.write("migrations applied\n");
}
