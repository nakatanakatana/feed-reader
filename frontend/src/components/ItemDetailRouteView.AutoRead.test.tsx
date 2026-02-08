import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";

const { updateMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
}));

// Mock db
vi.mock("../lib/db", () => ({
  // Add other exports to avoid ReferenceErrors

  itemsUnreadQuery: vi.fn(() => ({
    toArray: [],
    isReady: vi.fn().mockReturnValue(true),
  })),
  updateItemStatus: vi.fn(),
  feedInsert: vi.fn(),
  manageFeedTags: vi.fn(),
  feedTag: {},
  feeds: {},
  tags: {},
  db: {},
  refreshFeeds: vi.fn(),
  items: vi.fn(() => ({ update: updateMock })),
  createItemBulkMarkAsReadTx: vi.fn(),
}));

// Mock useLiveQuery to return items
vi.mock("@tanstack/solid-db", async () => {
  return {
    useLiveQuery: () => () => [
      { id: "1", title: "Item 1", isRead: false },
      { id: "2", title: "Item 2", isRead: false },
    ],
    // Mock other solid-db exports if needed
    isUndefined: (v: unknown) => v === undefined,
    eq: () => ({}),
    count: () => 0,
    createCollection: vi.fn(() => ({})),
    createLiveQueryCollection: vi.fn(() => ({})),
  };
});

// Mock ItemDetailModal to avoid dealing with its internal logic
vi.mock("./ItemDetailModal", () => ({
  ItemDetailModal: (props: {
    onPrev: () => void;
    onNext: () => void;
    onClose: () => void;
  }) => (
    <div>
      <button type="button" onClick={props.onPrev}>
        ← Previous
      </button>
      <button type="button" onClick={props.onNext}>
        Next →
      </button>
      <button type="button" onClick={props.onClose}>
        Close
      </button>
    </div>
  ),
}));

describe("ItemDetailRouteView Auto-Read", () => {
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

  it("marks current item as read when navigating to next", async () => {
    const history = createMemoryHistory({ initialEntries: ["/items/1"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    const nextButton = page.getByText("Next →");
    await nextButton.click();

    expect(updateMock).toHaveBeenCalledWith("1", expect.any(Function));
  });

  it("marks current item as read when navigating to prev", async () => {
    const history = createMemoryHistory({ initialEntries: ["/items/2"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    const prevButton = page.getByText("← Previous");
    await prevButton.click();

    expect(updateMock).toHaveBeenCalledWith("2", expect.any(Function));
  });
});
