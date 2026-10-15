/**
 * Workflows run deterministically inside Temporal's sandbox: no I/O here —
 * everything external goes through an activity proxy.
 */
import { proxyActivities } from "@temporalio/workflow";
import type { Activities } from "./activities.js";

const { greet } = proxyActivities<Activities>({
  startToCloseTimeout: "30 seconds",
  retry: { maximumAttempts: 3 },
});

/** WU-P0-09: proves workflow -> activity -> result round-trips end to end. */
export async function HelloWorkflow(name: string): Promise<string> {
  return greet(name);
}
