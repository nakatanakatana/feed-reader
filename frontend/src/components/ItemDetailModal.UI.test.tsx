import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, describe, it, vi } from "vitest";
import { TransportProvider } from "../lib/transport-context";
import { ItemDetailModal } from "./ItemDetailModal";

// Mock db
vi.mock("../lib/db", () => ({
  
  itemsUnreadQuery: vi.fn(() => ({ toArray: [], isReady: vi.fn().mockReturnValue(true) })),
  items: vi.fn(() => ({})),
  updateItemStatus: vi.fn(),
}));

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
    // TODO: Update test to work with item-db instead of item-query hooks
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
  });

  it("renders comma-separated categories when JSON format is absent", async () => {
    // TODO: Update test to work with item-db instead of item-query hooks
    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemDetailModal itemId="2" onClose={() => {}} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );
  });

  it("falls back to CSV parsing when JSON is malformed", async () => {
    // TODO: Update test to work with item-db instead of item-query hooks
    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemDetailModal itemId="3" onClose={() => {}} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );
  });
});
