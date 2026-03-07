import { create, toJson } from "@bufbuild/protobuf";
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
import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";
import {
  ListItemReadResponseSchema,
  ListItemSchema,
  ListItemsResponseSchema,
} from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { setLastFetched } from "../lib/item-db";
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
    vi.setSystemTime(new Date("2026-01-20T19:00:00Z"));
    localeTimeSpy = vi
      .spyOn(Date.prototype, "toLocaleTimeString")
      .mockReturnValue("4:00:00 AM");
  });

  const setupMockData = (
    items: Record<string, unknown>[] = [],
    itemReads: Record<string, unknown>[] = [],
  ) => {
    worker.use(
      http.all("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: items.map((i) => create(ListItemSchema, i)),
          totalCount: items.length,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/item.v1.ItemService/ListItemRead", () => {
        const msg = create(ListItemReadResponseSchema, {
          itemReads: itemReads.map((ir) => ({
            itemId: ir.itemId as string,
            isRead: ir.isRead as boolean,
            updatedAt: { seconds: BigInt(Date.now() / 1000), nanos: 0 },
          })),
        });
        return HttpResponse.json(toJson(ListItemReadResponseSchema, msg));
      }),
      http.all("*/tag.v1.TagService/ListTags", () => {
        return HttpResponse.json(
          toJson(
            ListTagsResponseSchema,
            create(ListTagsResponseSchema, { tags: [] }),
          ),
        );
      }),
      http.all("*/feed.v1.FeedService/ListFeedTags", () => {
        return HttpResponse.json(
          toJson(
            ListFeedTagsResponseSchema,
            create(ListFeedTagsResponseSchema, { feedTags: [] }),
          ),
        );
      }),
    );
  };

  it("renders empty state when no items", async () => {
    setLastFetched(new Date("2026-01-20T19:00:00Z"));
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
    const fixedDate = "2026-01-20T19:00:00Z";
    setLastFetched(new Date(fixedDate));
    setupMockData([
      {
        id: "1",
        title: "Item 1",
        publishedAt: fixedDate,
        createdAt: fixedDate,
        isRead: false,
      },
      {
        id: "2",
        title: "Item 2",
        publishedAt: fixedDate,
        createdAt: fixedDate,
        isRead: true,
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
    const fixedDate = "2026-01-20T19:00:00Z";
    setLastFetched(new Date(fixedDate));

    // Initially Item 1 is unread
    setupMockData([
      {
        id: "1",
        title: "Item 1",
        publishedAt: fixedDate,
        createdAt: fixedDate,
        isRead: false,
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

    const item1 = page.getByText("Item 1");
    await expect.element(item1).toBeInTheDocument();

    // Verify it's unread (has blue color class)
    await expect.element(item1).toHaveClass(/c_blue\.600/);

    // Mock delta sync: Item 1 becomes read
    setupMockData(
      [
        {
          id: "1",
          title: "Item 1",
          publishedAt: fixedDate,
          createdAt: fixedDate,
          isRead: true, // Now prioritize item state for optimistic updates
        },
      ],
      [
        {
          itemId: "1",
          isRead: true,
        },
      ],
    );

    // Trigger refetch for item-reads
    await queryClient.refetchQueries({ queryKey: ["item-reads"] });

    // Item 1 should now be read (has gray color class)
    await expect.element(item1).toHaveClass(/c_gray\.500/);
  });

  it("renders tag filters in a horizontal scroll list", async () => {
    setLastFetched(new Date("2026-01-20T19:00:00Z"));
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
