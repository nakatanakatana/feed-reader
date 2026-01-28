import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";
import { Route } from "../routes/_items";

// Mock ItemList to inspect useSearch
vi.mock("../components/ItemList", () => {
  return {
    ItemList: () => {
      const search = Route.useSearch();
      return (
        <div data-testid="search-params">
          {JSON.stringify(search())}
        </div>
      );
    },
  };
});

describe("Item Default Filter", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should default publishedSince to '30d' when missing in search parameters", async () => {
    const transport = createConnectTransport({
      baseUrl: "http://localhost:3000",
    });

    // Navigate to root without params. 
    // This assumes _items layout is active at /. 
    // If not, we might need to check how routes are defined, but assuming item_search.test.tsx worked with /, this should too.
    const history = createMemoryHistory({
      initialEntries: ["/"],
    });
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

    const searchParamsEl = page.getByTestId("search-params");
    await expect.element(searchParamsEl).toBeInTheDocument();

    // Expectation: publishedSince should be "30d" by default
    // Currently it will be missing or undefined
    await expect.element(searchParamsEl).toHaveTextContent(/"publishedSince":"30d"/);
  });

  it("should default publishedSince to 'all' (undefined) when tagId is present", async () => {
    const transport = createConnectTransport({
      baseUrl: "http://localhost:3000",
    });

    const history = createMemoryHistory({
      initialEntries: ["/?tagId=tag-123"],
    });
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

    const searchParamsEl = page.getByTestId("search-params");
    await expect.element(searchParamsEl).toBeInTheDocument();

    // Expectation: publishedSince should be undefined (missing from JSON or explicitly undefined)
    // validation logic currently forces "30d" so this should FAIL
    await expect.element(searchParamsEl).not.toHaveTextContent(/"publishedSince":"30d"/);
  });

  it("should sync UI filter state with browser back/forward navigation", async () => {
    const transport = createConnectTransport({
      baseUrl: "http://localhost:3000",
    });

    const history = createMemoryHistory({
      initialEntries: ["/"],
    });
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

    const searchParamsEl = page.getByTestId("search-params");
    await expect.element(searchParamsEl).toBeInTheDocument();

    // 1. Initial state: 30d
    await expect.element(searchParamsEl).toHaveTextContent(/"publishedSince":"30d"/);

    // 2. Navigate to 7d
    await router.navigate({
      search: (prev) => ({ ...prev, publishedSince: "7d" }),
    });
    await expect.element(searchParamsEl).toHaveTextContent(/"publishedSince":"7d"/);

    // 3. Go back
    history.back();
    await expect.element(searchParamsEl).toHaveTextContent(/"publishedSince":"30d"/);

    // 4. Go forward
    history.forward();
    await expect.element(searchParamsEl).toHaveTextContent(/"publishedSince":"7d"/);
  });
});
