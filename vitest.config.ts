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
    env: {
      DATABASE_URL: "file::memory:?cache=shared",
      SECRET_KEY: "test-secret-key-for-vitest-32bytes",
      NODE_ENV: "test",
    },
    setupFiles: ["./vitest.setup.ts"],
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
      include: ["src/server/**/*.ts"],
      exclude: [
        "src/server/entry.ts",
        // AWS SDK routes require real credentials for success paths;
        // error handling and helper functions are tested separately
        "src/server/routes/aws.ts",
        "src/server/routes/ecs.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
