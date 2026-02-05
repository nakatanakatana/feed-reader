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
      const result = () => [];
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
  localRead: {
    insert: vi.fn(),
    toArray: [],
  },
  feeds: {
    delete: vi.fn(),
    isReady: true,
    toArray: [],
  },
  addFeed: vi.fn(),
  updateItemStatus: vi.fn(),
  createItemBulkMarkAsReadTx: () => ({
    mutate: vi.fn(),
  }),
  createItems: vi.fn(() => ({
    toArray: [],
    utils: {
      refetch: vi.fn(),
    },
  })),
}));

describe("ItemList Date Filter", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

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

  it("updates createItems filter when date filter is changed", async () => {
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

    // Get the mocked createItems function
    const { createItems } = await import("../lib/db");

    // Initial call should use default date filter (30d is the route default)
    expect(createItems).toHaveBeenCalledWith(
      expect.any(Boolean),
      "30d",
      expect.anything(),
    );

    // Change to "Past 24 Hours"
    await select.selectOptions("24h");

    // The latest call should have 24h as the date filter
    expect(createItems).toHaveBeenLastCalledWith(
      expect.any(Boolean),
      "24h",
      expect.anything(),
    );
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
    expect(history.location.search).toEqual("?since=30d");
  });
});
