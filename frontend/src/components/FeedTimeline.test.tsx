import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { FeedService } from "../gen/feed/v1/feed_connect";
import { ListGlobalItemsResponse } from "../gen/feed/v1/feed_pb";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { mockConnectWeb } from "../mocks/connect";
import { FeedTimeline } from "./FeedTimeline";

describe("FeedTimeline", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  const transport = createConnectTransport({
    baseUrl: "http://localhost:3000",
  });

  it("displays items in global timeline", async () => {
    worker.use(
      mockConnectWeb(FeedService)({
        method: "listGlobalItems",
        handler: () => {
          return new ListGlobalItemsResponse({
            items: [
              { id: "1", title: "Item 1", description: "Desc 1" },
              { id: "2", title: "Item 2", description: "Desc 2" },
            ],
          });
        },
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <FeedTimeline onSelectItem={() => {}} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    await expect.element(page.getByText("Item 1")).toBeInTheDocument();
    await expect.element(page.getByText("Item 2")).toBeInTheDocument();
  });

  it("calls onSelectItem when an item is clicked", async () => {
    const onSelectItem = vi.fn();
    worker.use(
      mockConnectWeb(FeedService)({
        method: "listGlobalItems",
        handler: () => {
          return new ListGlobalItemsResponse({
            items: [{ id: "1", title: "Item 1", description: "Desc 1" }],
          });
        },
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <FeedTimeline onSelectItem={onSelectItem} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    const card = page.getByRole("button", { name: /Item 1/ });
    await card.click();
    expect(onSelectItem).toHaveBeenCalledWith("1");
  });
});
