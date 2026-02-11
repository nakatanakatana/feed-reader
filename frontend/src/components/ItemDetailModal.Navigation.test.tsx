import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { GetItemResponseSchema, ItemSchema } from "../gen/item/v1/item_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { ItemDetailModal } from "./ItemDetailModal";

describe("ItemDetailModal Navigation", () => {
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

  const Wrapper = (props: { children: JSX.Element }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TransportProvider>
  );

  it("should not have Previous and Next buttons", async () => {
    setupMockData("1");
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal
            itemId="1"
            onClose={() => {}}
            prevItemId="0"
            nextItemId="2"
          />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item 1")).toBeInTheDocument();
    await expect.element(page.getByText("← Previous")).not.toBeInTheDocument();
    await expect.element(page.getByText("Next →")).not.toBeInTheDocument();
  });

  it("calls onNext when 'j' key is pressed", async () => {
    setupMockData("1");
    const onNext = vi.fn();
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal
            itemId="1"
            onClose={() => {}}
            nextItemId="2"
            onNext={onNext}
          />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item 1")).toBeInTheDocument();
    await userEvent.keyboard("j");
    expect(onNext).toHaveBeenCalled();
  });

  it("calls onPrev when 'k' key is pressed", async () => {
    setupMockData("2");
    const onPrev = vi.fn();
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal
            itemId="2"
            onClose={() => {}}
            prevItemId="1"
            onPrev={onPrev}
          />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item 2")).toBeInTheDocument();
    await userEvent.keyboard("k");
    expect(onPrev).toHaveBeenCalled();
  });
});
