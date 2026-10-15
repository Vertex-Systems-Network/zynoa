/**
 * WU-P0-09 acceptance: HelloWorkflow runs end to end — a real Temporal dev
 * server (downloaded by @temporalio/testing on first run), a real worker, a
 * real client — locally and in CI.
 */
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as activities from "../src/activities.js";
import { TASK_QUEUE, workflowsEntry } from "../src/queues.js";

let env: TestWorkflowEnvironment;

beforeAll(async () => {
  env = await TestWorkflowEnvironment.createLocal();
}, 180_000);

afterAll(async () => {
  await env?.teardown();
});

describe("HelloWorkflow", () => {
  it("runs end to end through a real worker", async () => {
    const worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: TASK_QUEUE,
      // workflowsEntry resolves to src/workflows.ts here (vitest runs TS), so the
      // test never depends on a possibly-stale dist build.
      workflowsPath: fileURLToPath(workflowsEntry()),
      activities,
    });
    const result = await worker.runUntil(
      env.client.workflow.execute("HelloWorkflow", {
        taskQueue: TASK_QUEUE,
        workflowId: "hello-e2e-" + Date.now(),
        args: ["Zynoa"],
      }),
    );
    expect(result).toBe("Hello, Zynoa!");
  }, 120_000);

  it("greet activity is pure and deterministic", async () => {
    await expect(activities.greet("Phase 0")).resolves.toBe("Hello, Phase 0!");
  });
});
