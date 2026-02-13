import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { GetItemResponseSchema, ItemSchema } from "../gen/item/v1/item_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { ItemDetailModal } from "./ItemDetailModal";

describe("ItemDetailModal Swipe Integration", () => {
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
            title: "Test Item",
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

  const Wrapper = (props: { children: JSX.Element }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TransportProvider>
  );

  it("applies transform: translateX when swiping on the content", async () => {
    setupMockData("test-id");
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    // The content container should have data-testid="swipe-container" (we'll add this)
    const container = document.querySelector('[data-testid="swipe-container"]') as HTMLElement;
    
    // If it doesn't exist yet, the test will fail here, which is fine for Red phase
    expect(container).not.toBeNull();

    const dispatchTouch = (type: string, x: number, y: number) => {
      const touch = new Touch({
        identifier: Date.now(),
        target: container!,
        clientX: x,
        clientY: y,
      });
      const event = new TouchEvent(type, {
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch],
        bubbles: true,
        cancelable: true,
      });
      container?.dispatchEvent(event);
    };

    dispatchTouch("touchstart", 100, 100);
    dispatchTouch("touchmove", 150, 100);

    expect(container?.style.transform).toContain("translateX(50px)");

    dispatchTouch("touchend", 150, 100);
    expect(container?.style.transform).toContain("translateX(0px)");
  });
});
