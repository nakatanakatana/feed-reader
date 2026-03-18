import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";
import {
  ItemSchema,
  ListItemsResponseSchema,
  UpdateItemStatusResponseSchema,
} from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { dateToTimestamp } from "../lib/item-utils";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("ItemList Bulk Actions", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (items: Record<string, unknown>[] = []) => {
    worker.use(
      http.all("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          // biome-ignore lint/suspicious/noExplicitAny: mock data
          items: items.map((i) => create(ItemSchema, i as any)),
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
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

  it("marks multiple items as read using transaction", async () => {
    setupMockData([
      {
        id: "1",
        title: "Item 1",
        publishedAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
        createdAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
        isRead: false,
        feedId: "feed1",
      },
      {
        id: "2",
        title: "Item 2",
        publishedAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
        createdAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
        isRead: false,
        feedId: "feed1",
      },
    ]);

    let updateCount = 0;
    worker.use(
      http.post("*/item.v1.ItemService/UpdateItemStatus", async ({ request }) => {
        const body = (await request.json()) as {
          ids: string[];
          isRead: boolean;
        };
        if (body.ids.length === 2 && body.isRead === true) {
          updateCount++;
        }
        return HttpResponse.json(
          toJson(UpdateItemStatusResponseSchema, create(UpdateItemStatusResponseSchema, {})),
        );
      }),
    );

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

    const selectAll = page.getByLabelText(/Select All/i);
    await selectAll.click();

    // The bulk bar appears when items are selected.
    // It contains a "Mark as Read" button.
    const bulkMarkBtn = page.getByRole("button", { name: "Mark as Read" }).first();
    await expect.element(bulkMarkBtn).toBeVisible();
    await bulkMarkBtn.click();

    // Selection should be cleared
    await expect.element(selectAll).not.toBeChecked();

    // Verify API called
    await expect.poll(() => updateCount).toBe(1);
  });

  it("shows 'Processing...' immediately and makes a single API call for large selections (>100)", async () => {
    const itemCount = 150;
    const items = Array.from({ length: itemCount }).map((_, i) => ({
      id: `${i}`,
      title: `Item ${i}`,
      publishedAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
      createdAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
      isRead: false,
      feedId: "feed1",
    }));
    setupMockData(items);

    let totalRequestCount = 0;
    let fullBatchRequestCount = 0;
    worker.use(
      http.post("*/item.v1.ItemService/UpdateItemStatus", async ({ request }) => {
        totalRequestCount++;
        const body = (await request.json()) as {
          ids: string[];
          isRead: boolean;
        };
        // Increment only if it's a valid update request that includes all selected items
        if (body.isRead === true && body.ids.length === itemCount) {
          fullBatchRequestCount++;
        }
        // Simulate some network delay so we can see "Processing..."
        await new Promise((resolve) => setTimeout(resolve, 500));
        return HttpResponse.json(
          toJson(UpdateItemStatusResponseSchema, create(UpdateItemStatusResponseSchema, {})),
        );
      }),
    );

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

    await expect.element(page.getByText("Item 0")).toBeInTheDocument();

    const selectAll = page.getByLabelText(/Select All/i);
    await selectAll.click();

    const bulkMarkBtn = page.getByRole("button", { name: "Mark as Read" }).first();
    await expect.element(bulkMarkBtn).toBeVisible();

    // handleBulkMarkAsRead is async and awaits the network request.
    // Locator clicks from vitest/browser are async and wait for the handler to complete,
    // which means we would only see the final state, not the intermediate "Processing..." UI.
    // To verify that intermediate state, we trigger a standard native DOM click on the element.
    const el = bulkMarkBtn.element() as HTMLElement;
    el.click();

    // Selection should still be checked while processing
    await expect.element(selectAll).toBeChecked();

    // The handler yields immediately via setTimeout(0) before doing heavy work,
    // and Solid needs a turn to render the updated isBulkMarking state.
    // We should wait for the element to appear.
    await expect.poll(() => page.getByText("Processing...").query()).not.toBeNull();

    // Wait for the simulated network request to complete and UI to update
    await expect.poll(() => page.getByText("Processing...").query(), { timeout: 5000 }).toBeNull();

    // Selection should be cleared after processing finishes
    await expect.element(selectAll).not.toBeChecked();
    // Use poll because the updateCount might be incremented slightly after the UI updates.
    await expect.poll(() => totalRequestCount).toBe(1);
    await expect.poll(() => fullBatchRequestCount).toBe(1);
  });
});
