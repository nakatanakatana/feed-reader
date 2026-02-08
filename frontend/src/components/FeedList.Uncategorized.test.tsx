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
import { ListFeedsResponseSchema, ListFeedSchema, ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";
import { ListTagsResponseSchema, ListTagSchema } from "../gen/tag/v1/tag_pb";

// Mock Link from solid-router
vi.mock("@tanstack/solid-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/solid-router")>();
  return {
    ...actual,
    Link: (props: any) => (
      <a href={props.to} {...props}>
        {props.children}
      </a>
    ),
  };
});

describe("FeedList Tag Filters", () => {
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

  it("keeps feeds visible when tag filters change", async () => {
    worker.use(
      http.post("*/feed.v1.FeedService/ListFeeds", () => {
        const msg = create(ListFeedsResponseSchema, {
          feeds: [
            create(ListFeedSchema, { id: "1", title: "Tagged Feed", url: "url1", tags: [create(ListTagSchema, { id: "t1", name: "Tech" })] }),
            create(ListFeedSchema, { id: "2", title: "Untagged Feed", url: "url2", tags: [] }),
          ]
        });
        return HttpResponse.json(toJson(ListFeedsResponseSchema, msg));
      }),
      http.post("*/tag.v1.TagService/ListTags", () => {
        const msg = create(ListTagsResponseSchema, {
          tags: [
            create(ListTagSchema, { id: "t1", name: "Tech" }),
          ]
        });
        return HttpResponse.json(toJson(ListTagsResponseSchema, msg));
      }),
      http.post("*/feed.v1.FeedService/ListFeedTags", () => {
        const msg = create(ListFeedTagsResponseSchema, {
          feedTags: [
            { feedId: "1", tagId: "t1" },
          ]
        });
        return HttpResponse.json(toJson(ListFeedTagsResponseSchema, msg));
      })
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

    // Initial state: All feeds visible
    await expect.element(page.getByText("Tagged Feed", { exact: true })).toBeInTheDocument();
    await expect.element(page.getByText("Untagged Feed", { exact: true })).toBeInTheDocument();

    // Switch to Untagged filter
    const filterSelect = page.getByRole("combobox", { name: "Filter by tag" });
    await filterSelect.selectOptions("untagged");

    // Expect only untagged feeds
    await expect.element(page.getByText("Untagged Feed", { exact: true })).toBeInTheDocument();
    await expect.element(page.getByText("Tagged Feed", { exact: true })).not.toBeInTheDocument();
  });
});