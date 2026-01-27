import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
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

describe("ItemDetailModal Navigation", () => {
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

  it("calls onNext when Next button is clicked", async () => {
    const onNext = vi.fn();
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal
            itemId="1"
            onClose={() => {}}
            nextItemId="2"
            onNext={onNext}
          />
        </Wrapper>
      ),
      document.body,
    );

    const nextButton = page.getByText("Next →");
    await nextButton.click();
    expect(onNext).toHaveBeenCalled();
  });

  it("calls onPrev when Previous button is clicked", async () => {
    const onPrev = vi.fn();
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal
            itemId="2"
            onClose={() => {}}
            prevItemId="1"
            onPrev={onPrev}
          />
        </Wrapper>
      ),
      document.body,
    );

    const prevButton = page.getByText("← Previous");
    await prevButton.click();
    expect(onPrev).toHaveBeenCalled();
  });

  it("calls onNext when 'k' key is pressed", async () => {
    const onNext = vi.fn();
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal
            itemId="1"
            onClose={() => {}}
            nextItemId="2"
            onNext={onNext}
          />
        </Wrapper>
      ),
      document.body,
    );

    await userEvent.keyboard("k");
    expect(onNext).toHaveBeenCalled();
  });

  it("calls onPrev when 'j' key is pressed", async () => {
    const onPrev = vi.fn();
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal
            itemId="2"
            onClose={() => {}}
            prevItemId="1"
            onPrev={onPrev}
          />
        </Wrapper>
      ),
      document.body,
    );

    await userEvent.keyboard("j");
    expect(onPrev).toHaveBeenCalled();
  });
});
