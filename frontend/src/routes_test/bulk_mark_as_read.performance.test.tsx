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
import { page, userEvent } from "vitest/browser";
import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";
import {
  ListItemSchema,
  ListItemsResponseSchema,
  UpdateItemStatusResponseSchema,
} from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("ItemList Bulk Mark as Read Performance", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (count: number) => {
    const items = Array.from({ length: count }, (_, i) => ({
      id: `item-${i}`,
      title: `Item ${i}`,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isRead: false,
      feedId: "feed1",
    }));

    worker.use(
      http.all("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: items.map((i) => create(ListItemSchema, i)),
          totalCount: items.length,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
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
      http.post("*/item.v1.ItemService/UpdateItemStatus", () => {
        return HttpResponse.json(
          toJson(
            UpdateItemStatusResponseSchema,
            create(UpdateItemStatusResponseSchema, {}),
          ),
        );
      }),
    );
  };

  it("should not block the main thread for too long when marking 1000 items as read", async () => {
    const ITEM_COUNT = 1000;
    setupMockData(ITEM_COUNT);

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

    // Wait for items to load
    await expect.element(page.getByText("Item 0")).toBeInTheDocument();

    const selectAll = page.getByLabelText(/Select All/i);
    await selectAll.click();

    const bulkMarkBtn = page.getByRole("button", { name: "Mark as Read" }).first();
    await expect.element(bulkMarkBtn).toBeVisible();

    // Measure how long the main thread is blocked.
    // We trigger the click but don't 'await' it immediately to measure when the main thread next yields.
    const start = performance.now();
    const clickPromise = userEvent.click(bulkMarkBtn);
    
    await new Promise((resolve) => setTimeout(resolve, 0));
    const end = performance.now();

    const duration = end - start;
    console.log(`Initial UI yield duration for ${ITEM_COUNT} items: ${duration.toFixed(2)}ms`);

    // The main thread should yield very quickly (returning control to event loop).
    expect(duration).toBeLessThan(100);

    // Now wait for the click itself to finish
    await clickPromise;

    // Verify that it eventually completes processing all items.
    // Selection should be cleared immediately
    await expect.element(selectAll).not.toBeChecked();

    // Wait for the processing to finish (it will take some time due to chunking)
    // When finished, the bulk action bar should disappear because selectedItemIds is empty
    await expect.element(page.getByTestId("bulk-action-bar")).not.toBeInTheDocument({ timeout: 15000 });
  });
});
