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
  useUpdateItemStatus: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useItem: vi.fn(),
  useItems: vi.fn(),
}));

// Mock tanstack/solid-db
vi.mock("@tanstack/solid-db", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/solid-db")>(
      "@tanstack/solid-db",
    );
  return {
    ...actual,
    useLiveQuery: vi.fn(() => {
      const result = () => [
        {
          id: "1",
          title: "Item 1",
          publishedAt: "2026-01-26",
          createdAt: "2026-01-26",
          isRead: false,
          feedId: "feed1",
        },
        {
          id: "2",
          title: "Item 2",
          publishedAt: "2026-01-26",
          createdAt: "2026-01-26",
          isRead: false,
          feedId: "feed1",
        },
      ];
      (result as { isLoading?: boolean }).isLoading = false;
      return result;
    }),
    eq: actual.eq,
    isUndefined: actual.isUndefined,
  };
});

vi.mock("../lib/db", () => ({
  tags: {
    toArray: [],
  },
  localRead: {
    insert: vi.fn(),
    toArray: [],
  },
  feeds: {
    delete: vi.fn(),
    isReady: true,
    toArray: [],
  },
  addFeed: vi.fn(),
  updateItemStatus: vi.fn(),
  createItemBulkMarkAsReadTx: () => ({
    mutate: vi.fn(),
  }),
  createItems: vi.fn(() => ({
    toArray: [],
    utils: {
      refetch: vi.fn(),
    },
  })),
}));

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
