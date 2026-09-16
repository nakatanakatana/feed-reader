import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
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

describe("ItemDetailModal Dismissal", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = () => {
    worker.use(
      http.all("*/api/v2/items/:id", () => {
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
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ItemDetailModal itemId="1" onClose={onClose} />
          </ToastProvider>
        </QueryClientProvider>
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
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ItemDetailModal itemId="1" onClose={onClose} />
          </ToastProvider>
        </QueryClientProvider>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    const dialog = page.getByRole("dialog");
    await expect.element(dialog).toBeVisible();

    const dialogEl = await dialog.element();
    dialogEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onClose).toHaveBeenCalled();
  });
});
