import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
