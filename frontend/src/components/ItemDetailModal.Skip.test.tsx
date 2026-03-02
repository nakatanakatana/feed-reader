import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { GetItemResponseSchema, ItemSchema } from "../gen/item/v1/item_pb";
import { queryClient, transport } from "../lib/query";
import { ToastProvider } from "../lib/toast";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { dispatchTouch, resetTouchIdentifier } from "../test-utils/touch";
import { ItemDetailModal } from "./ItemDetailModal";

describe("ItemDetailModal Skip Navigation", () => {
  let dispose: () => void;

  beforeEach(() => {
    resetTouchIdentifier();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    queryClient.clear();
  });

  const setupMockData = (itemId: string) => {
    worker.use(
      http.all("*/item.v1.ItemService/GetItem", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: itemId,
            title: "Test Item",
            description: "Test Content",
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
        <ToastProvider>{props.children}</ToastProvider>
      </QueryClientProvider>
    </TransportProvider>
  );

  it("calls onSkipNext when 'n' is pressed", async () => {
    setupMockData("test-id");
    const onSkipNext = vi.fn();
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal
            itemId="test-id"
            onClose={() => {}}
            nextItemId="next-id"
            onSkipNext={onSkipNext}
          />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    const dialog = page.getByRole("dialog");
    dialog.element().focus();

    await userEvent.keyboard("n");

    await expect.poll(() => onSkipNext).toHaveBeenCalled();
  });

  it("calls onSkipNext when swiping up beyond threshold", async () => {
    setupMockData("test-id");
    const onSkipNext = vi.fn();
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal
            itemId="test-id"
            onClose={() => {}}
            nextItemId="next-id"
            onSkipNext={onSkipNext}
          />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();
    const container = document.querySelector(
      '[data-testid="swipe-container"]',
    ) as HTMLElement;

    expect(container).not.toBeNull();

    // Swipe up
    const rect = container.getBoundingClientRect();
    const startY = rect.bottom - 10;
    const endY = startY - 300; // Swipe up 300px (more than 20-30% of screen height)
    const x = rect.left + rect.width / 2;

    dispatchTouch(container, "touchstart", x, startY);
    dispatchTouch(container, "touchmove", x, (startY + endY) / 2);
    dispatchTouch(container, "touchmove", x, endY);
    dispatchTouch(container, "touchend", x, endY);

    await expect.poll(() => onSkipNext).toHaveBeenCalled();
  });
});
