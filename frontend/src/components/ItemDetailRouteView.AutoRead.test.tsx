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
  UpdateItemStatusResponseSchema,
} from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { parseConnectMessage } from "../mocks/connect";
import { routeTree } from "../routeTree.gen";

describe("ItemDetailRouteView Auto-Read", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = () => {
    worker.use(
      http.all("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: [
            create(ListItemSchema, { id: "1", title: "Item 1", isRead: false }),
            create(ListItemSchema, { id: "2", title: "Item 2", isRead: false }),
          ],
          totalCount: 2,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/item.v1.ItemService/GetItem", async ({ request }) => {
        const body = (await parseConnectMessage(request)) as { id: string };
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

  it("marks current item as read when navigating to next", async () => {
    setupMockData();
    let updateCalledForId = "";
    worker.use(
      http.post(
        "*/item.v1.ItemService/UpdateItemStatus",
        async ({ request }) => {
          const body = (await request.json()) as {
            ids: string[];
            isRead: boolean;
          };
          if (body.isRead === true) {
            updateCalledForId = body.ids[0];
          }
          return HttpResponse.json(
            toJson(
              UpdateItemStatusResponseSchema,
              create(UpdateItemStatusResponseSchema, {}),
            ),
          );
        },
      ),
    );

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

    await userEvent.keyboard("j");

    await expect.poll(() => updateCalledForId).toBe("1");
  });

  it("marks current item as read when navigating to prev", async () => {
    setupMockData();
    let updateCalledForId = "";
    worker.use(
      http.post(
        "*/item.v1.ItemService/UpdateItemStatus",
        async ({ request }) => {
          const body = (await request.json()) as {
            ids: string[];
            isRead: boolean;
          };
          if (body.isRead === true) {
            updateCalledForId = body.ids[0];
          }
          return HttpResponse.json(
            toJson(
              UpdateItemStatusResponseSchema,
              create(UpdateItemStatusResponseSchema, {}),
            ),
          );
        },
      ),
    );

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

    await userEvent.keyboard("k");

    await expect.poll(() => updateCalledForId).toBe("2");
  });
});
