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
import { parseRequestMessage } from "../mocks/http";
import { routeTree } from "../routeTree.gen";
import {
  create,
  ListFeedTagsResponseSchema,
  ListItemsResponseSchema,
  ListTagsResponseSchema,
  toJson,
} from "../test-utils/json-identity";

describe("ItemList Show Read Toggle", () => {
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

  it("renders a toggle for show/hide read items", async () => {
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
  });

  it("triggers a refetch when toggle is clicked", async () => {
    let lastIsRead: boolean | undefined;
    setupMockData((body) => {
      lastIsRead = body.isRead as boolean | undefined;
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

    const toggle = page.getByLabelText(/Show Read/i);
    await expect.element(toggle).toBeInTheDocument();

    // Initial call should have isRead: false (default showRead is false)
    await expect.poll(() => lastIsRead).toBe(false);

    // Click toggle
    await toggle.click();

    // Should trigger a refetch with isRead undefined (or omitted if showRead is true)
    // Actually, ItemList.tsx:
    // const isRead = showRead ? {} : { isRead: false };
    // So if showRead is true, isRead is not sent in the request body.
    await expect.poll(() => lastIsRead).toBeUndefined();
  });
});
