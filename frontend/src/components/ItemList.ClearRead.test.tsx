import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";
import {
  ListItemSchema,
  ListItemsResponseSchema,
} from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { setLastFetched } from "../lib/item-db";
import { itemStore } from "../lib/item-store";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("ItemList Clear Read Items", () => {
  let dispose: () => void;
  let listItemsCount = 0;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    setLastFetched(null);
    itemStore.clearTransientRemovedIds();
  });

  const setupMockData = (items: Record<string, unknown>[] = []) => {
    listItemsCount = 0;
    worker.use(
      http.post("*/item.v1.ItemService/ListItems", () => {
        listItemsCount++;
        const msg = create(ListItemsResponseSchema, {
          items: items.map((i) => create(ListItemSchema, i)),
          totalCount: items.length,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.post("*/tag.v1.TagService/ListTags", () => {
        return HttpResponse.json(
          toJson(
            ListTagsResponseSchema,
            create(ListTagsResponseSchema, { tags: [] }),
          ),
        );
      }),
      http.post("*/feed.v1.FeedService/ListFeedTags", () => {
        return HttpResponse.json(
          toJson(
            ListFeedTagsResponseSchema,
            create(ListFeedTagsResponseSchema, { feedTags: [] }),
          ),
        );
      }),
    );
  };

  it("removes read items from the view when 'Clear Read Items' is clicked", async () => {
    const fixedDate = "2026-01-20T19:00:00Z";
    setLastFetched(new Date(fixedDate));
    setupMockData([
      {
        id: "1",
        title: "Unread Item",
        publishedAt: fixedDate,
        createdAt: fixedDate,
        isRead: false,
      },
      {
        id: "2",
        title: "Read Item",
        publishedAt: fixedDate,
        createdAt: fixedDate,
        isRead: true,
      },
    ]);

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

    // Initial state: both items visible
    await expect
      .element(page.getByText("Unread Item", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Read Item", { exact: true }))
      .toBeInTheDocument();

    // Click "Clear Read Items" button
    const clearButton = page.getByRole("button", { name: /clear read items/i });
    await expect.element(clearButton).toBeVisible();
    await clearButton.click();

    // After clicking: Read Item should be gone, Unread Item should remain
    await expect
      .element(page.getByText("Unread Item", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Read Item", { exact: true }))
      .not.toBeInTheDocument();

    // Verify no new ListItems request was made after clicking Clear (only the initial one)
    // Initial fetch happens during render
    expect(listItemsCount).toBe(1);

    // Verify transience: clearing the store restores the items
    itemStore.clearTransientRemovedIds();

    // Read Item should reappear
    await vi.waitFor(async () => {
      await expect
        .element(page.getByText("Read Item", { exact: true }))
        .toBeInTheDocument();
    });

    // --- New check for Refresh button ---
    // First, remove it again
    const clearButton2 = page.getByRole("button", {
      name: /clear read items/i,
    });
    await clearButton2.click();
    await expect
      .element(page.getByText("Read Item", { exact: true }))
      .not.toBeInTheDocument();

    // Click Refresh button
    const refreshButton = page.getByRole("button", { name: /refresh/i });
    await refreshButton.click();

    // Read Item should reappear because queryFn clears the transient IDs
    await vi.waitFor(async () => {
      await expect
        .element(page.getByText("Read Item", { exact: true }))
        .toBeInTheDocument();
    });
  });
});
