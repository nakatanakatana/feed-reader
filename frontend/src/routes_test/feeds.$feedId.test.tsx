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

describe("Feed Detail Page", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  it("should display items on the feed detail page", async () => {
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

    // Wait for items to load
    await expect
      .element(page.getByText("Item 1", { exact: true }))
      .toBeInTheDocument();
  });
});
