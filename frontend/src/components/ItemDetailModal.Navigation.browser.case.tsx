import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { dateToTimestamp } from "../lib/item-utils";
import { queryClient } from "../lib/query";
import { ToastProvider } from "../lib/toast";
import { worker } from "../mocks/browser";
import {
  create,
  GetItemResponseSchema,
  ItemSchema,
  toJson,
} from "../test-utils/json-identity";
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
      http.all("*/api/v2/items/:id", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: itemId,
            title: `Test Item ${itemId}`,
            description: "<p>Test Content</p>",
            publishedAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
            createdAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
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
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{props.children}</ToastProvider>
    </QueryClientProvider>
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

  it("keeps dialog in modal mode after navigating to next item", async () => {
    setupMockData("1");
    const [itemId, setItemId] = createSignal("1");

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal
            itemId={itemId()}
            onClose={() => {}}
            nextItemId="2"
            onNext={() => {
              setupMockData("2");
              setItemId("2");
            }}
          />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item 1")).toBeInTheDocument();
    expect(document.querySelector("dialog:modal")).toBeTruthy();

    await userEvent.keyboard("j");
    await expect.element(page.getByText("Test Item 2")).toBeInTheDocument();
    expect(document.querySelector("dialog:modal")).toBeTruthy();
  });
});
