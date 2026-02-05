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

describe("ItemList Show Read Toggle", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders a toggle for show/hide read items", async () => {
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

  it("updates createItems params when toggle is clicked", async () => {
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

    // Get the mocked createItems function
    const { createItems } = await import("../lib/db");

    // Initial call should have showRead=false
    expect(createItems).toHaveBeenCalledWith(
      false,
      expect.any(String),
      undefined,
    );

    await toggle.click();

    // After click, it should call createItems with showRead=true
    expect(createItems).toHaveBeenLastCalledWith(
      true,
      expect.any(String),
      undefined,
    );
  });
});
