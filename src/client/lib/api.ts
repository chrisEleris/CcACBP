type ApiResponse<T> = {
  data: T;
  error?: string;
  message?: string;
};

export async function fetchApi<T>(path: string): Promise<ApiResponse<T>> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiResponse<T>>;
}
