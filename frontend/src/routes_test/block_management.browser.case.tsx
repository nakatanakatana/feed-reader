import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { routeTree } from "../routeTree.gen";
import "../styles.css";
import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";

// Unmock solid-router to test active link logic
vi.unmock("@tanstack/solid-router");

describe("Block Management Navigation", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should have navigation links for URL Rules and Block Rules", async () => {
    worker.use(
      http.get("*/api/v2/url-rules", () => HttpResponse.json({ rules: [] })),
      http.get("*/api/v2/block-rules", () => HttpResponse.json({ rules: [] })),
    );

    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      ),
      document.body,
    );

    const urlRulesLink = page.getByRole("link", { name: "URL Rules" });
    const blockRulesLink = page.getByRole("link", { name: "Block Rules" });

    await expect.element(urlRulesLink).toBeInTheDocument();
    await expect.element(blockRulesLink).toBeInTheDocument();

    // Test navigation to URL Rules
    await urlRulesLink.click();
    await expect
      .element(page.getByText("Domain", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Pattern", { exact: true }))
      .toBeInTheDocument();

    // Test navigation to Block Rules
    await blockRulesLink.click();
    await expect
      .element(page.getByText("Value", { exact: true }).first())
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Domain (Optional)", { exact: true }))
      .toBeInTheDocument();
  });
});
