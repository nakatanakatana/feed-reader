import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";

// Mock hooks
vi.mock("../lib/item-query", () => ({
  useItems: vi.fn(),
  useItem: vi.fn(),
  useUpdateItemStatus: vi.fn(),
}));

import { useItem, useItems, useUpdateItemStatus } from "../lib/item-query";

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
    const fetchNextPage = vi.fn();

    // Setup itemsQuery mock
    vi.mocked(useItems).mockReturnValue({
      data: {
        pages: [{ items: [{ id: "item-1", title: "Item 1" }] }],
      },
      isLoading: false,
      hasNextPage: true,
      fetchNextPage,
      isFetchingNextPage: false,
      // biome-ignore lint/suspicious/noExplicitAny: Mocking query result
    } as any);

    vi.mocked(useUpdateItemStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      // biome-ignore lint/suspicious/noExplicitAny: Mocking mutation result
    } as any);

    vi.mocked(useItem).mockReturnValue({
      data: { id: "item-1", title: "Item 1" },
      isLoading: false,
      // biome-ignore lint/suspicious/noExplicitAny: Mocking query result
    } as any);

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

    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();

    // The Next button should be enabled because hasNextPage is true,
    // even if there is no next item in the current pages.
    const nextButton = page.getByText("Next →");
    await expect.element(nextButton).toBeInTheDocument();
    await expect.element(nextButton).not.toHaveAttribute("disabled");

    await nextButton.click();

    // Should have triggered fetchNextPage
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it("automatically navigates to the first item of the new page after fetching", async () => {
    const [data, setData] = createSignal({
      pages: [{ items: [{ id: "item-1", title: "Item 1" }] }],
    });

    // Setup itemsQuery mock
    // Initial state: 1 item, hasNextPage: true
    const itemsQueryMock = {
      get data() {
        return data();
      },
      isLoading: false,
      hasNextPage: true,
      fetchNextPage: vi.fn().mockImplementation(() => {
        // Update data to include second page
        setData({
          pages: [
            ...data().pages,
            { items: [{ id: "item-2", title: "Item 2" }] },
          ],
        });
      }),
      isFetchingNextPage: false,
    };

    // biome-ignore lint/suspicious/noExplicitAny: Mocking query result
    vi.mocked(useItems).mockReturnValue(itemsQueryMock as any);

    vi.mocked(useUpdateItemStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      // biome-ignore lint/suspicious/noExplicitAny: Mocking mutation result
    } as any);

    vi.mocked(useItem).mockReturnValue({
      data: { id: "item-1", title: "Item 1" },
      isLoading: false,
      // biome-ignore lint/suspicious/noExplicitAny: Mocking query result
    } as any);

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

    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();

    const nextButton = page.getByText("Next →");
    await nextButton.click();

    // Give some time for the effect to run
    await new Promise((resolve) => setTimeout(resolve, 500));

    // fetchNextPage should be called
    expect(itemsQueryMock.fetchNextPage).toHaveBeenCalled();

    // After fetching, it should navigate to item-2
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ itemId: "item-2" }),
      }),
    );
  });
});
