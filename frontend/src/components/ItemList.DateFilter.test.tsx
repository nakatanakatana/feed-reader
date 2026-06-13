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
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";
import {
  create,
  ListFeedTagsResponseSchema,
  ListItemsResponseSchema,
  ListTagsResponseSchema,
  toJson,
} from "../test-utils/json-identity";

describe("ItemList Date Filter", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = () => {
    worker.use(
      http.all("*/api/v2/items", () => {
        const msg = create(ListItemsResponseSchema, {
          items: [],
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
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

  it("renders the date filter selector", async () => {
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

    const dateFilter = page.getByText(/Date:/i).first();
    await expect.element(dateFilter).toBeInTheDocument();
  });

  it("updates URL search params when date filter is changed", async () => {
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

    const select = page.getByRole("combobox");
    await select.selectOptions("30d");

    // Check if URL is updated
    await expect.poll(() => history.location.search).toEqual("?since=30d");
  });
});
