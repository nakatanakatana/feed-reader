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
  itemsUnreadQuery: vi.fn(() => ({
    toArray: [],
    isReady: vi.fn().mockReturnValue(true),
  })),
  items: vi.fn(() => ({
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toArray: [],
  })),
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
  updateItemStatus: vi.fn(),
  createItems: vi.fn(() => ({ toArray: [], utils: { refetch: vi.fn() } })),
  manageFeedTags: vi.fn(),
  refreshFeeds: vi.fn(),
}));

// Mock useLiveQuery
vi.mock("@tanstack/solid-db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/solid-db")>();
  return {
    ...actual,
    useLiveQuery: vi.fn(),
  };
});

// Mock Link from solid-router
vi.mock("@tanstack/solid-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/solid-router")>();
  return {
    ...actual,
    // biome-ignore lint/suspicious/noExplicitAny: Test mock for simplicity
    Link: (props: any) => (
      <a href={props.to} {...props}>
        {props.children}
      </a>
    ),
  };
});

describe("FeedList Tag Filters", () => {
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

  it.skip("keeps feeds visible when tag filters change", async () => {
    // Setup mock return for useLiveQuery
    const mockFeeds = [
      {
        id: "1",
        title: "Tagged Feed",
        url: "http://example.com/1",
        tags: [{ id: "t1", name: "Tech" }],
      },
      {
        id: "2",
        title: "Untagged Feed",
        url: "http://example.com/2",
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

    // Initial state: All feeds visible
    await expect
      .element(page.getByText("Tagged Feed", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Untagged Feed", { exact: true }))
      .toBeInTheDocument();

    // Switch to Untagged filter
    await page
      .getByRole("combobox", { name: "Filter by tag" })
      .selectOptions("untagged");

    // Expect only untagged feeds (query now filters in useLiveQuery)
    await expect
      .element(page.getByText("Untagged Feed", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Tagged Feed", { exact: true }))
      .not.toBeInTheDocument();
  });
});
