import { QueryClientProvider } from "@tanstack/solid-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";

describe("Navigation Active State", () => {
  it("marks the 'Home' link as active when at root", async () => {
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

    const homeLink = page.getByRole("link", { name: "Home" });
    await expect.element(homeLink).toBeInTheDocument();
    
    // Check for active class or style
    // The activeLinkStyle has color: "blue.700"
    const style = window.getComputedStyle(homeLink.element());
    // Blue 700 is typically rgb(29, 78, 216) or similar
    expect(style.color).not.toBe("rgb(107, 114, 128)"); // gray.500
  });

  it("marks the 'Feeds' link as active when at /feeds", async () => {
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

    const feedsLink = page.getByRole("link", { name: "Feeds" });
    await expect.element(feedsLink).toBeInTheDocument();
    
    const style = window.getComputedStyle(feedsLink.element());
    expect(style.color).not.toBe("rgb(107, 114, 128)"); // gray.500
  });
});
