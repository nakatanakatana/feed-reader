import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { ItemList } from "./ItemList";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { TransportProvider } from "../lib/transport-context";
import { createConnectTransport } from "@connectrpc/connect-web";

// Mock hooks
vi.mock("../lib/item-query", () => ({
  useItems: vi.fn(),
  useItem: vi.fn(),
  useUpdateItemStatus: vi.fn(),
}));

import { useItems, useItem, useUpdateItemStatus } from "../lib/item-query";

describe("ItemList", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders a list of items and opens modal on click", async () => {
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

    vi.mocked(useItem).mockReturnValue({
      data: mockItems[0],
      isLoading: false,
    } as unknown as ReturnType<typeof useItem>);

    vi.mocked(useUpdateItemStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateItemStatus>);

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemList />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    const item = page.getByText("Item 1");
    await expect.element(item).toBeInTheDocument();

    await item.click();

    // Check if modal content is visible (ItemDetailModal uses a dialog role now)
    await expect.element(page.getByRole("dialog")).toBeInTheDocument();
    await expect
      .element(page.getByText("Open original article ↗"))
      .toBeInTheDocument();
  });
});
