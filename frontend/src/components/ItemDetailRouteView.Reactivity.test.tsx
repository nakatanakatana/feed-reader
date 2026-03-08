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
  GetItemResponseSchema,
  ItemSchema,
  ListItemSchema,
  ListItemsResponseSchema,
  ListURLParsingRulesResponseSchema,
} from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { itemsCollection } from "../lib/item-db";
import { itemStore } from "../lib/item-store";
import { queryClient, transport } from "../lib/query";
import { ToastProvider } from "../lib/toast";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { parseConnectMessage } from "../mocks/connect";
import { routeTree } from "../routeTree.gen";

describe("ItemDetailRouteView Reactivity", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  // biome-ignore lint/suspicious/noExplicitAny: test mock data
  const setupMockData = (itemsData: any[]) => {
    worker.use(
      http.all("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: itemsData.map((i) => create(ListItemSchema, i)),
          totalCount: itemsData.length,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/item.v1.ItemService/GetItem", async ({ request }) => {
        const body = (await parseConnectMessage(request)) as { id: string };
        const found = itemsData.find((i) => i.id === body.id);
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: body.id,
            title: found?.title || `Item ${body.id}`,
            isRead: found?.isRead || false,
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
      http.all("*/item.v1.ItemService/ListURLParsingRules", () => {
        return HttpResponse.json(
          toJson(
            ListURLParsingRulesResponseSchema,
            create(ListURLParsingRulesResponseSchema, { rules: [] }),
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
        return HttpResponse.json({});
      }),
    );
  };

  it("should correctly compute next/prev items based on reactive itemsCollection", async () => {
    // Enable showRead to avoid items disappearing during navigation tests
    itemStore.setShowRead(true);

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
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Initial state: Item 1 has Next (Item 2)
    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();

    // Navigate to next item using 'j'
    await userEvent.keyboard("j");
    await expect.poll(() => history.location.pathname).toBe("/items/2");
    await expect
      .element(page.getByRole("heading", { name: "Item 2" }))
      .toBeInTheDocument();

    // Navigate back to Item 1 using 'k'
    await userEvent.click(page.getByRole("heading", { name: "Item 2" }));
    await userEvent.keyboard("k");
    await expect.poll(() => history.location.pathname).toBe("/items/1");
    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();

    // Update mock data to include a new item
    setupMockData([
      { id: "1", title: "Item 1", isRead: false },
      { id: "2", title: "Item 2", isRead: false },
      { id: "3", title: "Item 3", isRead: false },
    ]);

    // Change filter state to trigger a fresh query key
    itemStore.setDateFilter("24h");

    // Wait for the re-fetch to complete and the component to update.
    await expect.poll(() => history.location.pathname).toBe("/items/1");

    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();

    // Ensure focus is on the modal before pressing 'j'
    const dialog = page.getByRole("dialog");
    await expect.element(dialog).toBeInTheDocument();
    await userEvent.click(dialog);

    // Press 'j' to go to Item 2
    await userEvent.keyboard("j");
    await expect.poll(() => history.location.pathname).toBe("/items/2");

    // Press 'j' to go to Item 3 (the newly added item)
    await userEvent.keyboard("j");
    await expect.poll(() => history.location.pathname).toBe("/items/3");

    await expect
      .element(page.getByRole("heading", { name: "Item 3" }))
      .toBeInTheDocument();
  });
});
