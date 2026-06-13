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
import { Route } from "../routes/_items";
import { routeTree } from "../routeTree.gen";

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

  it("should validate and include since in search parameters", async () => {
    const history = createMemoryHistory({
      initialEntries: ["/?since=30d"],
    });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      ),
      document.body,
    );

    // Wait for the component to render
    const searchParamsEl = page.getByTestId("search-params");
    await expect.element(searchParamsEl).toBeInTheDocument();

    // Check if since is in the search params
    // It should be present in the JSON output
    await expect.element(searchParamsEl).toHaveTextContent(/"since":"30d"/);
  });
});
