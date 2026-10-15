/** Task queue names shared by workers and clients. */
export const TASK_QUEUE = "zynoa-main";

/**
 * Absolute path of the workflows entry for Worker.create. Under tsx (dev) this
 * module runs from src, so the entry is workflows.ts (Temporal's bundler
 * compiles TS natively); built output runs from dist, where it is workflows.js.
 */
export function workflowsEntry(): URL {
  const extension = import.meta.url.endsWith(".ts") ? "ts" : "js";
  return new URL(`./workflows.${extension}`, import.meta.url);
}
