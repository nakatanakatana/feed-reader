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
  getMergedItemsQuery: vi.fn(),
}));

vi.mock("../lib/tag-query", () => ({
  useTags: vi.fn().mockReturnValue({ data: { tags: [] }, isLoading: false }),
  useCreateTag: vi.fn(),
  useDeleteTag: vi.fn(),
}));

// Mock useLiveQuery from solid-db
vi.mock("@tanstack/solid-db", () => ({
  useLiveQuery: vi.fn(),
  createCollection: vi.fn(),
  createLiveQueryCollection: vi.fn(),
  eq: vi.fn(),
}));

import { useItems, useUpdateItemStatus } from "../lib/item-query";
import { useLiveQuery } from "@tanstack/solid-db";

describe("ItemList Incremental", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders a 'Load More' button at the top of the list", async () => {
    const mockItems = [
      { id: "1", title: "Item 1", url: "http://example.com/1", isRead: false, createdAt: "2026-01-01" },
    ];

    vi.mocked(useItems).mockReturnValue({
      data: {
        pages: [{ items: mockItems }],
      },
      isLoading: false,
      hasNextPage: true,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    } as any);

    // Mock LiveQuery for the merged view
    vi.mocked(useLiveQuery).mockReturnValue((() => mockItems) as any);

    vi.mocked(useUpdateItemStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

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

    const loadMoreBtn = page.getByRole("button", { name: /Load More/i });
    await expect.element(loadMoreBtn).toBeInTheDocument();
  });
});