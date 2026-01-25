import { render } from "solid-js/web";
import type { JSX } from "solid-js";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { page } from "vitest/browser";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { routeTree } from "../routeTree.gen";
import { useLiveQuery } from "@tanstack/solid-db";
import { useTags } from "../lib/tag-query";
import { queryClient, transport } from "../lib/query";
import { QueryClientProvider } from "@tanstack/solid-query";
import { TransportProvider } from "../lib/transport-context";

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
  const actual = await importOriginal<typeof import("@tanstack/solid-router")>();
  return {
    ...actual,
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
  tagKeys: { all: ["tags"] }
}));

describe("FeedList Uncategorized Filter", () => {
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

  it("filters feeds with no tags when 'Uncategorized' is selected", async () => {
    // Setup mock return for useLiveQuery
    const mockFeeds = [
      {
        uuid: "1",
        title: "Tagged Feed",
        url: "http://example.com/1",
        tags: [{ id: "t1", name: "Tech" }],
      },
      { 
        uuid: "2", 
        title: "Untagged Feed", 
        url: "http://example.com/2", 
        tags: [] 
      },
    ];

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

    // Setup mock for useTags
    vi.mocked(useTags).mockReturnValue({
      data: { tags: [{ id: "t1", name: "Tech" }] },
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
    await expect.element(page.getByText("Tagged Feed", { exact: true })).toBeInTheDocument();
    await expect.element(page.getByText("Untagged Feed", { exact: true })).toBeInTheDocument();

    // Find and click "Uncategorized" filter button
    const uncategorizedBtn = page.getByText("Uncategorized", { exact: true });
    await expect.element(uncategorizedBtn).toBeInTheDocument();
    await uncategorizedBtn.click();

    // Expect only Untagged Feed to be visible
    await expect.element(page.getByText("Untagged Feed", { exact: true })).toBeInTheDocument();
    await expect.element(page.getByText("Tagged Feed", { exact: true })).not.toBeInTheDocument();
  });
});
