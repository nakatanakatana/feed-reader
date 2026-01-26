import { render } from "solid-js/web";
import type { JSX } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { ItemDetailRouteView } from "./ItemDetailRouteView";
import { TransportProvider } from "../lib/transport-context";
import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/solid-router";
import { routeTree } from "../routeTree.gen";

// Mock the query hooks
const markAsReadMock = vi.fn();
vi.mock("../lib/item-query", () => ({
  useItems: () => ({
    data: {
      pages: [
        {
          items: [
            { id: "1", title: "Item 1", isRead: false },
            { id: "2", title: "Item 2", isRead: false },
          ],
        },
      ],
    },
    isLoading: false,
  }),
  useItem: (id: () => string | undefined) => ({
    get data() {
      const itemId = id();
      if (!itemId) return undefined;
      return {
        id: itemId,
        title: "Test Item " + itemId,
        description: "<p>Test Content</p>",
        publishedAt: "2026-01-24",
        author: "Test Author",
        url: "http://example.com",
        isRead: false,
      };
    },
    get isLoading() {
      return false;
    },
  }),
  useUpdateItemStatus: () => ({
    mutate: markAsReadMock,
    isPending: false,
  }),
}));

describe("ItemDetailRouteView Auto-Read", () => {
  const queryClient = new QueryClient();
  const transport = createConnectTransport({
    baseUrl: "http://localhost:8080",
  });
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const Wrapper = (props: { children: JSX.Element, initialEntries: string[] }) => {
    const history = createMemoryHistory({ initialEntries: props.initialEntries });
    const router = createRouter({ routeTree, history });
    return (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router}>
                {props.children}
            </RouterProvider>
          </QueryClientProvider>
        </TransportProvider>
    );
  };

  it("marks current item as read when navigating to next", async () => {
    dispose = render(
      () => (
        <Wrapper initialEntries={["/items/1"]}>
          <ItemDetailRouteView itemId="1" basePath="" />
        </Wrapper>
      ),
      document.body,
    );

    const nextButton = page.getByText("Next →");
    await nextButton.click();
    
    expect(markAsReadMock).toHaveBeenCalledWith({
        ids: ["1"],
        isRead: true,
    });
  });

  it("marks current item as read when navigating to prev", async () => {
    dispose = render(
      () => (
        <Wrapper initialEntries={["/items/2"]}>
          <ItemDetailRouteView itemId="2" basePath="" />
        </Wrapper>
      ),
      document.body,
    );

    const prevButton = page.getByText("← Previous");
    await prevButton.click();
    
    expect(markAsReadMock).toHaveBeenCalledWith({
        ids: ["2"],
        isRead: true,
    });
  });
});