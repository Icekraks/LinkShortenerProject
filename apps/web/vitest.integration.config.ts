import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@ui": path.resolve(__dirname, "components/ui"),
      "@lib": path.resolve(__dirname, "lib"),
      "@components": path.resolve(__dirname, "components"),
      "server-only": path.resolve(__dirname, "test/shims/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
