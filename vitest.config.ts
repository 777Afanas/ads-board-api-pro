import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      JWT_SECRET: "test-secret-key-at-least-256-bits-long-for-vitest-runner",
    },
  },
});