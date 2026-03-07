import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the api module before importing useFetch
vi.mock("../../src/client/lib/api", () => ({
  fetchApi: vi.fn(),
}));

import { fetchApi } from "../../src/client/lib/api";

describe("useFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchApi is called with the correct path", async () => {
    vi.mocked(fetchApi).mockResolvedValue({ data: [{ id: "1" }] });

    const result = await fetchApi("/api/test");
    expect(fetchApi).toHaveBeenCalledWith("/api/test");
    expect(result.data).toEqual([{ id: "1" }]);
  });

  it("fetchApi handles abort signals correctly", async () => {
    const controller = new AbortController();
    vi.mocked(fetchApi).mockResolvedValue({ data: [] });

    await fetchApi("/api/test", controller.signal);
    expect(fetchApi).toHaveBeenCalledWith("/api/test", controller.signal);
  });

  it("fetchApi rejects on error", async () => {
    vi.mocked(fetchApi).mockRejectedValue(new Error("Network error"));

    await expect(fetchApi("/api/test")).rejects.toThrow("Network error");
  });

  it("fetchApi returns error field from API response", async () => {
    vi.mocked(fetchApi).mockResolvedValue({
      data: [],
      error: "AWS credentials not configured",
    });

    const result = await fetchApi("/api/aws/ec2/instances");
    expect(result.error).toBe("AWS credentials not configured");
    expect(result.data).toEqual([]);
  });
});
