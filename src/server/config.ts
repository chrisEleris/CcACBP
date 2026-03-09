import { z } from "zod";

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1).default("file:./local.db"),
    AWS_REGION: z.string().min(1).default("us-east-1"),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_KEY: z.string().min(1).optional(),
    // Comma-separated list of allowed ECS cluster names/ARNs. When unset, all clusters are allowed.
    ALLOWED_ECS_CLUSTERS: z.string().optional(),
    // Required in production (like API_KEY). Used to encrypt data source credentials at rest.
    // Must be at least 32 characters long to provide adequate entropy for AES-256 key derivation.
    SECRET_KEY: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && env.SECRET_KEY && env.SECRET_KEY.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 32,
        type: "string",
        inclusive: true,
        message: "SECRET_KEY must be at least 32 characters long in production",
        path: ["SECRET_KEY"],
      });
    }
  });

export const config = envSchema.parse(process.env);
