import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchApi, mutateApi } from "../../src/client/lib/api";

describe("fetchApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed JSON data on success", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [{ id: "1" }] }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const result = await fetchApi<{ id: string }[]>("/api/test");
    expect(result.data).toEqual([{ id: "1" }]);
  });

  it("throws an error when response is not ok", async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: "Not Found",
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    await expect(fetchApi("/api/missing")).rejects.toThrow("API error: 404 Not Found");
  });

  it("passes the abort signal to fetch", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);
    const controller = new AbortController();

    await fetchApi("/api/test", controller.signal);

    expect(fetch).toHaveBeenCalledWith("/api/test", { signal: controller.signal });
  });

  it("returns error field when present in response", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [], error: "Partial failure" }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const result = await fetchApi("/api/test");
    expect(result.error).toBe("Partial failure");
  });

  it("throws on 500 server error", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    await expect(fetchApi("/api/test")).rejects.toThrow("API error: 500 Internal Server Error");
  });
});

describe("mutateApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends a POST request with JSON body", async () => {
    const mockResponse = {
      ok: true,
      status: 201,
      json: () => Promise.resolve({ data: { id: "new-1", name: "Test" } }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const result = await mutateApi<{ id: string; name: string }>("/api/items", "POST", {
      name: "Test",
    });

    expect(result.data).toEqual({ id: "new-1", name: "Test" });
    expect(fetch).toHaveBeenCalledWith("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
      signal: undefined,
    });
  });

  it("sends a PUT request with JSON body", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { id: "1", name: "Updated" } }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    await mutateApi("/api/items/1", "PUT", { name: "Updated" });

    expect(fetch).toHaveBeenCalledWith("/api/items/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
      signal: undefined,
    });
  });

  it("sends a DELETE request without body", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { message: "Deleted" } }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    await mutateApi("/api/items/1", "DELETE");

    expect(fetch).toHaveBeenCalledWith("/api/items/1", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: undefined,
      signal: undefined,
    });
  });

  it("sends a PATCH request with JSON body", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { id: "1", status: "active" } }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    await mutateApi("/api/items/1", "PATCH", { status: "active" });

    expect(fetch).toHaveBeenCalledWith("/api/items/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
      signal: undefined,
    });
  });

  it("throws an error when response is not ok", async () => {
    const mockResponse = {
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    await expect(mutateApi("/api/items", "POST", { invalid: true })).rejects.toThrow(
      "API error: 422 Unprocessable Entity",
    );
  });

  it("passes the abort signal from options", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: {} }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);
    const controller = new AbortController();

    await mutateApi("/api/items", "POST", { name: "Test" }, { signal: controller.signal });

    expect(fetch).toHaveBeenCalledWith("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
      signal: controller.signal,
    });
  });

  it("merges custom headers with Content-Type", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: {} }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    await mutateApi(
      "/api/items",
      "POST",
      { name: "Test" },
      {
        headers: { "X-API-Key": "my-key" },
      },
    );

    expect(fetch).toHaveBeenCalledWith("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": "my-key" },
      body: JSON.stringify({ name: "Test" }),
      signal: undefined,
    });
  });

  it("returns error field when present in response", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [], error: "Partial failure" }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const result = await mutateApi("/api/items", "POST", {});
    expect(result.error).toBe("Partial failure");
  });
});
