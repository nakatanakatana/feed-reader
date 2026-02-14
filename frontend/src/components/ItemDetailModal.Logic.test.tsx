import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { GetItemResponseSchema, ItemSchema } from "../gen/item/v1/item_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { ItemDetailModal } from "./ItemDetailModal";

describe("ItemDetailModal Navigation Logic", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (itemId: string) => {
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
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
    );
  };

  it("calls onNext and onPrev correctly from props", async () => {
    setupMockData("2");
    const onNext = vi.fn();
    const onPrev = vi.fn();

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemDetailModal
              itemId="2"
              onClose={() => {}}
              prevItemId="1"
              nextItemId="3"
              onPrev={onPrev}
              onNext={onNext}
            />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Wait for content
    await expect.element(page.getByText("Test Item 2")).toBeInTheDocument();

    await userEvent.keyboard("j");
    expect(onNext).toHaveBeenCalled();

    await userEvent.keyboard("k");
    expect(onPrev).toHaveBeenCalled();
  });

  it("renders 'Mark as read' as a Floating Action Button (FAB)", async () => {
    let _updateCalled = false;
    worker.use(
      http.post("*/item.v1.ItemService/GetItem", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: "10",
            title: "Test Item 10",
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
      http.post("*/item.v1.ItemService/UpdateItemStatus", () => {
        _updateCalled = true;
        return HttpResponse.json({});
      }),
    );

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemDetailModal itemId="10" onClose={() => {}} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Wait for content
    const title = page.getByText("Test Item 10");
    await expect.element(title).toBeInTheDocument();

    const fab = page.getByRole("button", { name: /Mark as read/i });
    await expect.element(fab).toBeInTheDocument();

    const fabContainer = fab.element().parentElement;
    expect(fabContainer).not.toBeNull();

    if (fabContainer) {
      const style = window.getComputedStyle(fabContainer);
      expect(["fixed", "absolute"]).toContain(style.position);
      expect(style.bottom).not.toBe("auto");
      expect(style.right).not.toBe("auto");
    }
  });
});
