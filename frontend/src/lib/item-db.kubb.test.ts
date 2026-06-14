import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { setLastFetched, setLastReadFetched } from "./item-sync-state";
import { queryClient } from "./query";
import { worker } from "../mocks/browser";

describe("item-db kubb integration", () => {
  afterEach(() => {
    worker.resetHandlers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    setLastFetched(null);
    setLastReadFetched(null);
  });

  it("getItemsQueryOptions.queryFn fetches via itemsList", async () => {
    worker.use(
      http.get("*/api/v2/items", () =>
        HttpResponse.json({
          items: [
            {
              id: "item-1",
              title: "Item 1",
              description: "desc",
              publishedAt: "2026-03-01T00:00:00.000Z",
              createdAt: "2026-03-01T00:00:01.000Z",
              isRead: false,
              feedId: "feed-1",
              url: "https://example.com",
              author: "author",
              categories: "cat",
              imageUrl: "https://example.com/image.png",
              content: "content",
            },
          ],
          nextPageToken: "",
        }),
      ),
    );

    const { getItemsQueryOptions } = await import("./item-db");
    const result = await getItemsQueryOptions(false, "30d").queryFn();

    expect(result).toHaveLength(1);
  });

  it("getItem delegates fetch to itemsGet", async () => {
    worker.use(
      http.get("*/api/v2/items/item-1", () =>
        HttpResponse.json({
          item: {
            id: "item-1",
            title: "Item 1",
            description: "desc",
            publishedAt: "2026-03-01T00:00:00.000Z",
            createdAt: "2026-03-01T00:00:01.000Z",
            isRead: false,
            feedId: "feed-1",
            url: "https://example.com",
            author: "author",
            categories: "cat",
            imageUrl: "https://example.com/image.png",
            content: "content",
          },
        }),
      ),
    );

    const { getItem } = await import("./item-db");
    const result = await getItem("item-1");

    expect(result?.id).toBe("item-1");
  });

  it("updateItemStatus sends mutation through itemsUpdateStatus", async () => {
    worker.use(http.post("*/api/v2/items/status", () => HttpResponse.json({})));

    const queryKey = ["items", { since: "30d", showRead: false }] as const;
    queryClient.setQueryData(queryKey, [
      { id: "item-1", title: "Item 1", isRead: false, feedId: "feed-1" },
    ]);

    const { updateItemStatus } = await import("./item-db");
    await updateItemStatus(["item-1"], true, queryKey);

    const cached =
      queryClient.getQueryData<Array<{ id: string; isRead: boolean }>>(
        queryKey,
      );
    expect(cached?.[0]?.isRead).toBe(true);
  });
});
