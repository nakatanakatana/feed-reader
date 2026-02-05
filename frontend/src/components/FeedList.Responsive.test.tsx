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
import "../styles.css";
import { setupLiveQuery } from "../test-utils/live-query";

// Mock the db module
vi.mock("../lib/db", () => ({
  feeds: {
    delete: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
    toArray: vi.fn().mockReturnValue([]),
  },
  tags: {
    toArray: vi.fn().mockReturnValue([]),
  },
  localRead: {
    insert: vi.fn(),
    toArray: vi.fn().mockReturnValue([]),
  },
  addFeed: vi.fn(),
  updateItemStatus: vi.fn(),
  createItems: vi.fn(() => ({ toArray: [], utils: { refetch: vi.fn() } })),
  createItemBulkMarkAsReadTx: () => ({ mutate: vi.fn() }),
}));

// Mock useLiveQuery
vi.mock("@tanstack/solid-db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/solid-db")>();
  return {
    ...actual,
    useLiveQuery: vi.fn(),
  };
});

vi.mock("../lib/tag-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/tag-query")>();
  return {
    ...actual,
    useTags: vi.fn(),
  };
});

// Mock Link from solid-router
vi.mock("@tanstack/solid-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/solid-router")>();
  return {
    ...actual,
    // biome-ignore lint/suspicious/noExplicitAny: Mocking external library component
    Link: (props: any) => (
      <a href={props.to} {...props}>
        {props.children}
      </a>
    ),
  };
});

describe("FeedList Responsive", () => {
  let dispose: () => void;

  beforeEach(() => {
    queryClient.clear();
    vi.mocked(useTags).mockReturnValue({
      data: { tags: [], totalUnreadCount: 0n },
      isLoading: false,
    } as unknown as ReturnType<typeof useTags>);
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

  it("hides action buttons from the header on mobile", async () => {
    // Set a narrow viewport
    await page.viewport?.(375, 667);

    const mockFeeds = [
      {
        id: "1",
        title: "Feed 1",
        url: "http://example.com/1",
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

    // Select a feed to make the "Manage Tags" button appear
    // We'll use the first checkbox
    const checkbox = page.getByRole("checkbox").first();
    await checkbox.click();

    // Check if the header button is hidden via CSS display: none
    const headerContainer = document.querySelector(
      '[data-role="header-manage-tags"]',
    ) as HTMLElement | null;
    if (!headerContainer) {
      throw new Error("Header manage tags container not found");
    }
    const styles = window.getComputedStyle(headerContainer);
    expect(styles.display).toBe("none");
  });

  it("shows a floating action button on mobile when feeds are selected", async () => {
    // Set a narrow viewport
    await page.viewport?.(375, 667);

    const mockFeeds = [
      {
        id: "1",
        title: "Feed 1",
        url: "http://example.com/1",
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

    // Initially, FAB should not be visible (or not have the action)
    // We'll look for a button with a fixed/absolute position

    // Select a feed
    const checkbox = page.getByRole("checkbox").first();
    await checkbox.click();

    // Now a FAB should be visible
    // We expect a button with "Manage Tags" text or similar, but styled as a FAB
    const fab = page.getByRole("button", { name: /Manage Tags/i });
    await expect.element(fab).toBeInTheDocument();

    const fabContainer = fab.element().parentElement?.parentElement;
    if (!fabContainer) throw new Error("FAB container not found");
    const containerStyles = window.getComputedStyle(fabContainer);
    expect(containerStyles.position).toBe("fixed");
    expect(containerStyles.bottom).not.toBe("auto");
    expect(containerStyles.right).not.toBe("auto");
    expect(containerStyles.display).not.toBe("none");
  });

  it("does not show a floating action button on desktop", async () => {
    // Set a wide viewport
    await page.viewport?.(1024, 768);

    const mockFeeds = [
      {
        id: "1",
        title: "Feed 1",
        url: "http://example.com/1",
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

    // Select a feed
    const checkbox = page.getByRole("checkbox").first();
    await checkbox.click();

    // The Manage Tags button should be in the header, not a FAB
    const headerContainer = document.querySelector(
      '[data-role="header-manage-tags"]',
    ) as HTMLElement | null;
    if (!headerContainer) {
      throw new Error("Header manage tags container not found");
    }

    const styles = window.getComputedStyle(headerContainer);
    // On desktop, it should be part of the flow (not fixed) and visible
    expect(styles.position).not.toBe("fixed");
    expect(styles.display).not.toBe("none");
  });
});
