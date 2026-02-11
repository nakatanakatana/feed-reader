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
  GetItemResponseSchema,
  ItemSchema,
  ListItemSchema,
  ListItemsResponseSchema,
} from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("ItemDetailRouteView Prefetching", () => {
  let dispose: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  const setupMockData = (count = 10) => {
    const mockItems = Array.from({ length: count }, (_, i) =>
      create(ListItemSchema, { id: `${i}`, title: `Item ${i}`, isRead: false }),
    );

    worker.use(
      http.post("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: mockItems,
          totalCount: mockItems.length,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.post("*/item.v1.ItemService/GetItem", async ({ request }) => {
        const body = (await request.json()) as { id: string };
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: body.id,
            title: `Item ${body.id}`,
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
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

  it("prefetches neighboring items when an item is displayed", async () => {
    setupMockData(10);
    const prefetchSpy = vi.spyOn(queryClient, "prefetchQuery");
    
    const history = createMemoryHistory({ initialEntries: ["/items/5"] });
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

    // Wait for content
    await expect
      .element(page.getByRole("heading", { name: "Item 5" }))
      .toBeInTheDocument();

    // Should prefetch 2, 3, 4 and 6, 7, 8
    const prefetchedIds = prefetchSpy.mock.calls.map(call => call[0].queryKey?.[1]);
    
    expect(prefetchedIds).toContain("2");
    expect(prefetchedIds).toContain("3");
    expect(prefetchedIds).toContain("4");
    expect(prefetchedIds).toContain("6");
    expect(prefetchedIds).toContain("7");
    expect(prefetchedIds).toContain("8");
  });
});
