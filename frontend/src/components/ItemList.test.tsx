import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import type { Accessor } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";
import type { Item } from "../lib/db";

// Mock hooks - MUST BE ABOVE ANY IMPORTS THAT USE THEM
vi.mock("../lib/item-query", () => ({
  useItems: vi.fn(),
  useItem: vi.fn(),
  useUpdateItemStatus: vi.fn(),
}));

vi.mock("../lib/db", () => ({
  db: {
    items: {
      preload: vi.fn(),
      isReady: vi.fn().mockReturnValue(true),
    },
    feeds: {
      isReady: vi.fn().mockReturnValue(true),
    },
    getMergedItemsQuery: vi.fn().mockReturnValue(() => []),
    addFeed: vi.fn(),
    updateItemStatus: vi.fn(),
  },
  items: {
    preload: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
  },
  feeds: {
    isReady: vi.fn().mockReturnValue(true),
  },
  unreadItems: {},
  readItems: {},
  getMergedItemsQuery: vi.fn().mockReturnValue(() => []),
  addFeed: vi.fn(),
  updateItemStatus: vi.fn(),
}));

// Mock useLiveQuery from solid-db
vi.mock("@tanstack/solid-db", () => ({
  useLiveQuery: vi.fn(),
  eq: vi.fn(),
  createCollection: vi.fn().mockReturnValue({
    isReady: vi.fn().mockReturnValue(true),
  }),
  createLiveQueryCollection: vi.fn().mockReturnValue({
    isReady: vi.fn().mockReturnValue(true),
  }),
}));

// Now import the functions we want to mock further in tests
import { useItem, useItems, useUpdateItemStatus } from "../lib/item-query";
import { useLiveQuery } from "@tanstack/solid-db";

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

    vi.mocked(useLiveQuery).mockReturnValue(
      (() => mockItems) as unknown as Accessor<Item[]>,
    );

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
});
