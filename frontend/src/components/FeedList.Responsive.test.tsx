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

  it("stacks elements vertically on narrow viewports", async () => {
    // Set a narrow viewport
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

    // 1. Assert Total Unread exists
    const totalUnread = page.getByText(/Total Unread/i);
    await expect.element(totalUnread).toBeInTheDocument();

    // 2. Assert inner header container is now vertical (column)
    // We find h2, then its parent (title div), then its parent (the responsive inner container)
    // Note: title might be hidden but it's still in the DOM
    const headerTitle = page.getByText("Your Feeds");
    const headerContainer = headerTitle.element().parentElement?.parentElement;
    if (!headerContainer) throw new Error("Header container not found");
    
    console.log("Header classes:", headerContainer.className);
    const styles = window.getComputedStyle(headerContainer);
    console.log("Header display:", styles.display);
    console.log("Header flex-direction:", styles.flexDirection);
    console.log("Header align-items:", styles.alignItems);
    
    expect(styles.flexDirection).toBe("column");
    expect(styles.alignItems).toBe("stretch");

    // 3. Assert Filter/Sort controls are wrapped or stacked
    const sortLabel = page.getByText("Sort by:");
    const controlsContainer = sortLabel.element().parentElement;
    if (!controlsContainer) throw new Error("Controls container not found");
    const controlsStyles = window.getComputedStyle(controlsContainer);
    
    // We expect it to wrap or be a column
    expect(["column", "row"]).toContain(controlsStyles.flexDirection);
    if (controlsStyles.flexDirection === "row") {
      expect(controlsStyles.flexWrap).toBe("wrap");
    }

    // 4. Assert that the "Manage Tags" button is NOT visible in the header on mobile
    // First, we need to make some feeds selected to trigger the button visibility
    // But since we are testing layout, we can just check if it's hidden if it were there,
    // or better, actually mock the selection.
    
    // For now, let's just assert it's not there by default, 
    // but the task says "assert that action buttons are hidden from the header on mobile".
    // If I add selection, I can test it.
  });

  it("hides action buttons from the header on mobile", async () => {
    // Set a narrow viewport
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

    // Select a feed to make the "Manage Tags" button appear
    // We'll use the first checkbox
    const checkbox = page.getByRole("checkbox").first();
    await checkbox.click();

    // Check if the button is in the document
    const manageButton = page.getByText(/Manage Tags/i);
    await expect.element(manageButton).toBeInTheDocument();
    
    // Check if it is hidden via CSS display: none
    const styles = window.getComputedStyle(manageButton.element());
    expect(styles.display).toBe("none");
  });

  it("shows a floating action button on mobile when feeds are selected", async () => {
    // Set a narrow viewport
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

    // Initially, FAB should not be visible (or not have the action)
    // We'll look for a button with a fixed/absolute position
    
    // Select a feed
    const checkbox = page.getByRole("checkbox").first();
    await checkbox.click();

    // Now a FAB should be visible
    // We expect a button with "Manage Tags" text or similar, but styled as a FAB
    const fab = page.getByRole("button", { name: /Manage Tags/i });
    await expect.element(fab).toBeInTheDocument();
    
    const fabStyles = window.getComputedStyle(fab.element());
    expect(fabStyles.position).toBe("fixed");
    expect(fabStyles.bottom).not.toBe("auto");
    expect(fabStyles.right).not.toBe("auto");
    expect(fabStyles.display).not.toBe("none");
  });

  it("does not show a floating action button on desktop", async () => {
    // Set a wide viewport
    // @ts-ignore
    await page.viewport?.(1024, 768);
    
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

    // Select a feed
    const checkbox = page.getByRole("checkbox").first();
    await checkbox.click();

    // The Manage Tags button should be in the header, not a FAB
    const manageButton = page.getByRole("button", { name: /Manage Tags/i });
    await expect.element(manageButton).toBeInTheDocument();
    
    const styles = window.getComputedStyle(manageButton.element());
    // On desktop, it should be part of the flow (not fixed) and visible
    expect(styles.position).not.toBe("fixed");
    expect(styles.display).toBe("block");
  });
});
