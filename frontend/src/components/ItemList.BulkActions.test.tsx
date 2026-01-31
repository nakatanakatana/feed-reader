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
const updateStatusMock = vi.fn().mockResolvedValue({});
vi.mock("../lib/item-query", () => ({
  useItems: vi.fn(),
  useItem: vi.fn(),
  useUpdateItemStatus: () => ({
    mutateAsync: updateStatusMock,
    isPending: false,
  }),
}));

import { useItems } from "../lib/item-query";

describe("ItemList Bulk Actions", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("marks multiple items as read", async () => {
    const mockItems = [
      {
        id: "1",
        title: "Item 1",
        publishedAt: "2026-01-26",
        createdAt: "2026-01-26",
        isRead: false,
      },
      {
        id: "2",
        title: "Item 2",
        publishedAt: "2026-01-26",
        createdAt: "2026-01-26",
        isRead: false,
      },
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

    expect(updateStatusMock).toHaveBeenCalledWith({
      ids: ["1", "2"],
      isRead: true,
    });

    // Selection should be cleared
    await expect.element(selectAll).not.toBeChecked();
  });
});
