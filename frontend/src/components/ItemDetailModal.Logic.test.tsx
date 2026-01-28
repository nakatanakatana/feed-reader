import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { TransportProvider } from "../lib/transport-context";
import { ItemDetailModal } from "./ItemDetailModal";

// Mock the query hooks
vi.mock("../lib/item-query", () => ({
  useItem: (id: () => string | undefined) => ({
    get data() {
      if (!id()) return undefined;
      return {
        id: id(),
        title: `Test Item ${id()}`,
        description: "<p>Test Content</p>",
        publishedAt: "2026-01-24",
        author: "Test Author",
        url: "http://example.com",
        isRead: false,
      };
    },
    get isLoading() {
      return false;
    },
  }),
  useUpdateItemStatus: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

describe("ItemDetailModal Navigation Logic", () => {
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

  it("calls onNext and onPrev correctly from props", async () => {
    const onNext = vi.fn();
    const onPrev = vi.fn();

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemDetailModal
              itemId="2"
              onClose={() => {}}
              prevItemId="1"
              nextItemId="3"
              onPrev={onPrev}
              onNext={onNext}
            />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    const nextButton = page.getByRole("button", { name: "Next →" });
    const prevButton = page.getByRole("button", { name: "← Previous" });

    await nextButton.click();
    expect(onNext).toHaveBeenCalled();

    await prevButton.click();
    expect(onPrev).toHaveBeenCalled();
  });
});
