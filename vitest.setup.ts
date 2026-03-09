import { initDb } from "./src/server/db/index";

// Initialize the database schema before any test file runs.
// This replaces the old top-level await in db/index.ts.
await initDb();
