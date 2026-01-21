import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { TransportProvider } from "../lib/transport-context";
import { ItemRow } from "./ItemRow";
import { Item } from "../gen/item/v1/item_pb";
import { createConnectTransport } from "@connectrpc/connect-web";

describe("ItemRow", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  const transport = createConnectTransport({
    baseUrl: "http://localhost:3000",
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const mockItem = new Item({
    id: "1",
    title: "Test Article Title",
    url: "https://example.com/article",
    publishedAt: "2026-01-21T10:00:00Z",
    isRead: false,
  });

  it("renders item title and metadata", () => {
    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemRow item={mockItem} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    expect(page.getByText("Test Article Title")).toBeInTheDocument();
    expect(page.getByText("2026-01-21T10:00:00Z")).toBeInTheDocument();
  });

  it("renders read status correctly", () => {
    const readItem = new Item({ ...mockItem, isRead: true });
    
    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemRow item={readItem} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Assuming we show "Read" or some indicator
    expect(page.getByText("Read", { exact: true })).toBeInTheDocument();
  });
});
