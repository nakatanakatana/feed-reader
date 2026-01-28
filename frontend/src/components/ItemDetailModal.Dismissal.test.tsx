import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { TransportProvider } from "../lib/transport-context";
import { ItemDetailModal } from "./ItemDetailModal";

// Mock the query hooks
vi.mock("../lib/item-query", () => ({
  useItem: (_id: () => string | undefined) => ({
    data: { id: "1", title: "Test" },
    isLoading: false,
  }),
  useUpdateItemStatus: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

describe("ItemDetailModal Dismissal", () => {
  const queryClient = new QueryClient();
  const transport = createConnectTransport({
    baseUrl: "http://localhost:8080",
  });
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("calls onClose when ESC key is pressed", async () => {
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

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", async () => {
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

    // The backdrop is the outer div with the semi-transparent background
    // We can find it by its CSS class or by clicking at a specific position
    // Since center() pattern is used, we can try to click the dialog's parent
    const dialog = page.getByRole("dialog");
    await dialog.element().parentElement?.click();

    expect(onClose).toHaveBeenCalled();
  });
});
