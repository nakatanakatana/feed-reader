import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { TransportProvider } from "../lib/transport-context";
import { ItemDetailModal } from "./ItemDetailModal";

// Mock hooks
vi.mock("../lib/item-query", () => ({
  useItem: vi.fn(),
  useUpdateItemStatus: vi.fn(),
}));

import { useItem, useUpdateItemStatus } from "../lib/item-query";

describe("ItemDetailModal UI Updates", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders title as a link and displays content, image, and categories", async () => {
    const mockItem = {
      id: "1",
      title: "Test Item Title",
      url: "http://example.com/article",
      description: "Short description",
      content: "<div>Full body content</div>",
      imageUrl: "http://example.com/image.jpg",
      categories: "Tech, SolidJS",
      publishedAt: "2026-01-28",
      author: "Author Name",
      isRead: false,
    };

    vi.mocked(useItem).mockReturnValue({
      data: mockItem,
      isLoading: false,
      // biome-ignore lint/suspicious/noExplicitAny: Mocking query result
    } as any);

    vi.mocked(useUpdateItemStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      // biome-ignore lint/suspicious/noExplicitAny: Mocking mutation result
    } as any);

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

    // 1. Title should be a link to item.url
    const titleLink = page.getByRole("link", { name: "Test Item Title" });
    await expect.element(titleLink).toBeInTheDocument();
    await expect
      .element(titleLink)
      .toHaveAttribute("href", "http://example.com/article");

    // 2. "Open Original Article" button should NOT be present (integrated into title)
    const oldButton = page.getByText(/Open original article/i);
    await expect.element(oldButton).not.toBeInTheDocument();

    // 3. content, imageUrl, and categories should be displayed
    await expect
      .element(page.getByText("Full body content"))
      .toBeInTheDocument();

    const img = document.body.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "http://example.com/image.jpg");

    await expect.element(page.getByText("Tech")).toBeInTheDocument();
    await expect.element(page.getByText("SolidJS")).toBeInTheDocument();
  });
});
