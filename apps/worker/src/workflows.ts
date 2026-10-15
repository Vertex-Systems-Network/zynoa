/**
 * Workflows run in Temporal's deterministic sandbox: no Node APIs, no imports
 * outside @temporalio/workflow and pure code. Activities are reached by proxy.
 */
import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "./activities.js";

const { greet } = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 seconds",
});

export async function HelloWorkflow(name: string): Promise<string> {
  return greet(name);
}
