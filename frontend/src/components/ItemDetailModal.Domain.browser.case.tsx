import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
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

describe("ItemDetailModal Domain Display", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  // biome-ignore lint/suspicious/noExplicitAny: test mock data
  const setupMockData = (itemId: string, itemData: any) => {
    worker.use(
      http.all("*/api/v2/items/:id", () => {
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
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{props.children}</ToastProvider>
    </QueryClientProvider>
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
