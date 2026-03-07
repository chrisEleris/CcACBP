import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchApi } from "../../src/client/lib/api";

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
