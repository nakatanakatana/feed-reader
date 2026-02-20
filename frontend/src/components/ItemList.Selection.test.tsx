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
} from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("ItemList Selection", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (items: Record<string, unknown>[] = []) => {
    worker.use(
      http.all("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: items.map((i) => create(ListItemSchema, i)),
          totalCount: items.length,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
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

  it("toggles item selection", async () => {
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

    // Wait for content
    await expect.element(page.getByText("Item 1")).toBeInTheDocument();

    // Get checkboxes
    const checkboxes = page.getByRole("checkbox");
    // Should have 1 (Show Read) + 1 (Select All) + 2 (Items) = 4 checkboxes
    await expect.poll(async () => (await checkboxes.all()).length).toBe(4);

    const selectAll = page.getByLabelText(/Select All/i);
    const allCheckboxes = await checkboxes.all();
    const item1Checkbox = allCheckboxes[2];
    const item2Checkbox = allCheckboxes[3];

    // Select Item 1
    await item1Checkbox.click();
    await expect.element(item1Checkbox).toBeChecked();
    await expect.element(selectAll).not.toBeChecked();

    // Select Item 2
    await item2Checkbox.click();
    await expect.element(item2Checkbox).toBeChecked();
    await expect.element(selectAll).toBeChecked();

    // Deselect Item 1
    await item1Checkbox.click();
    await expect.element(item1Checkbox).not.toBeChecked();
    await expect.element(selectAll).not.toBeChecked();
  });

  it("selects all items when 'Select All' is clicked", async () => {
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
    const checkboxes = page.getByRole("checkbox");
    await expect.poll(async () => (await checkboxes.all()).length).toBe(4);

    const allCheckboxes = await checkboxes.all();
    const item1Checkbox = allCheckboxes[2];
    const item2Checkbox = allCheckboxes[3];

    // Click Select All
    await selectAll.click();
    await expect.element(item1Checkbox).toBeChecked();
    await expect.element(item2Checkbox).toBeChecked();

    // Click Select All again to deselect
    await selectAll.click();
    await expect.element(item1Checkbox).not.toBeChecked();
    await expect.element(item2Checkbox).not.toBeChecked();
  });
});
