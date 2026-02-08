import { QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { ItemDetailModal } from "./ItemDetailModal";
import { http, HttpResponse } from "msw";
import { worker } from "../mocks/browser";
import { create, toJson } from "@bufbuild/protobuf";
import { GetItemResponseSchema, ItemSchema } from "../gen/item/v1/item_pb";

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
          })
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      })
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

    const nextButton = page.getByRole("button", { name: "Next →" });
    const prevButton = page.getByRole("button", { name: "← Previous" });

    await nextButton.click();
    expect(onNext).toHaveBeenCalled();

    await prevButton.click();
    expect(onPrev).toHaveBeenCalled();
  });
});