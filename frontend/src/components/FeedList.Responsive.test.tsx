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
import "../styles.css";
import { create, toJson } from "@bufbuild/protobuf";
import { HttpResponse, http } from "msw";
import {
  ListFeedSchema,
  ListFeedsResponseSchema,
  ListFeedTagsResponseSchema,
} from "../gen/feed/v1/feed_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { worker } from "../mocks/browser";

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

describe("FeedList Responsive", () => {
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

  const setupMockData = () => {
    worker.use(
      http.post("*/feed.v1.FeedService/ListFeeds", () => {
        const msg = create(ListFeedsResponseSchema, {
          feeds: [
            create(ListFeedSchema, {
              id: "1",
              title: "Feed 1",
              url: "url1",
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
  };

  it("shows a floating action bar on mobile when feeds are selected", async () => {
    // Set a narrow viewport
    await page.viewport?.(375, 667);

    setupMockData();

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

    // Select a feed
    const checkbox = page.getByRole("checkbox").nth(1);
    await checkbox.click();

    // Now the BulkActionBar should be visible
    const bar = page.getByTestId("bulk-action-bar");
    await expect.element(bar).toBeVisible();

    // Check if it's fixed
    const barElement = (await bar.element()) as HTMLElement;
    const styles = window.getComputedStyle(barElement);
    expect(styles.position).toBe("fixed");
  });

  it("shows BulkActionBar on desktop as well", async () => {
    // Set a wide viewport
    await page.viewport?.(1024, 768);

    setupMockData();

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

    // Select a feed
    const checkbox = page.getByRole("checkbox").nth(1);
    await checkbox.click();

    // The BulkActionBar should be visible on desktop too (unified UI)
    const bar = page.getByTestId("bulk-action-bar");
    await expect.element(bar).toBeVisible();
  });
});
