import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { useTags } from "../lib/tag-query";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";
import { setupLiveQuery } from "../test-utils/live-query";

// Mock the db module
vi.mock("../lib/db", () => ({
  feeds: {
    delete: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
    toArray: vi.fn().mockReturnValue([]),
  },
  tags: {
    toArray: vi.fn().mockReturnValue([]),
  },
  localRead: {
    insert: vi.fn(),
    toArray: vi.fn().mockReturnValue([]),
  },
  addFeed: vi.fn(),
  updateItemStatus: vi.fn(),
  createItems: vi.fn(() => ({ toArray: [], utils: { refetch: vi.fn() } })),
  createItemBulkMarkAsReadTx: () => ({ mutate: vi.fn() }),
}));

// Mock useLiveQuery
vi.mock("@tanstack/solid-db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/solid-db")>();
  return {
    ...actual,
    useLiveQuery: vi.fn(),
  };
});

// Mock Link from solid-router
vi.mock("@tanstack/solid-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/solid-router")>();
  return {
    ...actual,
    // biome-ignore lint/suspicious/noExplicitAny: Test mock for simplicity
    Link: (props: any) => (
      <a href={props.to} {...props}>
        {props.children}
      </a>
    ),
  };
});

// Mock useTags
vi.mock("../lib/tag-query", () => ({
  useTags: vi.fn(),
  useCreateTag: vi.fn(),
  useDeleteTag: vi.fn(),
  tagKeys: { all: ["tags"] },
}));

describe("FeedList Card Click Selection", () => {
  let dispose: () => void;

  beforeEach(() => {
    queryClient.clear();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const TestWrapper = (props: { children: JSX.Element }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TransportProvider>
  );

  it("toggles selection when clicking the card background", async () => {
    const mockFeeds = [{ id: "1", title: "Feed 1", url: "url1", tags: [] }];

    setupLiveQuery(mockFeeds);

    vi.mocked(useTags).mockReturnValue({
      data: { tags: [] },
      // biome-ignore lint/suspicious/noExplicitAny: Test mock for simplicity
    } as any);

    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TestWrapper>
          <RouterProvider router={router} />
        </TestWrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Feed 1")).toBeInTheDocument();

    const card = document.querySelector("li");
    if (!card) throw new Error("Card not found");

    const checkbox = card.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    // Click the card background (li element)
    card.click();

    // Checkbox should be checked (This will fail initially)
    expect(checkbox.checked).toBe(true);

    // Click again to untoggle
    card.click();
    expect(checkbox.checked).toBe(false);
  });
});
