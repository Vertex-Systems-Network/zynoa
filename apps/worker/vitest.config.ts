import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // First run downloads the Temporal dev server binary.
    testTimeout: 120_000,
    hookTimeout: 180_000,
  },
});
