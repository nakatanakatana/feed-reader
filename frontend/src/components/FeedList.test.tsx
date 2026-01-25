import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { page } from "vitest/browser";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { routeTree } from "../routeTree.gen";
import * as db from "../lib/db";
import { useLiveQuery } from "@tanstack/solid-db";
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

// Mock Link from solid-router to avoid Context issues
vi.mock("@tanstack/solid-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/solid-router")>();
  return {
    ...actual,
    // biome-ignore lint/suspicious/noExplicitAny: Mocking external library component
    Link: (props: any) => (
      <a href={props.to} {...props}>
        {props.children}
      </a>
    ),
  };
});

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

  const TestWrapper = (props: { children: any }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TransportProvider>
  );

  it("displays a list of feeds", async () => {
    // Setup mock return for useLiveQuery
    const mockFeeds = [
      { uuid: "1", title: "Feed 1", url: "http://example.com/1", tags: [{ id: "t1", name: "Tag 1" }] },
      { uuid: "2", title: "Feed 2", url: "http://example.com/2", tags: [] },
    ];

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
    const router = createRouter({ routeTree, history });

    dispose = render(() => (
      <TestWrapper>
        <RouterProvider router={router} />
      </TestWrapper>
    ), document.body);

    await expect.element(page.getByText("Feed 1")).toBeInTheDocument();
    await expect.element(page.getByText("Tag 1")).toBeInTheDocument();
    await expect.element(page.getByText("Feed 2")).toBeInTheDocument();
  });

  it("deletes a feed", async () => {
    const mockFeeds = [
      { uuid: "1", title: "Feed 1", url: "http://example.com/1", tags: [] },
    ];
    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
    const router = createRouter({ routeTree, history });

    dispose = render(() => (
      <TestWrapper>
        <RouterProvider router={router} />
      </TestWrapper>
    ), document.body);

    await expect.element(page.getByText("Feed 1")).toBeInTheDocument();

    const deleteButton = page.getByText("Delete");
    await deleteButton.click();

    expect(db.feeds.delete).toHaveBeenCalledWith("1");
  });
});