import { create, toJson } from "@bufbuild/protobuf";
import { useLiveQuery } from "@tanstack/solid-db";
import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import {
  GetItemResponseSchema,
  ItemSchema,
  ListItemSchema,
  ListItemsResponseSchema,
  UpdateItemStatusResponseSchema,
} from "../gen/item/v1/item_pb";
import { items } from "../lib/item-db";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { ItemDetailModal } from "./ItemDetailModal";

function CollectionInitializer() {
  useLiveQuery((q) => q.from({ item: items() }));
  return null;
}

describe("ItemDetailModal FAB Reactivity & Fallback", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  const setupMockData = (itemId: string, isRead: boolean) => {
    worker.use(
      http.post("*/item.v1.ItemService/GetItem", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: itemId,
            title: `Test Item ${itemId}`,
            description: "<p>Test Content</p>",
            publishedAt: "2026-01-24T10:00:00Z",
            createdAt: "2026-01-24T09:00:00Z",
            author: "Test Author",
            url: "http://example.com",
            isRead: isRead,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
      http.post("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: [],
          totalCount: 0,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
    );
  };

  it("verifies: FAB toggles status and calls API even if not in collection (fallback)", async () => {
    const itemId = "test-fallback-1";
    setupMockData(itemId, false);

    // Mock the update API
    let apiCalled = false;
    const _apiValue = false;
    worker.use(
      http.post("*/item.v1.ItemService/UpdateItemStatus", async () => {
        apiCalled = true;
        // Note: In some environments we might want to check the body
        const msg = create(UpdateItemStatusResponseSchema, {});
        return HttpResponse.json(toJson(UpdateItemStatusResponseSchema, msg));
      }),
    );

    const dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemDetailModal itemId={itemId} onClose={() => {}} />
            <CollectionInitializer />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // 1. Initial state: Mark as Read should be visible
    await expect
      .element(page.getByText(`Test Item ${itemId}`))
      .toBeInTheDocument();
    const fab = page.getByRole("button", { name: /Mark as read/i });
    await expect.element(fab).toBeInTheDocument();

    // 2. Click the FAB
    await fab.click();

    // 3. FAB should update to Mark as unread
    await expect
      .element(page.getByRole("button", { name: /Mark as unread/i }))
      .toBeInTheDocument();

    // 4. API should have been called
    await expect.poll(() => apiCalled).toBe(true);

    dispose();
  });

  it("verifies: FAB toggles status and updates UI when item IS in collection", async () => {
    const itemId = "test-in-collection-1";
    setupMockData(itemId, false);

    // Manually add the item to the collection
    items().utils.writeInsert(
      create(ListItemSchema, {
        id: itemId,
        title: "Test Item in Collection",
        isRead: false,
        publishedAt: "2026-01-24T10:00:00Z",
        createdAt: "2026-01-24T09:00:00Z",
        feedId: "feed-1",
      }),
    );

    const dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemDetailModal itemId={itemId} onClose={() => {}} />
            <CollectionInitializer />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // 1. Initial state: Mark as Read should be visible
    await expect
      .element(page.getByText(`Test Item ${itemId}`))
      .toBeInTheDocument();
    const fab = page.getByRole("button", { name: /Mark as read/i });
    await expect.element(fab).toBeInTheDocument();

    // 2. Click the FAB
    await fab.click();

    // 3. FAB should update to Mark as unread
    await expect
      .element(page.getByRole("button", { name: /Mark as unread/i }))
      .toBeInTheDocument();

    dispose();
  });

  it("verifies: FAB shows 'Mark as Unread' initially for a read item", async () => {
    const itemId = "test-read-initial-1";
    setupMockData(itemId, true); // isRead: true

    const dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemDetailModal itemId={itemId} onClose={() => {}} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Initial state: Mark as Unread should be visible
    await expect
      .element(page.getByRole("button", { name: /Mark as unread/i }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: /Mark as unread/i }))
      .toHaveAttribute("aria-pressed", "true");

    dispose();
  });
});
