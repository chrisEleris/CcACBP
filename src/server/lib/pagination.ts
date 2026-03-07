import type { Context } from "hono";
import { z } from "zod";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_OFFSET = 0;

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(DEFAULT_OFFSET),
});

export type Pagination = {
  limit: number;
  offset: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

/**
 * Parses `limit` and `offset` query parameters from the request context.
 * Defaults to limit=50, offset=0. Enforces a maximum limit of 200.
 */
export function parsePagination(c: Context): Pagination {
  const raw = {
    limit: c.req.query("limit"),
    offset: c.req.query("offset"),
  };

  const result = paginationSchema.safeParse(raw);

  if (!result.success) {
    return { limit: DEFAULT_LIMIT, offset: DEFAULT_OFFSET };
  }

  return result.data;
}
