/**
 * Long-running Temporal worker against the compose dev server:
 *   pnpm --filter @zynoa/worker dev   (TEMPORAL_ADDRESS from .env, default localhost:7233)
 */
import { loadEnv } from "@zynoa/config/env";
import { NativeConnection, Worker } from "@temporalio/worker";
import { fileURLToPath } from "node:url";
import { activities } from "./activities.js";

export const TASK_QUEUE = "zynoa-main";

export async function run(): Promise<void> {
  const env = loadEnv(["temporal"]);
  const connection = await NativeConnection.connect({ address: env.TEMPORAL_ADDRESS });
  try {
    const worker = await Worker.create({
      connection,
      namespace: env.TEMPORAL_NAMESPACE,
      taskQueue: TASK_QUEUE,
      workflowsPath: fileURLToPath(new URL("./workflows.js", import.meta.url)),
      activities,
    });
    console.warn(`worker: polling task queue "${TASK_QUEUE}" on ${env.TEMPORAL_ADDRESS}`);
    await worker.run();
  } finally {
    await connection.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
