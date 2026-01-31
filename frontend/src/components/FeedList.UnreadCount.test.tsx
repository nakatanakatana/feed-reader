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
});
