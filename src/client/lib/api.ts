// Re-export the canonical shared type so there is a single definition.
// The local `error` field is included here because some server endpoints
// return both `data` and `error` (e.g. ECS routes).
type ApiResponse<T> = {
  data: T;
  error?: string;
  message?: string;
};

/**
 * Asserts at runtime that `raw` has the expected ApiResponse envelope shape.
 * Throws if `data` is missing so callers always receive a well-formed object.
 */
function assertApiResponse<T>(raw: unknown, path: string): ApiResponse<T> {
  if (typeof raw !== "object" || raw === null || !("data" in raw)) {
    throw new Error(`Unexpected response shape from ${path}: 'data' field is missing`);
  }
  return raw as ApiResponse<T>;
}

export async function fetchApi<T>(path: string, signal?: AbortSignal): Promise<ApiResponse<T>> {
  const response = await fetch(path, { signal });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  const raw: unknown = await response.json();
  return assertApiResponse<T>(raw, path);
}

type MutateMethod = "POST" | "PUT" | "DELETE" | "PATCH";

type MutateOptions = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

export async function mutateApi<T>(
  path: string,
  method: MutateMethod,
  body?: unknown,
  options?: MutateOptions,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  const response = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  const raw: unknown = await response.json();
  return assertApiResponse<T>(raw, path);
}
