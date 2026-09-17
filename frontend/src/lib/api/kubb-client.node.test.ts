import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, client, setupClientInterceptors } from "./kubb-client";

describe("kubb-client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns response data for successful GET", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ tags: [] }), {
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const testClient = client.createClient();
    setupClientInterceptors(testClient);

    const result = await testClient<{ tags: unknown[] }>({
      method: "GET",
      url: "/tags",
    });

    expect(result.data).toEqual({ tags: [] });
    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalled();
    const firstCall = fetchMock.mock.calls[0] as unknown[] | undefined;
    const requestArg = firstCall?.[0] as Request | undefined;
    expect(requestArg?.url).toContain("/api/v2/tags");
    expect(requestArg?.method).toBe("GET");
  });

  it("calls onUnauthorized and throws ApiError on 401", async () => {
    const onUnauthorized = vi.fn();
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const testClient = client.createClient();
    setupClientInterceptors(testClient, onUnauthorized);

    await expect(testClient({ method: "GET", url: "/tags" })).rejects.toEqual(
      new ApiError("unauthorized", "Unauthorized", 401),
    );
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("transforms ResponseError to ApiError with server error payload on 400", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ code: "bad_request", message: "Invalid tag name" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const testClient = client.createClient();
    setupClientInterceptors(testClient);

    await expect(testClient({ method: "POST", url: "/tags" })).rejects.toEqual(
      new ApiError("bad_request", "Invalid tag name", 400),
    );
  });
});
