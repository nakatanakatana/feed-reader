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
import { dateToTimestamp } from "../lib/item-utils";
import { queryClient } from "../lib/query";
import { ToastProvider } from "../lib/toast";
import { worker } from "../mocks/browser";
import { parseRequestMessage } from "../mocks/http";
import { routeTree } from "../routeTree.gen";
import {
  create,
  GetItemResponseSchema,
  ItemSchema,
  ListFeedTagsResponseSchema,
  ListItemsResponseSchema,
  ListTagsResponseSchema,
  toJson,
} from "../test-utils/json-identity";

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
      create(ItemSchema, {
        id: `item-${i.toString().padStart(3, "0")}`,
        title: `Item ${i}`,
        isRead: false,
        createdAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
        publishedAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
      }),
    );

    worker.use(
      http.all("*/api/v2/items", () => {
        const msg = create(ListItemsResponseSchema, {
          items: mockItems,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/api/v2/items/:id", async ({ request }) => {
        const body = (await parseRequestMessage(request)) as { id: string };
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: body.id,
            title: `Item ${body.id}`,
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
      http.all("*/api/v2/tags", () => {
        return HttpResponse.json(
          toJson(
            ListTagsResponseSchema,
            create(ListTagsResponseSchema, { tags: [] }),
          ),
        );
      }),
      http.all("*/api/v2/feed-tags", () => {
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
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </QueryClientProvider>
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
