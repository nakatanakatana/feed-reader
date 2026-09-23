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
import { itemStore } from "../lib/item-store";
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
  ListURLParsingRulesResponseSchema,
  toJson,
} from "../test-utils/json-identity";

describe("ItemDetailRouteView Reactivity", () => {
  let dispose: () => void;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  // biome-ignore lint/suspicious/noExplicitAny: test mock data
  const setupMockData = (itemsData: any[]) => {
    worker.use(
      http.all("*/api/v2/items", () => {
        const msg = create(ListItemsResponseSchema, {
          items: itemsData.map((i) => create(ItemSchema, i)),
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/api/v2/items/:id", async ({ request }) => {
        const body = (await parseRequestMessage(request)) as { id: string };
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
      http.all("*/api/v2/tags", () => {
        return HttpResponse.json(
          toJson(
            ListTagsResponseSchema,
            create(ListTagsResponseSchema, { tags: [] }),
          ),
        );
      }),
      http.all("*/api/v2/url-rules", () => {
        return HttpResponse.json(
          toJson(
            ListURLParsingRulesResponseSchema,
            create(ListURLParsingRulesResponseSchema, { rules: [] }),
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
      http.post("*/api/v2/items/status", () => {
        return HttpResponse.json({});
      }),
    );
  };

  it("should correctly compute next/prev items based on reactive items()", async () => {
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
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </QueryClientProvider>
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

    // Update mock data to only have 1 item
    setupMockData([{ id: "1", title: "Item 1", isRead: false }]);

    // Change filter state to trigger a fresh query key
    itemStore.setDateFilter("24h");

    // Wait for the re-fetch to complete and the component to update.
    // We expect Item 2 to be removed from the list of neighboring items.
    // In ItemDetailRouteView, this means nextItemId should become end-of-list eventually.
    await expect.poll(() => history.location.pathname).toBe("/items/1");

    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();

    // Ensure focus is on the modal before pressing 'j'
    const dialog = page.getByRole("dialog");
    await expect.element(dialog).toBeInTheDocument();
    await userEvent.click(dialog);

    // With only 1 item, 'j' should transition to the "End of List" placeholder.
    await userEvent.keyboard("j");
    await expect
      .poll(() => history.location.pathname)
      .toBe("/items/end-of-list");

    await expect
      .element(page.getByRole("heading", { name: "End of List" }))
      .toBeInTheDocument();
  });
});
