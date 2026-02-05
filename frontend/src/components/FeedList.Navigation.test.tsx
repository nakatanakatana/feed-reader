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
    Link: (props: any) => {
      let href = props.to;
      if (props.params) {
        for (const [key, value] of Object.entries(props.params)) {
          href = href.replace(`$${key}`, value);
        }
      }
      return (
        <a href={href} {...props}>
          {props.children}
        </a>
      );
    },
  };
});

// Mock useTags
vi.mock("../lib/tag-query", () => ({
  useTags: vi.fn(),
  useCreateTag: vi.fn(),
  useDeleteTag: vi.fn(),
  tagKeys: { all: ["tags"] },
}));

describe("FeedList Navigation", () => {
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

  it("has correct navigation links: external title and internal detail icon", async () => {
    const mockFeeds = [
      {
        id: "1",
        title: "Feed 1",
        url: "url1",
        link: "link1",
        tags: [],
      },
    ];

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

    // 1. External title link
    // biome-ignore lint/suspicious/noExplicitAny: Vitest browser element type handling
    const titleLink = page.getByText("Feed 1") as any;
    await expect.element(titleLink).toBeInTheDocument();
    expect(titleLink.element().getAttribute("href")).toBe("link1");

    // 2. Internal detail link icon should NOT exist
    const detailLinks = page.getByRole("link", { name: /view items/i });
    await expect.element(detailLinks).not.toBeInTheDocument();
  });
});
