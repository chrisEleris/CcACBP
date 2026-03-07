type PaginationMeta = {
  limit: number;
  offset: number;
  total: number;
};

type ApiResponse<T> = {
  data: T;
  error?: string;
  message?: string;
  pagination?: PaginationMeta;
};

function getAuthHeaders(): Record<string, string> {
  const meta = import.meta as { env?: Record<string, string> };
  const apiKey = meta.env?.VITE_API_KEY;
  if (apiKey) {
    return { "X-API-Key": apiKey };
  }
  return {};
}

export async function fetchApi<T>(path: string, signal?: AbortSignal): Promise<ApiResponse<T>> {
  const authHeaders = getAuthHeaders();
  const hasAuthHeaders = Object.keys(authHeaders).length > 0;
  const response = await fetch(path, {
    signal,
    ...(hasAuthHeaders ? { headers: authHeaders } : {}),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiResponse<T>>;
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
    ...getAuthHeaders(),
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
  return response.json() as Promise<ApiResponse<T>>;
}
