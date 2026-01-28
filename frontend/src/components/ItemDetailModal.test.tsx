import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import type { JSX } from "solid-js";
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

describe("ItemDetailModal", () => {
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

  it("renders item content when itemId is provided", async () => {
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();
    await expect.element(page.getByText("By Test Author")).toBeInTheDocument();
    await expect.element(page.getByText("Test Content")).toBeInTheDocument();

    // Check for title link
    const titleLink = page.getByRole("link", { name: "Test Item" });
    await expect.element(titleLink).toBeInTheDocument();
    await expect
      .element(titleLink)
      .toHaveAttribute("href", "http://example.com");

    // The old button should NOT be present
    await expect
      .element(page.getByText("Open original article ↗"))
      .not.toBeInTheDocument();
  });

  it("does NOT render a close button (✕)", async () => {
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    const closeButton = page.getByText("✕");
    await expect.element(closeButton).not.toBeInTheDocument();
  });

  it("does not render when itemId is undefined", async () => {
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId={undefined} onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );
    const modalContent = document.body.innerHTML;
    expect(modalContent).toBe("");
  });
});
