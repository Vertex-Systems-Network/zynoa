/**
 * Feature flags (docs/spec/ENGINEERING-RULES.md §4, US-004).
 *
 * Every Phase N user-visible feature ships behind a `phaseN.*` flag until its exit gate passes.
 * Flags are read per workspace and are **off by default**. Rows mirror the `feature_flags`
 * table (docs/spec/04_DATA_MODEL.md): a workspace row overrides the global row (workspace null),
 * and `rolloutPct` enables a deterministic share of workspaces.
 *
 * Sources are consulted in order and the first source that has *any* row for the flag
 * (workspace or global) decides; later sources are not consulted. Put the authoritative
 * source first, e.g. `[databaseSource, fileFlagSource(path)]` once packages/db exists.
 *
 * This module has no Node.js imports, so it is safe in edge and browser bundles.
 * The file source lives in `@zynoa/config/flags/file` (Node only).
 */
import { z } from "zod";

const FLAG_KEY = /^[a-z][a-z0-9]*(\.[a-z0-9][a-z0-9-]*)+$/;

export const flagKey = z
  .string()
  .regex(FLAG_KEY, "flag key must look like `phase1.chat` (lowercase, dot-separated)");

export const flagRow = z.object({
  key: flagKey,
  workspaceId: z.string().min(1).nullable().default(null),
  enabled: z.boolean(),
  rolloutPct: z.number().int().min(0).max(100).nullable().default(null),
});

export type FlagRow = z.output<typeof flagRow>;
export type FlagRowInput = z.input<typeof flagRow>;

export interface FlagSource {
  /** Rows for `key` that apply to `workspaceId`: the workspace row and/or the global row. */
  rows(key: string, workspaceId: string | null): Promise<FlagRow[]> | FlagRow[];
}

export interface Flags {
  isEnabled(flag: string, workspaceId: string | null): Promise<boolean>;
}

/** FNV-1a 32-bit — stable across runtimes (Node, edge, browser) without crypto imports. */
export function rolloutBucket(key: string, workspaceId: string): number {
  let hash = 0x811c9dc5;
  for (const char of `${key}:${workspaceId}`) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 100;
}

function decide(row: FlagRow, key: string, workspaceId: string | null): boolean {
  if (!row.enabled) return false;
  if (row.rolloutPct === null || row.rolloutPct >= 100) return true;
  if (workspaceId === null) return false;
  return rolloutBucket(key, workspaceId) < row.rolloutPct;
}

export function createFlags(sources: FlagSource[]): Flags {
  return {
    async isEnabled(flag, workspaceId) {
      const key = flagKey.parse(flag);
      for (const source of sources) {
        const rows = await source.rows(key, workspaceId);
        const own =
          workspaceId === null ? undefined : rows.find((r) => r.workspaceId === workspaceId);
        const global = rows.find((r) => r.workspaceId === null);
        const row = own ?? global;
        if (row) return decide(row, key, workspaceId);
      }
      return false;
    },
  };
}

export function memoryFlagSource(input: FlagRowInput[]): FlagSource {
  const all = z.array(flagRow).parse(input);
  return {
    rows: (key, workspaceId) =>
      all.filter((r) => r.key === key && (r.workspaceId === null || r.workspaceId === workspaceId)),
  };
}
