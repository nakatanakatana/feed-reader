import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";

// Mock hooks
vi.mock("../lib/item-query", () => ({
  useItems: vi.fn(),
  useItem: vi.fn(),
  useUpdateItemStatus: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

import { useItems } from "../lib/item-query";

describe("ItemList Selection", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("toggles item selection", async () => {
    const mockItems = [
      { id: "1", title: "Item 1", url: "http://example.com/1", isRead: false },
      { id: "2", title: "Item 2", url: "http://example.com/2", isRead: false },
    ];

    vi.mocked(useItems).mockReturnValue({
      data: {
        pages: [{ items: mockItems }],
      },
      isLoading: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useItems>);

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

    // Get checkboxes
    const checkboxes = page.getByRole("checkbox");
    // Should have 1 (Show Read) + 1 (Select All) + 2 (Items) = 4 checkboxes
    await expect.element(checkboxes).toHaveLength(4);

    const showRead = page.getByLabelText(/Show Read/i);
    const selectAll = page.getByLabelText(/Select All/i);
    // Item checkboxes don't have labels in ItemRow yet, so we use nth or find them differently
    // Actually, ItemRow has a checkbox. Let's use the ones that are not showRead or selectAll.
    const item1Checkbox = checkboxes.nth(2);
    const item2Checkbox = checkboxes.nth(3);

    // Select Item 1
    await item1Checkbox.click();
    await expect.element(item1Checkbox).toBeChecked();
    await expect.element(selectAll).not.toBeChecked();

    // Select Item 2
    await item2Checkbox.click();
    await expect.element(item2Checkbox).toBeChecked();
    await expect.element(selectAll).toBeChecked();

    // Deselect Item 1
    await item1Checkbox.click();
    await expect.element(item1Checkbox).not.toBeChecked();
    await expect.element(selectAll).not.toBeChecked();
  });

  it("selects all items when 'Select All' is clicked", async () => {
    const mockItems = [
      { id: "1", title: "Item 1", url: "http://example.com/1", isRead: false },
      { id: "2", title: "Item 2", url: "http://example.com/2", isRead: false },
    ];

    vi.mocked(useItems).mockReturnValue({
      data: {
        pages: [{ items: mockItems }],
      },
      isLoading: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useItems>);

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

    const selectAll = page.getByLabelText(/Select All/i);
    const item1Checkbox = page.getByRole("checkbox").nth(2);
    const item2Checkbox = page.getByRole("checkbox").nth(3);

    // Click Select All
    await selectAll.click();
    await expect.element(item1Checkbox).toBeChecked();
    await expect.element(item2Checkbox).toBeChecked();

    // Click Select All again to deselect
    await selectAll.click();
    await expect.element(item1Checkbox).not.toBeChecked();
    await expect.element(item2Checkbox).not.toBeChecked();
  });
});
