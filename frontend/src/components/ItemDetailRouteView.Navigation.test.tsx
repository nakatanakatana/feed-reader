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
import { apiClient } from "../lib/api/client";
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
  UpdateItemStatusResponseSchema,
} from "../test-utils/json-identity";

describe("ItemDetailRouteView Seamless Navigation", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const updateStatusSpy = vi.fn();
  const apiPostSpy = vi.spyOn(apiClient, "post");

  const setupMockData = (
    mockItems = [
      create(ItemSchema, { id: "1", title: "Item 1", isRead: false }),
      create(ItemSchema, { id: "2", title: "Item 2", isRead: false }),
    ],
  ) => {
    worker.use(
      http.all("*/api/v2/items", async ({ request }) => {
        const body = (await parseRequestMessage(request)) as {
          isRead?: boolean;
        };
        let items = mockItems;
        if (body.isRead !== undefined) {
          items = mockItems.filter((item) => item.isRead === body.isRead);
        }
        const msg = create(ListItemsResponseSchema, {
          items,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/api/v2/items/:id", async ({ request }) => {
        const body = (await parseRequestMessage(request)) as { id: string };
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
      http.all("*/api/v2/items/status", async ({ request }) => {
        updateStatusSpy(await request.json());
        return HttpResponse.json(
          toJson(
            UpdateItemStatusResponseSchema,
            create(UpdateItemStatusResponseSchema, {}),
          ),
        );
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

  it("navigates to next item correctly", async () => {
    setupMockData();
    const history = createMemoryHistory({ initialEntries: ["/items/1"] });
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

    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();

    await userEvent.keyboard("j");

    await expect.poll(() => history.location.pathname).toBe("/items/2");

    await expect
      .element(page.getByRole("heading", { name: "Item 2" }))
      .toBeInTheDocument();
  });

  it("navigates back to a read item that remains visible in ItemList", async () => {
    setupMockData();
    const history = createMemoryHistory({ initialEntries: ["/items/1"] });
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

    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();

    await userEvent.keyboard("j");
    await expect.poll(() => history.location.pathname).toBe("/items/2");

    await userEvent.keyboard("k");
    await expect.poll(() => history.location.pathname).toBe("/items/1");
    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();
  });

  it("navigates to prev item correctly", async () => {
    setupMockData();
    const history = createMemoryHistory({ initialEntries: ["/items/2"] });
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
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </QueryClientProvider>
      ),
      document.body,
    );

    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();

    const moreActionsButton = page.getByRole("button", {
      name: "More actions",
    });
    await moreActionsButton.click();

    const closeMenuItem = page.getByRole("menuitem", { name: "Close" });
    await closeMenuItem.click();

    await expect.poll(() => history.location.pathname).toBe("/");
    await expect
      .poll(() => history.location.search)
      .toContain("tagId=test-tag");
    await expect.poll(() => history.location.search).toContain("since=all");
  });

  it("navigates to end-of-list placeholder from last item and marks it read", async () => {
    setupMockData();
    const history = createMemoryHistory({ initialEntries: ["/items/2"] });
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

    await expect
      .element(page.getByRole("heading", { name: "Item 2" }))
      .toBeInTheDocument();

    await userEvent.keyboard("j");

    await expect
      .poll(() => history.location.pathname)
      .toBe("/items/end-of-list");

    await expect
      .poll(() => apiPostSpy)
      .toHaveBeenCalledWith("/items/status", { ids: ["2"], isRead: true });
  });

  it("navigates back from end-of-list to the last real item", async () => {
    setupMockData();
    const history = createMemoryHistory({
      initialEntries: ["/items/end-of-list"],
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
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </QueryClientProvider>
      ),
      document.body,
    );

    await expect
      .element(page.getByRole("heading", { name: "Item 2" }))
      .toBeInTheDocument();

    await userEvent.keyboard("j");
    await expect
      .poll(() => history.location.pathname)
      .toBe("/items/end-of-list");
    await expect
      .element(page.getByRole("heading", { name: "End of List" }))
      .toBeInTheDocument();
    await page.getByRole("heading", { name: "End of List" }).click();

    await userEvent.keyboard("k");
    await expect.poll(() => history.location.pathname).toBe("/items/2");

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
    const mockItems = [
      create(ItemSchema, {
        id: "1",
        title: "Item 1",
        isRead: false,
        feedId: "f1",
      }),
      create(ItemSchema, {
        id: "2",
        title: "Item 2",
        isRead: true,
        feedId: "f1",
      }),
    ];
    setupMockData(mockItems);

    worker.use(
      http.all("*/api/v2/tags", () => {
        return HttpResponse.json(
          toJson(
            ListTagsResponseSchema,
            create(ListTagsResponseSchema, {
              tags: [{ id: "tag-1", name: "Tag 1" }],
            }),
          ),
        );
      }),
      http.all("*/api/v2/feed-tags", () => {
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

    const history = createMemoryHistory({
      initialEntries: ["/items/1?tagId=tag-1"],
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

    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();

    await userEvent.keyboard("j");

    await expect
      .poll(() => history.location.pathname)
      .toBe("/items/end-of-list");
  });
});
