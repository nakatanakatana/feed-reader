import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";

// Mock hooks
vi.mock("../lib/item-query", () => ({
  useItems: vi.fn(),
  useItem: vi.fn(),
  useUpdateItemStatus: vi.fn(),
}));

import {
  useItems,
  useItem,
  useUpdateItemStatus,
  type FetchItemsParams,
} from "../lib/item-query";

describe("ItemList Show Read Toggle", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  beforeEach(() => {
    vi.mocked(useItems).mockReturnValue({
      data: {
        pages: [{ items: [] }],
      },
      isLoading: false,
      hasNextPage: false,
    } as unknown as ReturnType<typeof useItems>);

    vi.mocked(useItem).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useItem>);

    vi.mocked(useUpdateItemStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateItemStatus>);
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders a toggle for show/hide read items", async () => {
    vi.mocked(useItems).mockReturnValue({
      data: {
        pages: [{ items: [] }],
      },
      isLoading: false,
      hasNextPage: false,
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

    // Expect to find a toggle or checkbox with "Show Read" label
    const toggle = page.getByLabelText(/Show Read/i);
    await expect.element(toggle).toBeInTheDocument();
  });

  it("updates useItems filter when toggle is clicked", async () => {
    vi.mocked(useItems).mockReturnValue({
      data: {
        pages: [{ items: [] }],
      },
      isLoading: false,
      hasNextPage: false,
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

    const toggle = page.getByLabelText(/Show Read/i);
    await expect.element(toggle).toBeInTheDocument();

    // By default it should be false
    expect(useItems).toHaveBeenCalledWith(expect.any(Function));

    // Initial call should have isRead: false
    const firstCallParams = vi.mocked(useItems).mock.calls[0][0] as () => Omit<
      FetchItemsParams,
      "limit" | "offset"
    >;
    expect(firstCallParams()).toEqual(
      expect.objectContaining({
        isRead: false,
      }),
    );

    await toggle.click();

    // After click, it should call useItems again or the getter should return undefined
    // Note: useItems uses a getter, so we check what the getter returns
    const latestParams = vi.mocked(useItems).mock.calls[
      vi.mocked(useItems).mock.calls.length - 1
    ][0] as () => Omit<FetchItemsParams, "limit" | "offset">;
    expect(latestParams()).toEqual(
      expect.objectContaining({
        isRead: undefined,
      }),
    );
  });
});
