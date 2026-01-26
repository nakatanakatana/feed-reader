import { render } from "solid-js/web";
import type { JSX } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { ItemDetailModal } from "./ItemDetailModal";
import { TransportProvider } from "../lib/transport-context";
import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import "../styles.css";

// Mock the query hooks
vi.mock("../lib/item-query", () => ({
  useItem: (id: () => string | undefined) => ({
    get data() {
      if (!id()) return undefined;
      return {
        id: id(),
        title: "Test Item",
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

describe("ItemDetailModal Responsive", () => {
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

  const Wrapper = (props: { children: JSX.Element }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TransportProvider>
  );

  it("should be fullscreen on mobile viewports", async () => {
    await page.viewport(375, 667); // iPhone SE size

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    const dialog = page.getByRole("dialog");
    await expect.element(dialog).toBeInTheDocument();

    const el = dialog.element();
    const rect = el.getBoundingClientRect();
    expect(rect.width).toBe(375);
  });

  it("should be large (80-90%) on desktop viewports", async () => {
    await page.viewport(1920, 1080);

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    const dialog = page.getByRole("dialog");
    await expect.element(dialog).toBeInTheDocument();

    const el = dialog.element();
    const rect = el.getBoundingClientRect();

    // Desktop: 80-90% width (1920 * 0.8 = 1536)
    // Currently it's maxWidth: 3xl (approx 768px)
    expect(rect.width).toBeGreaterThan(1500);
  });
});
