import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";
import {
  create,
  FeedSchema,
  ListFeedsResponseSchema,
  ListTagsResponseSchema,
  TagSchema,
  toJson,
} from "../test-utils/json-identity";

describe("FeedList Feed Counts", () => {
  let dispose: () => void;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(async () => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const TestWrapper = (props: { children: JSX.Element }) => (
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  );

  it("displays feed counts for tags in filter bar", async () => {
    worker.use(
      http.all("*/api/v2/tags", () => {
        const msg = create(ListTagsResponseSchema, {
          tags: [
            create(TagSchema, {
              id: "tag-1",
              name: "Tech",
              unreadCount: 5n,
              feedCount: 1n,
            }),
            create(TagSchema, {
              id: "tag-2",
              name: "News",
              unreadCount: 0n,
              feedCount: 2n,
            }),
          ],
        });
        return HttpResponse.json(toJson(ListTagsResponseSchema, msg));
      }),
      http.all("*/api/v2/feeds", () => {
        const msg = create(ListFeedsResponseSchema, {
          feeds: [
            create(FeedSchema, {
              id: "1",
              title: "Feed 1",
              url: "http://example.com/1",
              unreadCount: 5n,
            }),
          ],
        });
        return HttpResponse.json(toJson(ListFeedsResponseSchema, msg));
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TestWrapper>
          <RouterProvider router={router} />
        </TestWrapper>
      ),
      document.body,
    );

    const filterSelect = page.getByRole("combobox", { name: "Filter by tag" });
    await expect.element(filterSelect).toBeInTheDocument();

    await expect
      .element(page.getByRole("option", { name: "Tech (1)" }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("option", { name: "News (2)" }))
      .toBeInTheDocument();
  });

  it("displays feed counts correctly regardless of unread counts", async () => {
    worker.use(
      http.all("*/api/v2/tags", () => {
        const msg = create(ListTagsResponseSchema, {
          tags: [
            create(TagSchema, {
              id: "tag-1",
              name: "Big",
              unreadCount: 1500n,
              feedCount: 10n,
            }),
          ],
        });
        return HttpResponse.json(toJson(ListTagsResponseSchema, msg));
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TestWrapper>
          <RouterProvider router={router} />
        </TestWrapper>
      ),
      document.body,
    );

    const filterSelect = page.getByRole("combobox", { name: "Filter by tag" });
    await expect.element(filterSelect).toBeInTheDocument();

    await expect
      .element(page.getByRole("option", { name: "Big (10)" }))
      .toBeInTheDocument();
  });
});
