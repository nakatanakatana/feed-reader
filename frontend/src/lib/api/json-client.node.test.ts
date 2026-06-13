import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "./json-client";

describe("createApiClient", () => {
  it("returns JSON for successful responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ tags: [], totalUnreadCount: "0" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createApiClient({ baseUrl: "/api/v2", fetch: fetchMock });
    const result = await client.get("/tags");

    expect(result).toEqual({ tags: [], totalUnreadCount: "0" });
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/tags", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: undefined,
    });
  });

  it("throws ApiError for JSON error responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: "internal", message: "boom" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createApiClient({ baseUrl: "/api/v2", fetch: fetchMock });

    await expect(client.get("/tags")).rejects.toEqual(
      new ApiError("internal", "boom", 500),
    );
  });
});
