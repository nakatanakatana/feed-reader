import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { ItemList } from "./ItemList";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { TransportProvider } from "../lib/transport-context";
import { createConnectTransport } from "@connectrpc/connect-web";

// Mock useItems
vi.mock("../lib/item-query", () => ({
  useItems: vi.fn(),
}));

import { useItems } from "../lib/item-query";

describe("ItemList", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders a list of items", async () => {
    const mockItems = [
      { id: "1", title: "Item 1", url: "http://example.com/1", isRead: false },
      {
        id: "20",
        title: "Item 20",
        url: "http://example.com/20",
        isRead: true,
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

    await expect
      .element(page.getByText("Item 1", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Item 20", { exact: true }))
      .toBeInTheDocument();
  });
});
