import { QueryClientProvider } from "@tanstack/solid-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";

describe("Header Refinement", () => {
  it("does not display 'All Items' title on the home page", async () => {
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Should NOT find "All Items" as a heading
    const heading = page.getByRole("heading", { name: "All Items" });
    await expect.element(heading).not.toBeInTheDocument();
  });

  it("does not display 'Feed Management' title on the feeds page", async () => {
    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
    const router = createRouter({ routeTree, history });

    render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Should NOT find "Feed Management" as a heading
    const heading = page.getByRole("heading", { name: "Feed Management" });
    await expect.element(heading).not.toBeInTheDocument();
  });
});
