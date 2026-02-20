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
import { parseRequest } from "../mocks/request-utils";
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
      create(ListItemSchema, {
        id: `item-${i.toString().padStart(3, "0")}`,
        title: `Item ${i}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      }),
    );

    worker.use(
      http.all("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: mockItems,
          totalCount: mockItems.length,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/item.v1.ItemService/GetItem", async ({ request }) => {
        const body = (await parseRequest(request)) as { id: string };
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: body.id,
            title: `Item ${body.id}`,
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
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

  it("prefetches neighboring items when an item is displayed", async () => {
    setupMockData(20);
    const prefetchSpy = vi.spyOn(queryClient, "prefetchQuery");

    const history = createMemoryHistory({
      initialEntries: ["/items/item-005"],
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

    // Wait for content
    await expect
      .element(page.getByRole("heading", { name: "Item item-005" }))
      .toBeInTheDocument();

    await vi.waitFor(() => {
      const prefetchedIds = prefetchSpy.mock.calls.map(
        (call) => call[0].queryKey?.[1],
      );
      // item-005 is index 5. Next 5: item-006, item-007, item-008, item-009, item-010
      expect(prefetchedIds).toContain("item-006");
      expect(prefetchedIds).toContain("item-007");
      expect(prefetchedIds).toContain("item-008");
      expect(prefetchedIds).toContain("item-009");
      expect(prefetchedIds).toContain("item-010");
    });

    const prefetchedIds = prefetchSpy.mock.calls.map(
      (call) => call[0].queryKey?.[1],
    );
    expect(prefetchedIds).not.toContain("item-011");
    expect(prefetchedIds).not.toContain("item-004");
  });
});
