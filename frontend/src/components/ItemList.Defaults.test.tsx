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
  feedTag: {
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

describe("ItemList Defaults", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("calls createItems with default filters: showRead=false, dateFilter=30d", async () => {
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

    // Get the mocked createItems function
    const { createItems } = await import("../lib/db");
    // Check if createItems was called with the correct defaults (30d is the route default)
    expect(createItems).toHaveBeenCalledWith(false, "30d");
  });
});
