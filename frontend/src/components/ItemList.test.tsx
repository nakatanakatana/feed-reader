import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";
import { http, HttpResponse } from "msw";
import { worker } from "../mocks/browser";
import { create, toJson } from "@bufbuild/protobuf";
import { ListItemsResponseSchema, ListItemSchema } from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";

describe("ItemList", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (items: any[] = []) => {
    worker.use(
      http.post("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: items.map(i => create(ListItemSchema, i)),
          totalCount: items.length
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.post("*/tag.v1.TagService/ListTags", () => {
        return HttpResponse.json(toJson(ListTagsResponseSchema, create(ListTagsResponseSchema, { tags: [] })));
      }),
      http.post("*/feed.v1.FeedService/ListFeedTags", () => {
        return HttpResponse.json(toJson(ListFeedTagsResponseSchema, create(ListFeedTagsResponseSchema, { feedTags: [] })));
      })
    );
  };

  it("renders empty state when no items", async () => {
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
  });

  it("displays a list of items", async () => {
    setupMockData([
      { id: "1", title: "Item 1", publishedAt: new Date().toISOString(), createdAt: new Date().toISOString(), isRead: false },
      { id: "2", title: "Item 2", publishedAt: new Date().toISOString(), createdAt: new Date().toISOString(), isRead: true },
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
  });
});