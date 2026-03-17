import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { GetItemResponseSchema, ItemSchema } from "../gen/item/v1/item_pb";
import { dateToTimestamp } from "../lib/item-utils";
import { queryClient, transport } from "../lib/query";
import { ToastProvider } from "../lib/toast";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { ItemDetailModal } from "./ItemDetailModal";

describe("ItemDetailModal Domain Display", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (itemId: string, itemData: any) => {
    worker.use(
      http.all("*/item.v1.ItemService/GetItem", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            ...itemData,
            id: itemId,
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

  it("displays the extracted domain name in the metadata row", async () => {
    setupMockData("test-item", {
      title: "Test Item",
      url: "https://www.example.com/some/article",
      createdAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
    });

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-item" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    // Verify the domain "example.com" is displayed
    await expect.element(page.getByText("example.com")).toBeInTheDocument();
  });
});
