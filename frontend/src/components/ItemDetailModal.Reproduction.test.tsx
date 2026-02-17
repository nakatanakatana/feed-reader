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

describe("ItemDetailModal Reproduction - Fix Mark as Unread Button", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const setupMockData = (isRead: boolean) => {
    worker.use(
      http.post("*/item.v1.ItemService/GetItem", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: "1",
            title: "Test Item",
            description: "<p>Test Content</p>",
            isRead: isRead,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
    );
  };

  it("shows 'Mark as Unread' button when the item is already read", async () => {
    setupMockData(true);

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemDetailModal itemId="1" onClose={() => {}} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Wait for content
    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    // The bug: This button should have name "Mark as Unread" when isRead is true
    const fab = page.getByRole("button", { name: /Mark as unread/i });
    await expect.element(fab).toBeInTheDocument();
  });

  it("shows 'Mark as Read' button when the item is unread", async () => {
    setupMockData(false);

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemDetailModal itemId="2" onClose={() => {}} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Wait for content
    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    const fab = page.getByRole("button", { name: /Mark as read/i });
    await expect.element(fab).toBeInTheDocument();
  });

  it("toggles between 'Mark as Read' and 'Mark as Unread' when clicked", async () => {
    setupMockData(false); // Start as unread

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemDetailModal itemId="1" onClose={() => {}} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    const fab = page.getByRole("button", { name: /Mark as read/i });
    await expect.element(fab).toBeInTheDocument();

    await userEvent.click(fab);

    // After click, it should show "Mark as Unread"
    const fabUnread = page.getByRole("button", { name: /Mark as unread/i });
    await expect.element(fabUnread).toBeInTheDocument();
  });
});
