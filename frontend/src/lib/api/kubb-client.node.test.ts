import { describe, expect, it, vi } from "vitest";
import client, { ApiError, type Client } from "./kubb-client";

describe("kubb-client", () => {
  it("returns response data for successful GET", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ tags: [] }), {
          status: 200,
          statusText: "OK",
        }),
    );
    const kubbClient: Client = client;
    const result = await kubbClient<{ tags: unknown[] }>(
      { method: "GET", url: "/tags" },
      { fetch: fetchMock },
    );

    expect(result.data).toEqual({ tags: [] });
    expect(result.status).toBe(200);
    expect(result.statusText).toBe("OK");
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/tags", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: undefined,
    });
  });

  it("does not duplicate baseURL when path already includes it", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ tags: [] }), {
          status: 200,
          statusText: "OK",
        }),
    );

    await client({ method: "GET", url: "/api/v2/tags" }, { fetch: fetchMock });

    expect(fetchMock).toHaveBeenCalledWith("/api/v2/tags", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: undefined,
    });
  });

  it("calls onUnauthorized and throws ApiError on 401", async () => {
    const onUnauthorized = vi.fn();
    const fetchMock = vi.fn(async () => new Response("", { status: 401 }));

    await expect(
      client(
        { method: "GET", url: "/tags" },
        { fetch: fetchMock, onUnauthorized },
      ),
    ).rejects.toEqual(new ApiError("unauthorized", "Unauthorized", 401));
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
