import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ItemDetailModal } from "../components/ItemDetailModal";
import { GetItemResponseSchema, ItemSchema } from "../gen/item/v1/item_pb";
import { worker } from "../mocks/browser";
import { prefetchItems } from "./item-prefetch";
import { queryClient, transport } from "./query";
import { TransportProvider } from "./transport-context";

describe("Prefetch Verification", () => {
  let dispose: () => void;
  let fetchCount = 0;

  beforeEach(() => {
    fetchCount = 0;
    queryClient.clear();

    // Setup MSW to count GetItem requests
    worker.use(
      http.post("*/item.v1.ItemService/GetItem", () => {
        fetchCount++;
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: "item1",
            title: "Test Item",
            description: "Test Content",
            url: "http://example.com",
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
    );
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  it("does NOT trigger a redundant fetch when using ItemDetailModal after prefetchItems", async () => {
    // 1. Prefetch item1
    await prefetchItems(["item1"]);

    // Should have triggered one fetch
    expect(fetchCount).toBe(1);

    // 2. Render ItemDetailModal for item1
    const [itemId] = createSignal<string | undefined>("item1");

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemDetailModal itemId={itemId()} onClose={() => {}} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Wait for Solid-js and TanStack Query to settle
    await new Promise((resolve) => setTimeout(resolve, 100));

    // fetchCount should STILL be 1 because it should use the cached data
    // thanks to ITEM_STALE_TIME synchronization.
    expect(fetchCount).toBe(1);

    // Just to be sure the component actually rendered
    expect(document.body.innerHTML).toContain("Test Item");
  });
});
