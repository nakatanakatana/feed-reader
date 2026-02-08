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
import { itemStore } from "../lib/item-store";
import { http, HttpResponse } from "msw";
import { worker } from "../mocks/browser";
import { create, toJson } from "@bufbuild/protobuf";
import { ListItemsResponseSchema } from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";

describe("ItemList Reactivity", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (onListItems?: (req: any) => void) => {
    worker.use(
      http.post("*/item.v1.ItemService/ListItems", async ({ request }) => {
        const body = await request.json();
        onListItems?.(body);
        return HttpResponse.json(toJson(ListItemsResponseSchema, create(ListItemsResponseSchema, { items: [], totalCount: 0 })));
      }),
      http.post("*/tag.v1.TagService/ListTags", () => {
        return HttpResponse.json(toJson(ListTagsResponseSchema, create(ListTagsResponseSchema, { tags: [] })));
      }),
      http.post("*/feed.v1.FeedService/ListFeedTags", () => {
        return HttpResponse.json(toJson(ListFeedTagsResponseSchema, create(ListFeedTagsResponseSchema, { feedTags: [] })));
      })
    );
  };

  it("should re-query items when itemStore parameters change", async () => {
    let callCount = 0;
    setupMockData(() => {
        callCount++;
    });

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

    // Initial call check
    await expect.poll(() => callCount).toBeGreaterThan(0);
    const countAfterInitial = callCount;

    // Change store state
    itemStore.setShowRead(!itemStore.state.showRead);

    // It should have been called again due to reactivity
    await expect.poll(() => callCount).toBeGreaterThan(countAfterInitial);
  });

  it("should update itemStore when the Show Read toggle is clicked", async () => {
    setupMockData();
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

    const toggle = page.getByLabelText(/Show Read/i);
    await expect.element(toggle).toBeInTheDocument();

    const initialState = itemStore.state.showRead;
    await toggle.click();

    expect(itemStore.state.showRead).toBe(!initialState);
  });
});