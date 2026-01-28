import { useLiveQuery } from "@tanstack/solid-db";
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
import "../styles.css";

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
    // biome-ignore lint/suspicious/noExplicitAny: Mocking external library component
    Link: (props: any) => (
      <a href={props.to} {...props}>
        {props.children}
      </a>
    ),
  };
});

describe("FeedList Responsive", () => {
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

  it("breaks layout on narrow viewports (Regression Test)", async () => {
    // Set a narrow viewport
    // Note: in newer vitest browser versions, we use resize
    // @ts-ignore
    await page.viewport?.(375, 667);
    
    const mockFeeds = [
      {
        id: "1",
        title: "Feed 1",
        url: "http://example.com/1",
        tags: [{ id: "t1", name: "Tag 1" }],
      },
    ];

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

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

    const headerTitle = page.getByText("Your Feeds");
    await expect.element(headerTitle).toBeInTheDocument();
    
    const headerContainer = headerTitle.element().parentElement?.parentElement;
    if (!headerContainer) throw new Error("Header container not found");

    const styles = window.getComputedStyle(headerContainer);
    
    // In current implementation, it's always flex-row, which breaks on mobile
    expect(styles.display).toBe("flex");
    expect(styles.flexDirection).toBe("row");
    
    // Check if it has justify-content: space-between which pushes elements to edges
    expect(styles.justifyContent).toBe("space-between");
  });
});
