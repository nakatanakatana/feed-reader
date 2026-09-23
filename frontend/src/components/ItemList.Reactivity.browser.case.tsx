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
import { itemStore } from "../lib/item-store";
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";
import { parseRequestMessage } from "../mocks/http";
import { routeTree } from "../routeTree.gen";
import {
  create,
  ListFeedTagsResponseSchema,
  ListItemsResponseSchema,
  ListTagsResponseSchema,
  toJson,
} from "../test-utils/json-identity";

describe("ItemList Reactivity", () => {
  let dispose: () => void;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (
    onListItems?: (req: Record<string, unknown>) => void,
  ) => {
    worker.use(
      http.all("*/api/v2/items", async ({ request }) => {
        const body = (await parseRequestMessage(request)) as Record<
          string,
          unknown
        >;
        onListItems?.(body);
        return HttpResponse.json(
          toJson(
            ListItemsResponseSchema,
            create(ListItemsResponseSchema, { items: [], nextPageToken: "" }),
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

  it("should re-query items when itemStore parameters change", async () => {
    let callCount = 0;
    setupMockData(() => {
      callCount++;
    });

    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      ),
      document.body,
    );

    // Initial call check
    await expect.poll(() => callCount, { timeout: 5000 }).toBeGreaterThan(0);
    const countAfterInitial = callCount;

    // Change store state
    itemStore.setShowRead(!itemStore.state.showRead);

    // It should have been called again due to reactivity
    await expect
      .poll(() => callCount, { timeout: 5000 })
      .toBeGreaterThan(countAfterInitial);
  });

  it("should update itemStore when the Show Read toggle is clicked", async () => {
    setupMockData();
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      ),
      document.body,
    );

    const toggle = page.getByLabelText(/Show Read/i);
    await expect.element(toggle).toBeInTheDocument();

    const initialState = itemStore.state.showRead;
    await toggle.click();

    expect(itemStore.state.showRead).toBe(!initialState);
  });
});
