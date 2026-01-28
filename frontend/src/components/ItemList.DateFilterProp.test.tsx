import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransportProvider } from "../lib/transport-context";
import { ItemList } from "./ItemList";

// Mock hooks
vi.mock("../lib/item-query", () => ({
  useItems: vi.fn(),
  useItem: vi.fn(),
  useUpdateItemStatus: vi.fn(),
}));

// Mock router
vi.mock("@tanstack/solid-router", () => ({
  useNavigate: () => vi.fn(),
  createFileRoute: () => () => ({}), // simple mock if needed
}));

import {
  useItems,
  useItem,
  useUpdateItemStatus,
  type FetchItemsParams,
} from "../lib/item-query";

describe("ItemList Date Filter Prop", () => {
  let dispose: () => void;
  const queryClient = new QueryClient();
  const transport = createConnectTransport({ baseUrl: "http://localhost" });

  beforeEach(() => {
    vi.mocked(useItems).mockReturnValue({
      data: {
        pages: [{ items: [] }],
      },
      isLoading: false,
      hasNextPage: false,
    } as unknown as ReturnType<typeof useItems>);

    vi.mocked(useItem).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useItem>);

    vi.mocked(useUpdateItemStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateItemStatus>);
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("initializes filter with provided dateFilter prop", async () => {
    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
             <ItemList dateFilter="30d" />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Check useItems call
    expect(useItems).toHaveBeenCalled();
    const latestCallGetter = vi.mocked(useItems).mock.calls[
      vi.mocked(useItems).mock.calls.length - 1
    ][0] as () => Omit<FetchItemsParams, "limit" | "offset">;
    const params = latestCallGetter();

    expect(params.publishedSince).toBeDefined();
    
    // Verify it's 30 days
    const since = params.publishedSince;
    if (!since) throw new Error("publishedSince should be defined");

    const sinceDate = new Date(Number(since.seconds) * 1000);
    const now = new Date();
    const diffHours = (now.getTime() - sinceDate.getTime()) / (1000 * 60 * 60);
    
    // 30 days = 720 hours
    expect(diffHours).toBeGreaterThan(719.9);
    expect(diffHours).toBeLessThan(720.1);
  });
});