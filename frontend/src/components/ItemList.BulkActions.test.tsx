import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { ItemList } from "./ItemList";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { TransportProvider } from "../lib/transport-context";
import { createConnectTransport } from "@connectrpc/connect-web";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/solid-router";
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
      { id: "1", title: "Item 1", url: "http://example.com/1", isRead: false },
      { id: "2", title: "Item 2", url: "http://example.com/2", isRead: false },
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

    const selectAll = page.getByRole("checkbox").nth(0);
    await selectAll.click();

    const bulkMarkBtn = page.getByText("Mark as Read").first();
    // There are individual "Mark as Read" buttons too, the bulk one is in the blue bar.
    // The bulk one is usually first in the DOM because it's sticky at the top.
    await bulkMarkBtn.click();

    expect(updateStatusMock).toHaveBeenCalledWith({
      ids: ["1", "2"],
      isRead: true,
    });

    // Selection should be cleared
    await expect.element(selectAll).not.toBeChecked();
  });
});
