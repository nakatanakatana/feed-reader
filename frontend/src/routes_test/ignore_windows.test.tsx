import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import { render } from "@solidjs/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { routeTree } from "../routeTree.gen";
import "../styles.css";
import { QueryClientProvider } from "@tanstack/solid-query";
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";

vi.unmock("@tanstack/solid-router");

describe("Ignore Windows Page", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("displays LoadingState while ignore windows are fetching and avoids premature empty state", async () => {
    let resolveWindowsPromise: () => void;
    const windowsPromise = new Promise<void>((resolve) => {
      resolveWindowsPromise = resolve;
    });

    worker.use(
      http.get("*/api/v2/ignore-windows", async () => {
        await windowsPromise;
        return HttpResponse.json({
          ignoreWindows: [
            {
              id: "win-1",
              name: "Night Window",
              startTime: "22:00",
              endTime: "06:00",
              daysOfWeek: [1, 2, 3, 4, 5],
              timezone: "UTC",
            },
          ],
        });
      }),
    );

    const history = createMemoryHistory({
      initialEntries: ["/ignore-windows"],
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

    // Add button is mounted immediately
    await expect
      .element(page.getByRole("button", { name: "Add Ignore Window" }))
      .toBeInTheDocument();

    // LoadingState is rendered
    await expect
      .element(page.getByText("Loading ignore windows..."))
      .toBeInTheDocument();

    // Premature empty state is not visible
    await expect
      .element(page.getByText("No ignore windows configured."))
      .not.toBeInTheDocument();

    // Resolve query
    resolveWindowsPromise!();

    // Data is rendered, LoadingState disappears
    await expect.element(page.getByText("Night Window")).toBeInTheDocument();
    await expect
      .element(page.getByText("Loading ignore windows..."))
      .not.toBeInTheDocument();
  });
});
