import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { initializeSchema } from "./migrate";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "file:./local.db";

const client = createClient({ url: databaseUrl });

// Create tables if they don't exist (idempotent)
await initializeSchema(client);

export const db = drizzle(client, { schema });

export type DB = typeof db;
