import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";
import {
  GetItemResponseSchema,
  ItemSchema,
  ListItemsResponseSchema,
  UpdateItemStatusResponseSchema,
} from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { queryClient, transport } from "../lib/query";
import { ToastProvider } from "../lib/toast";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { parseConnectMessage } from "../mocks/connect";
import { routeTree } from "../routeTree.gen";

describe("ItemDetailRouteView Skip Navigation", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    queryClient.clear();
  });

  const updateStatusSpy = vi.fn();

  const setupMockData = (
    mockItems = [
      create(ItemSchema, { id: "1", title: "Item 1", isRead: false }),
      create(ItemSchema, { id: "2", title: "Item 2", isRead: false }),
    ],
  ) => {
    worker.use(
      http.all("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: mockItems,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/item.v1.ItemService/GetItem", async ({ request }) => {
        const body = (await parseConnectMessage(request)) as { id: string };
        const id = body.id;
        const found = mockItems.find((i) => i.id === id);
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: id,
            title: found?.title || `Item ${id}`,
            isRead: found?.isRead || false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
      http.post("*/item.v1.ItemService/UpdateItemStatus", async ({ request }) => {
        const body = await request.json();
        updateStatusSpy(body);
        return HttpResponse.json(
          toJson(UpdateItemStatusResponseSchema, create(UpdateItemStatusResponseSchema, {})),
        );
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

  it("skips to next item without marking current as read when 'n' is pressed", async () => {
    setupMockData();
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

    // Wait for content
    await expect.element(page.getByRole("heading", { name: "Item 1" })).toBeInTheDocument();

    // Focus the modal to ensure keyboard events are captured
    const dialog = page.getByRole("dialog");
    await expect.element(dialog).toBeInTheDocument();
    dialog.element().focus();

    await userEvent.keyboard("n");

    // URL should update to /items/2
    await expect.poll(() => history.location.pathname).toBe("/items/2");

    // Heading should update to Item 2
    await expect.element(page.getByRole("heading", { name: "Item 2" })).toBeInTheDocument();

    // Verify markAsRead was NOT called for Item 1, even after a short delay
    await expect.poll(() => updateStatusSpy.mock.calls.length).toBe(0);
  });
});
