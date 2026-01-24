import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { queryClient } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";

describe("Feed Page Reproduction", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  it("should display items on a specific feed page", async () => {
    const transport = createConnectTransport({
      baseUrl: "http://localhost:3000",
    });

    const history = createMemoryHistory({ initialEntries: ["/feeds/1"] });
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

    // Expect to see "Item 1" which comes from the mock handler
    // Wait, the mock handler for ListItems returns items without feedId by default (empty string)
    // But ItemList filters by feedId if provided.
    // In our mock, we should probably ensure it returns the correct feedId if we want to test filtering.
    // Actually, let's see what happens.
    await expect
      .element(page.getByText("Item 1", { exact: true }))
      .toBeInTheDocument();
  });
});
