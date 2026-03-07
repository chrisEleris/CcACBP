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
 * Each parameter is parsed independently so an invalid limit does not reset a
 * valid offset and vice versa.
 */
export function parsePagination(c: Context): Pagination {
  const rawLimit = c.req.query("limit");
  const rawOffset = c.req.query("offset");

  const limitResult = z.coerce.number().int().min(1).max(MAX_LIMIT).safeParse(rawLimit);
  const offsetResult = z.coerce.number().int().min(0).safeParse(rawOffset);

  return {
    limit: limitResult.success ? limitResult.data : DEFAULT_LIMIT,
    offset: offsetResult.success ? offsetResult.data : DEFAULT_OFFSET,
  };
}
