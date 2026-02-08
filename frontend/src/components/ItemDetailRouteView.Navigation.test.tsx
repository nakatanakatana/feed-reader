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
import {
  ListItemsResponseSchema,
  ListItemSchema,
  GetItemResponseSchema,
  ItemSchema,
  UpdateItemStatusResponseSchema,
} from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";

describe("ItemDetailRouteView Seamless Navigation", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = () => {
    worker.use(
      http.post("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: [
            create(ListItemSchema, { id: "1", title: "Item 1", isRead: false }),
            create(ListItemSchema, { id: "2", title: "Item 2", isRead: false }),
          ],
          totalCount: 2,
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
      http.post("*/item.v1.ItemService/UpdateItemStatus", () => {
        return HttpResponse.json(
          toJson(
            UpdateItemStatusResponseSchema,
            create(UpdateItemStatusResponseSchema, {}),
          ),
        );
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

  it("navigates to next item correctly", async () => {
    setupMockData();
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

    // Wait for content
    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();

    const nextButton = page.getByRole("button", { name: "Next →" });
    await nextButton.click();

    // URL should update
    await expect.poll(() => history.location.pathname).toBe("/items/2");

    // Heading should update
    await expect
      .element(page.getByRole("heading", { name: "Item 2" }))
      .toBeInTheDocument();
  });

  it("navigates to prev item correctly", async () => {
    setupMockData();
    const history = createMemoryHistory({ initialEntries: ["/items/2"] });
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

    await expect
      .element(page.getByRole("heading", { name: "Item 2" }))
      .toBeInTheDocument();

    const prevButton = page.getByRole("button", { name: "← Previous" });
    await prevButton.click();

    await expect.poll(() => history.location.pathname).toBe("/items/1");
    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();
  });
});
