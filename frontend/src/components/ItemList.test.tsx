import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";

// Mock hooks
vi.mock("../lib/item-query", () => ({
  useItems: vi.fn(),
  useItem: vi.fn(),
  useUpdateItemStatus: vi.fn(),
}));

import { useItem, useItems, useUpdateItemStatus } from "../lib/item-query";
import { useTags } from "../lib/tag-query";

vi.mock("../lib/tag-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/tag-query")>();
  return {
    ...actual,
    useTags: vi.fn(),
  };
});

describe("ItemList", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders a list of items and navigates on click", async () => {
    const mockItems = [
      { id: "1", title: "Item 1", url: "http://example.com/1", isRead: false },
    ];

    vi.mocked(useItems).mockReturnValue({
      data: {
        pages: [{ items: mockItems }],
      },
      isLoading: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useItems>);

    vi.mocked(useTags).mockReturnValue({
      data: { tags: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useTags>);

    vi.mocked(useItem).mockReturnValue({
      data: {
        ...mockItems[0],
        description: "Test description",
        publishedAt: "2026-01-26",
        author: "Author",
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useItem>);

    vi.mocked(useUpdateItemStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateItemStatus>);

    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    const item = page.getByText("Item 1");
    await expect.element(item).toBeInTheDocument();

    await item.click();

    // Check if modal content is visible
    await expect.element(page.getByRole("dialog")).toBeInTheDocument();
    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();
  });

  it("displays unread counts for tags", async () => {
    vi.mocked(useItems).mockReturnValue({
      data: { pages: [{ items: [] }] },
      isLoading: false,
    } as unknown as ReturnType<typeof useItems>);

    vi.mocked(useTags).mockReturnValue({
      data: {
        tags: [
          { id: "tag-1", name: "Tech", unreadCount: 5n },
          { id: "tag-2", name: "News", unreadCount: 0n },
        ],
        totalUnreadCount: 5n,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useTags>);

    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Check All button unread count
    await expect.element(page.getByText("All (5)")).toBeInTheDocument();

    // Check Tech tag unread count
    await expect.element(page.getByText("Tech (5)")).toBeInTheDocument();

    // Check News tag unread count (should be hidden or show 0, spec says hide if 0)
    // Actually, let's check it doesn't have (0) if we want to hide it
    const newsTag = page.getByRole("button", { name: "News" });
    await expect.element(newsTag).toBeInTheDocument();
    await expect.element(page.getByText("News (0)")).not.toBeInTheDocument();
  });
});
