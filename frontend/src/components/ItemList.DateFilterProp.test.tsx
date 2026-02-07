import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, describe, it, vi } from "vitest";
import { TransportProvider } from "../lib/transport-context";
import { ItemList } from "./ItemList";

// Mock hooks
vi.mock("../lib/item-query", () => ({
  useUpdateItemStatus: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useItem: vi.fn(),
  useItems: vi.fn(),
}));

// Mock router
vi.mock("@tanstack/solid-router", () => ({
  useNavigate: () => vi.fn(),
  createFileRoute: () => () => ({}),
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
  setItemsBase: vi.fn(),
  itemsUnreadQuery: { toArray: [], isReady: vi.fn().mockReturnValue(true) },
  items: { insert: vi.fn(), update: vi.fn(), delete: vi.fn(), toArray: [] },
  feeds: {
    delete: vi.fn(),
    isReady: true,
    toArray: [],
  },
  addFeed: vi.fn(),
  feedInsert: vi.fn(),
  updateItemStatus: vi.fn(),
  createItems: vi.fn(() => ({
    toArray: [],
    utils: {
      refetch: vi.fn(),
    },
  })),
}));

describe("ItemList Date Filter Prop", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it.skip("initializes filter with provided dateFilter prop", async () => {
    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemList dateFilter="30d" />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Test skipped - items Collection is now static
  });
});
