import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import {
  GetItemResponseSchema,
  ItemSchema,
  UpdateItemStatusResponseSchema,
} from "../gen/item/v1/item_pb";
import { queryClient, transport } from "../lib/query";
import { ToastProvider } from "../lib/toast";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { ItemDetailModal } from "./ItemDetailModal";

describe("ItemDetailModal Shortcuts", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    queryClient.clear();
  });

  const setupMockData = (itemId: string, isRead = false) => {
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
            isRead: isRead,
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

  it("toggles read status when 'm' is pressed", async () => {
    setupMockData("test-id", false);

    const updateSpy = vi.fn();
    worker.use(
      http.all("*/item.v1.ItemService/UpdateItemStatus", async () => {
        updateSpy();
        const msg = create(UpdateItemStatusResponseSchema, {});
        return HttpResponse.json(toJson(UpdateItemStatusResponseSchema, msg));
      }),
    );

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    // Focus the modal to ensure keyboard events are captured
    const dialog = page.getByRole("dialog");
    await expect.element(dialog).toBeInTheDocument();
    dialog.element().focus();

    const fab = page.getByRole("button", { name: "Mark as Read" });
    await expect.element(fab).toBeInTheDocument();

    // Press 'm'
    await userEvent.keyboard("m");

    // Verify toggle was called
    await expect.poll(() => updateSpy).toHaveBeenCalled();

    // Verify UI updated
    await expect
      .element(page.getByRole("button", { name: "Mark as Unread" }))
      .toBeInTheDocument();
  });

  it("toggles read status when 'M' is pressed", async () => {
    setupMockData("test-id", false);

    const updateSpy = vi.fn();
    worker.use(
      http.all("*/item.v1.ItemService/UpdateItemStatus", async () => {
        updateSpy();
        const msg = create(UpdateItemStatusResponseSchema, {});
        return HttpResponse.json(toJson(UpdateItemStatusResponseSchema, msg));
      }),
    );

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    // Focus the modal to ensure keyboard events are captured
    const dialog = page.getByRole("dialog");
    await expect.element(dialog).toBeInTheDocument();
    dialog.element().focus();

    const fab = page.getByRole("button", { name: "Mark as Read" });
    await expect.element(fab).toBeInTheDocument();

    // Press 'M'
    await userEvent.keyboard("M");

    // Verify toggle was called
    await expect.poll(() => updateSpy).toHaveBeenCalled();

    // Verify UI updated
    await expect
      .element(page.getByRole("button", { name: "Mark as Unread" }))
      .toBeInTheDocument();
  });
});
