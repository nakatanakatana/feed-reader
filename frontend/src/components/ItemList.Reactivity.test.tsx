import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { itemStore } from "../lib/item-store";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";

const itemsMock = vi.fn();

vi.mock("../lib/db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../lib/db");
  return {
    ...actual,
    items: () => {
      itemsMock();
      return (actual.items as () => unknown)();
    },
  };
});

describe("ItemList Reactivity", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should re-query items when itemStore parameters change", async () => {
    const history = createMemoryHistory({ initialEntries: ["/"] });
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

    // Wait for initial render
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Initial call check
    const initialCount = itemsMock.mock.calls.length;
    expect(initialCount).toBeGreaterThan(0);

    // Change store state
    itemStore.setShowRead(!itemStore.state.showRead);

    // Wait for potential re-render
    await new Promise((resolve) => setTimeout(resolve, 100));

    // It should have been called again due to reactivity
    expect(itemsMock.mock.calls.length).toBeGreaterThan(initialCount);
  });

  it("should update itemStore when the Show Read toggle is clicked", async () => {
    const history = createMemoryHistory({ initialEntries: ["/"] });
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

    await new Promise((resolve) => setTimeout(resolve, 100));

    const toggle = document.getElementById(
      "show-read-toggle",
    ) as HTMLInputElement;
    expect(toggle).not.toBeNull();

    const initialState = itemStore.state.showRead;
    toggle.click();

    expect(itemStore.state.showRead).toBe(!initialState);
  });
});
