import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["./src/server/db/schema.ts", "./src/server/db/schema-scheduled.ts"],
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./local.db",
  },
});
