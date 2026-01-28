import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";
import { createConnectTransport } from "@connectrpc/connect-web";
import { ListItemsRequest_SortOrder } from "../gen/item/v1/item_pb";

// Mock hooks
vi.mock("../lib/item-query", () => ({
  useItems: vi.fn(),
  useUpdateItemStatus: vi.fn(),
  useItem: vi.fn(),
}));

vi.mock("../lib/tag-query", () => ({
  useTags: vi.fn().mockReturnValue({ data: { tags: [] } }),
  useCreateTag: vi.fn(),
  useDeleteTag: vi.fn(),
}));

import { useItems } from "../lib/item-query";

describe("ItemList Defaults", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("calls useItems with default filters: isRead=false and sortOrder=ASC", async () => {
    vi.mocked(useItems).mockReturnValue({
      data: { pages: [] },
      isLoading: false,
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

    // Wait for rendering
    await expect.element(page.getByText("All Items")).toBeInTheDocument();

    // Check if useItems was called with the correct defaults
    // Note: ASC is 2 in ListItemsRequest_SortOrder
    expect(useItems).toHaveBeenCalledWith(expect.objectContaining({
      isRead: false,
      sortOrder: 2 
    }));
  });
});
