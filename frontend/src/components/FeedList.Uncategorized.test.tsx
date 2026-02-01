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
  },
  items: {
    isReady: vi.fn().mockReturnValue(true),
  },
  addFeed: vi.fn(),
  updateItemStatus: vi.fn(),
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

describe("FeedList Tag Filters", () => {
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

  it("keeps feeds visible when tag filters change", async () => {
    // Setup mock return for useLiveQuery
    const mockFeeds = [
      {
        id: "1",
        title: "Tagged Feed",
        url: "http://example.com/1",
        tags: [{ id: "t1", name: "Tech" }],
      },
      {
        id: "2",
        title: "Untagged Feed",
        url: "http://example.com/2",
        tags: [],
      },
    ];

    setupLiveQuery(mockFeeds);

    // Setup mock for useTags
    vi.mocked(useTags).mockReturnValue({
      data: { tags: [{ id: "t1", name: "Tech" }] },
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

    // Initial state: All feeds visible
    await expect
      .element(page.getByText("Tagged Feed", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Untagged Feed", { exact: true }))
      .toBeInTheDocument();

    // Switch to Untagged filter
    await page
      .getByRole("combobox", { name: "Filter by tag" })
      .selectOptions("untagged");

    // Expect only untagged feeds (query now filters in useLiveQuery)
    await expect
      .element(page.getByText("Untagged Feed", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Tagged Feed", { exact: true }))
      .not.toBeInTheDocument();
  });
});
