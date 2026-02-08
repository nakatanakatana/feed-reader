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
import { ListItemsResponseSchema, ListItemSchema, GetItemResponseSchema, ItemSchema } from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";

describe("ItemDetailRouteView Reactivity", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (itemsData: any[]) => {
    worker.use(
      http.post("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: itemsData.map(i => create(ListItemSchema, i)),
          totalCount: itemsData.length
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.post("*/item.v1.ItemService/GetItem", async ({ request }) => {
        const body = await request.json() as any;
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: body.id,
            title: `Item ${body.id}`,
            isRead: false,
          })
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
      http.post("*/tag.v1.TagService/ListTags", () => {
        return HttpResponse.json(toJson(ListTagsResponseSchema, create(ListTagsResponseSchema, { tags: [] })));
      }),
      http.post("*/feed.v1.FeedService/ListFeedTags", () => {
        return HttpResponse.json(toJson(ListFeedTagsResponseSchema, create(ListFeedTagsResponseSchema, { feedTags: [] })));
      })
    );
  };

  it("should correctly compute next/prev items based on reactive items()", async () => {
    setupMockData([
      { id: "1", title: "Item 1", isRead: false },
      { id: "2", title: "Item 2", isRead: false },
    ]);

    const history = createMemoryHistory({ initialEntries: ["/items/1"] });
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

    // Initial state: Item 1 has Next (Item 2)
    await expect.element(page.getByRole("heading", { name: "Item 1" })).toBeInTheDocument();
    const nextButton = page.getByRole("button", { name: "Next →" });
    await expect.element(nextButton).not.toBeDisabled();

            // Update mock data to only have 1 item

            setupMockData([

                { id: "1", title: "Item 1", isRead: false },

            ]);

        

            // Change filter state to trigger a fresh query key

            itemStore.setDateFilter("24h");

        

            // It should have been called again due to reactivity

            // And with the new mock data (only 1 item), it should have no Next.

            await expect.element(nextButton).toBeDisabled();

        

    

      });

    });

    