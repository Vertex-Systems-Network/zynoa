/**
 * WU-P0-09 acceptance: HelloWorkflow runs end to end — a real Temporal dev
 * server (downloaded by @temporalio/testing on first run), a real worker, a
 * real client. Unit tests for the activity run everywhere; the e2e suite
 * can be pointed at the compose server with TEMPORAL_ADDRESS instead.
 */
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { activities } from "../src/activities.js";

describe("greet activity", () => {
  it("greets by name", async () => {
    await expect(activities.greet("Zynoa")).resolves.toBe("Hello, Zynoa!");
  });

  it("rejects an empty name", async () => {
    await expect(activities.greet("")).rejects.toThrow(/name/i);
  });
});

describe("HelloWorkflow end to end", () => {
  let env: TestWorkflowEnvironment;

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createLocal();
  }, 120_000);

  afterAll(async () => {
    await env?.teardown();
  });

  it("runs through a real worker and returns the greeting", async () => {
    const taskQueue = "zynoa-phase0-test";
    const worker = await Worker.create({
      connection: env.nativeConnection,
      namespace: env.namespace,
      taskQueue,
      workflowsPath: fileURLToPath(new URL("../src/workflows.ts", import.meta.url)),
      activities,
    });
    const result = await worker.runUntil(
      env.client.workflow.execute("HelloWorkflow", {
        taskQueue,
        workflowId: `hello-${Date.now()}`,
        args: ["Phase 0"],
      }),
    );
    expect(result).toBe("Hello, Phase 0!");
  }, 120_000);
});
