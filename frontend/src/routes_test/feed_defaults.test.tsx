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
import { type FetchItemsParams, useItems } from "../lib/item-query";
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

describe("Item Route Defaults", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should default to recent items for item routes", async () => {
    vi.mocked(useItems).mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      // biome-ignore lint/suspicious/noExplicitAny: Mocking query result
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

    await expect
      .element(page.getByRole("heading", { name: "All Items" }))
      .toBeInTheDocument();

    expect(useItems).toHaveBeenCalled();
    const paramsGetter = vi.mocked(useItems).mock.calls[0][0] as () => Omit<
      FetchItemsParams,
      "limit" | "offset"
    >;

    const params = paramsGetter();
    expect(params.since).toEqual(
      expect.objectContaining({ seconds: expect.any(BigInt) }),
    );
  });
});
