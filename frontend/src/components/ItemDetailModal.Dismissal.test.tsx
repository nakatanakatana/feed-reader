import { QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { ItemDetailModal } from "./ItemDetailModal";
import { http, HttpResponse } from "msw";
import { worker } from "../mocks/browser";
import { create, toJson } from "@bufbuild/protobuf";
import { GetItemResponseSchema, ItemSchema } from "../gen/item/v1/item_pb";

describe("ItemDetailModal Dismissal", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = () => {
    worker.use(
      http.post("*/item.v1.ItemService/GetItem", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: "1",
            title: "Test Item",
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
    );
  };

  it("calls onClose when ESC key is pressed", async () => {
    setupMockData();
    const onClose = vi.fn();
    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemDetailModal itemId="1" onClose={onClose} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", async () => {
    setupMockData();
    const onClose = vi.fn();
    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemDetailModal itemId="1" onClose={onClose} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    const dialog = page.getByRole("dialog");
    const backdrop = (await dialog.element()).parentElement;
    await backdrop?.click();

    expect(onClose).toHaveBeenCalled();
  });
});
