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
import { useItems, type FetchItemsParams } from "../lib/item-query";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";

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

// Mock LiveQuery for feed
vi.mock("@tanstack/solid-db", () => {
  return {
    useLiveQuery: vi.fn().mockReturnValue({
      data: [{ id: "123", title: "Test Feed" }],
    }),
    eq: vi.fn(),
    createCollection: vi.fn().mockReturnValue({ isReady: vi.fn().mockReturnValue(true) }),
  };
});

describe("Feed Route Defaults", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should default to 'all' (publishedSince: undefined) for feed routes", async () => {
    vi.mocked(useItems).mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      // biome-ignore lint/suspicious/noExplicitAny: Mocking query result
    } as any);

    const history = createMemoryHistory({ initialEntries: ["/feeds/123"] });
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

    // Wait for feed title to appear (mocked as Test Feed)
    await expect.element(page.getByRole("heading", { name: "Test Feed" })).toBeInTheDocument();

    expect(useItems).toHaveBeenCalled();
    const paramsGetter = vi.mocked(useItems).mock.calls[0][0] as () => Omit<
      FetchItemsParams,
      "limit" | "offset"
    >;

    // Check that publishedSince is undefined (which implies 'all')
    const params = paramsGetter();
    expect(params.publishedSince).toBeUndefined();
  });
});
