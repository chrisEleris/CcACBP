type ApiResponse<T> = {
  data: T;
  error?: string;
  message?: string;
};

export async function fetchApi<T>(path: string, signal?: AbortSignal): Promise<ApiResponse<T>> {
  const response = await fetch(path, { signal });
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
