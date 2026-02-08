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
  ListFeedTagsResponseSchema,
} from "../gen/feed/v1/feed_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";

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
      http.post("*/feed.v1.FeedService/ListFeeds", () => {
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
});
