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
  ListFeedTagsResponseSchema,
} from "../gen/feed/v1/feed_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

// Mock Link from solid-router
vi.mock("@tanstack/solid-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/solid-router")>();
  return {
    ...actual,
    Link: (
      props: { to: string; children: JSX.Element } & JSX.IntrinsicElements["a"],
    ) => (
      <a href={props.to} {...props}>
        {props.children}
      </a>
    ),
  };
});

describe("FeedList Sorting", () => {
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

  it("sorts feeds correctly by title", async () => {
    worker.use(
      http.all("*/feed.v1.FeedService/ListFeeds", () => {
        const msg = create(ListFeedsResponseSchema, {
          feeds: [
            create(ListFeedSchema, {
              id: "1",
              title: "B Feed",
              url: "url1",
              tags: [],
            }),
            create(ListFeedSchema, {
              id: "2",
              title: "A Feed",
              url: "url2",
              tags: [],
            }),
            create(ListFeedSchema, {
              id: "3",
              title: "C Feed",
              url: "url3",
              tags: [],
            }),
          ],
        });
        return HttpResponse.json(toJson(ListFeedsResponseSchema, msg));
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

    const sortSelect = page.getByRole("combobox", { name: /sort by/i });
    await expect.element(sortSelect).toBeInTheDocument();

    // Default sorting should be Title A-Z (implemented in FeedList.tsx as default)
    await expect
      .poll(() => {
        const feedItems = document.querySelectorAll("li");
        return (
          feedItems.length === 3 &&
          feedItems[0].textContent?.includes("A Feed") &&
          feedItems[1].textContent?.includes("B Feed") &&
          feedItems[2].textContent?.includes("C Feed")
        );
      })
      .toBeTruthy();

    // 1. Sort by Title (Z-A)
    await sortSelect.selectOptions("title_desc");

    await expect
      .poll(() => {
        const feedItems = document.querySelectorAll("li");
        return (
          feedItems.length === 3 &&
          feedItems[0].textContent?.includes("C Feed") &&
          feedItems[1].textContent?.includes("B Feed") &&
          feedItems[2].textContent?.includes("A Feed")
        );
      })
      .toBeTruthy();

    // 2. Sort by Title (A-Z)
    await sortSelect.selectOptions("title_asc");

    await expect
      .poll(() => {
        const feedItems = document.querySelectorAll("li");
        return (
          feedItems.length === 3 &&
          feedItems[0].textContent?.includes("A Feed") &&
          feedItems[1].textContent?.includes("B Feed") &&
          feedItems[2].textContent?.includes("C Feed")
        );
      })
      .toBeTruthy();
  });

  it("sorts feeds correctly by last fetched", async () => {
    worker.use(
      http.all("*/feed.v1.FeedService/ListFeeds", () => {
        const msg = create(ListFeedsResponseSchema, {
          feeds: [
            create(ListFeedSchema, {
              id: "1",
              title: "Middle",
              url: "url1",
              lastFetchedAt: "2023-10-01T00:00:00Z",
              tags: [],
            }),
            create(ListFeedSchema, {
              id: "2",
              title: "Oldest",
              url: "url2",
              lastFetchedAt: "2023-01-01T00:00:00Z",
              tags: [],
            }),
            create(ListFeedSchema, {
              id: "3",
              title: "Newest",
              url: "url3",
              lastFetchedAt: "2023-12-31T00:00:00Z",
              tags: [],
            }),
            create(ListFeedSchema, {
              id: "4",
              title: "A Unfetched",
              url: "url4",
              tags: [],
            }),
            create(ListFeedSchema, {
              id: "5",
              title: "Z Unfetched",
              url: "url5",
              tags: [],
            }),
          ],
        });
        return HttpResponse.json(toJson(ListFeedsResponseSchema, msg));
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

    const sortSelect = page.getByRole("combobox", { name: /sort by/i });
    await expect.element(sortSelect).toBeInTheDocument();

    // Select "Last Fetched"
    await sortSelect.selectOptions("last_fetched");

    // Expected order:
    // 1. A Unfetched (undefined)
    // 2. Z Unfetched (undefined) - tied with A, so sort by title
    // 3. Oldest (2023-01-01)
    // 4. Middle (2023-10-01)
    // 5. Newest (2023-12-31)

    await expect
      .poll(() => {
        const feedItems = document.querySelectorAll("li");
        if (feedItems.length !== 5) return false;

        return (
          feedItems[0].textContent?.includes("A Unfetched") &&
          feedItems[1].textContent?.includes("Z Unfetched") &&
          feedItems[2].textContent?.includes("Oldest") &&
          feedItems[3].textContent?.includes("Middle") &&
          feedItems[4].textContent?.includes("Newest")
        );
      })
      .toBeTruthy();
  });
});
