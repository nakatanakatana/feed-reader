import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";
import {
  ItemSchema,
  ListItemReadResponseSchema,
  ListItemsResponseSchema,
  type Item as ProtoItem,
} from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { setLastFetched } from "../lib/item-sync-state";
import { dateToTimestamp } from "../lib/item-utils";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("ItemList", () => {
  let dispose: () => void;
  let localeTimeSpy: ReturnType<typeof vi.spyOn> | null = null;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.useRealTimers();
    localeTimeSpy?.mockRestore();
    localeTimeSpy = null;
    setLastFetched(null);
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-07T12:00:00Z"));
    localeTimeSpy = vi.spyOn(Date.prototype, "toLocaleTimeString").mockReturnValue("4:00:00 AM");
  });

  const setupMockData = (
    items: Partial<ProtoItem>[] = [],
    itemReads: { itemId: string; isRead: boolean }[] = [],
  ) => {
    worker.use(
      http.all("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          // biome-ignore lint/suspicious/noExplicitAny: mocking message shapes is more efficient with any here
          items: items.map((i) => create(ItemSchema, i as any)),
          nextPageToken: "",
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/item.v1.ItemService/ListItemRead", () => {
        const msg = create(ListItemReadResponseSchema, {
          itemReads: itemReads.map((ir) => ({
            itemId: ir.itemId,
            isRead: ir.isRead,
            updatedAt: dateToTimestamp(new Date()),
          })),
          nextPageToken: "",
        });
        return HttpResponse.json(toJson(ListItemReadResponseSchema, msg));
      }),
      http.all("*/tag.v1.TagService/ListTags", () => {
        return HttpResponse.json(
          toJson(ListTagsResponseSchema, create(ListTagsResponseSchema, { tags: [] })),
        );
      }),
      http.all("*/feed.v1.FeedService/ListFeedTags", () => {
        return HttpResponse.json(
          toJson(ListFeedTagsResponseSchema, create(ListFeedTagsResponseSchema, { feedTags: [] })),
        );
      }),
    );
  };

  it("renders empty state when no items", async () => {
    setLastFetched(new Date("2026-03-01T00:00:00Z"));
    setupMockData([]);
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Should show "No items found" when empty
    await expect.element(page.getByText("No items found")).toBeVisible();

    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("displays a list of items", async () => {
    const fixedDate = new Date("2026-03-01T00:00:00Z");
    setLastFetched(fixedDate);
    setupMockData([
      {
        id: "1",
        title: "Item 1",
        publishedAt: dateToTimestamp(fixedDate),
        createdAt: dateToTimestamp(fixedDate),
        isRead: false,
        feedId: "feed-1",
      },
      {
        id: "2",
        title: "Item 2",
        publishedAt: dateToTimestamp(fixedDate),
        createdAt: dateToTimestamp(fixedDate),
        isRead: true,
        feedId: "feed-1",
      },
    ]);

    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    await expect.element(page.getByText("Item 1")).toBeInTheDocument();
    await expect.element(page.getByText("Item 2")).toBeInTheDocument();

    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("updates item read status via delta sync", async () => {
    const fixedDate = new Date("2026-03-01T00:00:00Z");
    setLastFetched(fixedDate);

    const items: Partial<ProtoItem>[] = [
      {
        id: "1",
        title: "Item 1",
        publishedAt: dateToTimestamp(fixedDate),
        createdAt: dateToTimestamp(fixedDate),
        isRead: false,
        feedId: "feed-1",
      },
    ];

    setupMockData(items);

    // Use showRead=true so the item doesn't disappear when marked as read
    const history = createMemoryHistory({
      initialEntries: ["/?showRead=true"],
    });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    const itemRow = page.getByTestId("item-row-1");
    await expect.element(itemRow).toBeInTheDocument();

    // Verify it's unread
    await expect.element(itemRow).toHaveAttribute("data-is-read", "false");

    // Mock delta sync: Item 1 becomes read
    setupMockData(items, [
      {
        itemId: "1",
        isRead: true,
      },
    ]);

    // Advance fake timers so system time moves forward.
    // This ensures that the updatedAt timestamp in the mock is newer than the anchor.
    await vi.advanceTimersByTimeAsync(100);

    // Trigger refetch for item-reads
    await queryClient.refetchQueries({ queryKey: ["item-reads"] });

    // Item 1 should now be read
    await expect.element(itemRow).toHaveAttribute("data-is-read", "true");
  });

  it("renders tag filters in a horizontal scroll list", async () => {
    setLastFetched(new Date("2026-03-01T00:00:00Z"));
    setupMockData([]);
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Check for the horizontal scroll container
    const scrollContainer = page.getByTestId("horizontal-scroll-container");
    await expect.element(scrollContainer).toBeInTheDocument();
  });
});
