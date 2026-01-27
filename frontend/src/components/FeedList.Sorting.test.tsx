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

// Mock useTags
vi.mock("../lib/tag-query", () => ({
  useTags: vi.fn(),
  useCreateTag: vi.fn(),
  useDeleteTag: vi.fn(),
  tagKeys: { all: ["tags"] },
}));

describe("FeedList Sorting", () => {
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

  it("sorts feeds correctly by title and date", async () => {
    const mockFeeds = [
      {
        id: "1",
        title: "B Feed",
        url: "url1",
        createdAt: "2026-01-20T10:00:00Z",
        lastFetchedAt: "2026-01-21T10:00:00Z",
        tags: [],
      },
      {
        id: "2",
        title: "A Feed",
        url: "url2",
        createdAt: "2026-01-25T10:00:00Z",
        lastFetchedAt: "2026-01-22T10:00:00Z",
        tags: [],
      },
      {
        id: "3",
        title: "C Feed",
        url: "url3",
        createdAt: "2026-01-22T10:00:00Z",
        lastFetchedAt: "2026-01-20T10:00:00Z",
        tags: [],
      },
    ];

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

    vi.mocked(useTags).mockReturnValue({
      data: { tags: [] },
      // biome-ignore lint/suspicious/noExplicitAny: Test mock for simplicity
    } as any);

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

    // Default sorting (should be Title A-Z if implemented as default, or unsorted)
    // Let's assume we implement Title A-Z as default.

    const sortSelect = page.getByRole("combobox", { name: /sort by/i });
    await expect.element(sortSelect).toBeInTheDocument();

    // 1. Sort by Title (Z-A)
    await sortSelect.selectOptions("title_desc");

    let feedItems = document.querySelectorAll("li");
    expect(feedItems[0].textContent).toContain("C Feed");
    expect(feedItems[1].textContent).toContain("B Feed");
    expect(feedItems[2].textContent).toContain("A Feed");

    // 2. Sort by Date Added (Newest first)
    await sortSelect.selectOptions("created_at_desc");
    feedItems = document.querySelectorAll("li");
    expect(feedItems[0].textContent).toContain("A Feed"); // Jan 25
    expect(feedItems[1].textContent).toContain("C Feed"); // Jan 22
    expect(feedItems[2].textContent).toContain("B Feed"); // Jan 20

    // 3. Sort by Last Fetched (Newest first)
    await sortSelect.selectOptions("last_fetched_at_desc");
    feedItems = document.querySelectorAll("li");
    expect(feedItems[0].textContent).toContain("A Feed"); // Jan 22
    expect(feedItems[1].textContent).toContain("B Feed"); // Jan 21
    expect(feedItems[2].textContent).toContain("C Feed"); // Jan 20
  });
});
