import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, describe, it, vi } from "vitest";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";

// Mock db
vi.mock("../lib/db", () => ({
  
  itemsUnreadQuery: vi.fn(() => ({ toArray: [], isReady: vi.fn().mockReturnValue(true) })),
  items: vi.fn(() => ({})),
  updateItemStatus: vi.fn(),
  feedInsert: vi.fn(),
  manageFeedTags: vi.fn(),
  feedTag: {},
  feeds: {},
  tags: {},
  refreshFeeds: vi.fn(),
}));

const navigate = vi.fn();

// Mock useNavigate
vi.mock("@tanstack/solid-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/solid-router")>();
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

describe("ItemDetailRouteView Seamless Navigation", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("fetches next page when Next is clicked at the end of the list", async () => {
    // TODO: Update test to work with item-db instead of item-query hooks
    const history = createMemoryHistory({ initialEntries: ["/items/item-1"] });
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
  });

  it("automatically navigates to the first item of the new page after fetching", async () => {
    // TODO: Update test to work with item-db instead of item-query hooks
    const history = createMemoryHistory({ initialEntries: ["/items/item-1"] });
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
  });
});
