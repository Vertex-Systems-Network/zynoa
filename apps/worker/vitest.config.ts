import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // The e2e suite starts a real Temporal dev server (first run downloads it).
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
