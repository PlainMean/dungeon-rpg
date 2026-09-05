import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // sim/ runs headless in Node; render/e2e are excluded from unit runs.
    include: [
      "tests/unit/**/*.test.ts",
      "tests/property/**/*.test.ts",
      "tests/replay/**/*.test.ts",
      "tests/soak/**/*.test.ts",
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    environment: "node",
  },
});