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
import { useTags } from "../lib/tag-query";
import { routeTree } from "../routeTree.gen";

// Mock the db module
vi.mock("../lib/db", () => ({
  db: {
    feeds: {
      delete: vi.fn(),
      isReady: vi.fn().mockReturnValue(true),
    },
    items: {
      isReady: vi.fn().mockReturnValue(true),
      preload: vi.fn(),
    },
    getMergedItemsQuery: vi.fn().mockReturnValue(() => []),
    addFeed: vi.fn(),
    updateItemStatus: vi.fn(),
  },
  feeds: {
    delete: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
  },
  items: {
    isReady: vi.fn().mockReturnValue(true),
    preload: vi.fn(),
  },
  getMergedItemsQuery: vi.fn().mockReturnValue(() => []),
  addFeed: vi.fn(),
  updateItemStatus: vi.fn(),
}));

// Mock useLiveQuery
vi.mock("@tanstack/solid-db", () => ({
  useLiveQuery: vi.fn(),
  createCollection: vi.fn().mockReturnValue({
    isReady: vi.fn().mockReturnValue(true),
  }),
  createLiveQueryCollection: vi.fn().mockReturnValue({
    isReady: vi.fn().mockReturnValue(true),
  }),
  eq: vi.fn(),
}));

import { useLiveQuery } from "@tanstack/solid-db";

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
        tags: [],
        unreadCount: 5n,
      },
      {
        id: "2",
        title: "Feed 2",
        url: "http://example.com/2",
        tags: [],
        unreadCount: 0n,
      },
      {
        id: "3",
        title: "Feed 3",
        url: "http://example.com/3",
        tags: [],
        unreadCount: 10n,
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

    const feed1Row = page.getByText("Feed 1").element().closest("li");
    expect(feed1Row?.textContent).toContain("5");

    const feed3Row = page.getByText("Feed 3").element().closest("li");
    expect(feed3Row?.textContent).toContain("10");
  });

  it("displays total unread count in header", async () => {
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

    await expect.element(page.getByText(/Total Unread: 8/)).toBeInTheDocument();
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

    // Check All button unread count
    const allButton = page.getByRole("button", { name: /All/ });
    await expect.element(allButton).toBeInTheDocument();
    await expect.element(allButton).toHaveTextContent("5");

    // Check Tech tag unread count
    const techButton = page.getByRole("button", { name: /Tech.*5/ });
    await expect.element(techButton).toBeInTheDocument();

    // Check News tag unread count (should be hidden if 0)
    // Find the one that specifically says "News" without count, and ignore the form one
    const newsTag = page
      .getByRole("button", { name: "News", exact: true })
      .nth(1); // The second one should be in the filter list
    await expect.element(newsTag).toBeInTheDocument();
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

    // Check All button unread count (1500 -> 999+)
    const allButton = page.getByRole("button", { name: /All/ });
    await expect.element(allButton).toHaveTextContent("999+");

    // Check HighCount tag unread count (1500 -> 999+)
    const highCountButton = page.getByRole("button", {
      name: /HighCount.*999\+/,
    });
    await expect.element(highCountButton).toBeInTheDocument();
  });
});
