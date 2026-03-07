import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@server": path.resolve(__dirname, "./src/server"),
      "@client": path.resolve(__dirname, "./src/client"),
      "@shared": path.resolve(__dirname, "./src/shared"),
    },
  },
  test: {
    globals: false,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Run test files sequentially to avoid SQLite locking conflicts
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/client/main.tsx"],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
