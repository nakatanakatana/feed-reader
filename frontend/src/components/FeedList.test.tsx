import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import type { JSX } from "@solidjs/web";
import { render } from "@solidjs/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { queryClient } from "../lib/query";
import { feedStore } from "../lib/feed-store";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";
import {
  buildFeed,
  buildListFeedsResponse,
} from "../test-utils/openapi-fixtures";

describe("FeedList", () => {
  let dispose: () => void;

  beforeEach(() => {
    localStorage.clear();
    vi.setSystemTime(new Date("2026-03-07T12:00:00Z"));
  });

  afterEach(async () => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.useRealTimers();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  const TestWrapper = (props: { children: JSX.Element }) => (
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  );

  it("displays a list of feeds", async () => {
    await page.viewport?.(1280, 720);
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

    await expect.element(page.getByText("Example Feed 1")).toBeInTheDocument();
    await expect.element(page.getByText("Example Feed 2")).toBeInTheDocument();

    // Snapshot testing with masking for dynamic timestamps
    const html = document.body.innerHTML.replace(
      /Last fetched: [^<]+/g,
      "Last fetched: MASKED_TIMESTAMP",
    );
    expect(html).toMatchSnapshot();
  });

  it("deletes a feed", async () => {
    await page.viewport?.(1280, 720);
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

    await expect.element(page.getByText("Example Feed 1")).toBeInTheDocument();

    const deleteButton = page.getByRole("button", { name: "Delete" }).first();
    await expect.element(deleteButton).toBeVisible();

    await userEvent.click(deleteButton);

    // Force re-fetch since invalidation might be slow in tests
    await queryClient.refetchQueries({ queryKey: ["feeds"] });

    // Wait for the feed to disappear
    await expect
      .poll(async () => {
        const elements = await page.getByText("Example Feed 1").all();
        return elements.length;
      })
      .toBe(0);
  });

  it("supports bulk selection", async () => {
    await page.viewport?.(1280, 720);
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

    const checkboxes = page.getByRole("checkbox");

    await expect.poll(async () => (await checkboxes.all()).length).toBe(3);

    await userEvent.click(checkboxes.nth(1));

    await userEvent.click(checkboxes.nth(2));

    // Bulk action bar should show selected count

    await expect
      .element(page.getByText("2 feeds selected"))
      .toBeInTheDocument();
  });

  it("manages tags for selected feeds", async () => {
    await page.viewport?.(1280, 720);
    vi.useRealTimers();
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

    const checkboxes = page.getByRole("checkbox");
    await expect.poll(async () => (await checkboxes.all()).length).toBe(3);

    // Select first feed (checkbox at index 1, index 0 is select all)
    await userEvent.click(checkboxes.nth(1));

    // Click Manage Tags button
    const manageButton = page.getByRole("button", {
      name: /Manage Tags/i,
    });
    await expect.element(manageButton).toBeInTheDocument();
    await userEvent.click(manageButton);

    // Should show modal

    await expect
      .element(page.getByText("Manage Tags for 1 feeds"))
      .toBeInTheDocument();
  });

  it("displays 'Soon' when nextFetch is in the past", async () => {
    // Override MSW handler to return a feed with a past nextFetchAt
    const pastDate = new Date("2026-03-07T11:55:00Z");
    const futureDate = new Date("2026-03-07T12:05:00Z");

    worker.use(
      http.get("*/api/v2/feeds", () => {
        return HttpResponse.json(
          buildListFeedsResponse([
            buildFeed({
              id: "past-feed",
              url: "https://example.com/past.xml",
              title: "Past Feed",
              nextFetchAt: pastDate.toISOString(),
            }),
            buildFeed({
              id: "future-feed",
              url: "https://example.com/future.xml",
              title: "Future Feed",
              nextFetchAt: futureDate.toISOString(),
            }),
          ]),
        );
      }),
    );

    await page.viewport?.(1280, 720);
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

    // Wait for feeds to render
    await expect.element(page.getByText("Past Feed")).toBeInTheDocument();
    await expect.element(page.getByText("Future Feed")).toBeInTheDocument();

    // The past feed should display "Soon"
    const soonText = page.getByText("Next fetch: Soon");
    await expect.element(soonText).toBeInTheDocument();
    // And only the past feed should display "Soon" (future feed should show a relative time)
    await expect.poll(async () => (await soonText.all()).length).toBe(1);
  });

  it("displays LoadingState while feeds are fetching and does not show premature empty state", async () => {
    let resolveFeedsPromise: () => void;
    const feedsPromise = new Promise<void>((resolve) => {
      resolveFeedsPromise = resolve;
    });

    worker.use(
      http.get("*/api/v2/feeds", async () => {
        await feedsPromise;
        return HttpResponse.json(
          buildListFeedsResponse([
            buildFeed({
              id: "feed-1",
              title: "Tech Radar Feed",
              url: "https://example.com/feed.xml",
            }),
          ]),
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

    // Filter controls are visible immediately
    await expect
      .element(page.getByLabelText("Filter by tag"))
      .toBeInTheDocument();

    // LoadingState spinner is visible
    await expect
      .element(page.getByText("Loading feeds..."))
      .toBeInTheDocument();

    // Premature empty state is NOT visible
    await expect
      .element(page.getByText("No feeds found."))
      .not.toBeInTheDocument();

    // Resolve
    resolveFeedsPromise!();

    // Feed is rendered
    await expect.element(page.getByText("Tech Radar Feed")).toBeInTheDocument();
    await expect
      .element(page.getByText("Loading feeds..."))
      .not.toBeInTheDocument();
  });

  it("keeps AddFeedForm and toolbar visible while tags are fetching", async () => {
    let resolveTagsPromise: () => void;
    const tagsPromise = new Promise<void>((resolve) => {
      resolveTagsPromise = resolve;
    });

    worker.use(
      http.get("*/api/v2/tags", async () => {
        await tagsPromise;
        return HttpResponse.json({ tags: [] });
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

    // AddFeedForm input is visible immediately (not replaced by full page "Loading page...")
    await expect.element(page.getByPlaceholder("Feed URL")).toBeInTheDocument();

    // Tag filter shows loading state while disabled
    const tagSelect = page.getByLabelText("Filter by tag");
    await expect.element(tagSelect).toBeInTheDocument();
    await expect.element(tagSelect).toBeDisabled();

    // Resolve tags
    resolveTagsPromise!();

    await expect.element(tagSelect).not.toBeDisabled();
  });

  it("keeps AddFeedForm and toolbar visible while feed-tags are fetching", async () => {
    let resolveFeedTagsPromise: () => void;
    const feedTagsPromise = new Promise<void>((resolve) => {
      resolveFeedTagsPromise = resolve;
    });

    worker.use(
      http.get("*/api/v2/feed-tags", async () => {
        await feedTagsPromise;
        return HttpResponse.json({ feedTags: [] });
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

    // AddFeedForm input is visible immediately (not replaced by full page "Loading page...")
    await expect.element(page.getByPlaceholder("Feed URL")).toBeInTheDocument();

    // Tag filter is present and disabled while feed-tags are fetching
    const tagSelect = page.getByLabelText("Filter by tag");
    await expect.element(tagSelect).toBeInTheDocument();
    await expect.element(tagSelect).toBeDisabled();

    // Resolve feed-tags
    resolveFeedTagsPromise!();

    await expect.element(tagSelect).not.toBeDisabled();
  });

  it("restores selectedTagId value even when tags or feed-tags resolve asynchronously", async () => {
    let resolveFeedTagsPromise: () => void;
    const feedTagsPromise = new Promise<void>((resolve) => {
      resolveFeedTagsPromise = resolve;
    });

    worker.use(
      http.get("*/api/v2/tags", () => {
        return HttpResponse.json({
          tags: [{ id: "tag-1", name: "News" }],
        });
      }),
      http.get("*/api/v2/feed-tags", async () => {
        await feedTagsPromise;
        return HttpResponse.json({ feedTags: [] });
      }),
    );

    feedStore.setSelectedTagId("tag-1");

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

    const tagSelect = page.getByLabelText("Filter by tag");
    await expect.element(tagSelect).toBeInTheDocument();

    // While feed-tags is loading, tagSelect is disabled
    await expect.element(tagSelect).toBeDisabled();

    // Resolve feed-tags so options are populated
    resolveFeedTagsPromise!();

    await expect.element(tagSelect).not.toBeDisabled();
    // The select element value in DOM should be "tag-1"
    await expect.element(tagSelect).toHaveValue("tag-1");
  });
});
