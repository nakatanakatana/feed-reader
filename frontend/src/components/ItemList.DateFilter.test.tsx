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
  type FetchItemsParams,
  useItem,
  useItems,
  useUpdateItemStatus,
} from "../lib/item-query";

describe("ItemList Date Filter", () => {
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

  it("renders the date filter selector", async () => {
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

    const dateFilter = page.getByText(/Date:/i);
    await expect.element(dateFilter).toBeInTheDocument();
  });

  it("updates useItems filter when date filter is changed", async () => {
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

    const select = page.getByRole("combobox");
    await expect.element(select).toBeInTheDocument();

    // Initial call should have publishedSince: undefined
    const firstCallParams = vi.mocked(useItems).mock.calls[0][0] as () => Omit<
      FetchItemsParams,
      "limit" | "offset"
    >;
    expect(firstCallParams().publishedSince).toBeDefined();

    // Change to "Past 24 Hours"
    await select.selectOptions("24h");

    // The latest call should have a publishedSince timestamp
    const latestCallGetter = vi.mocked(useItems).mock.calls[
      vi.mocked(useItems).mock.calls.length - 1
    ][0] as () => Omit<FetchItemsParams, "limit" | "offset">;
    const params = latestCallGetter();

    expect(params.publishedSince).toBeDefined();
    // We can check if it's approximately 24 hours ago
    const since = params.publishedSince;
    if (!since) throw new Error("publishedSince should be defined");

    const sinceDate = new Date(Number(since.seconds) * 1000);
    const now = new Date();
    const diffHours = (now.getTime() - sinceDate.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(23.9);
    expect(diffHours).toBeLessThan(24.1);
  });

  it("updates URL search params when date filter is changed", async () => {
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

    const select = page.getByRole("combobox");
    await select.selectOptions("30d");

    // Check if URL is updated
    // Note: createMemoryHistory location.search is an object in TanStack Router v1
    expect(history.location.search).toEqual("?publishedSince=30d");
  });
});
