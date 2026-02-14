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
import { page } from "vitest/browser";
import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";
import {
  ListItemSchema,
  ListItemsResponseSchema,
  UpdateItemStatusResponseSchema,
} from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("ItemList Bulk Actions", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (items: Record<string, unknown>[] = []) => {
    worker.use(
      http.post("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          // biome-ignore lint/suspicious/noExplicitAny: mock data
          items: items.map((i) => create(ListItemSchema, i as any)),
          totalCount: items.length,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
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

  it("marks multiple items as read using transaction", async () => {
    setupMockData([
      {
        id: "1",
        title: "Item 1",
        publishedAt: "2026-01-26",
        createdAt: "2026-01-26",
        isRead: false,
        feedId: "feed1",
      },
      {
        id: "2",
        title: "Item 2",
        publishedAt: "2026-01-26",
        createdAt: "2026-01-26",
        isRead: false,
        feedId: "feed1",
      },
    ]);

    let updateCount = 0;
    worker.use(
      http.post(
        "*/item.v1.ItemService/UpdateItemStatus",
        async ({ request }) => {
          const body = (await request.json()) as {
            ids: string[];
            isRead: boolean;
          };
          if (body.ids.length === 2 && body.isRead === true) {
            updateCount++;
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

    const selectAll = page.getByLabelText(/Select All/i);
    await selectAll.click();

    // The bulk bar appears when items are selected.
    // It contains a "Mark as Read" button.
    const bulkMarkBtn = page
      .getByRole("button", { name: "Mark as Read" })
      .first();
    await expect.element(bulkMarkBtn).toBeVisible({ timeout: 5000 });
    await bulkMarkBtn.click();

    // Selection should be cleared
    await expect.element(selectAll).not.toBeChecked();

    // Verify API called
    await expect.poll(() => updateCount).toBe(1);
  });
});
