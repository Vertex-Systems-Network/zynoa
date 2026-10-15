/**
 * Long-running Temporal worker: `pnpm --filter @zynoa/worker start` (built) or
 * `pnpm --filter @zynoa/worker dev`. Connects to TEMPORAL_ADDRESS (local
 * compose stack by default) and serves the zynoa-main task queue.
 */
import { NativeConnection, Worker } from "@temporalio/worker";
import { fileURLToPath } from "node:url";
import { loadEnv } from "@zynoa/config/env";
import * as activities from "./activities.js";
import { TASK_QUEUE, workflowsEntry } from "./queues.js";

export async function run(): Promise<void> {
  const env = loadEnv(["temporal"]);
  const connection = await NativeConnection.connect({
    address: env.TEMPORAL_ADDRESS,
    ...(env.TEMPORAL_TLS_CERT && env.TEMPORAL_TLS_KEY
      ? {
          tls: {
            clientCertPair: {
              crt: Buffer.from(env.TEMPORAL_TLS_CERT),
              key: Buffer.from(env.TEMPORAL_TLS_KEY),
            },
          },
        }
      : {}),
  });
  try {
    const worker = await Worker.create({
      connection,
      namespace: env.TEMPORAL_NAMESPACE,
      taskQueue: TASK_QUEUE,
      workflowsPath: fileURLToPath(workflowsEntry()),
      activities,
    });
    console.warn(`worker: serving task queue "${TASK_QUEUE}" at ${env.TEMPORAL_ADDRESS}`);
    await worker.run();
  } finally {
    await connection.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
