import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import type { Item } from "../lib/api/types-generated";
import { setLastFetched } from "../lib/item-sync-state";
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";
import {
  buildItem,
  buildListFeedTagsResponse,
  buildListItemReadResponse,
  buildListItemsResponse,
  buildListTagsResponse,
} from "../test-utils/openapi-fixtures";

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
    localeTimeSpy = vi
      .spyOn(Date.prototype, "toLocaleTimeString")
      .mockReturnValue("4:00:00 AM");
  });

  const setupMockData = (
    items: Partial<Item>[] = [],
    itemReads: { itemId: string; isRead: boolean }[] = [],
  ) => {
    const fixedDate = "2026-03-01T00:00:00.000Z";
    worker.use(
      http.all("*/api/v2/items", () => {
        return HttpResponse.json(
          buildListItemsResponse(
            items.map((item) =>
              buildItem({
                publishedAt: fixedDate,
                createdAt: fixedDate,
                ...item,
                id: item.id ?? "unknown",
              }),
            ),
          ),
        );
      }),
      http.all("*/api/v2/item-reads", () => {
        return HttpResponse.json(
          buildListItemReadResponse(
            itemReads.map((itemRead) => ({
              itemId: itemRead.itemId,
              isRead: itemRead.isRead,
              updatedAt: new Date().toISOString(),
            })),
          ),
        );
      }),
      http.all("*/api/v2/tags", () => {
        return HttpResponse.json(buildListTagsResponse([]));
      }),
      http.all("*/api/v2/feed-tags", () => {
        return HttpResponse.json(buildListFeedTagsResponse());
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
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      ),
      document.body,
    );

    // Should show "No items found" when empty
    await expect.element(page.getByText("No items found")).toBeVisible();

    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("displays a list of items", async () => {
    const fixedDate = "2026-03-01T00:00:00.000Z";
    setLastFetched(new Date(fixedDate));
    setupMockData([
      {
        id: "1",
        title: "Item 1",
        publishedAt: fixedDate,
        createdAt: fixedDate,
        isRead: false,
        feedId: "feed-1",
      },
      {
        id: "2",
        title: "Item 2",
        publishedAt: fixedDate,
        createdAt: fixedDate,
        isRead: true,
        feedId: "feed-1",
      },
    ]);

    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      ),
      document.body,
    );

    await expect.element(page.getByText("Item 1")).toBeInTheDocument();
    await expect.element(page.getByText("Item 2")).toBeInTheDocument();

    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("updates item read status via delta sync", async () => {
    const fixedDate = "2026-03-01T00:00:00.000Z";
    setLastFetched(new Date(fixedDate));

    const items: Partial<Item>[] = [
      {
        id: "1",
        title: "Item 1",
        publishedAt: fixedDate,
        createdAt: fixedDate,
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
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
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
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      ),
      document.body,
    );

    // Check for the horizontal scroll container
    const scrollContainer = page.getByTestId("horizontal-scroll-container");
    await expect.element(scrollContainer).toBeInTheDocument();
  });
});
