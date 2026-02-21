import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";
import { worker } from "../mocks/browser";
import { http, HttpResponse } from "msw";

describe("Layout Standardization", () => {
  let dispose: () => void;

  beforeEach(() => {
    queryClient.clear();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    worker.resetHandlers();
  });

  const renderRoute = (path: string) => {
    const history = createMemoryHistory({ initialEntries: [path] });
    const router = createRouter({ routeTree, history });

    return render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );
  };

  const setupMocks = () => {
    worker.use(
      http.all("*/blocking.v1.BlockingService/ListBlockingRules", () => {
        return HttpResponse.json({ rules: [] });
      }),
      http.all("*/blocking.v1.BlockingService/ListURLParsingRules", () => {
        return HttpResponse.json({ rules: [] });
      })
    );
  };

  it("Blocking Rules page uses full width and has scrollable list", async () => {
    setupMocks();
    dispose = renderRoute("/blocking");

    // Wait for the page to render
    await expect.element(page.getByRole("heading", { name: /Existing Blocking Rules/i })).toBeInTheDocument();

    // Check if the main container (PageLayout child) has maxWidth: none (or no maxWidth)
    // Current implementation has maxWidth: "4xl"
    const mainContainer = document.querySelector("body > div > div > div"); // Adjust selector if needed
    if (mainContainer) {
        const style = window.getComputedStyle(mainContainer);
        // Expect NO maxWidth constraint (or very large one)
        // 4xl in Panda might be something like 56rem
        const maxWidth = style.maxWidth;
        console.log("Blocking Rules maxWidth:", maxWidth);
        expect(maxWidth === "none" || maxWidth === "0px" || parseInt(maxWidth) > 1000).toBe(true);
    }

    // Check for a scrollable container
    const scrollable = document.querySelector('[style*="overflow-y: auto"], [class*="ov-y_auto"]');
    expect(scrollable).not.toBeNull();
  });

  it("Parsing Rules page uses full width and has scrollable list", async () => {
    setupMocks();
    dispose = renderRoute("/parsing-rules");

    await expect.element(page.getByRole("heading", { name: /Domain URL Parsing Rules/i })).toBeInTheDocument();

    const mainContainer = document.querySelector("body > div > div > div");
    if (mainContainer) {
        const style = window.getComputedStyle(mainContainer);
        const maxWidth = style.maxWidth;
        console.log("Parsing Rules maxWidth:", maxWidth);
        expect(maxWidth === "none" || maxWidth === "0px" || parseInt(maxWidth) > 1000).toBe(true);
    }

    const scrollable = document.querySelector('[style*="overflow-y: auto"], [class*="ov-y_auto"]');
    expect(scrollable).not.toBeNull();
  });
});
