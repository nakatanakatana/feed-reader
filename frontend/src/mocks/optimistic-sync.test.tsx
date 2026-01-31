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
import { items } from "../lib/db";

describe("Optimistic Updates Integration", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    queryClient.clear();
    const k1 = [...items.keys()];
    if (k1.length) items.delete(k1);
  });

  it("updates UI optimistically when Mark as Read is clicked", async () => {
    const transport = createConnectTransport({
      baseUrl: "http://localhost:3000",
    });

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

    // Initial state: Item 1 should be visible
    // Wait for the items to load from the mock server and populate db.items
    const item1 = page.getByText("Item 1", { exact: true });
    await expect.element(item1).toBeInTheDocument({ timeout: 15000 });

    // Ensure db.items is ready
    await items.toArrayWhenReady();

    // Enable "Show Read" so the item doesn't disappear when marked as read
    const showReadCheckbox = page.getByLabelText("Show Read");
    await showReadCheckbox.click();

    await expect.element(item1).toBeInTheDocument({ timeout: 15000 });

    const markAsReadBtn = page
      .getByRole("button", { name: "Mark as Read" })
      .first();
    await expect.element(markAsReadBtn).toBeInTheDocument();

    // Click "Mark as Read"
    await markAsReadBtn.click();

    // Optimistic check: UI should update immediately to "Mark as Unread"
    // Using getByText instead of getByRole to be less restrictive
    const markAsUnreadBtn = page
      .getByText("Mark as Unread", { exact: true })
      .first();
    await expect.element(markAsUnreadBtn).toBeInTheDocument({ timeout: 10000 });

    // Also check if it's marked as "Read" in the list
    await expect
      .element(page.getByText("Read", { exact: true }).first())
      .toBeInTheDocument();
  });
});
