import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";
import { setupLiveQuery } from "../test-utils/live-query";

// Mock the db module
vi.mock("../lib/db", () => ({
  setItemsBase: vi.fn(),
  itemsUnreadQuery: { toArray: [], isReady: vi.fn().mockReturnValue(true) },
  items: { insert: vi.fn(), update: vi.fn(), delete: vi.fn(), toArray: [] },
  feeds: {
    delete: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
    toArray: vi.fn().mockReturnValue([]),
  },
  tags: {
    toArray: vi.fn().mockReturnValue([]),
  },
  feedTag: {
    toArray: [],
  },
  addFeed: vi.fn(),
  feedInsert: vi.fn(),
  manageFeedTags: vi.fn(),
  refreshFeeds: vi.fn(),
  updateItemStatus: vi.fn(),
  createItems: vi.fn(() => ({ toArray: [], utils: { refetch: vi.fn() } })),
}));

// Mock useLiveQuery
vi.mock("@tanstack/solid-db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/solid-db")>();
  return {
    ...actual,
    useLiveQuery: vi.fn(),
  };
});

describe("FeedList Unread Counts", () => {
  let dispose: () => void;

  beforeEach(() => {
    queryClient.clear();
  });

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

  it.skip("displays unread count for each feed", async () => {
    const mockFeeds = [
      {
        id: "1",
        title: "Feed 1",
        url: "http://example.com/1",
        unreadCount: 5n,
        tags: [],
      },
      {
        id: "2",
        title: "Feed 2",
        url: "http://example.com/2",
        unreadCount: 0n,
        tags: [],
      },
      {
        id: "3",
        title: "Feed 3",
        url: "http://example.com/3",
        unreadCount: 10n,
        tags: [],
      },
    ];

    setupLiveQuery(mockFeeds);

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

    // Check for unread counts
    // Feed 1 should have 5
    const feed1Row = page.getByText("Feed 1").element().closest("li");
    expect(feed1Row?.textContent).toContain("5");

    // Feed 2 should have 0 (or not show anything if we decide to hide 0, but spec implies display)
    // Let's assume for now we display it or at least check if we can find it.
    // Actually, usually 0 is hidden or explicitly 0. The spec says "Display the unread count per feed".
    // I'll check for "5" and "10". "0" might be hidden or shown.

    const feed3Row = page.getByText("Feed 3").element().closest("li");
    expect(feed3Row?.textContent).toContain("10");
  });

  it.skip("displays total unread count in filter select", async () => {
    const mockFeeds = [
      { id: "1", unreadCount: 5n, tags: [] },
      { id: "2", unreadCount: 3n, tags: [] },
    ];

    setupLiveQuery(mockFeeds);

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
    await page
      .getByRole("combobox", { name: "Filter by tag" })
      .selectOptions("all");
    const filterOption = filterSelect.element() as HTMLSelectElement;
    const selectedText =
      filterOption.options[filterOption.selectedIndex]?.textContent ?? "";
    expect(selectedText).toContain("All (8)");
  });

  it.skip("displays unread counts for tags in filter bar", async () => {
    setupLiveQuery([]);

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

    // Check All filter unread count
    const filterSelect = page.getByRole("combobox", { name: "Filter by tag" });
    await expect.element(filterSelect).toBeInTheDocument();
    await expect.element(filterSelect).toHaveTextContent("All (5)");

    // Check Tech tag unread count
    await expect.element(filterSelect).toHaveTextContent("Tech (5)");

    // Check News tag unread count (should be hidden if 0)
    // Find the one that specifically says "News" without count, and ignore the form one
    await expect.element(filterSelect).toHaveTextContent("News");
    await expect.element(page.getByText("News (0)")).not.toBeInTheDocument();
  });

  it.skip("formats unread counts of 1000 or more as '999+'", async () => {
    setupLiveQuery([]);

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

    // Check All filter unread count (1500 -> 999+)
    const filterSelect = page.getByRole("combobox", { name: "Filter by tag" });
    await expect.element(filterSelect).toHaveTextContent("All (999+)");
    await expect.element(filterSelect).toHaveTextContent("HighCount (999+)");
  });
});
