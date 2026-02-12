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
import { routeTree } from "../routeTree.gen";

describe("ItemDetailRouteView Seamless Navigation", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const updateStatusSpy = vi.fn();

  const setupMockData = (
    mockItems = [
      create(ListItemSchema, { id: "1", title: "Item 1", isRead: false }),
      create(ListItemSchema, { id: "2", title: "Item 2", isRead: false }),
    ],
  ) => {
    worker.use(
      http.post("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: mockItems,
          totalCount: mockItems.length,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.post("*/item.v1.ItemService/GetItem", async ({ request }) => {
        const body = (await request.json()) as { id: string };
        const found = mockItems.find((i) => i.id === body.id);
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: body.id,
            title: found?.title || `Item ${body.id}`,
            isRead: found?.isRead || false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
      http.post(
        "*/item.v1.ItemService/UpdateItemStatus",
        async ({ request }) => {
          const body = await request.json();
          updateStatusSpy(body);
          return HttpResponse.json(
            toJson(
              UpdateItemStatusResponseSchema,
              create(UpdateItemStatusResponseSchema, {}),
            ),
          );
        },
      ),
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

    await userEvent.keyboard("j");

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

    await userEvent.keyboard("k");

    await expect.poll(() => history.location.pathname).toBe("/items/1");
    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();
  });

  it("closes the modal and preserves filters", async () => {
    setupMockData();
    const history = createMemoryHistory({
      initialEntries: ["/items/1?tagId=test-tag&since=all"],
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

    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();

    const closeButton = page.getByRole("button", { name: "Close" });
    await closeButton.click();

    await expect.poll(() => history.location.pathname).toBe("/");
    await expect
      .poll(() => history.location.search)
      .toContain("tagId=test-tag");
    await expect.poll(() => history.location.search).toContain("since=all");
  });

  it("navigates to end-of-list placeholder from last item and marks it read", async () => {
    setupMockData();
    // Start at last item (Item 2)
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

    await userEvent.keyboard("j");

    // Should navigate to end-of-list
    await expect
      .poll(() => history.location.pathname)
      .toBe("/items/end-of-list");

    // Item 2 should have been marked as read
    await expect
      .poll(() => updateStatusSpy)
      .toHaveBeenCalledWith(
        expect.objectContaining({ ids: ["2"], isRead: true }),
      );
  });

  it("navigates back from end-of-list to the last real item", async () => {
    setupMockData();
    const history = createMemoryHistory({
      initialEntries: ["/items/end-of-list"],
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

    await expect
      .element(page.getByRole("heading", { name: "End of List" }))
      .toBeInTheDocument();

    await userEvent.keyboard("k");

    await expect.poll(() => history.location.pathname).toBe("/items/2");
    await expect
      .element(page.getByRole("heading", { name: "Item 2" }))
      .toBeInTheDocument();
  });

  it("supports keyboard navigation through to the placeholder", async () => {
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

    // Use 'j' to go forward
    await userEvent.keyboard("j");
    await expect
      .poll(() => history.location.pathname)
      .toBe("/items/end-of-list");

    // Use 'k' to go back
    await userEvent.keyboard("k");
    await expect.poll(() => history.location.pathname).toBe("/items/2");

    // Use Arrows
    // Click a non-button element to ensure focus is in the modal
    await page.getByRole("heading", { name: "Item 2" }).click();
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .poll(() => history.location.pathname)
      .toBe("/items/end-of-list");

    await page.getByRole("heading", { name: "End of List" }).click();
    await userEvent.keyboard("{ArrowLeft}");
    await expect.poll(() => history.location.pathname).toBe("/items/2");
  });

  it("reaches end-of-list correctly when filtered by tag and read status", async () => {
    // Item 1 is unread, Item 2 is read.
    // If showRead is false, only Item 1 is visible.
    const mockItems = [
      create(ListItemSchema, {
        id: "1",
        title: "Item 1",
        isRead: false,
        feedId: "f1",
      }),
      create(ListItemSchema, {
        id: "2",
        title: "Item 2",
        isRead: true,
        feedId: "f1",
      }),
    ];
    setupMockData(mockItems);

    // Mock tag relation
    worker.use(
      http.post("*/tag.v1.TagService/ListTags", () => {
        return HttpResponse.json(
          toJson(
            ListTagsResponseSchema,
            create(ListTagsResponseSchema, {
              tags: [{ id: "tag-1", name: "Tag 1" }],
            }),
          ),
        );
      }),
      http.post("*/feed.v1.FeedService/ListFeedTags", () => {
        return HttpResponse.json(
          toJson(
            ListFeedTagsResponseSchema,
            create(ListFeedTagsResponseSchema, {
              feedTags: [{ feedId: "f1", tagId: "tag-1" }],
            }),
          ),
        );
      }),
    );

    // Initial state: showRead is false (default)
    // Even if showRead is false, we expect Item 2 to be in the navigation sequence
    // because it is present in the collection, matching ItemList visibility.
    const history = createMemoryHistory({
      initialEntries: ["/items/1?tagId=tag-1"],
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

    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();

    await userEvent.keyboard("j");

    // NEW BEHAVIOR:
    // It should navigate to Item 2 because it's in the collection,
    // even if it's already read, to match ItemList visibility.
    await expect.poll(() => history.location.pathname).toBe("/items/2");
  });
});
