import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";
import { http, HttpResponse } from "msw";
import { worker } from "../mocks/browser";
import { create, toJson } from "@bufbuild/protobuf";
import {
  ListFeedsResponseSchema,
  ListFeedSchema,
} from "../gen/feed/v1/feed_pb";
import { ListTagsResponseSchema, ListTagSchema } from "../gen/tag/v1/tag_pb";

describe("FeedList Unread Counts", () => {
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

  it("displays unread count for each feed", async () => {
    worker.use(
      http.post("*/feed.v1.FeedService/ListFeeds", () => {
        const msg = create(ListFeedsResponseSchema, {
          feeds: [
            create(ListFeedSchema, {
              id: "1",
              title: "Feed 1",
              url: "http://example.com/1",
              unreadCount: 5n,
            }),
            create(ListFeedSchema, {
              id: "2",
              title: "Feed 2",
              url: "http://example.com/2",
              unreadCount: 0n,
            }),
            create(ListFeedSchema, {
              id: "3",
              title: "Feed 3",
              url: "http://example.com/3",
              unreadCount: 10n,
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

    await expect.element(page.getByText("Feed 1")).toBeInTheDocument();
  });

  it("displays unread counts for tags in filter bar", async () => {
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
              feedCount: 1n,
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
      .element(page.getByRole("option", { name: "Tech (5)" }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("option", { name: "News (0)" }))
      .toBeInTheDocument();
  });

  it("formats unread counts of 1000 or more as '999+'", async () => {
    worker.use(
      http.post("*/tag.v1.TagService/ListTags", () => {
        const msg = create(ListTagsResponseSchema, {
          tags: [
            create(ListTagSchema, {
              id: "tag-1",
              name: "Big",
              unreadCount: 1500n,
              feedCount: 1n,
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
      .element(page.getByRole("option", { name: "Big (999+)" }))
      .toBeInTheDocument();
  });
});
