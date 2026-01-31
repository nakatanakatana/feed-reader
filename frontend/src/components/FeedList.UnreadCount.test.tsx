import { useLiveQuery } from "@tanstack/solid-db";
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
import { useTags } from "../lib/tag-query";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";

// Mock the db module
vi.mock("../lib/db", () => ({
  feeds: {
    delete: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
  },
  items: {
    isReady: vi.fn().mockReturnValue(true),
  },
  addFeed: vi.fn(),
  updateItemStatus: vi.fn(),
}));

// Mock useLiveQuery
vi.mock("@tanstack/solid-db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/solid-db")>();
  return {
    ...actual,
    useLiveQuery: vi.fn(),
  };
});

// Mock useTags
vi.mock("../lib/tag-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/tag-query")>();
  return {
    ...actual,
    useTags: vi.fn(),
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

  beforeEach(() => {
    vi.mocked(useTags).mockReturnValue({
      data: { tags: [], totalUnreadCount: 0n },
      isLoading: false,
    } as unknown as ReturnType<typeof useTags>);
  });

  it("displays unread count for each feed", async () => {
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

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

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

  it("displays total unread count in filter select", async () => {
    vi.mocked(useTags).mockReturnValue({
      data: { tags: [], totalUnreadCount: 8n },
      isLoading: false,
    } as unknown as ReturnType<typeof useTags>);
    const mockFeeds = [
      { id: "1", unreadCount: 5n, tags: [] },
      { id: "2", unreadCount: 3n, tags: [] },
    ];

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

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

  it("displays unread counts for tags in filter bar", async () => {
    vi.mocked(useLiveQuery).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useLiveQuery>);

    vi.mocked(useTags).mockReturnValue({
      data: {
        tags: [
          { id: "t1", name: "Tech", unreadCount: 5n },
          { id: "t2", name: "News", unreadCount: 0n },
        ],
        totalUnreadCount: 5n,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useTags>);

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

  it("formats unread counts of 1000 or more as '999+'", async () => {
    vi.mocked(useLiveQuery).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useLiveQuery>);

    vi.mocked(useTags).mockReturnValue({
      data: {
        tags: [{ id: "t1", name: "HighCount", unreadCount: 1500n }],
        totalUnreadCount: 1500n,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useTags>);

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
