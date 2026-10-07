import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "test/empty.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
    // Integration tests share one local database.
    fileParallelism: false,
  },
});
