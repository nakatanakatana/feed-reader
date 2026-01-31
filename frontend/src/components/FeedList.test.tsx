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
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";

// Mock hooks
vi.mock("../lib/item-query", () => ({
  useItems: vi.fn(),
  useItem: vi.fn(),
  useUpdateItemStatus: vi.fn(),
}));

vi.mock("../lib/db", () => ({
  db: {
    items: {
      preload: vi.fn(),
      isReady: vi.fn().mockReturnValue(true),
    },
    feeds: {
      isReady: vi.fn().mockReturnValue(true),
    },
    getMergedItemsQuery: vi.fn().mockReturnValue(() => []),
    addFeed: vi.fn(),
    updateItemStatus: vi.fn(),
  },
  items: {
    preload: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
  },
  feeds: {
    isReady: vi.fn().mockReturnValue(true),
  },
  unreadItems: {},
  readItems: {},
  getMergedItemsQuery: vi.fn().mockReturnValue(() => []),
  addFeed: vi.fn(),
  updateItemStatus: vi.fn(),
}));

// Mock useLiveQuery from solid-db
vi.mock("@tanstack/solid-db", () => ({
  useLiveQuery: vi.fn(),
  createCollection: vi.fn().mockReturnValue({
    isReady: vi.fn().mockReturnValue(true),
  }),
  createLiveQueryCollection: vi.fn().mockReturnValue({
    isReady: vi.fn().mockReturnValue(true),
  }),
  eq: vi.fn(),
}));

vi.mock("../lib/tag-query", () => ({
  useTags: vi.fn(),
  useCreateTag: vi.fn(),
  useDeleteTag: vi.fn(),
  tagKeys: { all: ["tags"] },
}));

import { useLiveQuery } from "@tanstack/solid-db";
import { useTags } from "../lib/tag-query";

describe("FeedList", () => {
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

  it("displays a list of feeds", async () => {
    const mockFeeds = [
      {
        id: "1",
        title: "Feed 1",
        url: "url1",
        tags: [{ id: "t1", name: "Tag 1" }],
      },
      { id: "2", title: "Feed 2", url: "url2", tags: [] },
    ];

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

    vi.mocked(useTags).mockReturnValue({
      data: { tags: [{ id: "t1", name: "Tag 1" }] },
      isLoading: false,
    } as unknown as ReturnType<typeof useTags>);

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
    await expect.element(page.getByText("Tag 1").first()).toBeInTheDocument();
    await expect.element(page.getByText("Feed 2")).toBeInTheDocument();
  });

  it("deletes a feed", async () => {
    const mockFeeds = [{ id: "1", title: "Feed 1", url: "url1", tags: [] }];

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

    vi.mocked(useTags).mockReturnValue({
      data: { tags: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useTags>);

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

    const deleteButton = page.getByText("Delete");
    await deleteButton.click();
  });

  it("supports bulk selection", async () => {
    const mockFeeds = [
      { id: "1", title: "Feed 1", url: "url1", tags: [] },
      { id: "2", title: "Feed 2", url: "url2", tags: [] },
    ];

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

    vi.mocked(useTags).mockReturnValue({
      data: { tags: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useTags>);

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

    // Wait for list items to be fully rendered
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Select first feed
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    // Checkbox 0: Select All, Checkbox 1: Feed 1
    if (checkboxes.length > 1) {
      (checkboxes[1] as HTMLInputElement).click();
    } else {
      console.log("Checkboxes found:", checkboxes.length);
      throw new Error("Feed checkbox not found");
    }

    await expect
      .element(page.getByText("1 feeds selected"))
      .toBeInTheDocument();

    // Select all
    const selectAll = page.getByLabelText(/Select All/i);
    await selectAll.click();

    await expect
      .element(page.getByText("2 feeds selected"))
      .toBeInTheDocument();
  });

  it("manages tags for selected feeds", async () => {
    const mockFeeds = [{ id: "1", title: "Feed 1", url: "url1", tags: [] }];

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

    vi.mocked(useTags).mockReturnValue({
      data: { tags: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useTags>);

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

    // Wait for list items to be fully rendered
    await new Promise((resolve) => setTimeout(resolve, 100));

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length > 1) {
      (checkboxes[1] as HTMLInputElement).click();
    } else if (checkboxes.length === 1) {
      (checkboxes[0] as HTMLInputElement).click();
    } else {
      throw new Error("Checkbox not found");
    }

    const manageTagsBtn = page.getByText("Manage Tags");
    await manageTagsBtn.click();

    await expect.element(page.getByRole("dialog")).toBeInTheDocument();
    await expect
      .element(page.getByText("Manage Tags for 1 feeds"))
      .toBeInTheDocument();
  });

  it("does NOT have a navigation link to feed details", async () => {
    const mockFeeds = [{ id: "1", title: "Feed 1", url: "url1", tags: [] }];

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

    vi.mocked(useTags).mockReturnValue({
      data: { tags: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useTags>);

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

    // Check that there is no link to /feeds/1
    const detailLink = page.getByRole("link", { name: /view items/i });
    await expect.element(detailLink).not.toBeInTheDocument();
  });

  it("displays the last fetched date", async () => {
    const mockFeeds = [
      {
        id: "1",
        title: "Feed 1",
        url: "url1",
        tags: [],
        lastFetchedAt: "2026-01-28T15:30:00Z",
      },
      { id: "2", title: "Feed 2", url: "url2", tags: [], lastFetchedAt: null },
    ];

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

    vi.mocked(useTags).mockReturnValue({
      data: { tags: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useTags>);

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

    await expect
      .element(page.getByText("Last fetched: 2026-01-28 15:30"))
      .toBeInTheDocument();
    // Should display "Never" for null date
    await expect
      .element(page.getByText("Last fetched: Never"))
      .toBeInTheDocument();
  });
});
