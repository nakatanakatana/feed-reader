import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { setLastReadFetched } from "./item-sync-state";
import { queryClient } from "./query";
import { worker } from "../mocks/browser";

describe("item-read-db kubb integration", () => {
  afterEach(() => {
    worker.resetHandlers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    setLastReadFetched(new Date("2026-03-07T00:00:00.000Z"));
  });

  it("itemReadQueryOptions.queryFn fetches via itemReadsList with paging", async () => {
    let callCount = 0;
    worker.use(
      http.get("*/api/v2/item-reads", ({ request }) => {
        callCount += 1;
        const url = new URL(request.url);
        if (callCount === 1) {
          expect(url.searchParams.get("since")).toBe(
            "2026-03-07T00:00:00.000Z",
          );
          expect(url.searchParams.get("pageToken")).toBeNull();
          return HttpResponse.json({
            itemReads: [
              {
                itemId: "item-1",
                isRead: true,
                updatedAt: "2026-03-07T00:00:01.000Z",
              },
            ],
            nextPageToken: "next-1",
          });
        }

        expect(url.searchParams.get("pageToken")).toBe("next-1");
        expect(url.searchParams.get("since")).toBeNull();
        return HttpResponse.json({
          itemReads: [
            {
              itemId: "item-2",
              isRead: false,
              updatedAt: "2026-03-07T00:00:02.000Z",
            },
          ],
          nextPageToken: "",
        });
      }),
    );

    const { itemReadQueryOptions } = await import("./item-read-db");
    const result = await itemReadQueryOptions.queryFn();

    expect(callCount).toBe(2);
    expect(result).toHaveLength(2);
  });

  it("updateItemReadStatus sends mutation through itemsUpdateStatus", async () => {
    worker.use(http.post("*/api/v2/items/status", () => HttpResponse.json({})));

    const { updateItemReadStatus } = await import("./item-read-db");
    await updateItemReadStatus(["item-1", "item-2"], true);

    const cached = queryClient.getQueryData<
      Array<{ id: string; isRead: boolean }>
    >(["item-reads"]);
    expect(cached).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "item-1", isRead: true }),
        expect.objectContaining({ id: "item-2", isRead: true }),
      ]),
    );
  });
});
