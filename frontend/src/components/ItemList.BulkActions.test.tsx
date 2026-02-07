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
  useUpdateItemStatus: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useItem: vi.fn(),
  useItems: vi.fn(),
}));

// Mock tanstack/solid-db
vi.mock("@tanstack/solid-db", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/solid-db")>(
      "@tanstack/solid-db",
    );
  return {
    ...actual,
    useLiveQuery: vi.fn(() => {
      const result = () => [
        {
          id: "1",
          title: "Item 1",
          publishedAt: "2026-01-26",
          createdAt: "2026-01-26",
          isRead: false,
          feedId: "feed1",
        },
        {
          id: "2",
          title: "Item 2",
          publishedAt: "2026-01-26",
          createdAt: "2026-01-26",
          isRead: false,
          feedId: "feed1",
        },
      ];
      (result as { isLoading?: boolean }).isLoading = false;
      return result;
    }),
    eq: actual.eq,
    isUndefined: actual.isUndefined,
  };
});

vi.mock("../lib/db", () => ({
  tags: {
    toArray: [],
  },
  feedTag: {
    toArray: [],
  },
  setItemsBase: vi.fn(),
  itemsUnreadQuery: { toArray: [], isReady: vi.fn().mockReturnValue(true) },
  items: { insert: vi.fn(), update: vi.fn(), delete: vi.fn(), toArray: [] },
  feeds: {
    delete: vi.fn(),
    isReady: true,
    toArray: [],
  },
  addFeed: vi.fn(),
  feedInsert: vi.fn(),
  updateItemStatus: vi.fn(),
  createItems: vi.fn(() => ({
    toArray: [],
    utils: {
      refetch: vi.fn(),
    },
  })),
  manageFeedTags: vi.fn(),
  refreshFeeds: vi.fn(),
}));

describe("ItemList Bulk Actions", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("marks multiple items as read using transaction", async () => {
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

    const selectAll = page.getByLabelText(/Select All/i);
    await selectAll.click();

    // The bulk bar appears when items are selected.
    // It contains a "Mark as Read" button.
    const bulkMarkBtn = page
      .getByRole("button", { name: "Mark as Read" })
      .nth(0);
    await bulkMarkBtn.click();

    // Selection should be cleared
    await expect.element(selectAll).not.toBeChecked();
  });
});
