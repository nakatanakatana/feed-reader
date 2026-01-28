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
      return <div data-testid="search-params">{JSON.stringify(search())}</div>;
    },
  };
});

describe("Item Search Params", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should validate and include publishedSince in search parameters", async () => {
    const transport = createConnectTransport({
      baseUrl: "http://localhost:3000",
    });

    const history = createMemoryHistory({
      initialEntries: ["/?publishedSince=30d"],
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

    // Wait for the component to render
    const searchParamsEl = page.getByTestId("search-params");
    await expect.element(searchParamsEl).toBeInTheDocument();

    // Check if publishedSince is in the search params
    // It should be present in the JSON output
    await expect
      .element(searchParamsEl)
      .toHaveTextContent(/"publishedSince":"30d"/);
  });
});
