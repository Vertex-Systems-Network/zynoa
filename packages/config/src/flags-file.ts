/**
 * Node-only feature-flag sources. Import from `@zynoa/config/flags/file`.
 */
import { readFileSync } from "node:fs";
import {
  createFlags,
  memoryFlagSource,
  type FlagRowInput,
  type FlagSource,
  type Flags,
} from "./flags.js";

export interface FileFlagSourceOptions {
  /** When true a missing file means "no flags" (everything off). Default false: a missing file throws. */
  optional?: boolean;
}

/**
 * JSON file of flag rows, e.g. `[{"key":"phase1.chat","enabled":true}]`.
 * An invalid file always throws; a missing file throws unless `optional` is set,
 * so a mistyped path cannot silently switch every flag off.
 */
export function fileFlagSource(path: string, options: FileFlagSourceOptions = {}): FlagSource {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" && options.optional) {
      return memoryFlagSource([]);
    }
    throw new Error(`Cannot read feature flag file ${path}: ${(error as Error).message}`, {
      cause: error,
    });
  }
  try {
    return memoryFlagSource(JSON.parse(text) as FlagRowInput[]);
  } catch (error) {
    throw new Error(`Invalid feature flag file ${path}: ${(error as Error).message}`, {
      cause: error,
    });
  }
}

/**
 * Flags for a server process: `sources` first (e.g. the database source), then the file named
 * by `FEATURE_FLAGS_FILE` when set. With nothing configured every flag is off.
 */
export function createFlagsFromEnv(
  env: { FEATURE_FLAGS_FILE?: string | undefined },
  sources: FlagSource[] = [],
): Flags {
  const file = env.FEATURE_FLAGS_FILE ? [fileFlagSource(env.FEATURE_FLAGS_FILE)] : [];
  return createFlags([...sources, ...file]);
}
