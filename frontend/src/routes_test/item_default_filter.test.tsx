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
});
