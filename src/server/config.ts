import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).default("file:./local.db"),
  AWS_REGION: z.string().min(1).default("us-east-1"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_KEY: z.string().min(1).optional(),
});

export const config = envSchema.parse(process.env);
