import { useLiveQuery } from "@tanstack/solid-db";
import { QueryClientProvider } from "@tanstack/solid-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/solid-router";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
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

    // Total should be 8
    // Assuming the header says "Your Feeds (8 unread)" or similar, or just a badge.
    // I'll look for the number 8 in the document for now, specifically near the header.
    // Or I can be more specific if I define where it should be.
    // The spec says: "Display the total unread count (across all feeds) in the header or sidebar."
    
    // Let's search for text containing "Total Unread: 8" or just "8" in a badge context.
    // For the failing test, I'll expect a specific element or text.
    // Let's go with "All (8)" or similar on the "All" filter, or a separate indicator.
    // The spec says "sidebar/header". "Your Feeds" is the header.
    
    // I'll expect "Total Unread: 8" for clarity in the test, then implement it.
    await expect.element(page.getByText(/Total Unread: 8/)).toBeInTheDocument();
  });
});
