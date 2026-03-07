import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { config } from "../config";
import { initializeSchema } from "./migrate";
import * as schema from "./schema";
import * as scheduledSchema from "./schema-scheduled";

const databaseUrl = config.DATABASE_URL;

const client = createClient({ url: databaseUrl });

// Create tables if they don't exist (idempotent)
await initializeSchema(client);

const allSchema = { ...schema, ...scheduledSchema };
export const db = drizzle(client, { schema: allSchema });

export type DB = typeof db;
