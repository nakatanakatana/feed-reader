import { create, toJson } from "@bufbuild/protobuf";
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
import {
  ListFeedSchema,
  ListFeedsResponseSchema,
} from "../gen/feed/v1/feed_pb";
import { ListTagSchema, ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("FeedList Feed Counts", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const TestWrapper = (props: { children: JSX.Element }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TransportProvider>
  );

  it("displays feed counts for tags in filter bar", async () => {
    worker.use(
      http.post("*/tag.v1.TagService/ListTags", () => {
        const msg = create(ListTagsResponseSchema, {
          tags: [
            create(ListTagSchema, {
              id: "tag-1",
              name: "Tech",
              unreadCount: 5n,
              feedCount: 1n,
            }),
            create(ListTagSchema, {
              id: "tag-2",
              name: "News",
              unreadCount: 0n,
              feedCount: 2n,
            }),
          ],
        });
        return HttpResponse.json(toJson(ListTagsResponseSchema, msg));
      }),
      http.post("*/feed.v1.FeedService/ListFeeds", () => {
        const msg = create(ListFeedsResponseSchema, {
          feeds: [
            create(ListFeedSchema, {
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
      http.post("*/tag.v1.TagService/ListTags", () => {
        const msg = create(ListTagsResponseSchema, {
          tags: [
            create(ListTagSchema, {
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
